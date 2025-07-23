-- Create storage bucket for MSME documents
INSERT INTO storage.buckets (id, name, public) VALUES ('msme-documents', 'msme-documents', false);

-- Create storage policies for MSME documents
CREATE POLICY "Allow authenticated users to view MSME documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'msme-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow public to upload MSME documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'msme-documents');

CREATE POLICY "Allow authenticated users to update MSME documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'msme-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete MSME documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'msme-documents' AND auth.role() = 'authenticated');