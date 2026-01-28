-- Update RESEND_API_KEY with actual value
UPDATE public.system_secrets 
SET value = 're_Hj89YJcE_Pw3jrUq2TD9gshRQ5RgbiZP2',
    updated_at = now()
WHERE key = 'RESEND_API_KEY';
