import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, Download, Filter, Search, X } from 'lucide-react';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MSMESubmission {
  id: string;
  vendor_id: string;
  campaign_id: string;
  submitted_at: string;
  response_status: string;
  form_data: any;
  vendor?: {
    vendor_code: string;
    vendor_name: string;
  };
  campaign?: {
    name: string;
  };
}

export function MSMESubmissions() {
  const [submissions, setSubmissions] = useState<MSMESubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<MSMESubmission[]>([]);
  const [campaigns, setCampaigns] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      
      // Batch fetching to handle more than 1000 records
      const BATCH_SIZE = 1000;
      let allSubmissions: MSMESubmission[] = [];
      let hasMore = true;
      let offset = 0;

      while (hasMore) {
        const { data: submissionsData, error } = await supabase
          .from('msme_responses')
          .select(`
            *,
            vendors:vendor_id (
              vendor_code,
              vendor_name
            ),
            msme_campaigns:campaign_id (
              name
            )
          `)
          .not('submitted_at', 'is', null) // Only get actual submissions
          .order('submitted_at', { ascending: false })
          .range(offset, offset + BATCH_SIZE - 1);

        if (error) throw error;

        const batchSubmissions = (submissionsData || []).map(submission => ({
          ...submission,
          vendor: submission.vendors,
          campaign: submission.msme_campaigns
        })) as MSMESubmission[];

        allSubmissions = [...allSubmissions, ...batchSubmissions];
        
        // Check if we got less than batch size (means no more data)
        hasMore = submissionsData && submissionsData.length === BATCH_SIZE;
        offset += BATCH_SIZE;

        console.log(`Fetched batch ${Math.ceil(offset / BATCH_SIZE)}: ${batchSubmissions.length} submissions`);
      }

      console.log(`Total submissions fetched: ${allSubmissions.length}`);
      setSubmissions(allSubmissions);
      setFilteredSubmissions(allSubmissions);
      setTotalCount(allSubmissions.length);

      // Fetch unique campaigns for filter dropdown
      const uniqueCampaigns = Array.from(
        new Map(allSubmissions
          .filter(s => s.campaign)
          .map(s => [s.campaign!.name, { id: s.campaign_id!, name: s.campaign!.name }])
        ).values()
      );
      setCampaigns(uniqueCampaigns);

    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch MSME submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = submissions;

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(submission => 
        submission.vendor?.vendor_code?.toLowerCase().includes(search) ||
        submission.vendor?.vendor_name?.toLowerCase().includes(search)
      );
    }

    // Campaign filter
    if (selectedCampaign !== 'all') {
      filtered = filtered.filter(submission => submission.campaign_id === selectedCampaign);
    }

    // Date range filter
    if (dateRange?.from && dateRange?.to) {
      const startDate = startOfDay(dateRange.from);
      const endDate = endOfDay(dateRange.to);
      
      filtered = filtered.filter(submission => {
        if (!submission.submitted_at) return false;
        const submissionDate = new Date(submission.submitted_at);
        return isWithinInterval(submissionDate, { start: startDate, end: endDate });
      });
    } else if (dateRange?.from) {
      const startDate = startOfDay(dateRange.from);
      const endDate = endOfDay(dateRange.from);
      
      filtered = filtered.filter(submission => {
        if (!submission.submitted_at) return false;
        const submissionDate = new Date(submission.submitted_at);
        return isWithinInterval(submissionDate, { start: startDate, end: endDate });
      });
    }

    setFilteredSubmissions(filtered);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCampaign('all');
    setDateRange(undefined);
    setFilteredSubmissions(submissions);
  };

  const exportToCSV = () => {
    if (filteredSubmissions.length === 0) {
      toast({
        title: "No Data",
        description: "No submissions to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ['Vendor Code', 'Vendor Name', 'Campaign', 'Status', 'Submission Date', 'Form Data'];
    const rows = filteredSubmissions.map(submission => [
      submission.vendor?.vendor_code || '—',
      submission.vendor?.vendor_name || '—',
      submission.campaign?.name || '—',
      submission.response_status,
      submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : '—',
      JSON.stringify(submission.form_data || {})
    ]);

    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    // Create filename based on active filters
    let filename = 'msme_submissions';
    if (searchTerm) filename += `_search_${searchTerm.replace(/\s+/g, '_')}`;
    if (selectedCampaign !== 'all') {
      const campaignName = campaigns.find(c => c.id === selectedCampaign)?.name || selectedCampaign;
      filename += `_${campaignName.replace(/\s+/g, '_')}`;
    }
    if (dateRange?.from) {
      filename += `_${format(dateRange.from, 'yyyy-MM-dd')}`;
      if (dateRange.to) filename += `_to_${format(dateRange.to, 'yyyy-MM-dd')}`;
    }
    filename += '.csv';
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredSubmissions.length} submissions to CSV`,
    });
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedCampaign, dateRange, submissions]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle>MSME Form Submissions</CardTitle>
              <CardDescription>
                Vendors who have submitted MSME status update forms
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by vendor code or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Campaign Filter */}
            <div className="min-w-[200px]">
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="min-w-[250px]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      "Select date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Clear Filters */}
            {(searchTerm || selectedCampaign !== 'all' || dateRange) && (
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>Total Submitted: <strong>{totalCount}</strong></span>
          <span>Showing: <strong>{filteredSubmissions.length}</strong></span>
          {dateRange?.from && (
            <span>
              Date Range: <strong>
                {dateRange.to ? 
                  `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}` :
                  format(dateRange.from, "MMM dd, yyyy")
                }
              </strong>
            </span>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading submitted forms...</div>
        ) : filteredSubmissions.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <ScrollArea className="h-[500px] w-full">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[120px]">Vendor Code</TableHead>
                    <TableHead className="w-[200px]">Vendor Name</TableHead>
                    <TableHead className="w-[150px]">Campaign</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[180px]">Submission Date</TableHead>
                    <TableHead className="w-[150px]">Form Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">
                        {submission.vendor?.vendor_code || '—'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {submission.vendor?.vendor_name || '—'}
                      </TableCell>
                      <TableCell className="truncate">
                        {submission.campaign?.name || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getStatusColor(submission.response_status)}`}
                        >
                          {submission.response_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {submission.submitted_at ? (
                          <div>
                            <div>{format(new Date(submission.submitted_at), "MMM dd, yyyy")}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(submission.submitted_at), "hh:mm a")}
                            </div>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {submission.form_data && Object.keys(submission.form_data).length > 0 ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm">
                                View Details
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-2">
                                <h4 className="font-medium">Form Data</h4>
                                <ScrollArea className="h-40">
                                  <pre className="text-xs whitespace-pre-wrap">
                                    {JSON.stringify(submission.form_data, null, 2)}
                                  </pre>
                                </ScrollArea>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-muted-foreground">No data</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm || selectedCampaign !== 'all' || dateRange ? 
              "No submissions match the current filters" : 
              "No MSME form submissions found."
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}