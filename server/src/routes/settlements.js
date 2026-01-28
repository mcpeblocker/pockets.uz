import express from 'express';
import { getDatabase, dbAll } from '../db/database.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get settlements for an event
router.get('/event/:eventId', optionalAuth, async (req, res, next) => {
  try {
    const db = getDatabase();
    const settlements = await dbAll(
      db,
      'SELECT * FROM settlements WHERE event_id = ? ORDER BY created_at ASC',
      [req.params.eventId]
    );
    res.json(settlements);
  } catch (error) {
    next(error);
  }
});

export default router;
