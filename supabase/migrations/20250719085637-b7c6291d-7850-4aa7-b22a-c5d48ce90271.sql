
-- Drop the existing restrictive policy for vendors
DROP POLICY IF EXISTS "Allow authenticated users to manage vendors" ON public.vendors;

-- Create separate policies for different operations
-- Allow public read access to vendor data (for MSME form)
CREATE POLICY "Allow public read access to vendors" 
ON public.vendors 
FOR SELECT 
USING (true);

-- Restrict write operations to authenticated users only
CREATE POLICY "Allow authenticated users to insert vendors" 
ON public.vendors 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update vendors" 
ON public.vendors 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to delete vendors" 
ON public.vendors 
FOR DELETE 
TO authenticated 
USING (true);
