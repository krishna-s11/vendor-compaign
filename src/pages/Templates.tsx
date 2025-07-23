import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, MessageCircle, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type EmailTemplate = Tables<'email_templates'>;
type WhatsAppTemplate = Tables<'whatsapp_templates'>;

export default function Templates() {
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const [emailResult, whatsappResult] = await Promise.all([
        supabase.from('email_templates').select('*').order('created_at', { ascending: false }),
        supabase.from('whatsapp_templates').select('*').order('created_at', { ascending: false })
      ]);

      if (emailResult.error) throw emailResult.error;
      if (whatsappResult.error) throw whatsappResult.error;

      setEmailTemplates(emailResult.data || []);
      setWhatsappTemplates(whatsappResult.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch templates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (type: 'email' | 'whatsapp', id: string) => {
    try {
      // Check if template is being used by any ACTIVE campaign
      const { data: activeCampaigns, error: campaignError } = await supabase
        .from('msme_campaigns')
        .select('id, name')
        .eq(type === 'email' ? 'email_template_id' : 'whatsapp_template_id', id)
        .eq('status', 'Active');

      if (campaignError) throw campaignError;

      if (activeCampaigns && activeCampaigns.length > 0) {
        toast({
          title: "Cannot Delete Template",
          description: `This template is being used by ${activeCampaigns.length} active campaign(s). Please end the campaigns first.`,
          variant: "destructive",
        });
        return;
      }

      // Clear template references from completed campaigns
      const templateField = type === 'email' ? 'email_template_id' : 'whatsapp_template_id';
      const { error: updateError } = await supabase
        .from('msme_campaigns')
        .update({ [templateField]: null })
        .eq(templateField, id)
        .neq('status', 'Active');

      if (updateError) throw updateError;

      const { error } = await supabase
        .from(type === 'email' ? 'email_templates' : 'whatsapp_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${type === 'email' ? 'Email' : 'WhatsApp'} template deleted successfully.`,
      });

      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
            <p className="text-muted-foreground">
              Manage your email and WhatsApp templates
            </p>
          </div>
        </div>
        <div className="text-center py-8">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">
            Manage your email and WhatsApp templates
          </p>
        </div>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            WhatsApp Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Email Templates</h2>
            <Button onClick={() => navigate('/templates/email/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Email Template
            </Button>
          </div>

          {emailTemplates.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No Email Templates</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first email template to get started
                </p>
                <Button onClick={() => navigate('/templates/email/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Email Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {emailTemplates.map((template) => (
                <Card key={template.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant="secondary">Email</Badge>
                    </div>
                    <CardDescription className="font-medium">
                      {template.subject}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {template.body.replace(/<[^>]*>/g, '').substring(0, 100)}...
                    </p>
                    {template.variables && template.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {template.variables.map((variable) => (
                          <Badge key={variable} variant="outline" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/templates/email/edit/${template.id}`)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteTemplate('email', template.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">WhatsApp Templates</h2>
            <Button onClick={() => navigate('/templates/whatsapp/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create WhatsApp Template
            </Button>
          </div>

          {whatsappTemplates.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No WhatsApp Templates</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first WhatsApp template to get started
                </p>
                <Button onClick={() => navigate('/templates/whatsapp/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create WhatsApp Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {whatsappTemplates.map((template) => (
                <Card key={template.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        WhatsApp
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {template.content.substring(0, 100)}...
                    </p>
                    {template.variables && template.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {template.variables.map((variable) => (
                          <Badge key={variable} variant="outline" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/templates/whatsapp/edit/${template.id}`)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteTemplate('whatsapp', template.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}