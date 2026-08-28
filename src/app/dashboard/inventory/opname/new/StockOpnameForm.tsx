'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Outlet = {
  id: string
  code: string
  name: string
}

type StockRow = {
  outlet_id: string
  item_id: string
  sku: string
  item_name: string
  category_name: string | null
  stock_qty: number
  base_unit_code: string
}

type PhysicalValue = {
  [itemId: string]: string
}

type NoteValue = {
  [itemId: string]: string
}

export default function StockOpnameForm({
  outlets,
  stock,
}: {
  outlets: Outlet[]
  stock: StockRow[]
}) {
  const router = useRouter()

  const [outletId, setOutletId] =
    useState('')

  const [opnameDate, setOpnameDate] =
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

  const [physical, setPhysical] =
    useState<PhysicalValue>({})

  const [itemNotes, setItemNotes] =
    useState<NoteValue>({})

  const [loading, setLoading] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')


  const rows = useMemo(() => {
    if (!outletId) {
      return []
    }

    return stock.filter(
      (row) =>
        row.outlet_id === outletId
    )
  }, [
    outletId,
    stock,
  ])


  const countedItems = rows.filter(
    (row) =>
      physical[row.item_id] !== undefined &&
      physical[row.item_id] !== ''
  )


  const varianceItems =
    countedItems.filter((row) => {

      const actual =
        Number(
          physical[row.item_id]
        )

      return (
        actual !==
        Number(row.stock_qty)
      )
    })


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


  function getDifference(
    row: StockRow
  ) {
    const input =
      physical[row.item_id]

    if (
      input === undefined ||
      input === ''
    ) {
      return null
    }

    return (
      Number(input) -
      Number(row.stock_qty)
    )
  }


  async function submitOpname() {

    setErrorMessage('')


    if (!outletId) {
      setErrorMessage(
        'Pilih location terlebih dahulu.'
      )
      return
    }


    if (!countedItems.length) {
      setErrorMessage(
        'Isi minimal satu physical quantity.'
      )
      return
    }


    const invalid =
      countedItems.some(
        (row) =>
          Number(
            physical[row.item_id]
          ) < 0
      )


    if (invalid) {
      setErrorMessage(
        'Physical quantity tidak boleh negatif.'
      )
      return
    }


    const confirmed =
      window.confirm(
        `Post Stock Opname?\n\n` +
        `Counted: ${countedItems.length} items\n` +
        `Variance: ${varianceItems.length} items\n\n` +
        `Setelah diposting, selisih stock akan langsung masuk ke Stock Ledger.`
      )


    if (!confirmed) {
      return
    }


    setLoading(true)


    const supabase =
      createClient()


    const { error } =
      await supabase.rpc(
        'create_posted_stock_opname',
        {
          p_outlet_id:
            outletId,

          p_opname_date:
            opnameDate,

          p_notes:
            notes,

          p_items:
            countedItems.map(
              (row) => ({
                item_id:
                  row.item_id,

                physical_qty:
                  Number(
                    physical[
                      row.item_id
                    ]
                  ),

                notes:
                  itemNotes[
                    row.item_id
                  ] || '',
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
      '/dashboard/inventory/opname'
    )

    router.refresh()
  }


  return (
    <div className="mt-8 space-y-6">

      {/* HEADER */}

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

              setPhysical({})
              setItemNotes({})
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
            Opname Date
          </label>

          <input
            type="date"
            value={opnameDate}
            onChange={(e) =>
              setOpnameDate(
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
            placeholder="Monthly stock opname..."
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
          />
        </div>

      </div>


      {/* SUMMARY */}

      {outletId && (
        <div className="grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">
              Inventory Items
            </p>

            <p className="mt-2 text-3xl font-bold">
              {rows.length}
            </p>
          </div>


          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">
              Counted
            </p>

            <p className="mt-2 text-3xl font-bold">
              {countedItems.length}
            </p>
          </div>


          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">
              Variance
            </p>

            <p className="mt-2 text-3xl font-bold text-red-700">
              {varianceItems.length}
            </p>
          </div>

        </div>
      )}


      {/* TABLE */}

      {outletId && (

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 p-6">

            <h2 className="text-lg font-bold">
              Physical Count
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Leave blank if the item is not counted.
            </p>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-5 py-4">
                    SKU
                  </th>

                  <th className="px-5 py-4">
                    Item
                  </th>

                  <th className="px-5 py-4">
                    Category
                  </th>

                  <th className="px-5 py-4 text-right">
                    System
                  </th>

                  <th className="px-5 py-4 text-right">
                    Physical
                  </th>

                  <th className="px-5 py-4">
                    Unit
                  </th>

                  <th className="px-5 py-4 text-right">
                    Difference
                  </th>

                  <th className="px-5 py-4">
                    Notes
                  </th>
                </tr>
              </thead>


              <tbody className="divide-y divide-zinc-100">

                {rows.map(
                  (row) => {

                    const difference =
                      getDifference(
                        row
                      )

                    return (

                      <tr
                        key={row.item_id}
                        className="hover:bg-zinc-50"
                      >

                        <td className="px-5 py-4 font-semibold text-red-900">
                          {row.sku}
                        </td>


                        <td className="px-5 py-4 font-medium">
                          {row.item_name}
                        </td>


                        <td className="px-5 py-4 text-zinc-500">
                          {row.category_name || '-'}
                        </td>


                        <td className="px-5 py-4 text-right font-semibold">
                          {formatNumber(
                            row.stock_qty
                          )}
                        </td>


                        <td className="px-5 py-4 text-right">

                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={
                              physical[
                                row.item_id
                              ] ?? ''
                            }
                            onChange={(e) =>
                              setPhysical({
                                ...physical,

                                [row.item_id]:
                                  e.target.value,
                              })
                            }
                            className="w-32 rounded-lg border border-zinc-300 px-3 py-2 text-right"
                          />

                        </td>


                        <td className="px-5 py-4">
                          {row.base_unit_code}
                        </td>


                        <td className="px-5 py-4 text-right">

                          {difference === null ? (

                            <span className="text-zinc-400">
                              -
                            </span>

                          ) : difference === 0 ? (

                            <span className="font-semibold text-green-700">
                              0
                            </span>

                          ) : (

                            <span
                              className={
                                difference > 0
                                  ? 'font-bold text-green-700'
                                  : 'font-bold text-red-700'
                              }
                            >

                              {difference > 0
                                ? '+'
                                : ''}

                              {formatNumber(
                                difference
                              )}

                            </span>

                          )}

                        </td>


                        <td className="px-5 py-4">

                          <input
                            value={
                              itemNotes[
                                row.item_id
                              ] || ''
                            }
                            onChange={(e) =>
                              setItemNotes({
                                ...itemNotes,

                                [row.item_id]:
                                  e.target.value,
                              })
                            }
                            placeholder="Optional"
                            className="w-40 rounded-lg border border-zinc-300 px-3 py-2"
                          />

                        </td>

                      </tr>

                    )

                  }
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


      {outletId && (

        <div className="flex justify-end">

          <button
            type="button"
            disabled={loading}
            onClick={submitOpname}
            className="rounded-xl bg-red-900 px-8 py-4 font-bold text-white hover:bg-red-800 disabled:opacity-50"
          >

            {loading
              ? 'Posting...'
              : 'Post Stock Opname'}

          </button>

        </div>

      )}

    </div>
  )
}
