import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PurchaseMonitoringPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // =====================================================
  // PURCHASE ORDERS
  // =====================================================

  const { data: purchaseOrders } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      po_no,
      order_date,
      expected_date,
      supplier_id,
      outlet_id,
      status,
      total_amount,
      created_at
    `)
    .order('created_at', {
      ascending: false,
    })

  // =====================================================
  // PO ITEMS
  // =====================================================

  const { data: poItems } = await supabase
    .from('purchase_order_items')
    .select(`
      purchase_order_id,
      order_qty,
      conversion_factor,
      base_qty,
      received_base_qty,
      unit_price,
      total_amount
    `)

  // =====================================================
  // SUPPLIERS
  // =====================================================

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select(`
      id,
      code,
      name
    `)

  const supplierMap = new Map(
    (suppliers || []).map(
      (supplier) => [
        supplier.id,
        supplier,
      ]
    )
  )

  // =====================================================
  // VALUE PER PO
  // =====================================================

  const valueMap = new Map<
    string,
    {
      ordered: number
      received: number
      outstanding: number
    }
  >()

  for (const row of poItems || []) {

    const current =
      valueMap.get(
        row.purchase_order_id
      ) || {
        ordered: 0,
        received: 0,
        outstanding: 0,
      }

    const factor =
      Number(
        row.conversion_factor || 1
      )

    const orderQty =
      Number(
        row.order_qty || 0
      )

    const receivedQty =
      Number(
        row.received_base_qty || 0
      ) / factor

    const outstandingQty =
      Math.max(
        orderQty - receivedQty,
        0
      )

    const price =
      Number(
        row.unit_price || 0
      )

    current.ordered +=
      orderQty * price

    current.received +=
      receivedQty * price

    current.outstanding +=
      outstandingQty * price

    valueMap.set(
      row.purchase_order_id,
      current
    )
  }

  // =====================================================
  // GLOBAL SUMMARY
  // =====================================================

  let orderedValue = 0
  let receivedValue = 0
  let outstandingValue = 0

  for (const value of valueMap.values()) {
    orderedValue += value.ordered
    receivedValue += value.received
    outstandingValue += value.outstanding
  }

  const openCount =
    (purchaseOrders || []).filter(
      (po) =>
        po.status === 'POSTED'
    ).length

  const partialCount =
    (purchaseOrders || []).filter(
      (po) =>
        po.status ===
        'PARTIALLY_RECEIVED'
    ).length

  const completedCount =
    (purchaseOrders || []).filter(
      (po) =>
        po.status ===
        'FULLY_RECEIVED'
    ).length

  // =====================================================
  // SUPPLIER SUMMARY
  // =====================================================

  const supplierSummary = new Map<
    string,
    {
      poCount: number
      ordered: number
      received: number
      outstanding: number
    }
  >()

  for (const po of purchaseOrders || []) {

    const current =
      supplierSummary.get(
        po.supplier_id
      ) || {
        poCount: 0,
        ordered: 0,
        received: 0,
        outstanding: 0,
      }

    const values =
      valueMap.get(
        po.id
      ) || {
        ordered: 0,
        received: 0,
        outstanding: 0,
      }

    current.poCount += 1
    current.ordered += values.ordered
    current.received += values.received
    current.outstanding += values.outstanding

    supplierSummary.set(
      po.supplier_id,
      current
    )
  }

  const supplierRows =
    Array.from(
      supplierSummary.entries()
    )
      .map(
        ([supplierId, summary]) => ({
          supplierId,
          supplier:
            supplierMap.get(
              supplierId
            ),
          ...summary,
        })
      )
      .sort(
        (a, b) =>
          b.ordered -
          a.ordered
      )

  // =====================================================
  // FORMAT
  // =====================================================

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

  function statusClass(
    status: string
  ) {
    if (
      status ===
      'FULLY_RECEIVED'
    ) {
      return 'bg-green-100 text-green-700'
    }

    if (
      status ===
      'PARTIALLY_RECEIVED'
    ) {
      return 'bg-amber-100 text-amber-700'
    }

    return 'bg-blue-100 text-blue-700'
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-8">

          <Link
            href="/dashboard/purchasing"
            className="text-sm text-zinc-500 hover:text-red-800"
          >
            ← Purchasing
          </Link>

          <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Purchase Monitoring
          </h1>

          <p className="mt-2 text-zinc-500">
            Purchase value, receiving progress and supplier monitoring
          </p>

        </div>

        {/* VALUE SUMMARY */}

        <div className="mb-6 grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Ordered Value
            </p>

            <p className="mt-2 text-2xl font-bold">
              {formatRupiah(
                orderedValue
              )}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Received Value
            </p>

            <p className="mt-2 text-2xl font-bold text-green-700">
              {formatRupiah(
                receivedValue
              )}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Outstanding Value
            </p>

            <p className="mt-2 text-2xl font-bold text-amber-700">
              {formatRupiah(
                outstandingValue
              )}
            </p>

          </div>

        </div>

        {/* STATUS SUMMARY */}

        <div className="mb-8 grid gap-4 md:grid-cols-4">

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Total PO
            </p>

            <p className="mt-2 text-3xl font-bold">
              {purchaseOrders?.length || 0}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Open
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-700">
              {openCount}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Partial
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-700">
              {partialCount}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Fully Received
            </p>

            <p className="mt-2 text-3xl font-bold text-green-700">
              {completedCount}
            </p>

          </div>

        </div>

        {/* SUPPLIER PERFORMANCE */}

        <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">

            <h2 className="font-bold">
              Supplier Purchase Summary
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Purchase and receiving value by supplier
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">

                <tr>

                  <th className="px-5 py-4">
                    Supplier
                  </th>

                  <th className="px-5 py-4 text-right">
                    PO
                  </th>

                  <th className="px-5 py-4 text-right">
                    Ordered
                  </th>

                  <th className="px-5 py-4 text-right">
                    Received
                  </th>

                  <th className="px-5 py-4 text-right">
                    Outstanding
                  </th>

                  <th className="px-5 py-4 text-right">
                    Completion
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-zinc-100">

                {supplierRows.map(
                  (row) => {

                    const completion =
                      row.ordered > 0
                        ? (
                            row.received /
                            row.ordered
                          ) * 100
                        : 0

                    return (

                      <tr key={row.supplierId}>

                        <td className="px-5 py-4">

                          <p className="font-medium">
                            {row.supplier?.name || '-'}
                          </p>

                          <p className="text-xs text-zinc-400">
                            {row.supplier?.code || ''}
                          </p>

                        </td>

                        <td className="px-5 py-4 text-right font-semibold">
                          {row.poCount}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold">
                          {formatRupiah(
                            row.ordered
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-green-700">
                          {formatRupiah(
                            row.received
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-amber-700">
                          {formatRupiah(
                            row.outstanding
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-bold">
                          {completion.toFixed(1)}%
                        </td>

                      </tr>

                    )
                  }
                )}

              </tbody>

            </table>

          </div>

        </div>

        {/* PO MONITORING */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">

            <h2 className="font-bold">
              Purchase Order Monitoring
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Current receiving status of each PO
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">

                <tr>

                  <th className="px-5 py-4">
                    PO
                  </th>

                  <th className="px-5 py-4">
                    Supplier
                  </th>

                  <th className="px-5 py-4 text-right">
                    Ordered
                  </th>

                  <th className="px-5 py-4 text-right">
                    Received
                  </th>

                  <th className="px-5 py-4 text-right">
                    Outstanding
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-zinc-100">

                {(purchaseOrders || []).map(
                  (po) => {

                    const supplier =
                      supplierMap.get(
                        po.supplier_id
                      )

                    const values =
                      valueMap.get(
                        po.id
                      ) || {
                        ordered: 0,
                        received: 0,
                        outstanding: 0,
                      }

                    return (

                      <tr key={po.id}>

                        <td className="px-5 py-4">

                          <Link
                            href={`/dashboard/purchasing/${po.id}`}
                            className="font-bold text-red-900 hover:underline"
                          >
                            {po.po_no}
                          </Link>

                        </td>

                        <td className="px-5 py-4">
                          {supplier?.name || '-'}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold">
                          {formatRupiah(
                            values.ordered
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-green-700">
                          {formatRupiah(
                            values.received
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-amber-700">
                          {formatRupiah(
                            values.outstanding
                          )}
                        </td>

                        <td className="px-5 py-4">

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              po.status
                            )}`}
                          >
                            {po.status}
                          </span>

                        </td>

                      </tr>

                    )
                  }
                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </main>
  )
}
