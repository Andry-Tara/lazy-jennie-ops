import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import WasteForm from './WasteForm'

export default async function NewWastePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // =====================================================
  // OUTLETS
  // =====================================================

  const { data: outlets } = await supabase
    .from('outlets_secure')
    .select(`
      id,
      code,
      name
    `)
    .eq('is_active', true)
    .order('name')

  // =====================================================
  // CURRENT INVENTORY
  // =====================================================

  const { data: stock } = await supabase
    .from('inventory_stock_secure')
    .select(`
      outlet_id,
      item_id,
      sku,
      item_name,
      category_name,
      stock_qty,
      base_unit_id,
      base_unit_code
    `)
    .order('item_name')

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-7xl">

        <Link
          href="/dashboard/inventory/waste"
          className="text-sm text-zinc-500 hover:text-red-800"
        >
          ← Waste History
        </Link>

        <div className="mt-6">

          <p className="text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            New Waste
          </h1>

          <p className="mt-2 text-zinc-500">
            Record spoiled, expired or damaged inventory.
          </p>

        </div>

        <WasteForm
          outlets={outlets || []}
          stock={stock || []}
        />

      </div>

    </main>
  )
}
