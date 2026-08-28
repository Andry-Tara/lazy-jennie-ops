import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function StockOpnamePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const {
    data: opnames,
    error,
  } = await supabase
    .from('stock_opnames')
    .select(`
      id,
      opname_no,
      opname_date,
      outlet_id,
      status,
      notes,
      posted_at,
      created_at
    `)
    .order('created_at', {
      ascending: false,
    })

  const { data: outlets } = await supabase
    .from('outlets')
    .select(`
      id,
      code,
      name
    `)

  const { data: opnameItems } = await supabase
    .from('stock_opname_items')
    .select(`
      opname_id,
      difference_qty
    `)

  const outletMap = new Map(
    (outlets || []).map((outlet) => [
      outlet.id,
      outlet,
    ])
  )

  const countMap = new Map<
    string,
    {
      items: number
      variance: number
    }
  >()

  for (const item of opnameItems || []) {
    const current =
      countMap.get(item.opname_id) || {
        items: 0,
        variance: 0,
      }

    current.items += 1

    if (Number(item.difference_qty) !== 0) {
      current.variance += 1
    }

    countMap.set(
      item.opname_id,
      current
    )
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-7xl">

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
              Stock Opname
            </h1>

            <p className="mt-2 text-zinc-500">
              Physical Stock Count & Adjustment
            </p>
          </div>

          <Link
            href="/dashboard/inventory/opname/new"
            className="rounded-xl bg-red-900 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
          >
            + New Stock Opname
          </Link>

        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error.message}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">
            <h2 className="font-bold">
              Stock Opname History
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Posted physical stock counts
            </p>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-6 py-4">
                    Opname No
                  </th>

                  <th className="px-6 py-4">
                    Date
                  </th>

                  <th className="px-6 py-4">
                    Location
                  </th>

                  <th className="px-6 py-4 text-right">
                    Counted Items
                  </th>

                  <th className="px-6 py-4 text-right">
                    Variance Items
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">

                {(opnames || []).map((opname) => {
                  const outlet =
                    outletMap.get(
                      opname.outlet_id
                    )

                  const counts =
                    countMap.get(
                      opname.id
                    ) || {
                      items: 0,
                      variance: 0,
                    }

                  return (
                    <tr
                      key={opname.id}
                      className="hover:bg-zinc-50"
                    >
                      <td className="px-6 py-4 font-bold text-red-900">
                        {opname.opname_no}
                      </td>

                      <td className="px-6 py-4">
                        {opname.opname_date}
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
                        {counts.items}
                      </td>

                      <td className="px-6 py-4 text-right font-semibold">
                        {counts.variance}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          {opname.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}

              </tbody>
            </table>

            {!opnames?.length && (
              <div className="p-12 text-center">
                <p className="font-semibold">
                  No Stock Opname Yet
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Start your first physical stock count.
                </p>
              </div>
            )}

          </div>
        </div>

      </div>
    </main>
  )
}
