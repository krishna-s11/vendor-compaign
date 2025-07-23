import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      // Get total vendors count
      const { count: totalVendors } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true });

      // Get active campaigns count
      const { count: activeCampaigns } = await supabase
        .from('msme_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Active');

      // Get MSME count (vendors with MSME status)
      const { count: msmeCount } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('msme_status', 'MSME');

      // Get pending responses count
      const { count: pendingResponses } = await supabase
        .from('msme_responses')
        .select('*', { count: 'exact', head: true })
        .eq('response_status', 'Pending');

      // Get recent activity
      const [recentCampaigns, recentVendors, recentResponses] = await Promise.all([
        supabase
          .from('msme_campaigns')
          .select('name, created_at, status')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('vendors')
          .select('vendor_name, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('msme_responses')
          .select('created_at, vendor_id, campaign_id, vendors(vendor_name), msme_campaigns(name)')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      // Combine and sort all activities
      const activities = [
        ...(recentCampaigns.data || []).map(item => ({
          type: 'campaign',
          title: `Campaign "${item.name}" created`,
          status: item.status,
          timestamp: item.created_at
        })),
        ...(recentVendors.data || []).map(item => ({
          type: 'vendor',
          title: `Vendor "${item.vendor_name}" added`,
          timestamp: item.created_at
        })),
        ...(recentResponses.data || []).map(item => ({
          type: 'response',
          title: `Response submitted by ${item.vendors?.vendor_name || 'Unknown'} for "${item.msme_campaigns?.name || 'Unknown Campaign'}"`,
          timestamp: item.created_at
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

      return {
        totalVendors: totalVendors || 0,
        activeCampaigns: activeCampaigns || 0,
        msmeCount: msmeCount || 0,
        pendingResponses: pendingResponses || 0,
        recentActivity: activities,
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
  });
}