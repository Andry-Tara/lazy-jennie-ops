import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import EditRecipeForm from './EditRecipeForm'

type PermissionRow = {
  module_code: string
  can_view: boolean
  can_create: boolean
  can_update: boolean
  can_post: boolean
  can_approve: boolean
}

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function EditRecipePage({
  params,
}: PageProps) {
  const { id } = await params

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

  const recipePermission = permissions.find(
    (row) => row.module_code === 'MASTER_RECIPE'
  )

  if (!recipePermission?.can_update) {
    redirect('/dashboard?denied=MASTER_RECIPE')
  }

  const {
    data: recipe,
    error: recipeError,
  } = await supabase
    .from('recipes_secure')
    .select(`
      id,
      code,
      name,
      output_item_id,
      output_qty,
      output_unit_id,
      notes,
      is_active
    `)
    .eq('id', id)
    .single()

  if (
    recipeError ||
    !recipe
  ) {
    notFound()
  }

  const {
    data: recipeItems,
  } = await supabase
    .from('recipe_items_secure')
    .select(`
      id,
      ingredient_item_id,
      qty,
      unit_id,
      notes
    `)
    .eq('recipe_id', id)
    .order('created_at')

  const { data: items } = await supabase
    .from('items_secure')
    .select(`
      id,
      sku,
      name,
      item_type,
      base_unit_id,
      purchase_unit_id
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

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-7xl">

        <Link
          href="/dashboard/recipes"
          className="text-sm text-zinc-500 hover:text-red-800"
        >
          ← Master Recipe
        </Link>

        <div className="mt-6">

          <p className="text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Edit Recipe
          </h1>

          <p className="mt-2 text-zinc-500">
            Update Recipe / BOM definition.
          </p>

        </div>

        <EditRecipeForm
          recipe={recipe}
          recipeItems={recipeItems || []}
          items={items || []}
          units={units || []}
        />

      </div>

    </main>
  )
}
