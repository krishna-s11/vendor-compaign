-- Create upload_logs table to track invalid data during vendor uploads
CREATE TABLE public.upload_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  vendor_name TEXT,
  vendor_code TEXT,
  error_type TEXT NOT NULL, -- 'invalid_email', 'invalid_phone', 'duplicate', etc.
  error_details TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.upload_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view logs
CREATE POLICY "Allow authenticated users to view upload logs" 
ON public.upload_logs 
FOR SELECT 
USING (true);

-- Create policy for authenticated users to insert logs
CREATE POLICY "Allow authenticated users to insert upload logs" 
ON public.upload_logs 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Create index for better performance
CREATE INDEX idx_upload_logs_created_at ON public.upload_logs(created_at DESC);
CREATE INDEX idx_upload_logs_session ON public.upload_logs(upload_session_id);
CREATE INDEX idx_upload_logs_error_type ON public.upload_logs(error_type);