-- Create enum types
CREATE TYPE public.msme_status AS ENUM ('MSME Certified', 'Non MSME', 'MSME Application Pending');
CREATE TYPE public.msme_category AS ENUM ('Micro', 'Small', 'Medium');
CREATE TYPE public.campaign_status AS ENUM ('Draft', 'Active', 'Completed', 'Cancelled');
CREATE TYPE public.response_status AS ENUM ('Pending', 'Completed', 'Partial');

-- Create vendors table
CREATE TABLE public.vendors (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_code TEXT NOT NULL UNIQUE,
    vendor_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    business_category TEXT,
    location TEXT,
    registration_date DATE,
    last_updated_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    msme_status msme_status DEFAULT 'MSME Application Pending',
    msme_category msme_category,
    udyam_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email templates table
CREATE TABLE public.email_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create whatsapp templates table
CREATE TABLE public.whatsapp_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create MSME campaigns table
CREATE TABLE public.msme_campaigns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    deadline DATE,
    status campaign_status DEFAULT 'Draft',
    target_vendors UUID[] DEFAULT '{}',
    email_template_id UUID REFERENCES public.email_templates(id),
    whatsapp_template_id UUID REFERENCES public.whatsapp_templates(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create MSME responses table
CREATE TABLE public.msme_responses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES public.msme_campaigns(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
    response_status response_status DEFAULT 'Pending',
    form_data JSONB DEFAULT '{}',
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(campaign_id, vendor_id)
);

-- Create document uploads table
CREATE TABLE public.document_uploads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.msme_campaigns(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user management
CREATE TABLE public.profiles (
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msme_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msme_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Allow authenticated users to manage vendors" ON public.vendors FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage email templates" ON public.email_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage whatsapp templates" ON public.whatsapp_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage campaigns" ON public.msme_campaigns FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage responses" ON public.msme_responses FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage documents" ON public.document_uploads FOR ALL TO authenticated USING (true);
CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id);

-- Create indexes for better performance
CREATE INDEX idx_vendors_vendor_code ON public.vendors(vendor_code);
CREATE INDEX idx_vendors_msme_status ON public.vendors(msme_status);
CREATE INDEX idx_campaigns_status ON public.msme_campaigns(status);
CREATE INDEX idx_responses_campaign_vendor ON public.msme_responses(campaign_id, vendor_id);
CREATE INDEX idx_documents_vendor ON public.document_uploads(vendor_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON public.whatsapp_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.msme_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_responses_updated_at BEFORE UPDATE ON public.msme_responses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY definer SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
    RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();