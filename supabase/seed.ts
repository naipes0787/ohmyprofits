/**
 * Local seed for ohMyProfits.
 *
 * SAFETY: this script uses the SERVICE ROLE key. It must NEVER run against a
 * production project — we hard-fail if the URL doesn't look local.
 *
 * Run with: `pnpm supabase:seed` (which calls `supabase db reset` first).
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const SUPABASE_URL = process.env['VITE_SUPABASE_URL'] ?? 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set. Aborting seed.');
  process.exit(1);
}

const isLocal =
  SUPABASE_URL.includes('127.0.0.1') || SUPABASE_URL.includes('localhost');

if (!isLocal) {
  console.error(
    `Refusing to seed: ${SUPABASE_URL} does not look local. Seed scripts only run against the local Supabase stack.`,
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL = 'kirken@ohmyprofits.local';
const DEMO_PASSWORD = 'kirken-demo-passphrase-2026';

async function ensureDemoUser(): Promise<string> {
  // Try to find an existing user.
  const { data: existing, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw listErr;

  const found = existing.users.find((u) => u.email === DEMO_EMAIL);
  if (found) return found.id;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: 'Kirken Brewing' },
  });
  if (createErr || !created.user) throw createErr ?? new Error('createUser returned null user');
  return created.user.id;
}

interface SeedRow {
  id: string;
}

async function insert<T extends SeedRow>(
  table: string,
  rows: ReadonlyArray<Record<string, unknown> & { id?: string }>,
): Promise<T[]> {
  const withIds = rows.map((r) => ({ ...r, id: r.id ?? randomUUID() }));
  const { data, error } = await admin.from(table).insert(withIds).select();
  if (error) {
    console.error(`Insert failed on ${table}:`, error);
    throw error;
  }
  return (data ?? []) as T[];
}

async function main() {
  const ownerId = await ensureDemoUser();
  console.log(`Demo user ready: ${DEMO_EMAIL} (${ownerId})`);

  // Wipe existing rows in case the seed runs over a non-reset DB.
  await admin.from('order_items').delete().eq('owner_id', ownerId);
  await admin.from('orders').delete().eq('owner_id', ownerId);
  await admin.from('products').delete().eq('owner_id', ownerId);
  await admin.from('categories').delete().eq('owner_id', ownerId);
  await admin.from('clients').delete().eq('owner_id', ownerId);
  await admin.from('order_number_counters').delete().eq('owner_id', ownerId);

  const clients = await insert<{ id: string; name: string }>('clients', [
    {
      owner_id: ownerId,
      name: 'Hops & Honour Pub',
      description: 'Neighbourhood taproom — weekly delivery, Mondays.',
      email: 'orders@hopshonour.local',
      address: '14 Brewer Lane, Old Town',
      phone: '+1-555-0142',
    },
    {
      owner_id: ownerId,
      name: 'The Salt Pier',
      description: 'Seafood bistro, summer-only orders.',
      email: 'kitchen@saltpier.local',
      address: 'Pier 9, Marina District',
      phone: '+1-555-0188',
    },
    {
      owner_id: ownerId,
      name: 'Northwall Coffee Co.',
      description: 'Stocks the limited-edition coffee stout for retail.',
      email: 'wholesale@northwall.local',
      address: '402 Iron Street',
      phone: '+1-555-0214',
    },
  ]);

  const categories = await insert<{ id: string; name: string }>('categories', [
    { owner_id: ownerId, name: 'Core Lineup',     description: 'Year-round beers.' },
    { owner_id: ownerId, name: 'Limited Releases', description: 'Seasonal batches.' },
    { owner_id: ownerId, name: 'Merchandise',      description: 'Apparel and glassware.' },
  ]);

  const [coreCat, limitedCat, merchCat] = categories;
  if (!coreCat || !limitedCat || !merchCat) throw new Error('seed: missing category');

  const products = await insert<{ id: string; name: string; base_price: string | null }>(
    'products',
    [
      {
        owner_id: ownerId,
        category_id: coreCat.id,
        name: 'Disc Pilsner — 330ml',
        description: 'Crisp, biscuity, the flagship.',
        base_price: '4.50',
        cost_price: '1.40',
        stock: 240,
      },
      {
        owner_id: ownerId,
        category_id: coreCat.id,
        name: 'Arrow IPA — 330ml',
        description: 'Citra & Mosaic, dry-hopped.',
        base_price: '5.20',
        cost_price: '1.85',
        stock: 180,
      },
      {
        owner_id: ownerId,
        category_id: limitedCat.id,
        name: 'Ironworks Coffee Stout — 500ml',
        description: 'Northwall single-origin cold brew added late.',
        base_price: '7.80',
        cost_price: '2.95',
        stock: 60,
      },
      {
        owner_id: ownerId,
        category_id: merchCat.id,
        name: 'Chevron Tee — Black',
        description: 'Heavyweight cotton, oversized cut.',
        base_price: '32.00',
        cost_price: '9.50',
        stock: 24,
      },
    ],
  );

  const [pilsner, ipa, stout] = products;
  const pubClient = clients[0];
  const pierClient = clients[1];
  if (!pilsner || !ipa || !stout || !pubClient || !pierClient) {
    throw new Error('seed: missing product or client');
  }

  // Two orders. order_number is generated by the BEFORE INSERT trigger.
  const { data: orderRows, error: orderErr } = await admin
    .from('orders')
    .insert([
      {
        owner_id: ownerId,
        client_id: pubClient.id,
        status: 'Confirmed',
        payment_status: 'Paid',
        currency: 'USD',
        order_date: new Date().toISOString().slice(0, 10),
        notes: 'Weekly Monday delivery.',
      },
      {
        owner_id: ownerId,
        client_id: pierClient.id,
        status: 'Pending',
        payment_status: 'Partial',
        pending_amount: '40.00',
        discount_percent: '5',
        currency: 'USD',
        order_date: new Date().toISOString().slice(0, 10),
        notes: 'Summer kickoff order.',
      },
    ])
    .select('id, order_number');
  if (orderErr) throw orderErr;
  if (!orderRows || orderRows.length !== 2) throw new Error('seed: orders insert returned wrong count');

  const typedOrders = orderRows as Array<{ id: string; order_number: string }>;
  const [order1, order2] = typedOrders;
  if (!order1 || !order2) throw new Error('seed: missing order rows');
  const order1Id = order1.id;
  const order2Id = order2.id;

  await insert('order_items', [
    { owner_id: ownerId, order_id: order1Id, product_id: pilsner.id, quantity: 24, unit_price: '4.50', position: 0 },
    { owner_id: ownerId, order_id: order1Id, product_id: ipa.id,     quantity: 12, unit_price: '5.20', position: 1 },
    { owner_id: ownerId, order_id: order2Id, product_id: stout.id,   quantity: 6,  unit_price: '7.80', position: 0 },
    { owner_id: ownerId, order_id: order2Id, product_id: ipa.id,     quantity: 6,  unit_price: '5.00', position: 1 }, // negotiated
  ]);

  console.log('Seeded:');
  console.log(`  - 3 clients`);
  console.log(`  - 3 categories, 4 products`);
  console.log(`  - 2 orders: ${order1.order_number}, ${order2.order_number}`);
  console.log(`\nLog in with: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
