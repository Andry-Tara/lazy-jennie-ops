/**
 * Isolated in-memory PostgreSQL tests. Never connects to Supabase or reads env.
 *
 * Run with the same temporary PGlite dependency used by Phase 1A:
 * node supabase/tests/phase_1b_company_mapping.test.mjs \
 *   /absolute/path/to/node_modules/@electric-sql/pglite/dist/index.js
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.argv[2]) {
  throw new Error('Pass the absolute path to an installed PGlite dist/index.js');
}

const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const phase1a = await readFile(new URL(
  '../migrations/20261003160000_company_control_plane_foundation.sql', import.meta.url
), 'utf8');
const migration = await readFile(new URL(
  '../migrations/20261004010000_existing_company_outlet_membership_mapping.sql', import.meta.url
), 'utf8');
const precheck = await readFile(new URL('../checks/phase_1b_precheck.sql', import.meta.url), 'utf8');
const postcheck = await readFile(new URL('../checks/phase_1b_postcheck.sql', import.meta.url), 'utf8');
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
let passed = 0;

async function check(name, run) {
  await run();
  passed += 1;
  console.log(`PASS ${name}`);
}

async function rows(db, sql, params = []) {
  return (await db.query(sql, params)).rows;
}

async function expectSqlstate(run, code) {
  await assert.rejects(run, (error) => {
    const allowed = Array.isArray(code) ? code : [code];
    assert.ok(allowed.includes(error.code), `${error.message}; expected ${allowed}, got ${error.code}`);
    return true;
  });
}

const bootstrap = `
  create role anon;
  create role authenticated;
  create role service_role bypassrls;
  create schema auth;
  create schema private;
  grant usage on schema public, auth, private to anon, authenticated, service_role;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create table public.roles (id uuid primary key, code text not null);
  create table public.outlets (
    id uuid primary key, code varchar not null, name varchar not null,
    type varchar not null, address text, phone text,
    timezone text not null default 'Asia/Jakarta', is_active boolean not null default true,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  );
  create table public.profiles (
    id uuid primary key references auth.users(id), employee_code text, full_name text,
    email text, phone text, role_id uuid references public.roles(id),
    outlet_id uuid references public.outlets(id), is_active boolean not null default true,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  );
  create function private.can_access_location_module(text, uuid)
    returns boolean language sql as $$ select true $$;
  create function private.can_post_location_module(text, uuid)
    returns boolean language sql as $$ select true $$;
  create function private.can_view_sales_row(uuid)
    returns boolean language sql as $$ select true $$;
  create function private.current_role_code()
    returns text language sql as $$ select 'SUPER_ADMIN'::text $$;
  create function private.is_global_role()
    returns boolean language sql as $$ select true $$;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  alter default privileges in schema private grant execute on functions to anon, authenticated, service_role;
`;

async function makeDb({ conflictingRangka = false, duplicateRangka = false } = {}) {
  const db = new PGlite();
  await db.exec(bootstrap);

  for (let n = 1; n <= 9; n += 1) {
    await db.query('insert into auth.users values ($1)', [id(n)]);
  }
  for (const [n, code] of [
    [201, 'SUPER_ADMIN'], [202, 'MANAGEMENT'], [203, 'CASHIER'], [204, 'WAITER'],
  ]) {
    await db.query('insert into public.roles values ($1,$2)', [id(n), code]);
  }
  for (const [n, code, name, type] of [
    [101, 'RC-001', 'Rangka Cafe', 'OUTLET'],
    [102, 'LJ-001', 'Lazy Jennie Pusat', 'OUTLET'],
    [103, 'LJ-002', 'Lazy Jennie Bandung', 'OUTLET'],
    [104, 'CK-LJ', 'Lazy Jennie Central Kitchen', 'CENTRAL_KITCHEN'],
    [105, 'OTHER-001', 'Unreviewed Location', 'OUTLET'],
  ]) {
    await db.query('insert into public.outlets (id,code,name,type,address) values ($1,$2,$3,$4,$5)',
      [id(n), code, name, type, `Synthetic address ${n}`]);
  }
  if (duplicateRangka) {
    await db.query(`insert into public.outlets (id,code,name,type)
      values ($1,'RC-001','Duplicate Rangka','OUTLET')`, [id(106)]);
  }
  for (const [n, role, outlet, active] of [
    [1, 203, 101, true],  // Rangka assigned operational role
    [2, 203, 102, true],  // LJ assigned operational role
    [3, 202, 103, true],  // LJ company-wide management
    [4, 204, 104, true],  // LJ central-kitchen operational role
    [5, 201, null, true], // unresolved null-outlet platform-like identity
    [6, 201, 102, true],  // unresolved even with a target home outlet
    [7, 202, null, true], // unresolved null-outlet management identity
    [8, 203, 105, true],  // unresolved non-target outlet
    [9, null, 103, false], // safely mapped inactive profile, conservative scope
  ]) {
    await db.query(`insert into public.profiles
      (id,employee_code,full_name,role_id,outlet_id,is_active)
      values ($1,$2,$3,$4,$5,$6)`,
    [id(n), `EMP-${n}`, `Synthetic profile ${n}`, role ? id(role) : null,
      outlet ? id(outlet) : null, active]);
  }

  await db.exec(phase1a);
  if (conflictingRangka) {
    await db.query(`insert into public.companies (id,code,name)
      values ($1,'FOREIGN','Unexpected Existing Company')`, [id(301)]);
    await db.query('update public.outlets set company_id = $1 where id = $2',
      [id(301), id(101)]);
  }
  return db;
}

const db = await makeDb();
try {
  const targetBefore = await rows(db, `select to_jsonb(o) - 'company_id' as row
    from public.outlets o where code in ('RC-001','LJ-001','LJ-002','CK-LJ') order by id`);
  const profilesBefore = await rows(db, 'select * from public.profiles order by id');
  const helperBefore = await rows(db, `select p.oid::regprocedure::text as signature,
    pg_get_functiondef(p.oid) as definition from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname in (
      'can_access_location_module','can_post_location_module','can_view_sales_row',
      'current_role_code','is_global_role') order by signature`);
  let baseline;

  await check('read-only precheck runs and captures a complete baseline', async () => {
    const results = await db.exec(precheck);
    baseline = results.find((result) => result.rows?.[0]?.mapping_baseline)
      ?.rows[0].mapping_baseline;
    assert.equal(baseline.baseline_version, 1);
    assert.equal(baseline.target_outlets.length, 4);
    assert.equal(baseline.profiles.length, 9);
    assert.equal(baseline.legacy_helpers.length, 5);
  });

  await check('migration maps only the two reviewed companies and four outlets', async () => {
    await db.exec(migration);
    assert.deepEqual(await rows(db, `select c.code, array_agg(o.code order by o.code) as outlets
      from public.companies c join public.outlets o on o.company_id = c.id
      group by c.code order by c.code`), [
      { code: 'LAZYJENNIE', outlets: ['CK-LJ', 'LJ-001', 'LJ-002'] },
      { code: 'RANGKA', outlets: ['RC-001'] },
    ]);
    assert.equal((await rows(db, `select count(*)::integer n from public.companies`))[0].n, 2);
    assert.equal((await rows(db, `select company_id is null as ok from public.outlets
      where code = 'OTHER-001'`))[0].ok, true);
  });

  await check('memberships derive from home company with conservative role semantics', async () => {
    const mapped = await rows(db, `select p.id, c.code, cm.membership_role,
      cm.branch_scope, cm.is_active
      from public.company_memberships cm
      join public.profiles p on p.id = cm.profile_id
      join public.companies c on c.id = cm.company_id order by p.id`);
    assert.deepEqual(mapped, [
      { id: id(1), code: 'RANGKA', membership_role: 'COMPANY_MEMBER',
        branch_scope: 'ASSIGNED_BRANCHES', is_active: true },
      { id: id(2), code: 'LAZYJENNIE', membership_role: 'COMPANY_MEMBER',
        branch_scope: 'ASSIGNED_BRANCHES', is_active: true },
      { id: id(3), code: 'LAZYJENNIE', membership_role: 'COMPANY_MANAGEMENT',
        branch_scope: 'ALL_BRANCHES', is_active: true },
      { id: id(4), code: 'LAZYJENNIE', membership_role: 'COMPANY_MEMBER',
        branch_scope: 'ASSIGNED_BRANCHES', is_active: true },
      { id: id(9), code: 'LAZYJENNIE', membership_role: 'COMPANY_MEMBER',
        branch_scope: 'ASSIGNED_BRANCHES', is_active: false },
    ]);
  });

  await check('assigned memberships receive only their home branch grant', async () => {
    const grants = await rows(db, `select cm.profile_id, o.code
      from public.company_outlet_access a
      join public.company_memberships cm on cm.id = a.membership_id
      join public.outlets o on o.id = a.outlet_id order by cm.profile_id`);
    assert.deepEqual(grants, [
      { profile_id: id(1), code: 'RC-001' },
      { profile_id: id(2), code: 'LJ-001' },
      { profile_id: id(4), code: 'CK-LJ' },
      { profile_id: id(9), code: 'LJ-002' },
    ]);
  });

  await check('NULL-outlet, SUPER_ADMIN, and non-target profiles remain unresolved', async () => {
    const unresolved = await rows(db, `select p.id, count(cm.id)::integer as memberships
      from public.profiles p left join public.company_memberships cm on cm.profile_id = p.id
      where p.id in ($1,$2,$3,$4) group by p.id order by p.id`,
    [id(5), id(6), id(7), id(8)]);
    assert.deepEqual(unresolved, [
      { id: id(5), memberships: 0 }, { id: id(6), memberships: 0 },
      { id: id(7), memberships: 0 }, { id: id(8), memberships: 0 },
    ]);
    assert.equal((await rows(db, 'select count(*)::integer n from public.platform_users'))[0].n, 0);
  });

  await check('cross-company grants and duplicate memberships are rejected', async () => {
    const companyIds = Object.fromEntries((await rows(db, 'select code,id from public.companies'))
      .map((row) => [row.code, row.id]));
    const membership = (await rows(db, `select id from public.company_memberships
      where profile_id = $1`, [id(1)]))[0].id;
    await expectSqlstate(() => db.query(`insert into public.company_outlet_access
      (membership_id,company_id,outlet_id) values ($1,$2,$3)`,
    [membership, companyIds.RANGKA, id(102)]), '23503');
    await expectSqlstate(() => db.query(`insert into public.company_memberships
      (profile_id,company_id) values ($1,$2)`, [id(1), companyIds.RANGKA]), '23505');
  });

  await check('target metadata, profiles, and legacy operational helpers are unchanged', async () => {
    assert.deepEqual(await rows(db, `select to_jsonb(o) - 'company_id' as row
      from public.outlets o where code in ('RC-001','LJ-001','LJ-002','CK-LJ') order by id`),
    targetBefore);
    assert.deepEqual(await rows(db, 'select * from public.profiles order by id'), profilesBefore);
    assert.deepEqual(await rows(db, `select p.oid::regprocedure::text as signature,
      pg_get_functiondef(p.oid) as definition from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'private' and p.proname in (
        'can_access_location_module','can_post_location_module','can_view_sales_row',
        'current_role_code','is_global_role') order by signature`), helperBefore);
  });

  await check('migration can be safely re-applied without duplicate rows', async () => {
    const before = await rows(db, `select
      (select count(*)::integer from public.companies) companies,
      (select count(*)::integer from public.company_memberships) memberships,
      (select count(*)::integer from public.company_outlet_access) grants`);
    await db.exec(migration);
    const after = await rows(db, `select
      (select count(*)::integer from public.companies) companies,
      (select count(*)::integer from public.company_memberships) memberships,
      (select count(*)::integer from public.company_outlet_access) grants`);
    assert.deepEqual(after, before);
  });

  await check('postcheck reports PASS and the expected unresolved identities', async () => {
    const sql = postcheck.replaceAll(
      '$phase1b_baseline$\n{}\n$phase1b_baseline$',
      `$phase1b_baseline$\n${JSON.stringify(baseline)}\n$phase1b_baseline$`,
    );
    const results = await db.exec(sql);
    const checkRows = results.flatMap((result) => result.rows || [])
      .filter((row) => row.check_name);
    assert.ok(checkRows.length >= 10);
    assert.ok(checkRows.every((row) => row.result === 'PASS'), JSON.stringify(checkRows));
    const unresolved = results.flatMap((result) => result.rows || [])
      .filter((row) => String(row.result || '').startsWith('UNRESOLVED:'));
    assert.deepEqual(unresolved.map((row) => row.profile_id).sort(),
      [id(5), id(6), id(7), id(8)]);
  });

  await check('missing postcheck baseline never reports preservation checks as PASS', async () => {
    const results = await db.exec(postcheck);
    const baselineChecks = results.flatMap((result) => result.rows || [])
      .filter((row) => [
        'target_outlet_operational_metadata_unchanged',
        'profile_home_role_and_active_state_unchanged',
        'no_ambiguous_identity_silently_assigned',
        'platform_users_unchanged',
        'legacy_operational_helpers_unchanged',
      ].includes(row.check_name));
    assert.equal(baselineChecks.length, 5);
    assert.ok(baselineChecks.every((row) => row.result.startsWith('NOT_VERIFIED')));
  });

  await check('conflicting existing outlet ownership aborts the migration atomically', async () => {
    const conflictDb = await makeDb({ conflictingRangka: true });
    try {
      await expectSqlstate(() => conflictDb.exec(migration), '23514');
      await conflictDb.exec('rollback');
      assert.equal((await rows(conflictDb, `select count(*)::integer n from public.companies
        where code in ('RANGKA','LAZYJENNIE')`))[0].n, 0);
      assert.equal((await rows(conflictDb, `select count(*)::integer n
        from public.company_memberships`))[0].n, 0);
    } finally {
      await conflictDb.close();
    }
  });

  await check('duplicate exact target outlet code aborts the migration atomically', async () => {
    const duplicateDb = await makeDb({ duplicateRangka: true });
    try {
      await expectSqlstate(() => duplicateDb.exec(migration), '23514');
      await duplicateDb.exec('rollback');
      assert.equal((await rows(duplicateDb, `select count(*)::integer n
        from public.companies`))[0].n, 0);
    } finally {
      await duplicateDb.close();
    }
  });

  console.log(`\n${passed} checks passed. No remote database used.`);
} catch (error) {
  console.error(`FAIL after ${passed} checks: ${error.code || error.name}: ${error.message}`);
  if (error.position) console.error(`SQL character position: ${error.position}`);
  process.exitCode = 1;
} finally {
  await db.close();
}
