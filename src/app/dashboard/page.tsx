import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  // =====================================================
  // AUTH
  // =====================================================

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // =====================================================
  // PROFILE
  // =====================================================

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      role_id,
      outlet_id,
      is_active
    `)
    .eq('id', user.id)
    .single()

  // =====================================================
  // ROLE
  // =====================================================

  let roleName = 'No Role'
  let roleCode = ''

  if (profile?.role_id) {
    const { data: role } = await supabase
      .from('roles')
      .select(`
        code,
        name
      `)
      .eq('id', profile.role_id)
      .single()

    if (role) {
      roleName = role.name
      roleCode = role.code
    }
  }

  // =====================================================
  // OUTLET
  // =====================================================

  let outletName = 'All Locations'

  if (profile?.outlet_id) {
    const { data: outlet } = await supabase
      .from('outlets')
      .select(`
        code,
        name
      `)
      .eq('id', profile.outlet_id)
      .single()

    if (outlet) {
      outletName = outlet.name
    }
  }

  // =====================================================
  // ACTIVE CHECK
  // =====================================================

  if (profile && !profile.is_active) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-8 text-zinc-900">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-4 text-2xl font-bold">
            Account Inactive
          </h1>

          <p className="mt-3 text-zinc-500">
            Your account is currently inactive.
            Please contact the system administrator.
          </p>
        </div>
      </main>
    )
  }

  // =====================================================
  // DASHBOARD
  // =====================================================

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-10">
          <p className="text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-2 text-4xl font-bold text-zinc-900">
            Operations Dashboard
          </h1>

          <p className="mt-2 text-zinc-500">
            Central Kitchen, Inventory & Outlet Management
          </p>
        </div>

        {/* ERROR */}

        {profileError && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {profileError.message}
          </div>
        )}

        {/* USER INFO */}

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">
            Welcome
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            {profile?.full_name || user.email}
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            {profile?.email || user.email}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">

            <span className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-800">
              {roleName}
            </span>

            <span className="rounded-full bg-zinc-100 px-4 py-2 text-sm text-zinc-600">
              {outletName}
            </span>

            {roleCode && (
              <span className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-500">
                {roleCode}
              </span>
            )}

          </div>
        </div>

        {/* MENU */}

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

          {/* INVENTORY */}

          <Link
            href="/dashboard/inventory"
            className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="text-3xl">
              📦
            </div>

            <h3 className="mt-4 text-lg font-bold">
              Inventory
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Current Stock, Movement & Monitoring
            </p>
          </Link>

          {/* RECEIVING */}

          <Link
            href="/dashboard/receiving"
            className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="text-3xl">
              📥
            </div>

            <h3 className="mt-4 text-lg font-bold">
              Receiving
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Supplier Goods Receiving
            </p>
          </Link>

          {/* SUPPLIER */}

          <Link
            href="/dashboard/suppliers"
            className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="text-3xl">
              🚚
            </div>

            <h3 className="mt-4 text-lg font-bold">
              Suppliers
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Supplier Master Data
            </p>
          </Link>

          {/* OUTLET */}

          <Link
            href="/dashboard/outlets"
            className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="text-3xl">
              🏪
            </div>

            <h3 className="mt-4 text-lg font-bold">
              Master Outlet
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Central Kitchen & Outlet Management
            </p>
          </Link>

          {/* CENTRAL KITCHEN */}

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="text-3xl">
              🏭
            </div>

            <h3 className="mt-4 text-lg font-bold">
              Central Kitchen
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Production & Transfer
            </p>

            <span className="mt-4 inline-block rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500">
              Coming Soon
            </span>
          </div>

          {/* PURCHASING */}

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="text-3xl">
              🛒
            </div>

            <h3 className="mt-4 text-lg font-bold">
              Purchasing
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Purchase Request & Purchase Order
            </p>

            <span className="mt-4 inline-block rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500">
              Coming Soon
            </span>
          </div>

          {/* COGS */}

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="text-3xl">
              🧾
            </div>

            <h3 className="mt-4 text-lg font-bold">
              COGS & Costing
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Recipe, Cost & Food Cost
            </p>

            <span className="mt-4 inline-block rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500">
              Coming Soon
            </span>
          </div>

          {/* POS */}

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="text-3xl">
              💳
            </div>

            <h3 className="mt-4 text-lg font-bold">
              POS
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Sales & Transactions
            </p>

            <span className="mt-4 inline-block rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500">
              Coming Soon
            </span>
          </div>

          {/* REPORTS */}

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="text-3xl">
              📊
            </div>

            <h3 className="mt-4 text-lg font-bold">
              Reports
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Operational & Management Reports
            </p>

            <span className="mt-4 inline-block rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500">
              Coming Soon
            </span>
          </div>

          {/* USERS */}

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="text-3xl">
              👥
            </div>

            <h3 className="mt-4 text-lg font-bold">
              Users
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              User & Role Management
            </p>

            <span className="mt-4 inline-block rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500">
              Coming Soon
            </span>
          </div>

        </div>
      </div>
    </main>
  )
}
