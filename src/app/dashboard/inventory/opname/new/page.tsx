import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StockOpnameForm from './StockOpnameForm'

export default async function NewStockOpnamePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: outlets } = await supabase
    .from('outlets')
    .select(`
      id,
      code,
      name
    `)
    .eq('is_active', true)
    .order('name')

  const { data: stock } = await supabase
    .from('inventory_stock')
    .select(`
      outlet_id,
      item_id,
      sku,
      item_name,
      category_name,
      stock_qty,
      base_unit_code
    `)
    .order('item_name')

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-7xl">

        <Link
          href="/dashboard/inventory/opname"
          className="text-sm text-zinc-500 hover:text-red-800"
        >
          ← Stock Opname
        </Link>

        <div className="mt-6">

          <p className="text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            New Stock Opname
          </h1>

          <p className="mt-2 text-zinc-500">
            Enter actual physical quantity.
          </p>

        </div>

        <StockOpnameForm
          outlets={outlets || []}
          stock={stock || []}
        />

      </div>
    </main>
  )
}
