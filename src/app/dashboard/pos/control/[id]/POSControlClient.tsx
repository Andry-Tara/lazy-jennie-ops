'use client'

import {
  useMemo,
  useState,
} from 'react'

import { createClient } from '@/lib/supabase/client'

type Sale = {
  id: string
  sale_no: string
  outlet_id: string
  status: string
  subtotal: number
  discount_amount: number
  complimentary_amount: number
  void_amount: number
  net_sales: number
  grand_total: number
  service_amount: number
  tax_amount: number
  payment_method: string | null
  has_control_actions: boolean
}

type SaleItem = {
  id: string
  sale_id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  gross_amount: number
  discount_amount: number
  complimentary_amount: number
  void_amount: number
  net_amount: number
  total_cogs: number | null
  gross_profit: number | null
  menu_code: string | null
  menu_name: string | null
  menu_category: string | null
  line_status: string
  discount_rule_id: string | null
  discount_rule_code: string | null
  discount_rule_name: string | null
  discount_type: string | null
  discount_value: number
  is_complimentary: boolean
  complimentary_reason_id: string | null
  complimentary_reason_code: string | null
  complimentary_reason_name: string | null
  complimentary_reason_text: string | null
  void_reason_id: string | null
  void_reason_code: string | null
  void_reason_name: string | null
  void_reason_text: string | null
  voided_by: string | null
  voided_by_name: string | null
  voided_at: string | null
}

type DiscountRule = {
  id: string
  code: string
  name: string
  outlet_id: string | null
  scope: string
  discount_type: string
  discount_value: number
  max_discount_amount: number | null
  requires_approval: boolean
  valid_from: string | null
  valid_to: string | null
  is_active: boolean
  restricted_menu_count: number
}

type RuleItem = {
  discount_rule_id: string
  menu_item_id: string
}

type Reason = {
  id: string
  reason_type: string
  code: string
  name: string
  requires_note: boolean
  display_order: number
  is_active: boolean
}

type Approval = {
  id: string
  outlet_id: string
  sale_id: string | null
  sale_item_id: string | null
  action_type: string
  requested_amount: number
  reason_id: string | null
  reason_code: string | null
  reason_name: string | null
  reason_text: string | null
  requested_payload: Record<
    string,
    unknown
  > | null
  status: string
  requested_by: string
  requested_by_name: string | null
  requested_at: string
  decided_by: string | null
  decided_by_name: string | null
  decided_at: string | null
  decision_note: string | null
  consumed_at: string | null
  consumed_by: string | null
}

type ActionRow = {
  id: string
  sale_item_id: string | null
  action_type: string
  reason_code: string | null
  reason_name: string | null
  reason_text: string | null
  amount: number
  actor_name: string | null
  approved_by_name: string | null
  created_at: string
}

type Access = {
  role_code?: string
  can_use_pos?: boolean
  can_view?: boolean
  can_create?: boolean
  can_update?: boolean
  can_approve?: boolean
  can_manage_global_config?: boolean
  can_manage_outlet_config?: boolean
}

type Props = {
  sale: Sale
  items: SaleItem[]
  rules: DiscountRule[]
  ruleItems: RuleItem[]
  reasons: Reason[]
  approvals: Approval[]
  actions: ActionRow[]
  access: Access
}

type OpenAction =
  | 'PRESET'
  | 'MANUAL'
  | 'COMPLIMENTARY'
  | 'VOID'
  | null

