-- READ-ONLY KDS MIGRATION-HISTORY RECONCILIATION AUDIT
-- Historical migration: 20260926130000_kds_v1_foundation.sql
-- Source SHA-256: 9b6a35a7953907128238852aa5ebede5a0ddc1da899803dd9ce7ad0df518f3a7
--
-- Run manually as a database owner/auditor in Supabase SQL Editor after review.
-- This file reads PostgreSQL catalogs only. It does not read operational rows,
-- execute application/auth functions, create temporary objects, change schema,
-- change data, or write migration history. It does not apply either migration.
--
-- ONE RESULT SET: summary first, then one row per historical object/security
-- expectation, dependency evidence, newer objects, and additional live objects.
-- Export all rows; function/view/trigger definitions may be long.
--
-- EXACT = the specific historical catalog properties checked by that row match.
-- PRESENT_BUT_EVOLVED = same named object exists but those properties differ.
-- MISSING = historical name/signature is absent, NOT an instruction to recreate.
-- PRESENT_UNBASELINED = dependency/new object has no definition in the old SQL.
-- A renamed equivalent can appear under ADDITIONAL_* while the old name is MISSING.
-- EXACT for a trigger means its wiring/enabled mode match; review its function too.
-- EXACT is not a proof of behavioral equivalence or a complete production test.
--
-- Expected catalog metadata was extracted by executing the unmodified old SQL
-- ONLY in an isolated PGlite/PostgreSQL 18.3 fixture. No fixture DDL is executed
-- here. Function hashes include full pg_get_functiondef output and body text;
-- comments, formatting, server-version deparsing and qualification can produce
-- conservative PRESENT_BUT_EVOLVED results. Current definitions are returned so
-- a human can distinguish harmless formatting from real behavior changes.
-- Parent-table types/auth-helper definitions are NOT inferred from fixtures.
--
-- Human decision rules:
-- 1. Exact historical footprint is evidence for ledger-only reconciliation,
--    subject to current-app dependencies, ownership/grants and runtime review.
-- 2. Evolved/missing objects need an explicit old-to-current coverage mapping:
--    routing, enqueue timing, unit/item/header status, void/cancel sync, access.
-- 3. Presence of v2/v3/unit objects alone NEVER proves supersession. Inspect
--    definitions/callers and confirm the running POS/Waiter/KDS flows separately.
-- 4. Review extra sale triggers for double-enqueue or ordering changes. Review
--    all policies/ACLs and function owners, including inherited/column grants.
-- 5. Do not replay the old SQL just because its ledger entry is absent. It drops
--    views/triggers and CREATE OR REPLACEs functions that may have evolved.
-- 6. This audit never approves or performs migration repair. No Tenant #2 or
--    Phase 1A conclusions follow from historical KDS coverage.
--
-- The old SQL uses IF NOT EXISTS for tables/indexes: its intended definition is
-- the baseline here, not a claim that every property was once applied remotely.
-- It creates no policies, and never revokes PUBLIC access on the raw tables.
-- Extra policies/ACLs require review; this audit never recommends deleting them.

begin transaction isolation level repeatable read read only;
set local search_path = pg_catalog, public;
set local quote_all_identifiers = off;
set local statement_timeout = '60s';

