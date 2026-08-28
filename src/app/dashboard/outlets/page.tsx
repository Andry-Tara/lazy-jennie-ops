import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function OutletsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: outlets, error } = await supabase
    .from('outlets')
    .select(`
      id,
      code,
      name,
      type,
      address,
      phone,
      is_active,
      created_at
    `)
    .order('name')

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8 flex items-end justify-between">
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
              Master Outlet
            </h1>

            <p className="mt-2 text-zinc-500">
              Central Kitchen & Outlet Management
            </p>
          </div>

          <Link
            href="/dashboard/outlets/new"
            className="rounded-xl bg-red-900 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
          >
            + Add Outlet
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error.message}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">

            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100">

              {outlets?.map((outlet) => (
                <tr key={outlet.id} className="hover:bg-zinc-50">

                  <td className="px-6 py-4 font-semibold text-red-900">
                    {outlet.code}
                  </td>

                  <td className="px-6 py-4 font-medium">
                    {outlet.name}
                  </td>

                  <td className="px-6 py-4">
                    {outlet.type === 'CENTRAL_KITCHEN'
                      ? 'Central Kitchen'
                      : 'Outlet'}
                  </td>

                  <td className="px-6 py-4 text-zinc-500">
                    {outlet.address || '-'}
                  </td>

                  <td className="px-6 py-4">
                    {outlet.is_active ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-500">
                        Inactive
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/outlets/${outlet.id}/edit`}
                      className="font-semibold text-red-800 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>

                </tr>
              ))}

            </tbody>
          </table>

          {!outlets?.length && (
            <div className="p-10 text-center text-zinc-500">
              Belum ada outlet.
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
