import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import AssignPackageForm from './assign-package-form'

type RpcError = {
  message: string
}

type RpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>
  ) => Promise<{
    data: unknown
    error: RpcError | null
  }>
}

type PlatformAccess = {
  is_active: boolean
  is_platform_admin: boolean
}

type OutletOption = {
  id: string
  company_id: string
  company_code: string
  company_name: string
  code: string
  name: string
  type: string
  timezone: string
  is_active: boolean

  current_subscription_id: string | null
  current_subscription_status: string | null

  current_package_code: string | null
  current_package_name: string | null

  subscription_starts_at: string | null
  subscription_ends_at: string | null
}

type PackageOption = {
  id: string
  code: string
  name: string
  description: string | null
  status: string

  modules: Array<{
    id: string
    code: string
    name: string
    status: string
  }>
}

function asRows<T>(
  value: unknown
): T[] {
  return Array.isArray(value)
    ? (value as T[])
    : []
}

export default async function NewSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{
    outlet?: string
  }>
}) {
  const supabase =
    await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const db =
    supabase as unknown as RpcClient

  /*
   * Platform Admin guard.
   * Same access model as /platform-admin.
   */
  const accessResult =
    await db.rpc(
      'get_my_platform_access'
    )

  const access =
    asRows<PlatformAccess>(
      accessResult.data
    )[0]

  if (
    accessResult.error ||
    !access ||
    !access.is_active ||
    !access.is_platform_admin
  ) {
    redirect('/dashboard')
  }

  /*
   * Load only through reviewed
   * Platform Admin read RPCs.
   */
  const [
    outletsResult,
    packagesResult,
  ] = await Promise.all([
    db.rpc(
      'platform_admin_list_outlets'
    ),

    db.rpc(
      'platform_admin_list_packages'
    ),
  ])

  const errors = [
    outletsResult.error,
    packagesResult.error,
  ].filter(Boolean) as RpcError[]

  if (errors.length > 0) {
    throw new Error(
      `Platform Admin API error: ${errors
        .map(
          (error) =>
            error.message
        )
        .join(' | ')}`
    )
  }

  const params =
    await searchParams

  /*
   * Phase 1D:
   *
   * - only branches without subscription
   * - Central Kitchen package is not
   *   defined yet, so exclude it
   */
  const outlets =
    asRows<OutletOption>(
      outletsResult.data
    ).filter(
      (outlet) =>
        outlet.is_active &&
        !outlet.current_subscription_id &&
        outlet.type !==
          'CENTRAL_KITCHEN'
    )

  const packages =
    asRows<PackageOption>(
      packagesResult.data
    )

  /*
   * If someone manually passes an
   * invalid / already-subscribed outlet,
   * do not preselect it.
   */
  const initialOutletId =
    params.outlet &&
    outlets.some(
      (outlet) =>
        outlet.id ===
        params.outlet
    )
      ? params.outlet
      : undefined

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-slate-950 px-2 py-1 text-[10px] font-bold tracking-[0.15em] text-white">
                ECOSUITE
              </span>

              <span className="text-xs font-medium text-slate-400">
                PLATFORM
              </span>
            </div>

            <h1 className="mt-2 text-xl font-semibold tracking-tight">
              Assign Package
            </h1>
          </div>

          <Link
            href="/platform-admin#branches"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-5">
          <h2 className="text-2xl font-semibold tracking-tight">
            Create Branch Subscription
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Select a commercial package,
            subscription start date and
            duration for this branch.
            Subscription periods are managed
            independently per branch.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <AssignPackageForm
            outlets={outlets}
            packages={packages}
            initialOutletId={
              initialOutletId
            }
          />
        </section>
      </div>
    </main>
  )
}
