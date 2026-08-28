'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type PurchaseOrder = {
  id: string
  po_no: string
  order_date: string
  expected_date: string | null
  outlet_id: string
  supplier_id: string
  status: string
  total_amount: number
  notes: string | null
}

type POItem = {
  id: string
  purchase_order_id: string
  item_id: string
  order_qty: number
  unit_id: string
  conversion_factor: number
  base_qty: number
  received_base_qty: number
  unit_price: number
  total_amount: number
  notes: string | null
  created_at: string
}

type Supplier = {
  id: string
  code: string
  name: string
} | null

type Outlet = {
  id: string
  code: string
  name: string
} | null

type Item = {
  id: string
  sku: string
  name: string
  track_batch: boolean
  track_expiry: boolean
}

type Unit = {
  id: string
  code: string
  name: string
  symbol: string
}

type ValueMap = {
  [id: string]: string
}

export default function POReceivingForm({
  purchaseOrder,
  poItems,
  supplier,
  outlet,
  items,
  units,
}: {
  purchaseOrder: PurchaseOrder
  poItems: POItem[]
  supplier: Supplier
  outlet: Outlet
  items: Item[]
  units: Unit[]
}) {
  const router = useRouter()

  const [receivingDate, setReceivingDate] =
    useState(() =>
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }
      ).format(new Date())
    )

  const [invoiceNo, setInvoiceNo] =
    useState('')

  const [notes, setNotes] =
    useState('')

  const [receiveQty, setReceiveQty] =
    useState<ValueMap>({})

  const [batchNo, setBatchNo] =
    useState<ValueMap>({})

  const [expiryDate, setExpiryDate] =
    useState<ValueMap>({})

  const [itemNotes, setItemNotes] =
    useState<ValueMap>({})

  const [loading, setLoading] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  // =====================================================
  // LOOKUPS
  // =====================================================

  const itemMap = useMemo(
    () =>
      new Map(
        items.map((item) => [
          item.id,
          item,
        ])
      ),
    [items]
  )

  const unitMap = useMemo(
    () =>
      new Map(
        units.map((unit) => [
          unit.id,
          unit,
        ])
      ),
    [units]
  )

  // =====================================================
  // CALCULATIONS
  // =====================================================

  function getOrderedQty(
    row: POItem
  ) {
    return Number(row.order_qty || 0)
  }

  function getReceivedQty(
    row: POItem
  ) {
    const factor =
      Number(
        row.conversion_factor || 1
      )

    return (
      Number(
        row.received_base_qty || 0
      ) / factor
    )
  }

  function getOutstandingQty(
    row: POItem
  ) {
    return Math.max(
      getOrderedQty(row) -
        getReceivedQty(row),
      0
    )
  }

  const enteredRows =
    poItems.filter((row) => {
      const value =
        receiveQty[row.id]

      return (
        value !== undefined &&
        value !== '' &&
        Number(value) > 0
      )
    })

  const receivingTotal =
    enteredRows.reduce(
      (total, row) =>
        total +
        Number(
          receiveQty[row.id] || 0
        ) *
          Number(
            row.unit_price || 0
          ),
      0
    )

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

  // =====================================================
  // FILL OUTSTANDING
  // =====================================================

  function fillOutstanding(
    row: POItem
  ) {
    setReceiveQty({
      ...receiveQty,
      [row.id]:
        String(
          getOutstandingQty(row)
        ),
    })
  }

  // =====================================================
  // SUBMIT
  // =====================================================

  async function submitReceiving() {
    setErrorMessage('')

    if (!enteredRows.length) {
      setErrorMessage(
        'Masukkan minimal satu Received Now.'
      )
      return
    }

    for (const row of enteredRows) {
      const qty =
        Number(
          receiveQty[row.id] || 0
        )

      if (
        qty >
        getOutstandingQty(row)
      ) {
        const item =
          itemMap.get(
            row.item_id
          )

        setErrorMessage(
          `${item?.name || 'Item'}: Received Now melebihi Outstanding Qty.`
        )

        return
      }
    }

    const confirmed =
      window.confirm(
        `Post PO Receiving?\n\n` +
          `${purchaseOrder.po_no}\n` +
          `${enteredRows.length} item(s)\n` +
          `Receiving Value: ${formatRupiah(receivingTotal)}\n\n` +
          `Stock akan langsung bertambah.`
      )

    if (!confirmed) {
      return
    }

    setLoading(true)

    const supabase =
      createClient()

    const { error } =
      await supabase.rpc(
        'create_posted_po_receiving',
        {
          p_purchase_order_id:
            purchaseOrder.id,

          p_receiving_date:
            receivingDate,

          p_invoice_no:
            invoiceNo,

          p_notes:
            notes,

          p_items:
            enteredRows.map(
              (row) => ({
                purchase_order_item_id:
                  row.id,

                qty:
                  Number(
                    receiveQty[row.id]
                  ),

                batch_no:
                  batchNo[row.id] || '',

                expiry_date:
                  expiryDate[row.id] || '',

                notes:
                  itemNotes[row.id] || '',
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

      {/* PO HEADER */}

      <div className="grid gap-5 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-4">

        <div>
          <p className="text-sm text-zinc-500">
            Purchase Order
          </p>

          <p className="mt-1 font-bold text-red-900">
            {purchaseOrder.po_no}
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-500">
            Supplier
          </p>

          <p className="mt-1 font-semibold">
            {supplier?.name || '-'}
          </p>

          <p className="text-xs text-zinc-400">
            {supplier?.code || ''}
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-500">
            Receiving Location
          </p>

          <p className="mt-1 font-semibold">
            {outlet?.name || '-'}
          </p>

          <p className="text-xs text-zinc-400">
            {outlet?.code || ''}
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-500">
            PO Status
          </p>

          <p className="mt-1 font-semibold">
            {purchaseOrder.status}
          </p>
        </div>

      </div>

      {/* RECEIVING HEADER */}

      <div className="grid gap-5 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-3">

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Receiving Date
          </label>

          <input
            type="date"
            value={receivingDate}
            onChange={(e) =>
              setReceivingDate(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Supplier Invoice No
          </label>

          <input
            value={invoiceNo}
            onChange={(e) =>
              setInvoiceNo(
                e.target.value
              )
            }
            placeholder="INV-..."
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
            placeholder="Receiving notes..."
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
          />
        </div>

      </div>

      {/* ITEMS */}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

        <div className="border-b border-zinc-200 p-6">

          <h2 className="text-lg font-bold">
            Purchase Order Items
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Enter only goods physically received now.
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
                  PO Qty
                </th>

                <th className="px-4 py-4 text-right">
                  Received
                </th>

                <th className="px-4 py-4 text-right">
                  Outstanding
                </th>

                <th className="px-4 py-4">
                  Receive Now
                </th>

                <th className="px-4 py-4">
                  Unit
                </th>

                <th className="px-4 py-4 text-right">
                  Price
                </th>

                <th className="px-4 py-4">
                  Batch
                </th>

                <th className="px-4 py-4">
                  Expiry
                </th>
              </tr>

            </thead>

            <tbody className="divide-y divide-zinc-100">

              {poItems.map((row) => {

                const item =
                  itemMap.get(
                    row.item_id
                  )

                const unit =
                  unitMap.get(
                    row.unit_id
                  )

                const outstanding =
                  getOutstandingQty(row)

                const complete =
                  outstanding <= 0

                return (
                  <tr
                    key={row.id}
                    className={
                      complete
                        ? 'bg-zinc-50'
                        : ''
                    }
                  >

                    <td className="px-4 py-4">

                      <p className="font-medium">
                        {item?.name || '-'}
                      </p>

                      <p className="text-xs text-zinc-400">
                        {item?.sku || ''}
                      </p>

                    </td>

                    <td className="px-4 py-4 text-right font-semibold">
                      {formatNumber(
                        getOrderedQty(row)
                      )}
                    </td>

                    <td className="px-4 py-4 text-right">
                      {formatNumber(
                        getReceivedQty(row)
                      )}
                    </td>

                    <td className="px-4 py-4 text-right font-bold">
                      {formatNumber(
                        outstanding
                      )}
                    </td>

                    <td className="px-4 py-4">

                      {complete ? (
                        <span className="font-semibold text-green-700">
                          Complete
                        </span>
                      ) : (
                        <div className="flex gap-2">

                          <input
                            type="number"
                            min="0"
                            max={outstanding}
                            step="0.001"
                            value={
                              receiveQty[
                                row.id
                              ] ?? ''
                            }
                            onChange={(e) =>
                              setReceiveQty({
                                ...receiveQty,
                                [row.id]:
                                  e.target.value,
                              })
                            }
                            className="w-28 rounded-lg border border-zinc-300 px-3 py-2 text-right"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              fillOutstanding(row)
                            }
                            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold"
                          >
                            All
                          </button>

                        </div>
                      )}

                    </td>

                    <td className="px-4 py-4 font-semibold">
                      {unit?.code || '-'}
                    </td>

                    <td className="px-4 py-4 text-right">
                      {formatRupiah(
                        Number(
                          row.unit_price || 0
                        )
                      )}
                    </td>

                    <td className="px-4 py-4">

                      <input
                        disabled={complete}
                        value={
                          batchNo[
                            row.id
                          ] || ''
                        }
                        onChange={(e) =>
                          setBatchNo({
                            ...batchNo,
                            [row.id]:
                              e.target.value,
                          })
                        }
                        placeholder="Optional"
                        className="w-36 rounded-lg border border-zinc-300 px-3 py-2 disabled:bg-zinc-100"
                      />

                    </td>

                    <td className="px-4 py-4">

                      <input
                        type="date"
                        disabled={complete}
                        value={
                          expiryDate[
                            row.id
                          ] || ''
                        }
                        onChange={(e) =>
                          setExpiryDate({
                            ...expiryDate,
                            [row.id]:
                              e.target.value,
                          })
                        }
                        className="rounded-lg border border-zinc-300 px-3 py-2 disabled:bg-zinc-100"
                      />

                    </td>

                  </tr>
                )
              })}

            </tbody>

          </table>

        </div>

        <div className="flex justify-end border-t border-zinc-200 p-5">

          <div className="text-right">

            <p className="text-sm text-zinc-500">
              Receiving Value
            </p>

            <p className="mt-1 text-2xl font-bold">
              {formatRupiah(
                receivingTotal
              )}
            </p>

          </div>

        </div>

      </div>

      {errorMessage && (
        <div className="rounded-xl bg-red-50 p-4 font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {purchaseOrder.status ===
      'FULLY_RECEIVED' ? (

        <div className="rounded-xl bg-green-50 p-5 font-semibold text-green-700">
          This Purchase Order is fully received.
        </div>

      ) : (

        <div className="flex justify-end">

          <button
            type="button"
            disabled={
              loading ||
              !enteredRows.length
            }
            onClick={submitReceiving}
            className="rounded-xl bg-red-900 px-8 py-4 font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading
              ? 'Posting Receiving...'
              : 'Post Receiving'}
          </button>

        </div>

      )}

    </div>
  )
}
