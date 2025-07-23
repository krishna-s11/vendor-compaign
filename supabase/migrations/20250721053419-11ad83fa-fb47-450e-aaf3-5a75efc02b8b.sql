-- Additional storage policy fixes for MSME form
-- Allow public update and delete on msme-documents bucket for complete functionality

-- Create policy for public update on storage.objects for msme-documents bucket
CREATE POLICY "Allow public updates to msme-documents bucket" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'msme-documents')
WITH CHECK (bucket_id = 'msme-documents');

-- Create policy for public delete on storage.objects for msme-documents bucket  
CREATE POLICY "Allow public delete from msme-documents bucket" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'msme-documents');