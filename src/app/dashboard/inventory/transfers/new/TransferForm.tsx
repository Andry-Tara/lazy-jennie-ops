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

type TransferRow = {
  item_id: string
  qty: string
  notes: string
}

export default function TransferForm({
  outlets,
  stock,
}: {
  outlets: Outlet[]
  stock: StockItem[]
}) {
  const router = useRouter()

  const [fromOutletId, setFromOutletId] =
    useState('')

  const [toOutletId, setToOutletId] =
    useState('')

  const [transferDate, setTransferDate] =
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
    useState<TransferRow[]>([
      {
        item_id: '',
        qty: '',
        notes: '',
      },
    ])


  const availableItems =
    useMemo(() => {

      if (!fromOutletId) {
        return []
      }

      return stock.filter(
        (item) =>
          item.outlet_id === fromOutletId &&
          Number(item.stock_qty) > 0
      )

    }, [
      fromOutletId,
      stock,
    ])


  function addRow() {

    setRows([
      ...rows,
      {
        item_id: '',
        qty: '',
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


  function updateRow(
    index: number,
    field: keyof TransferRow,
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


  function getStockItem(
    itemId: string
  ) {

    return availableItems.find(
      (item) =>
        item.item_id === itemId
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


  async function submitTransfer() {

    setErrorMessage('')


    if (!fromOutletId) {

      setErrorMessage(
        'Pilih source location.'
      )

      return
    }


    if (!toOutletId) {

      setErrorMessage(
        'Pilih destination location.'
      )

      return
    }


    if (
      fromOutletId ===
      toOutletId
    ) {

      setErrorMessage(
        'Source dan destination tidak boleh sama.'
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
        'Masukkan minimal satu transfer item.'
      )

      return
    }


    const uniqueItems =
      new Set(
        validRows.map(
          (row) =>
            row.item_id
        )
      )


    if (
      uniqueItems.size !==
      validRows.length
    ) {

      setErrorMessage(
        'Item yang sama tidak boleh dimasukkan dua kali.'
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
          'Item stock tidak ditemukan.'
        )

        return
      }


      if (
        Number(row.qty) >
        Number(item.stock_qty)
      ) {

        setErrorMessage(
          `${item.item_name}: Transfer ${row.qty} ${item.base_unit_code} melebihi stock ${formatNumber(item.stock_qty)} ${item.base_unit_code}.`
        )

        return
      }

    }


    const confirmed =
      window.confirm(
        `Post Stock Transfer?\n\n` +
        `${validRows.length} item(s)\n\n` +
        `Stock source akan berkurang dan stock destination akan bertambah.`
      )


    if (!confirmed) {
      return
    }


    setLoading(true)


    const supabase =
      createClient()


    const { error } =
      await supabase.rpc(
        'create_posted_stock_transfer',
        {

          p_from_outlet_id:
            fromOutletId,

          p_to_outlet_id:
            toOutletId,

          p_transfer_date:
            transferDate,

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

                  batch_no:
                    '',

                  expiry_date:
                    '',

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
      '/dashboard/inventory/transfers'
    )

    router.refresh()

  }


  return (
    <div className="mt-8 space-y-6">

      {/* HEADER */}

      <div className="grid gap-5 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-4">

        <div>

          <label className="mb-2 block text-sm font-semibold">
            From Location
          </label>

          <select
            value={fromOutletId}
            onChange={(e) => {

              setFromOutletId(
                e.target.value
              )

              setToOutletId('')

              setRows([
                {
                  item_id: '',
                  qty: '',
                  notes: '',
                },
              ])

            }}
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
          >

            <option value="">
              Select Source
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
            To Location
          </label>

          <select
            value={toOutletId}
            disabled={!fromOutletId}
            onChange={(e) =>
              setToOutletId(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 disabled:bg-zinc-100"
          >

            <option value="">
              Select Destination
            </option>

            {outlets
              .filter(
                (outlet) =>
                  outlet.id !==
                  fromOutletId
              )
              .map(
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
            Transfer Date
          </label>

          <input
            type="date"
            value={transferDate}
            onChange={(e) =>
              setTransferDate(
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
            placeholder="CK delivery..."
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
          />

        </div>

      </div>


      {/* ITEMS */}

      {fromOutletId && (

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 p-6">

            <h2 className="text-lg font-bold">
              Transfer Items
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Quantity uses inventory base unit.
            </p>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">

                <tr>

                  <th className="px-5 py-4">
                    Item
                  </th>

                  <th className="px-5 py-4 text-right">
                    Available
                  </th>

                  <th className="px-5 py-4">
                    Transfer Qty
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
                  (row, index) => {

                    const selectedItem =
                      getStockItem(
                        row.item_id
                      )

                    return (

                      <tr key={index}>

                        <td className="px-5 py-4">

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
                            className="min-w-72 rounded-lg border border-zinc-300 px-3 py-2"
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


                        <td className="px-5 py-4 text-right font-semibold">

                          {selectedItem
                            ? formatNumber(
                                selectedItem.stock_qty
                              )
                            : '-'}

                        </td>


                        <td className="px-5 py-4">

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


                        <td className="px-5 py-4 font-medium">

                          {selectedItem
                            ?.base_unit_code ||
                            '-'}

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
                            className="w-44 rounded-lg border border-zinc-300 px-3 py-2"
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


      {errorMessage && (

        <div className="rounded-xl bg-red-50 p-4 font-medium text-red-700">
          {errorMessage}
        </div>

      )}


      {fromOutletId && toOutletId && (

        <div className="flex justify-end">

          <button
            type="button"
            disabled={loading}
            onClick={submitTransfer}
            className="rounded-xl bg-red-900 px-8 py-4 font-bold text-white hover:bg-red-800 disabled:opacity-50"
          >

            {loading
              ? 'Posting...'
              : 'Post Stock Transfer'}

          </button>

        </div>

      )}

    </div>
  )
}
