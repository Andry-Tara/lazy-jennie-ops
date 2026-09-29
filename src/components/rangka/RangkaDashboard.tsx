import Link from 'next/link'

import {
  createClient,
} from '@/lib/supabase/server'

import DashboardLogoutButton
  from '@/components/auth/DashboardLogoutButton'


type Props = {
  fullName: string
  email: string
  roleName: string
  roleCode: string
  outletCode: string
  outletName: string
}


type ModuleIconType =
  | 'POS'
  | 'ORDERS'
  | 'KITCHEN'
  | 'CASHIER'
  | 'REPORT'
  | 'MENU'


export default async function RangkaDashboard({
  fullName,
  email,
  roleName,
  roleCode,
  outletCode,
  outletName,
}: Props) {

  // ===================================================
  // LIVE MODULE PERMISSIONS
  // ===================================================

  const supabase =
    await createClient()


  const {
    data:
      permissions,
  } =
    await supabase.rpc(
      'get_my_permissions'
    )


  const canViewWaiter =
    (
      permissions ||
      []
    ).some(
      (row: any) =>
        row.module_code ===
          'WAITER'
        &&
        row.can_view ===
          true
    )


  const canViewKitchen =
    (
      permissions ||
      []
    ).some(
      (row: any) =>
        row.module_code ===
          'KITCHEN'
        &&
        row.can_view ===
          true
    )


  // ===================================================
  // CURRENT USER OUTLET
  // ===================================================

  const {
    data: {
      user,
    },
  } =
    await supabase.auth
      .getUser()


  let currentOutletId =
    ''


  if (user) {

    const {
      data:
        currentProfile,
    } =
      await supabase
        .from('profiles')
        .select(`
          outlet_id
        `)
        .eq(
          'id',
          user.id
        )
        .maybeSingle()


    currentOutletId =
      currentProfile
        ?.outlet_id ||
      ''

  }


  // ===================================================
  // OUTLET FEATURE FLAGS
  // ===================================================

  let waiterModeEnabled =
    false

  let kdsEnabled =
    false


  if (currentOutletId) {

    const {
      data:
        appProfile,
    } =
      await supabase
        .from(
          'outlet_app_profiles_secure'
        )
        .select(`
          waiter_mode_enabled,
          kds_enabled
        `)
        .eq(
          'outlet_id',
          currentOutletId
        )
        .maybeSingle()


    waiterModeEnabled =
      Boolean(
        appProfile
          ?.waiter_mode_enabled
      )


    kdsEnabled =
      Boolean(
        appProfile
          ?.kds_enabled
      )

  }



  const manager =
    [
      'SUPER_ADMIN',
      'MANAGEMENT',
      'OUTLET_MANAGER',
    ].includes(
      roleCode
    )


  const cashier =
    manager ||
    roleCode ===
      'CASHIER'


  const waiter =
    canViewWaiter &&
    waiterModeEnabled


  const kitchen =
    canViewKitchen &&
    kdsEnabled


  return (
    <main className="min-h-screen bg-zinc-100 p-6 text-zinc-950">

      <div className="mx-auto max-w-[1500px]">


        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="mb-8 flex flex-wrap items-start justify-between gap-5">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.24em] text-red-800">
              Rangka Cafe
            </p>


            <h1 className="mt-2 text-4xl font-black tracking-tight">
              Restaurant Operations
            </h1>


            <p className="mt-2 text-zinc-500">
              POS, kitchen, cashier and sales management.
            </p>

          </div>


          <DashboardLogoutButton />

        </header>


        {/* ===================================================
            USER
        =================================================== */}

        <section className="mb-8 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">

          <div className="flex flex-wrap items-center justify-between gap-6 p-6">

            <div>

              <p className="text-xs font-black uppercase tracking-wide text-zinc-400">
                Welcome
              </p>


              <h2 className="mt-1 text-2xl font-black">
                {
                  fullName ||
                  email
                }
              </h2>


              <p className="mt-1 text-sm text-zinc-500">
                {email}
              </p>

            </div>


            <div className="flex flex-wrap gap-2">

              <span className="rounded-full bg-red-50 px-4 py-2 text-xs font-black text-red-800">
                {
                  roleName
                }
              </span>


              <span className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-black text-zinc-600">
                {
                  outletCode
                } · {
                  outletName
                }
              </span>

            </div>

          </div>

        </section>


        {/* ===================================================
            MODULES HEADER
        =================================================== */}

        <div className="mb-5 flex items-end justify-between gap-5">

          <div>

            <h2 className="text-2xl font-black">
              Operations
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Daily restaurant workflow
            </p>

          </div>


          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
            GO-LIVE PROFILE
          </span>

        </div>


        {/* ===================================================
            MODULES
        =================================================== */}

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">


          {cashier && (

            <ModuleCard
              icon="POS"
              eyebrow="SALES"
              title="Point of Sale"
              description="Create dine-in or takeaway orders and accept payment."
              href="/dashboard/pos"
              action="Open POS"
            />

          )}


          {cashier && (

            <ModuleCard
              icon="ORDERS"
              eyebrow="ORDERS"
              title="Open Orders"
              description="Table orders, add items, bills, payment and receipts."
              href="/dashboard/pos/orders"
              action="Manage Orders"
            />

          )}


          {waiter && (

            <ModuleCard
              icon="ORDERS"
              eyebrow="TABLE SERVICE"
              title="Waiter Mode"
              description="Table map, order taking, additional orders and kitchen notes."
              href="/dashboard/waiter"
              action="Open Waiter Mode"
            />

          )}





          {kitchen && (

            <ModuleCard
              icon="KITCHEN"
              eyebrow="KITCHEN"
              title="Kitchen Display"
              description="Kitchen and Bar preparation with item-level workflow."
              href="/dashboard/kitchen"
              action="Open KDS"
            />

          )}


          {cashier && (

            <ModuleCard
              icon="CASHIER"
              eyebrow="CASHIER"
              title="Cashier Shift"
              description="Opening cash, closing, reconciliation and shift history."
              href="/dashboard/pos/closing"
              action="Open Cashier"
            />

          )}


          {manager && (

            <ModuleCard
              icon="REPORT"
              eyebrow="REPORT"
              title="Reports & Revenue"
              description="Sales revenue, payment mix and transaction reporting."
              href="/dashboard/pos/revenue"
              action="View Reports"
            />

          )}


          {manager && (

            <ModuleCard
              icon="MENU"
              eyebrow="MANAGEMENT"
              title="Master Menu"
              description="Menu, category, selling price and Kitchen / Bar routing."
              href="/dashboard/menu"
              action="Manage Menu"
            />

          )}

        </section>


        {/* ===================================================
            PROFILE INFO
        =================================================== */}

        <section className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-950 p-6 text-white">

          <div className="flex flex-wrap items-center justify-between gap-5">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">
                Rangka Cafe Operations
              </p>

              <p className="mt-2 text-sm text-zinc-300">
                Inventory, purchasing, recipe/BOM and costing modules are not enabled for this operation profile.
              </p>

            </div>


            <div className="rounded-full border border-zinc-700 px-4 py-2 text-xs font-black text-zinc-300">
              SALES-ONLY
            </div>

          </div>

        </section>

      </div>

    </main>
  )
}



