import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, dbRun, dbGet, dbAll } from '../db/database.js';
import { optionalAuth, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get participants for an event
router.get('/event/:eventId', optionalAuth, async (req, res, next) => {
  try {
    const db = getDatabase();
    const participants = await dbAll(
      db,
      'SELECT * FROM participants WHERE event_id = ? ORDER BY created_at ASC',
      [req.params.eventId]
    );
    res.json(participants);
  } catch (error) {
    next(error);
  }
});

// Join event
router.post('/join', optionalAuth, async (req, res, next) => {
  try {
    const { eventId, name, email, userId } = req.body;

    if (!eventId || !name) {
      return res.status(400).json({ error: 'Event ID and name are required' });
    }

    const db = getDatabase();

    // Check if event exists and is open
    const event = await dbGet(db, 'SELECT id, status FROM events WHERE id = ?', [eventId]);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (event.status !== 'open') {
      return res.status(400).json({ error: 'Event is closed' });
    }

    // If user is authenticated, check if already joined
    if (userId) {
      const existing = await dbGet(
        db,
        'SELECT id FROM participants WHERE event_id = ? AND user_id = ?',
        [eventId, userId]
      );
      if (existing) {
        return res.status(400).json({ error: 'Already joined this event' });
      }
    }

    const participantId = uuidv4();
    await dbRun(
      db,
      `INSERT INTO participants (id, event_id, user_id, name, email, payment_status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [participantId, eventId, userId || null, name, email || null]
    );

    const participant = await dbGet(db, 'SELECT * FROM participants WHERE id = ?', [participantId]);
    res.status(201).json(participant);
  } catch (error) {
    next(error);
  }
});

// Add participant (owner only)
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { eventId, name, email } = req.body;

    if (!eventId || !name) {
      return res.status(400).json({ error: 'Event ID and name are required' });
    }

    const db = getDatabase();

    // Verify user is event owner
    const event = await dbGet(db, 'SELECT owner_id FROM events WHERE id = ?', [eventId]);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (event.owner_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const participantId = uuidv4();
    await dbRun(
      db,
      `INSERT INTO participants (id, event_id, name, email, payment_status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [participantId, eventId, name, email || null]
    );

    const participant = await dbGet(db, 'SELECT * FROM participants WHERE id = ?', [participantId]);
    res.status(201).json(participant);
  } catch (error) {
    next(error);
  }
});

// Update participant payment status
router.patch('/:id/payment-status', authenticateToken, async (req, res, next) => {
  try {
    const { payment_status } = req.body;

    if (!['pending', 'paid'].includes(payment_status)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    const db = getDatabase();
    const participant = await dbGet(db, 'SELECT * FROM participants WHERE id = ?', [req.params.id]);

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Check if user is participant themselves or event owner
    const event = await dbGet(db, 'SELECT owner_id FROM events WHERE id = ?', [participant.event_id]);
    const isOwner = event.owner_id === req.user.userId;
    const isParticipant = participant.user_id === req.user.userId;

    if (!isOwner && !isParticipant) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Participants can only mark their own payments
    if (isParticipant && !isOwner && participant.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'You can only update your own payment status' });
    }

    await dbRun(
      db,
      `UPDATE participants SET payment_status = ?, updated_at = datetime('now') WHERE id = ?`,
      [payment_status, req.params.id]
    );

    const updated = await dbGet(db, 'SELECT * FROM participants WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete participant
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const db = getDatabase();
    const participant = await dbGet(db, 'SELECT * FROM participants WHERE id = ?', [req.params.id]);

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Verify user is event owner
    const event = await dbGet(db, 'SELECT owner_id FROM events WHERE id = ?', [participant.event_id]);
    if (event.owner_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if participant has expenses
    const expenses = await dbAll(
      db,
      'SELECT id FROM expenses WHERE paid_by_participant_id = ?',
      [req.params.id]
    );

    if (expenses.length > 0) {
      return res.status(400).json({ error: 'Cannot delete participant with expenses' });
    }

    await dbRun(db, 'DELETE FROM participants WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Leave event
router.post('/:id/leave', optionalAuth, async (req, res, next) => {
  try {
    const db = getDatabase();
    const participant = await dbGet(db, 'SELECT * FROM participants WHERE id = ?', [req.params.id]);

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // If authenticated, verify it's their participant record
    if (req.user && participant.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if participant has expenses
    const expenses = await dbAll(
      db,
      'SELECT id FROM expenses WHERE paid_by_participant_id = ?',
      [req.params.id]
    );

    if (expenses.length > 0) {
      return res.status(400).json({ error: 'Cannot leave: you have expenses in this event' });
    }

    // Check if participant is in expense splits
    const splits = await dbAll(
      db,
      'SELECT id FROM expense_splits WHERE participant_id = ? LIMIT 1',
      [req.params.id]
    );

    if (splits.length > 0) {
      return res.status(400).json({ error: 'Cannot leave: you are included in expense splits' });
    }

    await dbRun(db, 'DELETE FROM participants WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
