-- Migration: Add is_automatic column to accountability_checkins table
-- This migration adds support for distinguishing between manual and automatic check-ins
-- Default value is TRUE (automatic), manual check-ins explicitly set to FALSE

-- Add the is_automatic column with TRUE as default
ALTER TABLE accountability_checkins 
ADD COLUMN is_automatic BOOLEAN NOT NULL DEFAULT TRUE;

-- Add an index for better query performance when filtering by automatic check-ins
CREATE INDEX idx_accountability_checkins_is_automatic 
ON accountability_checkins(is_automatic);

-- Add a composite index for user_id and is_automatic for efficient filtering
CREATE INDEX idx_accountability_checkins_user_automatic 
ON accountability_checkins(user_id, is_automatic, created_at DESC);

-- Update any existing check-ins to be marked as manual (set to FALSE)
-- This ensures data consistency since all existing check-ins were manual
UPDATE accountability_checkins 
SET is_automatic = FALSE 
WHERE created_at < NOW();