function ModuleCard({
  icon,
  eyebrow,
  title,
  description,
  href,
  action,
}: {
  icon: ModuleIconType
  eyebrow: string
  title: string
  description: string
  href: string
  action: string
}) {

  return (
    <Link
      href={
        href
      }
      className="group rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg"
    >

      <div className="flex items-start justify-between gap-5">

        <div>

          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-800">
            {
              eyebrow
            }
          </p>


          <h3 className="mt-3 text-xl font-black">
            {
              title
            }
          </h3>

        </div>


        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-red-50 text-red-900 transition duration-200 group-hover:bg-red-900 group-hover:text-white">

          <ModuleIcon
            type={
              icon
            }
          />

        </div>

      </div>


      <p className="mt-3 min-h-12 text-sm leading-6 text-zinc-500">
        {
          description
        }
      </p>


      <div className="mt-7 flex items-center justify-between">

        <span className="font-black text-red-900">
          {
            action
          } →
        </span>


        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 font-black transition group-hover:bg-zinc-950 group-hover:text-white">
          →
        </span>

      </div>

    </Link>
  )
}



function ModuleIcon({
  type,
}: {
  type: ModuleIconType
}) {

  const common =
    'h-6 w-6'


  if (
    type ===
    'POS'
  ) {

    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          common
        }
        aria-hidden="true"
      >
        <rect
          x="4"
          y="3"
          width="16"
          height="18"
          rx="3"
        />

        <path
          d="M8 7h8"
        />

        <path
          d="M8 11h8"
        />

        <path
          d="M8 16h2"
        />

        <path
          d="M14 16h2"
        />
      </svg>
    )

  }


  if (
    type ===
    'ORDERS'
  ) {

    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          common
        }
        aria-hidden="true"
      >
        <rect
          x="5"
          y="4"
          width="14"
          height="17"
          rx="2"
        />

        <path
          d="M9 4.5V3h6v1.5"
        />

        <path
          d="M8 9h8"
        />

        <path
          d="M8 13h8"
        />

        <path
          d="M8 17h5"
        />
      </svg>
    )

  }


  if (
    type ===
    'KITCHEN'
  ) {

    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          common
        }
        aria-hidden="true"
      >
        <path
          d="M4 16h16"
        />

        <path
          d="M6 16a6 6 0 0 1 12 0"
        />

        <path
          d="M12 7V5"
        />

        <path
          d="M3 19h18"
        />

        <path
          d="M9 5h6"
        />
      </svg>
    )

  }


  if (
    type ===
    'CASHIER'
  ) {

    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          common
        }
        aria-hidden="true"
      >
        <path
          d="M5 7h14a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2V7.5A2.5 2.5 0 0 1 5.5 5H18"
        />

        <path
          d="M16 11h5v4h-5a2 2 0 0 1 0-4Z"
        />

        <circle
          cx="17"
          cy="13"
          r=".5"
          fill="currentColor"
          stroke="none"
        />
      </svg>
    )

  }


  if (
    type ===
    'REPORT'
  ) {

    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          common
        }
        aria-hidden="true"
      >
        <path
          d="M4 20V10"
        />

        <path
          d="M10 20V4"
        />

        <path
          d="M16 20v-7"
        />

        <path
          d="M22 20V8"
        />

        <path
          d="M2 20h20"
        />
      </svg>
    )

  }


  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={
        common
      }
      aria-hidden="true"
    >
      <path
        d="M7 3v7"
      />

      <path
        d="M4 3v4a3 3 0 0 0 6 0V3"
      />

      <path
        d="M7 10v11"
      />

      <path
        d="M16 3v18"
      />

      <path
        d="M16 3c3 1 4 4 4 7v2h-4"
      />
    </svg>
  )
}
