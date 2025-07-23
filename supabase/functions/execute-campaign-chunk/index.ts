import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExecuteCampaignChunkRequest {
  campaignId: string;
  chunkSize?: number;
  startIndex?: number;
}

// Process smaller chunks to avoid timeout
const DEFAULT_CHUNK_SIZE = 50;
const MESSAGE_BATCH_SIZE = 2; // Respect Resend's rate limits

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { campaignId, chunkSize = DEFAULT_CHUNK_SIZE, startIndex = 0 }: ExecuteCampaignChunkRequest = await req.json();

    console.log('Executing campaign chunk:', { campaignId, chunkSize, startIndex });

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

    const targetVendors = campaign.target_vendors || [];
    if (targetVendors.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        processedCount: 0,
        totalVendors: 0,
        isComplete: true,
        message: 'No target vendors found' 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get vendors already processed to avoid duplicates
    const { data: alreadySent, error: sentError } = await supabase
      .from('campaign_email_sends')
      .select('vendor_id')
      .eq('campaign_id', campaignId)
      .eq('status', 'sent');

    if (sentError) {
      console.error('Error checking already sent emails:', sentError);
    }

    const alreadySentIds = new Set(alreadySent?.map(s => s.vendor_id) || []);
    const remainingVendors = targetVendors.filter(id => !alreadySentIds.has(id));
    
    console.log(`Total vendors: ${targetVendors.length}, Already sent: ${alreadySentIds.size}, Remaining: ${remainingVendors.length}`);

    if (remainingVendors.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        processedCount: 0,
        totalVendors: targetVendors.length,
        isComplete: true,
        message: 'All vendors have already been processed' 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Process chunk starting from startIndex
    const chunkVendors = remainingVendors.slice(startIndex, startIndex + chunkSize);
    
    if (chunkVendors.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        processedCount: 0,
        totalVendors: targetVendors.length,
        isComplete: true,
        message: 'Chunk is empty - campaign complete' 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Processing chunk: ${chunkVendors.length} vendors (${startIndex} to ${startIndex + chunkVendors.length - 1})`);

    // Fetch vendor details for this chunk
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('*')
      .in('id', chunkVendors);

    if (vendorsError) {
      console.error('Error fetching vendors:', vendorsError);
      throw new Error(`Failed to fetch vendors: ${vendorsError.message}`);
    }

    if (!vendors || vendors.length === 0) {
      console.log('No vendor details found for chunk');
      return new Response(JSON.stringify({ 
        success: true, 
        processedCount: 0,
        totalVendors: targetVendors.length,
        isComplete: false,
        nextStartIndex: startIndex + chunkSize
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Process emails for this chunk
    let emailsSent = 0;
    const errors: string[] = [];

    if (campaign.email_template_id) {
      try {
        const result = await processChunkEmails(vendors, campaign, supabaseUrl, supabaseServiceKey);
        emailsSent = result.sent;
        errors.push(...result.errors);
      } catch (error) {
        console.error('Error processing chunk emails:', error);
        errors.push(`Email processing error: ${error.message}`);
      }
    }

    // Check if there are more vendors to process
    const nextStartIndex = startIndex + chunkSize;
    const isComplete = nextStartIndex >= remainingVendors.length;

    console.log(`Chunk processed: ${emailsSent} emails sent, ${errors.length} errors`);

    // If not complete, schedule next chunk automatically
    if (!isComplete) {
      console.log(`More chunks to process. Next start index: ${nextStartIndex}`);
      
      // Schedule next chunk after a small delay using background task
      EdgeRuntime.waitUntil(
        (async () => {
          // Wait 3 seconds before processing next chunk
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          try {
            console.log(`Auto-scheduling next chunk at index: ${nextStartIndex}`);
            
            const response = await fetch(`${supabaseUrl}/functions/v1/execute-campaign-chunk`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                campaignId,
                chunkSize,
                startIndex: nextStartIndex
              })
            });
            
            if (!response.ok) {
              console.error('Failed to schedule next chunk:', await response.text());
            } else {
              console.log('Successfully scheduled next chunk');
            }
          } catch (error) {
            console.error('Error scheduling next chunk:', error);
          }
        })()
      );
    } else {
      console.log('Campaign chunk processing complete');
    }

    return new Response(JSON.stringify({
      success: true,
      processedCount: chunkVendors.length,
      emailsSent,
      totalVendors: targetVendors.length,
      remainingVendors: remainingVendors.length,
      isComplete,
      nextStartIndex: isComplete ? undefined : nextStartIndex,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in execute-campaign-chunk:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred',
        processedCount: 0
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function processChunkEmails(vendors: any[], campaign: any, supabaseUrl: string, supabaseServiceKey: string): Promise<{ sent: number; errors: string[] }> {
  const errors: string[] = [];
  let sent = 0;

  // Process vendors in smaller batches to respect rate limits
  for (let i = 0; i < vendors.length; i += MESSAGE_BATCH_SIZE) {
    const batch = vendors.slice(i, i + MESSAGE_BATCH_SIZE);
    
    await Promise.all(batch.map(async (vendor) => {
      if (!vendor.email) {
        console.log(`Skipping vendor ${vendor.vendor_name} - no email address`);
        return;
      }

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-campaign-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            campaignId: campaign.id,
            vendorId: vendor.id,
            vendorName: vendor.vendor_name,
            vendorEmail: vendor.email,
            vendorCode: vendor.vendor_code,
            vendorLocation: vendor.location,
            templateId: campaign.email_template_id
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        if (result.success) {
          sent++;
          console.log(`✓ Email sent to ${vendor.vendor_name} (${vendor.email})`);
        } else {
          throw new Error(result.error || 'Unknown email send error');
        }
      } catch (error: any) {
        const errorMsg = `Failed to send email to ${vendor.vendor_name}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }));

    // Add delay between batches to respect rate limits
    if (i + MESSAGE_BATCH_SIZE < vendors.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }

  return { sent, errors };
}

serve(handler);