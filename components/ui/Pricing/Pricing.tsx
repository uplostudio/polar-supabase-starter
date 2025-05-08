'use client';

import Button from '@/components/ui/Button';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createOrRetrieveCustomer } from '@/utils/supabase/admin';

interface Props {
  user: User | null | undefined;
}

export default function Pricing({ user }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  useEffect(() => {
    async function checkSubscriptionStatus() {
      if (!user) return;
      
      try {
        // Create a server API to check subscription status
        const response = await fetch('/api/check-subscription-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userId: user.id,
            productId: '592b95a3-e0c6-44b1-814f-821be2c72bec'
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsSubscribed(data.isSubscribed);
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
      }
    }
    
    checkSubscriptionStatus();
  }, [user]);
  
  const handleCheckout = async () => {
    setIsLoading(true);

    if (!user) {
      setIsLoading(false);
      return router.push('/signin/signup');
    }

    const polarCustomerId = await createOrRetrieveCustomer({
      email: user.email || '',
      uuid: user.id
    });

    const url = new URL('/checkout', window.location.origin);
    url.searchParams.set('productId', '592b95a3-e0c6-44b1-814f-821be2c72bec');
    url.searchParams.set('customerId', polarCustomerId);
    url.searchParams.set('metadata', JSON.stringify({ customerId: user.id }));

    router.push(url.toString());
    setIsLoading(false);
  };

  return (
    <section className="bg-black">
      <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h1 className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
            Pricing
          </h1>
        </div>
        <div className="flex justify-center mt-12">
          <div className="flex flex-col rounded-lg shadow-sm divide-y divide-zinc-600 bg-zinc-900 max-w-xs w-full">
            <div className="p-6">
              <h2 className="text-2xl font-semibold leading-6 text-white">
                Plan Lite
              </h2>
              <p className="mt-8">
                <span className="text-5xl font-extrabold white">$12</span>
                <span className="text-base font-medium text-zinc-100">/month</span>
              </p>
              <Button
                variant="slim"
                type="button"
                loading={isLoading}
                onClick={handleCheckout}
                disabled={isSubscribed}
                className="block w-full py-2 mt-8 text-sm font-semibold text-center text-white rounded-md hover:bg-zinc-900"
              >
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
