import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

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
  platform_role: string
  is_active: boolean
  is_platform_admin: boolean
}

type Overview = {
  companies: number
  outlets: number
  modules: number
  packages: number
  subscriptions: number
  active_subscriptions: number
  pending_payments: number
  confirmed_payments: number
  platform_users: number
}

type Company = {
  id: string
  code: string
  name: string
  legal_name: string | null
  status: string
  timezone: string
  currency: string
  outlet_count: number
  created_at: string
  updated_at: string
}

type Outlet = {
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

type ModuleRow = {
  id: string
  code: string
  name: string
  description: string | null
  status: string
  sort_order: number
  created_at: string
  updated_at: string
}

type PackageModule = {
  id: string
  code: string
  name: string
  status: string
}

type PackageRow = {
  id: string
  code: string
  name: string
  description: string | null
  status: string
  billing_cycle: string
  default_price: number | string
  currency: string
  modules: PackageModule[]
  created_at: string
  updated_at: string
}

type Subscription = {
  id: string
  company_id: string
  company_code: string
  company_name: string
  outlet_id: string
  outlet_code: string
  outlet_name: string
  package_id: string
  package_code: string
  package_name: string
  status: string
  starts_at: string
  ends_at: string
  activated_at: string | null
  suspended_at: string | null
  cancelled_at: string | null
  renewed_from_subscription_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

type Payment = {
  id: string
  subscription_id: string
  company_code: string
  outlet_code: string
  package_code: string
  amount: number | string
  currency: string
  payment_method: string
  status: string
  reference_no: string | null
  paid_at: string | null
  confirmed_at: string | null
  confirmed_by: string | null
  rejected_at: string | null
  rejected_by: string | null
  rejection_reason: string | null
  notes: string | null
  created_at: string
}

type AuditEvent = {
  id: string
  actor_user_id: string | null
  company_id: string | null
  company_code: string | null
  outlet_id: string | null
  outlet_code: string | null
  event_type: string
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

function asRows<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function money(
  value: number | string,
  currency = 'IDR'
) {
  const amount = Number(value || 0)

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function dateTime(value: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

function dateOnly(value: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

function badgeClass(status: string | null) {
  switch (status) {
    case 'ACTIVE':
    case 'CONFIRMED':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'

    case 'PENDING':
    case 'PENDING_PAYMENT':
      return 'bg-amber-50 text-amber-700 ring-amber-200'

    case 'SUSPENDED':
      return 'bg-orange-50 text-orange-700 ring-orange-200'

    case 'EXPIRED':
    case 'CANCELLED':
    case 'REJECTED':
    case 'VOID':
      return 'bg-red-50 text-red-700 ring-red-200'

    default:
      return 'bg-slate-50 text-slate-600 ring-slate-200'
  }
}

function Badge({
  status,
}: {
  status: string | null
}) {
  const text = status || 'NOT SET'

  return (
    <span
      className={[
        'inline-flex rounded-full px-2.5 py-1',
        'text-[11px] font-semibold tracking-wide',
        'ring-1 ring-inset',
        badgeClass(status),
      ].join(' ')}
    >
      {text.replaceAll('_', ' ')}
    </span>
  )
}

function SectionHeader({
  id,
  title,
  description,
  count,
}: {
  id: string
  title: string
  description: string
  count?: number
}) {
  return (
    <div
      id={id}
      className="scroll-mt-24 border-b border-slate-200 px-5 py-4 sm:px-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>

        {typeof count === 'number' && (
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {count}
          </span>
        )}
      </div>
    </div>
  )
}

function EmptyState({
  text,
}: {
  text: string
}) {
  return (
    <div className="px-6 py-10 text-center text-sm text-slate-500">
      {text}
    </div>
  )
}

export default async function PlatformAdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const db = supabase as unknown as RpcClient

  const accessResult = await db.rpc(
    'get_my_platform_access'
  )

  const access = asRows<PlatformAccess>(
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

  const [
    overviewResult,
    companiesResult,
    outletsResult,
    modulesResult,
    packagesResult,
    subscriptionsResult,
    paymentsResult,
    auditResult,
  ] = await Promise.all([
    db.rpc('platform_admin_get_overview'),
    db.rpc('platform_admin_list_companies'),
    db.rpc('platform_admin_list_outlets'),
    db.rpc('platform_admin_list_modules'),
    db.rpc('platform_admin_list_packages'),
    db.rpc('platform_admin_list_subscriptions'),
    db.rpc('platform_admin_list_payments'),
    db.rpc(
      'platform_admin_list_audit_events',
      {
        p_limit: 100,
      }
    ),
  ])

  const errors = [
    overviewResult.error,
    companiesResult.error,
    outletsResult.error,
    modulesResult.error,
    packagesResult.error,
    subscriptionsResult.error,
    paymentsResult.error,
    auditResult.error,
  ].filter(Boolean) as RpcError[]

  if (errors.length > 0) {
    throw new Error(
      `Platform Admin API error: ${errors
        .map((error) => error.message)
        .join(' | ')}`
    )
  }

  const overview =
    (overviewResult.data || {}) as Overview

  const companies = asRows<Company>(
    companiesResult.data
  )

  const outlets = asRows<Outlet>(
    outletsResult.data
  )

  const modules = asRows<ModuleRow>(
    modulesResult.data
  )

  const packages = asRows<PackageRow>(
    packagesResult.data
  )

  const subscriptions = asRows<Subscription>(
    subscriptionsResult.data
  )

  const payments = asRows<Payment>(
    paymentsResult.data
  )

  const auditEvents = asRows<AuditEvent>(
    auditResult.data
  )

  const stats = [
    {
      label: 'Companies',
      value: overview.companies ?? 0,
      note: `${overview.outlets ?? 0} branches`,
    },
    {
      label: 'Packages',
      value: overview.packages ?? 0,
      note: `${overview.modules ?? 0} modules`,
    },
    {
      label: 'Subscriptions',
      value: overview.subscriptions ?? 0,
      note: `${overview.active_subscriptions ?? 0} active`,
    },
    {
      label: 'Pending Payments',
      value: overview.pending_payments ?? 0,
      note: `${overview.confirmed_payments ?? 0} confirmed`,
    },
  ]

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-slate-950 px-2 py-1 text-[10px] font-bold tracking-[0.15em] text-white">
                ECOSUITE
              </span>

              <span className="text-xs font-medium text-slate-400">
                PLATFORM
              </span>
            </div>

            <h1 className="mt-1 truncate text-lg font-semibold tracking-tight">
              Platform Admin
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden max-w-[260px] truncate text-xs text-slate-500 sm:block">
              {user.email}
            </span>

            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <nav className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8">
          {[
            ['companies', 'Companies'],
            ['branches', 'Branches'],
            ['packages', 'Packages'],
            ['modules', 'Modules'],
            ['subscriptions', 'Subscriptions'],
            ['payments', 'Payments'],
            ['audit', 'Audit Log'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={`#${href}`}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Business Operations Platform
            </p>

            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              Platform Control Center
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Manage companies, branch packages, subscriptions,
              modules and commercial lifecycle.
              Operational entitlement enforcement will be enabled after subscription setup is validated.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-medium text-slate-500">
                  {stat.label}
                </p>

                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {stat.value}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {stat.note}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            id="companies"
            title="Companies"
            description="Commercial tenant ownership."
            count={companies.length}
          />

          {companies.length === 0 ? (
            <EmptyState text="No companies found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Company</th>
                    <th className="px-5 py-3 font-medium">Code</th>
                    <th className="px-5 py-3 font-medium">Branches</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Timezone</th>
                    <th className="px-5 py-3 font-medium">Currency</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td className="px-5 py-4 font-medium">
                        {company.name}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {company.code}
                      </td>
                      <td className="px-5 py-4">
                        {company.outlet_count}
                      </td>
                      <td className="px-5 py-4">
                        <Badge status={company.status} />
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {company.timezone}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {company.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            id="branches"
            title="Branches"
            description="Package and subscription state per outlet."
            count={outlets.length}
          />

          {outlets.length === 0 ? (
            <EmptyState text="No branches found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Branch</th>
                    <th className="px-5 py-3 font-medium">Company</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Package</th>
                    <th className="px-5 py-3 font-medium">Subscription</th>
                    <th className="px-5 py-3 font-medium">Ends</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {outlets.map((outlet) => (
                    <tr key={outlet.id}>
                      <td className="px-5 py-4">
                        <div className="font-medium">
                          {outlet.name}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {outlet.code}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div>{outlet.company_name}</div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {outlet.company_code}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {outlet.type}
                      </td>

                      <td className="px-5 py-4">
                        {outlet.current_package_name || '—'}
                      </td>

                      <td className="px-5 py-4">
                        <Badge
                          status={
                            outlet.current_subscription_status
                          }
                        />
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {dateOnly(
                          outlet.subscription_ends_at
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {outlet.current_subscription_id ? (
                          <Link
                            href={`/platform-admin/modules?outlet=${encodeURIComponent(
                              outlet.id
                            )}`}
                            className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Manage
                          </Link>
                        ) : outlet.type === 'CENTRAL_KITCHEN' ? (
                          <span className="text-xs font-medium text-slate-400">
                            Package pending
                          </span>
                        ) : (
                          <Link
                            href={`/platform-admin/subscriptions/new?outlet=${encodeURIComponent(
                              outlet.id
                            )}`}
                            className="inline-flex rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            Assign Package
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            id="packages"
            title="Packages"
            description="Commercial templates and included modules."
            count={packages.length}
          />

          {packages.length === 0 ? (
            <EmptyState text="No packages found." />
          ) : (
            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-400">
                        {pkg.code}
                      </div>

                      <h3 className="mt-1 font-semibold">
                        {pkg.name}
                      </h3>
                    </div>

                    <Badge status={pkg.status} />
                  </div>

                  <p className="mt-3 min-h-10 text-sm leading-5 text-slate-500">
                    {pkg.description || '—'}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(pkg.modules || []).map((module) => (
                      <span
                        key={module.id}
                        className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600"
                      >
                        {module.code}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
                    <div>
                      <div className="text-xs text-slate-400">
                        Default price
                      </div>
                      <div className="mt-1 font-semibold">
                        {money(
                          pkg.default_price,
                          pkg.currency
                        )}
                      </div>
                    </div>

                    <div className="text-right text-xs text-slate-400">
                      {pkg.billing_cycle}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            id="modules"
            title="Modules"
            description="Available SaaS capabilities."
            count={modules.length}
          />

          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {modules.map((module) => (
              <div
                key={module.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold tracking-wide">
                    {module.code}
                  </span>

                  <Badge status={module.status} />
                </div>

                <div className="mt-3 font-medium">
                  {module.name}
                </div>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {module.description || '—'}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            id="subscriptions"
            title="Subscriptions"
            description="Outlet-level subscription terms and renewal history."
            count={subscriptions.length}
          />

          {subscriptions.length === 0 ? (
            <EmptyState text="No subscriptions yet. No branch is being commercially enforced." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Branch</th>
                    <th className="px-5 py-3 font-medium">Package</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Starts</th>
                    <th className="px-5 py-3 font-medium">Ends</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {subscriptions.map((subscription) => (
                    <tr key={subscription.id}>
                      <td className="px-5 py-4">
                        <div className="font-medium">
                          {subscription.outlet_name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {subscription.company_code} ·{' '}
                          {subscription.outlet_code}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {subscription.package_name}
                      </td>

                      <td className="px-5 py-4">
                        <Badge
                          status={subscription.status}
                        />
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {dateOnly(subscription.starts_at)}
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {dateOnly(subscription.ends_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            id="payments"
            title="Payments"
            description="Manual subscription payment records."
            count={payments.length}
          />

          {payments.length === 0 ? (
            <EmptyState text="No subscription payments yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Branch</th>
                    <th className="px-5 py-3 font-medium">Package</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Reference</th>
                    <th className="px-5 py-3 font-medium">Created</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-5 py-4">
                        {payment.company_code} ·{' '}
                        {payment.outlet_code}
                      </td>

                      <td className="px-5 py-4">
                        {payment.package_code}
                      </td>

                      <td className="px-5 py-4 font-medium">
                        {money(
                          payment.amount,
                          payment.currency
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <Badge status={payment.status} />
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {payment.reference_no || '—'}
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {dateTime(payment.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            id="audit"
            title="Audit Log"
            description="Control-plane and billing activity."
            count={auditEvents.length}
          />

          {auditEvents.length === 0 ? (
            <EmptyState text="No audit events yet." />
          ) : (
            <div className="divide-y divide-slate-100">
              {auditEvents.map((event) => (
                <div
                  key={event.id}
                  className="grid gap-3 px-5 py-4 md:grid-cols-[180px_1fr_160px]"
                >
                  <div className="text-xs text-slate-400">
                    {dateTime(event.created_at)}
                  </div>

                  <div>
                    <div className="text-sm font-semibold">
                      {event.event_type}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {[
                        event.company_code,
                        event.outlet_code,
                        event.target_type,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Platform'}
                    </div>
                  </div>

                  <div className="break-all text-xs text-slate-400 md:text-right">
                    {event.target_id || '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="pb-8 pt-2 text-center text-xs text-slate-400">
          Platform Admin · SaaS Control Plane
        </footer>
      </div>
    </main>
  )
}
