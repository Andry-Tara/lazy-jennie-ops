import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

type PermissionRow = {
  module_code: string
  can_view: boolean
  can_create: boolean
  can_update: boolean
  can_post: boolean
  can_approve: boolean
}

export default async function NewOutletPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: permissionData } = await supabase.rpc(
    'get_my_permissions'
  )

  const permissions = (permissionData || []) as PermissionRow[]

  const outletPermission = permissions.find(
    (row) => row.module_code === 'OUTLETS'
  )

  if (!outletPermission?.can_create) {
    redirect('/dashboard?denied=OUTLETS')
  }

  async function createOutlet(formData: FormData) {
    'use server'

    const supabase = await createClient()

    const code = String(formData.get('code') || '')
      .trim()
      .toUpperCase()

    const name = String(formData.get('name') || '').trim()

    const type = String(
      formData.get('type') || 'OUTLET'
    )
      .trim()
      .toUpperCase()

    const address = String(
      formData.get('address') || ''
    ).trim()

    const phone = String(
      formData.get('phone') || ''
    ).trim()

    const timezone = String(
      formData.get('timezone') || 'Asia/Jakarta'
    ).trim()

    const { error } = await supabase.rpc(
      'create_outlet_secure',
      {
        p_code: code,
        p_name: name,
        p_type: type,
        p_address: address || null,
        p_phone: phone || null,
        p_timezone: timezone || 'Asia/Jakarta',
        p_is_active: true,
      }
    )

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath('/dashboard/outlets')
    redirect('/dashboard/outlets')
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-3xl">

        <Link
          href="/dashboard/outlets"
          className="text-sm text-zinc-500 hover:text-red-800"
        >
          ← Master Outlet
        </Link>

        <div className="mt-6">
          <p className="text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Add Outlet
          </h1>

          <p className="mt-2 text-zinc-500">
            Create a new operational location.
          </p>
        </div>

        <form
          action={createOutlet}
          className="mt-8 space-y-6 rounded-2xl bg-white p-8 shadow-sm"
        >

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Outlet Code
            </label>

            <input
              name="code"
              required
              placeholder="LJ-002"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Outlet Name
            </label>

            <input
              name="name"
              required
              placeholder="Lazy Jennie Senopati"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Type
            </label>

            <select
              name="type"
              required
              defaultValue="OUTLET"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            >
              <option value="OUTLET">
                Outlet
              </option>

              <option value="CENTRAL_KITCHEN">
                Central Kitchen
              </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Address
            </label>

            <textarea
              name="address"
              rows={4}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Phone
            </label>

            <input
              name="phone"
              placeholder="021..."
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Timezone
            </label>

            <input
              name="timezone"
              required
              defaultValue="Asia/Jakarta"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-red-900 py-3 font-semibold text-white hover:bg-red-800"
          >
            Save Outlet
          </button>

        </form>
      </div>
    </main>
  )
}
