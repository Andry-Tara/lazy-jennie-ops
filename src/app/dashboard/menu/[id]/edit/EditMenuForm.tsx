'use client'


import {
  useMemo,
  useState,
} from 'react'


import {
  useRouter,
} from 'next/navigation'


import Link from 'next/link'


import {
  createClient,
} from '@/lib/supabase/client'


type Menu = {

  id: string

  code: string

  name: string

  category:
    string |
    null

  selling_price:
    number

  low_stock_portions:
    number

  image_url:
    string |
    null

  is_active:
    boolean

  notes:
    string |
    null

}


type ExistingComponent = {

  id: string

  item_id: string

  quantity: number

  unit_id: string

  notes:
    string |
    null

}


type Item = {

  id: string

  sku: string

  name: string

  item_type: string

  base_unit_id: string

}


type Unit = {

  id: string

  code: string

  name: string

}


type ComponentRow = {

  key: string

  item_id: string

  unit_id: string

  qty: string

  notes: string

}


type Props = {

  menu: Menu

  components:
    ExistingComponent[]

  items:
    Item[]

  units:
    Unit[]

}


export default function EditMenuForm({

  menu,

  components,

  items,

  units,

}: Props) {

  const router =
    useRouter()


  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    )


  // =====================================================
  // MENU STATE
  // =====================================================

  const [
    code,
    setCode,
  ] =
    useState(
      menu.code
    )


  const [
    name,
    setName,
  ] =
    useState(
      menu.name
    )


  const [
    category,
    setCategory,
  ] =
    useState(
      menu.category ||
      ''
    )


  const [
    sellingPrice,
    setSellingPrice,
  ] =
    useState(
      String(
        menu.selling_price
      )
    )


  const [
    lowStockPortions,
    setLowStockPortions,
  ] =
    useState(
      String(
        menu.low_stock_portions
      )
    )


  const [
    notes,
    setNotes,
  ] =
    useState(
      menu.notes ||
      ''
    )


  const [
    isActive,
    setIsActive,
  ] =
    useState(
      menu.is_active
    )


  // =====================================================
  // BOM STATE
  // =====================================================

  const [
    rows,
    setRows,
  ] =
    useState<
      ComponentRow[]
    >(
      components.length >
        0

        ? components.map(
            (
              component
            ) => ({

              key:
                component.id,

              item_id:
                component.item_id,

              unit_id:
                component.unit_id,

              qty:
                String(
                  component.quantity
                ),

              notes:
                component.notes ||
                '',

            })
          )

        : [
            {

              key:
                crypto.randomUUID(),

              item_id:
                '',

              unit_id:
                '',

              qty:
                '',

              notes:
                '',

            },
          ]
    )


  const [
    loading,
    setLoading,
  ] =
    useState(false)


  const [
    error,
    setError,
  ] =
    useState('')


  // =====================================================
  // ADD BOM
  // =====================================================

  function addComponent() {

    setRows(
      (
        current
      ) => [

        ...current,

        {

          key:
            crypto.randomUUID(),

          item_id:
            '',

          unit_id:
            '',

          qty:
            '',

          notes:
            '',

        },

      ]
    )

  }


  // =====================================================
  // REMOVE BOM
  // =====================================================

  function removeComponent(
    key: string
  ) {

    setRows(
      (
        current
      ) => {

        if (
          current.length ===
          1
        ) {

          return current

        }


        return current.filter(
          (
            row
          ) =>
            row.key !==
            key
        )

      }
    )

  }


  // =====================================================
  // UPDATE BOM ROW
  // =====================================================

  function updateComponent(

    key: string,

    field:
      'item_id' |
      'unit_id' |
      'qty' |
      'notes',

    value: string

  ) {

    setRows(
      (
        current
      ) =>
        current.map(
          (
            row
          ) => {

            if (
              row.key !==
              key
            ) {

              return row

            }


            const updated = {

              ...row,

              [field]:
                value,

            }


            // =================================================
            // AUTO BASE UNIT
            // =================================================

            if (
              field ===
              'item_id'
            ) {

              const selectedItem =
                items.find(
                  (
                    item
                  ) =>
                    item.id ===
                    value
                )


              if (
                selectedItem
              ) {

                updated.unit_id =
                  selectedItem.base_unit_id

              }

            }


            return updated

          }
        )
    )

  }


  // =====================================================
  // SAVE
  // =====================================================

  async function handleSubmit(

    event:
      React.FormEvent

  ) {

    event.preventDefault()


    setError('')


    // ===================================================
    // VALIDATION
    // ===================================================

    if (
      !code.trim()
    ) {

      setError(
        'Menu code wajib diisi.'
      )

      return

    }


    if (
      !name.trim()
    ) {

      setError(
        'Menu name wajib diisi.'
      )

      return

    }


    const price =
      Number(
        sellingPrice
      )


    if (
      Number.isNaN(
        price
      ) ||
      price < 0
    ) {

      setError(
        'Selling price tidak valid.'
      )

      return

    }


    const lowStock =
      Number(
        lowStockPortions
      )


    if (
      Number.isNaN(
        lowStock
      ) ||
      lowStock < 0
    ) {

      setError(
        'Low stock portions tidak valid.'
      )

      return

    }


    for (
      let index = 0;
      index <
        rows.length;
      index++
    ) {

      const row =
        rows[index]


      if (
        !row.item_id
      ) {

        setError(
          `Component ${index + 1}: item wajib dipilih.`
        )

        return

      }


      if (
        !row.unit_id
      ) {

        setError(
          `Component ${index + 1}: unit wajib dipilih.`
        )

        return

      }


      const qty =
        Number(
          row.qty
        )


      if (
        Number.isNaN(
          qty
        ) ||
        qty <= 0
      ) {

        setError(
          `Component ${index + 1}: quantity harus lebih besar dari 0.`
        )

        return

      }

    }


    // ===================================================
    // DUPLICATE BOM
    // ===================================================

    const selectedItems =
      rows.map(
        (
          row
        ) =>
          row.item_id
      )


    if (
      new Set(
        selectedItems
      ).size !==
      selectedItems.length
    ) {

      setError(
        'Item BOM yang sama tidak boleh dimasukkan dua kali.'
      )

      return

    }


    // ===================================================
    // RPC
    // ===================================================

    setLoading(
      true
    )


    try {

      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          'update_menu_item',
          {

            p_menu_item_id:
              menu.id,

            p_code:
              code.trim(),

            p_name:
              name.trim(),

            p_category:
              category.trim() ||
              null,

            p_selling_price:
              price,

            p_low_stock_portions:
              lowStock,

            p_notes:
              notes.trim() ||
              null,

            p_is_active:
              isActive,

            p_components:
              rows.map(
                (
                  row
                ) => ({

                  item_id:
                    row.item_id,

                  unit_id:
                    row.unit_id,

                  qty:
                    Number(
                      row.qty
                    ),

                  notes:
                    row.notes.trim() ||
                    null,

                })
              ),

          }
        )


      if (
        rpcError
      ) {

        throw rpcError

      }


      router.push(
        '/dashboard/menu'
      )


      router.refresh()


    } catch (
      err
    ) {

      const message =
        err instanceof
        Error

          ? err.message

          : 'Failed to update menu.'


      setError(
        message
      )


      setLoading(
        false
      )

    }

  }


  // =====================================================
  // PAGE
  // =====================================================

  return (

    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-6"
    >


      {/* =================================================
          CURRENT PHOTO
      ================================================= */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">

        <h2 className="text-lg font-bold">
          Menu Photo
        </h2>


        <p className="mt-1 text-sm text-zinc-500">
          Photo is managed from Menu Master.
        </p>


        <div
          className="mt-5 aspect-[4/3] max-w-sm overflow-hidden rounded-2xl bg-zinc-100 bg-cover bg-center"
          style={
            menu.image_url

              ? {

                  backgroundImage:
                    `url("${menu.image_url}")`,

                }

              : undefined
          }
        >

          {!menu.image_url && (

            <div className="flex h-full items-center justify-center text-5xl">
              🍽️
            </div>

          )}

        </div>

      </div>


      {/* =================================================
          MENU INFORMATION
      ================================================= */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">

        <div className="mb-6">

          <h2 className="text-lg font-bold">
            Menu Information
          </h2>


          <p className="mt-1 text-sm text-zinc-500">
            Selling information used by POS
          </p>

        </div>


        <div className="grid gap-5 md:grid-cols-2">


          <div>

            <label className="mb-2 block text-sm font-semibold">
              Menu Code
            </label>


            <input
              value={
                code
              }
              onChange={
                (
                  event
                ) =>
                  setCode(
                    event.target.value
                  )
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />

          </div>


          <div>

            <label className="mb-2 block text-sm font-semibold">
              Menu Name
            </label>


            <input
              value={
                name
              }
              onChange={
                (
                  event
                ) =>
                  setName(
                    event.target.value
                  )
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />

          </div>


          <div>

            <label className="mb-2 block text-sm font-semibold">
              Category
            </label>


            <input
              value={
                category
              }
              onChange={
                (
                  event
                ) =>
                  setCategory(
                    event.target.value
                  )
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />

          </div>


          <div>

            <label className="mb-2 block text-sm font-semibold">
              Selling Price
            </label>


            <div className="relative">

              <span className="absolute left-4 top-3 text-zinc-500">
                Rp
              </span>


              <input
                type="number"
                min="0"
                step="1"
                value={
                  sellingPrice
                }
                onChange={
                  (
                    event
                  ) =>
                    setSellingPrice(
                      event.target.value
                    )
                }
                className="w-full rounded-xl border border-zinc-300 py-3 pl-12 pr-4"
              />

            </div>

          </div>


          <div>

            <label className="mb-2 block text-sm font-semibold">
              Low Stock Warning
            </label>


            <input
              type="number"
              min="0"
              step="1"
              value={
                lowStockPortions
              }
              onChange={
                (
                  event
                ) =>
                  setLowStockPortions(
                    event.target.value
                  )
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />


            <p className="mt-2 text-xs text-zinc-400">
              Warning threshold in available portions.
            </p>

          </div>


          <div>

            <label className="mb-2 block text-sm font-semibold">
              Status
            </label>


            <select
              value={
                isActive
                  ? 'ACTIVE'
                  : 'INACTIVE'
              }
              onChange={
                (
                  event
                ) =>
                  setIsActive(
                    event.target.value ===
                    'ACTIVE'
                  )
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            >

              <option value="ACTIVE">
                Active
              </option>

              <option value="INACTIVE">
                Inactive
              </option>

            </select>

          </div>


          <div className="md:col-span-2">

            <label className="mb-2 block text-sm font-semibold">
              Notes
            </label>


            <textarea
              rows={3}
              value={
                notes
              }
              onChange={
                (
                  event
                ) =>
                  setNotes(
                    event.target.value
                  )
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />

          </div>


        </div>

      </div>


      {/* =================================================
          MENU BOM
      ================================================= */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">

          <div>

            <h2 className="text-lg font-bold">
              Menu BOM
            </h2>


            <p className="mt-1 text-sm text-zinc-500">
              Inventory consumption for one portion sold
            </p>

          </div>


          <button
            type="button"
            onClick={
              addComponent
            }
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
          >
            + Add Component
          </button>

        </div>


        <div className="space-y-4">

          {rows.map(
            (
              row,
              index
            ) => (

              <div
                key={
                  row.key
                }
                className="rounded-2xl border border-zinc-200 p-5"
              >

                <div className="mb-4 flex items-center justify-between">

                  <p className="font-bold">
                    Component{' '}
                    {index + 1}
                  </p>


                  {rows.length >
                    1 && (

                    <button
                      type="button"
                      onClick={() =>
                        removeComponent(
                          row.key
                        )
                      }
                      className="text-sm font-semibold text-red-700"
                    >
                      Remove
                    </button>

                  )}

                </div>


                <div className="grid gap-4 md:grid-cols-4">


                  <div className="md:col-span-2">

                    <label className="mb-2 block text-sm font-semibold">
                      Inventory Item
                    </label>


                    <select
                      value={
                        row.item_id
                      }
                      onChange={
                        (
                          event
                        ) =>
                          updateComponent(
                            row.key,
                            'item_id',
                            event.target.value
                          )
                      }
                      className="w-full rounded-xl border border-zinc-300 px-4 py-3"
                    >

                      <option value="">
                        Select Item
                      </option>


                      {items.map(
                        (
                          item
                        ) => (

                          <option
                            key={
                              item.id
                            }
                            value={
                              item.id
                            }
                          >
                            {item.sku}
                            {' - '}
                            {item.name}
                            {' ('}
                            {item.item_type}
                            {')'}
                          </option>

                        )
                      )}

                    </select>

                  </div>


                  <div>

                    <label className="mb-2 block text-sm font-semibold">
                      Quantity
                    </label>


                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={
                        row.qty
                      }
                      onChange={
                        (
                          event
                        ) =>
                          updateComponent(
                            row.key,
                            'qty',
                            event.target.value
                          )
                      }
                      className="w-full rounded-xl border border-zinc-300 px-4 py-3"
                    />

                  </div>


                  <div>

                    <label className="mb-2 block text-sm font-semibold">
                      Unit
                    </label>


                    <select
                      value={
                        row.unit_id
                      }
                      onChange={
                        (
                          event
                        ) =>
                          updateComponent(
                            row.key,
                            'unit_id',
                            event.target.value
                          )
                      }
                      className="w-full rounded-xl border border-zinc-300 px-4 py-3"
                    >

                      <option value="">
                        Select Unit
                      </option>


                      {units.map(
                        (
                          unit
                        ) => (

                          <option
                            key={
                              unit.id
                            }
                            value={
                              unit.id
                            }
                          >
                            {unit.code}
                            {' - '}
                            {unit.name}
                          </option>

                        )
                      )}

                    </select>

                  </div>


                  <div className="md:col-span-4">

                    <label className="mb-2 block text-sm font-semibold">
                      Component Notes
                    </label>


                    <input
                      value={
                        row.notes
                      }
                      onChange={
                        (
                          event
                        ) =>
                          updateComponent(
                            row.key,
                            'notes',
                            event.target.value
                          )
                      }
                      placeholder="Optional"
                      className="w-full rounded-xl border border-zinc-300 px-4 py-3"
                    />

                  </div>


                </div>

              </div>

            )
          )}

        </div>

      </div>


      {/* ERROR */}

      {error && (

        <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>

      )}


      {/* ACTION */}

      <div className="flex flex-wrap justify-end gap-3">

        <Link
          href="/dashboard/menu"
          className="rounded-xl border border-zinc-300 bg-white px-5 py-3 font-semibold hover:bg-zinc-50"
        >
          Cancel
        </Link>


        <button
          type="submit"
          disabled={
            loading
          }
          className="rounded-xl bg-red-900 px-6 py-3 font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        >

          {loading
            ? 'Saving Changes...'
            : 'Save Menu Changes'}

        </button>

      </div>


    </form>

  )

}
