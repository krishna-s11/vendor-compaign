-- Add DELETE policy for upload_logs table to allow authenticated users to clear logs
CREATE POLICY "Allow authenticated users to delete upload logs" 
ON public.upload_logs 
FOR DELETE 
USING (true);