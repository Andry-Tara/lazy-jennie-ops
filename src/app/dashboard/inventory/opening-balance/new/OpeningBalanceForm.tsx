'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Outlet = {
  id: string
  code: string
  name: string
  type: string | null
}

type Item = {
  id: string
  sku: string
  name: string
  item_type: string | null
  base_unit_id: string
  base_unit_code: string | null
  base_unit_name: string | null
  base_unit_symbol: string | null
  purchase_unit_id: string | null
  purchase_unit_code: string | null
  purchase_unit_name: string | null
  purchase_unit_symbol: string | null
  standard_cost: number | string | null
  last_cost: number | string | null
  track_batch: boolean
  track_expiry: boolean
  is_active: boolean
}

type Unit = {
  id: string
  code: string
  name: string
  symbol: string | null
  decimal_places: number
}

type Conversion = {
  id: string
  item_id: string
  from_unit_id: string
  from_unit_code: string | null
  from_unit_name: string | null
  from_unit_symbol: string | null
  to_unit_id: string
  to_unit_code: string | null
  to_unit_name: string | null
  to_unit_symbol: string | null
  conversion_factor: number | string
}

type Row = {
  key: string
  itemId: string
  unitId: string
  qty: string
  unitCost: string
  batchNo: string
  expiryDate: string
  notes: string
}

function jakartaToday() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).format(new Date())
}

function newRow(): Row {
  return {
    key:
      typeof crypto !== 'undefined' &&
      'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    itemId: '',
    unitId: '',
    qty: '',
    unitCost: '',
    batchNo: '',
    expiryDate: '',
    notes: '',
  }
}

function numberValue(value: string | number | null | undefined) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? n : 0
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(
    'id-ID',
    {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }
  ).format(value)
}

