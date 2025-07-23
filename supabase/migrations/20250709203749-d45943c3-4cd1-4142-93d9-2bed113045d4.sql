-- Update msme_status enum to use correct values
-- First, update any existing data to use the new values
UPDATE public.vendors 
SET msme_status = 'MSME' 
WHERE msme_status = 'MSME Certified';

UPDATE public.vendors 
SET msme_status = 'Others' 
WHERE msme_status = 'MSME Application Pending';

-- Create a new enum type with the correct values
CREATE TYPE public.msme_status_new AS ENUM ('MSME', 'Non MSME', 'Others');

-- Update the vendors table to use the new enum
ALTER TABLE public.vendors 
ALTER COLUMN msme_status DROP DEFAULT;

ALTER TABLE public.vendors 
ALTER COLUMN msme_status TYPE msme_status_new 
USING msme_status::text::msme_status_new;

-- Set the new default value
ALTER TABLE public.vendors 
ALTER COLUMN msme_status SET DEFAULT 'Others'::msme_status_new;

-- Drop the old enum type and rename the new one
DROP TYPE public.msme_status;
ALTER TYPE public.msme_status_new RENAME TO msme_status;