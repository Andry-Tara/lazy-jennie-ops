import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProductionForm from './ProductionForm'

export default async function NewProductionPage() {
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
      name,
      type
    `)
    .eq('is_active', true)
    .eq('type', 'CENTRAL_KITCHEN')
    .order('name')

  const { data: recipes } = await supabase
    .from('recipes')
    .select(`
      id,
      code,
      name,
      output_item_id,
      output_qty,
      output_unit_id
    `)
    .eq('is_active', true)
    .order('name')

  const { data: recipeItems } = await supabase
    .from('recipe_items')
    .select(`
      recipe_id,
      ingredient_item_id,
      qty,
      unit_id,
      conversion_factor,
      base_qty
    `)

  const { data: items } = await supabase
    .from('items')
    .select(`
      id,
      sku,
      name,
      base_unit_id,
      item_type
    `)
    .eq('is_active', true)

  const { data: units } = await supabase
    .from('units')
    .select(`
      id,
      code,
      symbol
    `)

  const { data: stock } = await supabase
    .from('inventory_stock_secure')
    .select(`
      outlet_id,
      item_id,
      stock_qty,
      base_unit_code
    `)

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-7xl">

        <Link
          href="/dashboard/production"
          className="text-sm text-zinc-500 hover:text-red-800"
        >
          ← Production
        </Link>

        <div className="mt-6">

          <p className="text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            New Production
          </h1>

          <p className="mt-2 text-zinc-500">
            Produce WIP or Finished Goods from Recipe / BOM.
          </p>

        </div>

        <ProductionForm
          outlets={outlets || []}
          recipes={recipes || []}
          recipeItems={recipeItems || []}
          items={items || []}
          units={units || []}
          stock={stock || []}
        />

      </div>
    </main>
  )
}
