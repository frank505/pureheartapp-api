-- Add user_type column to users table
-- This column stores whether the user is a 'user' or 'partner'
-- Note: Using snake_case (user_type) because User model has underscored: true

ALTER TABLE users 
ADD COLUMN user_type ENUM('user', 'partner') DEFAULT 'user' AFTER username;

-- Add index for faster queries filtering by user_type
CREATE INDEX idx_users_user_type ON users(user_type);
