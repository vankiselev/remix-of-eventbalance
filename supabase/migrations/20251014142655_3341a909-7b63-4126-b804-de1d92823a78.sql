-- Fix the Бухгалтер role that was incorrectly created as admin role
UPDATE role_definitions 
SET is_admin_role = false 
WHERE code = 'accountant' AND name = 'Бухгалтер';