export default function OpeningBalanceForm({
  outlets,
  items,
  units,
  conversions,
}: {
  outlets: Outlet[]
  items: Item[]
  units: Unit[]
  conversions: Conversion[]
}) {
  const router = useRouter()
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [outletId, setOutletId] = useState(
    outlets.length === 1
      ? outlets[0].id
      : ''
  )

  const [openingDate, setOpeningDate] = useState(
    jakartaToday()
  )

  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<Row[]>([
    newRow(),
  ])

  const [isPosting, setIsPosting] =
    useState(false)

  const [error, setError] =
    useState('')

  const itemMap = useMemo(
    () =>
      new Map(
        items.map((item) => [
          item.id,
          item,
        ])
      ),
    [items]
  )

  const unitMap = useMemo(
    () =>
      new Map(
        units.map((unit) => [
          unit.id,
          unit,
        ])
      ),
    [units]
  )

  const conversionsByItem = useMemo(() => {
    const map = new Map<string, Conversion[]>()

    for (const conversion of conversions) {
      const existing =
        map.get(conversion.item_id) || []

      existing.push(conversion)

      map.set(
        conversion.item_id,
        existing
      )
    }

    return map
  }, [conversions])

  function conversionToBase(
    item: Item,
    unitId: string
  ) {
    if (!unitId) {
      return null
    }

    if (
      unitId === item.base_unit_id
    ) {
      return 1
    }

    const itemConversions =
      conversionsByItem.get(
        item.id
      ) || []

    const direct =
      itemConversions.find(
        (conversion) =>
          conversion.from_unit_id ===
            unitId &&
          conversion.to_unit_id ===
            item.base_unit_id
      )

    if (direct) {
      const factor =
        numberValue(
          direct.conversion_factor
        )

      return factor > 0
        ? factor
        : null
    }

    const reverse =
      itemConversions.find(
        (conversion) =>
          conversion.from_unit_id ===
            item.base_unit_id &&
          conversion.to_unit_id ===
            unitId
      )

    if (reverse) {
      const factor =
        numberValue(
          reverse.conversion_factor
        )

      return factor > 0
        ? 1 / factor
        : null
    }

    return null
  }

  function unitOptions(
    item: Item | undefined
  ) {
    if (!item) {
      return []
    }

    const ids = new Set<string>()

    ids.add(item.base_unit_id)

    if (
      item.purchase_unit_id &&
      conversionToBase(
        item,
        item.purchase_unit_id
      ) !== null
    ) {
      ids.add(
        item.purchase_unit_id
      )
    }

    const itemConversions =
      conversionsByItem.get(
        item.id
      ) || []

    for (
      const conversion
      of itemConversions
    ) {
      if (
        conversion.to_unit_id ===
        item.base_unit_id
      ) {
        ids.add(
          conversion.from_unit_id
        )
      }

      if (
        conversion.from_unit_id ===
        item.base_unit_id
      ) {
        ids.add(
          conversion.to_unit_id
        )
      }
    }

    return Array.from(ids)
      .map((id) => unitMap.get(id))
      .filter(
        (unit): unit is Unit =>
          Boolean(unit)
      )
  }

  function suggestedSourceCost(
    item: Item,
    unitId: string
  ) {
    const baseCost =
      numberValue(
        item.last_cost
      ) > 0
        ? numberValue(
            item.last_cost
          )
        : numberValue(
            item.standard_cost
          )

    const factor =
      conversionToBase(
        item,
        unitId
      )

    if (
      baseCost <= 0 ||
      factor === null
    ) {
      return ''
    }

    return String(
      baseCost * factor
    )
  }

  function updateRow(
    key: string,
    patch: Partial<Row>
  ) {
    setRows((current) =>
      current.map((row) =>
        row.key === key
          ? {
              ...row,
              ...patch,
            }
          : row
      )
    )
  }

  function onItemChange(
    key: string,
    itemId: string
  ) {
    const item =
      itemMap.get(itemId)

    if (!item) {
      updateRow(
        key,
        {
          itemId: '',
          unitId: '',
          unitCost: '',
          batchNo: '',
          expiryDate: '',
        }
      )

      return
    }

    let unitId =
      item.purchase_unit_id ||
      item.base_unit_id

    if (
      conversionToBase(
        item,
        unitId
      ) === null
    ) {
      unitId =
        item.base_unit_id
    }

    updateRow(
      key,
      {
        itemId,
        unitId,
        unitCost:
          suggestedSourceCost(
            item,
            unitId
          ),
        batchNo: '',
        expiryDate: '',
      }
    )
  }

  function onUnitChange(
    row: Row,
    unitId: string
  ) {
    const item =
      itemMap.get(row.itemId)

    updateRow(
      row.key,
      {
        unitId,
        unitCost:
          item
            ? suggestedSourceCost(
                item,
                unitId
              )
            : '',
      }
    )
  }

  function addRow() {
    setRows((current) => [
      ...current,
      newRow(),
    ])
  }

  function removeRow(
    key: string
  ) {
    setRows((current) =>
      current.length === 1
        ? current
        : current.filter(
            (row) =>
              row.key !== key
          )
    )
  }

  const grandTotal =
    rows.reduce(
      (sum, row) =>
        sum +
        numberValue(row.qty) *
          numberValue(
            row.unitCost
          ),
      0
    )

  async function postOpeningBalance() {
    setError('')

    if (!outletId) {
      setError(
        'Location wajib dipilih.'
      )
      return
    }

    if (!openingDate) {
      setError(
        'Opening date wajib diisi.'
      )
      return
    }

    for (
      let index = 0;
      index < rows.length;
      index += 1
    ) {
      const row =
        rows[index]

      const item =
        itemMap.get(
          row.itemId
        )

      if (!item) {
        setError(
          `Baris ${index + 1}: item wajib dipilih.`
        )
        return
      }

      if (!row.unitId) {
        setError(
          `Baris ${index + 1}: unit wajib dipilih.`
        )
        return
      }

      if (
        numberValue(row.qty) <= 0
      ) {
        setError(
          `Baris ${index + 1}: qty harus lebih besar dari 0.`
        )
        return
      }

      if (
        row.unitCost.trim() === '' ||
        numberValue(
          row.unitCost
        ) < 0
      ) {
        setError(
          `Baris ${index + 1}: unit cost wajib diisi dan tidak boleh negatif.`
        )
        return
      }

      if (
        item.track_batch &&
        !row.batchNo.trim()
      ) {
        setError(
          `Baris ${index + 1}: Batch No wajib diisi untuk ${item.name}.`
        )
        return
      }

      if (
        item.track_expiry &&
        !row.expiryDate
      ) {
        setError(
          `Baris ${index + 1}: Expiry Date wajib diisi untuk ${item.name}.`
        )
        return
      }
    }

    const selectedOutlet =
      outlets.find(
        (outlet) =>
          outlet.id === outletId
      )

    const confirmed =
      window.confirm(
        [
          'POST OPENING BALANCE?',
          '',
          `Location: ${selectedOutlet?.code || ''} - ${selectedOutlet?.name || ''}`,
          `Date: ${openingDate}`,
          `Lines: ${rows.length}`,
          `Total Value: ${formatCurrency(grandTotal)}`,
          '',
          'Setelah item memiliki stock history pada location ini, Opening Balance untuk item tersebut akan dikunci.',
        ].join('\n')
      )

    if (!confirmed) {
      return
    }

    setIsPosting(true)

    const payload =
      rows.map((row) => ({
        item_id:
          row.itemId,

        qty:
          numberValue(
            row.qty
          ),

        unit_id:
          row.unitId,

        unit_cost:
          numberValue(
            row.unitCost
          ),

        batch_no:
          row.batchNo.trim() ||
          null,

        expiry_date:
          row.expiryDate ||
          null,

        notes:
          row.notes.trim() ||
          null,
      }))

    const {
      data,
      error: rpcError,
    } =
      await supabase.rpc(
        'create_posted_opening_balance',
        {
          p_outlet_id:
            outletId,

          p_opening_date:
            openingDate,

          p_notes:
            notes.trim() ||
            null,

          p_items:
            payload,
        }
      )

    if (rpcError) {
      setError(
        rpcError.message
      )
      setIsPosting(false)
      return
    }

    if (!data) {
      setError(
        'Opening Balance berhasil diproses tetapi document ID tidak ditemukan.'
      )
      setIsPosting(false)
      return
    }

    router.push(
      `/dashboard/inventory/opening-balance/${data}`
    )

    router.refresh()
  }

  return (
    <div className="mt-8 space-y-6">

      <section className="rounded-2xl bg-white p-6 shadow-sm">

        <div className="grid gap-5 md:grid-cols-3">

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Location
            </label>

            <select
              value={outletId}
              onChange={(event) =>
                setOutletId(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            >
              <option value="">
                Select Location
              </option>

              {outlets.map(
                (outlet) => (
                  <option
                    key={outlet.id}
                    value={outlet.id}
                  >
                    {outlet.code}
                    {' - '}
                    {outlet.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Opening Date
            </label>

            <input
              type="date"
              value={openingDate}
              onChange={(event) =>
                setOpeningDate(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Grand Total
            </label>

            <div className="rounded-xl bg-zinc-900 px-4 py-3 font-bold text-white">
              {formatCurrency(
                grandTotal
              )}
            </div>
          </div>

        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-semibold">
            Notes
          </label>

          <textarea
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target.value
              )
            }
            rows={2}
            placeholder="Example: Physical stock as of go-live cut-off"
            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
          />
        </div>

      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

          <div>
            <h2 className="text-lg font-bold">
              Opening Items
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Unit Cost is the cost per selected input unit.
            </p>
          </div>

          <button
            type="button"
            onClick={addRow}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-bold hover:bg-zinc-50"
          >
            + Add Item
          </button>

        </div>

        <div className="space-y-5">

          {rows.map(
            (row, index) => {
              const item =
                itemMap.get(
                  row.itemId
                )

              const options =
                unitOptions(item)

              const factor =
                item
                  ? conversionToBase(
                      item,
                      row.unitId
                    )
                  : null

              const baseQty =
                factor === null
                  ? null
                  : numberValue(
                      row.qty
                    ) * factor

              const unitCostBase =
                factor &&
                factor > 0
                  ? numberValue(
                      row.unitCost
                    ) / factor
                  : null

              const lineTotal =
                numberValue(
                  row.qty
                ) *
                numberValue(
                  row.unitCost
                )

              return (
                <div
                  key={row.key}
                  className="rounded-2xl border border-zinc-200 p-5"
                >

                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="font-bold">
                      Item #{index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        removeRow(
                          row.key
                        )
                      }
                      disabled={
                        rows.length === 1
                      }
                      className="text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:text-zinc-300"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-12">

                    <div className="lg:col-span-4">

                      <label className="mb-2 block text-sm font-semibold">
                        Item
                      </label>

                      <select
                        value={row.itemId}
                        onChange={(event) =>
                          onItemChange(
                            row.key,
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-zinc-300 px-3 py-3"
                      >
                        <option value="">
                          Select Item
                        </option>

                        {items.map(
                          (option) => (
                            <option
                              key={option.id}
                              value={option.id}
                            >
                              {option.sku}
                              {' - '}
                              {option.name}
                            </option>
                          )
                        )}

                      </select>

                      {item && (
                        <p className="mt-2 text-xs text-zinc-500">
                          {item.item_type || '-'}
                          {' · Base: '}
                          {item.base_unit_code || item.base_unit_symbol || '-'}
                        </p>
                      )}

                    </div>

                    <div className="lg:col-span-2">

                      <label className="mb-2 block text-sm font-semibold">
                        Qty
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.qty}
                        onChange={(event) =>
                          updateRow(
                            row.key,
                            {
                              qty:
                                event.target.value,
                            }
                          )
                        }
                        className="w-full rounded-xl border border-zinc-300 px-3 py-3 text-right"
                      />

                    </div>

                    <div className="lg:col-span-2">

                      <label className="mb-2 block text-sm font-semibold">
                        Unit
                      </label>

                      <select
                        value={row.unitId}
                        onChange={(event) =>
                          onUnitChange(
                            row,
                            event.target.value
                          )
                        }
                        disabled={!item}
                        className="w-full rounded-xl border border-zinc-300 px-3 py-3 disabled:bg-zinc-100"
                      >
                        <option value="">
                          Unit
                        </option>

                        {options.map(
                          (unit) => (
                            <option
                              key={unit.id}
                              value={unit.id}
                            >
                              {unit.code}
                              {unit.symbol
                                ? ` (${unit.symbol})`
                                : ''}
                            </option>
                          )
                        )}

                      </select>

                    </div>

                    <div className="lg:col-span-2">

                      <label className="mb-2 block text-sm font-semibold">
                        Unit Cost
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.unitCost}
                        onChange={(event) =>
                          updateRow(
                            row.key,
                            {
                              unitCost:
                                event.target.value,
                            }
                          )
                        }
                        className="w-full rounded-xl border border-zinc-300 px-3 py-3 text-right"
                      />

                      <p className="mt-2 text-xs text-zinc-500">
                        Per selected unit
                      </p>

                    </div>

                    <div className="lg:col-span-2">

                      <label className="mb-2 block text-sm font-semibold">
                        Line Total
                      </label>

                      <div className="rounded-xl bg-zinc-50 px-3 py-3 text-right font-bold">
                        {formatCurrency(
                          lineTotal
                        )}
                      </div>

                    </div>

                  </div>

                  {item && (
                    <div className="mt-4 grid gap-4 md:grid-cols-4">

                      {item.track_batch && (
                        <div>
                          <label className="mb-2 block text-sm font-semibold">
                            Batch No
                          </label>

                          <input
                            value={row.batchNo}
                            onChange={(event) =>
                              updateRow(
                                row.key,
                                {
                                  batchNo:
                                    event.target.value,
                                }
                              )
                            }
                            className="w-full rounded-xl border border-zinc-300 px-3 py-3"
                          />
                        </div>
                      )}

                      {item.track_expiry && (
                        <div>
                          <label className="mb-2 block text-sm font-semibold">
                            Expiry Date
                          </label>

                          <input
                            type="date"
                            value={row.expiryDate}
                            onChange={(event) =>
                              updateRow(
                                row.key,
                                {
                                  expiryDate:
                                    event.target.value,
                                }
                              )
                            }
                            className="w-full rounded-xl border border-zinc-300 px-3 py-3"
                          />
                        </div>
                      )}

                      <div>
                        <p className="mb-2 text-sm font-semibold">
                          Base Qty
                        </p>

                        <div className="rounded-xl bg-zinc-50 px-3 py-3 text-sm">
                          {baseQty === null
                            ? '-'
                            : `${baseQty.toLocaleString('id-ID')} ${item.base_unit_symbol || item.base_unit_code || ''}`}
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-sm font-semibold">
                          Cost / Base Unit
                        </p>

                        <div className="rounded-xl bg-zinc-50 px-3 py-3 text-sm">
                          {unitCostBase === null
                            ? '-'
                            : formatCurrency(unitCostBase)}
                        </div>
                      </div>

                    </div>
                  )}

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-semibold">
                      Item Notes
                    </label>

                    <input
                      value={row.notes}
                      onChange={(event) =>
                        updateRow(
                          row.key,
                          {
                            notes:
                              event.target.value,
                          }
                        )
                      }
                      placeholder="Optional"
                      className="w-full rounded-xl border border-zinc-300 px-3 py-3"
                    />
                  </div>

                </div>
              )
            }
          )}

        </div>

      </section>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">

        <div>
          <p className="font-bold text-amber-900">
            Final Opening Stock
          </p>

          <p className="mt-1 text-sm text-amber-800">
            Verify physical quantity, unit, cost, batch and expiry before posting.
          </p>
        </div>

        <button
          type="button"
          onClick={postOpeningBalance}
          disabled={
            isPosting ||
            Boolean(error && !rows.length)
          }
          className="rounded-xl bg-red-900 px-6 py-3 font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isPosting
            ? 'Posting...'
            : 'Post Opening Balance'}
        </button>

      </div>

    </div>
  )
}
