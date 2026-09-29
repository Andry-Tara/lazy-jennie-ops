import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import POSSettingsClient from './POSSettingsClient'

export default async function POSSettingsPage() {
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
        outlet_id,
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

  const canManage =
    [
      'SUPER_ADMIN',
      'MANAGEMENT',
      'OUTLET_MANAGER',
    ].includes(
      roleCode
    )

  if (!canManage) {
    redirect('/dashboard/pos')
  }

  const [
    outletResult,
    menuResult,
    ruleResult,
    mappingResult,
  ] =
    await Promise.all([
      supabase
        .from(
          'outlets_secure'
        )
        .select(`
          id,
          code,
          name,
          type
        `)
        .eq(
          'is_active',
          true
        )
        .order('name'),

      supabase
        .from(
          'menu_items'
        )
        .select(`
          id,
          code,
          name,
          category
        `)
        .eq(
          'is_active',
          true
        )
        .order('category')
        .order('name'),

      supabase
        .from(
          'pos_discount_rules_secure'
        )
        .select(`
          id,
          code,
          name,
          outlet_id,
          outlet_code,
          outlet_name,
          scope,
          discount_type,
          discount_value,
          max_discount_amount,
          requires_approval,
          valid_from,
          valid_to,
          is_active,
          restricted_menu_count
        `)
        .order('name'),

      supabase
        .from(
          'pos_discount_rule_items_secure'
        )
        .select(`
          discount_rule_id,
          menu_item_id
        `),
    ])

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-7xl">

        <div className="flex flex-wrap items-end justify-between gap-4">

          <div>

            <Link
              href="/dashboard/pos"
              className="text-sm text-zinc-500 hover:text-red-800"
            >
              ← Point of Sale
            </Link>

            <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
              RESTAURANT OPERATIONS
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Discount Settings
            </h1>

            <p className="mt-2 text-zinc-500">
              Preset item discount rules & menu mapping
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <Link
              href="/dashboard/pos/settings/printers"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold"
            >
              Printer Settings
            </Link>

            <Link
              href="/dashboard/pos/control"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold"
            >
              POS Control
            </Link>

          </div>

        </div>

        <POSSettingsClient
          roleCode={
            roleCode
          }
          assignedOutletId={
            profile?.outlet_id ||
            ''
          }
          outlets={
            outletResult.data ||
            []
          }
          menus={
            menuResult.data ||
            []
          }
          rules={
            (ruleResult.data ||
              [])
              .map(
                (rule) => ({
                  ...rule,
                  discount_value:
                    Number(
                      rule.discount_value ||
                        0
                    ),
                  max_discount_amount:
                    rule.max_discount_amount ===
                    null
                      ? null
                      : Number(
                          rule.max_discount_amount ||
                            0
                        ),
                  restricted_menu_count:
                    Number(
                      rule.restricted_menu_count ||
                        0
                    ),
                })
              )
          }
          mappings={
            mappingResult.data ||
            []
          }
        />

      </div>

    </main>
  )
}
