import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TransfersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const {
    data: transfers,
    error,
  } = await supabase
    .from('stock_transfers')
    .select(`
      id,
      transfer_no,
      transfer_date,
      from_outlet_id,
      to_outlet_id,
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

  const { data: transferItems } = await supabase
    .from('stock_transfer_items')
    .select(`
      transfer_id,
      base_qty,
      total_value
    `)

  const outletMap = new Map(
    (outlets || []).map((outlet) => [
      outlet.id,
      outlet,
    ])
  )

  const summaryMap = new Map<
    string,
    {
      itemCount: number
      totalValue: number
    }
  >()

  for (const item of transferItems || []) {
    const current =
      summaryMap.get(item.transfer_id) || {
        itemCount: 0,
        totalValue: 0,
      }

    current.itemCount += 1

    current.totalValue +=
      Number(item.total_value || 0)

    summaryMap.set(
      item.transfer_id,
      current
    )
  }

  function formatRupiah(value: number) {
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
              Stock Transfer
            </h1>

            <p className="mt-2 text-zinc-500">
              Inventory Movement Between Locations
            </p>
          </div>

          <Link
            href="/dashboard/inventory/transfers/new"
            className="rounded-xl bg-red-900 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
          >
            + New Transfer
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
              Transfer History
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Posted inventory transfers
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">
                <tr>

                  <th className="px-6 py-4">
                    Transfer No
                  </th>

                  <th className="px-6 py-4">
                    Date
                  </th>

                  <th className="px-6 py-4">
                    From
                  </th>

                  <th className="px-6 py-4">
                    To
                  </th>

                  <th className="px-6 py-4 text-right">
                    Items
                  </th>

                  <th className="px-6 py-4 text-right">
                    Value
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">

                {(transfers || []).map((transfer) => {

                  const from =
                    outletMap.get(
                      transfer.from_outlet_id
                    )

                  const to =
                    outletMap.get(
                      transfer.to_outlet_id
                    )

                  const summary =
                    summaryMap.get(
                      transfer.id
                    ) || {
                      itemCount: 0,
                      totalValue: 0,
                    }

                  return (
                    <tr
                      key={transfer.id}
                      className="hover:bg-zinc-50"
                    >

                      <td className="px-6 py-4 font-bold text-red-900">
                        {transfer.transfer_no}
                      </td>

                      <td className="px-6 py-4">
                        {transfer.transfer_date}
                      </td>

                      <td className="px-6 py-4">

                        <p className="font-medium">
                          {from?.name || '-'}
                        </p>

                        <p className="text-xs text-zinc-400">
                          {from?.code || ''}
                        </p>

                      </td>

                      <td className="px-6 py-4">

                        <p className="font-medium">
                          {to?.name || '-'}
                        </p>

                        <p className="text-xs text-zinc-400">
                          {to?.code || ''}
                        </p>

                      </td>

                      <td className="px-6 py-4 text-right font-semibold">
                        {summary.itemCount}
                      </td>

                      <td className="px-6 py-4 text-right font-semibold">
                        {formatRupiah(
                          summary.totalValue
                        )}
                      </td>

                      <td className="px-6 py-4">

                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          {transfer.status}
                        </span>

                      </td>

                    </tr>
                  )
                })}

              </tbody>

            </table>

            {!transfers?.length && (
              <div className="p-12 text-center">

                <p className="font-semibold">
                  No Stock Transfer Yet
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Create your first inventory transfer.
                </p>

              </div>
            )}

          </div>
        </div>

      </div>
    </main>
  )
}
