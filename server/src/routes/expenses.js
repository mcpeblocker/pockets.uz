import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, dbRun, dbGet, dbAll } from '../db/database.js';
import { optionalAuth, authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for file uploads
const upload = multer({
  dest: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const router = express.Router();

// Get expenses for an event
router.get('/event/:eventId', optionalAuth, async (req, res, next) => {
  try {
    const db = getDatabase();
    const expenses = await dbAll(
      db,
      `SELECT e.*, 
              p.name as paid_by_name,
              p.email as paid_by_email
       FROM expenses e
       JOIN participants p ON p.id = e.paid_by_participant_id
       WHERE e.event_id = ?
       ORDER BY e.expense_date DESC, e.created_at DESC`,
      [req.params.eventId]
    );

    // Get splits for each expense
    for (const expense of expenses) {
      const splits = await dbAll(
        db,
        'SELECT * FROM expense_splits WHERE expense_id = ?',
        [expense.id]
      );
      expense.splits = splits;

      // Get receipts
      const receipts = await dbAll(
        db,
        'SELECT * FROM receipts WHERE expense_id = ?',
        [expense.id]
      );
      expense.receipts = receipts;
    }

    res.json(expenses);
  } catch (error) {
    next(error);
  }
});

// Get single expense
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const db = getDatabase();
    const expense = await dbGet(
      db,
      `SELECT e.*, 
              p.name as paid_by_name,
              p.email as paid_by_email
       FROM expenses e
       JOIN participants p ON p.id = e.paid_by_participant_id
       WHERE e.id = ?`,
      [req.params.id]
    );

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const splits = await dbAll(db, 'SELECT * FROM expense_splits WHERE expense_id = ?', [expense.id]);
    expense.splits = splits;

    const receipts = await dbAll(db, 'SELECT * FROM receipts WHERE expense_id = ?', [expense.id]);
    expense.receipts = receipts;

    res.json(expense);
  } catch (error) {
    next(error);
  }
});

// Create expense
router.post('/', authenticateToken, upload.array('photos', 10), async (req, res, next) => {
  try {
    const { eventId, description, amount, currency, paidByParticipantId, expenseDate, splitType, splitParticipants, splits } = req.body;

    if (!eventId || !description || !amount || !paidByParticipantId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = getDatabase();

    // Verify event exists and is open
    const event = await dbGet(db, 'SELECT id, status, owner_id, currency FROM events WHERE id = ?', [eventId]);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (event.status === 'closed') {
      return res.status(400).json({ error: 'Cannot add expenses to closed event' });
    }

    // Verify participant exists
    const participant = await dbGet(db, 'SELECT id FROM participants WHERE id = ? AND event_id = ?', [paidByParticipantId, eventId]);
    if (!participant) {
      return res.status(400).json({ error: 'Invalid participant' });
    }

    // Check permissions - user must be event owner or participant
    const userParticipant = await dbGet(
      db,
      'SELECT id FROM participants WHERE event_id = ? AND user_id = ?',
      [eventId, req.user.userId]
    );
    if (event.owner_id !== req.user.userId && !userParticipant) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const expenseId = uuidv4();
    // Expenses always inherit currency from the event
    await dbRun(
      db,
      `INSERT INTO expenses (id, event_id, description, amount, currency, paid_by_participant_id, expense_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [expenseId, eventId, description, parseFloat(amount), event.currency || 'USD', paidByParticipantId, expenseDate || new Date().toISOString().split('T')[0]]
    );

    // Handle splits
    if (splitType === 'equal' && splitParticipants) {
      const participantIds = JSON.parse(splitParticipants);
      if (participantIds.length === 0) {
        await dbRun(db, 'DELETE FROM expenses WHERE id = ?', [expenseId]);
        return res.status(400).json({ error: 'Please select at least one participant' });
      }

      const splitAmount = parseFloat(amount) / participantIds.length;
      for (const participantId of participantIds) {
        const splitId = uuidv4();
        await dbRun(
          db,
          'INSERT INTO expense_splits (id, expense_id, participant_id, amount) VALUES (?, ?, ?, ?)',
          [splitId, expenseId, participantId, splitAmount]
        );
      }
    } else if (splitType === 'custom' && splits) {
      const customSplits = JSON.parse(splits);
      for (const split of customSplits) {
        const splitId = uuidv4();
        await dbRun(
          db,
          'INSERT INTO expense_splits (id, expense_id, participant_id, amount, percentage) VALUES (?, ?, ?, ?, ?)',
          [splitId, expenseId, split.participantId, split.amount || null, split.percentage || null]
        );
      }
    } else if (splitType === 'none') {
      // Personal expense - create split for payer only
      const splitId = uuidv4();
      await dbRun(
        db,
        'INSERT INTO expense_splits (id, expense_id, participant_id, amount) VALUES (?, ?, ?, ?)',
        [splitId, expenseId, paidByParticipantId, parseFloat(amount)]
      );
    }

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      for (const file of req.files) {
        const receiptId = uuidv4();
        const fileName = `${receiptId}-${file.originalname}`;
        const filePath = path.join(uploadDir, fileName);
        fs.renameSync(file.path, filePath);

        await dbRun(
          db,
          `INSERT INTO receipts (id, expense_id, file_path, file_name, file_size, mime_type)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [receiptId, expenseId, `/uploads/${fileName}`, file.originalname, file.size, file.mimetype]
        );
      }
    }

    const expense = await dbGet(
      db,
      `SELECT e.*, p.name as paid_by_name FROM expenses e JOIN participants p ON p.id = e.paid_by_participant_id WHERE e.id = ?`,
      [expenseId]
    );

    res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
});

