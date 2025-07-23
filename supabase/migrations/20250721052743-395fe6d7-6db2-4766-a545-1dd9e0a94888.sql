-- Fix storage policies for MSME document uploads
-- Allow public uploads to msme-documents bucket

-- Create policy for public insert on storage.objects for msme-documents bucket
CREATE POLICY "Allow public uploads to msme-documents bucket" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'msme-documents');

-- Create policy for public read access to msme-documents bucket  
CREATE POLICY "Allow public access to msme-documents bucket" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'msme-documents');

-- Create policy for authenticated users to manage all storage objects
CREATE POLICY "Allow authenticated users to manage storage objects" 
ON storage.objects 
FOR ALL 
USING (auth.role() = 'authenticated');