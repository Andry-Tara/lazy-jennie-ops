import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function SuppliersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: permissionData } =
    await supabase.rpc('get_my_permissions')

  const supplierPermission =
    (permissionData || []).find(
      (row: {
        module_code: string
        can_create: boolean
      }) =>
        row.module_code === 'SUPPLIERS'
    )

  const canCreateSupplier =
    Boolean(
      supplierPermission?.can_create
    )

  const { data: suppliers } = await supabase
    .from('suppliers_secure')
    .select('*')
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
              Suppliers
            </h1>

            <p className="mt-2 text-zinc-500">
              Supplier Master Data
            </p>
          </div>

          {canCreateSupplier && (
            <Link
              href="/dashboard/suppliers/new"
              className="rounded-xl bg-red-900 px-5 py-3 font-semibold text-white"
            >
              + Add Supplier
            </Link>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Terms</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100">
              {suppliers?.map((supplier) => (
                <tr key={supplier.id}>
                  <td className="px-6 py-4 font-semibold text-red-900">
                    {supplier.code}
                  </td>

                  <td className="px-6 py-4 font-medium">
                    {supplier.name}
                  </td>

                  <td className="px-6 py-4">
                    {supplier.contact_person || '-'}
                  </td>

                  <td className="px-6 py-4">
                    {supplier.phone || '-'}
                  </td>

                  <td className="px-6 py-4">
                    {supplier.payment_terms_days} Days
                  </td>

                  <td className="px-6 py-4">
                    {supplier.is_active ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs">
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  )
}