// Upload additional receipt for an existing expense
router.post('/:id/receipts', authenticateToken, upload.single('file'), async (req, res, next) => {
  try {
    const db = getDatabase();
    const expense = await dbGet(db, 'SELECT * FROM expenses WHERE id = ?', [req.params.id]);

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const event = await dbGet(db, 'SELECT owner_id FROM events WHERE id = ?', [expense.event_id]);
    if (event.owner_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const receiptId = uuidv4();
    const fileName = `${receiptId}-${req.file.originalname}`;
    const filePath = path.join(uploadDir, fileName);
    fs.renameSync(req.file.path, filePath);

    await dbRun(
      db,
      `INSERT INTO receipts (id, expense_id, file_path, file_name, file_size, mime_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [receiptId, expense.id, `/uploads/${fileName}`, req.file.originalname, req.file.size, req.file.mimetype]
    );

    const receipt = await dbGet(db, 'SELECT * FROM receipts WHERE id = ?', [receiptId]);
    res.status(201).json({ success: true, receipt });
  } catch (error) {
    next(error);
  }
});

// Update expense
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const db = getDatabase();
    const expense = await dbGet(db, 'SELECT * FROM expenses WHERE id = ?', [req.params.id]);

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Verify permissions
    const event = await dbGet(db, 'SELECT owner_id, status FROM events WHERE id = ?', [expense.event_id]);
    if (event.status === 'closed') {
      return res.status(400).json({ error: 'Cannot update expenses in closed event' });
    }

    const userParticipant = await dbGet(
      db,
      'SELECT id FROM participants WHERE event_id = ? AND user_id = ?',
      [expense.event_id, req.user.userId]
    );
    if (event.owner_id !== req.user.userId && !userParticipant) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { description, amount, currency, paidByParticipantId, expenseDate, splitType, splitParticipants, splits } = req.body;

    // Update expense
    const updates = [];
    const params = [];

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (amount !== undefined) {
      updates.push('amount = ?');
      params.push(parseFloat(amount));
    }
    if (currency !== undefined) {
      updates.push('currency = ?');
      params.push(currency);
    }
    if (paidByParticipantId !== undefined) {
      updates.push('paid_by_participant_id = ?');
      params.push(paidByParticipantId);
    }
    if (expenseDate !== undefined) {
      updates.push('expense_date = ?');
      params.push(expenseDate);
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(req.params.id);
      await dbRun(db, `UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Update splits
    if (splitType) {
      // Delete existing splits
      await dbRun(db, 'DELETE FROM expense_splits WHERE expense_id = ?', [req.params.id]);

      if (splitType === 'equal' && splitParticipants) {
        const participantIds = JSON.parse(splitParticipants);
        const splitAmount = parseFloat(amount || expense.amount) / participantIds.length;
        for (const participantId of participantIds) {
          const splitId = uuidv4();
          await dbRun(
            db,
            'INSERT INTO expense_splits (id, expense_id, participant_id, amount) VALUES (?, ?, ?, ?)',
            [splitId, req.params.id, participantId, splitAmount]
          );
        }
      } else if (splitType === 'custom' && splits) {
        const customSplits = JSON.parse(splits);
        for (const split of customSplits) {
          const splitId = uuidv4();
          await dbRun(
            db,
            'INSERT INTO expense_splits (id, expense_id, participant_id, amount, percentage) VALUES (?, ?, ?, ?, ?)',
            [splitId, req.params.id, split.participantId, split.amount || null, split.percentage || null]
          );
        }
      } else if (splitType === 'none') {
        const splitId = uuidv4();
        await dbRun(
          db,
          'INSERT INTO expense_splits (id, expense_id, participant_id, amount) VALUES (?, ?, ?, ?)',
          [splitId, req.params.id, paidByParticipantId || expense.paid_by_participant_id, parseFloat(amount || expense.amount)]
        );
      }
    }

    const updated = await dbGet(
      db,
      `SELECT e.*, p.name as paid_by_name FROM expenses e JOIN participants p ON p.id = e.paid_by_participant_id WHERE e.id = ?`,
      [req.params.id]
    );

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete expense
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const db = getDatabase();
    const expense = await dbGet(db, 'SELECT * FROM expenses WHERE id = ?', [req.params.id]);

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Verify permissions
    const event = await dbGet(db, 'SELECT owner_id, status FROM events WHERE id = ?', [expense.event_id]);
    if (event.status === 'closed') {
      return res.status(400).json({ error: 'Cannot delete expenses in closed event' });
    }

    if (event.owner_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete receipts
    const receipts = await dbAll(db, 'SELECT file_path FROM receipts WHERE expense_id = ?', [expense.id]);
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    for (const receipt of receipts) {
      const filePath = path.join(uploadDir, receipt.file_path.replace('/uploads/', ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await dbRun(db, 'DELETE FROM expenses WHERE id = ?', [req.params.id]);

    // Event currency is hardwired - no recalculation needed
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
