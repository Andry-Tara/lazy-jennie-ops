import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ReceivingPage() {
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

  // =====================================================
  // RECEIVING DATA
  // =====================================================

  const {
    data: receivings,
    error: receivingError,
  } = await supabase
    .from('purchase_receivings')
    .select(`
      id,
      receiving_no,
      receiving_date,
      outlet_id,
      supplier_id,
      invoice_no,
      status,
      total_amount,
      created_at
    `)
    .order('created_at', {
      ascending: false,
    })

  // =====================================================
  // OUTLETS
  // =====================================================

  const {
    data: outlets,
    error: outletError,
  } = await supabase
    .from('outlets')
    .select(`
      id,
      code,
      name
    `)
    .order('name')

  // =====================================================
  // SUPPLIERS
  // =====================================================

  const {
    data: suppliers,
    error: supplierError,
  } = await supabase
    .from('suppliers')
    .select(`
      id,
      code,
      name
    `)
    .order('name')

  // =====================================================
  // LOOKUP MAP
  // =====================================================

  const outletMap = new Map(
    (outlets || []).map((outlet) => [
      outlet.id,
      {
        code: outlet.code,
        name: outlet.name,
      },
    ])
  )

  const supplierMap = new Map(
    (suppliers || []).map((supplier) => [
      supplier.id,
      {
        code: supplier.code,
        name: supplier.name,
      },
    ])
  )

  // =====================================================
  // FORMAT
  // =====================================================

  function formatRupiah(value: number | string | null) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(value || 0))
  }

  function formatDate(value: string) {
    if (!value) {
      return '-'
    }

    const date = new Date(`${value}T00:00:00`)

    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date)
  }

  function statusClass(status: string) {
    if (status === 'POSTED') {
      return 'bg-green-100 text-green-700'
    }

    if (status === 'CANCELLED') {
      return 'bg-red-100 text-red-700'
    }

    return 'bg-amber-100 text-amber-700'
  }

  const error =
    receivingError ||
    outletError ||
    supplierError

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
              Purchase Receiving
            </h1>

            <p className="mt-2 text-zinc-500">
              Supplier Receiving & Stock In
            </p>
          </div>

          <div className="flex flex-wrap gap-3">

            <Link
              href="/dashboard/suppliers"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
            >
              Suppliers
            </Link>

            <Link
              href="/dashboard/inventory"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
            >
              Inventory
            </Link>

            <Link
              href="/dashboard/receiving/new"
              className="rounded-xl bg-red-900 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
            >
              + New Receiving
            </Link>

          </div>
        </div>

        {/* =====================================================
            SUMMARY
        ===================================================== */}

        <div className="mb-8 grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Total Receiving
            </p>

            <p className="mt-2 text-3xl font-bold">
              {receivings?.length || 0}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Posted
            </p>

            <p className="mt-2 text-3xl font-bold text-green-700">
              {
                (receivings || []).filter(
                  (receiving) =>
                    receiving.status === 'POSTED'
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Total Purchase Value
            </p>

            <p className="mt-2 text-2xl font-bold">
              {formatRupiah(
                (receivings || []).reduce(
                  (total, receiving) =>
                    total +
                    Number(
                      receiving.total_amount || 0
                    ),
                  0
                )
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
            RECEIVING TABLE
        ===================================================== */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">
            <h2 className="font-bold">
              Receiving History
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Supplier goods received into inventory
            </p>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-6 py-4">
                    Receiving No
                  </th>

                  <th className="px-6 py-4">
                    Date
                  </th>

                  <th className="px-6 py-4">
                    Location
                  </th>

                  <th className="px-6 py-4">
                    Supplier
                  </th>

                  <th className="px-6 py-4">
                    Invoice
                  </th>

                  <th className="px-6 py-4 text-right">
                    Total
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">

                {(receivings || []).map((receiving) => {
                  const outlet =
                    outletMap.get(
                      receiving.outlet_id
                    )

                  const supplier =
                    supplierMap.get(
                      receiving.supplier_id
                    )

                  return (
                    <tr
                      key={receiving.id}
                      className="hover:bg-zinc-50"
                    >

                      {/* RECEIVING NO */}

                      <td className="px-6 py-4">
                        <p className="font-bold text-red-900">
                          {receiving.receiving_no}
                        </p>
                      </td>

                      {/* DATE */}

                      <td className="whitespace-nowrap px-6 py-4 text-zinc-600">
                        {formatDate(
                          receiving.receiving_date
                        )}
                      </td>

                      {/* LOCATION */}

                      <td className="px-6 py-4">
                        <p className="font-medium">
                          {outlet?.name || '-'}
                        </p>

                        {outlet?.code && (
                          <p className="text-xs text-zinc-400">
                            {outlet.code}
                          </p>
                        )}
                      </td>

                      {/* SUPPLIER */}

                      <td className="px-6 py-4">
                        <p className="font-medium">
                          {supplier?.name || '-'}
                        </p>

                        {supplier?.code && (
                          <p className="text-xs text-zinc-400">
                            {supplier.code}
                          </p>
                        )}
                      </td>

                      {/* INVOICE */}

                      <td className="px-6 py-4 text-zinc-600">
                        {receiving.invoice_no || '-'}
                      </td>

                      {/* TOTAL */}

                      <td className="px-6 py-4 text-right font-semibold">
                        {formatRupiah(
                          receiving.total_amount
                        )}
                      </td>

                      {/* STATUS */}

                      <td className="px-6 py-4">
                        <span
                          className={`
                            rounded-full
                            px-3
                            py-1
                            text-xs
                            font-semibold
                            ${statusClass(
                              receiving.status
                            )}
                          `}
                        >
                          {receiving.status}
                        </span>
                      </td>

                    </tr>
                  )
                })}

              </tbody>
            </table>

            {/* EMPTY */}

            {!receivings?.length && (
              <div className="p-12 text-center">

                <p className="font-semibold text-zinc-700">
                  No receiving transaction yet
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Create your first supplier receiving.
                </p>

                <Link
                  href="/dashboard/receiving/new"
                  className="mt-5 inline-block rounded-xl bg-red-900 px-5 py-3 text-sm font-semibold text-white"
                >
                  + New Receiving
                </Link>

              </div>
            )}

          </div>
        </div>

      </div>
    </main>
  )
}
