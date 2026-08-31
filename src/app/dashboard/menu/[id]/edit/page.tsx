import { createClient } from '@/lib/supabase/server'

import {
  redirect,
  notFound,
} from 'next/navigation'

import Link from 'next/link'

import EditMenuForm from './EditMenuForm'


type PageProps = {
  params: Promise<{
    id: string
  }>
}


export default async function EditMenuPage({
  params,
}: PageProps) {

  const {
    id,
  } =
    await params


  const supabase =
    await createClient()


  // =====================================================
  // AUTH
  // =====================================================

  const {
    data: {
      user,
    },
  } =
    await supabase.auth
      .getUser()


  if (!user) {
    redirect('/login')
  }


  // =====================================================
  // MENU
  // =====================================================

  const {
    data: menu,
    error: menuError,
  } =
    await supabase
      .from(
        'menu_items'
      )
      .select(`
        id,
        code,
        name,
        category,
        selling_price,
        low_stock_portions,
        image_url,
        is_active,
        notes
      `)
      .eq(
        'id',
        id
      )
      .single()


  if (
    menuError ||
    !menu
  ) {
    notFound()
  }


  // =====================================================
  // CURRENT BOM
  // =====================================================

  const {
    data: components,
    error: componentError,
  } =
    await supabase
      .from(
        'menu_item_components'
      )
      .select(`
        id,
        item_id,
        quantity,
        unit_id,
        notes
      `)
      .eq(
        'menu_item_id',
        id
      )
      .order(
        'created_at'
      )


  // =====================================================
  // ITEMS
  // =====================================================

  const {
    data: items,
    error: itemError,
  } =
    await supabase
      .from(
        'items'
      )
      .select(`
        id,
        sku,
        name,
        item_type,
        base_unit_id
      `)
      .eq(
        'is_active',
        true
      )
      .order(
        'name'
      )


  // =====================================================
  // UNITS
  // =====================================================

  const {
    data: units,
    error: unitError,
  } =
    await supabase
      .from(
        'units'
      )
      .select(`
        id,
        code,
        name
      `)
      .order(
        'code'
      )


  return (

    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-6xl">


        {/* HEADER */}

        <div className="mb-8">

          <Link
            href="/dashboard/menu"
            className="text-sm text-zinc-500 hover:text-red-800"
          >
            ← Menu Master
          </Link>


          <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>


          <h1 className="mt-2 text-3xl font-bold">
            Edit Menu
          </h1>


          <p className="mt-2 text-zinc-500">
            Update Selling Price, Status & Inventory BOM
          </p>

        </div>


        {(componentError ||
          itemError ||
          unitError) && (

          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">

            {componentError && (
              <p>
                {componentError.message}
              </p>
            )}

            {itemError && (
              <p>
                {itemError.message}
              </p>
            )}

            {unitError && (
              <p>
                {unitError.message}
              </p>
            )}

          </div>

        )}


        <EditMenuForm

          menu={{
            id:
              menu.id,

            code:
              menu.code,

            name:
              menu.name,

            category:
              menu.category,

            selling_price:
              Number(
                menu.selling_price ||
                  0
              ),

            low_stock_portions:
              Number(
                menu.low_stock_portions ||
                  0
              ),

            image_url:
              menu.image_url,

            is_active:
              menu.is_active,

            notes:
              menu.notes,
          }}

          components={
            (components || []).map(
              (row) => ({
                id:
                  row.id,

                item_id:
                  row.item_id,

                quantity:
                  Number(
                    row.quantity ||
                      0
                  ),

                unit_id:
                  row.unit_id,

                notes:
                  row.notes,
              })
            )
          }

          items={
            items || []
          }

          units={
            units || []
          }

        />


      </div>

    </main>

  )

}
