'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Outlet = {
  id: string
  code: string
  name: string
  type: string
}

type Recipe = {
  id: string
  code: string
  name: string
  output_item_id: string
  output_qty: number
  output_unit_id: string
}

type RecipeItem = {
  recipe_id: string
  ingredient_item_id: string
  qty: number
  unit_id: string
  conversion_factor: number
  base_qty: number
}

type Item = {
  id: string
  sku: string
  name: string
  base_unit_id: string
  item_type: string
}

type Unit = {
  id: string
  code: string
  symbol: string
}

type Stock = {
  outlet_id: string
  item_id: string
  stock_qty: number
  base_unit_code: string
}

export default function ProductionForm({
  outlets,
  recipes,
  recipeItems,
  items,
  units,
  stock,
}: {
  outlets: Outlet[]
  recipes: Recipe[]
  recipeItems: RecipeItem[]
  items: Item[]
  units: Unit[]
  stock: Stock[]
}) {
  const router = useRouter()

  const [outletId, setOutletId] =
    useState('')

  const [recipeId, setRecipeId] =
    useState('')

  const [batchCount, setBatchCount] =
    useState('1')

  const [productionDate, setProductionDate] =
    useState(() => {
      return new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }
      ).format(new Date())
    })

  const [notes, setNotes] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  const selectedRecipe =
    recipes.find(
      (recipe) =>
        recipe.id === recipeId
    )

  const selectedOutputItem =
    items.find(
      (item) =>
        item.id ===
        selectedRecipe?.output_item_id
    )

  const selectedOutputUnit =
    units.find(
      (unit) =>
        unit.id ===
        selectedRecipe?.output_unit_id
    )

  const components =
    useMemo(() => {

      if (!recipeId) {
        return []
      }

      return recipeItems.filter(
        (row) =>
          row.recipe_id === recipeId
      )

    }, [
      recipeId,
      recipeItems,
    ])

  const requirements =
    components.map(
      (component) => {

        const item =
          items.find(
            (row) =>
              row.id ===
              component.ingredient_item_id
          )

        const unit =
          units.find(
            (row) =>
              row.id ===
              component.unit_id
          )

        const stockRow =
          stock.find(
            (row) =>
              row.outlet_id === outletId &&
              row.item_id ===
                component.ingredient_item_id
          )

        const batch =
          Number(batchCount || 0)

        const sourceRequired =
          Number(component.qty) *
          batch

        const baseRequired =
          Number(component.base_qty) *
          batch

        const available =
          Number(
            stockRow?.stock_qty || 0
          )

        return {
          component,
          item,
          unit,
          sourceRequired,
          baseRequired,
          available,
          enough:
            available >= baseRequired,
          baseUnitCode:
            stockRow?.base_unit_code || '',
        }
      }
    )

  const totalOutput =
    Number(
      selectedRecipe?.output_qty || 0
    ) *
    Number(batchCount || 0)

  const allStockEnough =
    requirements.length > 0 &&
    requirements.every(
      (row) =>
        row.enough
    )

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

  async function submitProduction() {

    setErrorMessage('')

    if (!outletId) {
      setErrorMessage(
        'Pilih Central Kitchen.'
      )
      return
    }

    if (!recipeId) {
      setErrorMessage(
        'Pilih recipe.'
      )
      return
    }

    if (
      Number(batchCount) <= 0
    ) {
      setErrorMessage(
        'Batch count harus lebih besar dari 0.'
      )
      return
    }

    if (!components.length) {
      setErrorMessage(
        'Recipe belum memiliki ingredient.'
      )
      return
    }

    if (!allStockEnough) {
      setErrorMessage(
        'Stock ingredient tidak mencukupi.'
      )
      return
    }

    const confirmed =
      window.confirm(
        `Post Production?\n\n` +
        `${selectedRecipe?.name || ''}\n` +
        `Batch: ${batchCount}\n` +
        `Output: ${formatNumber(totalOutput)} ${selectedOutputUnit?.code || ''}\n\n` +
        `Ingredient stock akan langsung berkurang dan output stock akan bertambah.`
      )

    if (!confirmed) {
      return
    }

    setLoading(true)

    const supabase =
      createClient()

    const { error } =
      await supabase.rpc(
        'create_posted_production',
        {
          p_outlet_id:
            outletId,

          p_recipe_id:
            recipeId,

          p_batch_count:
            Number(batchCount),

          p_production_date:
            productionDate,

          p_notes:
            notes,
        }
      )

    if (error) {
      setLoading(false)

      setErrorMessage(
        error.message
      )

      return
    }

    router.push(
      '/dashboard/production'
    )

    router.refresh()
  }

  return (
    <div className="mt-8 space-y-6">

      <div className="grid gap-5 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-4">

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Central Kitchen
          </label>

          <select
            value={outletId}
            onChange={(e) =>
              setOutletId(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
          >
            <option value="">
              Select Central Kitchen
            </option>

            {outlets.map(
              (outlet) => (
                <option
                  key={outlet.id}
                  value={outlet.id}
                >
                  {outlet.code} - {outlet.name}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Recipe
          </label>

          <select
            value={recipeId}
            onChange={(e) =>
              setRecipeId(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
          >
            <option value="">
              Select Recipe
            </option>

            {recipes.map(
              (recipe) => (
                <option
                  key={recipe.id}
                  value={recipe.id}
                >
                  {recipe.code} - {recipe.name}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Batch Count
          </label>

          <input
            type="number"
            min="0.0001"
            step="0.0001"
            value={batchCount}
            onChange={(e) =>
              setBatchCount(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Production Date
          </label>

          <input
            type="date"
            value={productionDate}
            onChange={(e) =>
              setProductionDate(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
          />
        </div>

        <div className="md:col-span-4">
          <label className="mb-2 block text-sm font-semibold">
            Notes
          </label>

          <input
            value={notes}
            onChange={(e) =>
              setNotes(
                e.target.value
              )
            }
            placeholder="Production notes..."
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
          />
        </div>

      </div>

      {selectedRecipe && (
        <div className="rounded-2xl bg-red-950 p-6 text-white shadow-sm">

          <p className="text-sm text-red-200">
            Production Output
          </p>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">

            <div>
              <h2 className="text-2xl font-bold">
                {selectedOutputItem?.name || '-'}
              </h2>

              <p className="mt-1 text-sm text-red-200">
                {selectedOutputItem?.sku || ''}
              </p>
            </div>

            <div className="text-right">

              <p className="text-3xl font-bold">
                {formatNumber(
                  totalOutput
                )}{' '}
                {selectedOutputUnit?.code || ''}
              </p>

              <p className="mt-1 text-sm text-red-200">
                {batchCount} Batch
              </p>

            </div>

          </div>
        </div>
      )}

      {selectedRecipe && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 p-6">

            <h2 className="text-lg font-bold">
              Ingredient Requirement
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              System checks current stock before production can be posted.
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">
                <tr>

                  <th className="px-5 py-4">
                    Ingredient
                  </th>

                  <th className="px-5 py-4 text-right">
                    Recipe Qty
                  </th>

                  <th className="px-5 py-4 text-right">
                    Required
                  </th>

                  <th className="px-5 py-4 text-right">
                    Available Stock
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">

                {requirements.map(
                  (row) => (
                    <tr
                      key={
                        row.component
                          .ingredient_item_id
                      }
                    >

                      <td className="px-5 py-4">

                        <p className="font-medium">
                          {row.item?.name || '-'}
                        </p>

                        <p className="text-xs text-zinc-400">
                          {row.item?.sku || ''}
                        </p>

                      </td>

                      <td className="px-5 py-4 text-right">
                        {formatNumber(
                          Number(
                            row.component.qty
                          )
                        )}{' '}
                        {row.unit?.code || ''}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold">
                        {formatNumber(
                          row.sourceRequired
                        )}{' '}
                        {row.unit?.code || ''}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold">
                        {formatNumber(
                          row.available
                        )}{' '}
                        {row.baseUnitCode}
                      </td>

                      <td className="px-5 py-4">

                        {row.enough ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Ready
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                            Insufficient
                          </span>
                        )}

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl bg-red-50 p-4 font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {selectedRecipe && (
        <div className="flex justify-end">

          <button
            type="button"
            disabled={
              loading ||
              !outletId ||
              !allStockEnough
            }
            onClick={submitProduction}
            className="rounded-xl bg-red-900 px-8 py-4 font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading
              ? 'Posting Production...'
              : 'Post Production'}
          </button>

        </div>
      )}

    </div>
  )
}
