import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import POSControlClient from './POSControlClient'

type Params = Promise<{
  id: string
}>

export default async function POSControlDetailPage({
  params,
}: {
  params: Params
}) {
  const { id } =
    await params

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
    data: sale,
  } =
    await supabase
      .from('sales_secure')
      .select(`
        id,
        sale_no,
        sale_date,
        transaction_date,
        outlet_id,
        status,
        subtotal,
        discount_amount,
        complimentary_amount,
        void_amount,
        net_sales,
        grand_total,
        service_amount,
        tax_amount,
        payment_method,
        has_control_actions
      `)
      .eq(
        'id',
        id
      )
      .maybeSingle()

  if (!sale) {
    notFound()
  }

  const [
    itemResult,
    ruleResult,
    ruleItemResult,
    reasonResult,
    approvalResult,
    actionResult,
    accessResult,
  ] =
    await Promise.all([
      supabase
        .from(
          'sale_items_secure'
        )
        .select(`
          id,
          sale_id,
          menu_item_id,
          quantity,
          unit_price,
          gross_amount,
          discount_amount,
          complimentary_amount,
          void_amount,
          net_amount,
          total_cogs,
          gross_profit,
          menu_code,
          menu_name,
          menu_category,
          line_status,
          discount_rule_id,
          discount_rule_code,
          discount_rule_name,
          discount_type,
          discount_value,
          is_complimentary,
          complimentary_reason_id,
          complimentary_reason_code,
          complimentary_reason_name,
          complimentary_reason_text,
          void_reason_id,
          void_reason_code,
          void_reason_name,
          void_reason_text,
          voided_by,
          voided_by_name,
          voided_at
        `)
        .eq(
          'sale_id',
          id
        )
        .order(
          'created_at'
        ),

      supabase
        .from(
          'pos_discount_rules_secure'
        )
        .select(`
          id,
          code,
          name,
          outlet_id,
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
        .eq(
          'is_active',
          true
        )
        .eq(
          'scope',
          'ITEM'
        )
        .order('name'),

      supabase
        .from(
          'pos_discount_rule_items_secure'
        )
        .select(`
          discount_rule_id,
          menu_item_id
        `),

      supabase
        .from(
          'pos_control_reasons_secure'
        )
        .select(`
          id,
          reason_type,
          code,
          name,
          requires_note,
          display_order,
          is_active
        `)
        .eq(
          'is_active',
          true
        )
        .order(
          'reason_type'
        )
        .order(
          'display_order'
        ),

      supabase
        .from(
          'pos_approval_requests_secure'
        )
        .select(`
          id,
          outlet_id,
          sale_id,
          sale_item_id,
          action_type,
          requested_amount,
          reason_id,
          reason_code,
          reason_name,
          reason_text,
          requested_payload,
          status,
          requested_by,
          requested_by_name,
          requested_at,
          decided_by,
          decided_by_name,
          decided_at,
          decision_note,
          consumed_at,
          consumed_by
        `)
        .eq(
          'sale_id',
          id
        )
        .order(
          'requested_at',
          {
            ascending: false,
          }
        ),

      supabase
        .from(
          'pos_control_actions_secure'
        )
        .select(`
          id,
          sale_item_id,
          action_type,
          reason_code,
          reason_name,
          reason_text,
          amount,
          actor_name,
          approved_by_name,
          created_at
        `)
        .eq(
          'sale_id',
          id
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        ),

      supabase.rpc(
        'get_my_pos_control_access',
        {
          p_outlet_id:
            sale.outlet_id,
        }
      ),
    ])

  const {
    data: outlet,
  } =
    await supabase
      .from('outlets_secure')
      .select()
      .eq(
        'id',
        sale.outlet_id
      )
      .maybeSingle()


  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-7xl">

        <Link
          href="/dashboard/pos/control"
          className="text-sm text-zinc-500 hover:text-red-800"
        >
          ← POS Control
        </Link>

        <div className="mt-6">

          <p className="text-sm font-bold tracking-wider text-red-800">
            {
              outlet?.name ||
              'RESTAURANT OPERATIONS'
            }
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            {sale.sale_no}
          </h1>

          <p className="mt-2 text-zinc-500">
            Discount, Complimentary, Void & Approval
          </p>

        </div>

        <POSControlClient
          sale={{
            ...sale,
            subtotal:
              Number(
                sale.subtotal || 0
              ),
            discount_amount:
              Number(
                sale.discount_amount || 0
              ),
            complimentary_amount:
              Number(
                sale.complimentary_amount || 0
              ),
            void_amount:
              Number(
                sale.void_amount || 0
              ),
            net_sales:
              Number(
                sale.net_sales || 0
              ),
            grand_total:
              Number(
                sale.grand_total || 0
              ),
            service_amount:
              Number(
                sale.service_amount || 0
              ),
            tax_amount:
              Number(
                sale.tax_amount || 0
              ),
          }}
          items={
            (itemResult.data || [])
              .map(
                (item) => ({
                  ...item,
                  quantity:
                    Number(
                      item.quantity || 0
                    ),
                  unit_price:
                    Number(
                      item.unit_price || 0
                    ),
                  gross_amount:
                    Number(
                      item.gross_amount || 0
                    ),
                  discount_amount:
                    Number(
                      item.discount_amount || 0
                    ),
                  complimentary_amount:
                    Number(
                      item.complimentary_amount || 0
                    ),
                  void_amount:
                    Number(
                      item.void_amount || 0
                    ),
                  net_amount:
                    Number(
                      item.net_amount || 0
                    ),
                  total_cogs:
                    item.total_cogs ===
                    null
                      ? null
                      : Number(
                          item.total_cogs ||
                            0
                        ),
                  gross_profit:
                    item.gross_profit ===
                    null
                      ? null
                      : Number(
                          item.gross_profit ||
                            0
                        ),
                  discount_value:
                    Number(
                      item.discount_value || 0
                    ),
                })
              )
          }
          rules={
            (ruleResult.data || [])
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
          ruleItems={
            ruleItemResult.data ||
            []
          }
          reasons={
            reasonResult.data ||
            []
          }
          approvals={
            (approvalResult.data ||
              [])
              .map(
                (approval) => ({
                  ...approval,
                  requested_amount:
                    Number(
                      approval.requested_amount ||
                        0
                    ),
                })
              )
          }
          actions={
            (actionResult.data ||
              [])
              .map(
                (action) => ({
                  ...action,
                  amount:
                    Number(
                      action.amount ||
                        0
                    ),
                })
              )
          }
          access={
            (
              accessResult.data ||
              {}
            ) as {
              role_code?: string
              can_use_pos?: boolean
              can_view?: boolean
              can_create?: boolean
              can_update?: boolean
              can_approve?: boolean
              can_manage_global_config?: boolean
              can_manage_outlet_config?: boolean
            }
          }
        />

      </div>

    </main>
  )
}
