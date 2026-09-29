import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import ApprovalQueueClient from './ApprovalQueueClient'

export default async function POSApprovalQueuePage() {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const {
    data: profile,
  } =
    await supabase
      .from('profiles')
      .select(`
        role_id,
        is_active
      `)
      .eq('id', user.id)
      .single()

  if (
    profile &&
    !profile.is_active
  ) {
    redirect('/dashboard')
  }

  let roleCode = ''

  if (profile?.role_id) {
    const {
      data: role,
    } =
      await supabase
        .from('roles')
        .select('code')
        .eq(
          'id',
          profile.role_id
        )
        .single()

    roleCode =
      role?.code || ''
  }

  const canApprove =
    [
      'SUPER_ADMIN',
      'MANAGEMENT',
      'OUTLET_MANAGER',
    ].includes(
      roleCode
    )

  if (!canApprove) {
    return (
      <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

        <div className="mx-auto max-w-xl">

          <Link
            href="/dashboard/pos"
            className="text-sm text-zinc-500"
          >
            ← Point of Sale
          </Link>

          <div className="mt-8 rounded-2xl bg-white p-8 shadow-sm">

            <p className="text-sm font-bold tracking-wider text-red-800">
              LAZY JENNIE
            </p>

            <h1 className="mt-3 text-2xl font-bold">
              Approval Access Restricted
            </h1>

            <p className="mt-3 text-zinc-500">
              Only Manager-authorized POS roles can approve controlled actions.
            </p>

          </div>

        </div>

      </main>
    )
  }

  const {
    data: approvals,
    error,
  } =
    await supabase
      .from(
        'pos_approval_requests_secure'
      )
      .select(`
        id,
        outlet_code,
        outlet_name,
        sale_id,
        sale_no,
        sale_item_id,
        menu_code,
        menu_name,
        action_type,
        requested_amount,
        reason_name,
        reason_text,
        status,
        requested_by_name,
        requested_at
      `)
      .eq(
        'status',
        'PENDING'
      )
      .order(
        'requested_at',
        {
          ascending: true,
        }
      )

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-6xl">

        <div className="flex flex-wrap items-end justify-between gap-4">

          <div>

            <Link
              href="/dashboard/pos"
              className="text-sm text-zinc-500 hover:text-red-800"
            >
              ← Point of Sale
            </Link>

            <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
              LAZY JENNIE
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Manager Approval Queue
            </h1>

            <p className="mt-2 text-zinc-500">
              Discount, Complimentary & Void
            </p>

          </div>

          <Link
            href="/dashboard/pos/control"
            className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold"
          >
            POS Control
          </Link>

        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error.message}
          </div>
        )}

        <ApprovalQueueClient
          approvals={
            (approvals || [])
              .map(
                (row) => ({
                  ...row,
                  requested_amount:
                    Number(
                      row.requested_amount ||
                        0
                    ),
                })
              )
          }
        />

      </div>

    </main>
  )
}
