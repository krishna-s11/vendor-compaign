import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { CampaignFormData } from '@/pages/CreateCampaign';

interface VendorSelectionProps {
  data: CampaignFormData;
  onUpdate: (data: Partial<CampaignFormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

type Vendor = Tables<'vendors'>;

export function VendorSelection({ data, onUpdate, onNext, onPrev }: VendorSelectionProps) {
  const [vendors, setVendors] = useState<Vendor[]>();
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    if (vendors) {
      filterVendors();
    }
  }, [vendors, searchTerm, statusFilter, categoryFilter, groupFilter]);

  const fetchVendors = async () => {
    try {
      // Fetch all vendors in batches of 1000
      const allVendors = [];
      const batchSize = 1000;
      let from = 0;
      
      while (true) {
        const { data, error } = await supabase
          .from('vendors')
          .select('*')
          .order('vendor_name')
          .range(from, from + batchSize - 1);

        if (error) throw error;
        
        if (!data || data.length === 0) break;
        
        allVendors.push(...data);
        
        // If we got less than batchSize, we've reached the end
        if (data.length < batchSize) break;
        
        from += batchSize;
      }

      setVendors(allVendors);
      console.log('Total vendors loaded:', allVendors.length);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterVendors = () => {
    if (!vendors) return;

    let filtered = vendors.filter(vendor => {
      const matchesSearch = vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           vendor.vendor_code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || vendor.msme_status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || vendor.msme_category === categoryFilter;
      const matchesGroup = groupFilter === 'all' || vendor.group_category === groupFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesGroup;
    });

    setFilteredVendors(filtered);
  };

  const handleVendorToggle = (vendorId: string, checked: boolean) => {
    const newSelectedVendors = checked
      ? [...data.selectedVendors, vendorId]
      : data.selectedVendors.filter(id => id !== vendorId);

    onUpdate({ selectedVendors: newSelectedVendors });
  };

  const handleSelectAll = () => {
    const allVendorIds = filteredVendors.map(v => v.id);
    console.log('Selecting all vendors:', allVendorIds.length);
    onUpdate({ selectedVendors: allVendorIds });
    console.log('Updated selectedVendors:', allVendorIds.length);
  };

  const handleDeselectAll = () => {
    onUpdate({ selectedVendors: [] });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const uniqueGroups = [...new Set(vendors?.map(v => v.group_category).filter(Boolean))];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Target Vendors</CardTitle>
        <CardDescription>
          Choose which vendors to include in this campaign
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>MSME Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="MSME Certified">MSME</SelectItem>
                  <SelectItem value="Non MSME">Non MSME</SelectItem>
                  <SelectItem value="MSME Application Pending">Application Pending</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>MSME Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Micro">Micro</SelectItem>
                  <SelectItem value="Small">Small</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Group</Label>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {uniqueGroups.map(group => (
                    <SelectItem key={group} value={group!}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All ({filteredVendors.length})
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                Deselect All
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {data.selectedVendors.length} vendors selected
            </div>
          </div>

          {/* Vendor List */}
          <div className="border rounded-lg">
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">Loading vendors...</div>
              ) : filteredVendors.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No vendors found matching your criteria
                </div>
              ) : (
                <div className="divide-y">
                  {filteredVendors.map((vendor) => (
                    <div key={vendor.id} className="p-4 hover:bg-muted/50">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={data.selectedVendors.includes(vendor.id)}
                          onCheckedChange={(checked) => 
                            handleVendorToggle(vendor.id, checked as boolean)
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{vendor.vendor_name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {vendor.vendor_code} • {vendor.email}
                              </p>
                            </div>
                            <div className="flex flex-col items-end space-y-1">
                              <Badge variant="outline">
                                {vendor.msme_status}
                              </Badge>
                              {vendor.group_category && (
                                <Badge variant="secondary">
                                  {vendor.group_category}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Opening:</span>
                              <div className="font-medium">{formatCurrency(vendor.opening_balance)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Debit:</span>
                              <div className="font-medium">{formatCurrency(vendor.debit_amount)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Credit:</span>
                              <div className="font-medium">{formatCurrency(vendor.credit_amount)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Closing:</span>
                              <div className="font-medium">{formatCurrency(vendor.closing_balance)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onPrev}>
              Previous: Basic Info
            </Button>
            <Button 
              onClick={onNext} 
              disabled={data.selectedVendors.length === 0}
            >
              Next: Choose Templates
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}