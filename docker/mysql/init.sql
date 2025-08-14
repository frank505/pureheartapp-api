-- Initialize the Christian Recovery App Database
-- This script runs when the MySQL container starts for the first time

-- Create the main database (if not exists, though docker-compose already creates it)
CREATE DATABASE IF NOT EXISTS christian_recovery_db;

-- Use the database
USE christian_recovery_db;

-- Create app user with proper permissions
CREATE USER IF NOT EXISTS 'appuser'@'%' IDENTIFIED BY 'apppassword';
GRANT ALL PRIVILEGES ON christian_recovery_db.* TO 'appuser'@'%';
FLUSH PRIVILEGES;

-- Set timezone
SET time_zone = '+00:00';

-- Ensure proper charset and collation
ALTER DATABASE christian_recovery_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;