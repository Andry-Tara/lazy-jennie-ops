'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Outlet = {
  id: string
  code: string
  name: string
  type: string
}

type Supplier = {
  id: string
  code: string
  name: string
}

type Item = {
  id: string
  sku: string
  name: string
  item_type: string
  base_unit_id: string
  purchase_unit_id: string | null
  last_cost: number
}

type Unit = {
  id: string
  code: string
  name: string
  symbol: string
}

type Row = {
  item_id: string
  qty: string
  unit_id: string
  unit_price: string
  notes: string
}

export default function PurchaseOrderForm({
  outlets,
  suppliers,
  items,
  units,
}: {
  outlets: Outlet[]
  suppliers: Supplier[]
  items: Item[]
  units: Unit[]
}) {
  const router = useRouter()

  const [outletId, setOutletId] =
    useState('')

  const [supplierId, setSupplierId] =
    useState('')

  const [orderDate, setOrderDate] =
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

  const [expectedDate, setExpectedDate] =
    useState('')

  const [notes, setNotes] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  const [rows, setRows] =
    useState<Row[]>([
      {
        item_id: '',
        qty: '',
        unit_id: '',
        unit_price: '',
        notes: '',
      },
    ])

  function addRow() {
    setRows([
      ...rows,
      {
        item_id: '',
        qty: '',
        unit_id: '',
        unit_price: '',
        notes: '',
      },
    ])
  }

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

  function changeItem(
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
        item?.purchase_unit_id ||
        item?.base_unit_id ||
        '',

      unit_price:
        item?.last_cost
          ? String(item.last_cost)
          : '',
    }

    setRows(updated)
  }

  function updateRow(
    index: number,
    field: keyof Row,
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

  const validRows =
    rows.filter(
      (row) =>
        row.item_id &&
        Number(row.qty) > 0 &&
        row.unit_id
    )

  const total =
    validRows.reduce(
      (sum, row) =>
        sum +
        Number(row.qty) *
        Number(row.unit_price || 0),
      0
    )

  function formatRupiah(
    value: number
  ) {
    return new Intl.NumberFormat(
      'id-ID',
      {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }
    ).format(value)
  }

  async function submitPO() {
    setErrorMessage('')

    if (!outletId) {
      setErrorMessage(
        'Pilih receiving location.'
      )
      return
    }

    if (!supplierId) {
      setErrorMessage(
        'Pilih supplier.'
      )
      return
    }

    if (!validRows.length) {
      setErrorMessage(
        'Masukkan minimal satu item.'
      )
      return
    }

    const unique =
      new Set(
        validRows.map(
          (row) =>
            row.item_id
        )
      )

    if (
      unique.size !==
      validRows.length
    ) {
      setErrorMessage(
        'Item yang sama tidak boleh dimasukkan dua kali.'
      )
      return
    }

    const confirmed =
      window.confirm(
        `Post Purchase Order?\n\n` +
        `${validRows.length} item(s)\n` +
        `Total: ${formatRupiah(total)}`
      )

    if (!confirmed) {
      return
    }

    setLoading(true)

    const supabase =
      createClient()

    const { error } =
      await supabase.rpc(
        'create_posted_purchase_order',
        {
          p_outlet_id:
            outletId,

          p_supplier_id:
            supplierId,

          p_order_date:
            orderDate,

          p_expected_date:
            expectedDate || null,

          p_notes:
            notes,

          p_items:
            validRows.map(
              (row) => ({
                item_id:
                  row.item_id,

                qty:
                  Number(row.qty),

                unit_id:
                  row.unit_id,

                unit_price:
                  Number(
                    row.unit_price || 0
                  ),

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
      '/dashboard/purchasing'
    )

    router.refresh()
  }

  return (
    <div className="mt-8 space-y-6">

      <div className="grid gap-5 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-4">

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Location
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
            Supplier
          </label>

          <select
            value={supplierId}
            onChange={(e) =>
              setSupplierId(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
          >
            <option value="">
              Select Supplier
            </option>

            {suppliers.map(
              (supplier) => (
                <option
                  key={supplier.id}
                  value={supplier.id}
                >
                  {supplier.code} - {supplier.name}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            PO Date
          </label>

          <input
            type="date"
            value={orderDate}
            onChange={(e) =>
              setOrderDate(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Expected Delivery
          </label>

          <input
            type="date"
            value={expectedDate}
            onChange={(e) =>
              setExpectedDate(
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
            placeholder="Purchase notes..."
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
          />

        </div>

      </div>


      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

        <div className="border-b border-zinc-200 p-6">

          <h2 className="text-lg font-bold">
            Purchase Items
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Define quantity, purchasing unit and supplier price.
          </p>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-left text-sm">

            <thead className="bg-zinc-50 text-zinc-500">

              <tr>

                <th className="px-4 py-4">
                  Item
                </th>

                <th className="px-4 py-4">
                  Qty
                </th>

                <th className="px-4 py-4">
                  Unit
                </th>

                <th className="px-4 py-4 text-right">
                  Unit Price
                </th>

                <th className="px-4 py-4 text-right">
                  Total
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

                  const rowTotal =
                    Number(row.qty || 0) *
                    Number(
                      row.unit_price || 0
                    )

                  return (

                    <tr key={index}>

                      <td className="px-4 py-4">

                        <select
                          value={
                            row.item_id
                          }
                          onChange={(e) =>
                            changeItem(
                              index,
                              e.target.value
                            )
                          }
                          className="min-w-72 rounded-lg border border-zinc-300 px-3 py-2"
                        >

                          <option value="">
                            Select Item
                          </option>

                          {items.map(
                            (item) => (
                              <option
                                key={item.id}
                                value={item.id}
                              >
                                {item.sku} - {item.name}
                              </option>
                            )
                          )}

                        </select>

                      </td>

                      <td className="px-4 py-4">

                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={row.qty}
                          onChange={(e) =>
                            updateRow(
                              index,
                              'qty',
                              e.target.value
                            )
                          }
                          className="w-28 rounded-lg border border-zinc-300 px-3 py-2 text-right"
                        />

                      </td>

                      <td className="px-4 py-4">

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
                                key={unit.id}
                                value={unit.id}
                              >
                                {unit.code}
                              </option>
                            )
                          )}

                        </select>

                      </td>

                      <td className="px-4 py-4">

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            row.unit_price
                          }
                          onChange={(e) =>
                            updateRow(
                              index,
                              'unit_price',
                              e.target.value
                            )
                          }
                          className="w-40 rounded-lg border border-zinc-300 px-3 py-2 text-right"
                        />

                      </td>

                      <td className="px-4 py-4 text-right font-semibold">
                        {formatRupiah(
                          rowTotal
                        )}
                      </td>

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
                          className="w-40 rounded-lg border border-zinc-300 px-3 py-2"
                        />

                      </td>

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

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 p-5">

          <button
            type="button"
            onClick={addRow}
            className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-50"
          >
            + Add Item
          </button>

          <div className="text-right">

            <p className="text-sm text-zinc-500">
              Purchase Order Total
            </p>

            <p className="mt-1 text-2xl font-bold">
              {formatRupiah(total)}
            </p>

          </div>

        </div>

      </div>


      {errorMessage && (

        <div className="rounded-xl bg-red-50 p-4 font-medium text-red-700">
          {errorMessage}
        </div>

      )}


      <div className="flex justify-end">

        <button
          type="button"
          disabled={loading}
          onClick={submitPO}
          className="rounded-xl bg-red-900 px-8 py-4 font-bold text-white hover:bg-red-800 disabled:opacity-50"
        >

          {loading
            ? 'Posting PO...'
            : 'Post Purchase Order'}

        </button>

      </div>

    </div>
  )
}
