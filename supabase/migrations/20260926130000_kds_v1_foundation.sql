-- ============================================================
-- TARATECH / RESTAURANT OPS
-- KDS V1 FOUNDATION
--
-- Flow:
-- POS POSTED SALE
--   -> Kitchen Ticket
--   -> Kitchen Ticket Items
--   -> NEW / PREPARING / READY / COMPLETED
--
-- Current permission bridge:
-- KDS temporarily follows POS location permissions.
-- Dedicated KDS permission can be separated later.
-- ============================================================

begin;


-- ============================================================
-- 1. MENU -> PREPARATION STATION ROUTING
-- ============================================================

create table if not exists public.menu_kitchen_routes
(
  id uuid primary key default gen_random_uuid(),

  outlet_id uuid not null
    references public.outlets(id)
    on delete cascade,

  menu_item_id uuid not null
    references public.menu_items(id)
    on delete cascade,

  station varchar(30) not null
    default 'KITCHEN'
    check (
      station in (
        'KITCHEN',
        'BAR'
      )
    ),

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    outlet_id,
    menu_item_id
  )
);


create index if not exists
  idx_menu_kitchen_routes_outlet
on public.menu_kitchen_routes(outlet_id);

create index if not exists
  idx_menu_kitchen_routes_menu
on public.menu_kitchen_routes(menu_item_id);



-- ============================================================
-- 2. KITCHEN TICKET HEADER
-- ============================================================

