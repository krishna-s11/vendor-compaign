-- Allow public access to vendor creation and updates for MSME form
DROP POLICY IF EXISTS "Allow authenticated users to insert vendors" ON public.vendors;
DROP POLICY IF EXISTS "Allow authenticated users to update vendors" ON public.vendors;

-- Create new policies that allow public access
CREATE POLICY "Allow public to create and update vendors for MSME" 
ON public.vendors 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Allow public to insert MSME responses
DROP POLICY IF EXISTS "Allow authenticated users to manage responses" ON public.msme_responses;

CREATE POLICY "Allow public to insert msme responses" 
ON public.msme_responses 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view responses" 
ON public.msme_responses 
FOR SELECT 
USING (true);

-- Allow public document uploads for MSME submissions
DROP POLICY IF EXISTS "Allow authenticated users to manage documents" ON public.document_uploads;

CREATE POLICY "Allow public to upload documents for MSME" 
ON public.document_uploads 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view documents" 
ON public.document_uploads 
FOR SELECT 
USING (true);