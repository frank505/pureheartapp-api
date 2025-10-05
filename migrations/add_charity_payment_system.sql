-- Migration: Add charity organizations and payment tracking tables
-- Run: mysql -u your_username -p your_database < migrations/add_charity_payment_system.sql

-- Table: charity_organizations
-- Stores vetted charity organizations that fight pornography addiction and human trafficking
CREATE TABLE IF NOT EXISTS `charity_organizations` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `legal_name` VARCHAR(255) COMMENT 'Official registered legal name',
  `description` TEXT,
  `mission` TEXT,
  `category` ENUM('anti_pornography', 'human_trafficking', 'child_protection', 'sexual_exploitation', 'addiction_recovery', 'faith_based', 'mental_health', 'education', 'rescue_operations', 'legal_advocacy') NOT NULL,
  
  -- Contact Information
  `website` VARCHAR(500) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50),
  `address` TEXT COMMENT 'Physical address',
  `mailing_address` TEXT COMMENT 'Mailing/PO Box address if different',
  
  -- Financial & Legal Information
  `stripe_account_id` VARCHAR(255) UNIQUE COMMENT 'Stripe Connect account ID',
  `bank_account_last4` VARCHAR(4) COMMENT 'Last 4 digits of bank account',
  `routing_number_last4` VARCHAR(4) COMMENT 'Last 4 digits of routing number',
  `bank_name` VARCHAR(255) COMMENT 'Name of bank',
  `country` VARCHAR(2) DEFAULT 'US',
  `currency` VARCHAR(3) DEFAULT 'USD',
  `tax_id` VARCHAR(50) NOT NULL COMMENT 'EIN or tax ID number',
  `tax_exempt_status` VARCHAR(20) DEFAULT '501c3' COMMENT 'e.g., 501c3, 501c4',
  
  -- Verification & Credibility
  `is_active` BOOLEAN DEFAULT TRUE,
  `is_verified` BOOLEAN DEFAULT FALSE COMMENT 'Admin verified as legitimate',
  `verification_date` DATETIME,
  `verification_notes` TEXT COMMENT 'Admin notes during verification',
  `charity_navigator_rating` DECIMAL(2,1) COMMENT '0.0 to 4.0 stars',
  `charity_navigator_url` VARCHAR(500),
  `guidestar_url` VARCHAR(500),
  `founded_year` YEAR COMMENT 'Year organization was founded',
  
  -- Third Party Verification Links
  `ecfa_member` BOOLEAN DEFAULT FALSE COMMENT 'Evangelical Council for Financial Accountability',
  `ecfa_url` VARCHAR(500),
  `bbb_accredited` BOOLEAN DEFAULT FALSE COMMENT 'Better Business Bureau accredited',
  `bbb_rating` CHAR(2) COMMENT 'A+, A, B+, etc.',
  `bbb_url` VARCHAR(500),
  
  -- Impact & Statistics
  `total_donations_received` DECIMAL(12, 2) DEFAULT 0.00,
  `total_commitments_count` INT DEFAULT 0,
  `annual_budget` DECIMAL(15, 2) COMMENT 'Latest annual budget',
  `program_expense_ratio` DECIMAL(5, 2) COMMENT 'Percentage spent on programs vs admin',
  `people_served_annually` INT COMMENT 'Number of people served per year',
  
  -- Additional Information
  `focus_areas` JSON COMMENT 'Array of specific focus areas',
  `geographic_scope` ENUM('local', 'regional', 'national', 'international') DEFAULT 'national',
  `primary_services` JSON COMMENT 'List of primary services offered',
  `leadership_info` JSON COMMENT 'Key leadership information',
  `awards_recognition` JSON COMMENT 'Awards and recognition received',
  `social_media_links` JSON COMMENT 'Facebook, Twitter, Instagram, etc.',
  `metadata` JSON COMMENT 'Additional charity info',
  
  -- System Fields
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME,
  
  -- Indexes
  INDEX `idx_charity_active` (`is_active`, `is_verified`),
  INDEX `idx_charity_category` (`category`),
  INDEX `idx_charity_tax_id` (`tax_id`),
  INDEX `idx_charity_rating` (`charity_navigator_rating`),
  UNIQUE KEY `idx_charity_name_unique` (`name`, `deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: charity_donations
-- Tracks all donation transactions
CREATE TABLE IF NOT EXISTS `charity_donations` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `commitment_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `charity_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL COMMENT 'Amount in dollars',
  `currency` VARCHAR(3) DEFAULT 'USD',
  `status` ENUM('pending', 'processing', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  `payment_method` ENUM('stripe', 'manual', 'other') DEFAULT 'stripe',
  `stripe_payment_intent_id` VARCHAR(255) UNIQUE,
  `stripe_transfer_id` VARCHAR(255) COMMENT 'Stripe transfer ID to charity',
  `stripe_charge_id` VARCHAR(255),
  `payment_date` DATETIME,
  `transfer_date` DATETIME COMMENT 'When money was transferred to charity',
  `failure_reason` TEXT,
  `metadata` JSON COMMENT 'Additional payment details',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`commitment_id`) REFERENCES `commitments`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`charity_id`) REFERENCES `charity_organizations`(`id`) ON DELETE RESTRICT,
  INDEX `idx_donation_commitment` (`commitment_id`),
  INDEX `idx_donation_user` (`user_id`),
  INDEX `idx_donation_charity` (`charity_id`),
  INDEX `idx_donation_status` (`status`),
  INDEX `idx_donation_payment_date` (`payment_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add charity_id column to commitments table
ALTER TABLE `commitments` 
ADD COLUMN `charity_id` INT UNSIGNED AFTER `financial_amount`,
ADD FOREIGN KEY (`charity_id`) REFERENCES `charity_organizations`(`id`) ON DELETE SET NULL,
ADD INDEX `idx_commitment_charity` (`charity_id`);

-- Note: Charity organizations should be added manually through admin panel
-- This ensures proper verification and Stripe Connect account setup

-- Create view for active, verified charities
CREATE OR REPLACE VIEW `active_charities` AS
SELECT 
  id,
  name,
  legal_name,
  description,
  mission,
  category,
  website,
  email,
  phone,
  address,
  tax_id,
  tax_exempt_status,
  charity_navigator_rating,
  charity_navigator_url,
  founded_year,
  ecfa_member,
  bbb_accredited,
  bbb_rating,
  total_donations_received,
  total_commitments_count,
  annual_budget,
  program_expense_ratio,
  people_served_annually,
  focus_areas,
  geographic_scope,
  primary_services,
  social_media_links,
  verification_date
FROM `charity_organizations`
WHERE `is_active` = TRUE 
  AND `is_verified` = TRUE
  AND `deleted_at` IS NULL
ORDER BY `charity_navigator_rating` DESC, `total_donations_received` DESC;

-- Success message
SELECT 'Charity payment system tables created successfully!' as message;
SELECT COUNT(*) as total_charities FROM charity_organizations WHERE is_verified = TRUE;
