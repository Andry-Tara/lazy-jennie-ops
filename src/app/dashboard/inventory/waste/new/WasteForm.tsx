'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Outlet = {
  id: string
  code: string
  name: string
}

type StockItem = {
  outlet_id: string
  item_id: string
  sku: string
  item_name: string
  category_name: string | null
  stock_qty: number
  base_unit_id: string
  base_unit_code: string
}

type WasteRow = {
  item_id: string
  qty: string
  reason: string
  notes: string
}

export default function WasteForm({
  outlets,
  stock,
}: {
  outlets: Outlet[]
  stock: StockItem[]
}) {
  const router = useRouter()

  const [outletId, setOutletId] =
    useState('')

  const [wasteDate, setWasteDate] =
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

  const [rows, setRows] =
    useState<WasteRow[]>([
      {
        item_id: '',
        qty: '',
        reason: 'SPOILED',
        notes: '',
      },
    ])

  // =====================================================
  // ITEMS AVAILABLE AT LOCATION
  // =====================================================

  const availableItems =
    useMemo(() => {

      if (!outletId) {
        return []
      }

      return stock.filter(
        (item) =>
          item.outlet_id === outletId
      )

    }, [
      outletId,
      stock,
    ])

  // =====================================================
  // ADD ROW
  // =====================================================

  function addRow() {

    setRows([
      ...rows,
      {
        item_id: '',
        qty: '',
        reason: 'SPOILED',
        notes: '',
      },
    ])

  }

  // =====================================================
  // REMOVE ROW
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
  // UPDATE ROW
  // =====================================================

  function updateRow(
    index: number,
    field: keyof WasteRow,
    value: string
  ) {

    const updated = [...rows]

    updated[index] = {
      ...updated[index],
      [field]: value,
    }

    setRows(updated)

  }

  // =====================================================
  // ITEM LOOKUP
  // =====================================================

  function getStockItem(
    itemId: string
  ) {

    return availableItems.find(
      (item) =>
        item.item_id === itemId
    )

  }

  // =====================================================
  // FORMAT
  // =====================================================

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

  // =====================================================
  // SUBMIT
  // =====================================================

  async function submitWaste() {

    setErrorMessage('')


    if (!outletId) {

      setErrorMessage(
        'Pilih location terlebih dahulu.'
      )

      return
    }


    const validRows =
      rows.filter(
        (row) =>
          row.item_id &&
          Number(row.qty) > 0
      )


    if (!validRows.length) {

      setErrorMessage(
        'Masukkan minimal satu waste item.'
      )

      return
    }


    for (const row of validRows) {

      const item =
        getStockItem(
          row.item_id
        )


      if (!item) {

        setErrorMessage(
          'Item inventory tidak ditemukan.'
        )

        return
      }


      if (
        Number(row.qty) >
        Number(item.stock_qty)
      ) {

        setErrorMessage(
          `${item.item_name}: Waste ${row.qty} ${item.base_unit_code} melebihi stock ${formatNumber(item.stock_qty)} ${item.base_unit_code}.`
        )

        return
      }

    }


    const confirmed =
      window.confirm(
        `Post Waste Transaction?\n\n` +
        `${validRows.length} item(s)\n\n` +
        `Stock akan langsung berkurang dan transaksi tidak dapat diedit setelah diposting.`
      )


    if (!confirmed) {
      return
    }


    setLoading(true)


    const supabase =
      createClient()


    const { error } =
      await supabase.rpc(
        'create_posted_waste',
        {

          p_outlet_id:
            outletId,

          p_waste_date:
            wasteDate,

          p_notes:
            notes,

          p_items:
            validRows.map(
              (row) => {

                const item =
                  getStockItem(
                    row.item_id
                  )!

                return {

                  item_id:
                    row.item_id,

                  qty:
                    Number(
                      row.qty
                    ),

                  unit_id:
                    item.base_unit_id,

                  reason:
                    row.reason,

                  notes:
                    row.notes,

                }

              }
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
      '/dashboard/inventory/waste'
    )

    router.refresh()

  }

  return (
    <div className="mt-8 space-y-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="grid gap-5 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-3">

        <div>

          <label className="mb-2 block text-sm font-semibold">
            Location
          </label>

          <select
            value={outletId}
            onChange={(e) => {

              setOutletId(
                e.target.value
              )

              setRows([
                {
                  item_id: '',
                  qty: '',
                  reason: 'SPOILED',
                  notes: '',
                },
              ])

            }}
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
          >

            <option value="">
              Select Location
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
            Waste Date
          </label>

          <input
            type="date"
            value={wasteDate}
            onChange={(e) =>
              setWasteDate(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
          />

        </div>


        <div>

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
            placeholder="Kitchen waste..."
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
          />

        </div>

      </div>


      {/* =====================================================
          WASTE TABLE
      ===================================================== */}

      {outletId && (

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 p-6">

            <h2 className="text-lg font-bold">
              Waste Items
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Quantity uses the inventory base unit.
            </p>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">

                <tr>

                  <th className="px-4 py-4">
                    Item
                  </th>

                  <th className="px-4 py-4 text-right">
                    Current Stock
                  </th>

                  <th className="px-4 py-4">
                    Waste Qty
                  </th>

                  <th className="px-4 py-4">
                    Unit
                  </th>

                  <th className="px-4 py-4">
                    Reason
                  </th>

                  <th className="px-4 py-4">
                    Notes
                  </th>

                  <th className="px-4 py-4">
                  </th>

                </tr>

              </thead>


              <tbody className="divide-y divide-zinc-100">

                {rows.map(
                  (row, index) => {

                    const selectedItem =
                      getStockItem(
                        row.item_id
                      )

                    return (

                      <tr key={index}>

                        {/* ITEM */}

                        <td className="px-4 py-4">

                          <select
                            value={
                              row.item_id
                            }
                            onChange={(e) =>
                              updateRow(
                                index,
                                'item_id',
                                e.target.value
                              )
                            }
                            className="min-w-64 rounded-lg border border-zinc-300 px-3 py-2"
                          >

                            <option value="">
                              Select Item
                            </option>

                            {availableItems.map(
                              (item) => (

                                <option
                                  key={
                                    item.item_id
                                  }
                                  value={
                                    item.item_id
                                  }
                                >

                                  {item.sku} - {item.item_name}

                                </option>

                              )
                            )}

                          </select>

                        </td>


                        {/* CURRENT STOCK */}

                        <td className="px-4 py-4 text-right font-semibold">

                          {selectedItem
                            ? formatNumber(
                                selectedItem.stock_qty
                              )
                            : '-'}

                        </td>


                        {/* QTY */}

                        <td className="px-4 py-4">

                          <input
                            type="number"
                            min="0"
                            step="0.001"
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


                        {/* UNIT */}

                        <td className="px-4 py-4 font-medium">

                          {selectedItem
                            ?.base_unit_code ||
                            '-'}

                        </td>


                        {/* REASON */}

                        <td className="px-4 py-4">

                          <select
                            value={
                              row.reason
                            }
                            onChange={(e) =>
                              updateRow(
                                index,
                                'reason',
                                e.target.value
                              )
                            }
                            className="rounded-lg border border-zinc-300 px-3 py-2"
                          >

                            <option value="EXPIRED">
                              Expired
                            </option>

                            <option value="SPOILED">
                              Spoiled
                            </option>

                            <option value="KITCHEN_ERROR">
                              Kitchen Error
                            </option>

                            <option value="DAMAGED">
                              Damaged
                            </option>

                            <option value="OVERPRODUCTION">
                              Overproduction
                            </option>

                            <option value="OTHER">
                              Other
                            </option>

                          </select>

                        </td>


                        {/* NOTES */}

                        <td className="px-4 py-4">

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
                            className="w-44 rounded-lg border border-zinc-300 px-3 py-2"
                          />

                        </td>


                        {/* REMOVE */}

                        <td className="px-4 py-4">

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

                  }
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
              + Add Item
            </button>

          </div>

        </div>

      )}


      {/* =====================================================
          ERROR
      ===================================================== */}

      {errorMessage && (

        <div className="rounded-xl bg-red-50 p-4 font-medium text-red-700">
          {errorMessage}
        </div>

      )}


      {/* =====================================================
          POST BUTTON
      ===================================================== */}

      {outletId && (

        <div className="flex justify-end">

          <button
            type="button"
            disabled={loading}
            onClick={submitWaste}
            className="rounded-xl bg-red-900 px-8 py-4 font-bold text-white hover:bg-red-800 disabled:opacity-50"
          >

            {loading
              ? 'Posting...'
              : 'Post Waste'}

          </button>

        </div>

      )}

    </div>
  )
}
