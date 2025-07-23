import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Vendor = Tables<'vendors'>;

interface MSMEStats {
  MSME: number;
  'Non MSME': number;
  Others: number;
  total: number;
}

interface CategoryStats {
  Micro: number;
  Small: number;
  Medium: number;
  Others: number;
}

export default function Analytics() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [msmeStats, setMsmeStats] = useState<MSMEStats>({
    MSME: 0,
    'Non MSME': 0,
    Others: 0,
    total: 0,
  });
  const [categoryStats, setCategoryStats] = useState<CategoryStats>({
    Micro: 0,
    Small: 0,
    Medium: 0,
    Others: 0,
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      let allVendors: Vendor[] = [];
      let start = 0;
      const limit = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from('vendors')
          .select('*')
          .range(start, start + limit - 1);

        if (error) throw error;

        if (!data || data.length === 0) break;
        
        allVendors = [...allVendors, ...data];
        
        if (data.length < limit) break;
        
        start += limit;
      }

      setVendors(allVendors);
      calculateStats(allVendors);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (vendorData: Vendor[]) => {
    const msmeStatusCounts: MSMEStats = {
      MSME: 0,
      'Non MSME': 0,
      Others: 0,
      total: vendorData.length,
    };

    const categoryCounts: CategoryStats = {
      Micro: 0,
      Small: 0,
      Medium: 0,
      Others: 0,
    };

    vendorData.forEach(vendor => {
      const status = vendor.msme_status || 'Others';
      if (status in msmeStatusCounts) {
        msmeStatusCounts[status as keyof Omit<MSMEStats, 'total'>]++;
      }

      const category = vendor.msme_category || 'Others';
      if (category in categoryCounts) {
        categoryCounts[category as keyof CategoryStats]++;
      }
    });

    setMsmeStats(msmeStatusCounts);
    setCategoryStats(categoryCounts);
  };

  const getPercentage = (value: number, total: number) => {
    return total > 0 ? ((value / total) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive insights into your vendor MSME status and categories
        </p>
      </div>

      <Tabs defaultValue="msme-status" className="space-y-6">
        <TabsList>
          <TabsTrigger value="msme-status">MSME Status</TabsTrigger>
          <TabsTrigger value="categories">MSME Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="msme-status" className="space-y-6">
          {/* MSME Status Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{msmeStats.total}</div>
                <p className="text-xs text-muted-foreground">All registered vendors</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">MSME</CardTitle>
                <Badge className="bg-green-50 text-green-700 border-green-200">
                  {getPercentage(msmeStats.MSME, msmeStats.total).toFixed(1)}%
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{msmeStats.MSME}</div>
                <p className="text-xs text-muted-foreground">Certified MSME vendors</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Non MSME</CardTitle>
                <Badge className="bg-red-50 text-red-700 border-red-200">
                  {getPercentage(msmeStats['Non MSME'], msmeStats.total).toFixed(1)}%
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{msmeStats['Non MSME']}</div>
                <p className="text-xs text-muted-foreground">Non-MSME vendors</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Others/Pending</CardTitle>
                <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  {getPercentage(msmeStats.Others, msmeStats.total).toFixed(1)}%
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{msmeStats.Others}</div>
                <p className="text-xs text-muted-foreground">Pending or other status</p>
              </CardContent>
            </Card>
          </div>

          {/* MSME Status Visual Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>MSME Status Distribution</CardTitle>
                <CardDescription>Visual breakdown of vendor status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium">MSME</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {msmeStats.MSME} ({getPercentage(msmeStats.MSME, msmeStats.total).toFixed(1)}%)
                    </span>
                  </div>
                  <Progress 
                    value={getPercentage(msmeStats.MSME, msmeStats.total)} 
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-sm font-medium">Non MSME</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {msmeStats['Non MSME']} ({getPercentage(msmeStats['Non MSME'], msmeStats.total).toFixed(1)}%)
                    </span>
                  </div>
                  <Progress 
                    value={getPercentage(msmeStats['Non MSME'], msmeStats.total)} 
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm font-medium">Others</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {msmeStats.Others} ({getPercentage(msmeStats.Others, msmeStats.total).toFixed(1)}%)
                    </span>
                  </div>
                  <Progress 
                    value={getPercentage(msmeStats.Others, msmeStats.total)} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Summary</CardTitle>
                <CardDescription>Key insights from MSME status data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-6 bg-muted/50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {getPercentage(msmeStats.MSME, msmeStats.total).toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">MSME Compliance Rate</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Certified MSME vendors:</span>
                    <span className="font-medium text-green-600">{msmeStats.MSME}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Non-MSME vendors:</span>
                    <span className="font-medium text-red-600">{msmeStats['Non MSME']}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pending/Others:</span>
                    <span className="font-medium text-yellow-600">{msmeStats.Others}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          {/* MSME Category Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Micro Enterprises</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{categoryStats.Micro}</div>
                <p className="text-xs text-muted-foreground">
                  {getPercentage(categoryStats.Micro, msmeStats.total).toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Small Enterprises</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{categoryStats.Small}</div>
                <p className="text-xs text-muted-foreground">
                  {getPercentage(categoryStats.Small, msmeStats.total).toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Medium Enterprises</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{categoryStats.Medium}</div>
                <p className="text-xs text-muted-foreground">
                  {getPercentage(categoryStats.Medium, msmeStats.total).toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Others</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{categoryStats.Others}</div>
                <p className="text-xs text-muted-foreground">
                  {getPercentage(categoryStats.Others, msmeStats.total).toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* MSME Category Visual Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>MSME Category Distribution</CardTitle>
                <CardDescription>Breakdown by enterprise size</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium">Micro</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {categoryStats.Micro} ({getPercentage(categoryStats.Micro, msmeStats.total).toFixed(1)}%)
                    </span>
                  </div>
                  <Progress 
                    value={getPercentage(categoryStats.Micro, msmeStats.total)} 
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="text-sm font-medium">Small</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {categoryStats.Small} ({getPercentage(categoryStats.Small, msmeStats.total).toFixed(1)}%)
                    </span>
                  </div>
                  <Progress 
                    value={getPercentage(categoryStats.Small, msmeStats.total)} 
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-sm font-medium">Medium</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {categoryStats.Medium} ({getPercentage(categoryStats.Medium, msmeStats.total).toFixed(1)}%)
                    </span>
                  </div>
                  <Progress 
                    value={getPercentage(categoryStats.Medium, msmeStats.total)} 
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                      <span className="text-sm font-medium">Others</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {categoryStats.Others} ({getPercentage(categoryStats.Others, msmeStats.total).toFixed(1)}%)
                    </span>
                  </div>
                  <Progress 
                    value={getPercentage(categoryStats.Others, msmeStats.total)} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Insights</CardTitle>
                <CardDescription>Enterprise size distribution analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{categoryStats.Micro}</div>
                    <p className="text-xs text-blue-700">Micro</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{categoryStats.Small}</div>
                    <p className="text-xs text-purple-700">Small</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{categoryStats.Medium}</div>
                    <p className="text-xs text-orange-700">Medium</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">{categoryStats.Others}</div>
                    <p className="text-xs text-gray-700">Others</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}