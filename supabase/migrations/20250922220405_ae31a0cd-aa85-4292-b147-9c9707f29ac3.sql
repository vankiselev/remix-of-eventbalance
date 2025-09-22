-- Add Google Sheets and Drive integration fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN google_sheet_id text,
ADD COLUMN google_drive_folder_id text,
ADD COLUMN google_sheet_url text,
ADD COLUMN google_drive_folder_url text;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.google_sheet_id IS 'Google Sheets ID for employee financial data';
COMMENT ON COLUMN public.profiles.google_drive_folder_id IS 'Google Drive folder ID for employee receipts';
COMMENT ON COLUMN public.profiles.google_sheet_url IS 'Direct URL to Google Sheets for employee';  
COMMENT ON COLUMN public.profiles.google_drive_folder_url IS 'Direct URL to Google Drive folder for employee';