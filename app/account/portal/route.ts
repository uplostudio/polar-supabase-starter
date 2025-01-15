import { Database } from '@/types_db';
import { createOrRetrieveCustomer } from '@/utils/supabase/admin';
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

    if (!user) {
      throw new Error('User not found');
    }

    return createOrRetrieveCustomer({
      email: user.email ?? '',
      uuid: user.id
    });
  }
});
