import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import ModuleManager from './module-manager'

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

type Outlet = {
  id: string
  code: string
  name: string
  company_code: string
  company_name: string
  current_subscription_id: string | null
}

type Package = {
  id: string
  code: string
  name: string
  status: string
}

type ModuleConfig = {
  module_id: string
  module_code: string
  module_name: string

  package_id: string | null
  package_code: string | null
  package_name: string | null

  package_included: boolean
  addon_entitled: boolean
  entitled: boolean

  default_enabled: boolean
  setting_exists: boolean
  enabled: boolean

  access_allowed: boolean
  reason: string
}

function rows<T>(
  value: unknown
): T[] {
  return Array.isArray(value)
    ? (value as T[])
    : []
}

export default async function ModulesPage({
  searchParams,
}: {
  searchParams: Promise<{
    outlet?: string
  }>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const db = supabase as unknown as RpcClient

  const accessResult =
    await db.rpc(
      'get_my_platform_access'
    )

  const access =
    rows<PlatformAccess>(
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

  const params = await searchParams

  if (!params.outlet) {
    redirect('/platform-admin#branches')
  }

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
      errors
        .map(
          (error) =>
            error.message
        )
        .join(' | ')
    )
  }

  const outlet =
    rows<Outlet>(
      outletsResult.data
    ).find(
      (row) =>
        row.id === params.outlet
    )

  if (!outlet) {
    redirect('/platform-admin#branches')
  }

  if (
    !outlet.current_subscription_id
  ) {
    redirect(
      `/platform-admin/subscriptions/new?outlet=${encodeURIComponent(
        outlet.id
      )}`
    )
  }

  const configResult =
    await db.rpc(
      'platform_admin_get_outlet_module_config',
      {
        p_outlet_id: outlet.id,
      }
    )

  if (configResult.error) {
    throw new Error(
      configResult.error.message
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-slate-950 px-2 py-1 text-[10px] font-bold tracking-[0.15em] text-white">
                ECOSUITE
              </span>

              <span className="text-xs font-medium text-slate-400">
                PLATFORM
              </span>
            </div>

            <h1 className="mt-2 text-xl font-semibold">
              Module Management
            </h1>
          </div>

          <Link
            href="/platform-admin#branches"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
          >
            Back
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <ModuleManager
          outlet={outlet}
          packages={
            rows<Package>(
              packagesResult.data
            )
          }
          modules={
            rows<ModuleConfig>(
              configResult.data
            )
          }
        />
      </div>
    </main>
  )
}
