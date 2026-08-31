import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TransferForm from './TransferForm'

export default async function NewTransferPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
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
    .gt('stock_qty', 0)
    .order('item_name')

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-7xl">

        <Link
          href="/dashboard/inventory/transfers"
          className="text-sm text-zinc-500 hover:text-red-800"
        >
          ← Stock Transfer
        </Link>

        <div className="mt-6">

          <p className="text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            New Stock Transfer
          </h1>

          <p className="mt-2 text-zinc-500">
            Transfer inventory between locations.
          </p>

        </div>

        <TransferForm
          outlets={outlets || []}
          stock={stock || []}
        />

      </div>
    </main>
  )
}
