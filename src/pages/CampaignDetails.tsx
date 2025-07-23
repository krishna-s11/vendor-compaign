import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, Users, Mail, MessageSquare, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

interface CampaignDetails {
  id: string;
  name: string;
  description: string | null;
  status: string;
  deadline: string | null;
  created_at: string;
  target_vendors: string[] | null;
  email_template_id: string | null;
  whatsapp_template_id: string | null;
}

interface VendorResponse {
  vendor_id: string;
  vendor_name: string;
  vendor_email: string | null;
  vendor_phone: string | null;
  response_status: string;
  submitted_at: string | null;
  form_data: any;
}

interface EmailSendRecord {
  vendor_id: string;
  vendor_name: string;
  vendor_email: string | null;
  vendor_phone: string | null;
  sent_at: string;
  email_type: string;
  status: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active': return 'bg-green-100 text-green-800 border-green-200';
    case 'Draft': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'Completed': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getResponseStatusIcon = (status: string) => {
  switch (status) {
    case 'Completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'Pending': return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'Partial': return <XCircle className="h-4 w-4 text-red-600" />;
    default: return <Clock className="h-4 w-4 text-gray-600" />;
  }
};

export default function CampaignDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
  const [vendorResponses, setVendorResponses] = useState<VendorResponse[]>([]);
  const [emailSends, setEmailSends] = useState<EmailSendRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCampaignDetails();
      
