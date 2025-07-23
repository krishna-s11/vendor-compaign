
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExecuteCampaignRequest {
  campaignId: string;
}

// Batch size for processing vendors
const BATCH_SIZE = 100;
const MESSAGE_BATCH_SIZE = 2; // Respect Resend's 2 requests/second limit

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { campaignId }: ExecuteCampaignRequest = await req.json();

    console.log('Executing campaign:', campaignId);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('msme_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign not found:', campaignError);
      throw new Error('Campaign not found');
    }

    console.log('Campaign details:', {
      id: campaign.id,
      name: campaign.name,
      targetVendorsCount: campaign.target_vendors?.length || 0,
      hasEmailTemplate: !!campaign.email_template_id,
      hasWhatsAppTemplate: !!campaign.whatsapp_template_id
    });

    const targetVendors = campaign.target_vendors || [];
    if (targetVendors.length === 0) {
      console.log('No target vendors found for campaign');
      return new Response(JSON.stringify({ 
        success: true, 
        emailsSent: 0, 
        whatsappSent: 0,
        message: 'No target vendors found' 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let emailsSent = 0;
    let whatsappSent = 0;
    const errors: string[] = [];

    // Process vendors in batches
    console.log(`Processing ${targetVendors.length} vendors in batches of ${BATCH_SIZE}`);
    
    for (let i = 0; i < targetVendors.length; i += BATCH_SIZE) {
      const batchVendorIds = targetVendors.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(targetVendors.length / BATCH_SIZE);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batchVendorIds.length} vendors)`);

      try {
        // Fetch vendors for this batch
        const { data: vendors, error: vendorsError } = await supabase
          .from('vendors')
          .select('*')
          .in('id', batchVendorIds);

        if (vendorsError) {
          console.error('Error fetching vendors for batch:', vendorsError);
          errors.push(`Batch ${batchNumber}: Failed to fetch vendors - ${vendorsError.message}`);
          continue;
        }

        if (!vendors || vendors.length === 0) {
          console.log(`No vendors found for batch ${batchNumber}`);
          continue;
        }

        console.log(`Fetched ${vendors.length} vendors for batch ${batchNumber}`);

        // Process emails for this batch
        if (campaign.email_template_id) {
          const emailResults = await processBatchEmails(
            vendors,
            campaign,
            batchNumber,
            supabaseUrl,
            supabaseServiceKey
          );
          emailsSent += emailResults.sent;
          errors.push(...emailResults.errors);
        }

        // Process WhatsApp messages for this batch
        if (campaign.whatsapp_template_id) {
          const whatsappResults = await processBatchWhatsApp(
            vendors,
            campaign,
            batchNumber,
            supabaseUrl,
            supabaseServiceKey
          );
          whatsappSent += whatsappResults.sent;
          errors.push(...whatsappResults.errors);
        }

        // Small delay between batches to avoid overwhelming the system
        if (i + BATCH_SIZE < targetVendors.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (batchError) {
        console.error(`Error processing batch ${batchNumber}:`, batchError);
        errors.push(`Batch ${batchNumber}: ${batchError.message}`);
      }
    }

    // Update campaign status to Active
    const { error: updateError } = await supabase
      .from('msme_campaigns')
      .update({ status: 'Active' })
      .eq('id', campaignId);

    if (updateError) {
      console.error('Error updating campaign status:', updateError);
      errors.push(`Failed to update campaign status: ${updateError.message}`);
    }

    console.log(`Campaign execution completed: ${emailsSent} emails, ${whatsappSent} WhatsApp messages sent`);
    console.log(`Total errors: ${errors.length}`);

    return new Response(JSON.stringify({ 
      success: true, 
      emailsSent, 
      whatsappSent, 
      totalVendors: targetVendors.length,
      errors: errors.length > 0 ? errors : undefined 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in execute-campaign function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function processBatchEmails(
  vendors: any[],
  campaign: any,
  batchNumber: number,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ sent: number; errors: string[] }> {
  let sent = 0;
  const errors: string[] = [];

  console.log(`Processing emails for batch ${batchNumber} (${vendors.length} vendors)`);

  // Process emails sequentially to respect rate limits (2 requests/second)
  for (const vendor of vendors) {
    if (!vendor.email) {
      continue;
    }

    try {
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-campaign-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          vendorId: vendor.id,
          vendorEmail: vendor.email,
          vendorName: vendor.vendor_name,
          vendorCode: vendor.vendor_code,
          vendorLocation: vendor.location,
          templateId: campaign.email_template_id,
        }),
      });

      if (emailResponse.ok) {
        sent++;
      } else {
        const errorData = await emailResponse.json();
        if (errorData.error?.includes('rate_limit_exceeded')) {
          console.log(`Rate limit hit for ${vendor.vendor_name}, waiting longer...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second extra
          // Retry once
          const retryResponse = await fetch(`${supabaseUrl}/functions/v1/send-campaign-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              campaignId: campaign.id,
              vendorId: vendor.id,
              vendorEmail: vendor.email,
              vendorName: vendor.vendor_name,
              vendorCode: vendor.vendor_code,
              vendorLocation: vendor.location,
              templateId: campaign.email_template_id,
            }),
          });
          if (retryResponse.ok) {
            sent++;
          } else {
            errors.push(`Email to ${vendor.vendor_name}: ${errorData.error}`);
          }
        } else {
          errors.push(`Email to ${vendor.vendor_name}: ${errorData.error}`);
        }
      }
    } catch (error) {
      errors.push(`Email to ${vendor.vendor_name}: ${error}`);
    }

    // Wait 500ms between each email (2 per second limit)
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`Batch ${batchNumber} emails: ${sent} sent, ${errors.length} errors`);
  return { sent, errors };
}

async function processBatchWhatsApp(
  vendors: any[],
  campaign: any,
  batchNumber: number,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ sent: number; errors: string[] }> {
  let sent = 0;
  const errors: string[] = [];

  console.log(`Processing WhatsApp messages for batch ${batchNumber} (${vendors.length} vendors)`);

  // Process WhatsApp messages in smaller sub-batches to avoid rate limits
  for (let i = 0; i < vendors.length; i += MESSAGE_BATCH_SIZE) {
    const messageBatch = vendors.slice(i, i + MESSAGE_BATCH_SIZE);
    
    await Promise.all(messageBatch.map(async (vendor) => {
      if (!vendor.phone) {
        return;
      }

      try {
        const whatsappResponse = await fetch(`${supabaseUrl}/functions/v1/send-campaign-whatsapp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            campaignId: campaign.id,
            vendorId: vendor.id,
            vendorPhone: vendor.phone,
            vendorName: vendor.vendor_name,
            templateId: campaign.whatsapp_template_id,
          }),
        });

        if (whatsappResponse.ok) {
          sent++;
        } else {
          const errorData = await whatsappResponse.json();
          errors.push(`WhatsApp to ${vendor.vendor_name}: ${errorData.error}`);
        }
      } catch (error) {
        errors.push(`WhatsApp to ${vendor.vendor_name}: ${error}`);
      }
    }));

    // Small delay between message batches
    if (i + MESSAGE_BATCH_SIZE < vendors.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  console.log(`Batch ${batchNumber} WhatsApp: ${sent} sent, ${errors.length} errors`);
  return { sent, errors };
}

serve(handler);
