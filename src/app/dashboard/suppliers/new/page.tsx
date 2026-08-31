import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

export default async function NewSupplierPage() {
  const pageSupabase = await createClient()

  const {
    data: { user },
  } = await pageSupabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: permissionData } =
    await pageSupabase.rpc('get_my_permissions')

  const supplierPermission =
    (permissionData || []).find(
      (row: {
        module_code: string
        can_create: boolean
      }) =>
        row.module_code === 'SUPPLIERS'
    )

  if (!supplierPermission?.can_create) {
    redirect('/dashboard?denied=SUPPLIERS')
  }

  async function createSupplier(formData: FormData) {
    'use server'

    const supabase = await createClient()

    const { error } = await supabase.rpc(
      'create_supplier_secure',
      {
        p_code:
          String(formData.get('code') || '')
            .trim()
            .toUpperCase(),

        p_name:
          String(formData.get('name') || '')
            .trim(),

        p_contact_person:
          String(formData.get('contact_person') || '')
            .trim() || null,

        p_phone:
          String(formData.get('phone') || '')
            .trim() || null,

        p_email:
          String(formData.get('email') || '')
            .trim() || null,

        p_address:
          String(formData.get('address') || '')
            .trim() || null,

        p_payment_terms_days:
          Number(
            formData.get('payment_terms_days') || 0
          ),

        p_is_active:
          true,
      }
    )

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath('/dashboard/suppliers')
    redirect('/dashboard/suppliers')
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-3xl">

        <Link
          href="/dashboard/suppliers"
          className="text-sm text-zinc-500"
        >
          ← Suppliers
        </Link>

        <h1 className="mt-6 text-3xl font-bold">
          Add Supplier
        </h1>

        <form
          action={createSupplier}
          className="mt-8 space-y-5 rounded-2xl bg-white p-8 shadow-sm"
        >

          <input
            name="code"
            required
            placeholder="Supplier Code - SUP-002"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="name"
            required
            placeholder="Supplier Name"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="contact_person"
            placeholder="Contact Person"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="phone"
            placeholder="Phone"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border px-4 py-3"
          />

          <textarea
            name="address"
            placeholder="Address"
            className="w-full rounded-xl border px-4 py-3"
          />

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Payment Terms
            </label>

            <input
              name="payment_terms_days"
              type="number"
              min="0"
              defaultValue="0"
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

          <button
            className="w-full rounded-xl bg-red-900 py-3 font-semibold text-white"
          >
            Save Supplier
          </button>

        </form>
      </div>
    </main>
  )
}
