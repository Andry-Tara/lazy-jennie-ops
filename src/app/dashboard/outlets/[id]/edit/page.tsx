import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{
    id: string
  }>
}

export default async function EditOutletPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()

  const { data: outlet } = await supabase
    .from('outlets')
    .select('*')
    .eq('id', id)
    .single()

  if (!outlet) {
    notFound()
  }

  async function updateOutlet(formData: FormData) {
    'use server'

    const supabase = await createClient()

    const code = String(formData.get('code') || '')
      .trim()
      .toUpperCase()

    const name = String(formData.get('name') || '').trim()
    const type = String(formData.get('type') || '')
    const address = String(formData.get('address') || '').trim()
    const phone = String(formData.get('phone') || '').trim()

    const isActive =
      String(formData.get('is_active')) === 'true'

    const { error } = await supabase
      .from('outlets')
      .update({
        code,
        name,
        type,
        address: address || null,
        phone: phone || null,
        is_active: isActive,
      })
      .eq('id', id)

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
            Edit Outlet
          </h1>

          <p className="mt-2 text-zinc-500">
            {outlet.name}
          </p>
        </div>

        <form
          action={updateOutlet}
          className="mt-8 space-y-6 rounded-2xl bg-white p-8 shadow-sm"
        >

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Outlet Code
            </label>

            <input
              name="code"
              required
              defaultValue={outlet.code}
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
              defaultValue={outlet.name}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Type
            </label>

            <select
              name="type"
              defaultValue={outlet.type}
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
              defaultValue={outlet.address || ''}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Phone
            </label>

            <input
              name="phone"
              defaultValue={outlet.phone || ''}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Status
            </label>

            <select
              name="is_active"
              defaultValue={String(outlet.is_active)}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            >
              <option value="true">
                Active
              </option>

              <option value="false">
                Inactive
              </option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-red-900 py-3 font-semibold text-white hover:bg-red-800"
          >
            Update Outlet
          </button>

        </form>
      </div>
    </main>
  )
}
