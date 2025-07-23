import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Upload, FileText, Building, Shield, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

// Zod schema for form validation
const msmeFormSchema = z.object({
  vendorCode: z.string().min(3, 'Vendor code must be at least 3 characters'),
  vendorName: z.string().min(2, 'Vendor name must be at least 2 characters'),
  businessAddress: z.string().min(10, 'Business address must be at least 10 characters'),
  msmeStatus: z.enum(['MSME Certified', 'Non MSME'], {
    required_error: 'Please select your MSME status',
  }),
  msmeCategory: z.enum(['Micro Enterprise', 'Small Enterprise', 'Medium Enterprise']).optional(),
  udyamNumber: z.string().optional(),
  certificate: z.any().optional(),
  nonMsmeDeclaration: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // Conditional validation for MSME Certified
  if (data.msmeStatus === 'MSME Certified') {
    if (!data.msmeCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MSME category is required when MSME certified',
        path: ['msmeCategory'],
      });
    }
    if (!data.udyamNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Udyam registration number is required when MSME certified',
        path: ['udyamNumber'],
      });
    } else if (!/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/.test(data.udyamNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Udyam number must follow format: UDYAM-XX-XX-XXXXXXX',
        path: ['udyamNumber'],
      });
    }
    if (!data.certificate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Certificate upload is required when MSME certified',
        path: ['certificate'],
      });
    }
  }
  
  // Conditional validation for Non MSME
  if (data.msmeStatus === 'Non MSME') {
    if (!data.nonMsmeDeclaration) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Declaration is required when selecting Non MSME',
        path: ['nonMsmeDeclaration'],
      });
    }
  }
});

type MSMEFormData = z.infer<typeof msmeFormSchema>;

