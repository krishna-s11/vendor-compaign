-- Enable real-time updates for campaign_email_sends table
ALTER TABLE campaign_email_sends REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE campaign_email_sends;