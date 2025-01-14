import {
  upsertProductRecord,
  manageSubscriptionStatusChange
} from '@/utils/supabase/admin';
import { Webhooks } from '@polar-sh/nextjs';

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onProductCreated: upsertProductRecord,
  onProductUpdated: upsertProductRecord,
  onSubscriptionUpdated: manageSubscriptionStatusChange
});
