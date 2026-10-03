-- READ-ONLY: KDS cancellation/void semantic evidence collection.
-- Created after local application review at checkpoint 836391d.
-- Run manually in SQL Editor as an authorized database auditor, after review.
-- Never calls any application routine, changes schema/data, or writes history.
-- Only catalogs are read. No operational rows, auth users, or secrets are queried.
-- Return/export the ENTIRE result set: routine bodies can be long.
--
-- WHY: the live UI calls void_pos_sale_item_secure for posted sale items; KDS
-- sends update_kitchen_item_unit_status_v1(..., 'READY'). Local source does not
-- prove how a void reaches kitchen units or how parents are recalculated.
-- Missing historical void/cancel triggers cannot be declared harmless based
-- on a working READY button or the mere presence of newer KDS object names.
--
-- Search is driven by BODY CONTENT across non-system schemas, not names alone.
-- Known entrypoint names and attached trigger functions supplement that search.
-- Textual call edges include all same-name overload candidates, not resolved
-- calls. Comments/string literals can match; dynamically assembled SQL, unusual
-- quoted identifiers, external-language code and external jobs may evade search.
-- pg_depend edges supplement the text search but PL/pgSQL calls are often absent
-- there. Absence of matches is NOT proof that no remote/external path exists.
-- No output row independently proves SAFE_SUPERSEDED.
--
-- Human review must trace these chains in returned definitions:
-- A. direct AND approval-based void -> sale_items.line_status = VOIDED -> all
--    linked kitchen items/physical units -> item/ticket/order aggregate state.
-- B. sales.status = CANCELLED -> ticket/items/units (including split/add-on
--    tickets and already-ready/completed units, according to intended rules).
-- C. restaurant_orders cancellation -> restaurant_order_items + kitchen state,
--    including unpaid orders with no sale_id and already-posted/paid orders.
-- D. persisted waiter-item cancellation/removal -> quantity/units/parent state.
--    Decreasing an UNSUBMITTED browser cart does not perform this responsibility.
-- E. unit CANCELLED transitions: accepted statuses, ownership/permission checks,
--    valid transitions, idempotency and concurrency with READY/settlement.
-- F. recalculation invoked on ALL relevant mutations; no non-cancelled children
--    must not accidentally produce READY/COMPLETED; stale unit/item state must
--    not be hidden only by a view filter. Verify live views and persistence.
-- Financial/stock reversal, audit logging and table release must remain correct.
--
-- INDEX OUTPUT: all 12 historical indexes are checked because the five missing
-- names were not supplied with the remote summary. historical_name_present
-- identifies that subset. Classification is conservative structural evidence:
-- EXACT_REPLACEMENT_EXISTS: same simple full B-tree definition properties,
--   independent of index name (the original index also qualifies if present).
-- EQUIVALENT_OR_COVERED: valid unconditional default-opclass/collation B-tree
--   with the required leading columns. A single ASC created_at key supports
--   the historical DESC order by backward scan. INCLUDE columns are not keys.
-- PERFORMANCE_ONLY_GAP: no such simple candidate for a non-unique access index;
--   latency/locking/queue responsiveness can still be materially affected.
-- POTENTIALLY_MATERIAL: missing table, or required PK/UNIQUE backing semantics
--   not proven. A wider UNIQUE key does not enforce uniqueness of its prefix.
-- Partial/expression/custom-opclass indexes are returned for human review, but
-- not automatically credited as general coverage. No EXPLAIN ANALYZE is run.

begin transaction isolation level repeatable read read only;
set local search_path = pg_catalog, public;
set local quote_all_identifiers = off;
set local statement_timeout = '60s';

