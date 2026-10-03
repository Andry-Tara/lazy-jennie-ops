/**
 * Isolated, in-memory PostgreSQL tests. Never connects to Supabase or reads env.
 * Uses synthetic fixtures, not a copy of the remote operational database.
 *
 * Tested with @electric-sql/pglite@0.5.8. Install it in a temporary directory,
 * then run:
 * node supabase/tests/phase_1a_control_plane.test.mjs \
 *   /absolute/path/to/node_modules/@electric-sql/pglite/dist/index.js
 *
 * The dependency is deliberately not added to the application's package files.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.argv[2]) {
  throw new Error('Pass the absolute path to an installed PGlite dist/index.js');
}
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite(); // No data directory, connection URL or remote database.
const migration = await readFile(new URL(
  '../migrations/20261003160000_company_control_plane_foundation.sql', import.meta.url
), 'utf8');
const precheck = await readFile(new URL('../checks/phase_1a_precheck.sql', import.meta.url), 'utf8');
const postcheck = await readFile(new URL('../checks/phase_1a_postcheck.sql', import.meta.url), 'utf8');
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
let passed = 0;

async function check(name, run) {
  await run();
  passed += 1;
  console.log(`PASS ${name}`);
}

async function expectSqlstate(run, code) {
  await assert.rejects(run, (error) => {
    const allowed = Array.isArray(code) ? code : [code];
    assert.ok(allowed.includes(error.code), `${error.message}; expected ${allowed}, got ${error.code}`);
    return true;
  });
}

async function asRole(role, user, run) {
  assert.ok(['anon', 'authenticated', 'service_role'].includes(role));
  await db.exec(`set role ${role}`);
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user || '']);
    return await run();
  } finally {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

async function rows(sql, params = []) {
  return (await db.query(sql, params)).rows;
}

async function visibleCompanies(user) {
  return asRole('authenticated', user, async () =>
    (await rows('select id from public.get_my_companies() order by id')).map((r) => r.id));
}

async function visibleOutlets(user, company) {
  return asRole('authenticated', user, async () =>
    (await rows('select id from public.get_my_company_outlets($1) order by id', [company]))
      .map((r) => r.id));
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
  -- Sentinel definitions: prove that migration leaves existing helpers intact.
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
  grant select on public.outlets to authenticated;
  -- Emulate permissive Supabase defaults; migration must explicitly revoke them.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  alter default privileges in schema private grant execute on functions to anon, authenticated, service_role;
`;

try {
  await db.exec(bootstrap);
  for (let n = 1; n <= 11; n += 1) {
    await db.query('insert into auth.users values ($1)', [id(n)]);
  }
  for (const [n, code] of [[201, 'SUPER_ADMIN'], [202, 'MANAGEMENT'], [203, 'CASHIER'],
    [204, 'FINANCE'], [205, 'PURCHASING']]) {
    await db.query('insert into public.roles values ($1, $2)', [id(n), code]);
  }
  for (let n = 101; n <= 104; n += 1) {
    await db.query("insert into public.outlets (id, code, name, type) values ($1,$2,$3,'OUTLET')",
      [id(n), `OUTLET_${n}`, `Synthetic branch ${n}`]);
  }
  // Platform user 7 deliberately has no operational profile.
  for (const n of [1, 2, 3, 4, 5, 6, 8, 9, 10, 11]) {
    await db.query(`insert into public.profiles (id, full_name, role_id, outlet_id, is_active)
      values ($1,$2,$3,$4,$5)`,
    [id(n), `Synthetic user ${n}`, id(n === 1 ? 201 : 202), n === 3 ? id(101) : null, n !== 5]);
  }
  const beforeOutlets = await rows('select * from public.outlets order by id');
  const beforeProfiles = await rows('select * from public.profiles order by id');
  let baseline;
  await check('read-only precheck runs against the legacy schema', async () => {
    const results = await db.exec(precheck);
    baseline = results.find((r) => r.rows?.[0]?.mapping_baseline)?.rows[0].mapping_baseline;
    assert.equal(baseline.baseline_version, 1);
    assert.equal(baseline.outlets.length, 4);
    assert.equal(baseline.profiles.length, 10);
    assert.equal(baseline.legacy_helpers.length, 5);
  });

  await check('migration applies transactionally to an isolated PostgreSQL database', async () => {
    await db.exec(migration);
  });

  await check('existing outlet fields and full profiles remain unchanged; no data is seeded', async () => {
    const after = await rows('select * from public.outlets order by id');
    assert.ok(after.every((o) => o.company_id === null));
    assert.deepEqual(after.map(({ company_id, ...o }) => o), beforeOutlets);
    assert.deepEqual(await rows('select * from public.profiles order by id'), beforeProfiles);
    for (const table of ['companies', 'company_memberships', 'company_outlet_access',
      'platform_users', 'control_plane_audit_events']) {
      assert.equal((await rows(`select count(*)::integer as n from public.${table}`))[0].n, 0);
    }
    assert.equal((await rows("select has_table_privilege('authenticated','public.outlets','SELECT') as ok"))[0].ok, true);
  });

  await check('postcheck verifies baseline, unchanged legacy helpers, RLS and composite constraints', async () => {
    const sql = postcheck.replace('$phase1a_baseline$\n{}\n$phase1a_baseline$',
      `$phase1a_baseline$\n${JSON.stringify(baseline)}\n$phase1a_baseline$`);
    const results = await db.exec(sql);
    const comparisons = results.find((r) => r.rows?.[0]?.check_name)?.rows;
    assert.equal(comparisons.length, 5);
    assert.ok(comparisons.every((r) => r.result === 'PASS'), JSON.stringify(comparisons));
    const constraints = results.find((r) => r.rows?.[0]?.constraint_name)?.rows;
    assert.equal(constraints.length, 2);
    assert.ok(constraints.every((r) => r.company_boundary_enforced));
    const tables = results.find((r) => r.rows?.[0]?.object_name)?.rows;
    assert.equal(tables.length, 5);
    assert.ok(tables.every((r) => r.exists_ok && r.rls_enabled && Number(r.policy_count) === 0));
    const grants = results.find((r) => r.rows?.[0]?.table_name)?.rows;
    assert.ok(grants.every((r) => !r.any_raw_privilege));
    const rpcGrants = results.find((r) => r.rows?.[0]?.signature)?.rows;
    assert.equal(rpcGrants.length, 12);
    assert.ok(rpcGrants.every((r) => r.can_execute === (r.role_name === 'authenticated')));
  });

  await check('postcheck without baseline explicitly reports NOT_VERIFIED', async () => {
    const results = await db.exec(postcheck);
    const comparisons = results.find((r) => r.rows?.[0]?.check_name)?.rows;
    assert.ok(comparisons.every((r) => r.result.startsWith('NOT_VERIFIED')));
  });

  // Synthetic ownership/memberships exist ONLY in this disposable test database.
  await db.query(`insert into public.companies (id, code, name, status) values
    ($1,'COMPANY_A','Synthetic company A','SUSPENDED'),
    ($2,'COMPANY_B','Synthetic company B','CANCELLED')`, [id(301), id(302)]);
  await db.query('update public.outlets set company_id = $1 where id in ($2,$3)',
    [id(301), id(101), id(102)]);
  await db.query('update public.outlets set company_id = $1 where id = $2', [id(302), id(103)]);
  await db.query('update public.outlets set is_active = false where id = $1', [id(102)]);
  for (const [member, user, company, scope, active] of [
    [402, 2, 301, 'ALL_BRANCHES', true], [403, 3, 301, 'ASSIGNED_BRANCHES', true],
    [404, 4, 302, 'ALL_BRANCHES', true], [405, 5, 301, 'ALL_BRANCHES', true],
    [406, 6, 301, 'ALL_BRANCHES', false], [411, 11, 301, 'ALL_BRANCHES', true],
    [412, 11, 302, 'ASSIGNED_BRANCHES', true],
  ]) {
    await db.query(`insert into public.company_memberships
      (id, profile_id, company_id, branch_scope, is_active) values ($1,$2,$3,$4,$5)`,
    [id(member), id(user), id(company), scope, active]);
  }
  await db.query(`insert into public.company_outlet_access (membership_id,company_id,outlet_id)
    values ($1,$2,$3),($4,$5,$6)`, [id(403), id(301), id(101), id(412), id(302), id(103)]);
  await db.query(`insert into public.platform_users (user_id,platform_role,is_active) values
    ($1,'PLATFORM_ADMIN',true),($2,'PLATFORM_SUPPORT',true),($3,'PLATFORM_ADMIN',false)`,
  [id(7), id(8), id(9)]);

  await check('legacy global roles and null profile outlet never confer control-plane access', async () => {
    for (const role of [201, 202, 204, 205]) {
      await db.query('update public.profiles set role_id = $1 where id = $2', [id(role), id(1)]);
      assert.deepEqual(await visibleCompanies(id(1)), []);
      assert.deepEqual(await visibleOutlets(id(1), id(301)), []);
    }
    assert.deepEqual(await visibleCompanies(id(10)), []);
  });

  await check('ALL_BRANCHES stays within its company, including inactive branches and suspended company', async () => {
    assert.deepEqual(await visibleCompanies(id(2)), [id(301)]);
    assert.deepEqual(await visibleOutlets(id(2), id(301)), [id(101), id(102)]);
    assert.deepEqual(await visibleOutlets(id(2), id(302)), []);
    assert.deepEqual(await visibleOutlets(id(2), null), []);
  });

  await check('ASSIGNED_BRANCHES sees only explicit grants, not the whole company', async () => {
    assert.deepEqual(await visibleCompanies(id(3)), [id(301)]);
    assert.deepEqual(await visibleOutlets(id(3), id(301)), [id(101)]);
    assert.deepEqual(await visibleOutlets(id(3), id(302)), []);
    await db.query('delete from public.company_outlet_access where membership_id = $1', [id(403)]);
    assert.deepEqual(await visibleOutlets(id(3), id(301)), []);
    await db.query(`insert into public.company_outlet_access values ($1,$2,$3,now())`,
      [id(403), id(301), id(101)]);
  });

  await check('inactive profiles and inactive memberships grant no visibility', async () => {
    for (const user of [5, 6]) {
      assert.deepEqual(await visibleCompanies(id(user)), []);
      assert.deepEqual(await visibleOutlets(id(user), id(301)), []);
      await asRole('authenticated', id(user), async () => {
        assert.deepEqual(await rows('select * from public.get_my_company_memberships()'), []);
      });
    }
  });

  await check('explicit PLATFORM_ADMIN sees all companies and can inspect unassigned outlets', async () => {
    assert.deepEqual(await visibleCompanies(id(7)), [id(301), id(302)]);
    assert.deepEqual(await visibleOutlets(id(7), id(301)), [id(101), id(102)]);
    assert.deepEqual(await visibleOutlets(id(7), id(302)), [id(103)]);
    assert.deepEqual(await visibleOutlets(id(7), null), [id(104)]);
    assert.deepEqual(await visibleOutlets(id(7), id(999)), []);
    await asRole('authenticated', id(7), async () => {
      assert.deepEqual(await rows('select * from public.get_my_platform_access()'),
        [{ platform_role: 'PLATFORM_ADMIN', is_active: true, is_platform_admin: true }]);
      assert.deepEqual(await rows('select * from public.get_my_company_memberships()'), []);
    });
  });

  await check('PLATFORM_SUPPORT and disabled platform administrators gain no implicit scope', async () => {
    for (const user of [8, 9]) {
      assert.deepEqual(await visibleCompanies(id(user)), []);
      assert.deepEqual(await visibleOutlets(id(user), null), []);
    }
    await asRole('authenticated', id(8), async () => {
      assert.deepEqual(await rows('select * from public.get_my_platform_access()'),
        [{ platform_role: 'PLATFORM_SUPPORT', is_active: true, is_platform_admin: false }]);
    });
    await asRole('authenticated', id(9), async () => {
      assert.deepEqual(await rows('select * from public.get_my_platform_access()'), []);
    });
  });

  await check('multiple explicit company memberships retain independent branch scopes', async () => {
    assert.deepEqual(await visibleCompanies(id(11)), [id(301), id(302)]);
    assert.deepEqual(await visibleOutlets(id(11), id(301)), [id(101), id(102)]);
    assert.deepEqual(await visibleOutlets(id(11), id(302)), [id(103)]);
    await asRole('authenticated', id(11), async () => {
      const memberships = await rows('select * from public.get_my_company_memberships()');
      assert.deepEqual(memberships.map((m) => m.id), [id(411), id(412)]);
    });
  });

  await check('NULL auth.uid and anonymous sessions cannot obtain company data', async () => {
    assert.deepEqual(await visibleCompanies(null), []);
    assert.deepEqual(await visibleOutlets(null, null), []);
    await asRole('anon', null, async () => {
      for (const call of ['get_my_platform_access()', 'get_my_companies()',
        'get_my_company_memberships()', 'get_my_company_outlets(null)']) {
        await expectSqlstate(() => db.exec(`select * from public.${call}`), '42501');
      }
    });
  });

  await check('API roles cannot query/mutate raw control-plane tables or invoke private helpers', async () => {
    for (const role of ['anon', 'authenticated', 'service_role']) {
      await asRole(role, id(7), async () => {
        for (const table of ['companies', 'company_memberships', 'company_outlet_access',
          'platform_users', 'control_plane_audit_events']) {
          await expectSqlstate(() => db.exec(`select * from public.${table}`), '42501');
          await expectSqlstate(() => db.exec(`insert into public.${table} default values`), '42501');
          await expectSqlstate(() => db.exec(`delete from public.${table}`), '42501');
        }
        await expectSqlstate(() => db.exec('select private.is_platform_admin()'), '42501');
      });
    }
  });

  await check('users cannot promote themselves or create memberships/grants', async () => {
    await asRole('authenticated', id(1), async () => {
      await expectSqlstate(() => db.query(`insert into public.platform_users (user_id, platform_role)
        values ($1,'PLATFORM_ADMIN')`, [id(1)]), '42501');
      await expectSqlstate(() => db.query(`insert into public.company_memberships (profile_id,company_id)
        values ($1,$2)`, [id(1), id(301)]), '42501');
      await expectSqlstate(() => db.query(`update public.company_memberships
        set branch_scope = 'ALL_BRANCHES' where id = $1`, [id(403)]), '42501');
    });
  });

  await check('database rejects either direction of a cross-company grant and NULL/unassigned grants', async () => {
    for (const [membership, company, outlet] of [[403, 301, 103], [403, 302, 103], [403, 301, 104]]) {
      await expectSqlstate(() => db.query(`insert into public.company_outlet_access
        (membership_id,company_id,outlet_id) values ($1,$2,$3)`,
      [id(membership), id(company), id(outlet)]), '23503');
    }
    await expectSqlstate(() => db.query(`insert into public.company_outlet_access
      (membership_id,company_id,outlet_id) values ($1,null,$2)`, [id(403), id(104)]), '23502');
  });

  await check('existing grants prevent inconsistent parent ownership changes and deletion', async () => {
    await expectSqlstate(() => db.query('update public.outlets set company_id = $1 where id = $2',
      [id(302), id(101)]), ['23001', '23503']);
    await expectSqlstate(() => db.query('update public.company_memberships set company_id = $1 where id = $2',
      [id(302), id(403)]), ['23001', '23503']);
    await expectSqlstate(() => db.query('delete from public.companies where id = $1', [id(301)]), ['23001', '23503']);
    await expectSqlstate(() => db.query('delete from public.company_memberships where id = $1', [id(403)]), ['23001', '23503']);
  });

  await check('membership uniqueness, enumerations and stable normalized company code are enforced', async () => {
    await expectSqlstate(() => db.query(`insert into public.company_memberships (profile_id,company_id)
      values ($1,$2)`, [id(2), id(301)]), '23505');
    await expectSqlstate(() => db.query(`update public.company_memberships set membership_role = 'PLATFORM_ADMIN'
      where id = $1`, [id(402)]), '23514');
    await expectSqlstate(() => db.query(`update public.company_memberships set branch_scope = 'ALL_COMPANIES'
      where id = $1`, [id(402)]), '23514');
    await expectSqlstate(() => db.exec("insert into public.companies (code,name) values (' lower ','Invalid')"), '23514');
    await expectSqlstate(() => db.query("update public.companies set code = 'RENAMED' where id = $1", [id(301)]), '23514');
    await db.query("update public.companies set name = 'Renamed display name', updated_at = '2000-01-01' where id = $1", [id(301)]);
    assert.equal((await rows("select updated_at > '2000-01-02'::timestamptz as ok from public.companies where id = $1", [id(301)]))[0].ok, true);
  });

  await check('audit accepts privileged appends but rejects UPDATE, DELETE and TRUNCATE', async () => {
    await db.query(`insert into public.control_plane_audit_events
      (actor_user_id,company_id,outlet_id,event_type) values ($1,$2,$3,'TEST_EVENT')`,
    [id(7), id(301), id(101)]);
    for (const statement of [
      "update public.control_plane_audit_events set event_type = 'ALTERED'",
      'delete from public.control_plane_audit_events',
      'truncate public.control_plane_audit_events',
    ]) {
      await expectSqlstate(() => db.exec(statement), '42501');
    }
    assert.equal((await rows('select count(*)::integer as n from public.control_plane_audit_events'))[0].n, 1);
  });

  await check('postcheck detects changed outlet IDs and profile assignments', async () => {
    await db.query('update public.profiles set outlet_id = $1 where id = $2', [id(102), id(3)]);
    await db.query('update public.outlets set id = $1 where id = $2', [id(105), id(104)]);
    const sql = postcheck.replace('$phase1a_baseline$\n{}\n$phase1a_baseline$',
      `$phase1a_baseline$\n${JSON.stringify(baseline)}\n$phase1a_baseline$`);
    const results = await db.exec(sql);
    const comparisons = results.find((r) => r.rows?.[0]?.check_name)?.rows;
    for (const name of ['outlet_identity_set_unchanged', 'profile_identity_and_outlet_assignments_unchanged']) {
      assert.ok(comparisons.find((r) => r.check_name === name).result.startsWith('FAIL'));
    }
  });

  await check('name collision fails instead of replacing a helper, with full transaction rollback', async () => {
    const collisionDb = new PGlite();
    try {
      await collisionDb.exec(bootstrap);
      await collisionDb.exec('create function private.is_platform_admin() returns boolean language sql as $$ select false $$');
      await expectSqlstate(() => collisionDb.exec(migration), '42723');
      await collisionDb.exec('rollback');
      const result = await collisionDb.query("select to_regclass('public.companies') as company_table");
      assert.equal(result.rows[0].company_table, null);
      const columns = await collisionDb.query(`select count(*)::integer as n from information_schema.columns
        where table_schema = 'public' and table_name = 'outlets' and column_name = 'company_id'`);
      assert.equal(columns.rows[0].n, 0);
    } finally {
      await collisionDb.close();
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
