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

export default async function ProductionPage() {
  const supabase = await createClient()

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

  const productionPermission = permissions.find(
    (row) => row.module_code === 'PRODUCTION'
  )

  const canCreateProduction = Boolean(
    productionPermission?.can_create &&
      productionPermission?.can_post
  )

  const canViewCost = permissions.some(
    (row) =>
      row.can_view === true &&
      [
        'INVENTORY_VALUATION',
        'COSTING',
      ].includes(row.module_code)
  )

  const canViewRecipes = permissions.some(
    (row) =>
      row.module_code === 'MASTER_RECIPE' &&
      row.can_view === true
  )

  const {
    data: productions,
    error,
  } = await supabase
    .from('production_runs_secure')
    .select(`
      id,
      production_no,
      production_date,
      outlet_id,
      recipe_id,
      batch_count,
      output_item_id,
      output_qty,
      output_unit_id,
      output_base_qty,
      total_input_cost,
      output_unit_cost,
      status,
      notes,
      posted_at,
      created_at
    `)
    .order('created_at', {
      ascending: false,
    })

  const { data: outlets } = await supabase
    .from('outlets')
    .select(`
      id,
      code,
      name
    `)

  const { data: recipes } = await supabase
    .from('recipes_secure')
    .select(`
      id,
      code,
      name
    `)

  const { data: items } = await supabase
    .from('items')
    .select(`
      id,
      sku,
      name
    `)

  const { data: units } = await supabase
    .from('units')
    .select(`
      id,
      code
    `)

  const { data: productionItems } = await supabase
    .from('production_run_items_secure')
    .select(`
      production_id
    `)

  const outletMap = new Map(
    (outlets || []).map((row) => [
      row.id,
      row,
    ])
  )

  const recipeMap = new Map(
    (recipes || []).map((row) => [
      row.id,
      row,
    ])
  )

  const itemMap = new Map(
    (items || []).map((row) => [
      row.id,
      row,
    ])
  )

  const unitMap = new Map(
    (units || []).map((row) => [
      row.id,
      row,
    ])
  )

  const componentCount =
    new Map<string, number>()

  for (const row of productionItems || []) {
    componentCount.set(
      row.production_id,
      (componentCount.get(row.production_id) || 0) + 1
    )
  }

  const postedCount =
    (productions || []).filter(
      (row) => row.status === 'POSTED'
    ).length

  const totalProductionValue =
    (productions || []).reduce(
      (total, row) =>
        total +
        Number(row.total_input_cost || 0),
      0
    )

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

  function formatRupiah(
    value: number | string | null
  ) {
    return new Intl.NumberFormat(
      'id-ID',
      {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }
    ).format(Number(value || 0))
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-7xl">

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
              Central Kitchen Production
            </h1>

            <p className="mt-2 text-zinc-500">
              Production, WIP & Finished Goods
            </p>
          </div>

          <div className="flex flex-wrap gap-3">

            {canViewRecipes && (
              <Link
                href="/dashboard/recipes"
                className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
              >
                Master Recipe
              </Link>
            )}

            {canCreateProduction && (
              <Link
                href="/dashboard/production/new"
                className="rounded-xl bg-red-900 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
              >
                + New Production
              </Link>
            )}

          </div>
        </div>

        <div
          className={`mb-8 grid gap-4 ${
            canViewCost
              ? 'md:grid-cols-3'
              : 'md:grid-cols-2'
          }`}
        >

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Production Runs
            </p>

            <p className="mt-2 text-3xl font-bold">
              {productions?.length || 0}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Posted
            </p>

            <p className="mt-2 text-3xl font-bold text-green-700">
              {postedCount}
            </p>
          </div>

          {canViewCost && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-zinc-500">
                Production Value
              </p>

              <p className="mt-2 text-2xl font-bold">
                {formatRupiah(
                  totalProductionValue
                )}
              </p>
            </div>
          )}

        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error.message}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">
            <h2 className="font-bold">
              Production History
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Posted Central Kitchen production
            </p>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-5 py-4">
                    Production No
                  </th>

                  <th className="px-5 py-4">
                    Date
                  </th>

                  <th className="px-5 py-4">
                    Location
                  </th>

                  <th className="px-5 py-4">
                    Recipe
                  </th>

                  <th className="px-5 py-4">
                    Output
                  </th>

                  <th className="px-5 py-4 text-right">
                    Batch
                  </th>

                  <th className="px-5 py-4 text-right">
                    Ingredients
                  </th>

                  {canViewCost && (
                    <th className="px-5 py-4 text-right">
                      Cost
                    </th>
                  )}

                  <th className="px-5 py-4">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">

                {(productions || []).map(
                  (production) => {
                    const outlet =
                      outletMap.get(
                        production.outlet_id
                      )

                    const recipe =
                      recipeMap.get(
                        production.recipe_id
                      )

                    const outputItem =
                      itemMap.get(
                        production.output_item_id
                      )

                    const outputUnit =
                      unitMap.get(
                        production.output_unit_id
                      )

                    return (
                      <tr
                        key={production.id}
                        className="hover:bg-zinc-50"
                      >

                        <td className="px-5 py-4 font-bold text-red-900">
                          {production.production_no}
                        </td>

                        <td className="px-5 py-4">
                          {production.production_date}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-medium">
                            {outlet?.name || '-'}
                          </p>

                          <p className="text-xs text-zinc-400">
                            {outlet?.code || ''}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-medium">
                            {recipe?.name || '-'}
                          </p>

                          <p className="text-xs text-zinc-400">
                            {recipe?.code || ''}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-medium">
                            {outputItem?.name || '-'}
                          </p>

                          <p className="text-xs text-zinc-400">
                            {formatNumber(
                              production.output_qty
                            )}{' '}
                            {outputUnit?.code || ''}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-right font-semibold">
                          {formatNumber(
                            production.batch_count
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold">
                          {
                            componentCount.get(
                              production.id
                            ) || 0
                          }
                        </td>

                        {canViewCost && (
                          <td className="px-5 py-4 text-right">

                            <p className="font-semibold">
                              {formatRupiah(
                                production.total_input_cost
                              )}
                            </p>

                            <p className="text-xs text-zinc-400">
                              {formatRupiah(
                                production.output_unit_cost
                              )} / base
                            </p>

                          </td>
                        )}

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            {production.status}
                          </span>
                        </td>

                      </tr>
                    )
                  }
                )}

              </tbody>
            </table>

            {!productions?.length && (
              <div className="p-12 text-center">

                <p className="font-semibold">
                  No Production Yet
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Create your first Central Kitchen production.
                </p>

              </div>
            )}

          </div>
        </div>

      </div>
    </main>
  )
}
