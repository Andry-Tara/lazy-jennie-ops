import {
  createClient,
} from '@/lib/supabase/server'


export class RevenueExportError
  extends Error {

  status: number

  constructor(
    message: string,
    status = 400
  ) {

    super(message)

    this.name =
      'RevenueExportError'

    this.status =
      status

  }

}


export type RevenueExportFilters = {
  from?: string | null
  to?: string | null
  payment?: string | null
  orderType?: string | null
}


function jakartaDate() {

  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'Asia/Jakarta',

      year:
        'numeric',

      month:
        '2-digit',

      day:
        '2-digit',
    }
  ).format(
    new Date()
  )

}


function validDate(
  value: string
) {

  return (
    /^\d{4}-\d{2}-\d{2}$/.test(
      value
    ) &&
    !Number.isNaN(
      Date.parse(
        `${value}T12:00:00Z`
      )
    )
  )

}


export async function loadSalesOnlyRevenueExport(
  filters: RevenueExportFilters
) {

  const supabase =
    await createClient()


  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser()


  if (!user) {

    throw new RevenueExportError(
      'Unauthorized',
      401
    )

  }


  const {
    data:
      profile,
  } =
    await supabase
      .from(
        'profiles'
      )
      .select(`
        id,
        outlet_id,
        role_id,
        is_active
      `)
      .eq(
        'id',
        user.id
      )
      .maybeSingle()


  if (
    !profile ||
    profile.is_active === false ||
    !profile.outlet_id
  ) {

    throw new RevenueExportError(
      'Active outlet profile not found',
      403
    )

  }


  const {
    data:
      role,
  } =
    await supabase
      .from(
        'roles'
      )
      .select(`
        code,
        name
      `)
      .eq(
        'id',
        profile.role_id
      )
      .maybeSingle()


  const roleCode =
    String(
      role?.code ||
      ''
    )


  if (
    ![
      'SUPER_ADMIN',
      'MANAGEMENT',
      'OUTLET_MANAGER',
    ].includes(
      roleCode
    )
  ) {

    throw new RevenueExportError(
      'Report export is not permitted for this role',
      403
    )

  }


  const {
    data:
      appProfile,
  } =
    await supabase
      .from(
        'outlet_app_profiles_secure'
      )
      .select(`
        brand_name,
        inventory_enabled
      `)
      .eq(
        'outlet_id',
        profile.outlet_id
      )
      .maybeSingle()


  if (
    !appProfile ||
    appProfile.inventory_enabled !==
      false
  ) {

    throw new RevenueExportError(
      'This export is only available for Sales-Only profiles',
      403
    )

  }


  const {
    data:
      outlet,
  } =
    await supabase
      .from(
        'outlets_secure'
      )
      .select(`
        id,
        code,
        name
      `)
      .eq(
        'id',
        profile.outlet_id
      )
      .maybeSingle()


  if (!outlet) {

    throw new RevenueExportError(
      'Outlet not found',
      404
    )

  }


  const today =
    jakartaDate()


  const fromDate =
    validDate(
      String(
        filters.from ||
        ''
      )
    )
      ? String(
          filters.from
        )
      : today


  const toDate =
    validDate(
      String(
        filters.to ||
        ''
      )
    )
      ? String(
          filters.to
        )
      : today


  if (
    fromDate >
    toDate
  ) {

    throw new RevenueExportError(
      'Start date cannot be after end date'
    )

  }


  const allowedPayments =
    [
      'ALL',
      'CASH',
      'QRIS',
      'CARD',
      'TRANSFER',
      'OTHER',
    ]


  const rawPayment =
    String(
      filters.payment ||
      'ALL'
    ).toUpperCase()


  const payment =
    allowedPayments.includes(
      rawPayment
    )
      ? rawPayment
      : 'ALL'


  const allowedOrderTypes =
    [
      'ALL',
      'DINE_IN',
      'TAKEAWAY',
    ]


  const rawOrderType =
    String(
      filters.orderType ||
      'ALL'
    ).toUpperCase()


  const orderType =
    allowedOrderTypes.includes(
      rawOrderType
    )
      ? rawOrderType
      : 'ALL'


  let salesQuery =
    supabase
      .from(
        'sales'
      )
      .select(`
        id,
        sale_no,
        sale_date,
        transaction_date,
        subtotal,
        service_amount,
        tax_amount,
        net_sales,
        grand_total,
        payment_method
      `)
      .eq(
        'outlet_id',
        profile.outlet_id
      )
      .eq(
        'status',
        'POSTED'
      )
      .gte(
        'sale_date',
        fromDate
      )
      .lte(
        'sale_date',
        toDate
      )
      .order(
        'transaction_date',
        {
          ascending:
            false,
        }
      )


  if (
    payment !==
    'ALL'
  ) {

    salesQuery =
      salesQuery.eq(
        'payment_method',
        payment
      )

  }


  const {
    data:
      rawSales,
    error:
      salesError,
  } =
    await salesQuery


  if (salesError) {

    throw new RevenueExportError(
      salesError.message,
      500
    )

  }


  let sales =
    (
      rawSales ||
      []
    ).map(
      row => ({
        id:
          String(
            row.id
          ),

        sale_no:
          String(
            row.sale_no ||
            ''
          ),

        sale_date:
          String(
            row.sale_date ||
            ''
          ),

        transaction_date:
          String(
            row.transaction_date ||
            ''
          ),

        subtotal:
          Number(
            row.subtotal ||
            0
          ),

        service_amount:
          Number(
            row.service_amount ||
            0
          ),

        tax_amount:
          Number(
            row.tax_amount ||
            0
          ),

        net_sales:
          Number(
            row.net_sales ||
            0
          ),

        grand_total:
          Number(
            row.grand_total ||
            0
          ),

        payment_method:
          String(
            row.payment_method ||
            'OTHER'
          ),
      })
    )


  const originalSaleIds =
    sales.map(
      sale =>
        sale.id
    )


  let restaurantOrders:
    any[] =
      []


  if (
    originalSaleIds.length >
    0
  ) {

    const {
      data,
      error,
    } =
      await supabase
        .from(
          'restaurant_orders_secure'
        )
        .select(`
          id,
          order_no,
          sale_id,
          order_type,
          table_id
        `)
        .eq(
          'outlet_id',
          profile.outlet_id
        )
        .in(
          'sale_id',
          originalSaleIds
        )


    if (error) {

      throw new RevenueExportError(
        error.message,
        500
      )

    }


    restaurantOrders =
      data ||
      []

  }


  if (
    orderType !==
    'ALL'
  ) {

    const allowedSaleIds =
      new Set(
        restaurantOrders
          .filter(
            order =>
              String(
                order.order_type
              ) ===
              orderType
          )
          .map(
            order =>
              String(
                order.sale_id ||
                ''
              )
          )
          .filter(
            Boolean
          )
      )


    sales =
      sales.filter(
        sale =>
          allowedSaleIds.has(
            sale.id
          )
      )

  }


  const saleIds =
    sales.map(
      sale =>
        sale.id
    )


  restaurantOrders =
    restaurantOrders.filter(
      order =>
        order.sale_id &&
        saleIds.includes(
          String(
            order.sale_id
          )
        )
    )


  const orderBySale =
    new Map(
      restaurantOrders.map(
        order => [
          String(
            order.sale_id
          ),
          order,
        ]
      )
    )


  const tableIds =
    Array.from(
      new Set(
        restaurantOrders
          .map(
            order =>
              String(
                order.table_id ||
                ''
              )
          )
          .filter(
            Boolean
          )
      )
    )


  let tables:
    any[] =
      []


  if (
    tableIds.length >
    0
  ) {

    const {
      data,
      error,
    } =
      await supabase
        .from(
          'restaurant_tables_secure'
        )
        .select(`
          id,
          code,
          name
        `)
        .in(
          'id',
          tableIds
        )


    if (error) {

      throw new RevenueExportError(
        error.message,
        500
      )

    }


    tables =
      data ||
      []

  }


  const tableMap =
    new Map(
      tables.map(
        table => [
          String(
            table.id
          ),
          table,
        ]
      )
    )


  let saleItems:
    any[] =
      []


  if (
    saleIds.length >
    0
  ) {

    const {
      data,
      error,
    } =
      await supabase
        .from(
          'sale_items'
        )
        .select(`
          sale_id,
          menu_item_id,
          quantity,
          net_amount
        `)
        .in(
          'sale_id',
          saleIds
        )


    if (error) {

      throw new RevenueExportError(
        error.message,
        500
      )

    }


    saleItems =
      data ||
      []

  }


  const menuIds =
    Array.from(
      new Set(
        saleItems
          .map(
            row =>
              String(
                row.menu_item_id ||
                ''
              )
          )
          .filter(
            Boolean
          )
      )
    )


  let menus:
    any[] =
      []


  if (
    menuIds.length >
    0
  ) {

    const {
      data,
      error,
    } =
      await supabase
        .from(
          'menu_items'
        )
        .select(`
          id,
          code,
          name,
          category
        `)
        .in(
          'id',
          menuIds
        )


    if (error) {

      throw new RevenueExportError(
        error.message,
        500
      )

    }


    menus =
      data ||
      []

  }


  const menuMap =
    new Map(
      menus.map(
        menu => [
          String(
            menu.id
          ),
          menu,
        ]
      )
    )


  const transactions =
    sales.length


  const revenue =
    sales.reduce(
      (
        total,
        sale
      ) =>
        total +
        sale.net_sales,
      0
    )


  const totalCollected =
    sales.reduce(
      (
        total,
        sale
      ) =>
        total +
        sale.grand_total,
      0
    )


  const totalService =
    sales.reduce(
      (
        total,
        sale
      ) =>
        total +
        sale.service_amount,
      0
    )


  const totalTax =
    sales.reduce(
      (
        total,
        sale
      ) =>
        total +
        sale.tax_amount,
      0
    )


  const averageTicket =
    transactions >
    0
      ? totalCollected /
        transactions
      : 0


  const paymentMap =
    new Map<
      string,
      {
        transactions:
          number
        amount:
          number
      }
    >()


  for (
    const sale
    of sales
  ) {

    const method =
      String(
        sale.payment_method ||
        'OTHER'
      ).toUpperCase()


    const current =
      paymentMap.get(
        method
      ) ||
      {
        transactions:
          0,
        amount:
          0,
      }


    current.transactions +=
      1

    current.amount +=
      sale.grand_total


    paymentMap.set(
      method,
      current
    )

  }


  const paymentRows =
    Array.from(
      paymentMap.entries()
    )
      .map(
        ([
          method,
          value,
        ]) => ({
          method,
          ...value,
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.amount -
          a.amount
      )


  let dineIn =
    0

  let takeaway =
    0


  for (
    const order
    of restaurantOrders
  ) {

    if (
      order.order_type ===
      'DINE_IN'
    ) {
      dineIn +=
        1
    }

    if (
      order.order_type ===
      'TAKEAWAY'
    ) {
      takeaway +=
        1
    }

  }


  const menuSummary =
    new Map<
      string,
      {
        quantity:
          number
        revenue:
          number
      }
    >()


  for (
    const row
    of saleItems
  ) {

    const id =
      String(
        row.menu_item_id
      )


    const current =
      menuSummary.get(
        id
      ) ||
      {
        quantity:
          0,
        revenue:
          0,
      }


    current.quantity +=
      Number(
        row.quantity ||
        0
      )

    current.revenue +=
      Number(
        row.net_amount ||
        0
      )


    menuSummary.set(
      id,
      current
    )

  }


  const topMenus =
    Array.from(
      menuSummary.entries()
    )
      .map(
        ([
          menuId,
          value,
        ]) => {

          const menu =
            menuMap.get(
              menuId
            )


          return {
            menuId,
            code:
              String(
                menu?.code ||
                ''
              ),

            name:
              String(
                menu?.name ||
                '-'
              ),

            category:
              String(
                menu?.category ||
                '-'
              ),

            quantity:
              value.quantity,

            revenue:
              value.revenue,
          }
        }
      )
      .sort(
        (
          a,
          b
        ) =>
          b.quantity -
          a.quantity ||
          b.revenue -
          a.revenue
      )
      .slice(
        0,
        10
      )


  const dailyMap =
    new Map<
      string,
      {
        transactions:
          number
        revenue:
          number
      }
    >()


  for (
    const sale
    of sales
  ) {

    const current =
      dailyMap.get(
        sale.sale_date
      ) ||
      {
        transactions:
          0,
        revenue:
          0,
      }


    current.transactions +=
      1

    current.revenue +=
      sale.grand_total


    dailyMap.set(
      sale.sale_date,
      current
    )

  }


  const dailyRows =
    Array.from(
      dailyMap.entries()
    )
      .map(
        ([
          date,
          value,
        ]) => ({
          date,
          ...value,
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          a.date.localeCompare(
            b.date
          )
      )


  const transactionRows =
    sales.map(
      sale => {

        const order =
          orderBySale.get(
            sale.id
          )


        const table =
          order?.table_id
            ? tableMap.get(
                String(
                  order.table_id
                )
              )
            : null


        return {
          transactionDate:
            sale.transaction_date,

          saleNo:
            sale.sale_no,

          orderNo:
            String(
              order?.order_no ||
              ''
            ),

          table:
            String(
              table?.code ||
              ''
            ),

          orderType:
            String(
              order?.order_type ||
              'POS'
            ),

          payment:
            String(
              sale.payment_method ||
              'OTHER'
            ),

          amount:
            sale.grand_total,
        }
      }
    )


  return {

    brandName:
      String(
        appProfile.brand_name ||
        outlet.name
      ),

    outlet: {
      id:
        String(
          outlet.id
        ),

      code:
        String(
          outlet.code
        ),

      name:
        String(
          outlet.name
        ),
    },

    filters: {
      from:
        fromDate,

      to:
        toDate,

      payment,

      orderType,
    },

    kpi: {
      revenue,
      transactions,
      averageTicket,
      totalCollected,
      totalService,
      totalTax,
      dineIn,
      takeaway,
    },

    paymentRows,
    dailyRows,
    topMenus,
    transactions:
      transactionRows,
  }

}
