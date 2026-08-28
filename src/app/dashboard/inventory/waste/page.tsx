import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function WastePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // =====================================================
  // WASTE HEADER
  // =====================================================

  const {
    data: wastes,
    error,
  } = await supabase
    .from('wastes')
    .select(`
      id,
      waste_no,
      waste_date,
      outlet_id,
      status,
      notes,
      posted_at,
      created_at
    `)
    .order('created_at', {
      ascending: false,
    })

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
  // WASTE ITEMS
  // =====================================================

  const { data: wasteItems } = await supabase
    .from('waste_items')
    .select(`
      waste_id,
      base_qty,
      total_loss,
      reason
    `)

  // =====================================================
  // OUTLET LOOKUP
  // =====================================================

  const outletMap = new Map(
    (outlets || []).map((outlet) => [
      outlet.id,
      outlet,
    ])
  )

  // =====================================================
  // SUMMARY PER WASTE
  // =====================================================

  const wasteSummary = new Map<
    string,
    {
      itemCount: number
      totalLoss: number
    }
  >()

  for (const item of wasteItems || []) {
    const current =
      wasteSummary.get(item.waste_id) || {
        itemCount: 0,
        totalLoss: 0,
      }

    current.itemCount += 1

    current.totalLoss +=
      Number(item.total_loss || 0)

    wasteSummary.set(
      item.waste_id,
      current
    )
  }

  // =====================================================
  // GLOBAL SUMMARY
  // =====================================================

  const totalLoss =
    (wasteItems || []).reduce(
      (total, item) =>
        total +
        Number(item.total_loss || 0),
      0
    )

  const totalLines =
    wasteItems?.length || 0

  const totalDocuments =
    wastes?.length || 0

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

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">

          <div>
            <Link
              href="/dashboard/inventory"
              className="text-sm text-zinc-500 hover:text-red-800"
            >
              ← Inventory
            </Link>

            <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
              LAZY JENNIE
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Waste & Spoilage
            </h1>

            <p className="mt-2 text-zinc-500">
              Inventory Waste Monitoring
            </p>
          </div>

          <Link
            href="/dashboard/inventory/waste/new"
            className="rounded-xl bg-red-900 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
          >
            + New Waste
          </Link>

        </div>

        {/* SUMMARY */}

        <div className="mb-8 grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Waste Documents
            </p>

            <p className="mt-2 text-3xl font-bold">
              {totalDocuments}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Waste Item Lines
            </p>

            <p className="mt-2 text-3xl font-bold">
              {totalLines}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Total Waste Value
            </p>

            <p className="mt-2 text-2xl font-bold text-red-700">
              {formatRupiah(totalLoss)}
            </p>

          </div>

        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error.message}
          </div>
        )}

        {/* TABLE */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">

            <h2 className="font-bold">
              Waste History
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Posted waste transactions
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">

                <tr>
                  <th className="px-6 py-4">
                    Waste No
                  </th>

                  <th className="px-6 py-4">
                    Date
                  </th>

                  <th className="px-6 py-4">
                    Location
                  </th>

                  <th className="px-6 py-4 text-right">
                    Items
                  </th>

                  <th className="px-6 py-4 text-right">
                    Waste Value
                  </th>

                  <th className="px-6 py-4">
                    Notes
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>
                </tr>

              </thead>

              <tbody className="divide-y divide-zinc-100">

                {(wastes || []).map((waste) => {

                  const outlet =
                    outletMap.get(
                      waste.outlet_id
                    )

                  const summary =
                    wasteSummary.get(
                      waste.id
                    ) || {
                      itemCount: 0,
                      totalLoss: 0,
                    }

                  return (
                    <tr
                      key={waste.id}
                      className="hover:bg-zinc-50"
                    >

                      <td className="px-6 py-4 font-bold text-red-900">
                        {waste.waste_no}
                      </td>

                      <td className="px-6 py-4">
                        {waste.waste_date}
                      </td>

                      <td className="px-6 py-4">

                        <p className="font-medium">
                          {outlet?.name || '-'}
                        </p>

                        <p className="text-xs text-zinc-400">
                          {outlet?.code || ''}
                        </p>

                      </td>

                      <td className="px-6 py-4 text-right font-semibold">
                        {summary.itemCount}
                      </td>

                      <td className="px-6 py-4 text-right font-semibold text-red-700">
                        {formatRupiah(
                          summary.totalLoss
                        )}
                      </td>

                      <td className="px-6 py-4 text-zinc-500">
                        {waste.notes || '-'}
                      </td>

                      <td className="px-6 py-4">

                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          {waste.status}
                        </span>

                      </td>

                    </tr>
                  )
                })}

              </tbody>

            </table>

            {!wastes?.length && (
              <div className="p-12 text-center">

                <p className="font-semibold">
                  No Waste Transaction Yet
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Record expired, spoiled or damaged inventory here.
                </p>

              </div>
            )}

          </div>
        </div>

      </div>
    </main>
  )
}
