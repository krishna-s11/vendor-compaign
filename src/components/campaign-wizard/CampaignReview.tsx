import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Users, Mail, MessageCircle, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { CampaignFormData } from '@/pages/CreateCampaign';
import { format } from 'date-fns';

interface CampaignReviewProps {
  data: CampaignFormData;
  onSubmit: (isDraft: boolean) => void;
  onPrev: () => void;
  isSubmitting: boolean;
}

type Vendor = Tables<'vendors'>;
type EmailTemplate = Tables<'email_templates'>;
type WhatsAppTemplate = Tables<'whatsapp_templates'>;

export function CampaignReview({ data, onSubmit, onPrev, isSubmitting }: CampaignReviewProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate | null>(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState<WhatsAppTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('CampaignReview - data changed:', data);
    fetchReviewData();
  }, [data]);

  const fetchReviewData = async () => {
    try {
      console.log('Fetching review data for:', {
        selectedVendors: data.selectedVendors.length,
        emailTemplateId: data.emailTemplateId,
        whatsappTemplateId: data.whatsappTemplateId
      });

      // Fetch vendors in batches if there are many selected
      if (data.selectedVendors.length > 0) {
        await fetchVendorsInBatches();
      }

      // Fetch templates
      await Promise.all([
        data.emailTemplateId ? fetchEmailTemplate() : Promise.resolve(),
        data.whatsappTemplateId ? fetchWhatsAppTemplate() : Promise.resolve()
      ]);

    } catch (error) {
      console.error('Error fetching review data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorsInBatches = async () => {
    try {
      const batchSize = 100; // Supabase can handle up to ~1000, but let's be safe
      const allVendors = [];

      for (let i = 0; i < data.selectedVendors.length; i += batchSize) {
        const batch = data.selectedVendors.slice(i, i + batchSize);
        console.log(`Fetching vendor batch ${Math.floor(i/batchSize) + 1}, size: ${batch.length}`);
        
        const { data: vendorBatch, error } = await supabase
          .from('vendors')
          .select('*')
          .in('id', batch);

        if (error) {
          console.error('Error fetching vendor batch:', error);
          throw error;
        }

        if (vendorBatch) {
          allVendors.push(...vendorBatch);
        }
      }

      console.log('Successfully fetched all vendors:', allVendors.length);
      setVendors(allVendors);
    } catch (error) {
      console.error('Error fetching vendors in batches:', error);
    }
  };

  const fetchEmailTemplate = async () => {
    try {
      const { data: template, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', data.emailTemplateId)
        .single();

      if (error) {
        console.error('Error fetching email template:', error);
        throw error;
      }

      console.log('Email template fetched:', template?.name);
      setEmailTemplate(template);
    } catch (error) {
      console.error('Error fetching email template:', error);
    }
  };

  const fetchWhatsAppTemplate = async () => {
    try {
      const { data: template, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('id', data.whatsappTemplateId)
        .single();

      if (error) {
        console.error('Error fetching WhatsApp template:', error);
        throw error;
      }

      console.log('WhatsApp template fetched:', template?.name);
      setWhatsappTemplate(template);
    } catch (error) {
      console.error('Error fetching WhatsApp template:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">Loading campaign details...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review & Launch Campaign</CardTitle>
        <CardDescription>
          Review all campaign details before launching
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Campaign Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Campaign Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Campaign Name</Label>
                <p className="text-lg font-medium">{data.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Deadline</Label>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-lg">{format(new Date(data.deadline), 'PPP')}</p>
                </div>
              </div>
            </div>
            {data.description && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                <p className="text-sm">{data.description}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Target Vendors */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">Target Vendors</h3>
              </div>
              <Badge variant="secondary">
                {vendors.length} vendors selected
              </Badge>
            </div>
            <div className="border rounded-lg">
              <div className="max-h-48 overflow-y-auto">
                {vendors.length > 0 ? (
                  <>
                    {vendors.length > 10 ? (
                      // Show summary for large lists
                      <div className="p-4 text-center">
                        <p className="font-medium">
                          {vendors.length} vendors selected
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Showing first 5 vendors:
                        </p>
                        <div className="mt-3 space-y-2">
                          {vendors.slice(0, 5).map((vendor, index) => (
                            <div key={vendor.id} className="text-left p-2 border rounded">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm">{vendor.vendor_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {vendor.vendor_code}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {vendor.msme_status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          ... and {vendors.length - 5} more vendors
                        </p>
                      </div>
                    ) : (
                      // Show full list for smaller lists
                      vendors.map((vendor, index) => (
                        <div key={vendor.id} className={`p-3 ${index < vendors.length - 1 ? 'border-b' : ''}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{vendor.vendor_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {vendor.vendor_code} • {vendor.email}
                              </p>
                            </div>
                            <div className="flex space-x-2">
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
                        </div>
                      ))
                    )}
                  </>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No vendors data available
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Templates */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Communication Templates</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email Template */}
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Email Template</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {emailTemplate ? (
                    <div className="space-y-2">
                      <p className="font-medium">{emailTemplate.name}</p>
                      <p className="text-sm text-muted-foreground">{emailTemplate.subject}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {emailTemplate.body.substring(0, 80)}...
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No email template selected</p>
                  )}
                </CardContent>
              </Card>

              {/* WhatsApp Template */}
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    <CardTitle className="text-base">WhatsApp Template</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {whatsappTemplate ? (
                    <div className="space-y-2">
                      <p className="font-medium">{whatsappTemplate.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {whatsappTemplate.content}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No WhatsApp template selected</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Campaign Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Target Vendors</p>
                <p className="font-medium">{vendors.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email Template</p>
                <p className="font-medium">{emailTemplate ? 'Selected' : 'None'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">WhatsApp Template</p>
                <p className="font-medium">{whatsappTemplate ? 'Selected' : 'None'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Deadline</p>
                <p className="font-medium">{format(new Date(data.deadline), 'MMM dd')}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onPrev} disabled={isSubmitting}>
              Previous: Templates
            </Button>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                onClick={() => onSubmit(true)}
                disabled={isSubmitting}
              >
                Save as Draft
              </Button>
              <Button 
                onClick={() => onSubmit(false)}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Launching...' : 'Launch Campaign'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}