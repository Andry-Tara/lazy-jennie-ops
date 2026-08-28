import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function RecipesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // =====================================================
  // RECIPES
  // =====================================================

  const {
    data: recipes,
    error,
  } = await supabase
    .from('recipes')
    .select(`
      id,
      code,
      name,
      output_item_id,
      output_qty,
      output_unit_id,
      notes,
      is_active,
      created_at
    `)
    .order('name')


  // =====================================================
  // ITEMS
  // =====================================================

  const { data: items } = await supabase
    .from('items')
    .select(`
      id,
      sku,
      name,
      item_type
    `)


  // =====================================================
  // UNITS
  // =====================================================

  const { data: units } = await supabase
    .from('units')
    .select(`
      id,
      code,
      symbol
    `)


  // =====================================================
  // INGREDIENTS
  // =====================================================

  const { data: recipeItems } =
    await supabase
      .from('recipe_items')
      .select(`
        recipe_id,
        ingredient_item_id
      `)


  // =====================================================
  // MAP
  // =====================================================

  const itemMap = new Map(
    (items || []).map((item) => [
      item.id,
      item,
    ])
  )


  const unitMap = new Map(
    (units || []).map((unit) => [
      unit.id,
      unit,
    ])
  )


  const ingredientCount =
    new Map<string, number>()


  for (const row of recipeItems || []) {

    ingredientCount.set(
      row.recipe_id,

      (
        ingredientCount.get(
          row.recipe_id
        ) || 0
      ) + 1
    )

  }


  function formatNumber(
    value: number
  ) {

    return Number(value).toLocaleString(
      'id-ID',
      {
        maximumFractionDigits: 3,
      }
    )

  }


  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-7xl">


        {/* HEADER */}

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">

          <div>

            <Link
              href="/dashboard"
              className="text-sm text-zinc-500 hover:text-red-800"
            >
              ← Dashboard
            </Link>

            <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
              LAZY JENNIE
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Master Recipe
            </h1>

            <p className="mt-2 text-zinc-500">
              Recipe / BOM Management
            </p>

          </div>


          <Link
            href="/dashboard/recipes/new"
            className="rounded-xl bg-red-900 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
          >
            + New Recipe
          </Link>

        </div>


        {/* SUMMARY */}

        <div className="mb-8 grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Total Recipes
            </p>

            <p className="mt-2 text-3xl font-bold">
              {recipes?.length || 0}
            </p>

          </div>


          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Active Recipes
            </p>

            <p className="mt-2 text-3xl font-bold text-green-700">

              {
                (recipes || []).filter(
                  (recipe) =>
                    recipe.is_active
                ).length
              }

            </p>

          </div>


          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Total BOM Lines
            </p>

            <p className="mt-2 text-3xl font-bold">
              {recipeItems?.length || 0}
            </p>

          </div>

        </div>


        {/* ERROR */}

        {error && (

          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error.message}
          </div>

        )}


        {/* TABLE */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">

            <h2 className="font-bold">
              Recipe List
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Production recipe definitions
            </p>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">

                <tr>

                  <th className="px-6 py-4">
                    Recipe Code
                  </th>

                  <th className="px-6 py-4">
                    Recipe Name
                  </th>

                  <th className="px-6 py-4">
                    Output Item
                  </th>

                  <th className="px-6 py-4 text-right">
                    Yield
                  </th>

                  <th className="px-6 py-4 text-right">
                    Ingredients
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>

                </tr>

              </thead>


              <tbody className="divide-y divide-zinc-100">

                {(recipes || []).map(
                  (recipe) => {

                    const outputItem =
                      itemMap.get(
                        recipe.output_item_id
                      )


                    const outputUnit =
                      unitMap.get(
                        recipe.output_unit_id
                      )


                    return (

                      <tr
                        key={recipe.id}
                        className="hover:bg-zinc-50"
                      >

                        <td className="px-6 py-4 font-bold text-red-900">
                          {recipe.code}
                        </td>


                        <td className="px-6 py-4">

                          <p className="font-medium">
                            {recipe.name}
                          </p>

                          {recipe.notes && (

                            <p className="mt-1 text-xs text-zinc-400">
                              {recipe.notes}
                            </p>

                          )}

                        </td>


                        <td className="px-6 py-4">

                          <p className="font-medium">
                            {outputItem?.name || '-'}
                          </p>

                          <p className="text-xs text-zinc-400">
                            {outputItem?.sku || ''}
                          </p>

                        </td>


                        <td className="px-6 py-4 text-right font-semibold">

                          {formatNumber(
                            recipe.output_qty
                          )}

                          {' '}

                          {outputUnit?.code || ''}

                        </td>


                        <td className="px-6 py-4 text-right font-semibold">

                          {
                            ingredientCount.get(
                              recipe.id
                            ) || 0
                          }

                        </td>


                        <td className="px-6 py-4">

                          {recipe.is_active ? (

                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              Active
                            </span>

                          ) : (

                            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-500">
                              Inactive
                            </span>

                          )}

                        </td>

                      </tr>

                    )

                  }
                )}

              </tbody>

            </table>


            {!recipes?.length && (

              <div className="p-12 text-center">

                <p className="font-semibold">
                  No Recipe Yet
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Create your first production recipe.
                </p>

              </div>

            )}

          </div>

        </div>

      </div>

    </main>
  )
}
