import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  totalVendors: number;
  responded: number;
  deadline: string | null;
  created_at: string;
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

export default function Campaigns() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('msme_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      const campaignsWithStats = await Promise.all(
        (campaignsData || []).map(async (campaign) => {
          const totalVendors = campaign.target_vendors?.length || 0;
          
          // Get email sending progress in batches to handle large datasets
          let emailsSent = 0;
          const batchSize = 1000;
          let from = 0;
          
          while (true) {
            const { data: emailBatch, error: emailError } = await supabase
              .from('campaign_email_sends')
              .select('vendor_id')
              .eq('campaign_id', campaign.id)
              .eq('status', 'sent')
              .range(from, from + batchSize - 1);

            if (emailError) {
              console.error('Error fetching email sends batch:', emailError);
              break;
            }
            
            if (!emailBatch || emailBatch.length === 0) break;
            
            emailsSent += emailBatch.length;
            
            // If we got less than batchSize, we've reached the end
            if (emailBatch.length < batchSize) break;
            
            from += batchSize;
          }
          console.log(`Campaign ${campaign.name}: Found ${emailsSent} emails sent`);

          return {
            id: campaign.id,
            name: campaign.name,
            description: campaign.description,
            status: campaign.status || 'Draft',
            totalVendors,
            responded: emailsSent, // Now represents emails sent instead of responses
            deadline: campaign.deadline,
            created_at: campaign.created_at,
          };
        })
      );

      setCampaigns(campaignsWithStats);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to fetch campaigns. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEndCampaign = async (campaignId: string, campaignName: string) => {
    try {
      const { error } = await supabase
        .from('msme_campaigns')
        .update({ status: 'Completed' })
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: "Campaign Ended",
        description: `Campaign "${campaignName}" has been successfully ended.`,
      });

      fetchCampaigns();
    } catch (error) {
      console.error('Error ending campaign:', error);
      toast({
        title: "Error",
        description: "Failed to end campaign. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (campaign.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage your MSME status update campaigns
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/campaigns/create')}>
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.filter(c => c.status === 'Active').length}
            </div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>
        
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Emails Sent</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">
               {campaigns.reduce((sum, c) => sum + c.responded, 0)}
             </div>
             <p className="text-xs text-muted-foreground">Across all campaigns</p>
           </CardContent>
         </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((campaigns.reduce((sum, c) => sum + c.responded, 0) / 
                campaigns.reduce((sum, c) => sum + c.totalVendors, 0)) * 100) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Overall completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Management</CardTitle>
          <CardDescription>
            View and manage all your MSME campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campaigns Table */}
          <div className="border rounded-md overflow-hidden">
            <ScrollArea className="h-[600px] w-full">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="bg-muted/50">
                    <TableHead className="sticky top-0 bg-background border-b">Campaign Name</TableHead>
                    <TableHead className="sticky top-0 bg-background border-b">Status</TableHead>
                    <TableHead className="sticky top-0 bg-background border-b">Progress</TableHead>
                    <TableHead className="sticky top-0 bg-background border-b">Deadline</TableHead>
                    <TableHead className="sticky top-0 bg-background border-b">Created</TableHead>
                    <TableHead className="text-right sticky top-0 bg-background border-b">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Loading campaigns...
                      </TableCell>
                    </TableRow>
                  ) : filteredCampaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No campaigns found. Create your first campaign to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCampaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{campaign.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {campaign.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                        </TableCell>
                         <TableCell>
                           <div className="space-y-1">
                             <div className="text-sm">
                               {campaign.responded} / {campaign.totalVendors} emails sent
                             </div>
                              <div className="w-full max-w-32 bg-muted rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full transition-all" 
                                  style={{ 
                                    width: `${Math.min((campaign.responded / campaign.totalVendors) * 100, 100)}%` 
                                  }}
                                />
                              </div>
                           </div>
                         </TableCell>
                        <TableCell>{campaign.deadline || 'No deadline'}</TableCell>
                        <TableCell>{new Date(campaign.created_at).toLocaleDateString()}</TableCell>
                         <TableCell className="text-right">
                           <div className="flex justify-end gap-2">
                             <Button 
                               variant="outline" 
                               size="sm"
                               onClick={() => navigate(`/campaigns/${campaign.id}`)}
                             >
                               View Details
                             </Button>
                             {campaign.status === 'Active' && (
                               <Button 
                                 variant="destructive" 
                                 size="sm"
                                 onClick={() => handleEndCampaign(campaign.id, campaign.name)}
                               >
                                 End Campaign
                               </Button>
                             )}
                           </div>
                         </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}