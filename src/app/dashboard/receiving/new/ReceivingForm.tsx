'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Outlet = {
  id: string
  code: string
  name: string
}

type Supplier = {
  id: string
  code: string
  name: string
}

type Item = {
  id: string
  sku: string
  name: string
  base_unit_id: string
  purchase_unit_id: string | null
}

type Unit = {
  id: string
  code: string
  name: string
  symbol: string
}

type Row = {
  item_id: string
  qty: number
  unit_id: string
  unit_price: number
  batch_no: string
  expiry_date: string
}

export default function ReceivingForm({
  outlets,
  suppliers,
  items,
  units,
}: {
  outlets: Outlet[]
  suppliers: Supplier[]
  items: Item[]
  units: Unit[]
}) {

  const router = useRouter()

  const [outletId, setOutletId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [rows, setRows] = useState<Row[]>([
    {
      item_id: '',
      qty: 1,
      unit_id: '',
      unit_price: 0,
      batch_no: '',
      expiry_date: '',
    },
  ])

  function addRow() {
    setRows([
      ...rows,
      {
        item_id: '',
        qty: 1,
        unit_id: '',
        unit_price: 0,
        batch_no: '',
        expiry_date: '',
      },
    ])
  }

  function removeRow(index: number) {
    if (rows.length === 1) return

    setRows(
      rows.filter((_, i) => i !== index)
    )
  }

  function updateRow(
    index: number,
    field: keyof Row,
    value: string | number
  ) {

    const updated = [...rows]

    updated[index] = {
      ...updated[index],
      [field]: value,
    }

    if (field === 'item_id') {

      const item = items.find(
        (x) => x.id === value
      )

      if (item) {
        updated[index].unit_id =
          item.purchase_unit_id ||
          item.base_unit_id
      }
    }

    setRows(updated)
  }

  const grandTotal = rows.reduce(
    (total, row) =>
      total + Number(row.qty) * Number(row.unit_price),
    0
  )

  async function submitReceiving() {

    setErrorMessage('')

    if (!outletId) {
      setErrorMessage('Pilih location.')
      return
    }

    if (!supplierId) {
      setErrorMessage('Pilih supplier.')
      return
    }

    if (rows.some((row) => !row.item_id)) {
      setErrorMessage('Pilih item pada semua baris.')
      return
    }

    if (rows.some((row) => !row.unit_id)) {
      setErrorMessage('Pilih unit pada semua baris.')
      return
    }

    setLoading(true)

    const supabase = createClient()

    const today = new Date()
      .toLocaleDateString('en-CA')

    const { data, error } = await supabase.rpc(
      'create_posted_receiving',
      {
        p_outlet_id: outletId,
        p_supplier_id: supplierId,
        p_receiving_date: today,
        p_invoice_no: invoiceNo,
        p_notes: notes,

        p_items: rows.map((row) => ({
          item_id: row.item_id,
          qty: Number(row.qty),
          unit_id: row.unit_id,
          unit_price: Number(row.unit_price),
          batch_no: row.batch_no,
          expiry_date: row.expiry_date,
        })),
      }
    )

    if (error) {
      setLoading(false)
      setErrorMessage(error.message)
      return
    }

    console.log('Receiving created:', data)

    router.push('/dashboard/receiving')
    router.refresh()
  }

  return (
    <div className="mt-8 space-y-6">

      {/* HEADER */}

      <div className="grid gap-5 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-2">

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Location
          </label>

          <select
            value={outletId}
            onChange={(e) => setOutletId(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
          >
            <option value="">
              Select Location
            </option>

            {outlets.map((outlet) => (
              <option
                key={outlet.id}
                value={outlet.id}
              >
                {outlet.code} - {outlet.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Supplier
          </label>

          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
          >
            <option value="">
              Select Supplier
            </option>

            {suppliers.map((supplier) => (
              <option
                key={supplier.id}
                value={supplier.id}
              >
                {supplier.code} - {supplier.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Invoice No
          </label>

          <input
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
            placeholder="INV-00001"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Notes
          </label>

          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
          />
        </div>

      </div>


      {/* ITEM TABLE */}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

        <div className="border-b p-6">
          <h2 className="text-lg font-bold">
            Receiving Items
          </h2>
        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="p-4">Item</th>
                <th className="p-4">Qty</th>
                <th className="p-4">Unit</th>
                <th className="p-4">Price / Unit</th>
                <th className="p-4">Batch</th>
                <th className="p-4">Expiry</th>
                <th className="p-4">Total</th>
                <th className="p-4"></th>
              </tr>
            </thead>

            <tbody>

              {rows.map((row, index) => (

                <tr
                  key={index}
                  className="border-t"
                >

                  <td className="p-3">
                    <select
                      value={row.item_id}
                      onChange={(e) =>
                        updateRow(
                          index,
                          'item_id',
                          e.target.value
                        )
                      }
                      className="min-w-56 rounded-lg border p-2"
                    >
                      <option value="">
                        Select Item
                      </option>

                      {items.map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.sku} - {item.name}
                        </option>
                      ))}

                    </select>
                  </td>

                  <td className="p-3">
                    <input
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      value={row.qty}
                      onChange={(e) =>
                        updateRow(
                          index,
                          'qty',
                          Number(e.target.value)
                        )
                      }
                      className="w-24 rounded-lg border p-2"
                    />
                  </td>

                  <td className="p-3">
                    <select
                      value={row.unit_id}
                      onChange={(e) =>
                        updateRow(
                          index,
                          'unit_id',
                          e.target.value
                        )
                      }
                      className="rounded-lg border p-2"
                    >
                      <option value="">
                        Unit
                      </option>

                      {units.map((unit) => (
                        <option
                          key={unit.id}
                          value={unit.id}
                        >
                          {unit.code}
                        </option>
                      ))}

                    </select>
                  </td>

                  <td className="p-3">
                    <input
                      type="number"
                      min="0"
                      value={row.unit_price}
                      onChange={(e) =>
                        updateRow(
                          index,
                          'unit_price',
                          Number(e.target.value)
                        )
                      }
                      className="w-36 rounded-lg border p-2"
                    />
                  </td>

                  <td className="p-3">
                    <input
                      value={row.batch_no}
                      onChange={(e) =>
                        updateRow(
                          index,
                          'batch_no',
                          e.target.value
                        )
                      }
                      className="w-32 rounded-lg border p-2"
                    />
                  </td>

                  <td className="p-3">
                    <input
                      type="date"
                      value={row.expiry_date}
                      onChange={(e) =>
                        updateRow(
                          index,
                          'expiry_date',
                          e.target.value
                        )
                      }
                      className="rounded-lg border p-2"
                    />
                  </td>

                  <td className="p-3 font-semibold">
                    Rp{' '}
                    {(
                      Number(row.qty) *
                      Number(row.unit_price)
                    ).toLocaleString('id-ID')}
                  </td>

                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="text-red-700"
                    >
                      Remove
                    </button>
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

        <div className="flex items-center justify-between border-t p-6">

          <button
            type="button"
            onClick={addRow}
            className="rounded-xl border px-4 py-2 font-semibold"
          >
            + Add Item
          </button>

          <div className="text-right">
            <p className="text-sm text-zinc-500">
              Grand Total
            </p>

            <p className="text-2xl font-bold">
              Rp {grandTotal.toLocaleString('id-ID')}
            </p>
          </div>

        </div>

      </div>


      {errorMessage && (
        <div className="rounded-xl bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      )}


      <div className="flex justify-end">

        <button
          type="button"
          disabled={loading}
          onClick={submitReceiving}
          className="rounded-xl bg-red-900 px-8 py-4 font-bold text-white disabled:opacity-50"
        >
          {loading
            ? 'Processing...'
            : 'Confirm Receiving'}
        </button>

      </div>

    </div>
  )
}
