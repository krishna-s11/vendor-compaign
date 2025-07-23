import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCampaignWhatsAppRequest {
  campaignId: string;
  vendorId: string;
  vendorPhone: string;
  vendorName: string;
  templateId: string;
}

const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If it starts with country code, use as is, otherwise assume India (+91)
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  } else if (cleaned.length === 10) {
    return `+91${cleaned}`;
  } else if (cleaned.startsWith('+')) {
    return phone;
  }
  
  return `+${cleaned}`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    if (!twilioAccountSid || !twilioAuthToken) {
      console.error('Missing Twilio credentials:', {
        hasAccountSid: !!twilioAccountSid,
        hasAuthToken: !!twilioAuthToken,
        accountSidLength: twilioAccountSid?.length || 0,
        authTokenLength: twilioAuthToken?.length || 0
      });
      throw new Error('Twilio credentials not configured properly');
    }

    console.log('Twilio credentials check:', {
      accountSidPrefix: twilioAccountSid.substring(0, 8),
      authTokenPrefix: twilioAuthToken.substring(0, 8),
      accountSidLength: twilioAccountSid.length,
      authTokenLength: twilioAuthToken.length
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { campaignId, vendorId, vendorPhone, vendorName, templateId }: SendCampaignWhatsAppRequest = await req.json();

    console.log('Sending campaign WhatsApp:', { campaignId, vendorId, vendorPhone, templateId });

    // Validate phone number
    if (!vendorPhone) {
      throw new Error('Vendor phone number is required');
    }

    const formattedPhone = formatPhoneNumber(vendorPhone);
    console.log('Phone number formatting:', { original: vendorPhone, formatted: formattedPhone });

    // Get WhatsApp template
    const { data: template, error: templateError } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      console.error('Template error:', templateError);
      throw new Error('WhatsApp template not found');
    }

    // Replace variables in template
    let messageContent = template.content;
    
    if (template.variables && template.variables.includes('vendor_name')) {
      messageContent = messageContent.replace(/{vendor_name}/g, vendorName);
    }

    console.log('Sending WhatsApp message:', {
      to: formattedPhone,
      contentLength: messageContent.length,
      templateName: template.name
    });

    // Send WhatsApp message via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append('From', 'whatsapp:+14155238886'); // Twilio Sandbox number
    formData.append('To', `whatsapp:${formattedPhone}`);
    formData.append('Body', messageContent);

    console.log('Making Twilio API request to:', twilioUrl);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const twilioData = await twilioResponse.json();

    console.log('Twilio response:', {
      status: twilioResponse.status,
      statusText: twilioResponse.statusText,
      responseData: twilioData
    });

    if (!twilioResponse.ok) {
      console.error('Twilio API error:', {
        status: twilioResponse.status,
        statusText: twilioResponse.statusText,
        error: twilioData
      });

      // Provide more specific error messages
      let errorMessage = 'Failed to send WhatsApp message';
      if (twilioData.code === 21211) {
        errorMessage = 'Invalid phone number format for WhatsApp';
      } else if (twilioData.code === 20003) {
        errorMessage = 'Invalid Twilio authentication credentials';
      } else if (twilioData.message) {
        errorMessage = `Twilio error: ${twilioData.message}`;
      }

      throw new Error(errorMessage);
    }

    console.log("WhatsApp message sent successfully:", {
      messageSid: twilioData.sid,
      status: twilioData.status,
      to: twilioData.to
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

    return new Response(JSON.stringify({ 
      success: true, 
      messageSid: twilioData.sid,
      status: twilioData.status,
      to: formattedPhone
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-campaign-whatsapp function:", {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.name === 'TypeError' ? 'Network or configuration error' : undefined
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);