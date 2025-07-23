-- Create a table to track email sends for campaigns
CREATE TABLE public.campaign_email_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('invitation', 'reminder')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.campaign_email_sends ENABLE ROW LEVEL SECURITY;

-- Create policies for campaign email sends
CREATE POLICY "Users can view campaign email sends" 
ON public.campaign_email_sends 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert campaign email sends" 
ON public.campaign_email_sends 
FOR INSERT 
WITH CHECK (true);

-- Add foreign key constraints
ALTER TABLE public.campaign_email_sends 
ADD CONSTRAINT campaign_email_sends_campaign_id_fkey 
FOREIGN KEY (campaign_id) REFERENCES public.msme_campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.campaign_email_sends 
ADD CONSTRAINT campaign_email_sends_vendor_id_fkey 
FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_campaign_email_sends_campaign_id ON public.campaign_email_sends(campaign_id);
CREATE INDEX idx_campaign_email_sends_vendor_id ON public.campaign_email_sends(vendor_id);
CREATE INDEX idx_campaign_email_sends_sent_at ON public.campaign_email_sends(sent_at);