      // Set up real-time subscription for email sends
      const channel = supabase
        .channel('campaign-email-sends')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'campaign_email_sends',
            filter: `campaign_id=eq.${id}`
          },
          (payload) => {
            console.log('Real-time email send update:', payload);
            // Refresh the campaign details when new emails are sent
            fetchCampaignDetails();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id]);

  const fetchCampaignDetails = async () => {
    try {
      // Fetch campaign details
      const { data: campaignData, error: campaignError } = await supabase
        .from('msme_campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Fetch vendor responses with vendor details - all responses, not just completed
      const { data: responsesData, error: responsesError } = await supabase
        .from('msme_responses')
        .select(`
          vendor_id,
          response_status,
          submitted_at,
          form_data,
          vendors (
            vendor_name,
            email,
            phone
          )
        `)
        .eq('campaign_id', id);

      if (responsesError) throw responsesError;

      const formattedResponses = responsesData?.map(response => ({
        vendor_id: response.vendor_id,
        vendor_name: response.vendors?.vendor_name || 'Unknown Vendor',
        vendor_email: response.vendors?.email || null,
        vendor_phone: response.vendors?.phone || null,
        response_status: response.response_status,
        submitted_at: response.submitted_at,
        form_data: response.form_data,
      })) || [];

      setVendorResponses(formattedResponses);

      // Fetch email send records in batches to handle large datasets
      console.log('Fetching email sends for campaign:', id);
      const allEmailSends = [];
      const batchSize = 1000;
      let from = 0;
      
      while (true) {
        const { data: emailSendsBatch, error: emailSendsError } = await supabase
          .from('campaign_email_sends')
          .select(`
            vendor_id,
            sent_at,
            email_type,
            status,
            vendors (
              vendor_name,
              email,
              phone
            )
          `)
          .eq('campaign_id', id)
          .order('sent_at', { ascending: false })
          .range(from, from + batchSize - 1);

        if (emailSendsError) {
          console.error('Error fetching email sends batch:', emailSendsError);
          break;
        }
        
        if (!emailSendsBatch || emailSendsBatch.length === 0) break;
        
        allEmailSends.push(...emailSendsBatch);
        
        // If we got less than batchSize, we've reached the end
        if (emailSendsBatch.length < batchSize) break;
        
        from += batchSize;
      }

      console.log(`Found ${allEmailSends.length} total email send records`);
      const formattedEmailSends = allEmailSends.map(send => ({
        vendor_id: send.vendor_id,
        vendor_name: send.vendors?.vendor_name || 'Unknown Vendor',
        vendor_email: send.vendors?.email || null,
        vendor_phone: send.vendors?.phone || null,
        sent_at: send.sent_at,
        email_type: send.email_type,
        status: send.status,
      }));

      setEmailSends(formattedEmailSends);
      console.log(`Set ${formattedEmailSends.length} email send records in state`);
    } catch (error) {
      console.error('Error fetching campaign details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch campaign details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteCampaign = async () => {
    if (!campaign) return;
    
    setExecuting(true);
    
    try {
      // Update campaign status to Active if it's currently Draft
      if (campaign.status === 'Draft') {
        const { error: statusError } = await supabase
          .from('msme_campaigns')
          .update({ status: 'Active' })
          .eq('id', campaign.id);

        if (statusError) throw statusError;
      }

      // Start the chunked execution - the edge function will handle the rest automatically
      const { data, error } = await supabase.functions.invoke('execute-campaign-chunk', {
        body: { 
          campaignId: campaign.id,
          chunkSize: 50,
          startIndex: 0
        }
      });

      if (error) throw error;

      toast({
        title: "Campaign Execution Started",
        description: `Campaign "${campaign.name}" is now being processed automatically. You can close this tab and the campaign will continue running.`,
      });

      // Set up polling to refresh campaign details every 10 seconds during execution
      const pollInterval = setInterval(() => {
        fetchCampaignDetails();
      }, 10000);

      // Stop polling after 10 minutes or when campaign is no longer active
      setTimeout(() => {
        clearInterval(pollInterval);
      }, 600000);

      // Initial refresh after a short delay
      setTimeout(() => {
        fetchCampaignDetails();
      }, 3000);

    } catch (error) {
      console.error('Error executing campaign:', error);
      toast({
        title: "Error",
        description: "Failed to execute campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleResumeCampaign = async () => {
    if (!campaign) return;
    
    setExecuting(true);
    
    try {
      // Calculate where to resume from based on emails already sent
      const totalVendors = campaign.target_vendors?.length || 0;
      const alreadySent = emailSends.length;
      
      toast({
        title: "Campaign Resumed",
        description: `Resuming campaign "${campaign.name}" from ${alreadySent} sent emails. The campaign will continue running automatically.`,
      });

      // Resume the chunked execution from where we left off
      const { data, error } = await supabase.functions.invoke('execute-campaign-chunk', {
        body: { 
          campaignId: campaign.id,
          chunkSize: 50,
          startIndex: 0 // The function will automatically skip already sent emails
        }
      });

      if (error) throw error;

      // Refresh campaign details after a short delay
      setTimeout(() => {
        fetchCampaignDetails();
      }, 3000);

    } catch (error) {
      console.error('Error resuming campaign:', error);
      toast({
        title: "Error",
        description: "Failed to resume campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleEndCampaign = async () => {
    if (!campaign) return;
    
    try {
      const { error } = await supabase
        .from('msme_campaigns')
        .update({ status: 'Completed' })
        .eq('id', campaign.id);

      if (error) throw error;

      toast({
        title: "Campaign Ended",
        description: `Campaign "${campaign.name}" has been successfully ended.`,
      });

      // Refresh campaign details
      fetchCampaignDetails();
    } catch (error) {
      console.error('Error ending campaign:', error);
      toast({
        title: "Error",
        description: "Failed to end campaign. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Campaign not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalVendors = campaign.target_vendors?.length || 0;
  const completedResponses = vendorResponses.filter(r => r.response_status === 'Completed').length;
  const pendingResponses = vendorResponses.filter(r => r.response_status === 'Pending').length;
  const emailsSent = emailSends.length;
  const progressPercentage = totalVendors > 0 ? (completedResponses / totalVendors) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
            <p className="text-muted-foreground">{campaign.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getStatusColor(campaign.status)}>
            {campaign.status}
          </Badge>
          {campaign.status === 'Draft' && (
            <Button onClick={handleExecuteCampaign} disabled={executing}>
              {executing ? 'Executing...' : 'Execute Campaign'}
            </Button>
          )}
          {campaign.status === 'Active' && emailsSent < totalVendors && (
            <Button variant="outline" onClick={handleResumeCampaign} disabled={executing}>
              {executing ? 'Resuming...' : 'Resume Campaign'}
            </Button>
          )}
          {campaign.status === 'Active' && (
            <Button variant="destructive" onClick={handleEndCampaign}>
              End Campaign
            </Button>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVendors}</div>
            <p className="text-xs text-muted-foreground">Targeted for this campaign</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailsSent}</div>
            <p className="text-xs text-muted-foreground">Emails delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{completedResponses}</div>
             <p className="text-xs text-muted-foreground">MSME forms submitted</p>
           </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingResponses}</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(progressPercentage)}%</div>
            <Progress value={progressPercentage} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Details Tabs */}
      <Tabs defaultValue="responses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="responses">Vendor Responses</TabsTrigger>
          <TabsTrigger value="emails">Email Tracking</TabsTrigger>
          <TabsTrigger value="details">Campaign Details</TabsTrigger>
        </TabsList>

        <TabsContent value="responses">
          <Card>
           <CardHeader>
             <CardTitle>MSME Form Submissions</CardTitle>
           <CardDescription>
             Vendors who have successfully submitted their MSME status updates
           </CardDescription>
           </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted At</TableHead>
                    </TableRow>
                  </TableHeader>
                   <TableBody>
                     {vendorResponses.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                           No responses found for this campaign.
                         </TableCell>
                       </TableRow>
                     ) : (
                       vendorResponses.filter(r => r.response_status === 'Completed').map((response) => (
                        <TableRow key={response.vendor_id}>
                          <TableCell className="font-medium">
                            {response.vendor_name}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {response.vendor_email && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="h-3 w-3" />
                                  {response.vendor_email}
                                </div>
                              )}
                              {response.vendor_phone && (
                                <div className="flex items-center gap-1 text-sm">
                                  <MessageSquare className="h-3 w-3" />
                                  {response.vendor_phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getResponseStatusIcon(response.response_status)}
                              <span className="text-sm">{response.response_status}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {response.submitted_at 
                              ? new Date(response.submitted_at).toLocaleDateString()
                              : 'Not submitted'
                            }
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails">
          <Card>
            <CardHeader>
              <CardTitle>Email Delivery Status</CardTitle>
              <CardDescription>
                Track which vendors have received campaign emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailSends.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No emails sent for this campaign yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      emailSends.map((send, index) => (
                        <TableRow key={`${send.vendor_id}-${index}`}>
                          <TableCell className="font-medium">
                            {send.vendor_name}
                          </TableCell>
                          <TableCell>
                            {send.vendor_email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                {send.vendor_email}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {send.email_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {send.status === 'sent' && <CheckCircle className="h-4 w-4 text-green-600" />}
                              {send.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                              {send.status === 'bounced' && <XCircle className="h-4 w-4 text-orange-600" />}
                              <span className="text-sm capitalize">{send.status}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(send.sent_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Information</CardTitle>
              <CardDescription>
                Detailed information about this campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Campaign Name:</span>
                      <span className="ml-2 font-medium">{campaign.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Description:</span>
                      <span className="ml-2">{campaign.description || 'No description provided'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="outline" className={`ml-2 ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <span className="ml-2">{new Date(campaign.created_at).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Deadline:</span>
                      <span className="ml-2">{campaign.deadline ? new Date(campaign.deadline).toLocaleDateString() : 'No deadline set'}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Templates Used</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Email Template:</span>
                      <span className="ml-2">{campaign.email_template_id ? 'Configured' : 'Not configured'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">WhatsApp Template:</span>
                      <span className="ml-2">{campaign.whatsapp_template_id ? 'Configured' : 'Not configured'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}