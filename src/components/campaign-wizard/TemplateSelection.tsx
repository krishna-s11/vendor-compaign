import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageCircle, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { CampaignFormData } from '@/pages/CreateCampaign';

interface TemplateSelectionProps {
  data: CampaignFormData;
  onUpdate: (data: Partial<CampaignFormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

type EmailTemplate = Tables<'email_templates'>;
type WhatsAppTemplate = Tables<'whatsapp_templates'>;

export function TemplateSelection({ data, onUpdate, onNext, onPrev }: TemplateSelectionProps) {
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const [emailResult, whatsappResult] = await Promise.all([
        supabase.from('email_templates').select('*').order('name'),
        supabase.from('whatsapp_templates').select('*').order('name')
      ]);

      if (emailResult.error) throw emailResult.error;
      if (whatsappResult.error) throw whatsappResult.error;

      setEmailTemplates(emailResult.data || []);
      setWhatsappTemplates(whatsappResult.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    onNext();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">Loading templates...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose Communication Templates</CardTitle>
        <CardDescription>
          Select email and WhatsApp templates for your campaign
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Email Templates */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">Email Template</h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/templates/email/create'}>
                <Plus className="h-4 w-4 mr-2" />
                Create New
              </Button>
            </div>
            
            {emailTemplates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h4 className="font-medium mb-2">No Email Templates Found</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first email template to get started
                  </p>
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '/templates/email/create'}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Email Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <RadioGroup
                value={data.emailTemplateId || ''}
                onValueChange={(value) => onUpdate({ emailTemplateId: value })}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {emailTemplates.map((template) => (
                    <div key={template.id} className="relative">
                      <RadioGroupItem
                        value={template.id}
                        id={`email-${template.id}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`email-${template.id}`}
                        className="flex flex-col space-y-2 rounded-lg border-2 border-muted p-4 hover:border-muted-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{template.name}</h4>
                          <Badge variant="secondary">Email</Badge>
                        </div>
                        <p className="text-sm font-medium">{template.subject}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {template.body.substring(0, 100)}...
                        </p>
                        {template.variables && template.variables.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {template.variables.map((variable) => (
                              <Badge key={variable} variant="outline" className="text-xs">
                                {variable}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}
          </div>

          {/* WhatsApp Templates */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-medium">WhatsApp Template</h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/templates/whatsapp/create'}>
                <Plus className="h-4 w-4 mr-2" />
                Create New
              </Button>
            </div>
            
            {whatsappTemplates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h4 className="font-medium mb-2">No WhatsApp Templates Found</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first WhatsApp template to get started
                  </p>
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '/templates/whatsapp/create'}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create WhatsApp Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <RadioGroup
                value={data.whatsappTemplateId || ''}
                onValueChange={(value) => onUpdate({ whatsappTemplateId: value })}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {whatsappTemplates.map((template) => (
                    <div key={template.id} className="relative">
                      <RadioGroupItem
                        value={template.id}
                        id={`whatsapp-${template.id}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`whatsapp-${template.id}`}
                        className="flex flex-col space-y-2 rounded-lg border-2 border-muted p-4 hover:border-muted-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{template.name}</h4>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            WhatsApp
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {template.content}
                        </p>
                        {template.variables && template.variables.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {template.variables.map((variable) => (
                              <Badge key={variable} variant="outline" className="text-xs">
                                {variable}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onPrev}>
              Previous: Select Vendors
            </Button>
            <Button onClick={handleNext}>
              Next: Review & Launch
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}