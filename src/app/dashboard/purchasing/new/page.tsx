import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PurchaseOrderForm from './PurchaseOrderForm'

export default async function NewPurchaseOrderPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: permissionData } =
    await supabase.rpc('get_my_permissions')

  const purchasingPermission =
    (permissionData || []).find(
      (row: {
        module_code: string
        can_create: boolean
        can_post: boolean
      }) =>
        row.module_code === 'PURCHASING'
    )

  if (
    !purchasingPermission?.can_create ||
    !purchasingPermission?.can_post
  ) {
    redirect('/dashboard?denied=PURCHASING')
  }

  const { data: outlets } = await supabase
    .from('outlets_secure')
    .select(`
      id,
      code,
      name,
      type
    `)
    .eq('is_active', true)
    .order('name')

  const { data: suppliers } = await supabase
    .from('suppliers_secure')
    .select(`
      id,
      code,
      name
    `)
    .eq('is_active', true)
    .order('name')

  const { data: items } = await supabase
    .from('items_secure')
    .select(`
      id,
      sku,
      name,
      item_type,
      base_unit_id,
      purchase_unit_id,
      last_cost
    `)
    .eq('is_active', true)
    .eq('is_purchasable', true)
    .order('name')

  const { data: units } = await supabase
    .from('units_secure')
    .select(`
      id,
      code,
      name,
      symbol
    `)
    .eq('is_active', true)
    .order('name')

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-7xl">

        <Link
          href="/dashboard/purchasing"
          className="text-sm text-zinc-500 hover:text-red-800"
        >
          ← Purchasing
        </Link>

        <div className="mt-6">

          <p className="text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            New Purchase Order
          </h1>

          <p className="mt-2 text-zinc-500">
            Create supplier purchase order.
          </p>

        </div>

        <PurchaseOrderForm
          outlets={outlets || []}
          suppliers={suppliers || []}
          items={items || []}
          units={units || []}
        />

      </div>

    </main>
  )
}
