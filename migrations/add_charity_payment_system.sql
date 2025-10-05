-- Migration: Add charity organizations and payment tracking tables
-- Run: mysql -u your_username -p your_database < migrations/add_charity_payment_system.sql

-- Table: charity_organizations
-- Stores vetted charity organizations that fight pornography addiction
CREATE TABLE IF NOT EXISTS `charity_organizations` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `mission` TEXT,
  `category` ENUM('addiction_recovery', 'faith_based', 'mental_health', 'education', 'rescue_operations') NOT NULL,
  `website` VARCHAR(255),
  `email` VARCHAR(255),
  `phone` VARCHAR(50),
  `stripe_account_id` VARCHAR(255) UNIQUE COMMENT 'Stripe Connect account ID',
  `bank_account_last4` VARCHAR(4) COMMENT 'Last 4 digits of bank account',
  `country` VARCHAR(2) DEFAULT 'US',
  `currency` VARCHAR(3) DEFAULT 'USD',
  `tax_id` VARCHAR(50) COMMENT 'EIN or tax ID number',
  `is_active` BOOLEAN DEFAULT TRUE,
  `is_verified` BOOLEAN DEFAULT FALSE COMMENT 'Admin verified as legitimate',
  `verification_date` DATETIME,
  `total_donations_received` DECIMAL(10, 2) DEFAULT 0.00,
  `total_commitments_count` INT DEFAULT 0,
  `metadata` JSON COMMENT 'Additional charity info',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME,
  INDEX `idx_charity_active` (`is_active`, `is_verified`),
  INDEX `idx_charity_category` (`category`)
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

-- Insert vetted charity organizations fighting pornography and addiction
INSERT INTO `charity_organizations` 
  (`name`, `description`, `mission`, `category`, `website`, `email`, `is_active`, `is_verified`, `verification_date`) 
VALUES
  (
    'Covenant Eyes',
    'Internet accountability and filtering software helping individuals overcome pornography addiction.',
    'To help people live porn-free through accountability, filtering, and education.',
    'addiction_recovery',
    'https://www.covenanteyes.com',
    'support@covenanteyes.com',
    TRUE,
    TRUE,
    NOW()
  ),
  (
    'Fight the New Drug',
    'Non-religious, non-legislative organization providing education about the harmful effects of pornography.',
    'To provide individuals the opportunity to make an informed decision about pornography by raising awareness on its harmful effects.',
    'education',
    'https://fightthenewdrug.org',
    'info@fightthenewdrug.org',
    TRUE,
    TRUE,
    NOW()
  ),
  (
    'Pure Desire Ministries',
    'Christian organization offering recovery programs for sexual addiction and betrayal trauma.',
    'To provide biblical resources and support for sexual wholeness and healing.',
    'faith_based',
    'https://puredesire.org',
    'info@puredesire.org',
    TRUE,
    TRUE,
    NOW()
  ),
  (
    'XXXchurch',
    'Christian organization helping people affected by pornography through online resources and events.',
    'To bring awareness, openness, and accountability to those affected by pornography.',
    'faith_based',
    'https://xxxchurch.com',
    'info@xxxchurch.com',
    TRUE,
    TRUE,
    NOW()
  ),
  (
    'National Center on Sexual Exploitation (NCOSE)',
    'Organization dedicated to exposing the links between forms of sexual exploitation.',
    'To defend human dignity and advocate for sexual exploitation prevention.',
    'education',
    'https://endsexualexploitation.org',
    'public@ncose.com',
    TRUE,
    TRUE,
    NOW()
  ),
  (
    'Exodus Cry',
    'Non-profit organization fighting sex trafficking and exploitation.',
    'To abolish sex trafficking through education, intervention, and creating a culture that respects human dignity.',
    'rescue_operations',
    'https://exoduscry.com',
    'info@exoduscry.com',
    TRUE,
    TRUE,
    NOW()
  ),
  (
    'Fortify Program',
    'Science-based program helping people overcome pornography using gamification and education.',
    'To help individuals quit pornography through evidence-based strategies.',
    'education',
    'https://www.joinfortify.com',
    'support@joinfortify.com',
    TRUE,
    TRUE,
    NOW()
  ),
  (
    'Proven Men Ministries',
    'Christian organization providing accountability and recovery resources for men.',
    'To help men find freedom from pornography and become proven disciples.',
    'faith_based',
    'https://www.provenmen.org',
    'info@provenmen.org',
    TRUE,
    TRUE,
    NOW()
  ),
  (
    'The Refuge Center',
    'Mental health and recovery center specializing in sexual addiction treatment.',
    'To provide comprehensive treatment for sexual addiction and related issues.',
    'mental_health',
    'https://therefugecenter.com',
    'info@therefugecenter.com',
    TRUE,
    TRUE,
    NOW()
  ),
  (
    'Dirty Girls Ministries',
    'Christian organization helping women overcome sexual sin and pornography.',
    'To help women find freedom, healing, and community in Christ.',
    'faith_based',
    'https://dirtygirlsministries.com',
    'info@dirtygirlsministries.com',
    TRUE,
    TRUE,
    NOW()
  );

-- Create view for active, verified charities
CREATE OR REPLACE VIEW `active_charities` AS
SELECT 
  id,
  name,
  description,
  mission,
  category,
  website,
  email,
  total_donations_received,
  total_commitments_count
FROM `charity_organizations`
WHERE `is_active` = TRUE 
  AND `is_verified` = TRUE
  AND `deleted_at` IS NULL
ORDER BY `total_donations_received` DESC;

-- Success message
SELECT 'Charity payment system tables created successfully!' as message;
SELECT COUNT(*) as total_charities FROM charity_organizations WHERE is_verified = TRUE;
