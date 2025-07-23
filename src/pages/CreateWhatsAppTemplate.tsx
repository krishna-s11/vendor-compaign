import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function CreateWhatsAppTemplate() {
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    variables: [] as string[],
  });
  const [newVariable, setNewVariable] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const addVariable = () => {
    if (newVariable.trim() && !formData.variables.includes(newVariable.trim())) {
      setFormData(prev => ({
        ...prev,
        variables: [...prev.variables, newVariable.trim()]
      }));
      setNewVariable('');
    }
  };

  const removeVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v !== variable)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .insert([{
          name: formData.name.trim(),
          content: formData.content.trim(),
          variables: formData.variables,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "WhatsApp template created successfully.",
      });

      navigate('/templates');
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: "Failed to create WhatsApp template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create WhatsApp Template</h1>
          <p className="text-muted-foreground">
            Create a new WhatsApp template for your campaigns
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/templates')}
        >
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Template Details
            </CardTitle>
            <CardDescription>
              Basic information about your WhatsApp template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter template name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Variables</Label>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Click on vendor fields to add as variables:</p>
                <div className="flex flex-wrap gap-2">
                  {['vendor_name', 'vendor_code', 'email', 'phone', 'location', 'business_category', 'group_category', 'msme_category', 'msme_status', 'udyam_number', 'registration_date', 'last_updated_date', 'opening_balance', 'closing_balance', 'credit_amount', 'debit_amount'].map((field) => (
                    <Button
                      key={field}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!formData.variables.includes(field)) {
                          setFormData(prev => ({
                            ...prev,
                            variables: [...prev.variables, field]
                          }));
                        }
                      }}
                      className="text-xs"
                    >
                      {field.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newVariable}
                    onChange={(e) => setNewVariable(e.target.value)}
                    placeholder="Or add custom variable"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVariable())}
                  />
                  <Button type="button" onClick={addVariable} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {formData.variables.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.variables.map((variable) => (
                    <Badge key={variable} variant="secondary" className="flex items-center gap-1">
                      {variable}
                      <button
                        type="button"
                        onClick={() => removeVariable(variable)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Variables can be used in the message content as {"{variable_name}"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Message Content</CardTitle>
            <CardDescription>
              Write your WhatsApp message template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="content">Message Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter your WhatsApp message content here..."
                rows={8}
                required
              />
              <p className="text-sm text-muted-foreground">
                Use variables in your message like {"{vendor_name}"} to personalize messages
              </p>
            </div>

            {/* Preview */}
            {formData.content && (
              <div className="mt-4">
                <Label>Preview</Label>
                <Card className="mt-2">
                  <CardContent className="p-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-w-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">WhatsApp Message</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{formData.content}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/templates')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Template'}
          </Button>
        </div>
      </form>
    </div>
  );
}