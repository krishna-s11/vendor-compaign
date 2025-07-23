-- Update MSME enums to include "Others" option
ALTER TYPE public.msme_status ADD VALUE 'Others';
ALTER TYPE public.msme_category ADD VALUE 'Others';

-- Add new columns to vendors table for financial and group data
ALTER TABLE public.vendors ADD COLUMN group_category TEXT;
ALTER TABLE public.vendors ADD COLUMN opening_balance DECIMAL(15,2);
ALTER TABLE public.vendors ADD COLUMN debit_amount DECIMAL(15,2);
ALTER TABLE public.vendors ADD COLUMN credit_amount DECIMAL(15,2);
ALTER TABLE public.vendors ADD COLUMN closing_balance DECIMAL(15,2);

-- Insert sample vendor data based on the provided structure
INSERT INTO public.vendors (
    vendor_code, 
    vendor_name, 
    email, 
    phone, 
    msme_status, 
    msme_category,
    group_category,
    opening_balance,
    debit_amount,
    credit_amount,
    closing_balance
) VALUES (
    'VA00005',
    'Sidh Masterbatches Pvt Ltd',
    'jacobgeorge@sidhcolours.com',
    '9811373733',
    'Others',
    'Others',
    'CR-RM',
    -1137735.00,
    2333370.00,
    -1195635.00,
    0.00
);

-- Add some additional sample vendors for testing
INSERT INTO public.vendors (
    vendor_code, 
    vendor_name, 
    email, 
    phone, 
    msme_status, 
    msme_category,
    group_category,
    opening_balance,
    debit_amount,
    credit_amount,
    closing_balance
) VALUES 
(
    'VA00006',
    'Tech Solutions India Ltd',
    'contact@techsolutions.com',
    '9876543210',
    'MSME Certified',
    'Small',
    'IT-SV',
    150000.00,
    75000.00,
    225000.00,
    0.00
),
(
    'VA00007',
    'Green Energy Systems',
    'info@greenenergy.com',
    '9988776655',
    'MSME Application Pending',
    'Medium',
    'EN-RN',
    -50000.00,
    300000.00,
    250000.00,
    0.00
);