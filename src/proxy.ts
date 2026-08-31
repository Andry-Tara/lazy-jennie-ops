import {
  createServerClient,
} from '@supabase/ssr'

import {
  NextResponse,
  type NextRequest,
} from 'next/server'


type ModuleCode =
  | 'POS'
  | 'SALES_HISTORY'
  | 'SALES_REPORT'
  | 'INVENTORY'
  | 'INVENTORY_VALUATION'
  | 'RECEIVING'
  | 'PURCHASING'
  | 'PRODUCTION'
  | 'STOCK_TRANSFER'
  | 'STOCK_OPNAME'
  | 'WASTE'
  | 'MASTER_ITEM'
  | 'MASTER_RECIPE'
  | 'MENU_MASTER'
  | 'SUPPLIERS'
  | 'OUTLETS'
  | 'COSTING'
  | 'USERS'


type PermissionRow = {
  module_code: string
  can_view: boolean
}


const routeRules: {
  prefix: string
  module: ModuleCode
}[] = [

  // =====================================================
  // SPECIFIC ROUTES FIRST
  // =====================================================

  {
    prefix:
      '/dashboard/inventory/valuation',
    module:
      'INVENTORY_VALUATION',
  },

  {
    prefix:
      '/dashboard/inventory/transfers',
    module:
      'STOCK_TRANSFER',
  },

  {
    prefix:
      '/dashboard/inventory/opname',
    module:
      'STOCK_OPNAME',
  },

  {
    prefix:
      '/dashboard/inventory/waste',
    module:
      'WASTE',
  },

  {
    prefix:
      '/dashboard/pos/report',
    module:
      'SALES_REPORT',
  },

  {
    prefix:
      '/dashboard/pos/sales',
    module:
      'SALES_HISTORY',
  },

  // =====================================================
  // GENERAL ROUTES
  // =====================================================

  {
    prefix:
      '/dashboard/pos',
    module:
      'POS',
  },

  {
    prefix:
      '/dashboard/inventory',
    module:
      'INVENTORY',
  },

  {
    prefix:
      '/dashboard/receiving',
    module:
      'RECEIVING',
  },

  {
    prefix:
      '/dashboard/purchasing',
    module:
      'PURCHASING',
  },

  {
    prefix:
      '/dashboard/production',
    module:
      'PRODUCTION',
  },

  {
    prefix:
      '/dashboard/items',
    module:
      'MASTER_ITEM',
  },

  {
    prefix:
      '/dashboard/recipes',
    module:
      'MASTER_RECIPE',
  },

  {
    prefix:
      '/dashboard/menu',
    module:
      'MENU_MASTER',
  },

  {
    prefix:
      '/dashboard/suppliers',
    module:
      'SUPPLIERS',
  },

  {
    prefix:
      '/dashboard/outlets',
    module:
      'OUTLETS',
  },

  {
    prefix:
      '/dashboard/costing',
    module:
      'COSTING',
  },

  {
    prefix:
      '/dashboard/users',
    module:
      'USERS',
  },

]


function getModuleForPath(
  pathname: string
): ModuleCode | null {

  const rule =
    routeRules.find(
      (item) =>
        pathname ===
          item.prefix ||
        pathname.startsWith(
          `${item.prefix}/`
        )
    )


  return (
    rule?.module ||
    null
  )
}


function redirectWithCookies(
  request: NextRequest,
  response: NextResponse,
  path: string
) {

  const url =
    request.nextUrl.clone()


  url.pathname =
    path


  const redirectResponse =
    NextResponse.redirect(
      url
    )


  for (
    const cookie of
      response.cookies.getAll()
  ) {

    redirectResponse.cookies.set(
      cookie
    )

  }


  return redirectResponse
}


export async function proxy(
  request: NextRequest
) {

  let response =
    NextResponse.next({
      request,
    })


  const supabase =
    createServerClient(

      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,

      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,

      {

        cookies: {

          getAll() {

            return request
              .cookies
              .getAll()

          },


          setAll(
            cookiesToSet
          ) {

            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {

                request.cookies.set(
                  name,
                  value
                )

              }
            )


            response =
              NextResponse.next({
                request,
              })


            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {

                response.cookies.set(
                  name,
                  value,
                  options
                )

              }
            )

          },

        },

      }

    )


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


  const pathname =
    request.nextUrl.pathname


  // =====================================================
  // NOT LOGGED IN
  // =====================================================

  if (
    !user &&
    pathname.startsWith(
      '/dashboard'
    )
  ) {

    return redirectWithCookies(
      request,
      response,
      '/login'
    )

  }


  // =====================================================
  // LOGGED IN -> LOGIN PAGE
  // =====================================================

  if (
    user &&
    pathname ===
      '/login'
  ) {

    return redirectWithCookies(
      request,
      response,
      '/dashboard'
    )

  }


  // =====================================================
  // MODULE PERMISSION
  // =====================================================

  if (
    user &&
    pathname.startsWith(
      '/dashboard'
    ) &&
    pathname !==
      '/dashboard'
  ) {

    const moduleCode =
      getModuleForPath(
        pathname
      )


    if (
      moduleCode
    ) {

      const {
        data,
        error,
      } =
        await supabase.rpc(
          'get_my_permissions'
        )


      if (
        error
      ) {

        const url =
          request.nextUrl.clone()


        url.pathname =
          '/dashboard'

        url.search =
          `?denied=${moduleCode}`


        const denied =
          NextResponse.redirect(
            url
          )


        for (
          const cookie of
            response.cookies.getAll()
        ) {

          denied.cookies.set(
            cookie
          )

        }


        return denied

      }


      const permissions =
        (
          data ||
          []
        ) as PermissionRow[]


      const allowed =
        permissions.some(
          (permission) =>

            permission.module_code ===
              moduleCode &&

            permission.can_view ===
              true

        )


      if (
        !allowed
      ) {

        const url =
          request.nextUrl.clone()


        url.pathname =
          '/dashboard'

        url.search =
          `?denied=${moduleCode}`


        const denied =
          NextResponse.redirect(
            url
          )


        for (
          const cookie of
            response.cookies.getAll()
        ) {

          denied.cookies.set(
            cookie
          )

        }


        return denied

      }

    }

  }


  return response

}


export const config = {

  matcher: [

    '/dashboard/:path*',

    '/login',

  ],

}
