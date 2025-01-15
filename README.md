# Polar Supabase Starter

The easiest way to get started selling SaaS with Polar.
This repository is a fork of the original NextJS Supabase kit, which used Stripe.

Head over to the [Polar Documentation](https://docs.polar.sh) if you need help.

## Features

- Secure user management and authentication with [Supabase](https://supabase.io/docs/guides/auth)
- Powerful data access & management tooling on top of PostgreSQL with [Supabase](https://supabase.io/docs/guides/database)
- Integration with Polar Checkout and the Polar Customer Portal
- Automatic syncing of pricing plans and subscription statuses via Polar Webhooks

## Architecture

### Configure Polar

#### Important

This guide will use the Polar Sandbox environment. If you wish to run this in Production, make sure to create an account on the [Polar Production environment](https://sandbox.polar.sh). And replace all `new Polar({ server: 'sandbox' })` instances with `new Polar({ server: 'production' })`.

Next, we'll need to configure [Polar](https://sandbox.polar.sh/) to handle test payments. If you don't already have a Polar account, create one now.

#### Create an Organization

First step is to create a Polar Organization.

#### Create a Webhook

After you've created your organization, click on Settings in the Dashboard navigation, and then Webhooks in the upper right hand corner on the Settings page.

1. Click the "Add Endpoint" button.
2. Enter your production deployment URL followed by `/api/webhooks` for the endpoint URL. (e.g. `https://your-deployment-url.vercel.app/api/webhooks`)
3. Select `product:created`, `product:updated`, `subscription:created` and `subscription:updated`
4. Generate a Webhook secret & copy it.
5. We now need to add the webhook secret as `POLAR_WEBHOOK_SECRET` env var.

#### Create a Polar Access token

Go to your Account settings, by pressing your avatar in the upper right hand corner. On the Account Settings page, you're able to create a Personal Access Token. Select all scopes.

Once created, copy the token and populate the `POLAR_ACCESS_TOKEN` env variable.

#### Get the organization identifier

Head over to your Dashboard, and Settings. In there you should find your Organization ID. Copy it and populate the `POLAR_ORGANIZATION_ID` env variable.

#### Create product and pricing information

Your application's webhook listens for product updates on Polar and automatically propagates them to your Supabase database. So with your webhook listener running, you can now create your product and pricing information in the Polar Dashboard.

**Important:** Make sure that you've configured your Polar webhook correctly and redeployed with all needed environment variables.

## Develop locally

If you haven't already done so, clone your Github repository to your local machine.

### Install dependencies

Ensure you have [pnpm](https://pnpm.io/installation) installed and run:

```bash
pnpm install
```

### Local development with Supabase

It's highly recommended to use a local Supabase instance for development and testing. We have provided a set of custom commands for this in `package.json`.

First, you will need to install [Docker](https://www.docker.com/get-started/). You should also copy or rename:

- `.env.local.example` -> `.env.local`
- `.env.example` -> `.env`

Next, run the following command to start a local Supabase instance and run the migrations to set up the database schema:

```bash
pnpm supabase:start
```

The terminal output will provide you with URLs to access the different services within the Supabase stack. The Supabase Studio is where you can make changes to your local database instance.

Copy the value for the `service_role_key` and paste it as the value for the `SUPABASE_SERVICE_ROLE_KEY` in your `.env.local` file.

You can print out these URLs at any time with the following command:

```bash
pnpm supabase:status
```

To link your local Supabase instance to your project, run the following command, navigate to the Supabase project you created above, and enter your database password.

```bash
pnpm supabase:link
```

If you need to reset your database password, head over to [your database settings](https://supabase.com/dashboard/project/_/settings/database) and click "Reset database password", and this time copy it across to a password manager! 😄

🚧 Warning: This links our Local Development instance to the project we are using for `production`. Currently, it only has test records, but once it has customer data, we recommend using [Branching](https://supabase.com/docs/guides/platform/branching) or manually creating a separate `preview` or `staging` environment, to ensure your customer's data is not used locally, and schema changes/migrations can be thoroughly tested before shipping to `production`.

Once you've linked your project, you can pull down any schema changes you made in your remote database with:

```bash
pnpm supabase:pull
```

You can seed your local database with any data you added in your remote database with:

```bash
pnpm supabase:generate-seed
pnpm supabase:reset
```

🚧 Warning: this is seeding data from the `production` database. Currently, this only contains test data, but we recommend using [Branching](https://supabase.com/docs/guides/platform/branching) or manually setting up a `preview` or `staging` environment once this contains real customer data.

You can make changes to the database schema in your local Supabase Studio and run the following command to generate TypeScript types to match your schema:

```bash
pnpm supabase:generate-types
```

You can also automatically generate a migration file with all the changes you've made to your local database schema with the following command:

```bash
pnpm supabase:generate-migration
```

And push those changes to your remote database with:

```bash
pnpm supabase:push
```

Remember to test your changes thoroughly in your `local` and `staging` or `preview` environments before deploying them to `production`!
