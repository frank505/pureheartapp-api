-- Fix userType column name to use snake_case (user_type)
-- This is required because the User model uses underscored: true

-- Drop the existing index
DROP INDEX IF EXISTS idx_users_userType ON users;

-- Rename the column from userType to user_type
ALTER TABLE users 
CHANGE COLUMN userType user_type ENUM('user', 'partner') DEFAULT 'user';

-- Recreate the index with correct column name
CREATE INDEX idx_users_user_type ON users(user_type);
