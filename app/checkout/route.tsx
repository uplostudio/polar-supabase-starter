import { Checkout } from '@polar-sh/nextjs';

export const GET = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: 'sandbox',
  successUrl: 'http://localhost:3001/account'
});
