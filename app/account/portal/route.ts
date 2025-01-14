import { createClient } from '@/utils/supabase/server';
import { CustomerPortal } from '@polar-sh/nextjs';

export const GET = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? '',
  server: 'sandbox',
  getCustomerId: async (req) => {
    const supabase = createClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', user?.id ?? '');

    if (error) {
      throw new Error('Failed to get customer');
    }

    return data[0].polar_customer_id ?? '';
  }
});
