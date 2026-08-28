'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'


type Item = {
  id: string
  sku: string
  name: string
  item_type: string
  base_unit_id: string
  purchase_unit_id: string | null
}


type Unit = {
  id: string
  code: string
  name: string
  symbol: string
}


type IngredientRow = {
  item_id: string
  qty: string
  unit_id: string
  notes: string
}


export default function RecipeForm({
  items,
  units,
}: {
  items: Item[]
  units: Unit[]
}) {

  const router = useRouter()


  const [code, setCode] =
    useState('')


  const [name, setName] =
    useState('')


  const [outputItemId, setOutputItemId] =
    useState('')


  const [outputQty, setOutputQty] =
    useState('1')


  const [outputUnitId, setOutputUnitId] =
    useState('')


  const [notes, setNotes] =
    useState('')


  const [loading, setLoading] =
    useState(false)


  const [errorMessage, setErrorMessage] =
    useState('')


  const [rows, setRows] =
    useState<IngredientRow[]>([
      {
        item_id: '',
        qty: '',
        unit_id: '',
        notes: '',
      },
    ])


  // =====================================================
  // OUTPUT ITEM
  // =====================================================

  function changeOutputItem(
    itemId: string
  ) {

    setOutputItemId(
      itemId
    )


    const item =
      items.find(
        (row) =>
          row.id === itemId
      )


    if (item) {

      setOutputUnitId(
        item.base_unit_id
      )

    } else {

      setOutputUnitId('')

    }

  }


  // =====================================================
  // ADD INGREDIENT
  // =====================================================

  function addRow() {

    setRows([
      ...rows,
      {
        item_id: '',
        qty: '',
        unit_id: '',
        notes: '',
      },
    ])

  }


  // =====================================================
  // REMOVE INGREDIENT
  // =====================================================

  function removeRow(
    index: number
  ) {

    if (rows.length === 1) {
      return
    }


    setRows(
      rows.filter(
        (_, rowIndex) =>
          rowIndex !== index
      )
    )

  }


  // =====================================================
  // CHANGE INGREDIENT ITEM
  // =====================================================

  function changeIngredientItem(
    index: number,
    itemId: string
  ) {

    const updated =
      [...rows]


    const item =
      items.find(
        (row) =>
          row.id === itemId
      )


    updated[index] = {
      ...updated[index],

      item_id:
        itemId,

      unit_id:
        item?.base_unit_id || '',
    }


    setRows(updated)

  }


  // =====================================================
  // UPDATE INGREDIENT
  // =====================================================

  function updateRow(
    index: number,
    field: keyof IngredientRow,
    value: string
  ) {

    const updated =
      [...rows]


    updated[index] = {
      ...updated[index],
      [field]: value,
    }


    setRows(updated)

  }


  // =====================================================
  // SUBMIT
  // =====================================================

  async function submitRecipe() {

    setErrorMessage('')


    if (!code.trim()) {

      setErrorMessage(
        'Recipe code wajib diisi.'
      )

      return

    }


    if (!name.trim()) {

      setErrorMessage(
        'Recipe name wajib diisi.'
      )

      return

    }


    if (!outputItemId) {

      setErrorMessage(
        'Pilih output item.'
      )

      return

    }


    if (
      !outputUnitId ||
      Number(outputQty) <= 0
    ) {

      setErrorMessage(
        'Output quantity / unit belum valid.'
      )

      return

    }


    const validRows =
      rows.filter(
        (row) =>
          row.item_id &&
          Number(row.qty) > 0 &&
          row.unit_id
      )


    if (!validRows.length) {

      setErrorMessage(
        'Masukkan minimal satu ingredient.'
      )

      return

    }


    if (
      validRows.some(
        (row) =>
          row.item_id ===
          outputItemId
      )
    ) {

      setErrorMessage(
        'Output item tidak boleh menjadi ingredient dirinya sendiri.'
      )

      return

    }


    const uniqueIngredients =
      new Set(
        validRows.map(
          (row) =>
            row.item_id
        )
      )


    if (
      uniqueIngredients.size !==
      validRows.length
    ) {

      setErrorMessage(
        'Ingredient yang sama tidak boleh dimasukkan dua kali.'
      )

      return

    }


    const confirmed =
      window.confirm(
        `Create Recipe?\n\n` +
        `${name}\n` +
        `${validRows.length} ingredient(s)`
      )


    if (!confirmed) {
      return
    }


    setLoading(true)


    const supabase =
      createClient()


    const { error } =
      await supabase.rpc(
        'create_recipe_definition',
        {

          p_code:
            code,

          p_name:
            name,

          p_output_item_id:
            outputItemId,

          p_output_qty:
            Number(outputQty),

          p_output_unit_id:
            outputUnitId,

          p_notes:
            notes,

          p_items:
            validRows.map(
              (row) => ({

                item_id:
                  row.item_id,

                qty:
                  Number(
                    row.qty
                  ),

                unit_id:
                  row.unit_id,

                notes:
                  row.notes,

              })
            ),

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
      '/dashboard/recipes'
    )


    router.refresh()

  }


  return (
    <div className="mt-8 space-y-6">


      {/* RECIPE HEADER */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">

        <h2 className="text-lg font-bold">
          Recipe Information
        </h2>


        <div className="mt-6 grid gap-5 md:grid-cols-2">


          <div>

            <label className="mb-2 block text-sm font-semibold">
              Recipe Code
            </label>

            <input
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value.toUpperCase()
                )
              }
              placeholder="RCP-001"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />

          </div>


          <div>

            <label className="mb-2 block text-sm font-semibold">
              Recipe Name
            </label>

            <input
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
              placeholder="Chicken Filling"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />

          </div>


          <div>

            <label className="mb-2 block text-sm font-semibold">
              Output Item
            </label>

            <select
              value={outputItemId}
              onChange={(e) =>
                changeOutputItem(
                  e.target.value
                )
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            >

              <option value="">
                Select Output Item
              </option>

              {items.map(
                (item) => (

                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.sku} - {item.name} [{item.item_type}]
                  </option>

                )
              )}

            </select>

          </div>


          <div className="grid grid-cols-2 gap-3">

            <div>

              <label className="mb-2 block text-sm font-semibold">
                Output Qty
              </label>

              <input
                type="number"
                min="0.0001"
                step="0.0001"
                value={outputQty}
                onChange={(e) =>
                  setOutputQty(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-zinc-300 px-4 py-3"
              />

            </div>


            <div>

              <label className="mb-2 block text-sm font-semibold">
                Output Unit
              </label>

              <select
                value={outputUnitId}
                onChange={(e) =>
                  setOutputUnitId(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-zinc-300 px-4 py-3"
              >

                <option value="">
                  Unit
                </option>

                {units.map(
                  (unit) => (

                    <option
                      key={unit.id}
                      value={unit.id}
                    >
                      {unit.code}
                    </option>

                  )
                )}

              </select>

            </div>

          </div>


          <div className="md:col-span-2">

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
              placeholder="Optional recipe notes"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />

          </div>

        </div>

      </div>


      {/* INGREDIENTS */}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

        <div className="border-b border-zinc-200 p-6">

          <h2 className="text-lg font-bold">
            Ingredients / BOM
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Quantity is defined for one recipe batch.
          </p>

        </div>


        <div className="overflow-x-auto">

          <table className="w-full text-left text-sm">

            <thead className="bg-zinc-50 text-zinc-500">

              <tr>

                <th className="px-5 py-4">
                  Ingredient
                </th>

                <th className="px-5 py-4">
                  Qty
                </th>

                <th className="px-5 py-4">
                  Unit
                </th>

                <th className="px-5 py-4">
                  Notes
                </th>

                <th className="px-5 py-4">
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-zinc-100">

              {rows.map(
                (row, index) => (

                  <tr key={index}>


                    <td className="px-5 py-4">

                      <select
                        value={
                          row.item_id
                        }
                        onChange={(e) =>
                          changeIngredientItem(
                            index,
                            e.target.value
                          )
                        }
                        className="min-w-72 rounded-lg border border-zinc-300 px-3 py-2"
                      >

                        <option value="">
                          Select Ingredient
                        </option>


                        {items
                          .filter(
                            (item) =>
                              item.id !==
                              outputItemId
                          )
                          .map(
                            (item) => (

                              <option
                                key={
                                  item.id
                                }
                                value={
                                  item.id
                                }
                              >
                                {item.sku} - {item.name}
                              </option>

                            )
                          )}

                      </select>

                    </td>


                    <td className="px-5 py-4">

                      <input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={
                          row.qty
                        }
                        onChange={(e) =>
                          updateRow(
                            index,
                            'qty',
                            e.target.value
                          )
                        }
                        className="w-32 rounded-lg border border-zinc-300 px-3 py-2 text-right"
                      />

                    </td>


                    <td className="px-5 py-4">

                      <select
                        value={
                          row.unit_id
                        }
                        onChange={(e) =>
                          updateRow(
                            index,
                            'unit_id',
                            e.target.value
                          )
                        }
                        className="rounded-lg border border-zinc-300 px-3 py-2"
                      >

                        <option value="">
                          Unit
                        </option>


                        {units.map(
                          (unit) => (

                            <option
                              key={
                                unit.id
                              }
                              value={
                                unit.id
                              }
                            >
                              {unit.code}
                            </option>

                          )
                        )}

                      </select>

                    </td>


                    <td className="px-5 py-4">

                      <input
                        value={
                          row.notes
                        }
                        onChange={(e) =>
                          updateRow(
                            index,
                            'notes',
                            e.target.value
                          )
                        }
                        placeholder="Optional"
                        className="w-48 rounded-lg border border-zinc-300 px-3 py-2"
                      />

                    </td>


                    <td className="px-5 py-4">

                      <button
                        type="button"
                        onClick={() =>
                          removeRow(
                            index
                          )
                        }
                        className="font-semibold text-red-700"
                      >
                        Remove
                      </button>

                    </td>


                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>


        <div className="border-t border-zinc-200 p-5">

          <button
            type="button"
            onClick={addRow}
            className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-50"
          >
            + Add Ingredient
          </button>

        </div>

      </div>


      {/* ERROR */}

      {errorMessage && (

        <div className="rounded-xl bg-red-50 p-4 font-medium text-red-700">
          {errorMessage}
        </div>

      )}


      {/* SUBMIT */}

      <div className="flex justify-end">

        <button
          type="button"
          disabled={loading}
          onClick={submitRecipe}
          className="rounded-xl bg-red-900 px-8 py-4 font-bold text-white hover:bg-red-800 disabled:opacity-50"
        >

          {loading
            ? 'Saving...'
            : 'Save Recipe'}

        </button>

      </div>


    </div>
  )
}
