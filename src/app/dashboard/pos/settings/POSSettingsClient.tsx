'use client'

import {
  useMemo,
  useState,
} from 'react'

import { createClient } from '@/lib/supabase/client'

type Outlet = {
  id: string
  code: string
  name: string
  type: string
}

type Menu = {
  id: string
  code: string
  name: string
  category: string | null
}

type Rule = {
  id: string
  code: string
  name: string
  outlet_id: string | null
  outlet_code: string | null
  outlet_name: string | null
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

type Mapping = {
  discount_rule_id: string
  menu_item_id: string
}

type Props = {
  roleCode: string
  assignedOutletId: string
  outlets: Outlet[]
  menus: Menu[]
  rules: Rule[]
  mappings: Mapping[]
}

export default function POSSettingsClient({
  roleCode,
  assignedOutletId,
  outlets,
  menus,
  rules,
  mappings,
}: Props) {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const isGlobalRole =
    roleCode ===
      'SUPER_ADMIN' ||
    roleCode ===
      'MANAGEMENT'

  const [
    code,
    setCode,
  ] = useState('')

  const [
    name,
    setName,
  ] = useState('')

  const [
    outletId,
    setOutletId,
  ] = useState(
    isGlobalRole
      ? ''
      : assignedOutletId
  )

  const [
    discountType,
    setDiscountType,
  ] = useState('PERCENT')

  const [
    discountValue,
    setDiscountValue,
  ] = useState('10')

  const [
    maxAmount,
    setMaxAmount,
  ] = useState('')

  const [
    requiresApproval,
    setRequiresApproval,
  ] = useState(false)

  const [
    validFrom,
    setValidFrom,
  ] = useState('')

  const [
    validTo,
    setValidTo,
  ] = useState('')

  const [
    selectedMenus,
    setSelectedMenus,
  ] = useState<string[]>([])

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    busy,
    setBusy,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

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

  const filteredMenus =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase()

      if (!keyword) {
        return menus
      }

      return menus.filter(
        (menu) =>
          menu.name
            .toLowerCase()
            .includes(keyword) ||
          menu.code
            .toLowerCase()
            .includes(keyword) ||
          (
            menu.category || ''
          )
            .toLowerCase()
            .includes(keyword)
      )
    }, [
      menus,
      search,
    ])

  function toggleMenu(
    id: string
  ) {
    setSelectedMenus(
      (current) =>
        current.includes(id)
          ? current.filter(
              (value) =>
                value !== id
            )
          : [
              ...current,
              id,
            ]
    )
  }

  async function createRule() {
    setError('')

    if (
      !code.trim() ||
      !name.trim()
    ) {
      setError(
        'Code dan name wajib diisi.'
      )
      return
    }

    const value =
      Number(
        discountValue || 0
      )

    if (value <= 0) {
      setError(
        'Discount value tidak valid.'
      )
      return
    }

    setBusy(true)

    try {
      const {
        data: ruleId,
        error: createError,
      } =
        await supabase.rpc(
          'create_pos_discount_rule_secure',
          {
            p_code:
              code.trim(),

            p_name:
              name.trim(),

            p_outlet_id:
              outletId ||
              null,

            p_scope:
              'ITEM',

            p_discount_type:
              discountType,

            p_discount_value:
              value,

            p_max_discount_amount:
              maxAmount
                ? Number(
                    maxAmount
                  )
                : null,

            p_requires_approval:
              requiresApproval,

            p_valid_from:
              validFrom ||
              null,

            p_valid_to:
              validTo ||
              null,

            p_is_active:
              true,
          }
        )

      if (createError) {
        throw createError
      }

      if (
        selectedMenus.length >
        0
      ) {
        const {
          error: mappingError,
        } =
          await supabase.rpc(
            'set_pos_discount_rule_items_secure',
            {
              p_rule_id:
                ruleId,

              p_menu_item_ids:
                selectedMenus,
            }
          )

        if (mappingError) {
          throw mappingError
        }
      }

      window.location.reload()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create discount rule.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(
    rule: Rule
  ) {
    setBusy(true)
    setError('')

    try {
      const {
        error: rpcError,
      } =
        await supabase.rpc(
          'update_pos_discount_rule_secure',
          {
            p_rule_id:
              rule.id,

            p_code:
              rule.code,

            p_name:
              rule.name,

            p_outlet_id:
              rule.outlet_id,

            p_scope:
              rule.scope,

            p_discount_type:
              rule.discount_type,

            p_discount_value:
              rule.discount_value,

            p_max_discount_amount:
              rule.max_discount_amount,

            p_requires_approval:
              rule.requires_approval,

            p_valid_from:
              rule.valid_from,

            p_valid_to:
              rule.valid_to,

            p_is_active:
              !rule.is_active,
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
          : 'Failed to update discount rule.'
      )
    } finally {
      setBusy(false)
    }
  }

  function mappedMenuNames(
    ruleId: string
  ) {
    const ids =
      mappings
        .filter(
          (row) =>
            row.discount_rule_id ===
            ruleId
        )
        .map(
          (row) =>
            row.menu_item_id
        )

    if (!ids.length) {
      return 'All Menu Items'
    }

    return menus
      .filter(
        (menu) =>
          ids.includes(
            menu.id
          )
      )
      .map(
        (menu) =>
          menu.name
      )
      .join(', ')
  }

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[440px_1fr]">

      <div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold">
            New Item Discount
          </h2>

          <div className="mt-5 grid gap-4">

            <div className="grid grid-cols-2 gap-3">

              <input
                value={
                  code
                }
                onChange={(
                  event
                ) =>
                  setCode(
                    event.target.value
                  )
                }
                placeholder="Code"
                className="rounded-xl border border-zinc-300 px-4 py-3"
              />

              <input
                value={
                  name
                }
                onChange={(
                  event
                ) =>
                  setName(
                    event.target.value
                  )
                }
                placeholder="Discount name"
                className="rounded-xl border border-zinc-300 px-4 py-3"
              />

            </div>

            <div>

              <label className="mb-2 block text-sm font-semibold">
                Location
              </label>

              <select
                value={
                  outletId
                }
                onChange={(
                  event
                ) =>
                  setOutletId(
                    event.target.value
                  )
                }
                disabled={
                  !isGlobalRole
                }
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 disabled:bg-zinc-100"
              >

                {isGlobalRole && (
                  <option value="">
                    GLOBAL — All Locations
                  </option>
                )}

                {outlets.map(
                  (outlet) => (
                    <option
                      key={
                        outlet.id
                      }
                      value={
                        outlet.id
                      }
                    >
                      {outlet.code}
                      {' — '}
                      {outlet.name}
                    </option>
                  )
                )}

              </select>

            </div>

            <div className="grid grid-cols-2 gap-3">

              <select
                value={
                  discountType
                }
                onChange={(
                  event
                ) =>
                  setDiscountType(
                    event.target.value
                  )
                }
                className="rounded-xl border border-zinc-300 px-4 py-3"
              >
                <option value="PERCENT">
                  Percent
                </option>
                <option value="FIXED">
                  Fixed Amount
                </option>
              </select>

              <input
                type="number"
                min="0"
                value={
                  discountValue
                }
                onChange={(
                  event
                ) =>
                  setDiscountValue(
                    event.target.value
                  )
                }
                placeholder="Value"
                className="rounded-xl border border-zinc-300 px-4 py-3"
              />

            </div>

            <input
              type="number"
              min="0"
              value={
                maxAmount
              }
              onChange={(
                event
              ) =>
                setMaxAmount(
                  event.target.value
                )
              }
              placeholder="Max discount amount (optional)"
              className="rounded-xl border border-zinc-300 px-4 py-3"
            />

            <div className="grid grid-cols-2 gap-3">

              <div>

                <label className="mb-2 block text-xs font-semibold">
                  Valid From
                </label>

                <input
                  type="date"
                  value={
                    validFrom
                  }
                  onChange={(
                    event
                  ) =>
                    setValidFrom(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                />

              </div>

              <div>

                <label className="mb-2 block text-xs font-semibold">
                  Valid To
                </label>

                <input
                  type="date"
                  value={
                    validTo
                  }
                  onChange={(
                    event
                  ) =>
                    setValidTo(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                />

              </div>

            </div>

            <label className="flex items-center gap-3 rounded-xl bg-amber-50 p-4">

              <input
                type="checkbox"
                checked={
                  requiresApproval
                }
                onChange={(
                  event
                ) =>
                  setRequiresApproval(
                    event.target.checked
                  )
                }
              />

              <span className="text-sm font-semibold text-amber-900">
                Requires Manager Approval
              </span>

            </label>

            <div>

              <div className="flex items-center justify-between">

                <label className="text-sm font-semibold">
                  Applicable Menu
                </label>

                <span className="text-xs text-zinc-400">
                  Empty = All Menu
                </span>

              </div>

              <input
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search menu..."
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-2.5"
              />

              <div className="mt-3 max-h-52 overflow-y-auto rounded-xl border border-zinc-200">

                {filteredMenus.map(
                  (menu) => (
                    <label
                      key={
                        menu.id
                      }
                      className="flex cursor-pointer items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-0"
                    >

                      <input
                        type="checkbox"
                        checked={
                          selectedMenus.includes(
                            menu.id
                          )
                        }
                        onChange={() =>
                          toggleMenu(
                            menu.id
                          )
                        }
                      />

                      <div>

                        <p className="text-sm font-semibold">
                          {menu.name}
                        </p>

                        <p className="text-xs text-zinc-400">
                          {menu.code}
                          {' • '}
                          {menu.category ||
                            '-'}
                        </p>

                      </div>

                    </label>
                  )
                )}

              </div>

            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="button"
              disabled={
                busy
              }
              onClick={() =>
                void createRule()
              }
              className="rounded-xl bg-red-900 px-5 py-3 font-bold text-white disabled:opacity-50"
            >
              Create Discount Rule
            </button>

          </div>

        </div>

      </div>

      <div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold">
            Discount Rules
          </h2>

          <div className="mt-5 space-y-4">

            {!rules.length && (
              <p className="text-sm text-zinc-400">
                No discount rule.
              </p>
            )}

            {rules.map(
              (rule) => (
                <div
                  key={
                    rule.id
                  }
                  className="rounded-xl border border-zinc-200 p-4"
                >

                  <div className="flex flex-wrap items-start justify-between gap-4">

                    <div>

                      <div className="flex flex-wrap items-center gap-2">

                        <p className="font-bold">
                          {rule.name}
                        </p>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            rule.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-zinc-100 text-zinc-500'
                          }`}
                        >
                          {rule.is_active
                            ? 'ACTIVE'
                            : 'INACTIVE'}
                        </span>

                        {rule.requires_approval && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                            APPROVAL
                          </span>
                        )}

                      </div>

                      <p className="mt-2 text-sm text-zinc-500">
                        {rule.code}
                        {' • '}
                        {rule.outlet_code ||
                          'GLOBAL'}
                        {' • '}
                        {rule.discount_type ===
                        'PERCENT'
                          ? `${rule.discount_value}%`
                          : formatRupiah(
                              rule.discount_value
                            )}
                      </p>

                      <p className="mt-3 text-xs text-zinc-500">
                        Menu:{' '}
                        {mappedMenuNames(
                          rule.id
                        )}
                      </p>

                    </div>

                    <button
                      type="button"
                      disabled={
                        busy
                      }
                      onClick={() =>
                        void toggleActive(
                          rule
                        )
                      }
                      className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold"
                    >
                      {rule.is_active
                        ? 'Disable'
                        : 'Enable'}
                    </button>

                  </div>

                </div>
              )
            )}

          </div>

        </div>

      </div>

    </div>
  )
}
