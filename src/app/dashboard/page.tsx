import {
  createClient,
} from '@/lib/supabase/server'

import {
  redirect,
} from 'next/navigation'

import Link from 'next/link'


type SearchParams = Promise<{
  denied?: string
}>


type PermissionRow = {
  module_code: string
  can_view: boolean
  can_create: boolean
  can_update: boolean
  can_post: boolean
  can_approve: boolean
}


type ModuleCode =
  | 'POS'
  | 'SALES_HISTORY'
  | 'SALES_REPORT'
  | 'INVENTORY'
  | 'INVENTORY_VALUATION'
  | 'RECEIVING'
  | 'PURCHASING'
  | 'PRODUCTION'
  | 'STOCK_TRANSFER'
  | 'STOCK_OPNAME'
  | 'WASTE'
  | 'MASTER_ITEM'
  | 'MASTER_RECIPE'
  | 'MENU_MASTER'
  | 'SUPPLIERS'
  | 'OUTLETS'
  | 'COSTING'
  | 'USERS'


type DashboardCard = {

  title: string

  description: string

  href: string

  icon: string

  permission:
    ModuleCode

  action: string

}


export default async function DashboardPage({
  searchParams,
}: {
  searchParams:
    SearchParams
}) {

  const params =
    await searchParams


  const supabase =
    await createClient()


  // =====================================================
  // AUTH
  // =====================================================

  const {
    data: {
      user,
    },
  } =
    await supabase.auth
      .getUser()


  if (
    !user
  ) {
    redirect('/login')
  }


  // =====================================================
  // PROFILE
  // =====================================================

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        role_id,
        outlet_id,
        is_active
      `)
      .eq(
        'id',
        user.id
      )
      .single()


  // =====================================================
  // INACTIVE
  // =====================================================

  if (
    profile &&
    !profile.is_active
  ) {

    return (

      <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-8">

        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">

          <p className="text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-4 text-2xl font-bold">
            Account Inactive
          </h1>

          <p className="mt-3 text-zinc-500">
            Your account is inactive.
            Please contact the administrator.
          </p>

        </div>

      </main>

    )

  }


  // =====================================================
  // ROLE
  // =====================================================

  let roleName =
    'No Role'

  let roleCode =
    ''


  if (
    profile?.role_id
  ) {

    const {
      data: role,
    } =
      await supabase
        .from('roles')
        .select(`
          code,
          name
        `)
        .eq(
          'id',
          profile.role_id
        )
        .single()


    if (
      role
    ) {

      roleName =
        role.name

      roleCode =
        role.code

    }

  }


  // =====================================================
  // OUTLET
  // =====================================================

  let outletName =
    'All Locations'

  let outletCode =
    ''


  if (
    profile?.outlet_id
  ) {

    const {
      data: outlet,
    } =
      await supabase
        .from('outlets_secure')
        .select(`
          code,
          name
        `)
        .eq(
          'id',
          profile.outlet_id
        )
        .single()


    if (
      outlet
    ) {

      outletName =
        outlet.name

      outletCode =
        outlet.code

    }

  }


  // =====================================================
  // PERMISSIONS
  // =====================================================

  const {
    data: permissionData,
    error: permissionError,
  } =
    await supabase.rpc(
      'get_my_permissions'
    )


  const permissions =
    (
      permissionData ||
      []
    ) as PermissionRow[]


  const allowedModules =
    new Set(
      permissions
        .filter(
          (permission) =>
            permission.can_view
        )
        .map(
          (permission) =>
            permission.module_code
        )
    )


  function canView(
    moduleCode:
      ModuleCode
  ) {

    return allowedModules.has(
      moduleCode
    )

  }


  // =====================================================
  // OPERATIONS CARDS
  // =====================================================

  const operations:
    DashboardCard[] = [

    {
      title:
        'Inventory',

      description:
        'Current Stock, Movement & Monitoring',

      href:
        '/dashboard/inventory',

      icon:
        '📦',

      permission:
        'INVENTORY',

      action:
        'Open Inventory',
    },

    {
      title:
        'Central Kitchen',

      description:
        'Production, WIP & Finished Goods',

      href:
        '/dashboard/production',

      icon:
        '🏭',

      permission:
        'PRODUCTION',

      action:
        'Open Production',
    },

    {
      title:
        'Purchasing',

      description:
        'Purchase Order & Purchase Monitoring',

      href:
        '/dashboard/purchasing',

      icon:
        '🛒',

      permission:
        'PURCHASING',

      action:
        'Open Purchasing',
    },

    {
      title:
        'Receiving',

      description:
        'Supplier Goods Receiving & Stock In',

      href:
        '/dashboard/receiving',

      icon:
        '📥',

      permission:
        'RECEIVING',

      action:
        'Open Receiving',
    },

    {
      title:
        'Waste Management',

      description:
        'Waste, Spoilage & Inventory Loss',

      href:
        '/dashboard/inventory/waste',

      icon:
        '🗑️',

      permission:
        'WASTE',

      action:
        'Open Waste',
    },

    {
      title:
        'Stock Transfer',

      description:
        'Transfer Stock Between Locations',

      href:
        '/dashboard/inventory/transfers',

      icon:
        '🔄',

      permission:
        'STOCK_TRANSFER',

      action:
        'Open Transfers',
    },

    {
      title:
        'Stock Opname',

      description:
        'Physical Count & Stock Adjustment',

      href:
        '/dashboard/inventory/opname',

      icon:
        '📋',

      permission:
        'STOCK_OPNAME',

      action:
        'Open Stock Opname',
    },

    {
      title:
        'Inventory Valuation',

      description:
        'Weighted Average Cost & Stock Value',

      href:
        '/dashboard/inventory/valuation',

      icon:
        '💰',

      permission:
        'INVENTORY_VALUATION',

      action:
        'Open Valuation',
    },

  ]


  // =====================================================
  // MASTER DATA
  // =====================================================

  const masterData:
    DashboardCard[] = [

    {
      title:
        'Master Item',

      description:
        'Raw Material, WIP & Finished Goods',

      href:
        '/dashboard/items',

      icon:
        '🧺',

      permission:
        'MASTER_ITEM',

      action:
        'Manage Items',
    },

    {
      title:
        'Master Recipe',

      description:
        'Recipe, BOM & Production Yield',

      href:
        '/dashboard/recipes',

      icon:
        '📋',

      permission:
        'MASTER_RECIPE',

      action:
        'Manage Recipes',
    },

    {
      title:
        'Menu Master',

      description:
        'Selling Menu, Photo, Price & POS BOM',

      href:
        '/dashboard/menu',

      icon:
        '🍽️',

      permission:
        'MENU_MASTER',

      action:
        'Manage Menu',
    },

    {
      title:
        'Suppliers',

      description:
        'Supplier Master Data',

      href:
        '/dashboard/suppliers',

      icon:
        '🚚',

      permission:
        'SUPPLIERS',

      action:
        'Manage Suppliers',
    },

    {
      title:
        'Master Outlet',

      description:
        'Central Kitchen & Outlet Management',

      href:
        '/dashboard/outlets',

      icon:
        '🏪',

      permission:
        'OUTLETS',

      action:
        'Manage Locations',
    },

  ]


  // =====================================================
  // MANAGEMENT
  // =====================================================

  const management:
    DashboardCard[] = [

    {
      title:
        'COGS & Costing',

      description:
        'Food Cost, Inventory Cost & COGS',

      href:
        '/dashboard/costing',

      icon:
        '🧾',

      permission:
        'COSTING',

      action:
        'Open COGS & Costing',
    },

    {
      title:
        'POS',

      description:
        'Sales, Menu, Stock & Transactions',

      href:
        '/dashboard/pos',

      icon:
        '💳',

      permission:
        'POS',

      action:
        'Open POS',
    },

    {
      title:
        'Sales History',

      description:
        'POS Transactions & Sales History',

      href:
        '/dashboard/pos/sales',

      icon:
        '🧮',

      permission:
        'SALES_HISTORY',

      action:
        'Open Sales History',
    },

    {
      title:
        'Management Report',

      description:
        'Sales, COGS, Margin & Performance',

      href:
        '/dashboard/pos/report',

      icon:
        '📊',

      permission:
        'SALES_REPORT',

      action:
        'Open Report',
    },

    {
      title:
        'Users & Access',

      description:
        'User, Role & Access Management',

      href:
        '/dashboard/users',

      icon:
        '👥',

      permission:
        'USERS',

      action:
        'Manage Users',
    },

  ]


  // =====================================================
  // FILTER
  // =====================================================

  const visibleOperations =
    operations.filter(
      (card) =>
        canView(
          card.permission
        )
    )


  const visibleMasterData =
    masterData.filter(
      (card) =>
        canView(
          card.permission
        )
    )


  const visibleManagement =
    management.filter(
      (card) =>
        canView(
          card.permission
        )
    )


  // =====================================================
  // CARD COMPONENT
  // =====================================================

  function ModuleCard({
    card,
  }: {
    card:
      DashboardCard
  }) {

    return (

      <Link
        href={
          card.href
        }
        className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
      >

        <div className="text-3xl">
          {card.icon}
        </div>

        <h3 className="mt-4 text-lg font-bold">
          {card.title}
        </h3>

        <p className="mt-2 min-h-10 text-sm text-zinc-500">
          {card.description}
        </p>

        <p className="mt-5 text-sm font-semibold text-red-800">
          {card.action}
          {' →'}
        </p>

      </Link>

    )

  }


  // =====================================================
  // PAGE
  // =====================================================

  return (

    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-7xl">


        {/* HEADER */}

        <div className="mb-10">

          <p className="text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Operations Dashboard
          </h1>

          <p className="mt-2 text-zinc-500">
            Inventory, Central Kitchen, Purchasing, POS & Outlet Operations
          </p>

        </div>


        {/* ACCESS DENIED */}

        {params.denied && (

          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">

            <p className="font-bold text-amber-900">
              Access Restricted
            </p>

            <p className="mt-1 text-sm text-amber-800">
              Your role does not have permission to access{' '}
              <span className="font-bold">
                {params.denied}
              </span>
              .
            </p>

          </div>

        )}


        {/* ERRORS */}

        {(profileError ||
          permissionError) && (

          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">

            {profileError?.message ||
              permissionError?.message}

          </div>

        )}


        {/* USER */}

        <div className="mb-10 rounded-2xl bg-white p-6 shadow-sm">

          <div className="flex flex-wrap items-center justify-between gap-4">

            <div>

              <p className="text-sm text-zinc-500">
                Welcome
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                {profile?.full_name ||
                  user.email}
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {profile?.email ||
                  user.email}
              </p>

            </div>


            <div className="flex flex-wrap gap-3">

              <span className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-800">
                {roleName}
              </span>

              <span className="rounded-full bg-zinc-100 px-4 py-2 text-sm text-zinc-600">

                {outletCode
                  ? `${outletCode} - ${outletName}`
                  : outletName}

              </span>

              {roleCode && (

                <span className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-500">
                  {roleCode}
                </span>

              )}

            </div>

          </div>

        </div>


        {/* OPERATIONS */}

        {visibleOperations.length >
          0 && (

          <section>

            <div className="mb-5">

              <h2 className="text-2xl font-bold">
                Operations
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Daily operational modules
              </p>

            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

              {visibleOperations.map(
                (card) => (

                  <ModuleCard
                    key={
                      card.permission
                    }
                    card={
                      card
                    }
                  />

                )
              )}

            </div>

          </section>

        )}


        {/* MASTER */}

        {visibleMasterData.length >
          0 && (

          <section className="mt-12">

            <div className="mb-5">

              <h2 className="text-2xl font-bold">
                Master Data
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                System configuration and operational masters
              </p>

            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

              {visibleMasterData.map(
                (card) => (

                  <ModuleCard
                    key={
                      card.permission
                    }
                    card={
                      card
                    }
                  />

                )
              )}

            </div>

          </section>

        )}


        {/* MANAGEMENT */}

        {visibleManagement.length >
          0 && (

          <section className="mt-12">

            <div className="mb-5">

              <h2 className="text-2xl font-bold">
                Management
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Sales, costing and management control
              </p>

            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

              {visibleManagement.map(
                (card) => (

                  <ModuleCard
                    key={
                      card.permission
                    }
                    card={
                      card
                    }
                  />

                )
              )}

            </div>

          </section>

        )}


        {/* NO PERMISSION */}

        {visibleOperations.length ===
          0 &&
          visibleMasterData.length ===
            0 &&
          visibleManagement.length ===
            0 && (

          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <p className="text-lg font-bold">
              No Module Access
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              This account does not have any assigned module permissions.
            </p>

          </div>

        )}


      </div>

    </main>

  )

}
