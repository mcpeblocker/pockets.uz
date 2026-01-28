import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, dbRun, dbGet, dbAll } from '../db/database.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { sendSettlementEmail } from '../utils/email.js';
import { calculateSettlements } from '../utils/settlements.js';

const router = express.Router();

// Get all events for current user
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const db = getDatabase();
    
    // Get events where user is owner or participant
    const events = await dbAll(db, `
      SELECT DISTINCT e.*
      FROM events e
      LEFT JOIN participants p ON p.event_id = e.id AND p.user_id = ?
      WHERE e.owner_id = ? OR p.user_id = ?
      ORDER BY e.created_at DESC
    `, [req.user.userId, req.user.userId, req.user.userId]);

    res.json(events);
  } catch (error) {
    next(error);
  }
});

// Get event by ID
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const db = getDatabase();
    const event = await dbGet(db, 'SELECT * FROM events WHERE id = ?', [req.params.id]);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    next(error);
  }
});

// Get event by slug
router.get('/slug/:slug', optionalAuth, async (req, res, next) => {
  try {
    const db = getDatabase();
    const event = await dbGet(db, 'SELECT * FROM events WHERE slug = ?', [req.params.slug]);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    next(error);
  }
});

// Create event
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { title, slug, description, currency } = req.body;

    if (!title || !slug) {
      return res.status(400).json({ error: 'Title and slug are required' });
    }

    const db = getDatabase();

    // Check if slug exists
    const existing = await dbGet(db, 'SELECT id FROM events WHERE slug = ?', [slug]);
    if (existing) {
      return res.status(400).json({ error: 'Slug already taken' });
    }

    const eventId = uuidv4();
    await dbRun(
      db,
      `INSERT INTO events (id, slug, title, description, owner_id, currency, status)
       VALUES (?, ?, ?, ?, ?, ?, 'open')`,
      [eventId, slug, title, description || null, req.user.userId, currency || 'USD']
    );

    // Automatically add owner as participant
    const participantId = uuidv4();
    const user = await dbGet(db, 'SELECT name, email FROM users WHERE id = ?', [req.user.userId]);
    await dbRun(
      db,
      `INSERT INTO participants (id, event_id, user_id, name, email)
       VALUES (?, ?, ?, ?, ?)`,
      [participantId, eventId, req.user.userId, user?.name || 'Owner', user?.email || null]
    );

    const event = await dbGet(db, 'SELECT * FROM events WHERE id = ?', [eventId]);
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

// Update event
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const db = getDatabase();
    const event = await dbGet(db, 'SELECT owner_id FROM events WHERE id = ?', [req.params.id]);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.owner_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { title, description, email_note, currency } = req.body;
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (email_note !== undefined) {
      updates.push('email_note = ?');
      params.push(email_note);
    }
    if (currency !== undefined) {
      updates.push('currency = ?');
      params.push(currency);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = datetime("now")');
    params.push(req.params.id);

    await dbRun(
      db,
      `UPDATE events SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updatedEvent = await dbGet(db, 'SELECT * FROM events WHERE id = ?', [req.params.id]);
    res.json(updatedEvent);
  } catch (error) {
    next(error);
  }
});

// Close event and calculate settlements
router.post('/:id/close', authenticateToken, async (req, res, next) => {
  try {
    const db = getDatabase();
    const event = await dbGet(db, 'SELECT * FROM events WHERE id = ?', [req.params.id]);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.owner_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (event.status === 'closed') {
      return res.status(400).json({ error: 'Event already closed' });
    }

    // Get all expenses and participants
    const expenses = await dbAll(db, `
      SELECT e.*, es.participant_id, es.amount as split_amount, es.percentage
      FROM expenses e
      LEFT JOIN expense_splits es ON es.expense_id = e.id
      WHERE e.event_id = ?
    `, [req.params.id]);

    const participants = await dbAll(db, 'SELECT * FROM participants WHERE event_id = ?', [req.params.id]);

    // Calculate settlements
    const settlements = calculateSettlements(participants, expenses);

    // Delete old settlements
    await dbRun(db, 'DELETE FROM settlements WHERE event_id = ?', [req.params.id]);

    // Insert new settlements
    for (const settlement of settlements) {
      const settlementId = uuidv4();
      await dbRun(
        db,
        `INSERT INTO settlements (id, event_id, from_participant_id, to_participant_id, from_name, to_name, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          settlementId,
          req.params.id,
          settlement.from_participant_id,
          settlement.to_participant_id,
          settlement.from_name,
          settlement.to_name,
          settlement.amount
        ]
      );
    }

    // Update event status
    await dbRun(db, "UPDATE events SET status = 'closed', updated_at = datetime('now') WHERE id = ?", [req.params.id]);

    // Send settlement emails
    const participantEmails = participants
      .filter(p => p.email)
      .map(p => p.email);

    for (const email of participantEmails) {
      try {
        const userSettlements = settlements.filter(s => 
          participants.find(p => p.id === s.from_participant_id && p.email === email) ||
          participants.find(p => p.id === s.to_participant_id && p.email === email)
        );
        await sendSettlementEmail(email, event.title, userSettlements, event.currency, event.email_note);
      } catch (emailError) {
        console.error(`Error sending email to ${email}:`, emailError);
      }
    }

    res.json({ success: true, settlements });
  } catch (error) {
    next(error);
  }
});

// Delete event
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const db = getDatabase();
    const event = await dbGet(db, 'SELECT owner_id FROM events WHERE id = ?', [req.params.id]);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.owner_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await dbRun(db, 'DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
