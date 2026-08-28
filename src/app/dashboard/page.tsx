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

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-7xl">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-10">

          <p className="text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Operations Dashboard
          </h1>

          <p className="mt-2 text-zinc-500">
            Central Kitchen, Inventory, Purchasing & Outlet Management
          </p>

        </div>

        {/* =====================================================
            ERROR
        ===================================================== */}

        {profileError && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {profileError.message}
          </div>
        )}

        {/* =====================================================
            USER INFO
        ===================================================== */}

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

        {/* =====================================================
            OPERATION MENU
        ===================================================== */}

        <div className="mb-5">

          <h2 className="text-xl font-bold">
            Operations
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Daily operational modules
          </p>

        </div>

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

            <p className="mt-5 text-sm font-semibold text-red-800">
              Open Inventory →
            </p>

          </Link>


          {/* CENTRAL KITCHEN */}

          <Link
            href="/dashboard/production"
            className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >

            <div className="text-3xl">
              🏭
            </div>

            <h3 className="mt-4 text-lg font-bold">
              Central Kitchen
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Production, WIP & Finished Goods
            </p>

            <p className="mt-5 text-sm font-semibold text-red-800">
              Open Production →
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
              Supplier Goods Receiving & Stock In
            </p>

            <p className="mt-5 text-sm font-semibold text-red-800">
              Open Receiving →
            </p>

          </Link>


          {/* PURCHASING */}

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <div className="text-3xl">
              🛒
            </div>

            <h3 className="mt-4 text-lg font-bold">
              Purchasing
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Purchase Order & Supplier Purchasing
            </p>

            <span className="mt-5 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              Next Module
            </span>

          </div>

        </div>

        {/* =====================================================
            MASTER DATA
        ===================================================== */}

        <div className="mb-5 mt-10">

          <h2 className="text-xl font-bold">
            Master Data
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            System configuration and operational masters
          </p>

        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

          {/* MASTER ITEM */}

          <Link
            href="/dashboard/items"
            className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >

            <div className="text-3xl">
              🧺
            </div>

            <h3 className="mt-4 text-lg font-bold">
              Master Item
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Raw Material, WIP & Finished Goods
            </p>

            <p className="mt-5 text-sm font-semibold text-red-800">
              Manage Items →
            </p>

          </Link>


          {/* MASTER RECIPE */}

          <Link
            href="/dashboard/recipes"
            className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >

            <div className="text-3xl">
              📋
            </div>

            <h3 className="mt-4 text-lg font-bold">
              Master Recipe
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Recipe, BOM & Production Yield
            </p>

            <p className="mt-5 text-sm font-semibold text-red-800">
              Manage Recipes →
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

            <p className="mt-5 text-sm font-semibold text-red-800">
              Manage Suppliers →
            </p>

          </Link>


          {/* OUTLETS */}

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

            <p className="mt-5 text-sm font-semibold text-red-800">
              Manage Locations →
            </p>

          </Link>

        </div>

        {/* =====================================================
            MANAGEMENT
        ===================================================== */}

        <div className="mb-5 mt-10">

          <h2 className="text-xl font-bold">
            Management
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Cost, sales and management reporting
          </p>

        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

          {/* COGS */}

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <div className="text-3xl">
              🧾
            </div>

            <h3 className="mt-4 text-lg font-bold">
              COGS & Costing
            </h3>

            <p className="mt-2 text-sm text-zinc-500">
              Recipe Cost, Food Cost & Inventory Valuation
            </p>

            <span className="mt-5 inline-block rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500">
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
              Sales, Menu & Transactions
            </p>

            <span className="mt-5 inline-block rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500">
              Coming Soon
            </span>

          </div>


          {/* REPORT */}

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

            <span className="mt-5 inline-block rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500">
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
              User, Role & Access Management
            </p>

            <span className="mt-5 inline-block rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500">
              Coming Soon
            </span>

          </div>

        </div>

      </div>
    </main>
  )
}
