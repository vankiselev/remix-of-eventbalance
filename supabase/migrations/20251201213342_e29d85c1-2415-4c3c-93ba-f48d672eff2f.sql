-- Add advance_balance column to profiles table for tracking employee advances
ALTER TABLE profiles 
ADD COLUMN advance_balance numeric DEFAULT 0;

-- Add comment explaining the column purpose
COMMENT ON COLUMN profiles.advance_balance IS 'Сумма выданных авансов сотруднику (на заметку администратору)';

-- Create index for efficient queries on advances
CREATE INDEX idx_profiles_advance_balance 
ON profiles(advance_balance) 
WHERE advance_balance > 0;