import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import RecipeForm from './RecipeForm'

export default async function NewRecipePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }


  const { data: items } = await supabase
    .from('items')
    .select(`
      id,
      sku,
      name,
      item_type,
      base_unit_id,
      purchase_unit_id
    `)
    .eq('is_active', true)
    .order('name')


  const { data: units } = await supabase
    .from('units')
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
          href="/dashboard/recipes"
          className="text-sm text-zinc-500 hover:text-red-800"
        >
          ← Master Recipe
        </Link>


        <div className="mt-6">

          <p className="text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            New Recipe
          </h1>

          <p className="mt-2 text-zinc-500">
            Define output yield and ingredient BOM.
          </p>

        </div>


        <RecipeForm
          items={items || []}
          units={units || []}
        />

      </div>

    </main>
  )
}
