-- Add userType column to users table
-- This column stores whether the user is a 'user' or 'partner'

ALTER TABLE users 
ADD COLUMN userType ENUM('user', 'partner') DEFAULT 'user' AFTER username;

-- Add index for faster queries filtering by userType
CREATE INDEX idx_users_userType ON users(userType);
