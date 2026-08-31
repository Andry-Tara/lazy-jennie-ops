import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PurchasingPage() {
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

  const { data: permissionData } =
    await supabase.rpc('get_my_permissions')

  const purchasingPermission =
    (permissionData || []).find(
      (row: {
        module_code: string
        can_create: boolean
        can_post: boolean
      }) =>
        row.module_code === 'PURCHASING'
    )

  const canCreatePurchaseOrder =
    Boolean(
      purchasingPermission?.can_create &&
      purchasingPermission?.can_post
    )

  // =====================================================
  // PURCHASE ORDERS
  // =====================================================

  const {
    data: purchaseOrders,
    error,
  } = await supabase
    .from('purchase_orders_secure')
    .select(`
      id,
      po_no,
      order_date,
      expected_date,
      outlet_id,
      supplier_id,
      status,
      total_amount,
      notes,
      created_at
    `)
    .order('created_at', {
      ascending: false,
    })

  // =====================================================
  // SUPPLIERS
  // =====================================================

  const { data: suppliers } = await supabase
    .from('suppliers_secure')
    .select(`
      id,
      code,
      name
    `)

  // =====================================================
  // OUTLETS
  // =====================================================

  const { data: outlets } = await supabase
    .from('outlets')
    .select(`
      id,
      code,
      name
    `)

  // =====================================================
  // PURCHASE ORDER ITEMS
  // =====================================================

  const { data: poItems } = await supabase
    .from('purchase_order_items_secure')
    .select(`
      purchase_order_id,
      base_qty,
      received_base_qty
    `)

  // =====================================================
  // LOOKUP MAP
  // =====================================================

  const supplierMap = new Map(
    (suppliers || []).map((row) => [
      row.id,
      row,
    ])
  )

  const outletMap = new Map(
    (outlets || []).map((row) => [
      row.id,
      row,
    ])
  )

  // =====================================================
  // PO PROGRESS
  // =====================================================

  const progressMap =
    new Map<
      string,
      {
        totalLines: number
        completedLines: number
        receivedLines: number
      }
    >()

  for (const item of poItems || []) {
    const current =
      progressMap.get(
        item.purchase_order_id
      ) || {
        totalLines: 0,
        completedLines: 0,
        receivedLines: 0,
      }

    current.totalLines += 1

    if (
      Number(
        item.received_base_qty || 0
      ) > 0
    ) {
      current.receivedLines += 1
    }

    if (
      Number(
        item.received_base_qty || 0
      ) >=
      Number(
        item.base_qty || 0
      )
    ) {
      current.completedLines += 1
    }

    progressMap.set(
      item.purchase_order_id,
      current
    )
  }

  // =====================================================
  // SUMMARY
  // =====================================================

  const totalPO =
    purchaseOrders?.length || 0

  const openCount =
    (purchaseOrders || []).filter(
      (row) =>
        row.status === 'POSTED'
    ).length

  const partialCount =
    (purchaseOrders || []).filter(
      (row) =>
        row.status ===
        'PARTIALLY_RECEIVED'
    ).length

  const fullCount =
    (purchaseOrders || []).filter(
      (row) =>
        row.status ===
        'FULLY_RECEIVED'
    ).length

  const cancelledCount =
    (purchaseOrders || []).filter(
      (row) =>
        row.status === 'CANCELLED'
    ).length

  const totalValue =
    (purchaseOrders || []).reduce(
      (total, row) =>
        total +
        Number(
          row.total_amount || 0
        ),
      0
    )

  // =====================================================
  // FORMAT
  // =====================================================

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
    ).format(
      Number(value || 0)
    )
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

    if (
      status === 'CANCELLED'
    ) {
      return 'bg-red-100 text-red-700'
    }

    if (
      status === 'DRAFT'
    ) {
      return 'bg-zinc-100 text-zinc-600'
    }

    return 'bg-blue-100 text-blue-700'
  }

  function statusLabel(
    status: string
  ) {
    if (
      status ===
      'PARTIALLY_RECEIVED'
    ) {
      return 'PARTIAL'
    }

    if (
      status ===
      'FULLY_RECEIVED'
    ) {
      return 'FULLY RECEIVED'
    }

    return status
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
              Purchasing
            </h1>

            <p className="mt-2 text-zinc-500">
              Purchase Order, Receiving & Supplier Purchasing
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <Link
              href="/dashboard/purchasing/monitoring"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
            >
              Purchase Monitoring
            </Link>

            <Link
              href="/dashboard/receiving"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
            >
              Receiving History
            </Link>

            {canCreatePurchaseOrder && (
              <Link
                href="/dashboard/purchasing/new"
                className="rounded-xl bg-red-900 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
              >
                + New Purchase Order
              </Link>
            )}

          </div>

        </div>

        {/* =====================================================
            SUMMARY
        ===================================================== */}

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-6">

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Total PO
            </p>

            <p className="mt-2 text-3xl font-bold">
              {totalPO}
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
              {fullCount}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Cancelled
            </p>

            <p className="mt-2 text-3xl font-bold text-red-700">
              {cancelledCount}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              PO Value
            </p>

            <p className="mt-2 text-xl font-bold">
              {formatRupiah(
                totalValue
              )}
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
            TABLE
        ===================================================== */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">

            <h2 className="font-bold">
              Purchase Order History
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Track ordered, received and outstanding Purchase Orders.
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">

                <tr>

                  <th className="px-5 py-4">
                    PO No
                  </th>

                  <th className="px-5 py-4">
                    Supplier
                  </th>

                  <th className="px-5 py-4">
                    Location
                  </th>

                  <th className="px-5 py-4">
                    Order Date
                  </th>

                  <th className="px-5 py-4">
                    Expected
                  </th>

                  <th className="px-5 py-4 text-right">
                    Progress
                  </th>

                  <th className="px-5 py-4 text-right">
                    Value
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                  <th className="px-5 py-4">
                    Action
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

                    const outlet =
                      outletMap.get(
                        po.outlet_id
                      )

                    const progress =
                      progressMap.get(
                        po.id
                      ) || {
                        totalLines: 0,
                        completedLines: 0,
                        receivedLines: 0,
                      }

                    const canReceive =
                      po.status === 'POSTED' ||
                      po.status ===
                        'PARTIALLY_RECEIVED'

                    return (

                      <tr
                        key={po.id}
                        className="hover:bg-zinc-50"
                      >

                        {/* PO NUMBER */}

                        <td className="px-5 py-4">

                          <Link
                            href={`/dashboard/purchasing/${po.id}`}
                            className="font-bold text-red-900 hover:underline"
                          >
                            {po.po_no}
                          </Link>

                        </td>

                        {/* SUPPLIER */}

                        <td className="px-5 py-4">

                          <p className="font-medium">
                            {supplier?.name || '-'}
                          </p>

                          <p className="text-xs text-zinc-400">
                            {supplier?.code || ''}
                          </p>

                        </td>

                        {/* LOCATION */}

                        <td className="px-5 py-4">

                          <p className="font-medium">
                            {outlet?.name || '-'}
                          </p>

                          <p className="text-xs text-zinc-400">
                            {outlet?.code || ''}
                          </p>

                        </td>

                        {/* ORDER DATE */}

                        <td className="px-5 py-4">
                          {po.order_date}
                        </td>

                        {/* EXPECTED */}

                        <td className="px-5 py-4">
                          {po.expected_date || '-'}
                        </td>

                        {/* PROGRESS */}

                        <td className="px-5 py-4 text-right">

                          <p className="font-semibold">
                            {progress.completedLines}
                            {' / '}
                            {progress.totalLines}
                          </p>

                          <p className="text-xs text-zinc-400">
                            item lines complete
                          </p>

                          {progress.receivedLines > 0 &&
                            progress.completedLines <
                              progress.totalLines && (

                            <p className="mt-1 text-xs font-semibold text-amber-600">
                              Receiving in progress
                            </p>

                          )}

                        </td>

                        {/* VALUE */}

                        <td className="px-5 py-4 text-right font-semibold">
                          {formatRupiah(
                            po.total_amount
                          )}
                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-4">

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              po.status
                            )}`}
                          >
                            {statusLabel(
                              po.status
                            )}
                          </span>

                        </td>

                        {/* ACTION */}

                        <td className="px-5 py-4">

                          <div className="flex flex-wrap gap-2">

                            <Link
                              href={`/dashboard/purchasing/${po.id}`}
                              className="inline-flex rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                            >
                              Detail
                            </Link>

                            {canReceive ? (

                              <Link
                                href={`/dashboard/purchasing/${po.id}/receive`}
                                className="inline-flex rounded-lg bg-red-900 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                              >
                                Receive
                              </Link>

                            ) : po.status ===
                              'FULLY_RECEIVED' ? (

                              <span className="inline-flex rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                                Complete
                              </span>

                            ) : null}

                          </div>

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

            {!purchaseOrders?.length && (

              <div className="p-12 text-center">

                <p className="font-semibold">
                  No Purchase Order Yet
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Create your first supplier Purchase Order.
                </p>

                <Link
                  href="/dashboard/purchasing/new"
                  className="mt-5 inline-block rounded-xl bg-red-900 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
                >
                  + New Purchase Order
                </Link>

              </div>

            )}

          </div>

        </div>

      </div>

    </main>
  )
}