export default function POSControlClient({
  sale,
  items,
  rules,
  ruleItems,
  reasons,
  approvals,
  actions,
  access,
}: Props) {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [
    activeItemId,
    setActiveItemId,
  ] = useState('')

  const [
    openAction,
    setOpenAction,
  ] = useState<OpenAction>(
    null
  )

  const [
    selectedRuleId,
    setSelectedRuleId,
  ] = useState('')

  const [
    selectedReasonId,
    setSelectedReasonId,
  ] = useState('')

  const [
    reasonText,
    setReasonText,
  ] = useState('')

  const [
    manualAmount,
    setManualAmount,
  ] = useState('')

  const [
    busy,
    setBusy,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    success,
    setSuccess,
  ] = useState('')

  const canApprove =
    Boolean(
      access.can_approve
    )

  function formatRupiah(
    value: number
  ) {
    return new Intl.NumberFormat(
      'id-ID',
      {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }
    ).format(value)
  }

  function resetForm() {
    setActiveItemId('')
    setOpenAction(null)
    setSelectedRuleId('')
    setSelectedReasonId('')
    setReasonText('')
    setManualAmount('')
    setError('')
  }

  function beginAction(
    itemId: string,
    action: OpenAction
  ) {
    setActiveItemId(
      itemId
    )
    setOpenAction(
      action
    )
    setSelectedRuleId('')
    setSelectedReasonId('')
    setReasonText('')
    setManualAmount('')
    setError('')
    setSuccess('')
  }

  function reasonsFor(
    type: string
  ) {
    return reasons.filter(
      (reason) =>
        reason.reason_type ===
        type
    )
  }

  function rulesForItem(
    item: SaleItem
  ) {
    return rules.filter(
      (rule) => {
        if (
          rule.outlet_id &&
          rule.outlet_id !==
            sale.outlet_id
        ) {
          return false
        }

        if (
          rule.restricted_menu_count <=
          0
        ) {
          return true
        }

        return ruleItems.some(
          (mapping) =>
            mapping.discount_rule_id ===
              rule.id &&
            mapping.menu_item_id ===
              item.menu_item_id
        )
      }
    )
  }

  function calculateRuleDiscount(
    item: SaleItem,
    rule: DiscountRule
  ) {
    let amount = 0

    if (
      rule.discount_type ===
      'PERCENT'
    ) {
      amount =
        item.gross_amount *
        rule.discount_value /
        100
    } else {
      amount =
        Math.min(
          rule.discount_value,
          item.gross_amount
        )
    }

    if (
      rule.max_discount_amount !==
      null
    ) {
      amount =
        Math.min(
          amount,
          rule.max_discount_amount
        )
    }

    return Math.max(
      Math.min(
        Math.round(
          amount * 100
        ) / 100,
        item.gross_amount
      ),
      0
    )
  }

  function selectedReason() {
    return reasons.find(
      (reason) =>
        reason.id ===
        selectedReasonId
    )
  }

  function validateReason() {
    const reason =
      selectedReason()

    if (!reason) {
      setError(
        'Pilih reason terlebih dahulu.'
      )
      return false
    }

    if (
      reason.requires_note &&
      reasonText
        .trim()
        .length < 3
    ) {
      setError(
        'Reason note wajib diisi.'
      )
      return false
    }

    return true
  }

  async function requestApproval(
    item: SaleItem,
    actionType: string,
    amount: number,
    reasonId: string | null,
    payload: Record<
      string,
      unknown
    >
  ) {
    const {
      error: rpcError,
    } =
      await supabase.rpc(
        'create_pos_approval_request',
        {
          p_outlet_id:
            sale.outlet_id,

          p_sale_id:
            sale.id,

          p_sale_item_id:
            item.id,

          p_action_type:
            actionType,

          p_requested_amount:
            amount,

          p_reason_id:
            reasonId,

          p_reason_text:
            reasonText.trim() ||
            null,

          p_requested_payload:
            payload,
        }
      )

    if (rpcError) {
      throw rpcError
    }
  }

  async function runPreset(
    item: SaleItem
  ) {
    setError('')
    setSuccess('')

    const rule =
      rules.find(
        (row) =>
          row.id ===
          selectedRuleId
      )

    if (!rule) {
      setError(
        'Pilih discount rule.'
      )
      return
    }

    const amount =
      calculateRuleDiscount(
        item,
        rule
      )

    if (amount <= 0) {
      setError(
        'Discount amount tidak valid.'
      )
      return
    }

    setBusy(true)

    try {
      if (
        rule.requires_approval &&
        !canApprove
      ) {
        await requestApproval(
          item,
          'ITEM_DISCOUNT',
          amount,
          null,
          {
            discount_rule_id:
              rule.id,
          }
        )

        setSuccess(
          'Approval request berhasil dibuat. Manager harus approve sebelum discount diterapkan.'
        )

        resetForm()
        window.location.reload()
        return
      }

      const {
        error: rpcError,
      } =
        await supabase.rpc(
          'apply_pos_item_discount_secure',
          {
            p_sale_item_id:
              item.id,

            p_discount_rule_id:
              rule.id,

            p_reason_id:
              null,

            p_reason_text:
              null,

            p_approval_request_id:
              null,
          }
        )

      if (rpcError) {
        throw rpcError
      }

      window.location.reload()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to apply discount.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function runManual(
    item: SaleItem
  ) {
    setError('')
    setSuccess('')

    if (!validateReason()) {
      return
    }

    const amount =
      Number(
        manualAmount || 0
      )

    if (
      amount <= 0 ||
      amount >
        item.gross_amount
    ) {
      setError(
        'Manual discount amount tidak valid.'
      )
      return
    }

    setBusy(true)

    try {
      if (!canApprove) {
        await requestApproval(
          item,
          'ITEM_DISCOUNT',
          amount,
          selectedReasonId,
          {
            manual: true,
          }
        )

        setSuccess(
          'Manual discount dikirim untuk Manager Approval.'
        )

        resetForm()
        window.location.reload()
        return
      }

      const {
        error: rpcError,
      } =
        await supabase.rpc(
          'apply_pos_manual_item_discount_secure',
          {
            p_sale_item_id:
              item.id,

            p_discount_amount:
              amount,

            p_reason_id:
              selectedReasonId,

            p_reason_text:
              reasonText.trim() ||
              null,

            p_approval_request_id:
              null,
          }
        )

      if (rpcError) {
        throw rpcError
      }

      window.location.reload()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to apply manual discount.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function runComplimentary(
    item: SaleItem
  ) {
    setError('')
    setSuccess('')

    if (!validateReason()) {
      return
    }

    const amount =
      Math.max(
        item.gross_amount -
          item.discount_amount,
        0
      )

    setBusy(true)

    try {
      if (!canApprove) {
        await requestApproval(
          item,
          'COMPLIMENTARY',
          amount,
          selectedReasonId,
          {}
        )

        setSuccess(
          'Complimentary request dikirim untuk Manager Approval.'
        )

        resetForm()
        window.location.reload()
        return
      }

      const {
        error: rpcError,
      } =
        await supabase.rpc(
          'set_pos_item_complimentary_secure',
          {
            p_sale_item_id:
              item.id,

            p_reason_id:
              selectedReasonId,

            p_reason_text:
              reasonText.trim() ||
              null,

            p_approval_request_id:
              null,
          }
        )

      if (rpcError) {
        throw rpcError
      }

      window.location.reload()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to set complimentary.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function runVoid(
    item: SaleItem
  ) {
    setError('')
    setSuccess('')

    if (!validateReason()) {
      return
    }

    const amount =
      Math.max(
        item.gross_amount -
          item.discount_amount,
        0
      )

    setBusy(true)

    try {
      if (!canApprove) {
        await requestApproval(
          item,
          'VOID_ITEM',
          amount,
          selectedReasonId,
          {}
        )

        setSuccess(
          'Void request dikirim untuk Manager Approval.'
        )

        resetForm()
        window.location.reload()
        return
      }

      const {
        error: rpcError,
      } =
        await supabase.rpc(
          'void_pos_sale_item_secure',
          {
            p_sale_item_id:
              item.id,

            p_reason_id:
              selectedReasonId,

            p_reason_text:
              reasonText.trim() ||
              null,

            p_approval_request_id:
              null,
          }
        )

      if (rpcError) {
        throw rpcError
      }

      window.location.reload()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to void item.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function applyApproved(
    approval: Approval
  ) {
    if (
      approval.consumed_at
    ) {
      return
    }

    const item =
      items.find(
        (row) =>
          row.id ===
          approval.sale_item_id
      )

    if (!item) {
      setError(
        'Sale item approval tidak ditemukan.'
      )
      return
    }

    setBusy(true)
    setError('')

    try {
      const payload =
        approval.requested_payload ||
        {}

      if (
        approval.action_type ===
        'ITEM_DISCOUNT'
      ) {
        const ruleId =
          typeof payload.discount_rule_id ===
          'string'
            ? payload.discount_rule_id
            : ''

        if (ruleId) {
          const {
            error: rpcError,
          } =
            await supabase.rpc(
              'apply_pos_item_discount_secure',
              {
                p_sale_item_id:
                  item.id,

                p_discount_rule_id:
                  ruleId,

                p_reason_id:
                  approval.reason_id,

                p_reason_text:
                  approval.reason_text,

                p_approval_request_id:
                  approval.id,
              }
            )

          if (rpcError) {
            throw rpcError
          }
        } else {
          const {
            error: rpcError,
          } =
            await supabase.rpc(
              'apply_pos_manual_item_discount_secure',
              {
                p_sale_item_id:
                  item.id,

                p_discount_amount:
                  approval.requested_amount,

                p_reason_id:
                  approval.reason_id,

                p_reason_text:
                  approval.reason_text,

                p_approval_request_id:
                  approval.id,
              }
            )

          if (rpcError) {
            throw rpcError
          }
        }
      }

      if (
        approval.action_type ===
        'COMPLIMENTARY'
      ) {
        const {
          error: rpcError,
        } =
          await supabase.rpc(
            'set_pos_item_complimentary_secure',
            {
              p_sale_item_id:
                item.id,

              p_reason_id:
                approval.reason_id,

              p_reason_text:
                approval.reason_text,

              p_approval_request_id:
                approval.id,
            }
          )

        if (rpcError) {
          throw rpcError
        }
      }

      if (
        approval.action_type ===
        'VOID_ITEM'
      ) {
        const {
          error: rpcError,
        } =
          await supabase.rpc(
            'void_pos_sale_item_secure',
            {
              p_sale_item_id:
                item.id,

              p_reason_id:
                approval.reason_id,

              p_reason_text:
                approval.reason_text,

              p_approval_request_id:
                approval.id,
            }
          )

        if (rpcError) {
          throw rpcError
        }
      }

      window.location.reload()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to apply approved action.'
      )
    } finally {
      setBusy(false)
    }
  }

  const approvedToApply =
    approvals.filter(
      (approval) =>
        approval.status ===
          'APPROVED' &&
        !approval.consumed_at
    )

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">

      <div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <Summary
            label="Subtotal"
            value={
              formatRupiah(
                sale.subtotal
              )
            }
          />

          <Summary
            label="Discount"
            value={
              `-${formatRupiah(
                sale.discount_amount
              )}`
            }
          />

          <Summary
            label="Complimentary / Void"
            value={
              `${formatRupiah(
                sale.complimentary_amount
              )} / ${formatRupiah(
                sale.void_amount
              )}`
            }
          />

          <Summary
            label="Grand Total"
            value={
              formatRupiah(
                sale.grand_total
              )
            }
            strong
          />

        </div>

        {approvedToApply.length >
          0 && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">

            <h2 className="font-bold text-green-900">
              Approved — Ready to Apply
            </h2>

            <div className="mt-4 space-y-3">

              {approvedToApply.map(
                (approval) => (
                  <div
                    key={
                      approval.id
                    }
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4"
                  >

                    <div>

                      <p className="font-bold">
                        {approval.action_type}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {approval.reason_name ||
                          '-'}
                        {' • '}
                        {formatRupiah(
                          approval.requested_amount
                        )}
                        {' • Approved by '}
                        {approval.decided_by_name ||
                          'Manager'}
                      </p>

                    </div>

                    <button
                      type="button"
                      disabled={
                        busy
                      }
                      onClick={() =>
                        void applyApproved(
                          approval
                        )
                      }
                      className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                    >
                      Apply Approved
                    </button>

                  </div>
                )
              )}

            </div>

          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-700">
            {success}
          </div>
        )}

        <div className="mt-6 space-y-4">

          {items.map(
            (item) => {
              const disabled =
                item.line_status ===
                  'VOIDED' ||
                item.is_complimentary

              return (
                <div
                  key={
                    item.id
                  }
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >

                  <div className="flex flex-wrap items-start justify-between gap-4">

                    <div>

                      <div className="flex flex-wrap items-center gap-2">

                        <h3 className="text-lg font-bold">
                          {item.menu_name ||
                            item.menu_code}
                        </h3>

                        {item.discount_amount >
                          0 && (
                          <Badge>
                            DISCOUNT
                          </Badge>
                        )}

                        {item.is_complimentary && (
                          <Badge tone="green">
                            COMPLIMENTARY
                          </Badge>
                        )}

                        {item.line_status ===
                          'VOIDED' && (
                          <Badge tone="red">
                            VOID
                          </Badge>
                        )}

                      </div>

                      <p className="mt-2 text-sm text-zinc-500">
                        {item.quantity}
                        {' × '}
                        {formatRupiah(
                          item.unit_price
                        )}
                        {' = '}
                        {formatRupiah(
                          item.gross_amount
                        )}
                      </p>

                      {item.discount_rule_name && (
                        <p className="mt-2 text-xs font-semibold text-amber-700">
                          {item.discount_rule_name}
                        </p>
                      )}

                      {item.complimentary_reason_name && (
                        <p className="mt-2 text-xs text-green-700">
                          Complimentary: {item.complimentary_reason_name}
                        </p>
                      )}

                      {item.void_reason_name && (
                        <p className="mt-2 text-xs text-red-700">
                          Void: {item.void_reason_name}
                        </p>
                      )}

                    </div>

                    <div className="text-right">

                      <p className="text-xs text-zinc-400">
                        Net Amount
                      </p>

                      <p className="mt-1 text-xl font-bold text-red-900">
                        {formatRupiah(
                          item.net_amount
                        )}
                      </p>

                    </div>

                  </div>

                  {!disabled &&
                    item.discount_amount ===
                      0 && (
                    <div className="mt-5 flex flex-wrap gap-2">

                      <button
                        type="button"
                        onClick={() =>
                          beginAction(
                            item.id,
                            'PRESET'
                          )
                        }
                        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold"
                      >
                        Preset Discount
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          beginAction(
                            item.id,
                            'MANUAL'
                          )
                        }
                        className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900"
                      >
                        Manual Discount
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          beginAction(
                            item.id,
                            'COMPLIMENTARY'
                          )
                        }
                        className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-800"
                      >
                        Complimentary
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          beginAction(
                            item.id,
                            'VOID'
                          )
                        }
                        className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800"
                      >
                        Void Item
                      </button>

                    </div>
                  )}

                  {!disabled &&
                    item.discount_amount >
                      0 && (
                    <div className="mt-5 flex flex-wrap gap-2">

                      <button
                        type="button"
                        onClick={() =>
                          beginAction(
                            item.id,
                            'COMPLIMENTARY'
                          )
                        }
                        className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-800"
                      >
                        Complimentary
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          beginAction(
                            item.id,
                            'VOID'
                          )
                        }
                        className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800"
                      >
                        Void Item
                      </button>

                    </div>
                  )}

                  {activeItemId ===
                    item.id &&
                    openAction && (
                    <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">

                      {openAction ===
                        'PRESET' && (
                        <PresetForm
                          rules={
                            rulesForItem(
                              item
                            )
                          }
                          selectedRuleId={
                            selectedRuleId
                          }
                          setSelectedRuleId={
                            setSelectedRuleId
                          }
                          onSubmit={() =>
                            void runPreset(
                              item
                            )
                          }
                          onCancel={
                            resetForm
                          }
                          busy={
                            busy
                          }
                          canApprove={
                            canApprove
                          }
                          item={
                            item
                          }
                          calculate={
                            calculateRuleDiscount
                          }
                          formatRupiah={
                            formatRupiah
                          }
                        />
                      )}

                      {openAction ===
                        'MANUAL' && (
                        <ReasonForm
                          title="Manual Discount"
                          reasons={
                            reasonsFor(
                              'MANUAL_DISCOUNT'
                            )
                          }
                          selectedReasonId={
                            selectedReasonId
                          }
                          setSelectedReasonId={
                            setSelectedReasonId
                          }
                          reasonText={
                            reasonText
                          }
                          setReasonText={
                            setReasonText
                          }
                          amount={
                            manualAmount
                          }
                          setAmount={
                            setManualAmount
                          }
                          showAmount
                          onSubmit={() =>
                            void runManual(
                              item
                            )
                          }
                          onCancel={
                            resetForm
                          }
                          busy={
                            busy
                          }
                          canApprove={
                            canApprove
                          }
                        />
                      )}

                      {openAction ===
                        'COMPLIMENTARY' && (
                        <ReasonForm
                          title="Complimentary Item"
                          reasons={
                            reasonsFor(
                              'COMPLIMENTARY'
                            )
                          }
                          selectedReasonId={
                            selectedReasonId
                          }
                          setSelectedReasonId={
                            setSelectedReasonId
                          }
                          reasonText={
                            reasonText
                          }
                          setReasonText={
                            setReasonText
                          }
                          amount=""
                          setAmount={() => {}}
                          onSubmit={() =>
                            void runComplimentary(
                              item
                            )
                          }
                          onCancel={
                            resetForm
                          }
                          busy={
                            busy
                          }
                          canApprove={
                            canApprove
                          }
                        />
                      )}

                      {openAction ===
                        'VOID' && (
                        <ReasonForm
                          title="Void Item"
                          reasons={
                            reasonsFor(
                              'VOID'
                            )
                          }
                          selectedReasonId={
                            selectedReasonId
                          }
                          setSelectedReasonId={
                            setSelectedReasonId
                          }
                          reasonText={
                            reasonText
                          }
                          setReasonText={
                            setReasonText
                          }
                          amount=""
                          setAmount={() => {}}
                          onSubmit={() =>
                            void runVoid(
                              item
                            )
                          }
                          onCancel={
                            resetForm
                          }
                          busy={
                            busy
                          }
                          canApprove={
                            canApprove
                          }
                        />
                      )}

                    </div>
                  )}

                </div>
              )
            }
          )}

        </div>

      </div>

      <div>

        <div className="sticky top-6 space-y-6">

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <h2 className="font-bold">
              Permission
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Role: {access.role_code || '-'}
            </p>

            <p className="mt-2 text-sm">
              Manager Approval:{' '}
              <strong>
                {canApprove
                  ? 'YES'
                  : 'REQUEST REQUIRED'}
              </strong>
            </p>

          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <h2 className="font-bold">
              Approval History
            </h2>

            <div className="mt-4 space-y-3">

              {!approvals.length && (
                <p className="text-sm text-zinc-400">
                  No approval request.
                </p>
              )}

              {approvals.map(
                (approval) => (
                  <div
                    key={
                      approval.id
                    }
                    className="rounded-xl border border-zinc-200 p-3"
                  >

                    <div className="flex items-center justify-between gap-2">

                      <p className="text-sm font-bold">
                        {approval.action_type}
                      </p>

                      <Badge
                        tone={
                          approval.status ===
                          'APPROVED'
                            ? 'green'
                            : approval.status ===
                              'REJECTED'
                            ? 'red'
                            : 'amber'
                        }
                      >
                        {approval.status}
                      </Badge>

                    </div>

                    <p className="mt-2 text-xs text-zinc-500">
                      {approval.requested_by_name ||
                        'User'}
                      {' • '}
                      {formatRupiah(
                        approval.requested_amount
                      )}
                    </p>

                    {approval.consumed_at && (
                      <p className="mt-2 text-xs font-semibold text-green-700">
                        APPLIED
                      </p>
                    )}

                  </div>
                )
              )}

            </div>

          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <h2 className="font-bold">
              Audit Trail
            </h2>

            <div className="mt-4 space-y-3">

              {!actions.length && (
                <p className="text-sm text-zinc-400">
                  No POS Control action.
                </p>
              )}

              {actions.map(
                (action) => (
                  <div
                    key={
                      action.id
                    }
                    className="rounded-xl border border-zinc-200 p-3"
                  >

                    <p className="text-sm font-bold">
                      {action.action_type}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      {formatRupiah(
                        action.amount
                      )}
                      {' • '}
                      {action.actor_name ||
                        'User'}
                    </p>

                    {action.reason_name && (
                      <p className="mt-2 text-xs text-zinc-500">
                        {action.reason_name}
                      </p>
                    )}

                    {action.approved_by_name && (
                      <p className="mt-1 text-xs font-semibold text-green-700">
                        Approved by {action.approved_by_name}
                      </p>
                    )}

                  </div>
                )
              )}

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}

function Summary({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">

      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </p>

      <p
        className={`mt-2 ${
          strong
            ? 'text-xl font-bold text-red-900'
            : 'text-lg font-bold'
        }`}
      >
        {value}
      </p>

    </div>
  )
}

function Badge({
  children,
  tone = 'amber',
}: {
  children:
    React.ReactNode
  tone?:
    | 'amber'
    | 'green'
    | 'red'
}) {
  const style =
    tone === 'green'
      ? 'bg-green-100 text-green-800'
      : tone === 'red'
      ? 'bg-red-100 text-red-800'
      : 'bg-amber-100 text-amber-800'

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${style}`}
    >
      {children}
    </span>
  )
}

function PresetForm({
  rules,
  selectedRuleId,
  setSelectedRuleId,
  onSubmit,
  onCancel,
  busy,
  canApprove,
  item,
  calculate,
  formatRupiah,
}: {
  rules: DiscountRule[]
  selectedRuleId: string
  setSelectedRuleId:
    (value: string) => void
  onSubmit: () => void
  onCancel: () => void
  busy: boolean
  canApprove: boolean
  item: SaleItem
  calculate:
    (
      item: SaleItem,
      rule: DiscountRule
    ) => number
  formatRupiah:
    (value: number) => string
}) {
  const selected =
    rules.find(
      (rule) =>
        rule.id ===
        selectedRuleId
    )

  return (
    <div>

      <p className="font-bold">
        Preset Discount
      </p>

      <select
        value={
          selectedRuleId
        }
        onChange={(
          event
        ) =>
          setSelectedRuleId(
            event.target.value
          )
        }
        className="mt-3 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3"
      >

        <option value="">
          Select Discount
        </option>

        {rules.map(
          (rule) => (
            <option
              key={
                rule.id
              }
              value={
                rule.id
              }
            >
              {rule.name}
              {' — '}
              {rule.discount_type ===
              'PERCENT'
                ? `${rule.discount_value}%`
                : formatRupiah(
                    rule.discount_value
                  )}
              {rule.requires_approval
                ? ' — Approval'
                : ''}
            </option>
          )
        )}

      </select>

      {selected && (
        <div className="mt-3 rounded-lg bg-white p-3 text-sm">

          Discount:{' '}
          <strong>
            {formatRupiah(
              calculate(
                item,
                selected
              )
            )}
          </strong>

          {selected.requires_approval &&
            !canApprove && (
            <span className="ml-2 text-amber-700">
              Manager approval required.
            </span>
          )}

        </div>
      )}

      <div className="mt-4 flex gap-2">

        <button
          type="button"
          disabled={
            busy ||
            !selectedRuleId
          }
          onClick={
            onSubmit
          }
          className="rounded-lg bg-red-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {selected?.requires_approval &&
          !canApprove
            ? 'Request Approval'
            : 'Apply Discount'}
        </button>

        <button
          type="button"
          onClick={
            onCancel
          }
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold"
        >
          Cancel
        </button>

      </div>

    </div>
  )
}

function ReasonForm({
  title,
  reasons,
  selectedReasonId,
  setSelectedReasonId,
  reasonText,
  setReasonText,
  amount,
  setAmount,
  showAmount = false,
  onSubmit,
  onCancel,
  busy,
  canApprove,
}: {
  title: string
  reasons: Reason[]
  selectedReasonId: string
  setSelectedReasonId:
    (value: string) => void
  reasonText: string
  setReasonText:
    (value: string) => void
  amount: string
  setAmount:
    (value: string) => void
  showAmount?: boolean
  onSubmit: () => void
  onCancel: () => void
  busy: boolean
  canApprove: boolean
}) {
  return (
    <div>

      <p className="font-bold">
        {title}
      </p>

      {showAmount && (
        <input
          type="number"
          min="0"
          value={
            amount
          }
          onChange={(
            event
          ) =>
            setAmount(
              event.target.value
            )
          }
          placeholder="Discount amount"
          className="mt-3 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3"
        />
      )}

      <select
        value={
          selectedReasonId
        }
        onChange={(
          event
        ) =>
          setSelectedReasonId(
            event.target.value
          )
        }
        className="mt-3 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3"
      >

        <option value="">
          Select Reason
        </option>

        {reasons.map(
          (reason) => (
            <option
              key={
                reason.id
              }
              value={
                reason.id
              }
            >
              {reason.name}
              {reason.requires_note
                ? ' *'
                : ''}
            </option>
          )
        )}

      </select>

      <textarea
        rows={2}
        value={
          reasonText
        }
        onChange={(
          event
        ) =>
          setReasonText(
            event.target.value
          )
        }
        placeholder="Reason note / detail"
        className="mt-3 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3"
      />

      {!canApprove && (
        <p className="mt-2 text-xs font-semibold text-amber-700">
          This action requires Manager Approval.
        </p>
      )}

      <div className="mt-4 flex gap-2">

        <button
          type="button"
          disabled={
            busy ||
            !selectedReasonId
          }
          onClick={
            onSubmit
          }
          className="rounded-lg bg-red-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {canApprove
            ? 'Apply'
            : 'Request Approval'}
        </button>

        <button
          type="button"
          onClick={
            onCancel
          }
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold"
        >
          Cancel
        </button>

      </div>

    </div>
  )
}
