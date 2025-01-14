import { polar } from '@/utils/polar/config';
import { createClient } from '@supabase/supabase-js';
import type { Database, Tables, TablesInsert } from 'types_db';
import * as Polar from '@polar-sh/sdk/models/components';

type Product = Tables<'products'>;

// Note: supabaseAdmin uses the SERVICE_ROLE_KEY which you must only use in a secure server-side context
// as it has admin privileges and overwrites RLS policies!
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const upsertProductRecord = async (
  payload:
    | Polar.WebhookProductUpdatedPayload
    | Polar.WebhookProductCreatedPayload
) => {
  const product = payload.data;

  const productData: Product = {
    id: product.id,
    active: !product.isArchived,
    name: product.name,
    description: product.description ?? null,
    image: product.medias?.[0]?.publicUrl ?? null,
    metadata: product.metadata
  };

  const { error: upsertError } = await supabaseAdmin
    .from('products')
    .upsert([productData]);
  if (upsertError)
    throw new Error(`Product insert/update failed: ${upsertError.message}`);
  console.log(`Product inserted/updated: ${product.id}`);

  const priceData = product.prices.map((price) => ({
    id: price.id,
    product_id: product.id,
    price_amount: price.amountType === 'fixed' ? price.priceAmount : null,
    type: price.type,
    recurring_interval:
      price.type === 'recurring' ? price.recurringInterval : null
  }));

  const { error: priceUpsertError } = await supabaseAdmin
    .from('prices')
    .upsert(priceData);
  if (priceUpsertError)
    throw new Error(`Price insert/update failed: ${priceUpsertError.message}`);
  console.log(`Price inserted/updated: ${priceData.map((p) => p.id)}`);
};

const upsertCustomerToSupabase = async (uuid: string, polarId: string) => {
  const { error: upsertError } = await supabaseAdmin
    .from('customers')
    .upsert([{ id: uuid, polar_customer_id: polarId }]);

  if (upsertError)
    throw new Error(
      `Supabase customer record creation failed: ${upsertError.message}`
    );

  return polarId;
};

const createOrRetrieveCustomer = async ({
  email,
  uuid,
  polarId
}: {
  email: string;
  uuid: string;
  polarId: string;
}) => {
  // If Supabase has no record, create a new record and return Polar customer ID
  const upsertedPolarCustomer = await upsertCustomerToSupabase(uuid, polarId);
  if (!upsertedPolarCustomer)
    throw new Error('Supabase customer record creation failed.');

  return upsertedPolarCustomer;
};

const manageSubscriptionStatusChange = async (
  payload:
    | Polar.WebhookSubscriptionUpdatedPayload
    | Polar.WebhookSubscriptionCreatedPayload
) => {
  const subscriptionId = payload.data.id;
  const customerId = payload.data.customer.id;

  // Get customer's UUID from mapping table.
  let { data: customerData, error: noCustomerError } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('polar_customer_id', customerId)
    .single();

  if (noCustomerError) {
    const createdCustomerId = await createOrRetrieveCustomer({
      email: payload.data.customer.email,
      uuid: customerId
    });

    customerData = { id: createdCustomerId };
  }

  const { id: uuid } = customerData!;

  const subscription = await polar.customerPortal.subscriptions.get({
    id: subscriptionId
  });
  // Upsert the latest status of the subscription object.
  const subscriptionData: TablesInsert<'subscriptions'> = {
    id: subscription.id,
    user_id: uuid,
    status: subscription.status,
    price_id: subscription.price.id,
    cancel_at_period_end: subscription.cancelAtPeriodEnd,
    cancel_at:
      subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd
        ? subscription.currentPeriodEnd.toISOString()
        : null,
    current_period_start: subscription.currentPeriodStart.toISOString(),
    current_period_end: subscription.currentPeriodEnd
      ? subscription.currentPeriodEnd.toISOString()
      : undefined,
    created: subscription.createdAt.toISOString(),
    ended_at: subscription.endedAt ? subscription.endedAt.toISOString() : null
  };

  const { error: upsertError } = await supabaseAdmin
    .from('subscriptions')
    .upsert([subscriptionData]);
  if (upsertError)
    throw new Error(
      `Subscription insert/update failed: ${upsertError.message}`
    );
  console.log(
    `Inserted/updated subscription [${subscription.id}] for user [${uuid}]`
  );
};

export {
  upsertProductRecord,
  createOrRetrieveCustomer,
  manageSubscriptionStatusChange
};
