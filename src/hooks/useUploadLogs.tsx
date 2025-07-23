import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UploadLog {
  id: string;
  upload_session_id: string;
  vendor_name: string | null;
  vendor_code: string | null;
  error_type: string;
  error_details: string | null;
  raw_data: any;
  created_at: string;
  created_by: string | null;
}

export const useUploadLogs = () => {
  return useQuery({
    queryKey: ['upload-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upload_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching upload logs:', error);
        throw error;
      }

      return data as UploadLog[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useClearUploadLogs = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('upload_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
      
      if (error) {
        console.error('Error clearing upload logs:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upload-logs'] });
    },
  });
};