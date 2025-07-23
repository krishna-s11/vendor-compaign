-- Add the new 'MSME' value to the existing enum
-- This must be done in a separate transaction from using the value
ALTER TYPE public.msme_status ADD VALUE 'MSME';