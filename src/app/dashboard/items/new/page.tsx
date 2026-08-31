import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

type SearchParams = Promise<{
  error?: string
}>

type PermissionRow = {
  module_code: string
  can_view: boolean
  can_create: boolean
  can_update: boolean
  can_post: boolean
  can_approve: boolean
}

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: permissionData } = await supabase.rpc(
    'get_my_permissions'
  )

  const permissions = (permissionData || []) as PermissionRow[]

  const masterItemPermission = permissions.find(
    (row) => row.module_code === 'MASTER_ITEM'
  )

  if (!masterItemPermission?.can_create) {
    redirect('/dashboard/items?denied=CREATE')
  }

  const canViewCost = permissions.some(
    (row) =>
      row.can_view === true &&
      [
        'PURCHASING',
        'INVENTORY_VALUATION',
        'COSTING',
      ].includes(row.module_code)
  )

  const { data: categories } = await supabase
    .from('item_categories_secure')
    .select(`
      id,
      code,
      name
    `)
    .eq('is_active', true)
    .order('name')

  const { data: units } = await supabase
    .from('units_secure')
    .select(`
      id,
      code,
      name,
      symbol
    `)
    .eq('is_active', true)
    .order('name')

  async function createItem(
    formData: FormData
  ) {
    'use server'

    const supabase =
      await createClient()

    const {
      data: { user },
    } =
      await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const sku =
      String(
        formData.get('sku') || ''
      )
        .trim()
        .toUpperCase()

    const name =
      String(
        formData.get('name') || ''
      ).trim()

    const categoryId =
      String(
        formData.get('category_id') || ''
      )

    const itemType =
      String(
        formData.get('item_type') || ''
      )

    const baseUnitId =
      String(
        formData.get('base_unit_id') || ''
      )

    const purchaseUnitRaw =
      String(
        formData.get('purchase_unit_id') || ''
      )

    const minimumStock =
      Number(
        formData.get('minimum_stock') || 0
      )

    const reorderQty =
      Number(
        formData.get('reorder_qty') || 0
      )

    const standardCost =
      Number(
        formData.get('standard_cost') || 0
      )

    const isPurchasable =
      formData.get('is_purchasable') ===
      'on'

    const isSellable =
      formData.get('is_sellable') ===
      'on'

    const trackBatch =
      formData.get('track_batch') ===
      'on'

    const trackExpiry =
      formData.get('track_expiry') ===
      'on'

    if (!sku) {
      redirect(
        '/dashboard/items/new?error=' +
        encodeURIComponent(
          'SKU wajib diisi'
        )
      )
    }

    if (!name) {
      redirect(
        '/dashboard/items/new?error=' +
        encodeURIComponent(
          'Item Name wajib diisi'
        )
      )
    }

    if (!categoryId) {
      redirect(
        '/dashboard/items/new?error=' +
        encodeURIComponent(
          'Category wajib dipilih'
        )
      )
    }

    if (!itemType) {
      redirect(
        '/dashboard/items/new?error=' +
        encodeURIComponent(
          'Item Type wajib dipilih'
        )
      )
    }

    if (!baseUnitId) {
      redirect(
        '/dashboard/items/new?error=' +
        encodeURIComponent(
          'Base Unit wajib dipilih'
        )
      )
    }

    const { error } = await supabase.rpc(
      'create_item_secure',
      {
        p_sku:
          sku,

        p_name:
          name,

        p_category_id:
          categoryId,

        p_item_type:
          itemType,

        p_base_unit_id:
          baseUnitId,

        p_purchase_unit_id:
          purchaseUnitRaw || null,

        p_minimum_stock:
          minimumStock,

        p_reorder_qty:
          reorderQty,

        p_standard_cost:
          standardCost,

        p_last_cost:
          standardCost,

        p_is_purchasable:
          isPurchasable,

        p_is_sellable:
          isSellable,

        p_track_batch:
          trackBatch,

        p_track_expiry:
          trackExpiry,

        p_is_active:
          true,
      }
    )

    if (error) {
      redirect(
        '/dashboard/items/new?error=' +
        encodeURIComponent(
          error.message
        )
      )
    }

    revalidatePath(
      '/dashboard/items'
    )

    redirect(
      '/dashboard/items'
    )
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-5xl">

        <Link
          href="/dashboard/items"
          className="text-sm text-zinc-500 hover:text-red-800"
        >
          ← Master Item
        </Link>

        <div className="mt-6">

          <p className="text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Add Item
          </h1>

          <p className="mt-2 text-zinc-500">
            Create Raw Material, WIP, Finished Good or Inventory Item.
          </p>

        </div>

        {params.error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 font-medium text-red-700">
            {decodeURIComponent(
              params.error
            )}
          </div>
        )}

        <form
          action={createItem}
          className="mt-8 space-y-6"
        >

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold">
              Item Information
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  SKU
                </label>

                <input
                  name="sku"
                  required
                  placeholder="WIP-CK-001"
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3 uppercase"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Item Name
                </label>

                <input
                  name="name"
                  required
                  placeholder="Chicken Katsu Prepared"
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Category
                </label>

                <select
                  name="category_id"
                  required
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3"
                >
                  <option value="">
                    Select Category
                  </option>

                  {(categories || []).map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.code} - {category.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Item Type
                </label>

                <select
                  name="item_type"
                  required
                  defaultValue=""
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3"
                >
                  <option value="">
                    Select Item Type
                  </option>

                  <option value="RAW_MATERIAL">
                    Raw Material
                  </option>

                  <option value="WIP">
                    WIP
                  </option>

                  <option value="FINISHED_GOOD">
                    Finished Good
                  </option>

                  <option value="PACKAGING">
                    Packaging
                  </option>

                  <option value="CONSUMABLE">
                    Consumable
                  </option>
                </select>
              </div>

            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold">
              Unit & Stock
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Base Unit
                </label>

                <select
                  name="base_unit_id"
                  required
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3"
                >
                  <option value="">
                    Select Base Unit
                  </option>

                  {(units || []).map(
                    (unit) => (
                      <option
                        key={unit.id}
                        value={unit.id}
                      >
                        {unit.code} - {unit.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Purchase Unit
                </label>

                <select
                  name="purchase_unit_id"
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3"
                >
                  <option value="">
                    None
                  </option>

                  {(units || []).map(
                    (unit) => (
                      <option
                        key={unit.id}
                        value={unit.id}
                      >
                        {unit.code} - {unit.name}
                      </option>
                    )
                  )}
                </select>

                <p className="mt-2 text-xs text-zinc-400">
                  WIP normally does not need a Purchase Unit.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Minimum Stock
                </label>

                <input
                  name="minimum_stock"
                  type="number"
                  min="0"
                  step="0.001"
                  defaultValue="0"
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Reorder Qty
                </label>

                <input
                  name="reorder_qty"
                  type="number"
                  min="0"
                  step="0.001"
                  defaultValue="0"
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3"
                />
              </div>

              {canViewCost && (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold">
                    Standard Cost / Base Unit
                  </label>

                  <input
                    name="standard_cost"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue="0"
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3"
                  />

                  <p className="mt-2 text-xs text-zinc-400">
                    For WIP, production will later calculate the actual output cost automatically.
                  </p>
                </div>
              )}

            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold">
              Inventory Settings
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">

              <label className="flex items-center gap-3 rounded-xl border border-zinc-200 p-4">
                <input
                  type="checkbox"
                  name="is_purchasable"
                  className="h-5 w-5"
                />

                <div>
                  <p className="font-semibold">
                    Purchasable
                  </p>

                  <p className="text-xs text-zinc-500">
                    Item can be purchased from supplier.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-zinc-200 p-4">
                <input
                  type="checkbox"
                  name="is_sellable"
                  className="h-5 w-5"
                />

                <div>
                  <p className="font-semibold">
                    Sellable
                  </p>

                  <p className="text-xs text-zinc-500">
                    Item can be sold directly.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-zinc-200 p-4">
                <input
                  type="checkbox"
                  name="track_batch"
                  className="h-5 w-5"
                />

                <div>
                  <p className="font-semibold">
                    Track Batch
                  </p>

                  <p className="text-xs text-zinc-500">
                    Store production or receiving batch information.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-zinc-200 p-4">
                <input
                  type="checkbox"
                  name="track_expiry"
                  className="h-5 w-5"
                />

                <div>
                  <p className="font-semibold">
                    Track Expiry
                  </p>

                  <p className="text-xs text-zinc-500">
                    Item has expiration date tracking.
                  </p>
                </div>
              </label>

            </div>
          </div>

          <div className="flex justify-end gap-3">

            <Link
              href="/dashboard/items"
              className="rounded-xl border border-zinc-300 bg-white px-6 py-3 font-semibold hover:bg-zinc-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-red-900 px-8 py-3 font-bold text-white hover:bg-red-800"
            >
              Save Item
            </button>

          </div>

        </form>

      </div>
    </main>
  )
}
