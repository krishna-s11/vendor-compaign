-- Add the new 'MSME' value to the existing enum
ALTER TYPE public.msme_status ADD VALUE 'MSME';

-- Update existing data to use the new values
UPDATE public.vendors 
SET msme_status = 'MSME' 
WHERE msme_status = 'MSME Certified';

UPDATE public.vendors 
SET msme_status = 'Others' 
WHERE msme_status = 'MSME Application Pending';

-- Update the default value to use 'Others' instead of 'MSME Application Pending'
ALTER TABLE public.vendors 
ALTER COLUMN msme_status SET DEFAULT 'Others';