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
};

const upsertCustomerToSupabase = async (uuid: string, customerId: string) => {
  const { error: upsertError } = await supabaseAdmin
    .from('customers')
    .upsert([{ id: uuid, polar_customer_id: customerId }]);

  if (upsertError)
    throw new Error(
      `Supabase customer record creation failed: ${upsertError.message}`
    );

  return customerId;
};

const createCustomerInPolar = async (uuid: string, email: string) => {
  const customerData = { metadata: { supabaseUUID: uuid }, email: email };
  const newCustomer = await polar.customers.create(customerData);
  if (!newCustomer) throw new Error('Polar customer creation failed.');

  return newCustomer.id;
};

const createOrRetrieveCustomer = async ({
  email,
  uuid
}: {
  email: string;
  uuid: string;
}) => {
  // Check if the customer already exists in Supabase
  const { data: existingSupabaseCustomer, error: queryError } =
    await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', uuid)
      .maybeSingle();

  if (queryError) {
    throw new Error(`Supabase customer lookup failed: ${queryError.message}`);
  }

  // Retrieve the Polar customer ID using the Supabase customer ID, with email fallback
  let polarCustomerId: string | undefined;
  if (existingSupabaseCustomer?.polar_customer_id) {
    const existingPolarCustomer = await polar.customers.get({
      id: existingSupabaseCustomer.polar_customer_id
    });
    polarCustomerId = existingPolarCustomer.id;
  }

  // If still no polarCustomerId, create a new customer in Polar
  const polarIdToInsert = polarCustomerId
    ? polarCustomerId
    : await createCustomerInPolar(uuid, email);
  if (!polarIdToInsert) throw new Error('Polar customer creation failed.');

  if (existingSupabaseCustomer && polarCustomerId) {
    // If Supabase has a record but doesn't match Polar, update Supabase record
    if (existingSupabaseCustomer.polar_customer_id !== polarCustomerId) {
      const { error: updateError } = await supabaseAdmin
        .from('customers')
        .update({ polar_customer_id: polarCustomerId })
        .eq('id', uuid);

      if (updateError)
        throw new Error(
          `Supabase customer record update failed: ${updateError.message}`
        );
      console.warn(
        `Supabase customer record mismatched Polar ID. Supabase record updated.`
      );
    }
    // If Supabase has a record and matches Polar, return Polar customer ID
    return polarCustomerId;
  } else {
    console.warn(
      `Supabase customer record was missing. A new record was created.`
    );

    // If Supabase has no record, create a new record and return Polar customer ID
    const upsertedPolarCustomer = await upsertCustomerToSupabase(
      uuid,
      polarIdToInsert
    );
    if (!upsertedPolarCustomer)
      throw new Error('Supabase customer record creation failed.');

    return upsertedPolarCustomer;
  }
};

const manageSubscriptionStatusChange = async (
  payload:
    | Polar.WebhookSubscriptionUpdatedPayload
    | Polar.WebhookSubscriptionCreatedPayload
) => {
  const subscriptionId = payload.data.id;
  const customerId = payload.data.customerId;

  // Get customer's UUID from mapping table.
  const { data: customerData, error: noCustomerError } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('polar_customer_id', customerId)
    .single();

  if (noCustomerError)
    throw new Error(`Customer lookup failed: ${noCustomerError.message}`);

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
