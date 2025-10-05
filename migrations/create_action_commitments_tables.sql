-- Migration: Create Action Commitments System Tables
-- Description: Creates tables for action commitments, proofs, user service stats, and redemption wall
-- Date: 2025-10-04

-- Create actions table
CREATE TABLE IF NOT EXISTS `actions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `category` ENUM('COMMUNITY_SERVICE', 'CHURCH_SERVICE', 'CHARITY', 'HELPING_INDIVIDUALS', 'ENVIRONMENTAL', 'EDUCATION', 'HEALTHCARE', 'CUSTOM') NOT NULL,
  `difficulty` ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'MEDIUM',
  `estimated_hours` DECIMAL(4,1) NOT NULL DEFAULT 1.0,
  `proof_instructions` TEXT NOT NULL,
  `requires_location` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_category` (`category`),
  INDEX `idx_difficulty` (`difficulty`),
  INDEX `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create commitments table
CREATE TABLE IF NOT EXISTS `commitments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `commitment_type` ENUM('ACTION', 'FINANCIAL', 'HYBRID') NOT NULL,
  `action_id` INT UNSIGNED NULL,
  `custom_action_description` TEXT NULL,
  `target_date` DATETIME NOT NULL,
  `partner_id` INT UNSIGNED NULL,
  `require_partner_verification` BOOLEAN NOT NULL DEFAULT FALSE,
  `allow_public_share` BOOLEAN NOT NULL DEFAULT FALSE,
  `status` ENUM('ACTIVE', 'ACTION_PENDING', 'ACTION_PROOF_SUBMITTED', 'ACTION_COMPLETED', 'ACTION_OVERDUE', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `relapse_reported_at` DATETIME NULL,
  `action_deadline` DATETIME NULL,
  `action_completed_at` DATETIME NULL,
  `financial_amount` INT UNSIGNED NULL COMMENT 'Amount in cents',
  `financial_paid_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_partner_id` (`partner_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_target_date` (`target_date`),
  INDEX `idx_action_deadline` (`action_deadline`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`partner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`action_id`) REFERENCES `actions`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create action_proofs table
CREATE TABLE IF NOT EXISTS `action_proofs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `commitment_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `media_type` ENUM('PHOTO', 'VIDEO') NOT NULL,
  `media_url` VARCHAR(500) NOT NULL,
  `thumbnail_url` VARCHAR(500) NULL,
  `user_notes` TEXT NULL,
  `latitude` DECIMAL(10,8) NULL,
  `longitude` DECIMAL(11,8) NULL,
  `location_address` VARCHAR(500) NULL,
  `captured_at` DATETIME NOT NULL,
  `submitted_at` DATETIME NOT NULL,
  `partner_approved` BOOLEAN NULL,
  `verified_at` DATETIME NULL,
  `verified_by` INT UNSIGNED NULL,
  `rejection_reason` ENUM('FACE_NOT_VISIBLE', 'WRONG_LOCATION', 'ACTION_NOT_PERFORMED', 'SUSPICIOUS', 'OTHER') NULL,
  `rejection_notes` TEXT NULL,
  `is_late_submission` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_superseded` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_commitment_id` (`commitment_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_verified_by` (`verified_by`),
  INDEX `idx_submitted_at` (`submitted_at`),
  FOREIGN KEY (`commitment_id`) REFERENCES `commitments`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_service_stats table
CREATE TABLE IF NOT EXISTS `user_service_stats` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL UNIQUE,
  `total_service_hours` DECIMAL(8,1) NOT NULL DEFAULT 0,
  `total_money_donated` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Amount in cents',
  `total_actions_completed` INT UNSIGNED NOT NULL DEFAULT 0,
  `redemption_streak` INT UNSIGNED NOT NULL DEFAULT 0,
  `longest_redemption_streak` INT UNSIGNED NOT NULL DEFAULT 0,
  `last_redemption_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_user_id` (`user_id`),
  INDEX `idx_total_service_hours` (`total_service_hours`),
  INDEX `idx_total_actions_completed` (`total_actions_completed`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create redemption_wall table
CREATE TABLE IF NOT EXISTS `redemption_wall` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `commitment_id` INT UNSIGNED NOT NULL UNIQUE,
  `user_id` INT UNSIGNED NOT NULL,
  `action_id` INT UNSIGNED NOT NULL,
  `proof_id` INT UNSIGNED NOT NULL,
  `is_anonymous` BOOLEAN NOT NULL DEFAULT TRUE,
  `user_reflection` TEXT NULL,
  `encouragement_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `comment_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_visible` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_commitment_id` (`commitment_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_action_id` (`action_id`),
  INDEX `idx_visible` (`is_visible`),
  INDEX `idx_created_at` (`created_at`),
  FOREIGN KEY (`commitment_id`) REFERENCES `commitments`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`action_id`) REFERENCES `actions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`proof_id`) REFERENCES `action_proofs`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
