import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Download, FileDown, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { Tables } from "@/integrations/supabase/types";

type Vendor = Tables<"vendors">;

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [vendorDocuments, setVendorDocuments] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  console.log("Vendors component rendering...");

  // Filter vendors based on search term
  const filteredVendors = useMemo(() => {
    if (!searchTerm.trim()) return vendors;
    
    return vendors.filter(vendor => 
      vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.vendor_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendor.email && vendor.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vendor.phone && vendor.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vendor.location && vendor.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vendor.business_category && vendor.business_category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [vendors, searchTerm]);

  useEffect(() => {
    console.log("Vendors useEffect running...");
    fetchVendors();
  }, []);

  const fetchVendorDocuments = async () => {
    try {
      console.log("Fetching vendor documents...");
      const { data: documents, error } = await supabase
        .from('document_uploads')
        .select('*');

      if (error) throw error;

      console.log("Documents fetched:", documents);

      // Create a mapping of vendor_id to document
      const docMap: Record<string, any> = {};
      documents?.forEach(doc => {
        if (doc.vendor_id) {
          docMap[doc.vendor_id] = doc;
        }
      });

      console.log("Document mapping created:", docMap);
      setVendorDocuments(docMap);
    } catch (error) {
      console.error("Error fetching vendor documents:", error);
    }
  };

  const fetchVendors = async () => {
    console.log("Fetching vendors...");
    try {
      // First get the total count
      const { count } = await supabase
        .from("vendors")
        .select("*", { count: "exact", head: true });
      
      console.log("Total vendors count:", count);

      // Fetch all vendors in batches of 1000
      const allVendors = [];
      const batchSize = 1000;
      let from = 0;
      
      while (true) {
        const { data, error } = await supabase
          .from("vendors")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) throw error;
        
        if (!data || data.length === 0) break;
        
        allVendors.push(...data);
        
        // If we got less than batchSize, we've reached the end
        if (data.length < batchSize) break;
        
        from += batchSize;
      }

      console.log("Vendors fetch result:", { count: allVendors.length });
      setVendors(allVendors);
      
      // Fetch vendor documents after vendors are loaded
      await fetchVendorDocuments();
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast({
        title: "Error",
        description: "Failed to fetch vendors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Utility functions for data validation and processing
  const extractValidEmails = (emailString: string): { primary: string; all: string[]; invalid: string[] } => {
    if (!emailString || typeof emailString !== 'string') {
      return { primary: "", all: [], invalid: [] };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const separators = /[,;|\s]+/;
    const emails = emailString.split(separators)
      .map(email => email.trim())
      .filter(email => email.length > 0);

    const valid: string[] = [];
    const invalid: string[] = [];

    emails.forEach(email => {
      if (emailRegex.test(email)) {
        valid.push(email);
      } else {
        invalid.push(email);
      }
    });

    return {
      primary: valid[0] || "",
      all: valid,
      invalid
    };
  };

  const isValidMobileNumber = (phoneNumber: string): boolean => {
    if (!phoneNumber || typeof phoneNumber !== 'string') return false;
    
    // Remove all non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Basic validation: must have digits
    if (!/\d/.test(cleaned)) return false;
    
    // If it starts with +, it should be international format
    if (cleaned.startsWith('+')) {
      // International: should be 7-15 digits after country code
      return cleaned.length >= 7 && cleaned.length <= 15;
    }
    
    // Local format: should be 6-15 digits
    if (cleaned.length >= 6 && cleaned.length <= 15) {
      // Avoid numbers that are clearly invalid (all same digit, etc.)
      const uniqueDigits = new Set(cleaned).size;
      return uniqueDigits >= 2; // At least 2 different digits
    }
    
    return false;
  };

  const isLandlineNumber = (phoneNumber: string): boolean => {
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Common landline patterns
    const landlinePatterns = [
      /^\+1[2-9]\d{2}[2-9]\d{6}$/, // US landline
      /^\+44[1-2]\d{8,9}$/,        // UK landline
      /^\+91[11|22|33|44|80]\d{8}$/, // India landline (major cities)
      /^\+33[1-5]\d{8}$/,          // France landline
      /^\+49[2-9]\d{7,11}$/,       // Germany landline
      /^\+39[0][1-9]\d{8,9}$/,     // Italy landline
      /^\+81[3-6]\d{7,8}$/,        // Japan landline
      /^\+86[10|20|21|22|23|24|25|27|28|29]\d{7,8}$/, // China landline
      /^0[1-9]\d{8,10}$/,          // Generic landline starting with 0
      /^\+\d{1,3}[0-3]\d{7,10}$/,  // International landline patterns
    ];

    return landlinePatterns.some(pattern => pattern.test(cleaned));
  };

  const extractValidMobileNumbers = (phoneString: string): { primary: string; all: string[]; landlines: string[]; invalid: string[] } => {
    console.log("Processing phone string:", phoneString);
    
    if (!phoneString || typeof phoneString !== 'string') {
      return { primary: "", all: [], landlines: [], invalid: [] };
    }

    // Split by various separators and clean each number
    const separators = /[,;|\s]+/;
    const phones = phoneString.split(separators)
      .map(phone => {
        // Clean the phone number
        let cleaned = phone.trim();
        
        // Handle country code formats like "91-9810004756"
        if (cleaned.match(/^\d{2}-\d+$/)) {
          cleaned = '+' + cleaned.replace('-', '');
        }
        
        // Remove spaces, dashes, parentheses, dots
        cleaned = cleaned.replace(/[\s\-\(\)\.]/g, '');
        
        return cleaned;
      })
      .filter(phone => phone.length > 0);

    console.log("Cleaned phone numbers:", phones);

    const mobiles: string[] = [];
    const landlines: string[] = [];
    const invalid: string[] = [];

     phones.forEach(phone => {
      console.log(`Checking phone: "${phone}"`);
      
      // Debug specific numbers from user
      if (['7985087024', '8756155274', '9450443490'].includes(phone)) {
        console.log(`🔍 Debugging user's number: ${phone}`);
      }
      
      // More lenient validation - accept numbers that look like mobile numbers
      const cleanDigits = phone.replace(/[^\d]/g, '');
      console.log(`Clean digits for "${phone}": "${cleanDigits}", length: ${cleanDigits.length}`);
      
      // Skip numbers that are clearly landlines (starting with 0 and area codes)
      if (phone.match(/^0\d{2,4}-\d+$/)) {
        console.log(`Landline detected: ${phone}`);
        landlines.push(phone);
        return;
      }
      
      // Accept numbers that are likely mobile:
      // - 10 digits starting with 6-9 (Indian mobile)
      // - 11 digits starting with 0
      // - International format starting with + (10-15 digits)
      
      const is10DigitsMobile = cleanDigits.length === 10 && /^[6-9]/.test(cleanDigits);
      const is11DigitsWithZero = cleanDigits.length === 11 && /^0/.test(cleanDigits);
      const isInternational = phone.startsWith('+') && cleanDigits.length >= 10 && cleanDigits.length <= 15;
      
      console.log(`Validation for "${phone}":`, {
        cleanDigits,
        length: cleanDigits.length,
        is10DigitsMobile,
        is11DigitsWithZero,
        isInternational,
        startsWithValidDigit: /^[6-9]/.test(cleanDigits)
      });
      
      if (is10DigitsMobile || is11DigitsWithZero || isInternational) {
        console.log(`✅ Mobile number accepted: ${phone}`);
        mobiles.push(phone);
      } else if (cleanDigits.length >= 6 && cleanDigits.length <= 15) {
        // For other numbers, use basic validation
        const uniqueDigits = new Set(cleanDigits).size;
        if (uniqueDigits >= 2) {
          console.log(`Generic mobile accepted: ${phone}`);
          mobiles.push(phone);
        } else {
          console.log(`Invalid (not enough unique digits): ${phone}`);
          invalid.push(phone);
        }
      } else {
        console.log(`Invalid (wrong length): ${phone}`);
        invalid.push(phone);
      }
    });

    console.log("Final result:", { mobiles, landlines, invalid });

    return {
      primary: mobiles[0] || "",
      all: mobiles,
      landlines,
      invalid
    };
  };

  const generateDataQualityReport = (processedData: any[]) => {
    const report = {
      totalRecords: processedData.length,
      multipleEmails: 0,
      multiplePhones: 0,
      landlineNumbers: 0,
      invalidEmails: 0,
      invalidPhones: 0,
      recordsWithoutEmail: 0,
      recordsWithoutPhone: 0
    };

    processedData.forEach(record => {
      if (record.emailData.all.length > 1) report.multipleEmails++;
      if (record.phoneData.all.length > 1) report.multiplePhones++;
      if (record.phoneData.landlines.length > 0) report.landlineNumbers++;
      if (record.emailData.invalid.length > 0) report.invalidEmails++;
      if (record.phoneData.invalid.length > 0) report.invalidPhones++;
      if (!record.emailData.primary) report.recordsWithoutEmail++;
      if (!record.phoneData.primary) report.recordsWithoutPhone++;
    });

    return report;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('Reading file...');
    
    try {
      // Stage 1: Reading file (10%)
      setUploadProgress(10);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log(`Processing ${jsonData.length} rows from Excel file`);

      // Stage 2: Initial processing and validation (20%)
      setUploadProgress(20);
      setUploadStatus(`Processing ${jsonData.length} records...`);
      
      // Generate unique upload session ID for logging
      const uploadSessionId = crypto.randomUUID();
      const uploadLogs: any[] = [];
      
      // Process data in smaller chunks to avoid memory issues
      const CHUNK_SIZE = 100;
      const processedData: any[] = [];
      
      for (let i = 0; i < jsonData.length; i += CHUNK_SIZE) {
        const chunk = jsonData.slice(i, i + CHUNK_SIZE);
        const chunkProgress = 20 + (i / jsonData.length) * 20; // 20-40%
        setUploadProgress(chunkProgress);
        setUploadStatus(`Processing records ${i + 1}-${Math.min(i + CHUNK_SIZE, jsonData.length)} of ${jsonData.length}...`);
        
        const processedChunk = chunk.map((row: any) => {
          console.log("Processing row:", row);
          console.log("Raw phone value:", row.phone, "Type:", typeof row.phone);
          console.log("Available keys in row:", Object.keys(row));
          
          // Handle phone number conversion - Excel might convert to number
          let phoneValue = row.phone || "";
          if (typeof phoneValue === 'number') {
            phoneValue = phoneValue.toString();
          }
          console.log("Converted phone value:", phoneValue, "Type:", typeof phoneValue);
          
          const emailData = extractValidEmails(row.email || "");
          const phoneData = extractValidMobileNumbers(phoneValue);
          console.log("Phone data result:", phoneData);

          // Log invalid emails
          if (emailData.invalid.length > 0) {
            uploadLogs.push({
              upload_session_id: uploadSessionId,
              vendor_name: row.vendor_name || row.name || "",
              vendor_code: row.vendor_code || row.code || "",
              error_type: 'invalid_email',
              error_details: `Invalid emails: ${emailData.invalid.join(', ')}`,
              raw_data: { email: row.email, ...row }
            });
          }

          // Log invalid phone numbers
          if (phoneData.invalid.length > 0) {
            uploadLogs.push({
              upload_session_id: uploadSessionId,
              vendor_name: row.vendor_name || row.name || "",
              vendor_code: row.vendor_code || row.code || "",
              error_type: 'invalid_phone',
              error_details: `Invalid phone numbers: ${phoneData.invalid.join(', ')}`,
              raw_data: { phone: phoneValue, ...row }
            });
          }

          // Log missing email
          if (!emailData.primary && row.email) {
            uploadLogs.push({
              upload_session_id: uploadSessionId,
              vendor_name: row.vendor_name || row.name || "",
              vendor_code: row.vendor_code || row.code || "",
              error_type: 'missing_valid_email',
              error_details: `No valid email found in: ${row.email}`,
              raw_data: { email: row.email, ...row }
            });
          }

          // Log missing phone
          if (!phoneData.primary && phoneValue) {
            uploadLogs.push({
              upload_session_id: uploadSessionId,
              vendor_name: row.vendor_name || row.name || "",
              vendor_code: row.vendor_code || row.code || "",
              error_type: 'missing_valid_phone',
              error_details: `No valid phone found in: ${phoneValue}`,
              raw_data: { phone: phoneValue, ...row }
            });
          }

          return {
            vendor_name: row.vendor_name || row.name || "",
            vendor_code: row.vendor_code || row.code || "",
            email: emailData.primary,
            phone: phoneData.primary,
            msme_status: row.msme_status || "Others",
            msme_category: row.msme_category || null,
            business_category: row.business_category || null,
            location: row.location || null,
            udyam_number: row.udyam_number || null,
            opening_balance: row.opening_balance ? parseFloat(row.opening_balance) : null,
            credit_amount: row.credit_amount ? parseFloat(row.credit_amount) : null,
            debit_amount: row.debit_amount ? parseFloat(row.debit_amount) : null,
            closing_balance: row.closing_balance ? parseFloat(row.closing_balance) : null,
            emailData,
            phoneData
          };
        });
        
        processedData.push(...processedChunk);
        
        // Small delay to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Save upload logs to database if there are any issues (in batches)
      if (uploadLogs.length > 0) {
        setUploadStatus('Saving error logs...');
        const { data: userData } = await supabase.auth.getUser();
        const logsWithUser = uploadLogs.map(log => ({
          ...log,
          created_by: userData.user?.id
        }));
        
        // Insert logs in batches
        const LOG_BATCH_SIZE = 100;
        for (let i = 0; i < logsWithUser.length; i += LOG_BATCH_SIZE) {
          const logBatch = logsWithUser.slice(i, i + LOG_BATCH_SIZE);
          await supabase.from('upload_logs').insert(logBatch);
        }
      }

      // Generate quality report
      const qualityReport = generateDataQualityReport(processedData);

      // Remove processing data before inserting to database
      const vendorData = processedData.map(({ emailData, phoneData, ...vendor }) => vendor);

      // Stage 3: Validating duplicates (50%)
      setUploadProgress(50);
      setUploadStatus('Checking for duplicates...');
      
      // Check for duplicate vendor codes within the upload
      const vendorCodes = vendorData.map(v => v.vendor_code);
      const duplicateCodesInFile = vendorCodes.filter((code, index) => vendorCodes.indexOf(code) !== index);
      
      if (duplicateCodesInFile.length > 0) {
        toast({
          title: "Upload Failed",
          description: `Duplicate vendor codes found in file: ${[...new Set(duplicateCodesInFile)].join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      // Check for existing vendor codes in database (in batches to avoid large queries)
      const existingCodes: string[] = [];
      const CODE_CHECK_BATCH_SIZE = 500;
      
      for (let i = 0; i < vendorCodes.length; i += CODE_CHECK_BATCH_SIZE) {
        const codeBatch = vendorCodes.slice(i, i + CODE_CHECK_BATCH_SIZE);
        const { data: existingVendors, error: checkError } = await supabase
          .from("vendors")
          .select("vendor_code")
          .in("vendor_code", codeBatch);

        if (checkError) {
          console.error("Error checking existing vendors:", checkError);
          toast({
            title: "Error",
            description: "Failed to validate vendor codes",
            variant: "destructive",
          });
          return;
        }

        if (existingVendors) {
          existingCodes.push(...existingVendors.map(v => v.vendor_code));
        }
      }

      const duplicateCodesInDB = vendorCodes.filter(code => existingCodes.includes(code));

      if (duplicateCodesInDB.length > 0) {
        toast({
          title: "Upload Failed",
          description: `Vendor codes already exist in database: ${duplicateCodesInDB.slice(0, 10).join(', ')}${duplicateCodesInDB.length > 10 ? '...' : ''}. Please use unique vendor codes.`,
          variant: "destructive",
        });
        return;
      }

      // Stage 4: Final validation (60%)
      setUploadProgress(60);
      setUploadStatus('Validating records...');
      
      // Filter out records with empty vendor_code, vendor_name, or invalid email/phone
      const validVendorData = vendorData.filter(vendor => 
        vendor.vendor_code && vendor.vendor_code.trim() !== '' && 
        vendor.vendor_name && vendor.vendor_name.trim() !== '' &&
        vendor.email && vendor.email.trim() !== '' &&
        vendor.phone && vendor.phone.trim() !== ''
      );

      if (validVendorData.length === 0) {
        toast({
          title: "Upload Failed",
          description: "No valid records found. Please ensure vendor_code, vendor_name, valid email, and valid phone number are provided.",
          variant: "destructive",
        });
        return;
      }

      if (validVendorData.length < vendorData.length) {
        const skippedCount = vendorData.length - validVendorData.length;
        toast({
          title: "Warning",
          description: `${skippedCount} records skipped due to missing required fields or invalid email/phone numbers`,
          variant: "destructive",
        });
      }

      // Stage 5: Saving to database in batches (60-95%)
      setUploadStatus(`Saving ${validVendorData.length} records to database...`);
      
      const DB_BATCH_SIZE = 50; // Smaller batch size for database operations
      let successfulInserts = 0;
      const failedInserts: any[] = [];
      
      for (let i = 0; i < validVendorData.length; i += DB_BATCH_SIZE) {
        const batch = validVendorData.slice(i, i + DB_BATCH_SIZE);
        const batchProgress = 60 + ((i + batch.length) / validVendorData.length) * 35; // 60-95%
        setUploadProgress(batchProgress);
        setUploadStatus(`Saving batch ${Math.floor(i / DB_BATCH_SIZE) + 1} of ${Math.ceil(validVendorData.length / DB_BATCH_SIZE)} (${i + 1}-${Math.min(i + DB_BATCH_SIZE, validVendorData.length)} records)...`);
        
        try {
          const { error } = await supabase
            .from("vendors")
            .insert(batch);

          if (error) {
            console.error(`Database error for batch ${i / DB_BATCH_SIZE + 1}:`, error);
            failedInserts.push(...batch);
            
            // Continue with next batch unless it's a critical error
            if (error.code !== '23505') { // Not a duplicate error
              throw error;
            }
          } else {
            successfulInserts += batch.length;
          }
        } catch (error) {
          console.error(`Critical error in batch ${i / DB_BATCH_SIZE + 1}:`, error);
          // Try to continue with remaining batches
          failedInserts.push(...batch);
        }
        
        // Small delay between batches to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setUploadProgress(100);
      setUploadStatus('Upload completed!');

      // Show results
      if (failedInserts.length > 0) {
        toast({
          title: "Partial Success",
          description: `${successfulInserts} vendors uploaded successfully, ${failedInserts.length} failed. Check the error logs for details.`,
          variant: "destructive",
        });
      } else {
        // Show detailed success message with quality report
        const reportMessages = [];
        if (qualityReport.multipleEmails > 0) {
          reportMessages.push(`${qualityReport.multipleEmails} records had multiple emails (used first valid)`);
        }
        if (qualityReport.multiplePhones > 0) {
          reportMessages.push(`${qualityReport.multiplePhones} records had multiple phone numbers (used first mobile)`);
        }
        if (qualityReport.landlineNumbers > 0) {
          reportMessages.push(`${qualityReport.landlineNumbers} landline numbers filtered out`);
        }
        if (qualityReport.invalidEmails > 0) {
          reportMessages.push(`${qualityReport.invalidEmails} invalid emails found`);
        }
        if (qualityReport.invalidPhones > 0) {
          reportMessages.push(`${qualityReport.invalidPhones} invalid phone numbers found`);
        }
        if (qualityReport.recordsWithoutEmail > 0) {
          reportMessages.push(`${qualityReport.recordsWithoutEmail} records without valid email`);
        }
        if (qualityReport.recordsWithoutPhone > 0) {
          reportMessages.push(`${qualityReport.recordsWithoutPhone} records without valid mobile number`);
        }

        toast({
          title: "Success",
          description: `${successfulInserts} vendors uploaded successfully${reportMessages.length > 0 ? '. ' + reportMessages.join(', ') : ''}`,
        });
      }

      fetchVendors();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Failed to upload vendor data",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setUploadStatus('');
      }, 1000);
      // Reset file input
      event.target.value = "";
    }
  };

  const exportToExcel = () => {
    // Remove unwanted fields from export
    const fieldsToExclude = ['id', 'registration_date', 'last_updated_date', 'created_at', 'updated_at'];
    const cleanedVendors = vendors.map(vendor => {
      const cleanVendor = { ...vendor };
      fieldsToExclude.forEach(field => delete cleanVendor[field]);
      return cleanVendor;
    });
    
    const worksheet = XLSX.utils.json_to_sheet(cleanedVendors);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendors");
    XLSX.writeFile(workbook, "vendors.xlsx");
    
    toast({
      title: "Success",
      description: "Vendors exported to Excel successfully",
    });
  };

  const downloadTemplate = () => {
    const templateData = [{
      vendor_name: "Example Vendor",
      vendor_code: "EV001",
      email: "vendor@example.com",
      phone: "+919876543210",
      msme_status: "MSME",
      msme_category: "Small",
      business_category: "Manufacturing",
      location: "Mumbai",
      udyam_number: "UDYAM-MH-01-1234567",
      opening_balance: 10000,
      credit_amount: 5000,
      debit_amount: 2000,
      closing_balance: 13000,
    }];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendor Template");
    XLSX.writeFile(workbook, "vendor_template.xlsx");

    toast({
      title: "Success",
      description: "Template downloaded successfully",
    });
  };

  const downloadAttachments = async () => {
    try {
      toast({
        title: "Download Started",
        description: "Preparing files for download...",
      });

      // Fetch all document uploads
      const { data: documents, error: docError } = await supabase
        .from('document_uploads')
        .select('*');

      if (docError) throw docError;

      console.log(`Found ${documents?.length || 0} documents to download`);

      if (!documents || documents.length === 0) {
        toast({
          title: "No Files Found",
          description: "No MSME documents available for download",
          variant: "destructive",
        });
        return;
      }

      const zip = new JSZip();
      let downloadedCount = 0;
      let skippedCount = 0;

      // Process files in batches to avoid memory issues
      const BATCH_SIZE = 20;
      for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const batch = documents.slice(i, i + BATCH_SIZE);
        
        toast({
          title: "Processing Files",
          description: `Processing ${i + 1}-${Math.min(i + BATCH_SIZE, documents.length)} of ${documents.length} files...`,
        });

        // Download batch concurrently but limit concurrency
        const batchPromises = batch.map(async (doc) => {
          try {
            // Skip files with zero size
            if (doc.file_size === 0) {
              console.log(`Skipping empty file: ${doc.file_name}`);
              skippedCount++;
              return;
            }

            const { data: fileData, error: downloadError } = await supabase.storage
              .from('msme-documents')
              .download(doc.file_name);

            if (downloadError) {
              console.error(`Error downloading ${doc.file_name}:`, downloadError);
              skippedCount++;
              return;
            }

            if (fileData && fileData.size > 0) {
              // Create a unique filename to avoid conflicts
              const uniqueFileName = `${doc.vendor_id?.slice(0, 8)}_${doc.file_name}`;
              zip.file(uniqueFileName, fileData);
              downloadedCount++;
              console.log(`Added to zip: ${uniqueFileName} (${fileData.size} bytes)`);
            } else {
              console.log(`Empty file data for: ${doc.file_name}`);
              skippedCount++;
            }
          } catch (error) {
            console.error(`Error processing ${doc.file_name}:`, error);
            skippedCount++;
          }
        });

        await Promise.all(batchPromises);
      }

      console.log(`Download complete. Downloaded: ${downloadedCount}, Skipped: ${skippedCount}`);

      if (downloadedCount === 0) {
        toast({
          title: "No Valid Files",
          description: "No valid files were found to download",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Creating ZIP",
        description: "Compressing files for download...",
      });

      // Generate and download the zip file
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });
      
      console.log(`ZIP file size: ${zipBlob.size} bytes`);

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MSME_Documents_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Complete",
        description: `Successfully downloaded ${downloadedCount} files${skippedCount > 0 ? ` (${skippedCount} files skipped)` : ''}`,
      });

    } catch (error) {
      console.error('Error downloading attachments:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download vendor files",
        variant: "destructive",
      });
    }
  };

  const downloadVendorDocument = async (vendorId: string, vendorName: string) => {
    try {
      console.log('Download requested for vendor:', vendorId, vendorName);
      const document = vendorDocuments[vendorId];
      console.log('Document found:', document);
      
      if (!document) {
        toast({
          title: "No Document Found",
          description: "No document available for this vendor",
          variant: "destructive",
        });
        return;
      }

      // Remove bucket prefix from file_path if it exists
      const filePath = document.file_path.replace('msme-documents/', '');
      console.log('Attempting to download file from path:', filePath);
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('msme-documents')
        .download(filePath);

      if (downloadError) {
        console.error(`Error downloading ${document.file_path}:`, downloadError);
        toast({
          title: "Download Failed",
          description: `Failed to download document: ${downloadError.message}`,
          variant: "destructive",
        });
        return;
      }

      if (fileData) {
        console.log('File data received, creating download link');
        const url = URL.createObjectURL(fileData);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${vendorName}_${document.file_name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Download Complete",
          description: `Document downloaded successfully for ${vendorName}`,
        });
      }
    } catch (error) {
      console.error('Error downloading vendor document:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download vendor document",
        variant: "destructive",
      });
    }
  };

  const deleteAllVendors = async () => {
    if (!window.confirm('Are you sure you want to delete ALL vendors? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (error) throw error;

      toast({
        title: "Success",
        description: "All vendors deleted successfully",
      });

      setVendors([]);
    } catch (error) {
      console.error("Error deleting vendors:", error);
      toast({
        title: "Error",
        description: "Failed to delete vendors",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "MSME":
        return "bg-green-50 text-green-700 border-green-200";
      case "Non MSME":
        return "bg-red-50 text-red-700 border-red-200";
      case "Others":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Micro":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Small":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Medium":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  console.log("Vendors component state:", { loading, vendorsCount: vendors.length });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-4">Loading vendors...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground">
            Manage your vendor database, upload new vendors, and export data.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadTemplate} variant="outline">
            <FileDown className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Button onClick={downloadAttachments} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Files
          </Button>
          <Button onClick={exportToExcel} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
          <Button onClick={deleteAllVendors} variant="destructive">
            Delete All Vendors
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Vendor Data</CardTitle>
          <CardDescription>
            Upload vendor data from an Excel file. The file should contain columns like vendor_name, vendor_code, email, phone, etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Choose Excel File</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={uploading}
                className="mt-2"
              />
            </div>
            {uploading && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{uploadStatus}</span>
                  <span className="text-muted-foreground">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full h-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Vendor List ({filteredVendors.length} of {vendors.length})</CardTitle>
            <CardDescription>
              All registered vendors in the system
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredVendors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No vendors found matching your search.' : 'No vendors found. Upload some vendor data to get started.'}
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <ScrollArea className="h-[600px] w-full">
                <Table className="w-full">
                   <TableHeader className="sticky top-0 bg-background z-10">
                     <TableRow className="bg-muted/50">
                       <TableHead className="w-[120px] sticky top-0 bg-background border-b">Vendor Name</TableHead>
                       <TableHead className="w-[80px] sticky top-0 bg-background border-b">Code</TableHead>
                       <TableHead className="w-[140px] sticky top-0 bg-background border-b">Email</TableHead>
                       <TableHead className="w-[100px] sticky top-0 bg-background border-b">Phone</TableHead>
                       <TableHead className="w-[120px] sticky top-0 bg-background border-b">MSME Status</TableHead>
                       <TableHead className="w-[80px] sticky top-0 bg-background border-b">Category</TableHead>
                       <TableHead className="w-[120px] sticky top-0 bg-background border-b">Location</TableHead>
                       <TableHead className="w-[100px] sticky top-0 bg-background border-b">Document</TableHead>
                     </TableRow>
                   </TableHeader>
                     <TableBody>
                       {filteredVendors.map((vendor) => (
                         <TableRow key={vendor.id}>
                           <TableCell className="font-medium truncate max-w-[120px]">{vendor.vendor_name}</TableCell>
                           <TableCell className="truncate">{vendor.vendor_code}</TableCell>
                           <TableCell className="truncate max-w-[140px]" title={vendor.email || ""}>
                             {vendor.email || "—"}
                           </TableCell>
                           <TableCell className="truncate">{vendor.phone || "—"}</TableCell>
                           <TableCell>
                             <Badge className={`${getStatusColor(vendor.msme_status || "")} text-xs`}>
                               {vendor.msme_status}
                             </Badge>
                           </TableCell>
                           <TableCell>
                             {vendor.msme_category ? (
                               <Badge className={`${getCategoryColor(vendor.msme_category)} text-xs`}>
                                 {vendor.msme_category}
                               </Badge>
                             ) : (
                               "—"
                             )}
                           </TableCell>
                           <TableCell className="truncate max-w-[120px]" title={vendor.location || ""}>{vendor.location || "—"}</TableCell>
                           <TableCell>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => downloadVendorDocument(vendor.id, vendor.vendor_name)}
                               disabled={!vendorDocuments[vendor.id]}
                               className="px-2"
                             >
                               <Download className="h-3 w-3" />
                             </Button>
                           </TableCell>
                         </TableRow>
                       ))}
                     </TableBody>
                  </Table>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}