create table if not exists public.kitchen_tickets
(
  id uuid primary key default gen_random_uuid(),

  sale_id uuid not null unique
    references public.sales(id)
    on delete cascade,

  outlet_id uuid not null
    references public.outlets(id)
    on delete restrict,

  source varchar(30) not null
    default 'POS'
    check (
      source in (
        'POS',
        'WAITER',
        'QR'
      )
    ),

  status varchar(30) not null
    default 'NEW'
    check (
      status in (
        'NEW',
        'PREPARING',
        'PARTIAL_READY',
        'READY',
        'COMPLETED',
        'CANCELLED'
      )
    ),

  notes text,

  opened_at timestamptz not null default now(),
  started_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists
  idx_kitchen_tickets_outlet_status
on public.kitchen_tickets(
  outlet_id,
  status
);

create index if not exists
  idx_kitchen_tickets_created
on public.kitchen_tickets(created_at desc);



-- ============================================================
-- 3. KITCHEN TICKET ITEMS
-- ============================================================

create table if not exists public.kitchen_ticket_items
(
  id uuid primary key default gen_random_uuid(),

  ticket_id uuid not null
    references public.kitchen_tickets(id)
    on delete cascade,

  sale_item_id uuid not null unique
    references public.sale_items(id)
    on delete cascade,

  menu_item_id uuid not null
    references public.menu_items(id)
    on delete restrict,

  station varchar(30) not null
    default 'KITCHEN'
    check (
      station in (
        'KITCHEN',
        'BAR'
      )
    ),

  menu_code varchar,
  menu_name varchar not null,
  menu_category varchar,

  quantity numeric not null
    check (quantity > 0),

  notes text,

  status varchar(30) not null
    default 'NEW'
    check (
      status in (
        'NEW',
        'PREPARING',
        'READY',
        'COMPLETED',
        'CANCELLED'
      )
    ),

  started_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists
  idx_kitchen_ticket_items_ticket
on public.kitchen_ticket_items(ticket_id);

create index if not exists
  idx_kitchen_ticket_items_station_status
on public.kitchen_ticket_items(
  station,
  status
);



-- ============================================================
-- 4. RLS
-- ============================================================

alter table public.menu_kitchen_routes
  enable row level security;

alter table public.kitchen_tickets
  enable row level security;

alter table public.kitchen_ticket_items
  enable row level security;


alter table public.menu_kitchen_routes
  no force row level security;

alter table public.kitchen_tickets
  no force row level security;

alter table public.kitchen_ticket_items
  no force row level security;



-- ============================================================
-- 5. RAW BROWSER ACCESS CLOSED
-- ============================================================

revoke all privileges
on table public.menu_kitchen_routes
from authenticated, anon;

revoke all privileges
on table public.kitchen_tickets
from authenticated, anon;

revoke all privileges
on table public.kitchen_ticket_items
from authenticated, anon;



-- ============================================================
-- 6. AUTO CREATE KITCHEN TICKET
--
-- Triggered when sale becomes POSTED.
--
-- IMPORTANT:
-- POS code does NOT need to create KDS manually.
-- ============================================================

create or replace function private.enqueue_sale_to_kitchen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$

declare
  v_ticket_id uuid;

begin

  if new.status <> 'POSTED' then
    return new;
  end if;


  if tg_op = 'UPDATE'
     and old.status = 'POSTED' then

    return new;

  end if;


  -- --------------------------------------------------------
  -- HEADER
  -- --------------------------------------------------------

  insert into public.kitchen_tickets
  (
    sale_id,
    outlet_id,
    source,
    status,
    notes
  )

  values
  (
    new.id,
    new.outlet_id,
    'POS',
    'NEW',
    new.notes
  )

  on conflict (sale_id)
  do update
  set
    sale_id = excluded.sale_id

  returning id
  into v_ticket_id;


  -- --------------------------------------------------------
  -- ITEMS
  --
  -- Route:
  -- explicit menu route -> BAR/KITCHEN
  -- otherwise KITCHEN
  -- --------------------------------------------------------

  insert into public.kitchen_ticket_items
  (
    ticket_id,
    sale_item_id,
    menu_item_id,

    station,

    menu_code,
    menu_name,
    menu_category,

    quantity,
    notes,

    status
  )

  select
    v_ticket_id,

    si.id,
    si.menu_item_id,

    coalesce(
      mkr.station,
      'KITCHEN'
    ),

    mi.code,
    mi.name,
    mi.category,

    si.quantity,
    si.notes,

    'NEW'

  from public.sale_items si

  join public.menu_items mi
    on mi.id = si.menu_item_id

  left join public.menu_kitchen_routes mkr
    on mkr.outlet_id = new.outlet_id
   and mkr.menu_item_id = si.menu_item_id
   and mkr.is_active = true

  where si.sale_id = new.id
    and si.line_status = 'ACTIVE'

  on conflict (sale_item_id)
  do nothing;


  return new;

end;

$function$;



drop trigger if exists
  trg_sales_enqueue_kitchen
on public.sales;


create trigger trg_sales_enqueue_kitchen

after insert or update of status
on public.sales

for each row

execute function
  private.enqueue_sale_to_kitchen();



-- ============================================================
-- 7. RECALCULATE TICKET HEADER STATUS
-- ============================================================

create or replace function private.recalculate_kitchen_ticket_status(
  p_ticket_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$

declare
  v_total integer;
  v_new integer;
  v_preparing integer;
  v_ready integer;
  v_completed integer;

begin

  select
    count(*) filter (
      where status <> 'CANCELLED'
    ),

    count(*) filter (
      where status = 'NEW'
    ),

    count(*) filter (
      where status = 'PREPARING'
    ),

    count(*) filter (
      where status = 'READY'
    ),

    count(*) filter (
      where status = 'COMPLETED'
    )

  into
    v_total,
    v_new,
    v_preparing,
    v_ready,
    v_completed

  from public.kitchen_ticket_items

  where ticket_id = p_ticket_id;


  update public.kitchen_tickets

  set

    status =
      case

        when v_total = 0
          then 'CANCELLED'

        when v_completed = v_total
          then 'COMPLETED'

        when (v_ready + v_completed) = v_total
          then 'READY'

        when v_ready > 0
          or v_completed > 0
          then 'PARTIAL_READY'

        when v_preparing > 0
          then 'PREPARING'

        else 'NEW'

      end,

    started_at =
      case
        when v_preparing > 0
          or v_ready > 0
          or v_completed > 0
        then coalesce(
          started_at,
          now()
        )
        else started_at
      end,

    ready_at =
      case
        when (v_ready + v_completed) = v_total
         and v_total > 0
        then coalesce(
          ready_at,
          now()
        )
        else ready_at
      end,

    completed_at =
      case
        when v_completed = v_total
         and v_total > 0
        then coalesce(
          completed_at,
          now()
        )
        else completed_at
      end,

    updated_at = now()

  where id = p_ticket_id;

end;

$function$;



-- ============================================================
-- 8. UPDATE INDIVIDUAL KITCHEN ITEM
-- ============================================================

create or replace function public.update_kitchen_item_status(
  p_kitchen_item_id uuid,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$

declare
  v_item record;
  v_status text;

begin

  v_status :=
    upper(
      trim(
        coalesce(
          p_status,
          ''
        )
      )
    );


  if v_status not in (
    'NEW',
    'PREPARING',
    'READY',
    'COMPLETED',
    'CANCELLED'
  ) then

    raise exception
      'Kitchen status tidak valid';

  end if;


  select
    ki.id,
    ki.ticket_id,
    kt.outlet_id

  into v_item

  from public.kitchen_ticket_items ki

  join public.kitchen_tickets kt
    on kt.id = ki.ticket_id

  where ki.id = p_kitchen_item_id

  for update of ki;


  if not found then
    raise exception
      'Kitchen item tidak ditemukan';
  end if;


  -- V1:
  -- KDS follows POS posting/location permission.
  if not private.can_post_location_module(
    'POS',
    v_item.outlet_id
  ) then

    raise exception
      'Unauthorized kitchen operation';

  end if;


  update public.kitchen_ticket_items

  set
    status = v_status,

    started_at =
      case
        when v_status = 'PREPARING'
        then coalesce(
          started_at,
          now()
        )
        else started_at
      end,

    ready_at =
      case
        when v_status = 'READY'
        then coalesce(
          ready_at,
          now()
        )
        else ready_at
      end,

    completed_at =
      case
        when v_status = 'COMPLETED'
        then coalesce(
          completed_at,
          now()
        )
        else completed_at
      end,

    updated_at = now()

  where id = p_kitchen_item_id;


  perform
    private.recalculate_kitchen_ticket_status(
      v_item.ticket_id
    );


  return p_kitchen_item_id;

end;

$function$;



-- ============================================================
-- 9. BULK UPDATE WHOLE TICKET
-- ============================================================

create or replace function public.update_kitchen_ticket_status(
  p_ticket_id uuid,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$

declare
  v_ticket record;
  v_status text;

begin

  v_status :=
    upper(
      trim(
        coalesce(
          p_status,
          ''
        )
      )
    );


  if v_status not in (
    'NEW',
    'PREPARING',
    'READY',
    'COMPLETED',
    'CANCELLED'
  ) then

    raise exception
      'Kitchen status tidak valid';

  end if;


  select
    id,
    outlet_id

  into v_ticket

  from public.kitchen_tickets

  where id = p_ticket_id

  for update;


  if not found then
    raise exception
      'Kitchen ticket tidak ditemukan';
  end if;


  if not private.can_post_location_module(
    'POS',
    v_ticket.outlet_id
  ) then

    raise exception
      'Unauthorized kitchen operation';

  end if;


  update public.kitchen_ticket_items

  set
    status = v_status,

    started_at =
      case
        when v_status = 'PREPARING'
        then coalesce(
          started_at,
          now()
        )
        else started_at
      end,

    ready_at =
      case
        when v_status = 'READY'
        then coalesce(
          ready_at,
          now()
        )
        else ready_at
      end,

    completed_at =
      case
        when v_status = 'COMPLETED'
        then coalesce(
          completed_at,
          now()
        )
        else completed_at
      end,

    updated_at = now()

  where ticket_id = p_ticket_id
    and status <> 'CANCELLED';


  perform
    private.recalculate_kitchen_ticket_status(
      p_ticket_id
    );


  return p_ticket_id;

end;

$function$;



-- ============================================================
-- 10. VOID SALE ITEM -> CANCEL KITCHEN ITEM
-- ============================================================

create or replace function private.sync_sale_item_void_to_kitchen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$

declare
  v_ticket_id uuid;

begin

  if new.line_status = 'VOIDED'
     and old.line_status is distinct from 'VOIDED' then

    update public.kitchen_ticket_items

    set
      status = 'CANCELLED',
      updated_at = now()

    where sale_item_id = new.id

    returning ticket_id
    into v_ticket_id;


    if v_ticket_id is not null then

      perform
        private.recalculate_kitchen_ticket_status(
          v_ticket_id
        );

    end if;

  end if;


  return new;

end;

$function$;



drop trigger if exists
  trg_sale_item_void_kitchen
on public.sale_items;


create trigger trg_sale_item_void_kitchen

after update of line_status
on public.sale_items

for each row

execute function
  private.sync_sale_item_void_to_kitchen();



-- ============================================================
-- 11. CANCEL SALE -> CANCEL KITCHEN
-- ============================================================

create or replace function private.sync_sale_cancel_to_kitchen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$

begin

  if new.status = 'CANCELLED'
     and old.status is distinct from 'CANCELLED' then

    update public.kitchen_ticket_items ki

    set
      status = 'CANCELLED',
      updated_at = now()

    from public.kitchen_tickets kt

    where kt.sale_id = new.id
      and ki.ticket_id = kt.id;


    update public.kitchen_tickets

    set
      status = 'CANCELLED',
      updated_at = now()

    where sale_id = new.id;

  end if;


  return new;

end;

$function$;



drop trigger if exists
  trg_sale_cancel_kitchen
on public.sales;


create trigger trg_sale_cancel_kitchen

after update of status
on public.sales

for each row

execute function
  private.sync_sale_cancel_to_kitchen();



-- ============================================================
-- 12. SECURE KITCHEN TICKET VIEW
-- ============================================================

drop view if exists
  public.kitchen_ticket_items_secure;

drop view if exists
  public.kitchen_tickets_secure;


create view public.kitchen_tickets_secure

with (
  security_barrier = true,
  security_invoker = false
)

as

select
  kt.id,
  kt.sale_id,

  s.sale_no,
  s.sale_date,

  kt.outlet_id,

  o.code as outlet_code,
  o.name as outlet_name,

  kt.source,
  kt.status,
  kt.notes,

  s.payment_method,

  kt.opened_at,
  kt.started_at,
  kt.ready_at,
  kt.completed_at,

  kt.created_at,
  kt.updated_at

from public.kitchen_tickets kt

join public.sales s
  on s.id = kt.sale_id

left join public.outlets o
  on o.id = kt.outlet_id

where private.can_view_sales_row(
  kt.outlet_id
);



create view public.kitchen_ticket_items_secure

with (
  security_barrier = true,
  security_invoker = false
)

as

select
  ki.id,
  ki.ticket_id,

  kt.sale_id,
  s.sale_no,

  kt.outlet_id,

  ki.sale_item_id,
  ki.menu_item_id,

  ki.station,

  ki.menu_code,
  ki.menu_name,
  ki.menu_category,

  ki.quantity,
  ki.notes,

  ki.status,

  ki.started_at,
  ki.ready_at,
  ki.completed_at,

  ki.created_at,
  ki.updated_at

from public.kitchen_ticket_items ki

join public.kitchen_tickets kt
  on kt.id = ki.ticket_id

join public.sales s
  on s.id = kt.sale_id

where private.can_view_sales_row(
  kt.outlet_id
);



-- ============================================================
-- 13. SECURE API PRIVILEGES
-- ============================================================

revoke all
on public.kitchen_tickets_secure
from public, anon;

revoke all
on public.kitchen_ticket_items_secure
from public, anon;


grant select
on public.kitchen_tickets_secure
to authenticated;

grant select
on public.kitchen_ticket_items_secure
to authenticated;



revoke all
on function public.update_kitchen_item_status(
  uuid,
  text
)
from public, anon;

grant execute
on function public.update_kitchen_item_status(
  uuid,
  text
)
to authenticated;



revoke all
on function public.update_kitchen_ticket_status(
  uuid,
  text
)
from public, anon;

grant execute
on function public.update_kitchen_ticket_status(
  uuid,
  text
)
to authenticated;


commit;


-- ============================================================
-- VERIFY
-- ============================================================

select
  'kitchen_tickets' as object_name,
  to_regclass(
    'public.kitchen_tickets'
  ) is not null as exists_ok

union all

select
  'kitchen_ticket_items',
  to_regclass(
    'public.kitchen_ticket_items'
  ) is not null

union all

select
  'kitchen_tickets_secure',
  to_regclass(
    'public.kitchen_tickets_secure'
  ) is not null

union all

select
  'kitchen_ticket_items_secure',
  to_regclass(
    'public.kitchen_ticket_items_secure'
  ) is not null

order by object_name;
