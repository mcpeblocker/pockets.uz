-- Remove telegram_username and use user linkage for telegram notifications
-- Participants will be linked to users table via user_id
-- When a user with telegram_id joins, we'll link them via user_id

-- First, drop the old column
ALTER TABLE participants DROP COLUMN IF EXISTS telegram_username;

-- We don't need to add a telegram_id column because we'll get it from users table via user_id
-- This makes the data model cleaner - telegram_id is stored in users table, not duplicated
