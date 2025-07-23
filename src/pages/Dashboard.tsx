import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useUploadLogs, useClearUploadLogs } from '@/hooks/useUploadLogs';
import { MSMESubmissions } from '@/components/MSMESubmissions';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: metrics, isLoading } = useDashboardMetrics();
  const { data: uploadLogs, isLoading: isLogsLoading } = useUploadLogs();
  const clearLogsMutation = useClearUploadLogs();
  const { toast } = useToast();

  const handleClearLogs = async () => {
    try {
      await clearLogsMutation.mutateAsync();
      toast({
        title: "Success",
        description: "Upload logs cleared successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear upload logs",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : metrics?.totalVendors}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.totalVendors === 0 ? 'No vendors added yet' : 'Total registered vendors'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : metrics?.activeCampaigns}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.activeCampaigns === 0 ? 'No active campaigns' : 'Currently running campaigns'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No. of MSMEs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : metrics?.msmeCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.totalVendors && metrics?.totalVendors > 0 
                ? `${Math.round((metrics?.msmeCount || 0) / metrics.totalVendors * 100)}% of total vendors`
                : 'No MSME vendors yet'
              }
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : metrics?.pendingResponses}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.pendingResponses === 0 ? 'No pending responses' : 'Awaiting MSME form submissions'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Get started with these common tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              className="h-auto p-6 flex flex-col items-center space-y-2"
              onClick={() => navigate('/campaigns/create')}
            >
              <div className="text-lg font-semibold">Create Campaign</div>
              <div className="text-sm text-center text-muted-foreground">
                Start a new MSME status update campaign
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-6 flex flex-col items-center space-y-2"
              onClick={() => navigate('/vendors')}
            >
              <div className="text-lg font-semibold">Manage Vendors</div>
              <div className="text-sm text-center text-muted-foreground">
                Add, edit, or import vendor information
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-6 flex flex-col items-center space-y-2"
              onClick={() => navigate('/analytics')}
            >
              <div className="text-lg font-semibold">View Analytics</div>
              <div className="text-sm text-center text-muted-foreground">
                Track campaign performance and compliance
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest updates and actions in your MSME management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading recent activity...</div>
          ) : metrics?.recentActivity && metrics.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {metrics.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 pb-3 last:pb-0 border-b last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    activity.type === 'campaign' ? 'bg-blue-500' : 
                    activity.type === 'vendor' ? 'bg-green-500' : 'bg-orange-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{activity.title}</p>
                    {(activity as any).status && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {(activity as any).status}
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No recent activity to show. Start by creating your first campaign or adding vendors.
            </div>
          )}
        </CardContent>
      </Card>

      {/* MSME Submissions */}
      <MSMESubmissions />

      {/* Upload Logs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Upload Issues Log</CardTitle>
            <CardDescription>
              Track vendors with invalid email or phone numbers during upload
            </CardDescription>
          </div>
          {uploadLogs && uploadLogs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearLogs}
              disabled={clearLogsMutation.isPending}
            >
              {clearLogsMutation.isPending ? "Clearing..." : "Clear Logs"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLogsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading upload logs...</div>
          ) : uploadLogs && uploadLogs.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <ScrollArea className="h-[400px] w-full">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[150px]">Vendor Name</TableHead>
                      <TableHead className="w-[100px]">Vendor Code</TableHead>
                      <TableHead className="w-[120px]">Issue Type</TableHead>
                      <TableHead className="w-[200px]">Details</TableHead>
                      <TableHead className="w-[120px]">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium truncate">
                          {log.vendor_name || '—'}
                        </TableCell>
                        <TableCell className="truncate">
                          {log.vendor_code || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              log.error_type.includes('email') 
                                ? 'bg-red-50 text-red-700 border-red-200' 
                                : 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}
                          >
                            {log.error_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="truncate max-w-[200px]" title={log.error_details || ''}>
                          {log.error_details || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No upload issues found. All vendor data has been processed without errors.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}