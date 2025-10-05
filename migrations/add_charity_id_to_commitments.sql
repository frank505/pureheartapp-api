-- Add charity_id column to commitments table for charity donation integration
-- This allows users to select which charity their financial commitment will go to if they fail

ALTER TABLE commitments ADD COLUMN charity_id INT UNSIGNED NULL;
ALTER TABLE commitments ADD CONSTRAINT fk_commitments_charity_id 
  FOREIGN KEY (charity_id) REFERENCES charity_organizations(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_commitments_charity_id ON commitments(charity_id);