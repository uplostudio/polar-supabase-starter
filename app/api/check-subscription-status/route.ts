import { Polar } from '@polar-sh/sdk';
import { createOrRetrieveCustomer } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userId, productId } = await req.json();
    
    if (!userId || !productId) {
      return NextResponse.json(
        { error: 'Missing userId or productId' },
        { status: 400 }
      );
    }

    // Log the input parameters for debugging
    console.log(`Checking subscription for userId: ${userId}, productId: ${productId}`);

    // Initialize Polar SDK with organization access token
    const polar = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN || ''
    });

    // Get or create customer in Polar
    // For debugging, we'll print out the email format too
    const userEmail = userId.indexOf('@') > -1 ? userId : `${userId}@example.com`;
    console.log(`Using email: ${userEmail} for customer lookup`);

    const polarCustomerId = await createOrRetrieveCustomer({
      email: userEmail,
      uuid: userId
    });

    console.log(`Polar customer ID: ${polarCustomerId}`);

    // We'll use a direct approach rather than attempting to traverse the iterator
    let hasActiveSubscription = false;
    
    try {
      // Query for active subscriptions for this customer and product
      // Use 'any' type to bypass TypeScript checks until we understand the exact structure
      const response: any = await polar.subscriptions.list({
        customerId: polarCustomerId,
        productId: productId,
        active: true
      });
      
      console.log('Subscription response received:', JSON.stringify(response));
      
      // The Polar SDK is a bit complex with its return types
      // Try to access the data in different ways that might work
      if (response) {
        // Check for items directly
        if (response.items && response.items.length > 0) {
          hasActiveSubscription = true;
          console.log(`Found ${response.items.length} active subscriptions`);
        }
        // Check for listResourceSubscription property that might contain items
        else if (response.listResourceSubscription && 
                response.listResourceSubscription.items && 
                response.listResourceSubscription.items.length > 0) {
          hasActiveSubscription = true;
          console.log(`Found ${response.listResourceSubscription.items.length} active subscriptions via listResourceSubscription`);
        }
        // If it's an array itself, check its length
        else if (Array.isArray(response) && response.length > 0) {
          hasActiveSubscription = true;
          console.log(`Found ${response.length} active subscriptions as array`);
        }
        else {
          console.log('No active subscriptions found in any format');
        }
      }
    } catch (error) {
      console.error('Error accessing subscription data:', error);
      // If we can't check properly, assume no subscription
      hasActiveSubscription = false;
    }

    console.log(`Subscription status: ${hasActiveSubscription ? 'ACTIVE' : 'INACTIVE'}`);
    return NextResponse.json({ isSubscribed: hasActiveSubscription });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription status' },
      { status: 500 }
    );
  }
} 