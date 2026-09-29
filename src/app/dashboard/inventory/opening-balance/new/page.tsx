import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import OpeningBalanceForm from './OpeningBalanceForm'

type PermissionRow = {
  module_code: string
  can_post: boolean
}

export default async function NewOpeningBalancePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const {
    data: permissionData,
    error: permissionError,
  } = await supabase.rpc('get_my_permissions')

  const permissions = (permissionData || []) as PermissionRow[]

  const inventoryPermission = permissions.find(
    (row) => row.module_code === 'INVENTORY'
  )

  if (
    permissionError ||
    !inventoryPermission?.can_post
  ) {
    redirect('/dashboard?denied=INVENTORY')
  }

  const [
    outletsResult,
    itemsResult,
    unitsResult,
    conversionsResult,
  ] = await Promise.all([
    supabase
      .from('outlets_secure')
      .select(`
        id,
        code,
        name,
        type
      `)
      .eq('is_active', true)
      .order('name'),

    supabase
      .from('items_secure')
      .select(`
        id,
        sku,
        name,
        item_type,
        base_unit_id,
        base_unit_code,
        base_unit_name,
        base_unit_symbol,
        purchase_unit_id,
        purchase_unit_code,
        purchase_unit_name,
        purchase_unit_symbol,
        standard_cost,
        last_cost,
        track_batch,
        track_expiry,
        is_active
      `)
      .eq('is_active', true)
      .order('name'),

    supabase
      .from('units_secure')
      .select(`
        id,
        code,
        name,
        symbol,
        decimal_places
      `)
      .eq('is_active', true)
      .order('name'),

    supabase
      .from('unit_conversions_secure')
      .select(`
        id,
        item_id,
        from_unit_id,
        from_unit_code,
        from_unit_name,
        from_unit_symbol,
        to_unit_id,
        to_unit_code,
        to_unit_name,
        to_unit_symbol,
        conversion_factor
      `),
  ])

  const pageError =
    outletsResult.error?.message ||
    itemsResult.error?.message ||
    unitsResult.error?.message ||
    conversionsResult.error?.message ||
    ''

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-7xl">

        <Link
          href="/dashboard/inventory/opening-balance"
          className="text-sm text-zinc-500 hover:text-red-800"
        >
          ← Opening Balance
        </Link>

        <div className="mt-6">

          <p className="text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            New Opening Balance
          </h1>

          <p className="mt-2 text-zinc-500">
            Enter the real physical stock and cost before go-live operations.
          </p>

        </div>

        {pageError && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
            {pageError}
          </div>
        )}

        <OpeningBalanceForm
          outlets={outletsResult.data || []}
          items={itemsResult.data || []}
          units={unitsResult.data || []}
          conversions={conversionsResult.data || []}
        />

      </div>
    </main>
  )
}