with
baseline as (
  select $kds_historical_manifest$
{
  "migration_version": "20260926130000",
  "source_sha256": "9b6a35a7953907128238852aa5ebede5a0ddc1da899803dd9ce7ad0df518f3a7",
  "reference_postgres_version": "18.3",
  "tables": [
    {"table_name": "kitchen_ticket_items","kind": "r","rls_enabled": true,"rls_forced": false},
    {"table_name": "kitchen_tickets","kind": "r","rls_enabled": true,"rls_forced": false},
    {"table_name": "menu_kitchen_routes","kind": "r","rls_enabled": true,"rls_forced": false}
  ],
  "columns": [
    {"table_name": "kitchen_ticket_items","column_name": "id","ordinal": 1,"data_type": "uuid","not_null": true,"default_expression": "gen_random_uuid()","identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_ticket_items","column_name": "ticket_id","ordinal": 2,"data_type": "uuid","not_null": true,"default_expression": null,"identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_ticket_items","column_name": "sale_item_id","ordinal": 3,"data_type": "uuid","not_null": true,"default_expression": null,"identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_ticket_items","column_name": "menu_item_id","ordinal": 4,"data_type": "uuid","not_null": true,"default_expression": null,"identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_ticket_items","column_name": "station","ordinal": 5,"data_type": "character varying(30)","not_null": true,"default_expression": "'KITCHEN'::character varying","identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_ticket_items","column_name": "menu_code","ordinal": 6,"data_type": "character varying","not_null": false,"default_expression": null,"identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_ticket_items","column_name": "menu_name","ordinal": 7,"data_type": "character varying","not_null": true,"default_expression": null,"identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_ticket_items","column_name": "menu_category","ordinal": 8,"data_type": "character varying","not_null": false,"default_expression": null,"identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_ticket_items","column_name": "quantity","ordinal": 9,"data_type": "numeric","not_null": true,"default_expression": null,"identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_ticket_items","column_name": "notes","ordinal": 10,"data_type": "text","not_null": false,"default_expression": null,"identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_ticket_items","column_name": "status","ordinal": 11,"data_type": "character varying(30)","not_null": true,"default_expression": "'NEW'::character varying","identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_ticket_items","column_name": "started_at","ordinal": 12,"data_type": "timestamp with time zone","not_null": false,"default_expression": null,"identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_ticket_items","column_name": "ready_at","ordinal": 13,"data_type": "timestamp with time zone","not_null": false,"default_expression": null,"identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_ticket_items","column_name": "completed_at","ordinal": 14,"data_type": "timestamp with time zone","not_null": false,"default_expression": null,"identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_ticket_items","column_name": "created_at","ordinal": 15,"data_type": "timestamp with time zone","not_null": true,"default_expression": "now()","identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_ticket_items","column_name": "updated_at","ordinal": 16,"data_type": "timestamp with time zone","not_null": true,"default_expression": "now()","identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_tickets","column_name": "id","ordinal": 1,"data_type": "uuid","not_null": true,"default_expression": "gen_random_uuid()","identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_tickets","column_name": "sale_id","ordinal": 2,"data_type": "uuid","not_null": true,"default_expression": null,"identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_tickets","column_name": "outlet_id","ordinal": 3,"data_type": "uuid","not_null": true,"default_expression": null,"identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_tickets","column_name": "source","ordinal": 4,"data_type": "character varying(30)","not_null": true,"default_expression": "'POS'::character varying","identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_tickets","column_name": "status","ordinal": 5,"data_type": "character varying(30)","not_null": true,"default_expression": "'NEW'::character varying","identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_tickets","column_name": "notes","ordinal": 6,"data_type": "text","not_null": false,"default_expression": null,"identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_tickets","column_name": "opened_at","ordinal": 7,"data_type": "timestamp with time zone","not_null": true,"default_expression": "now()","identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_tickets","column_name": "started_at","ordinal": 8,"data_type": "timestamp with time zone","not_null": false,"default_expression": null,"identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_tickets","column_name": "ready_at","ordinal": 9,"data_type": "timestamp with time zone","not_null": false,"default_expression": null,"identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_tickets","column_name": "completed_at","ordinal": 10,"data_type": "timestamp with time zone","not_null": false,"default_expression": null,"identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_tickets","column_name": "created_at","ordinal": 11,"data_type": "timestamp with time zone","not_null": true,"default_expression": "now()","identity_kind": "","generated_kind": ""},
    {"table_name": "kitchen_tickets","column_name": "updated_at","ordinal": 12,"data_type": "timestamp with time zone","not_null": true,"default_expression": "now()","identity_kind": "","generated_kind": ""},
    {"table_name": "menu_kitchen_routes","column_name": "id","ordinal": 1,"data_type": "uuid","not_null": true,"default_expression": "gen_random_uuid()","identity_kind": "","generated_kind": ""},
    {"table_name": "menu_kitchen_routes","column_name": "outlet_id","ordinal": 2,"data_type": "uuid","not_null": true,"default_expression": null,"identity_kind": "","generated_kind": ""},
    {"table_name": "menu_kitchen_routes","column_name": "menu_item_id","ordinal": 3,"data_type": "uuid","not_null": true,"default_expression": null,"identity_kind": "","generated_kind": ""},
    {"table_name": "menu_kitchen_routes","column_name": "station","ordinal": 4,"data_type": "character varying(30)","not_null": true,"default_expression": "'KITCHEN'::character varying","identity_kind": "","generated_kind": ""},
    {"table_name": "menu_kitchen_routes","column_name": "is_active","ordinal": 5,"data_type": "boolean","not_null": true,"default_expression": "true","identity_kind": "","generated_kind": ""},
    {"table_name": "menu_kitchen_routes","column_name": "created_at","ordinal": 6,"data_type": "timestamp with time zone","not_null": true,"default_expression": "now()","identity_kind": "","generated_kind": ""},
    {"table_name": "menu_kitchen_routes","column_name": "updated_at","ordinal": 7,"data_type": "timestamp with time zone","not_null": true,"default_expression": "now()","identity_kind": "","generated_kind": ""}
  ],
  "constraints": [
    {"table_name": "kitchen_ticket_items","constraint_name": "kitchen_ticket_items_menu_item_id_fkey","kind": "f","definition": "FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT","validated": true,"deferrable": false,"initially_deferred": false},
    {"table_name": "kitchen_ticket_items","constraint_name": "kitchen_ticket_items_pkey","kind": "p","definition": "PRIMARY KEY (id)","validated": true,"deferrable": false,"initially_deferred": false},
    {"table_name": "kitchen_ticket_items","constraint_name": "kitchen_ticket_items_quantity_check","kind": "c","definition": "CHECK ((quantity > (0)::numeric))","validated": true,"deferrable": false,"initially_deferred": false},
    {"table_name": "kitchen_ticket_items","constraint_name": "kitchen_ticket_items_sale_item_id_fkey","kind": "f","definition": "FOREIGN KEY (sale_item_id) REFERENCES sale_items(id) ON DELETE CASCADE","validated": true,"deferrable": false,"initially_deferred": false},
    {"table_name": "kitchen_ticket_items","constraint_name": "kitchen_ticket_items_sale_item_id_key","kind": "u","definition": "UNIQUE (sale_item_id)","validated": true,"deferrable": false,"initially_deferred": false},
    {"table_name": "kitchen_ticket_items","constraint_name": "kitchen_ticket_items_station_check","kind": "c","definition": "CHECK (((station)::text = ANY ((ARRAY['KITCHEN'::character varying, 'BAR'::character varying])::text[])))","validated": true,"deferrable": false,"initially_deferred": false},
    {"table_name": "kitchen_ticket_items","constraint_name": "kitchen_ticket_items_status_check","kind": "c","definition": "CHECK (((status)::text = ANY ((ARRAY['NEW'::character varying, 'PREPARING'::character varying, 'READY'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))","validated": true,"deferrable": false,"initially_deferred": false},
    {"table_name": "kitchen_ticket_items","constraint_name": "kitchen_ticket_items_ticket_id_fkey","kind": "f","definition": "FOREIGN KEY (ticket_id) REFERENCES kitchen_tickets(id) ON DELETE CASCADE","validated": true,"deferrable": false,"initially_deferred": false},
    {"table_name": "kitchen_tickets","constraint_name": "kitchen_tickets_outlet_id_fkey","kind": "f","definition": "FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE RESTRICT","validated": true,"deferrable": false,"initially_deferred": false},
    {"table_name": "kitchen_tickets","constraint_name": "kitchen_tickets_pkey","kind": "p","definition": "PRIMARY KEY (id)","validated": true,"deferrable": false,"initially_deferred": false},
    {"table_name": "kitchen_tickets","constraint_name": "kitchen_tickets_sale_id_fkey","kind": "f","definition": "FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE","validated": true,"deferrable": false,"initially_deferred": false},
    {"table_name": "kitchen_tickets","constraint_name": "kitchen_tickets_sale_id_key","kind": "u","definition": "UNIQUE (sale_id)","validated": true,"deferrable": false,"initially_deferred": false},
    {"table_name": "kitchen_tickets","constraint_name": "kitchen_tickets_source_check","kind": "c","definition": "CHECK (((source)::text = ANY ((ARRAY['POS'::character varying, 'WAITER'::character varying, 'QR'::character varying])::text[])))","validated": true,"deferrable": false,"initially_deferred": false},
    {"table_name": "kitchen_tickets","constraint_name": "kitchen_tickets_status_check","kind": "c","definition": "CHECK (((status)::text = ANY ((ARRAY['NEW'::character varying, 'PREPARING'::character varying, 'PARTIAL_READY'::character varying, 'READY'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))","validated": true,"deferrable": false,"initially_deferred": false},
    {"table_name": "menu_kitchen_routes","constraint_name": "menu_kitchen_routes_menu_item_id_fkey","kind": "f","definition": "FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE","validated": true,"deferrable": false,"initially_deferred": false},
    {"table_name": "menu_kitchen_routes","constraint_name": "menu_kitchen_routes_outlet_id_fkey","kind": "f","definition": "FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE","validated": true,"deferrable": false,"initially_deferred": false},
    {"table_name": "menu_kitchen_routes","constraint_name": "menu_kitchen_routes_outlet_id_menu_item_id_key","kind": "u","definition": "UNIQUE (outlet_id, menu_item_id)","validated": true,"deferrable": false,"initially_deferred": false},
    {"table_name": "menu_kitchen_routes","constraint_name": "menu_kitchen_routes_pkey","kind": "p","definition": "PRIMARY KEY (id)","validated": true,"deferrable": false,"initially_deferred": false},
    {"table_name": "menu_kitchen_routes","constraint_name": "menu_kitchen_routes_station_check","kind": "c","definition": "CHECK (((station)::text = ANY ((ARRAY['KITCHEN'::character varying, 'BAR'::character varying])::text[])))","validated": true,"deferrable": false,"initially_deferred": false}
  ],
  "indexes": [
    {"table_name": "kitchen_ticket_items","index_name": "idx_kitchen_ticket_items_station_status","definition": "CREATE INDEX idx_kitchen_ticket_items_station_status ON public.kitchen_ticket_items USING btree (station, status)","is_unique": false,"is_primary": false,"is_valid": true,"is_ready": true,"is_live": true},
    {"table_name": "kitchen_ticket_items","index_name": "idx_kitchen_ticket_items_ticket","definition": "CREATE INDEX idx_kitchen_ticket_items_ticket ON public.kitchen_ticket_items USING btree (ticket_id)","is_unique": false,"is_primary": false,"is_valid": true,"is_ready": true,"is_live": true},
    {"table_name": "kitchen_ticket_items","index_name": "kitchen_ticket_items_pkey","definition": "CREATE UNIQUE INDEX kitchen_ticket_items_pkey ON public.kitchen_ticket_items USING btree (id)","is_unique": true,"is_primary": true,"is_valid": true,"is_ready": true,"is_live": true},
    {"table_name": "kitchen_ticket_items","index_name": "kitchen_ticket_items_sale_item_id_key","definition": "CREATE UNIQUE INDEX kitchen_ticket_items_sale_item_id_key ON public.kitchen_ticket_items USING btree (sale_item_id)","is_unique": true,"is_primary": false,"is_valid": true,"is_ready": true,"is_live": true},
    {"table_name": "kitchen_tickets","index_name": "idx_kitchen_tickets_created","definition": "CREATE INDEX idx_kitchen_tickets_created ON public.kitchen_tickets USING btree (created_at DESC)","is_unique": false,"is_primary": false,"is_valid": true,"is_ready": true,"is_live": true},
    {"table_name": "kitchen_tickets","index_name": "idx_kitchen_tickets_outlet_status","definition": "CREATE INDEX idx_kitchen_tickets_outlet_status ON public.kitchen_tickets USING btree (outlet_id, status)","is_unique": false,"is_primary": false,"is_valid": true,"is_ready": true,"is_live": true},
    {"table_name": "kitchen_tickets","index_name": "kitchen_tickets_pkey","definition": "CREATE UNIQUE INDEX kitchen_tickets_pkey ON public.kitchen_tickets USING btree (id)","is_unique": true,"is_primary": true,"is_valid": true,"is_ready": true,"is_live": true},
    {"table_name": "kitchen_tickets","index_name": "kitchen_tickets_sale_id_key","definition": "CREATE UNIQUE INDEX kitchen_tickets_sale_id_key ON public.kitchen_tickets USING btree (sale_id)","is_unique": true,"is_primary": false,"is_valid": true,"is_ready": true,"is_live": true},
    {"table_name": "menu_kitchen_routes","index_name": "idx_menu_kitchen_routes_menu","definition": "CREATE INDEX idx_menu_kitchen_routes_menu ON public.menu_kitchen_routes USING btree (menu_item_id)","is_unique": false,"is_primary": false,"is_valid": true,"is_ready": true,"is_live": true},
    {"table_name": "menu_kitchen_routes","index_name": "idx_menu_kitchen_routes_outlet","definition": "CREATE INDEX idx_menu_kitchen_routes_outlet ON public.menu_kitchen_routes USING btree (outlet_id)","is_unique": false,"is_primary": false,"is_valid": true,"is_ready": true,"is_live": true},
    {"table_name": "menu_kitchen_routes","index_name": "menu_kitchen_routes_outlet_id_menu_item_id_key","definition": "CREATE UNIQUE INDEX menu_kitchen_routes_outlet_id_menu_item_id_key ON public.menu_kitchen_routes USING btree (outlet_id, menu_item_id)","is_unique": true,"is_primary": false,"is_valid": true,"is_ready": true,"is_live": true},
    {"table_name": "menu_kitchen_routes","index_name": "menu_kitchen_routes_pkey","definition": "CREATE UNIQUE INDEX menu_kitchen_routes_pkey ON public.menu_kitchen_routes USING btree (id)","is_unique": true,"is_primary": true,"is_valid": true,"is_ready": true,"is_live": true}
  ],
  "functions": [
    {"schema_name": "private","function_name": "enqueue_sale_to_kitchen","signature": "private.enqueue_sale_to_kitchen()","arguments": "","result_type": "trigger","definition_md5": "ed7802c4edc40aa70486d6028dffab7e","body_md5": "0b8a4c02d3654d10ede9e12d23dffcab","security_definer": true,"volatility": "v","is_strict": false,"parallel_mode": "u","leakproof": false,"configuration": ["search_path=\"\""],"language": "plpgsql"},
    {"schema_name": "private","function_name": "recalculate_kitchen_ticket_status","signature": "private.recalculate_kitchen_ticket_status(uuid)","arguments": "p_ticket_id uuid","result_type": "void","definition_md5": "9fae1acd4c29ad7e85567143208d42d6","body_md5": "a9170cfe6fcc50baf653b1da603438f0","security_definer": true,"volatility": "v","is_strict": false,"parallel_mode": "u","leakproof": false,"configuration": ["search_path=\"\""],"language": "plpgsql"},
    {"schema_name": "private","function_name": "sync_sale_cancel_to_kitchen","signature": "private.sync_sale_cancel_to_kitchen()","arguments": "","result_type": "trigger","definition_md5": "5d8c9fd4a46c6d3066d8ffb2579852a3","body_md5": "ca7bbbb6c4b48621df619b4eb5b16a75","security_definer": true,"volatility": "v","is_strict": false,"parallel_mode": "u","leakproof": false,"configuration": ["search_path=\"\""],"language": "plpgsql"},
    {"schema_name": "private","function_name": "sync_sale_item_void_to_kitchen","signature": "private.sync_sale_item_void_to_kitchen()","arguments": "","result_type": "trigger","definition_md5": "a4e582710ff39304454a7925c1f4d240","body_md5": "b35927b542df2bb049b84daefdb3d31f","security_definer": true,"volatility": "v","is_strict": false,"parallel_mode": "u","leakproof": false,"configuration": ["search_path=\"\""],"language": "plpgsql"},
    {"schema_name": "public","function_name": "update_kitchen_item_status","signature": "public.update_kitchen_item_status(uuid, text)","arguments": "p_kitchen_item_id uuid, p_status text","result_type": "uuid","definition_md5": "28ffae11bbf32c557bbb7b00c2228cda","body_md5": "9ef3c717f6261740d2a9d5076c1bd696","security_definer": true,"volatility": "v","is_strict": false,"parallel_mode": "u","leakproof": false,"configuration": ["search_path=\"\""],"language": "plpgsql"},
    {"schema_name": "public","function_name": "update_kitchen_ticket_status","signature": "public.update_kitchen_ticket_status(uuid, text)","arguments": "p_ticket_id uuid, p_status text","result_type": "uuid","definition_md5": "e2783084d1eb7bc5894c48321b89aa0d","body_md5": "527c7f87d5e950b9908e10a0057603bd","security_definer": true,"volatility": "v","is_strict": false,"parallel_mode": "u","leakproof": false,"configuration": ["search_path=\"\""],"language": "plpgsql"}
  ],
  "views": [
    {"view_name": "kitchen_ticket_items_secure","kind": "v","definition": " SELECT ki.id,\n    ki.ticket_id,\n    kt.sale_id,\n    s.sale_no,\n    kt.outlet_id,\n    ki.sale_item_id,\n    ki.menu_item_id,\n    ki.station,\n    ki.menu_code,\n    ki.menu_name,\n    ki.menu_category,\n    ki.quantity,\n    ki.notes,\n    ki.status,\n    ki.started_at,\n    ki.ready_at,\n    ki.completed_at,\n    ki.created_at,\n    ki.updated_at\n   FROM ((kitchen_ticket_items ki\n     JOIN kitchen_tickets kt ON ((kt.id = ki.ticket_id)))\n     JOIN sales s ON ((s.id = kt.sale_id)))\n  WHERE private.can_view_sales_row(kt.outlet_id);","definition_md5": "50a749df1233e058389062b4ea58efe1","options": ["security_barrier=true","security_invoker=false"],"column_names": ["id","ticket_id","sale_id","sale_no","outlet_id","sale_item_id","menu_item_id","station","menu_code","menu_name","menu_category","quantity","notes","status","started_at","ready_at","completed_at","created_at","updated_at"]},
    {"view_name": "kitchen_tickets_secure","kind": "v","definition": " SELECT kt.id,\n    kt.sale_id,\n    s.sale_no,\n    s.sale_date,\n    kt.outlet_id,\n    o.code AS outlet_code,\n    o.name AS outlet_name,\n    kt.source,\n    kt.status,\n    kt.notes,\n    s.payment_method,\n    kt.opened_at,\n    kt.started_at,\n    kt.ready_at,\n    kt.completed_at,\n    kt.created_at,\n    kt.updated_at\n   FROM ((kitchen_tickets kt\n     JOIN sales s ON ((s.id = kt.sale_id)))\n     LEFT JOIN outlets o ON ((o.id = kt.outlet_id)))\n  WHERE private.can_view_sales_row(kt.outlet_id);","definition_md5": "0d181f00f970779a19d2e61eaeab7f4d","options": ["security_barrier=true","security_invoker=false"],"column_names": ["id","sale_id","sale_no","sale_date","outlet_id","outlet_code","outlet_name","source","status","notes","payment_method","opened_at","started_at","ready_at","completed_at","created_at","updated_at"]}
  ],
  "triggers": [
    {"table_name": "sale_items","trigger_name": "trg_sale_item_void_kitchen","definition": "CREATE TRIGGER trg_sale_item_void_kitchen AFTER UPDATE OF line_status ON public.sale_items FOR EACH ROW EXECUTE FUNCTION private.sync_sale_item_void_to_kitchen()","enabled_mode": "O","function_signature": "private.sync_sale_item_void_to_kitchen()"},
    {"table_name": "sales","trigger_name": "trg_sale_cancel_kitchen","definition": "CREATE TRIGGER trg_sale_cancel_kitchen AFTER UPDATE OF status ON public.sales FOR EACH ROW EXECUTE FUNCTION private.sync_sale_cancel_to_kitchen()","enabled_mode": "O","function_signature": "private.sync_sale_cancel_to_kitchen()"},
    {"table_name": "sales","trigger_name": "trg_sales_enqueue_kitchen","definition": "CREATE TRIGGER trg_sales_enqueue_kitchen AFTER INSERT OR UPDATE OF status ON public.sales FOR EACH ROW EXECUTE FUNCTION private.enqueue_sale_to_kitchen()","enabled_mode": "O","function_signature": "private.enqueue_sale_to_kitchen()"}
  ]
}
$kds_historical_manifest$::jsonb as data
),
expected_tables as (
  select x.* from baseline b, jsonb_to_recordset(b.data -> 'tables')
    as x(table_name text, kind text, rls_enabled boolean, rls_forced boolean)
),
expected_columns as (
  select x.* from baseline b, jsonb_to_recordset(b.data -> 'columns')
    as x(table_name text, column_name text, ordinal smallint, data_type text,
      not_null boolean, default_expression text, identity_kind text, generated_kind text)
),
expected_constraints as (
  select x.* from baseline b, jsonb_to_recordset(b.data -> 'constraints')
    as x(table_name text, constraint_name text, kind text, definition text,
      validated boolean, "deferrable" boolean, initially_deferred boolean)
),
expected_indexes as (
  select x.* from baseline b, jsonb_to_recordset(b.data -> 'indexes')
    as x(table_name text, index_name text, definition text, is_unique boolean,
      is_primary boolean, is_valid boolean, is_ready boolean, is_live boolean)
),
expected_functions as (
  select x.* from baseline b, jsonb_to_recordset(b.data -> 'functions')
    as x(schema_name text, function_name text, signature text, arguments text,
      result_type text, definition_md5 text, body_md5 text, security_definer boolean,
      volatility text, is_strict boolean, parallel_mode text, leakproof boolean,
      configuration text[], language text)
),
expected_views as (
  select x.* from baseline b, jsonb_to_recordset(b.data -> 'views')
    as x(view_name text, kind text, definition text, definition_md5 text,
      options text[], column_names text[])
),
expected_triggers as (
  select x.* from baseline b, jsonb_to_recordset(b.data -> 'triggers')
    as x(table_name text, trigger_name text, definition text,
      enabled_mode text, function_signature text)
),
-- All lookups tolerate missing relations/functions. No direct FROM of a KDS
-- relation is used, so a partially migrated database can still be audited.
live_relations as (
  select c.*, n.nspname as schema_name
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
),
live_tables as (
  select c.relname::text as table_name, c.relkind::text as kind,
    c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
  from live_relations c
  where c.relname in (select table_name from expected_tables)
),
live_columns as (
  select c.relname::text as table_name, a.attname::text as column_name,
    a.attnum as ordinal, format_type(a.atttypid, a.atttypmod) as data_type,
    a.attnotnull as not_null, pg_get_expr(d.adbin, d.adrelid, false) as default_expression,
    a.attidentity::text as identity_kind, a.attgenerated::text as generated_kind
  from live_relations c
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
  where c.relname in (select table_name from expected_tables)
),
live_constraints as (
  select c.relname::text as table_name, k.conname::text as constraint_name,
    k.contype::text as kind, pg_get_constraintdef(k.oid, false) as definition,
    k.convalidated as validated, k.condeferrable as "deferrable",
    k.condeferred as initially_deferred
  from live_relations c join pg_constraint k on k.conrelid = c.oid
  where c.relname in (select table_name from expected_tables)
    and k.contype in ('p', 'u', 'f', 'c', 'x')
  -- PostgreSQL 18 catalog NOT NULL constraints are covered by COLUMN rows.
),
live_indexes as (
  select c.relname::text as table_name, i.relname::text as index_name,
    pg_get_indexdef(i.oid) as definition, x.indisunique as is_unique,
    x.indisprimary as is_primary, x.indisvalid as is_valid,
    x.indisready as is_ready, x.indislive as is_live
  from live_relations c join pg_index x on x.indrelid = c.oid
  join pg_class i on i.oid = x.indexrelid
  where c.relname in (select table_name from expected_tables)
    or i.relname in (select index_name from expected_indexes)
),
live_functions as (
  select p.oid, n.nspname::text as schema_name, p.proname::text as function_name,
    format('%I.%I(%s)', n.nspname, p.proname, oidvectortypes(p.proargtypes)) as signature,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as result_type,
    pg_get_functiondef(p.oid) as definition,
    md5(pg_get_functiondef(p.oid)) as definition_md5, md5(p.prosrc) as body_md5,
    p.prosecdef as security_definer, p.provolatile::text as volatility,
    p.proisstrict as is_strict, p.proparallel::text as parallel_mode,
    p.proleakproof as leakproof, p.proconfig as configuration,
    l.lanname::text as language, p.proowner, p.proacl,
    pg_get_userbyid(p.proowner) as owner
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
  where n.nspname in ('public', 'private') and p.prokind in ('f', 'p')
    and (p.proname ~ '(kitchen|kds)' or p.proname in (
      'can_post_location_module', 'can_view_sales_row',
      'can_access_location_module', 'current_role_code', 'is_global_role'
    ))
),
live_views as (
  select c.relname::text as view_name, c.relkind::text as kind,
    case when c.relkind in ('v', 'm') then pg_get_viewdef(c.oid, false) end as definition,
    case when c.relkind in ('v', 'm') then md5(pg_get_viewdef(c.oid, false)) end as definition_md5,
    array(select x from unnest(c.reloptions) x order by x) as options,
    array(select a.attname::text from pg_attribute a where a.attrelid = c.oid
      and a.attnum > 0 and not a.attisdropped order by a.attnum) as column_names
  from live_relations c
  where c.relname in (select view_name from expected_views)
),
live_triggers as (
  select c.relname::text as table_name, t.tgname::text as trigger_name,
    pg_get_triggerdef(t.oid, false) as definition, t.tgenabled::text as enabled_mode,
    format('%I.%I(%s)', pn.nspname, p.proname, oidvectortypes(p.proargtypes)) as function_signature,
    pg_get_functiondef(p.oid) as function_definition
  from pg_trigger t
  join live_relations c on c.oid = t.tgrelid
  join pg_proc p on p.oid = t.tgfoid
  join pg_namespace pn on pn.oid = p.pronamespace
  where not t.tgisinternal
    and (c.relname in ('sales', 'sale_items')
      or c.relname in (select table_name from expected_tables)
      or c.relname ~ '(kitchen|kds)')
),
historical_rows as (
  select '10_HISTORICAL_OBJECTS'::text as section, 'TABLE_RLS'::text as object_type,
    'public.' || e.table_name as object_name,
    case when c.table_name is null then 'MISSING'
      when to_jsonb(c) = to_jsonb(e) then 'EXACT' else 'PRESENT_BUT_EVOLVED' end as status,
    to_jsonb(e) as expected_details, to_jsonb(c) as current_details,
    null::text as current_definition,
    'Table kind, RLS ENABLED and NO FORCE compared. Columns/constraints/indexes/ACLs/policies have separate rows.'::text as review_note
  from expected_tables e left join live_tables c using (table_name)
  union all
  select '10_HISTORICAL_OBJECTS', 'COLUMN', 'public.' || e.table_name || '.' || e.column_name,
    case when c.column_name is null then 'MISSING'
      when to_jsonb(c) = to_jsonb(e) then 'EXACT' else 'PRESENT_BUT_EVOLVED' end,
    to_jsonb(e), to_jsonb(c), c.default_expression,
    'Compares type/length, ordinal, nullability, default, identity and generated properties. Extra columns are reported separately.'
  from expected_columns e left join live_columns c using (table_name, column_name)
  union all
  select '10_HISTORICAL_OBJECTS', 'CONSTRAINT', 'public.' || e.table_name || '.' || e.constraint_name,
    case when c.constraint_name is null then 'MISSING'
      when to_jsonb(c) = to_jsonb(e) then 'EXACT' else 'PRESENT_BUT_EVOLVED' end,
    to_jsonb(e), to_jsonb(c), c.definition,
    'Includes PK/UNIQUE/CHECK/FK, referenced columns, delete/update actions, validation and deferral. A renamed equivalent may appear as ADDITIONAL_CONSTRAINT.'
  from expected_constraints e left join live_constraints c using (table_name, constraint_name)
  union all
  select '10_HISTORICAL_OBJECTS', 'INDEX', 'public.' || e.index_name,
    case when c.index_name is null then 'MISSING'
      when to_jsonb(c) = to_jsonb(e) then 'EXACT' else 'PRESENT_BUT_EVOLVED' end,
    to_jsonb(e), to_jsonb(c), c.definition,
    'Covers six explicit indexes and six PK/UNIQUE backing indexes; compares table, keys/order, uniqueness and valid/ready/live state.'
  from expected_indexes e left join live_indexes c using (index_name)
  union all
  select '10_HISTORICAL_OBJECTS', 'FUNCTION', e.signature,
    case when c.oid is null then 'MISSING'
      when c.definition_md5 = e.definition_md5 and c.body_md5 = e.body_md5
        then 'EXACT' else 'PRESENT_BUT_EVOLVED' end,
    to_jsonb(e), to_jsonb(c) - 'definition' - 'oid' - 'proowner' - 'proacl', c.definition,
    'Exact canonical definition/body fingerprint; signature/argument names, return type, SECURITY DEFINER and fixed search_path are included. ACLs and owner suitability need separate review; formatting/version differences may be harmless.'
  from expected_functions e left join live_functions c using (signature)
  union all
  select '10_HISTORICAL_OBJECTS', 'VIEW', 'public.' || e.view_name,
    case when c.view_name is null then 'MISSING'
      when to_jsonb(c) = to_jsonb(e) then 'EXACT' else 'PRESENT_BUT_EVOLVED' end,
    to_jsonb(e), to_jsonb(c) - 'definition', c.definition,
    'Compares definition, column names/order and view options including security_barrier=true/security_invoker=false. This is the old name only, not a demand to recreate it.'
  from expected_views e left join live_views c using (view_name)
  union all
  select '10_HISTORICAL_OBJECTS', 'TRIGGER', 'public.' || e.table_name || '.' || e.trigger_name,
    case when c.trigger_name is null then 'MISSING'
      when to_jsonb(c) - 'function_definition' = to_jsonb(e)
        then 'EXACT' else 'PRESENT_BUT_EVOLVED' end,
    to_jsonb(e), to_jsonb(c) - 'definition' - 'function_definition', c.definition,
    'Compares timing/events/UPDATE OF columns/row level/WHEN/called function/enabled mode. Read the separate function row and all extra sale triggers before assessing equivalent behavior.'
  from expected_triggers e left join live_triggers c using (table_name, trigger_name)
),
expected_grants as (
  select 'relation'::text as kind, 'public.' || t.table_name as object_name,
    r.principal, 'ALL_REVOKED'::text as privilege
  from expected_tables t cross join (values ('anon'), ('authenticated')) r(principal)
  union all
  select 'relation', 'public.' || v.view_name, r.principal, r.privilege
  from expected_views v cross join (values
    ('PUBLIC', 'ALL_REVOKED'), ('anon', 'ALL_REVOKED'), ('authenticated', 'SELECT')
  ) r(principal, privilege)
  union all
  select 'function', f.signature, r.principal, r.privilege
  from expected_functions f cross join (values
    ('PUBLIC', 'ALL_REVOKED'), ('anon', 'ALL_REVOKED'), ('authenticated', 'EXECUTE')
  ) r(principal, privilege)
  where f.schema_name = 'public'
),
grant_observations as (
  select e.*, c.oid as relation_oid, f.oid as function_oid, r.oid as role_oid,
    case
      when e.kind = 'relation' and c.oid is null then null
      when e.kind = 'function' and f.oid is null then null
      when e.principal <> 'PUBLIC' and r.oid is null then null
      when e.kind = 'relation' and e.principal = 'PUBLIC' then
        exists (select 1 from aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
          where a.grantee = 0)
        or exists (select 1 from pg_attribute col, lateral aclexplode(col.attacl) a
          where col.attrelid = c.oid and col.attnum > 0 and not col.attisdropped and a.grantee = 0)
      when e.kind = 'relation' and e.privilege = 'ALL_REVOKED' then
        exists (select 1 from aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
          where has_table_privilege(r.oid, c.oid, a.privilege_type))
        or has_any_column_privilege(r.oid, c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')
      when e.kind = 'relation' then has_table_privilege(r.oid, c.oid, 'SELECT')
      when e.principal = 'PUBLIC' then
        exists (select 1 from aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) a
          where a.grantee = 0)
      else has_function_privilege(r.oid, f.oid, 'EXECUTE')
    end as observed_privilege
  from expected_grants e
  left join live_relations c on e.kind = 'relation' and 'public.' || c.relname = e.object_name
  left join live_functions f on e.kind = 'function' and f.signature = e.object_name
  left join pg_roles r on r.rolname = e.principal
),
grant_rows as (
  select '11_HISTORICAL_SECURITY'::text as section, 'GRANT'::text as object_type,
    object_name || ' -> ' || principal || ' (' || privilege || ')' as object_name,
    case when observed_privilege is null then 'MISSING'
      when observed_privilege = (privilege <> 'ALL_REVOKED') then 'EXACT'
      else 'PRESENT_BUT_EVOLVED' end as status,
    jsonb_build_object('principal', principal, 'privilege', privilege,
      'expected_privilege_present', privilege <> 'ALL_REVOKED') as expected_details,
    jsonb_build_object('object_exists', coalesce(relation_oid, function_oid) is not null,
      'role_exists', principal = 'PUBLIC' or role_oid is not null,
      'observed_privilege_present', observed_privilege) as current_details,
    null::text as current_definition,
    'Effective permissions include PUBLIC/inherited/column access where relevant. Additional ACLs, grant options and private schema USAGE appear in security evidence; the historical SQL did not specify all of them.'::text as review_note
  from grant_observations
),
parent_column_expectations as (
  select * from (values
    ('outlets', 'id'), ('outlets', 'code'), ('outlets', 'name'),
    ('menu_items', 'id'), ('menu_items', 'code'), ('menu_items', 'name'), ('menu_items', 'category'),
    ('sales', 'id'), ('sales', 'outlet_id'), ('sales', 'status'), ('sales', 'notes'),
    ('sales', 'sale_no'), ('sales', 'sale_date'), ('sales', 'payment_method'),
    ('sale_items', 'id'), ('sale_items', 'sale_id'), ('sale_items', 'menu_item_id'),
    ('sale_items', 'quantity'), ('sale_items', 'notes'), ('sale_items', 'line_status')
  ) x(table_name, column_name)
),
auth_expectations as (
  select * from (values
    ('can_post_location_module', 'DIRECT_REQUIRED',
      'private.can_post_location_module(''POS'', <outlet uuid>) in both status RPCs'),
    ('can_view_sales_row', 'DIRECT_REQUIRED',
      'private.can_view_sales_row(<outlet uuid>) in both secure views'),
    ('can_access_location_module', 'CONTEXT_REVIEW', 'Possible transitive legacy authorization dependency'),
    ('current_role_code', 'CONTEXT_REVIEW', 'Possible transitive role lookup; not created by this migration'),
    ('is_global_role', 'CONTEXT_REVIEW', 'Possible transitive scope bypass; not created by this migration')
  ) x(function_name, requirement, historical_call)
),
dependency_rows as (
  select '20_DEPENDENCIES'::text as section, 'PARENT_TABLE'::text as object_type,
    'public.' || e.table_name as object_name,
    case when c.oid is null then 'MISSING' else 'PRESENT_UNBASELINED' end as status,
    jsonb_build_object('requirement', 'DIRECT_REQUIRED', 'expected_kind', 'table') as expected_details,
    jsonb_build_object('exists', c.oid is not null, 'kind', c.relkind,
      'owner', pg_get_userbyid(c.relowner)) as current_details,
    null::text as current_definition,
    'Pre-existing dependency, not created by the migration. Review wrong relation kinds/types; existence alone does not prove compatibility.'::text as review_note
  from (select distinct table_name from parent_column_expectations) e
  left join live_relations c on c.relname = e.table_name
  union all
  select '20_DEPENDENCIES', 'PARENT_COLUMN', 'public.' || e.table_name || '.' || e.column_name,
    case when a.attname is null then 'MISSING' else 'PRESENT_UNBASELINED' end,
    jsonb_build_object('requirement', 'DIRECT_REQUIRED'),
    jsonb_build_object('exists', a.attname is not null, 'data_type', format_type(a.atttypid, a.atttypmod),
      'not_null', a.attnotnull), null,
    'The old SQL references this column but does not define its type. Check compatibility against current functions/views; no fixture type is asserted.'
  from parent_column_expectations e
  left join live_relations c on c.relname = e.table_name
  left join pg_attribute a on a.attrelid = c.oid and a.attname = e.column_name
    and a.attnum > 0 and not a.attisdropped
  union all
  select '20_DEPENDENCIES', 'AUTH_HELPER',
    coalesce(f.signature, 'private.' || e.function_name || ' (all overloads)'),
    case when f.oid is null then 'MISSING' else 'PRESENT_UNBASELINED' end,
    jsonb_build_object('requirement', e.requirement, 'historical_call', e.historical_call),
    to_jsonb(f) - 'definition' - 'oid' - 'proowner' - 'proacl', f.definition,
    'Helper is inspected, never executed. Its source is not in the historical migration: verify boolean return, callable argument/default/overload resolution and active-user/outlet scope. Names alone cannot prove authorization equivalence.'
  from auth_expectations e left join live_functions f
    on f.schema_name = 'private' and f.function_name = e.function_name
),
current_app_expectations as (
  select * from (values
    ('view', 'kitchen_tickets_kds_v2_secure'),
    ('view', 'kitchen_ticket_items_kds_v3_secure'),
    ('view', 'kitchen_ticket_item_units_kds_v1_secure'),
    ('function', 'update_kitchen_item_unit_status_v1'),
    ('view', 'restaurant_order_kds_status_secure'),
    ('view', 'menu_kitchen_routes_secure')
  ) x(kind, object_name)
),
current_app_rows as (
  select '30_CURRENT_APP_KDS'::text as section, 'NEWER_' || upper(e.kind) as object_type,
    coalesce(f.signature, 'public.' || e.object_name) as object_name,
    case when coalesce(c.oid, f.oid) is null then 'MISSING' else 'PRESENT_UNBASELINED' end as status,
    jsonb_build_object('referenced_by_checkpoint', '836391d', 'kind', e.kind) as expected_details,
    case when e.kind = 'view' then jsonb_build_object('kind', c.relkind,
      'view_options', c.reloptions, 'owner', pg_get_userbyid(c.relowner))
      else to_jsonb(f) - 'definition' - 'oid' - 'proowner' - 'proacl' end as current_details,
    case when e.kind = 'view' and c.relkind in ('v', 'm') then pg_get_viewdef(c.oid, false)
      when e.kind = 'function' then f.definition end as current_definition,
    'Current application reference, NOT defined by the old migration. A present object is only a supersession candidate; review its logic, callers, authorization and grants. Missing does not authorize restoration of v1.'::text as review_note
  from current_app_expectations e
  left join live_relations c on e.kind = 'view' and c.relname = e.object_name
  left join live_functions f on e.kind = 'function' and f.schema_name = 'public'
    and f.function_name = e.object_name
),
additional_rows as (
  select '40_ADDITIONAL_LIVE_OBJECTS'::text as section, 'ADDITIONAL_COLUMN'::text as object_type,
    'public.' || c.table_name || '.' || c.column_name as object_name,
    'PRESENT_BUT_EVOLVED'::text as status, null::jsonb as expected_details,
    to_jsonb(c) as current_details, c.default_expression as current_definition,
    'Additional to the historical table definition; preserve and review compatibility.'::text as review_note
  from live_columns c where not exists (
    select 1 from expected_columns e where (e.table_name, e.column_name) = (c.table_name, c.column_name))
  union all
  select '40_ADDITIONAL_LIVE_OBJECTS', 'ADDITIONAL_CONSTRAINT',
    'public.' || c.table_name || '.' || c.constraint_name, 'PRESENT_BUT_EVOLVED', null,
    to_jsonb(c), c.definition,
    'May replace a missing historical constraint under a different name, or add a new rule. Compare the full definition; never add an old constraint automatically.'
  from live_constraints c where not exists (
    select 1 from expected_constraints e where (e.table_name, e.constraint_name) = (c.table_name, c.constraint_name))
  union all
  select '40_ADDITIONAL_LIVE_OBJECTS', 'ADDITIONAL_INDEX', 'public.' || c.index_name,
    'PRESENT_BUT_EVOLVED', null, to_jsonb(c), c.definition,
    'May be a renamed/replacement index. Review validity, keys and uniqueness before concluding the old index is unrepresented.'
  from live_indexes c where not exists (select 1 from expected_indexes e where e.index_name = c.index_name)
  union all
  select '40_ADDITIONAL_LIVE_OBJECTS', 'ADDITIONAL_TRIGGER',
    'public.' || c.table_name || '.' || c.trigger_name, 'PRESENT_UNBASELINED', null,
    to_jsonb(c) - 'definition' - 'function_definition',
    c.definition || E'\n\n-- Current called function:\n' || c.function_definition,
    'Includes ALL extra non-internal triggers on sales/sale_items and KDS tables. Review enqueue/void/cancel timing, order of triggers and duplicates; some are unrelated pre-existing business triggers.'
  from live_triggers c where not exists (
    select 1 from expected_triggers e where (e.table_name, e.trigger_name) = (c.table_name, c.trigger_name))
  union all
  select '40_ADDITIONAL_LIVE_OBJECTS', 'ADDITIONAL_FUNCTION', f.signature,
    'PRESENT_UNBASELINED', null, to_jsonb(f) - 'definition' - 'oid' - 'proowner' - 'proacl', f.definition,
    'Additional KDS/kitchen routine or overload. Inspect as a possible superseding path; its existence alone does not cover a missing v1 function.'
  from live_functions f where f.function_name ~ '(kitchen|kds)'
    and not exists (select 1 from expected_functions e where e.signature = f.signature)
    and not exists (select 1 from current_app_expectations e where e.kind = 'function'
      and f.schema_name = 'public' and e.object_name = f.function_name)
  union all
  select '40_ADDITIONAL_LIVE_OBJECTS', 'ADDITIONAL_RELATION', 'public.' || c.relname,
    'PRESENT_UNBASELINED', null,
    jsonb_build_object('kind', c.relkind, 'owner', pg_get_userbyid(c.relowner),
      'rls_enabled', c.relrowsecurity, 'rls_forced', c.relforcerowsecurity, 'options', c.reloptions,
      'columns', (select jsonb_agg(jsonb_build_object('name', a.attname,
        'type', format_type(a.atttypid, a.atttypmod), 'not_null', a.attnotnull)
        order by a.attnum) from pg_attribute a where a.attrelid = c.oid
        and a.attnum > 0 and not a.attisdropped)),
    case when c.relkind in ('v', 'm') then pg_get_viewdef(c.oid, false) end,
    'Additional KDS/kitchen table or view. Preserve newer unit/order objects; a human must map their behavior to historical responsibilities.'
  from live_relations c where c.relname ~ '(kitchen|kds)' and c.relkind in ('r', 'p', 'v', 'm')
    and not exists (select 1 from expected_tables e where e.table_name = c.relname)
    and not exists (select 1 from expected_views e where e.view_name = c.relname)
    and not exists (select 1 from current_app_expectations e where e.kind = 'view' and e.object_name = c.relname)
),
security_relations as (
  select c.* from live_relations c
  where c.relkind in ('r', 'p', 'v', 'm')
    and (c.relname ~ '(kitchen|kds)' or c.relname in (select table_name from expected_tables))
),
security_rows as (
  select '50_SECURITY_EVIDENCE'::text as section, 'RELATION_ACL_OWNER'::text as object_type,
    'public.' || c.relname as object_name, 'PRESENT_UNBASELINED'::text as status,
    null::jsonb as expected_details,
    jsonb_build_object('owner', pg_get_userbyid(c.relowner), 'kind', c.relkind,
      'owner_superuser', r.rolsuper, 'owner_bypassrls', r.rolbypassrls,
      'rls_enabled', c.relrowsecurity, 'rls_forced', c.relforcerowsecurity,
      'view_options', c.reloptions,
      'acl', (select jsonb_agg(jsonb_build_object(
        'grantee', case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee)::text end,
        'grantor', pg_get_userbyid(a.grantor), 'privilege', a.privilege_type,
        'grantable', a.is_grantable))
        from aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a),
      'column_acl', (select jsonb_agg(jsonb_build_object('column', col.attname, 'acl', col.attacl::text))
        from pg_attribute col where col.attrelid = c.oid and col.attnum > 0
          and not col.attisdropped and col.attacl is not null),
      'policy_count', (select count(*) from pg_policy p where p.polrelid = c.oid)) as current_details,
    null::text as current_definition,
    'Full ACLs incl. PUBLIC/service_role/other roles and column grants. Old raw-table REVOKEs targeted anon/authenticated only; owner-bypassing secure views require their explicit authorization predicates.'::text as review_note
  from security_relations c left join pg_roles r on r.oid = c.relowner
  union all
  select '50_SECURITY_EVIDENCE', 'POLICY', 'public.' || c.relname || '.' || p.polname,
    'PRESENT_UNBASELINED', null,
    jsonb_build_object('permissive', p.polpermissive, 'command', p.polcmd,
      'roles', array(select case when x = 0 then 'PUBLIC' else pg_get_userbyid(x)::text end
        from unnest(p.polroles) x),
      'using', pg_get_expr(p.polqual, p.polrelid, false),
      'with_check', pg_get_expr(p.polwithcheck, p.polrelid, false)),
    concat('USING: ', pg_get_expr(p.polqual, p.polrelid, false),
      E'\nWITH CHECK: ', pg_get_expr(p.polwithcheck, p.polrelid, false)),
    'Historical migration creates/drops no policies. Review this policy with ACLs and RLS flags; never reset policies merely to resemble a fresh historical fixture.'
  from security_relations c join pg_policy p on p.polrelid = c.oid
  union all
  select '50_SECURITY_EVIDENCE', 'FUNCTION_ACL_OWNER', f.signature, 'PRESENT_UNBASELINED', null,
    jsonb_build_object('owner', f.owner, 'owner_superuser', r.rolsuper,
      'owner_bypassrls', r.rolbypassrls, 'security_definer', f.security_definer,
      'configuration', f.configuration,
      'acl', (select jsonb_agg(jsonb_build_object(
        'grantee', case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee)::text end,
        'grantor', pg_get_userbyid(a.grantor), 'privilege', a.privilege_type,
        'grantable', a.is_grantable))
        from aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) a)), null,
    'Review owner suitability, definer search_path and execute grants. Historical SQL explicitly changes EXECUTE only on the two public status RPCs; private-function grants are not baselined.'
  from live_functions f left join pg_roles r on r.oid = f.proowner
  union all
  select '50_SECURITY_EVIDENCE', 'SCHEMA_USAGE', e.schema_name || ' -> ' || e.role_name,
    case when n.oid is null or r.oid is null then 'MISSING' else 'PRESENT_UNBASELINED' end,
    null, jsonb_build_object('schema_exists', n.oid is not null, 'role_exists', r.oid is not null,
      'effective_usage', has_schema_privilege(r.oid, n.oid, 'USAGE'),
      'effective_create', has_schema_privilege(r.oid, n.oid, 'CREATE')), null,
    'Schema privileges are pre-existing dependencies, not set by the migration. Review with table/function ACLs; no application routine is called.'
  from (select s.schema_name, r.role_name
    from (values ('public'), ('private')) s(schema_name)
    cross join (values ('anon'), ('authenticated'), ('service_role')) r(role_name)) e
  left join pg_namespace n on n.nspname = e.schema_name
  left join pg_roles r on r.rolname = e.role_name
),
view_dependency_rows as (
  select distinct '60_CATALOG_DEPENDENCIES'::text as section,
    'VIEW_DEPENDENCY'::text as object_type, 'public.' || c.relname as object_name,
    'PRESENT_UNBASELINED'::text as status, null::jsonb as expected_details,
    jsonb_build_object('depends_on', pg_describe_object(d.refclassid, d.refobjid, d.refobjsubid),
      'dependency_type', d.deptype) as current_details,
    null::text as current_definition,
    'Recorded view dependency. PL/pgSQL dynamic/body references are not reliably captured in pg_depend; inspect returned function definitions too.'::text as review_note
  from security_relations c join pg_rewrite rw on rw.ev_class = c.oid
  join pg_depend d on d.classid = 'pg_rewrite'::regclass and d.objid = rw.oid
  where c.relkind in ('v', 'm')
    and not (d.refclassid = 'pg_class'::regclass and d.refobjid = c.oid)
),
evidence as (
  select * from historical_rows
  union all select * from grant_rows
  union all select * from dependency_rows
  union all select * from current_app_rows
  union all select * from additional_rows
  union all select * from security_rows
  union all select * from view_dependency_rows
),
summary as (
  select '00_SUMMARY'::text as section, 'RECONCILIATION_ASSESSMENT'::text as object_type,
    '20260926130000_kds_v1_foundation'::text as object_name,
    case
      when exists (select 1 from historical_rows where status <> 'EXACT')
        or exists (select 1 from grant_rows where status <> 'EXACT')
        then 'HUMAN_REVIEW_REQUIRED_MISSING_OR_EVOLVED'
      when exists (select 1 from dependency_rows where status = 'MISSING'
        and expected_details ->> 'requirement' = 'DIRECT_REQUIRED')
        then 'HUMAN_REVIEW_REQUIRED_DEPENDENCIES'
      when exists (select 1 from current_app_rows where status = 'MISSING')
        then 'HISTORICAL_MATCH_CURRENT_APP_REVIEW_REQUIRED'
      else 'HISTORICAL_MATCH_LEDGER_ONLY_REVIEW_CANDIDATE'
    end as status,
    jsonb_build_object('migration_version', b.data ->> 'migration_version',
      'source_sha256', b.data ->> 'source_sha256',
      'reference_postgres_version', b.data ->> 'reference_postgres_version',
      'tables', 3, 'columns', 35, 'constraints', 19, 'indexes_including_backing', 12,
      'functions', 6, 'views', 2, 'triggers', 3, 'explicit_grant_expectations', 18) as expected_details,
    jsonb_build_object('audit_timestamp', transaction_timestamp(),
      'database', current_database(), 'auditor', current_user,
      'postgres_version', current_setting('server_version'),
      'transaction_read_only', current_setting('transaction_read_only'),
      'historical_exact', (select count(*) from historical_rows where status = 'EXACT'),
      'historical_missing', (select count(*) from historical_rows where status = 'MISSING'),
      'historical_evolved', (select count(*) from historical_rows where status = 'PRESENT_BUT_EVOLVED'),
      'grant_differences', (select count(*) from grant_rows where status <> 'EXACT'),
      'required_dependencies_missing', (select count(*) from dependency_rows
        where status = 'MISSING' and expected_details ->> 'requirement' = 'DIRECT_REQUIRED'),
      'current_app_references_missing', (select count(*) from current_app_rows where status = 'MISSING'),
      'additional_object_rows', (select count(*) from additional_rows),
      'policy_rows_to_review', (select count(*) from security_rows where object_type = 'POLICY'),
      'migration_ledger_relation_exists', to_regclass('supabase_migrations.schema_migrations') is not null,
      'remote_ledger_entry_verified_by_this_query', false) as current_details,
    null::text as current_definition,
    'EVIDENCE ONLY: no automatic APPLIED verdict and no history write. Review every evolved/missing object, newer path, authorization overload, owner, ACL and extra sale trigger. Confirm enqueue/status/void/cancel behavior and the ledger separately before approving a ledger-only reconciliation. Never replay old SQL as an automatic remedy.'::text as review_note
  from baseline b
)
select * from summary
union all
select * from evidence
order by section, object_type, object_name;

commit;
