import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MenuForm from './MenuForm'

export default async function NewMenuPage() {
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
  // ITEMS
  // =====================================================

  const {
    data: items,
    error: itemError,
  } = await supabase
    .from('items')
    .select(`
      id,
      sku,
      name,
      item_type,
      base_unit_id
    `)
    .eq('is_active', true)
    .order('name')

  // =====================================================
  // UNITS
  // =====================================================

  const {
    data: units,
    error: unitError,
  } = await supabase
    .from('units')
    .select(`
      id,
      code,
      name
    `)
    .order('code')

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-6xl">

        <div className="mb-8">

          <Link
            href="/dashboard/menu"
            className="text-sm text-zinc-500 hover:text-red-800"
          >
            ← Menu Master
          </Link>

          <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Add Menu
          </h1>

          <p className="mt-2 text-zinc-500">
            Create selling menu and inventory BOM
          </p>

        </div>

        {(itemError || unitError) && (

          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">

            {itemError && (
              <p>{itemError.message}</p>
            )}

            {unitError && (
              <p>{unitError.message}</p>
            )}

          </div>

        )}

        <MenuForm
          items={items || []}
          units={units || []}
        />

      </div>

    </main>
  )
}