with recursive
terms(term) as (values
  ('kitchen_tickets'), ('kitchen_ticket_items'), ('kitchen_ticket_item_units'),
  ('sales'), ('sale_items'), ('restaurant_orders'), ('restaurant_order_items'),
  ('line_status'), ('cancelled'), ('voided'), ('recalculate_kitchen_ticket')
),
focus_tables(table_name) as (values
  ('sales'), ('sale_items'), ('restaurant_orders'), ('restaurant_order_items'),
  ('kitchen_tickets'), ('kitchen_ticket_items'), ('kitchen_ticket_item_units'),
  ('menu_kitchen_routes')
),
entrypoints(schema_name, routine_name, responsibility) as (values
  ('public', 'void_pos_sale_item_secure', 'A: direct and approved posted-item void; CURRENT LOCAL CALLER'),
  ('public', 'create_pos_approval_request', 'A: request VOID_ITEM approval; CURRENT LOCAL CALLER'),
  ('public', 'decide_pos_approval_request', 'A: decision vs actual consumption/apply; CURRENT LOCAL CALLER'),
  ('public', 'create_posted_sale_controlled', 'A/B: sale posting and enqueue linkage; CURRENT LOCAL CALLER'),
  ('public', 'settle_restaurant_order_secure', 'A/B/C: order -> sale/shift/stock linkage; CURRENT LOCAL CALLER'),
  ('public', 'create_restaurant_order_secure', 'C: original order/items/KDS creation; CURRENT LOCAL CALLER'),
  ('public', 'add_restaurant_order_items_secure', 'C/D: add-on rounds and source links; CURRENT LOCAL CALLER'),
  ('public', 'create_waiter_order_secure', 'D: persisted waiter items/KDS; CURRENT LOCAL CALLER'),
  ('public', 'add_waiter_order_items_secure', 'D: persisted waiter add-ons; CURRENT LOCAL CALLER'),
  ('public', 'update_kitchen_item_unit_status_v1', 'E/F: local UI sends READY only; CURRENT LOCAL CALLER'),
  ('public', 'update_kitchen_item_status_v2', 'E/F: remote-confirmed routine; NO current local caller'),
  ('private', 'recalculate_kitchen_ticket', 'F: remote-confirmed replacement candidate; inspect callers/body'),
  ('private', 'can_post_kitchen_action', 'E/F: remote-confirmed KDS write authorization'),
  ('private', 'can_view_kitchen_row', 'E/F: remote-confirmed KDS visibility authorization'),
  ('private', 'enqueue_sale_to_kitchen', 'A/B: retained sale enqueue trigger target; inspect actual wiring'),
  ('private', 'sync_sale_item_void_to_kitchen', 'A: historical trigger function; reported missing'),
  ('private', 'sync_sale_cancel_to_kitchen', 'B: historical trigger function; reported missing'),
  ('private', 'recalculate_kitchen_ticket_status', 'F: historical recalculation; reported missing'),
  ('public', 'update_kitchen_ticket_status', 'E/F: historical bulk RPC; reported missing/no local caller'),
  ('public', 'update_kitchen_item_status', 'E/F: historical item RPC; inspect any remaining callers')
),
routine_base as materialized (
  select p.*, n.nspname as schema_name, l.lanname as language
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
  where p.prokind in ('f', 'p') and n.nspname <> 'information_schema'
    and n.nspname !~ '^pg_'
),
routines as materialized (
  select p.oid, p.schema_name, p.proname as routine_name, p.language,
    format('%I.%I(%s)', p.schema_name, p.proname, oidvectortypes(p.proargtypes)) as signature,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as result_type,
    pg_get_functiondef(p.oid) as definition,
    -- prosrc is body text for PL/pgSQL; full definition also covers SQL-standard
    -- BEGIN ATOMIC bodies stored in prosqlbody rather than prosrc.
    p.prosrc || E'\n' || pg_get_functiondef(p.oid) as search_body,
    p.prosecdef as security_definer, p.proconfig as configuration,
    p.provolatile as volatility, p.proowner, p.proacl,
    pg_get_userbyid(p.proowner) as owner
  from routine_base p
),
body_matches as (
  select r.oid, array_agg(t.term order by t.term) as matched_terms
  from routines r join terms t on strpos(lower(r.search_body), t.term) > 0
  group by r.oid
),
relations as (
  select c.*, n.nspname as schema_name
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname <> 'information_schema' and n.nspname !~ '^pg_'
),
all_triggers as (
  select t.oid, t.tgfoid, c.oid as relation_oid,
    c.schema_name, c.relname as table_name, t.tgname as trigger_name,
    t.tgenabled as enabled_mode, pg_get_triggerdef(t.oid, false) as definition,
    (c.schema_name = 'public' and c.relname in (select table_name from focus_tables)) as on_focus_table
  from pg_trigger t join relations c on c.oid = t.tgrelid
  where not t.tgisinternal
),
-- Lexical candidate edges, not a parser or proof of execution.
call_tokens as (
  select distinct r.oid as caller_oid, lower(m.token[1]) as callee_name
  from routines r
  cross join lateral regexp_matches(replace(r.search_body, '"', ''),
    '([[:alpha:]_][[:alnum:]_$]*)[[:space:]]*\(', 'g') as m(token)
),
call_edges as (
  select t.caller_oid, r.oid as callee_oid, 'BODY_TEXT_CANDIDATE'::text as evidence
  from call_tokens t join routines r on lower(r.routine_name) = t.callee_name
  where t.caller_oid <> r.oid
  union
  select d.objid, d.refobjid, 'PG_DEPEND_RECORDED'
  from pg_depend d join routines a on a.oid = d.objid
  join routines b on b.oid = d.refobjid
  where d.classid = 'pg_proc'::regclass and d.refclassid = 'pg_proc'::regclass
    and d.objid <> d.refobjid
),
seeds(oid) as (
  select oid from body_matches
  union select r.oid from routines r join entrypoints e
    on (e.schema_name, e.routine_name) = (r.schema_name, r.routine_name)
  union select tgfoid from all_triggers where on_focus_table
),
reachable(oid) as (
  select oid from seeds
  union
  select e.callee_oid from reachable r join call_edges e on e.caller_oid = r.oid
),
scope(oid) as (
  select oid from reachable
  -- Also return definitions of direct callers, including wrappers whose names
  -- and bodies mention none of the table/status terms themselves.
  union select e.caller_oid from call_edges e join reachable r on r.oid = e.callee_oid
),
selected_routines as (
  select r.* from routines r join scope s using (oid)
),
selected_triggers as (
  select t.* from all_triggers t
  where t.on_focus_table or t.tgfoid in (select oid from scope)
),
live_views as materialized (
  select c.oid, c.schema_name, c.relname as view_name, c.relkind,
    c.relowner, c.reloptions, pg_get_viewdef(c.oid, false) as definition
  from relations c where c.relkind in ('v', 'm')
),
expected_indexes(table_name, index_name, key_columns, sort_flags, is_unique, is_primary) as (values
  ('menu_kitchen_routes', 'idx_menu_kitchen_routes_outlet', array['outlet_id'], array[0], false, false),
  ('menu_kitchen_routes', 'idx_menu_kitchen_routes_menu', array['menu_item_id'], array[0], false, false),
  ('kitchen_tickets', 'idx_kitchen_tickets_outlet_status', array['outlet_id','status'], array[0,0], false, false),
  ('kitchen_tickets', 'idx_kitchen_tickets_created', array['created_at'], array[3], false, false),
  ('kitchen_ticket_items', 'idx_kitchen_ticket_items_ticket', array['ticket_id'], array[0], false, false),
  ('kitchen_ticket_items', 'idx_kitchen_ticket_items_station_status', array['station','status'], array[0,0], false, false),
  ('menu_kitchen_routes', 'menu_kitchen_routes_pkey', array['id'], array[0], true, true),
  ('menu_kitchen_routes', 'menu_kitchen_routes_outlet_id_menu_item_id_key', array['outlet_id','menu_item_id'], array[0,0], true, false),
  ('kitchen_tickets', 'kitchen_tickets_pkey', array['id'], array[0], true, true),
  ('kitchen_tickets', 'kitchen_tickets_sale_id_key', array['sale_id'], array[0], true, false),
  ('kitchen_ticket_items', 'kitchen_ticket_items_pkey', array['id'], array[0], true, true),
  ('kitchen_ticket_items', 'kitchen_ticket_items_sale_item_id_key', array['sale_item_id'], array[0], true, false)
),
live_indexes as (
  select c.relname::text as table_name, x.indexrelid as oid, idx.relname::text as index_name,
    am.amname::text as method, pg_get_indexdef(x.indexrelid) as definition,
    x.indisvalid as is_valid, x.indisready as is_ready, x.indislive as is_live,
    x.indisunique as is_unique, x.indisprimary as is_primary,
    x.indnkeyatts as key_count, x.indnatts as all_column_count,
    pg_get_expr(x.indpred, x.indrelid, false) as predicate,
    pg_get_expr(x.indexprs, x.indrelid, false) as expressions,
    array(select a.attname::text
      from unnest(x.indkey::smallint[]) with ordinality k(attnum, position)
      left join pg_attribute a on a.attrelid = c.oid and a.attnum = k.attnum
      where k.position <= x.indnkeyatts order by k.position) as key_columns,
    array(select flag::integer from unnest(x.indoption::smallint[]) with ordinality z(flag, position)
      order by position) as sort_flags,
    array(select op.opcdefault from unnest(x.indclass::oid[]) with ordinality z(opclass, position)
      join pg_opclass op on op.oid = z.opclass order by position) as default_opclasses,
    array(select co.collation_oid = a.attcollation
      from unnest(x.indkey::smallint[]) with ordinality k(attnum, position)
      join unnest(x.indcollation::oid[]) with ordinality co(collation_oid, position) using (position)
      left join pg_attribute a on a.attrelid = c.oid and a.attnum = k.attnum
      where k.position <= x.indnkeyatts order by k.position) as column_collations_match,
    con.contype::text as backing_constraint_type,
    con.convalidated as backing_constraint_validated,
    con.condeferrable as backing_constraint_deferrable
  from relations c join pg_index x on x.indrelid = c.oid
  join pg_class idx on idx.oid = x.indexrelid
  join pg_am am on am.oid = idx.relam
  left join pg_constraint con on con.conindid = x.indexrelid and con.conrelid = c.oid
    and con.contype in ('p', 'u')
  where c.schema_name = 'public' and c.relname in (select table_name from focus_tables)
),
index_candidates as (
  select e.index_name as historical_name, c.*,
    (c.key_columns = e.key_columns and c.sort_flags = e.sort_flags
      and c.is_unique = e.is_unique and c.is_primary = e.is_primary) as exact_shape
  from expected_indexes e join live_indexes c on c.table_name = e.table_name
  where c.is_valid and c.is_ready and c.is_live and c.method = 'btree'
    and c.predicate is null and c.expressions is null
    and c.key_columns[1:cardinality(e.key_columns)] = e.key_columns
    and not exists (select 1 from unnest(c.default_opclasses[1:cardinality(e.key_columns)]) v where v is not true)
    and not exists (select 1 from unnest(c.column_collations_match[1:cardinality(e.key_columns)]) v where v is not true)
    and (e.index_name <> 'idx_kitchen_tickets_created' or c.sort_flags[1] in (0, 3))
    and (not e.is_unique or (c.is_unique and c.key_count = cardinality(e.key_columns)
      and c.backing_constraint_type in ('p', 'u') and c.backing_constraint_validated
      and not c.backing_constraint_deferrable))
    and (not e.is_primary or c.is_primary)
),
index_rows as (
  select '70_INDEX_CLASSIFICATION'::text as section, 'public.' || e.index_name as object_name,
    case when exists (select 1 from index_candidates c where c.historical_name = e.index_name and c.exact_shape)
        then 'EXACT_REPLACEMENT_EXISTS'
      when exists (select 1 from index_candidates c where c.historical_name = e.index_name)
        then 'EQUIVALENT_OR_COVERED'
      when e.is_unique or to_regclass('public.' || e.table_name) is null then 'POTENTIALLY_MATERIAL'
      else 'PERFORMANCE_ONLY_GAP' end as finding,
    jsonb_build_object('historical_name_present', to_regclass('public.' || e.index_name) is not null,
      'historical_expectation', to_jsonb(e),
      'coverage_candidates', coalesce((select jsonb_agg(to_jsonb(c) - 'oid')
        from index_candidates c where c.historical_name = e.index_name), '[]'::jsonb)) as details,
    (select definition from live_indexes c where c.index_name = e.index_name limit 1) as current_definition,
    'Filter historical_name_present=false to find the missing subset. Classification is structural, not an execution-plan benchmark. Review all live indexes for partial/expression/custom-opclass alternatives. Never equate a wider UNIQUE key with uniqueness of its prefix.'::text as review_note
  from expected_indexes e
),
rows as (
  select '10_ENTRYPOINTS'::text as section,
    coalesce(r.signature, e.schema_name || '.' || e.routine_name || ' (all overloads)') as object_name,
    case when r.oid is null then 'MISSING' else 'PRESENT_REVIEW_BODY_AND_CALLERS' end as finding,
    jsonb_build_object('responsibility', e.responsibility, 'arguments', r.arguments,
      'result_type', r.result_type, 'owner', r.owner,
      'security_definer', r.security_definer, 'configuration', r.configuration) as details,
    null::text as current_definition,
    'Full definitions are in ROUTINE rows; a missing historical entrypoint is not proof of a gap if replacement behavior can be demonstrated.'::text as review_note
  from entrypoints e left join routines r
    on (r.schema_name, r.routine_name) = (e.schema_name, e.routine_name)
  union all
  select '20_ROUTINE_BODIES', r.signature, 'SEMANTIC_REVIEW_REQUIRED',
    jsonb_build_object('matched_terms', coalesce(m.matched_terms, array[]::text[]),
      'selected_by_body_content', m.oid is not null,
      'owner', r.owner, 'language', r.language, 'arguments', r.arguments,
      'result_type', r.result_type, 'security_definer', r.security_definer,
      'configuration', r.configuration,
      'mentions_dynamic_execution', r.search_body ~* '\mexecute\M',
      'acl', (select jsonb_agg(jsonb_build_object(
        'grantee', case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee)::text end,
        'privilege', a.privilege_type, 'grantable', a.is_grantable))
        from aclexplode(coalesce(r.proacl, acldefault('f', r.proowner))) a)),
    r.definition,
    'Body-content match or trigger/call-graph context. Inspect actual UPDATE/DELETE targets, joins, early returns, permissions and recalculation calls. A keyword occurrence is NOT proof of propagation.'
  from selected_routines r left join body_matches m using (oid)
  union all
  select '25_CALL_GRAPH', a.signature || ' -> ' || b.signature, e.evidence,
    jsonb_build_object('caller', a.signature, 'callee_candidate', b.signature), null,
    'Text candidates can come from comments/literals and include unrelated same-name overloads/schemas. Resolve signatures and search_path manually. Dynamic SQL and external calls may be absent.'
  from call_edges e join routines a on a.oid = e.caller_oid join routines b on b.oid = e.callee_oid
  where e.caller_oid in (select oid from scope) and e.callee_oid in (select oid from scope)
  union all
  select '30_TRIGGER_COVERAGE', 'public.' || f.table_name,
    case when c.oid is null then 'TABLE_MISSING'
      when not exists (select 1 from all_triggers t where t.relation_oid = c.oid)
        then 'NO_NONINTERNAL_TRIGGERS_RPC_PATH_MUST_BE_REVIEWED'
      else 'INSPECT_ALL_ATTACHED_TRIGGERS' end,
    jsonb_build_object('table_exists', c.oid is not null,
      'noninternal_trigger_count', (select count(*) from all_triggers t where t.relation_oid = c.oid)), null,
    'No trigger is not automatically a gap: a correctly secured RPC can synchronize atomically. However all other write paths need equivalent protection. FK cascades are shown in TABLE_CONSTRAINTS.'
  from focus_tables f left join relations c on c.schema_name = 'public' and c.relname = f.table_name
  union all
  select '31_TRIGGER_DEFINITIONS', format('%I.%I.%I', t.schema_name, t.table_name, t.trigger_name),
    case when t.enabled_mode = 'D' then 'DISABLED'
      when t.enabled_mode = 'R' then 'REPLICA_ONLY_REVIEW'
      else 'PRESENT_REVIEW_EVENT_AND_BODY' end,
    jsonb_build_object('enabled_mode', t.enabled_mode, 'on_focus_table', t.on_focus_table,
      'called_routine', r.signature),
    t.definition || E'\n\n-- Current trigger function:\n' || coalesce(r.definition, ''),
    'Verify UPDATE OF columns, WHEN, row/statement timing and normal execution mode; trace invoked functions. Triggers on indirect/intermediate tables are included when their routine is in scope.'
  from selected_triggers t left join routines r on r.oid = t.tgfoid
  union all
  select '32_LEGACY_TRIGGER_PRESENCE', 'public.' || e.table_name || '.' || e.trigger_name,
    case when t.oid is null then 'MISSING_REPLACEMENT_NOT_PROVEN' else 'PRESENT_INSPECT_CURRENT_DEFINITION' end,
    jsonb_build_object('responsibility', e.responsibility, 'enabled_mode', t.enabled_mode), t.definition,
    'The retained POSTED enqueue trigger does not by itself demonstrate VOIDED/CANCELLED propagation.'
  from (values
    ('sale_items', 'trg_sale_item_void_kitchen', 'A: sale-item VOIDED -> kitchen cancellation'),
    ('sales', 'trg_sale_cancel_kitchen', 'B: sale CANCELLED -> kitchen cancellation'),
    ('sales', 'trg_sales_enqueue_kitchen', 'Posting -> kitchen enqueue')
  ) e(table_name, trigger_name, responsibility)
  left join all_triggers t on t.schema_name = 'public'
    and (t.table_name, t.trigger_name) = (e.table_name, e.trigger_name)
  union all
  select '40_TABLE_COLUMNS', format('%I.%I', c.schema_name, c.relname), 'CURRENT_LINKAGE_SCHEMA',
    jsonb_build_object('kind', c.relkind, 'columns',
      (select jsonb_agg(jsonb_build_object('name', a.attname,
        'type', format_type(a.atttypid, a.atttypmod), 'not_null', a.attnotnull,
        'default', pg_get_expr(d.adbin, d.adrelid, false)) order by a.attnum)
       from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
       where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped)), null,
    'Use actual sale/order/item/unit link columns to verify propagation across split tickets and add-on rounds. No joins against operational data are executed.'
  from relations c where c.schema_name = 'public' and c.relname in (select table_name from focus_tables)
  union all
  select '41_TABLE_CONSTRAINTS', format('%I.%I.%I', c.schema_name, c.relname, k.conname),
    'CURRENT_CONSTRAINT', jsonb_build_object('type', k.contype, 'validated', k.convalidated),
    pg_get_constraintdef(k.oid, false),
    'FK ON DELETE behavior applies to deletion, not automatically to status changes. Inspect status CHECK values, uniqueness and parent/child links.'
  from relations c join pg_constraint k on k.conrelid = c.oid
  where c.schema_name = 'public' and c.relname in (select table_name from focus_tables)
  union all
  select '50_VIEW_DEFINITIONS', format('%I.%I', v.schema_name, v.view_name), 'READ_PROJECTION_REVIEW',
    jsonb_build_object('kind', v.relkind, 'owner', pg_get_userbyid(v.relowner), 'options', v.reloptions,
      'matched_terms', array(select t.term from terms t where strpos(lower(v.definition), t.term) > 0)),
    v.definition,
    'A view may exclude cancelled/voided sources while persisted kitchen units remain active. Check whether state is written or merely derived/filtered, and whether every caller uses the same projection.'
  from live_views v where exists (select 1 from terms t where strpos(lower(v.definition), t.term) > 0)
    or v.view_name in ('kitchen_tickets_kds_v2_secure', 'kitchen_ticket_items_kds_v3_secure',
      'kitchen_ticket_item_units_kds_v1_secure', 'restaurant_order_kds_status_secure',
      'restaurant_order_items_secure', 'waiter_order_items_secure')
  union all
  select '60_LEGACY_CALLSITE_SEARCH', r.signature || ' -> ' || e.routine_name,
    'TEXT_REFERENCE_REQUIRES_RESOLUTION',
    jsonb_build_object('legacy_name', e.routine_name,
      'self_name_match', r.routine_name = e.routine_name), r.definition,
    'A textual reference may be a definition header, comment or dynamic SQL. Verify whether any reachable body still invokes a missing legacy routine.'
  from routines r cross join (values
    ('update_kitchen_ticket_status'), ('sync_sale_cancel_to_kitchen'),
    ('sync_sale_item_void_to_kitchen'), ('recalculate_kitchen_ticket_status')
  ) e(routine_name)
  where strpos(lower(r.search_body), e.routine_name) > 0
  union all select * from index_rows
  union all
  select '71_ALL_LIVE_INDEXES', 'public.' || i.index_name,
    case when i.is_valid and i.is_ready and i.is_live then 'AVAILABLE_FOR_REVIEW' else 'INVALID_OR_NOT_READY' end,
    to_jsonb(i) - 'oid' - 'definition', i.definition,
    'Includes indexes on source tables and unit tables. Review this full list for alternatives not credited by the conservative classifier, and use actual workload plans separately.'
  from live_indexes i
),
summary as (
  select '00_SUMMARY'::text as section, 'KDS cancellation/void reconciliation'::text as object_name,
    'NEEDS_REMOTE_EVIDENCE_REVIEW'::text as finding,
    jsonb_build_object('audited_at', transaction_timestamp(), 'auditor', current_user,
      'postgres_version', current_setting('server_version'),
      'read_only', current_setting('transaction_read_only'),
      'routine_body_matches', (select count(*) from body_matches),
      'routine_definitions_returned', (select count(*) from selected_routines),
      'triggers_returned', (select count(*) from selected_triggers),
      'historical_indexes_named_missing', (select count(*) from index_rows
        where not (details ->> 'historical_name_present')::boolean),
      'index_classifications', (select jsonb_object_agg(finding, n) from
        (select finding, count(*) as n from index_rows group by finding) x)) as details,
    null::text as current_definition,
    'Catalog evidence only. Review chains A-F in the file header before deciding SAFE_SUPERSEDED vs POSSIBLE_GAP. No mutation, application function invocation, operational-data audit, execution-plan test or migration-history change was performed.'::text as review_note
)
select * from summary
union all select * from rows
order by section, object_name, finding;

commit;
