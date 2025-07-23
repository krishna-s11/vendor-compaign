import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCampaignEmailRequest {
  campaignId: string;
  vendorId: string;
  vendorEmail: string;
  vendorName: string;
  vendorCode: string;
  vendorLocation: string;
  templateId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { campaignId, vendorId, vendorEmail, vendorName, vendorCode, vendorLocation, templateId }: SendCampaignEmailRequest = await req.json();

    console.log('Sending campaign email:', { campaignId, vendorId, vendorEmail, templateId });

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      throw new Error('Email template not found');
    }

    // Replace variables in template
    let emailBody = template.body;
    let emailSubject = template.subject;
    
    if (template.variables && template.variables.includes('vendor_name')) {
      emailBody = emailBody.replace(/{vendor_name}/g, vendorName);
      emailSubject = emailSubject.replace(/{vendor_name}/g, vendorName);
    }
    
    if (template.variables && template.variables.includes('vendor_code')) {
      emailBody = emailBody.replace(/{vendor_code}/g, vendorCode);
      emailSubject = emailSubject.replace(/{vendor_code}/g, vendorCode);
    }
    
    if (template.variables && template.variables.includes('location')) {
      emailBody = emailBody.replace(/{location}/g, vendorLocation || '');
      emailSubject = emailSubject.replace(/{location}/g, vendorLocation || '');
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: Deno.env.get("SENDER_EMAIL_ADDRESS") || "Vendor Compliance System <compliance@Vendorcompliancesystem.com>",
      to: [vendorEmail],
      subject: emailSubject,
      html: emailBody,
    });

    console.log("Email sent successfully:", emailResponse);

    // Insert email send record for tracking
    await supabase
      .from('campaign_email_sends')
      .insert({
        campaign_id: campaignId,
        vendor_id: vendorId,
        email_type: 'invitation',
        status: 'sent'
      });

    // Update response status
    await supabase
      .from('msme_responses')
      .upsert({
        campaign_id: campaignId,
        vendor_id: vendorId,
        response_status: 'Pending',
        form_data: {}
      });

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-campaign-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);