-- Add advance_balance column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS advance_balance numeric DEFAULT 0;

COMMENT ON COLUMN profiles.advance_balance IS 'Сумма выданных авансов сотруднику';

CREATE INDEX IF NOT EXISTS idx_profiles_advance_balance 
ON profiles(advance_balance) 
WHERE advance_balance > 0;