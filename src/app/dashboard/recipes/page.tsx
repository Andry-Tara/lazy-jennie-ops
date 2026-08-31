import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type PermissionRow = {
  module_code: string
  can_view: boolean
  can_create: boolean
  can_update: boolean
  can_post: boolean
  can_approve: boolean
}

export default async function RecipesPage() {
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

  const { data: permissionData } = await supabase.rpc(
    'get_my_permissions'
  )

  const permissions = (permissionData || []) as PermissionRow[]

  const recipePermission = permissions.find(
    (row) => row.module_code === 'MASTER_RECIPE'
  )

  const canCreateRecipe = Boolean(
    recipePermission?.can_create
  )

  const canUpdateRecipe = Boolean(
    recipePermission?.can_update
  )

  // =====================================================
  // RECIPES
  // =====================================================

  const {
    data: recipes,
    error,
  } = await supabase
    .from('recipes_secure')
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
    .from('items_secure')
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
    .from('units_secure')
    .select(`
      id,
      code,
      symbol
    `)

  // =====================================================
  // RECIPE ITEMS
  // =====================================================

  const { data: recipeItems } = await supabase
    .from('recipe_items_secure')
    .select(`
      recipe_id,
      ingredient_item_id
    `)

  // =====================================================
  // LOOKUP MAP
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

  // =====================================================
  // SUMMARY
  // =====================================================

  const totalRecipes =
    recipes?.length || 0

  const activeRecipes =
    (recipes || []).filter(
      (recipe) =>
        recipe.is_active
    ).length

  const totalBomLines =
    recipeItems?.length || 0

  // =====================================================
  // FORMAT
  // =====================================================

  function formatNumber(
    value: number | string | null
  ) {
    return Number(value || 0).toLocaleString(
      'id-ID',
      {
        maximumFractionDigits: 3,
      }
    )
  }

  function itemTypeLabel(
    type: string | undefined
  ) {
    if (!type) {
      return '-'
    }

    if (type === 'RAW_MATERIAL') {
      return 'Raw Material'
    }

    if (type === 'WIP') {
      return 'WIP'
    }

    if (type === 'FINISHED_GOOD') {
      return 'Finished Good'
    }

    if (type === 'PACKAGING') {
      return 'Packaging'
    }

    if (type === 'CONSUMABLE') {
      return 'Consumable'
    }

    return type
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-7xl">

        {/* =====================================================
            HEADER
        ===================================================== */}

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


          <div className="flex flex-wrap gap-3">

            <Link
              href="/dashboard/items"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
            >
              Master Item
            </Link>

            {canCreateRecipe && (
              <Link
                href="/dashboard/recipes/new"
                className="rounded-xl bg-red-900 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
              >
                + New Recipe
              </Link>
            )}

          </div>

        </div>


        {/* =====================================================
            SUMMARY
        ===================================================== */}

        <div className="mb-8 grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Total Recipes
            </p>

            <p className="mt-2 text-3xl font-bold">
              {totalRecipes}
            </p>

          </div>


          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Active Recipes
            </p>

            <p className="mt-2 text-3xl font-bold text-green-700">
              {activeRecipes}
            </p>

          </div>


          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Total BOM Lines
            </p>

            <p className="mt-2 text-3xl font-bold">
              {totalBomLines}
            </p>

          </div>

        </div>


        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (

          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error.message}
          </div>

        )}


        {/* =====================================================
            RECIPE TABLE
        ===================================================== */}

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

                  <th className="px-6 py-4">
                    Type
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

                  <th className="px-6 py-4">
                    Action
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

                    const bomCount =
                      ingredientCount.get(
                        recipe.id
                      ) || 0

                    return (

                      <tr
                        key={recipe.id}
                        className="hover:bg-zinc-50"
                      >

                        {/* RECIPE CODE */}

                        <td className="px-6 py-4">

                          <p className="font-bold text-red-900">
                            {recipe.code}
                          </p>

                        </td>


                        {/* RECIPE NAME */}

                        <td className="px-6 py-4">

                          <p className="font-medium">
                            {recipe.name}
                          </p>

                          {recipe.notes && (

                            <p className="mt-1 max-w-xs text-xs text-zinc-400">
                              {recipe.notes}
                            </p>

                          )}

                        </td>


                        {/* OUTPUT ITEM */}

                        <td className="px-6 py-4">

                          <p className="font-medium">
                            {outputItem?.name || '-'}
                          </p>

                          <p className="mt-1 text-xs text-zinc-400">
                            {outputItem?.sku || ''}
                          </p>

                        </td>


                        {/* TYPE */}

                        <td className="px-6 py-4">

                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                            {itemTypeLabel(
                              outputItem?.item_type
                            )}
                          </span>

                        </td>


                        {/* YIELD */}

                        <td className="px-6 py-4 text-right">

                          <p className="font-semibold">

                            {formatNumber(
                              recipe.output_qty
                            )}

                            {' '}

                            {outputUnit?.code || ''}

                          </p>

                        </td>


                        {/* INGREDIENT COUNT */}

                        <td className="px-6 py-4 text-right">

                          <span className="font-semibold">
                            {bomCount}
                          </span>

                        </td>


                        {/* STATUS */}

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


                        {/* ACTION */}

                        <td className="px-6 py-4">

                          {canUpdateRecipe ? (
                            <Link
                              href={`/dashboard/recipes/${recipe.id}/edit`}
                              className="inline-flex rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
                            >
                              Edit
                            </Link>
                          ) : (
                            <span className="text-xs text-zinc-400">
                              View only
                            </span>
                          )}

                        </td>

                      </tr>

                    )

                  }
                )}

              </tbody>

            </table>


            {/* =====================================================
                EMPTY STATE
            ===================================================== */}

            {!recipes?.length && (

              <div className="p-12 text-center">

                <p className="font-semibold text-zinc-700">
                  No Recipe Yet
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Create your first production recipe.
                </p>

                {canCreateRecipe && (
                  <Link
                    href="/dashboard/recipes/new"
                    className="mt-5 inline-block rounded-xl bg-red-900 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
                  >
                    + New Recipe
                  </Link>
                )}

              </div>

            )}

          </div>

        </div>

      </div>

    </main>
  )
}
