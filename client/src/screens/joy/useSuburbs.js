import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export const FALLBACK_SUBURBS = [
  { id: '11111111-1111-1111-1111-111111111101', name: 'Hatfield', city: 'Pretoria' },
  { id: '11111111-1111-1111-1111-111111111102', name: 'Arcadia', city: 'Pretoria' },
  { id: '11111111-1111-1111-1111-111111111103', name: 'Benoni', city: 'Ekurhuleni' },
  { id: '11111111-1111-1111-1111-111111111104', name: 'Auckland Park', city: 'Johannesburg' },
  { id: '11111111-1111-1111-1111-111111111105', name: 'Melville', city: 'Johannesburg' }
];

export function useSuburbs() {
  return useQuery({
    queryKey: ['suburbs'],
    queryFn: async () => {
      if (!supabase) return FALLBACK_SUBURBS;
      const { data, error } = await supabase
        .from('suburbs')
        .select('id, name, city')
        .order('name', { ascending: true });
      if (error || !data || data.length === 0) return FALLBACK_SUBURBS;
      return data;
    },
    staleTime: 600000
  });
}