export default function MSMEStatusUpdate() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadingVendor, setLoadingVendor] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const form = useForm<MSMEFormData>({
    resolver: zodResolver(msmeFormSchema),
    defaultValues: {
      vendorCode: '',
      vendorName: '',
      businessAddress: '',
      nonMsmeDeclaration: false,
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const msmeStatus = watch('msmeStatus');
  const vendorCode = watch('vendorCode');

  // Auto-populate vendor data when vendor code changes
  useEffect(() => {
    const fetchVendorData = async () => {
      if (vendorCode && vendorCode.length >= 3) {
        setLoadingVendor(true);
        let attempts = 0;
        const maxAttempts = 3;
        
        const attemptFetch = async (): Promise<void> => {
          try {
            attempts++;
            console.log(`Searching for vendor code: "${vendorCode}" (attempt ${attempts})`);
            
            // Case-insensitive search for vendor code
            const { data: vendor, error } = await supabase
              .from('vendors')
              .select('vendor_name, location')
              .ilike('vendor_code', vendorCode)
              .maybeSingle();

            console.log('Search result:', { vendor, error });

            if (error) {
              console.error('Supabase error:', error);
              throw error;
            }

            if (vendor) {
              console.log('Vendor found:', vendor);
              setValue('vendorName', vendor.vendor_name);
              setValue('businessAddress', vendor.location || '');
              toast({
                title: "Vendor Found",
                description: `Details loaded for ${vendor.vendor_name}`,
              });
            } else {
              console.log('No vendor found with ilike, trying exact match...');
              // Try exact match as fallback
              const { data: exactVendor, error: exactError } = await supabase
                .from('vendors')
                .select('vendor_name, location')
                .eq('vendor_code', vendorCode)
                .maybeSingle();
                
              console.log('Exact match result:', { exactVendor, exactError });
                
              if (exactVendor && !exactError) {
                setValue('vendorName', exactVendor.vendor_name);
                setValue('businessAddress', exactVendor.location || '');
                toast({
                  title: "Vendor Found",
                  description: `Details loaded for ${exactVendor.vendor_name}`,
                });
              } else if (attempts === maxAttempts) {
                // Log some existing vendor codes for debugging
                const { data: sampleVendors } = await supabase
                  .from('vendors')
                  .select('vendor_code')
                  .limit(5);
                
                console.log('Sample vendor codes in database:', sampleVendors?.map(v => v.vendor_code));
                
                toast({
                  title: "Vendor Not Found",
                  description: `No vendor found with code "${vendorCode}". Please check the code and try again.`,
                  variant: "destructive",
                });
              }
            }
          } catch (error) {
            console.error(`Attempt ${attempts} failed:`, error);
            
            if (attempts < maxAttempts) {
              // Retry with exponential backoff
              setTimeout(() => attemptFetch(), 1000 * attempts);
            } else {
              toast({
                title: "Connection Error",
                description: "Unable to fetch vendor data. Please check your connection and try again.",
                variant: "destructive",
              });
            }
          }
        };
        
        await attemptFetch();
        setLoadingVendor(false);
      }
    };

    const debounceTimer = setTimeout(fetchVendorData, 500);
    return () => clearTimeout(debounceTimer);
  }, [vendorCode, setValue, toast]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload PDF, PNG, or JPG files only.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload files smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }

      setValue('certificate', file);
      setUploadedFile(file);
    }
  };

  const handleUploadClick = () => {
    document.getElementById('certificate')?.click();
  };

  const onSubmit = async (data: MSMEFormData) => {
    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Check if vendor exists and update or create
      const { data: existingVendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('vendor_code', data.vendorCode)
        .maybeSingle();

      // Prepare vendor data
      const vendorData = {
        vendor_code: data.vendorCode,
        vendor_name: data.vendorName,
        location: data.businessAddress,
        msme_status: data.msmeStatus === 'MSME Certified' ? 'MSME' : data.msmeStatus as any,
        msme_category: data.msmeStatus === 'MSME Certified' 
          ? (data.msmeCategory === 'Micro Enterprise' ? 'Micro' 
             : data.msmeCategory === 'Small Enterprise' ? 'Small' 
             : 'Medium') as any
          : null,
        udyam_number: data.msmeStatus === 'MSME Certified' ? data.udyamNumber : null,
        last_updated_date: new Date().toISOString(),
      };

      let vendorId: string;

      if (existingVendor) {
        // Update existing vendor
        const { error: updateError } = await supabase
          .from('vendors')
          .update(vendorData)
          .eq('id', existingVendor.id);

        if (updateError) throw updateError;
        vendorId = existingVendor.id;
      } else {
        // Vendor doesn't exist - prevent creation of new vendors
        throw new Error(`Vendor code "${data.vendorCode}" not found. Please contact your administrator to register your vendor code first.`);
      }

      // Get active campaign to link the response
      const { data: activeCampaign } = await supabase
        .from('msme_campaigns')
        .select('id')
        .eq('status', 'Active')
        .maybeSingle();

      // Create response record
      const responseData = {
        vendor_id: vendorId,
        campaign_id: activeCampaign?.id || null,
        response_status: 'Completed' as any,
        form_data: {
          vendorCode: data.vendorCode,
          vendorName: data.vendorName,
          businessAddress: data.businessAddress,
          msmeStatus: data.msmeStatus,
          msmeCategory: data.msmeCategory,
          udyamNumber: data.udyamNumber,
          nonMsmeDeclaration: data.nonMsmeDeclaration,
          submittedAt: new Date().toISOString(),
        },
        submitted_at: new Date().toISOString(),
      };

      const { error: responseError } = await supabase
        .from('msme_responses')
        .insert([responseData]);

      if (responseError) throw responseError;

      // Handle file upload and storage
      let fileName = '';
      if (data.msmeStatus === 'MSME Certified' && data.certificate) {
        // Upload certificate file with unique naming convention (includes timestamp)
        const fileExtension = data.certificate.name.split('.').pop();
        const timestamp = Date.now();
        fileName = `${data.vendorCode}_${data.vendorName.replace(/\s+/g, '_')}_${timestamp}.${fileExtension}`;
        
        console.log('Uploading file:', fileName, 'Size:', data.certificate.size);
        const { error: uploadError } = await supabase.storage
          .from('msme-documents')
          .upload(fileName, data.certificate, {
            upsert: false // Changed to false since we now have unique filenames
          });

        if (uploadError) {
          console.error('File upload error:', uploadError);
          toast({
            title: "Upload Failed",
            description: `Failed to upload certificate: ${uploadError.message}`,
            variant: "destructive",
          });
          throw new Error('Failed to upload certificate');
        }
        console.log('File uploaded successfully:', fileName);
      } else if (data.msmeStatus === 'Non MSME') {
        // Generate PDF for Non MSME declaration
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const currentDate = new Date();
        const submissionDate = currentDate.toLocaleDateString();
        const submissionTime = currentDate.toLocaleTimeString();
        
        // Header - Vendor Name (centered, large font)
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        const vendorNameWidth = pdf.getTextWidth(data.vendorName);
        pdf.text(data.vendorName, (pageWidth - vendorNameWidth) / 2, 30);
        
        // Title (centered, medium font)
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        const titleText = 'DECLARATION OF REGISTRATION IN NON MSME';
        const titleWidth = pdf.getTextWidth(titleText);
        pdf.text(titleText, (pageWidth - titleWidth) / 2, 60);
        
        // Body text (justified, normal font)
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        const bodyText = `This is to certify that our company ${data.vendorName} located at ${data.businessAddress} has not registered under Micro,Small, Medium enterprises (MSME) development Act 2006 as on date of declaration.`;
        
        // Split text into lines that fit the page width
        const lines = pdf.splitTextToSize(bodyText, pageWidth - 40);
        pdf.text(lines, 20, 90);
        
        // Calculate Y position after body text
        const bodyEndY = 90 + (lines.length * 7);
        
        // Signature section
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text('For and on behalf of', 20, bodyEndY + 40);
        pdf.text(data.vendorName, 20, bodyEndY + 50);
        pdf.text('(Digitally Signed)', 20, bodyEndY + 60);
        
        // Footer section
        const footerY = pageHeight - 60;
        
        // Vendor address (centered)
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const addressLines = pdf.splitTextToSize(data.businessAddress, pageWidth - 40);
        const addressStartY = footerY - 20;
        
        addressLines.forEach((line: string, index: number) => {
          const lineWidth = pdf.getTextWidth(line);
          pdf.text(line, (pageWidth - lineWidth) / 2, addressStartY + (index * 5));
        });
        
        // Digital signature text (centered)
        const digitalSignText = `Document has been digitally signed with acceptance on Vendor Compliance System at ${submissionTime} on ${submissionDate}`;
        const digitalSignLines = pdf.splitTextToSize(digitalSignText, pageWidth - 40);
        const digitalSignStartY = addressStartY + (addressLines.length * 5) + 10;
        
        digitalSignLines.forEach((line: string, index: number) => {
          const lineWidth = pdf.getTextWidth(line);
          pdf.text(line, (pageWidth - lineWidth) / 2, digitalSignStartY + (index * 5));
        });
        
        // Convert PDF to blob and upload
        const pdfBlob = pdf.output('blob');
        fileName = `${data.vendorCode}_${data.vendorName.replace(/\s+/g, '_')}_Declaration.pdf`;
        
        console.log('Uploading PDF:', fileName);
        const { error: uploadError } = await supabase.storage
          .from('msme-documents')
          .upload(fileName, pdfBlob, {
            upsert: true,
            contentType: 'application/pdf'
          });

        if (uploadError) {
          console.error('PDF upload error:', uploadError);
          toast({
            title: "Upload Failed",
            description: `Failed to upload declaration PDF: ${uploadError.message}`,
            variant: "destructive",
          });
          throw new Error('Failed to upload declaration PDF');
        }
        console.log('PDF uploaded successfully:', fileName);
      }

      // Store file reference in document_uploads table
      if (fileName) {
        const { error: docError } = await supabase
          .from('document_uploads')
          .insert([{
            vendor_id: vendorId,
            file_name: fileName,
            file_path: `msme-documents/${fileName}`,
            file_type: data.msmeStatus === 'MSME Certified' ? data.certificate?.type || 'application/pdf' : 'application/pdf',
            file_size: data.msmeStatus === 'MSME Certified' ? data.certificate?.size || 0 : 0
          }]);

        if (docError) {
          console.error('Document record error:', docError);
          // Don't throw here as the main data is already saved
        }
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setSubmitSuccess(true);
        toast({
          title: "Success!",
          description: "Your MSME status has been updated successfully.",
        });
      }, 500);

    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Submission Failed",
        description: "Please try again or contact support if the problem persists.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="text-center">
              <CardContent className="p-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">
                  Submission Successful!
                </h2>
                <p className="text-muted-foreground mb-6">
                  Thank you for updating your MSME status. Your information has been recorded successfully.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 text-sm">
                    <strong>Next Steps:</strong> You will receive a confirmation email shortly. 
                    If you have any questions, please contact our support team.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <img 
                src="/lovable-uploads/54d835ce-b7c1-4495-b0e3-f8050cbea30d.png" 
                alt="Vendor Logo" 
                className="w-48 h-18 mx-auto object-contain mb-6"
              />
            </div>
            <div className="mb-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Vendor Compliance System
              </h1>
              <p className="text-lg text-muted-foreground">This portal is governed and managed by Vendor Enterprises India Limited. In case of any issue, please contact Vendor Corporate Sourcing.</p>
            </div>
            <div className="max-w-2xl mx-auto">
              <Alert className="border-blue-200 bg-blue-50/50">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Please update your MSME certification status to ensure compliance with regulations.
                  All information provided will be kept confidential and used for official purposes only.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="text-2xl">Supplier Portal</CardTitle>
              <CardDescription className="text-blue-100">
                Manage your supplier information and compliance requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <Tabs defaultValue="msme" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="msme">MSME Supplier Status</TabsTrigger>
                  <TabsTrigger value="esg" disabled>ESG Data Management</TabsTrigger>
                </TabsList>
                
                <TabsContent value="msme" className="space-y-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">MSME Status Update Form</h3>
                    <p className="text-gray-600">Please provide your business information and current MSME status</p>
                  </div>
                  
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label htmlFor="vendorCode" className="text-lg font-semibold text-gray-700">
                          Vendor Code <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="vendorCode"
                          {...register('vendorCode')}
                          placeholder="Enter your vendor code"
                          className={`h-12 text-lg border-2 transition-all duration-200 ${
                            errors.vendorCode 
                              ? 'border-red-500 focus:border-red-500' 
                              : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                          }`}
                        />
                        {loadingVendor && (
                          <p className="text-sm text-blue-600 flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                            Loading vendor data...
                          </p>
                        )}
                        {errors.vendorCode && (
                          <p className="text-red-500 text-sm flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.vendorCode.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="vendorName" className="text-lg font-semibold text-gray-700">
                          Vendor Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="vendorName"
                          {...register('vendorName')}
                          placeholder="Enter your business name"
                          className={`h-12 text-lg border-2 transition-all duration-200 ${
                            errors.vendorName 
                              ? 'border-red-500 focus:border-red-500' 
                              : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                          }`}
                        />
                        {errors.vendorName && (
                          <p className="text-red-500 text-sm flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.vendorName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="businessAddress" className="text-lg font-semibold text-gray-700">
                        Business Address <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="businessAddress"
                        {...register('businessAddress')}
                        placeholder="Enter your complete business address"
                        rows={4}
                        className={`text-lg border-2 transition-all duration-200 ${
                          errors.businessAddress 
                            ? 'border-red-500 focus:border-red-500' 
                            : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                        }`}
                      />
                      {errors.businessAddress && (
                        <p className="text-red-500 text-sm flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.businessAddress.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label className="text-lg font-semibold text-gray-700">
                        Current MSME Status <span className="text-red-500">*</span>
                      </Label>
                      <Select onValueChange={(value) => setValue('msmeStatus', value as any)}>
                        <SelectTrigger className={`h-12 text-lg border-2 transition-all duration-200 ${
                          errors.msmeStatus 
                            ? 'border-red-500 focus:border-red-500' 
                            : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                        }`}>
                          <SelectValue placeholder="Select your MSME status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MSME Certified">MSME</SelectItem>
                          <SelectItem value="Non MSME">Non MSME</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.msmeStatus && (
                        <p className="text-red-500 text-sm flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.msmeStatus.message}
                        </p>
                      )}
                    </div>

                    {/* Conditional Fields for MSME Certified */}
                    {msmeStatus === 'MSME Certified' && (
                      <div className="space-y-6 border-l-4 border-green-500 pl-6 bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-r-lg shadow-inner">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <h4 className="font-semibold text-green-800 text-lg">MSME Certification Details</h4>
                        </div>
                        
                        <div className="space-y-3">
                          <Label className="text-lg font-semibold text-gray-700">
                            MSME Category <span className="text-red-500">*</span>
                          </Label>
                          <Select onValueChange={(value) => setValue('msmeCategory', value as any)}>
                            <SelectTrigger className={`h-12 text-lg border-2 transition-all duration-200 ${
                              errors.msmeCategory 
                                ? 'border-red-500 focus:border-red-500' 
                                : 'border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200'
                            }`}>
                              <SelectValue placeholder="Select your enterprise category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Micro Enterprise">Micro Enterprise</SelectItem>
                              <SelectItem value="Small Enterprise">Small Enterprise</SelectItem>
                              <SelectItem value="Medium Enterprise">Medium Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.msmeCategory && (
                            <p className="text-red-500 text-sm flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {errors.msmeCategory.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="udyamNumber" className="text-lg font-semibold text-gray-700">
                            Udyam Registration Number <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="udyamNumber"
                            {...register('udyamNumber')}
                            placeholder="UDYAM-XX-XX-XXXXXXX"
                            className={`h-12 text-lg border-2 transition-all duration-200 ${
                              errors.udyamNumber 
                                ? 'border-red-500 focus:border-red-500' 
                                : 'border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200'
                            }`}
                          />
                          <p className="text-sm text-green-600 font-medium">
                            Format: UDYAM-[State Code]-[Year]-[7 digits]
                          </p>
                          {errors.udyamNumber && (
                            <p className="text-red-500 text-sm flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {errors.udyamNumber.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <Label className="text-lg font-semibold text-gray-700">
                            Certificate Upload <span className="text-red-500">*</span>
                          </Label>
                          <div 
                            onClick={handleUploadClick}
                            className={`border-2 border-dashed rounded-lg p-8 text-center hover:bg-green-50 transition-all duration-200 cursor-pointer ${
                              uploadedFile 
                                ? 'border-green-500 bg-green-50' 
                                : errors.certificate 
                                  ? 'border-red-500 bg-red-50' 
                                  : 'border-gray-300 hover:border-green-400'
                            }`}
                          >
                            {uploadedFile ? (
                              <div className="flex items-center justify-center space-x-3">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                                <div>
                                  <p className="text-green-800 font-medium">{uploadedFile.name}</p>
                                  <p className="text-sm text-green-600">
                                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-lg text-gray-600 font-medium mb-2">
                                  Click to upload your MSME certificate
                                </p>
                                <p className="text-sm text-gray-500">
                                  Supports PDF, PNG, JPG (Max 10MB)
                                </p>
                              </div>
                            )}
                            <input
                              type="file"
                              id="certificate"
                              accept=".pdf,.png,.jpg,.jpeg"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </div>
                          {errors.certificate && (
                            <p className="text-red-500 text-sm flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {String(errors.certificate.message)}
                            </p>
                           )}
                          
                          {/* Certificate Upload Instructions */}
                          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h5 className="font-semibold text-blue-800 mb-3 flex items-center">
                              <Upload className="h-4 w-4 mr-2" />
                              Certificate Upload Guidelines
                            </h5>
                            <p className="text-sm text-blue-700 mb-4">
                              Please upload your latest Udyam certificate. Make sure it contains the current year classification.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Correct Certificate Example */}
                              <div className="relative border-2 border-green-500 rounded-lg p-3 bg-green-50">
                                <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                                  <CheckCircle className="h-5 w-5 text-white" />
                                </div>
                                <img 
                                  src="/lovable-uploads/f34ec981-a321-4b67-8028-52c3617f768d.png" 
                                  alt="Correct Udyam Certificate Example" 
                                  className="w-full h-auto rounded border"
                                />
                                <p className="text-sm font-medium text-green-700 mt-2 text-center">
                                  ✓ Upload certificates with current year classification
                                </p>
                              </div>
                              
                              {/* Incorrect Certificate Example */}
                              <div className="relative border-2 border-red-500 rounded-lg p-3 bg-red-50">
                                <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1">
                                  <X className="h-5 w-5 text-white" />
                                </div>
                                <img 
                                  src="/lovable-uploads/91872135-3009-47c4-86e2-0f0f02354dbf.png" 
                                  alt="Outdated Udyam Certificate Example" 
                                  className="w-full h-auto rounded border"
                                />
                                <p className="text-sm font-medium text-red-700 mt-2 text-center">
                                  ✗ Do not upload outdated certificates
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Conditional Fields for Non MSME */}
                    {msmeStatus === 'Non MSME' && (
                      <div className="space-y-6 border-l-4 border-orange-500 pl-6 bg-gradient-to-r from-orange-50 to-Vendor-50 p-6 rounded-r-lg shadow-inner">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-5 w-5 text-orange-600" />
                          <h4 className="font-semibold text-orange-800 text-lg">Declaration</h4>
                        </div>
                        <p className="text-orange-700 font-medium">
                          By checking this box, you confirm that your organization does not qualify for MSME certification.
                        </p>
                        <div className="flex items-start space-x-3 bg-white p-4 rounded-lg border border-orange-200">
                          <Checkbox
                            id="declaration"
                            checked={watch('nonMsmeDeclaration')}
                            onCheckedChange={(checked) => setValue('nonMsmeDeclaration', checked as boolean)}
                            className={`mt-1 ${errors.nonMsmeDeclaration ? 'border-red-500' : 'border-orange-400'}`}
                          />
                          <Label htmlFor="declaration" className="text-gray-700 font-medium leading-relaxed cursor-pointer">
                            I confirm that our organization does not qualify for MSME certification.
                            <span className="text-red-500"> *</span>
                          </Label>
                        </div>
                        {errors.nonMsmeDeclaration && (
                          <p className="text-red-500 text-sm flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.nonMsmeDeclaration.message}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Progress Bar */}
                    {isSubmitting && (
                      <div className="space-y-4 bg-blue-50 p-6 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-medium text-blue-800">Submitting your information...</span>
                          <span className="text-lg text-blue-600 font-bold">{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-3" />
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-center pt-8">
                      <Button
                        type="submit"
                        size="lg"
                        disabled={isSubmitting}
                        className="w-full md:w-auto px-12 py-4 text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Submitting...</span>
                          </div>
                        ) : (
                          'Submit'
                        )}
                      </Button>
                    </div>
                  </form>
                </TabsContent>
                
                <TabsContent value="esg" className="space-y-6">
                  <div className="text-center py-12">
                    <div className="mb-6">
                      <Building className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-3">ESG Data Management</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      ESG (Environmental, Social, and Governance) data management features will be available soon. 
                      Stay tuned for updates on sustainability reporting and compliance tracking.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-12 pt-8 border-t border-gray-200">
            <p className="text-lg text-gray-600 font-medium">
              © 2024 Vendor Compliance System
            </p>
            <p className="text-sm text-gray-500 mt-2">
              In case of any query, please contact the Vendor Sourcing Team
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}