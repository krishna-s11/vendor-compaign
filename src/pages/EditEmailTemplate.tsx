import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../components/ui/react-quill-custom.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function EditEmailTemplate() {
  const { id } = useParams<{ id: string }>();
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    variables: [] as string[],
  });
  const [newVariable, setNewVariable] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchTemplate();
    }
  }, [id]);

  const fetchTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name,
          subject: data.subject,
          body: data.body,
          variables: data.variables || [],
        });
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      toast({
        title: "Error",
        description: "Failed to fetch template. Please try again.",
        variant: "destructive",
      });
      navigate('/templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditorChange = (content: string) => {
    setFormData(prev => ({ ...prev, body: content }));
  };

  const insertVariable = (variable: string) => {
    const quillEditor = document.querySelector('.ql-editor');
    if (quillEditor) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textNode = document.createTextNode(`{${variable}}`);
        range.deleteContents();
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  const quillModules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['blockquote', 'code-block'],
        ['clean']
      ]
    },
    clipboard: {
      matchVisual: false,
    }
  };

  const quillFormats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet', 'indent',
    'align',
    'link', 'image',
    'blockquote', 'code-block'
  ];

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
    
    if (!formData.name.trim() || !formData.subject.trim() || !formData.body.trim()) {
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
        .from('email_templates')
        .update({
          name: formData.name.trim(),
          subject: formData.subject.trim(),
          body: formData.body,
          variables: formData.variables,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Email template updated successfully.",
      });

      navigate('/templates');
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: "Failed to update email template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Email Template</h1>
            <p className="text-muted-foreground">Loading template...</p>
          </div>
        </div>
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Email Template</h1>
          <p className="text-muted-foreground">
            Update your email template
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
            <CardTitle>Template Details</CardTitle>
            <CardDescription>
              Basic information about your email template
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
              <Label htmlFor="subject">Email Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Enter email subject"
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
                Variables can be used in the email body as {"{variable_name}"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Content</CardTitle>
            <CardDescription>
              Design your email template using the rich text editor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Email Body *</Label>
              <div className="border rounded-md overflow-hidden">
                <ReactQuill
                  value={formData.body}
                  onChange={handleEditorChange}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="Enter your email content here..."
                  style={{ 
                    height: '400px',
                    backgroundColor: 'hsl(var(--background))',
                  }}
                  theme="snow"
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <p className="text-sm text-muted-foreground flex-1">
                  Use variables in your content like {"{vendor_name}"} to personalize emails
                </p>
                {formData.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formData.variables.slice(0, 3).map((variable) => (
                      <Button
                        key={variable}
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => insertVariable(variable)}
                        className="text-xs h-6 px-2"
                      >
                        Insert {variable}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
            {isSubmitting ? 'Updating...' : 'Update Template'}
          </Button>
        </div>
      </form>
    </div>
  );
}