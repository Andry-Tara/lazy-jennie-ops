'use client'

import Link from 'next/link'

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { createClient } from '@/lib/supabase/client'

import {
  isAndroidNative,
  printBluetoothReceipt,
} from '@/lib/pos/bluetooth-printer'


type Order = {
  id: string
  order_no: string

  outlet_id: string
  outlet_code: string
  outlet_name: string

  table_id: string | null
  table_code: string | null
  table_name: string | null

  source: string
  order_type: string

  status: string
  payment_status: string

  guest_name: string | null

  subtotal: number | string
  service_amount: number | string
  tax_amount: number | string
  grand_total: number | string

  sale_id: string | null
  sale_no: string | null

  notes: string | null

  opened_at: string
  closed_at: string | null
}


type OrderItem = {
  id: string
  order_id: string

  menu_item_id: string

  menu_code: string | null
  menu_name: string

  quantity: number | string
  unit_price: number | string
  line_total: number | string

  notes: string | null
  status: string
}


type KitchenProgress = {
  restaurant_order_item_id: string
  order_id: string
  outlet_id: string

  kitchen_item_id: string | null
  ticket_id: string | null

  station: string | null
  status: string | null

  kitchen_updated_at: string | null
}


type ReceiptPrinterSetting = {
  outlet_id: string
  printer_role: string

  device_name: string | null

  device_identifier: string | null

  connection_type: string

  paper_width_mm: number

  auto_print_after_payment: boolean
  is_active: boolean
}


type OrdersClientProps = {
  printerSettings:
    ReceiptPrinterSetting[]
}


type PaymentSuccess = {
  orderId: string

  outletId: string
  orderNo: string

  tableCode: string | null
  tableName: string | null

  saleId: string
  saleNo: string

  paymentMethod: string
  total: number
}


type DisplayOrderItem = OrderItem & {
  source_item_ids: string[]
}


type OrdersSummary = {
  total_orders:
    number | string

  unpaid_orders:
    number | string

  active_orders:
    number | string

  paid_orders:
    number | string

  paid_sales:
    number | string
}


type ServerOutletOption = {
  id: string
  code: string
  name: string
}


type Filter =
  | 'UNPAID'
  | 'ACTIVE'
  | 'PAID'
  | 'ALL'


export default function OrdersClient({
  printerSettings,
}: OrdersClientProps) {
  const supabase =
    useMemo(
      () => createClient(),
      []
    )

  const [
    orders,
    setOrders,
  ] =
    useState<Order[]>([])

  const [
    items,
    setItems,
  ] =
    useState<OrderItem[]>([])

  const [
    kitchenProgress,
    setKitchenProgress,
  ] =
    useState<KitchenProgress[]>(
      []
    )


  const [
    filter,
    setFilter,
  ] =
    useState<Filter>(
      'UNPAID'
    )

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    success,
    setSuccess,
  ] =
    useState('')

  const [
    payingId,
    setPayingId,
  ] =
    useState('')


  const [
    paymentSuccess,
    setPaymentSuccess,
  ] =
    useState<PaymentSuccess | null>(
      null
    )

  const [
    paymentMethods,
    setPaymentMethods,
  ] =
    useState<
      Record<string, string>
    >({})


  // ========================================================
  // ORDERS FILTER UX V2
  // ========================================================

  function jakartaDateKey(
    value:
      | string
      | Date
      | null
      | undefined
  ) {

    if (!value) {
      return ''
    }


    const date =
      value instanceof Date
        ? value
        : new Date(
            value
          )


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return ''
    }


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
      date
    )

  }


  const todayJakarta =
    jakartaDateKey(
      new Date()
    )


  const [
    historySearch,
    setHistorySearch,
  ] =
    useState('')


  const [
    historyOutletFilter,
    setHistoryOutletFilter,
  ] =
    useState('ALL')


  const [
    historyOrderTypeFilter,
    setHistoryOrderTypeFilter,
  ] =
    useState('ALL')


  const [
    historyDateFrom,
    setHistoryDateFrom,
  ] =
    useState(
      todayJakarta
    )


  const [
    historyDateTo,
    setHistoryDateTo,
  ] =
    useState(
      todayJakarta
    )


  const [
    historyPage,
    setHistoryPage,
  ] =
    useState(0)


  const [
    historyPageSize,
    setHistoryPageSize,
  ] =
    useState(9)



  const historySearchQuery =
    useDeferredValue(
      historySearch
    )


  const [
    historyServerTotal,
    setHistoryServerTotal,
  ] =
    useState(0)


  const [
    historySummary,
    setHistorySummary,
  ] =
    useState<OrdersSummary>({
      total_orders: 0,
      unpaid_orders: 0,
      active_orders: 0,
      paid_orders: 0,
      paid_sales: 0,
    })


  const [
    serverOutletOptions,
    setServerOutletOptions,
  ] =
    useState<ServerOutletOption[]>(
      []
    )


  function nextDateKey(
    value: string
  ) {

    if (!value) {
      return ''
    }


    const parts =
      value
        .split('-')
        .map(Number)


    if (
      parts.length !== 3
    ) {
      return ''
    }


    const [
      year,
      month,
      day,
    ] =
      parts


    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      )


    date.setUTCDate(
      date.getUTCDate() +
      1
    )


    return date
      .toISOString()
      .slice(
        0,
        10
      )

  }


  function money(
    value:
      | number
      | string
      | null
      | undefined
  ) {
    return new Intl.NumberFormat(
      'id-ID',
      {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }
    ).format(
      Number(value || 0)
    )
  }


  function formatTime(
    value: string
  ) {
    return new Intl.DateTimeFormat(
      'id-ID',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      }
    ).format(
      new Date(value)
    )
  }


  // ========================================================
  // ORDERS SERVER PAGINATION V3
  // Filtering / count / pagination now run in Supabase.
  // Only current-page items + KDS rows are loaded.
  // ========================================================

  const loadOrders =
    useCallback(
      async (
        silent = false
      ) => {

        if (!silent) {
          setLoading(
            true
          )
        }


        try {

          if (
            historyDateFrom &&
            historyDateTo &&
            historyDateTo <
              historyDateFrom
          ) {

            throw new Error(
              'End Date tidak boleh sebelum Start Date.'
            )

          }


          const cleanSearch =
            historySearchQuery
              .trim()
              .replace(
                /[^a-zA-Z0-9@._\-\s]/g,
                ' '
              )
              .trim()


          const dateFromIso =
            historyDateFrom
              ? `${historyDateFrom}T00:00:00+07:00`
              : null


          const dateToExclusiveIso =
            historyDateTo
              ? `${nextDateKey(
                  historyDateTo
                )}T00:00:00+07:00`
              : null


          let orderQuery =
            supabase
              .from(
                'restaurant_orders_secure'
              )
              .select(
                '*',
                {
                  count:
                    'exact',
                }
              )


          // DATE RANGE

          if (dateFromIso) {

            orderQuery =
              orderQuery.gte(
                'opened_at',
                dateFromIso
              )

          }


          if (
            dateToExclusiveIso
          ) {

            orderQuery =
              orderQuery.lt(
                'opened_at',
                dateToExclusiveIso
              )

          }


          // OUTLET

          if (
            historyOutletFilter !==
            'ALL'
          ) {

            orderQuery =
              orderQuery.eq(
                'outlet_id',
                historyOutletFilter
              )

          }


          // ORDER TYPE

          if (
            historyOrderTypeFilter !==
            'ALL'
          ) {

            orderQuery =
              orderQuery.eq(
                'order_type',
                historyOrderTypeFilter
              )

          }


          // STATUS TAB

          if (
            filter ===
            'UNPAID'
          ) {

            orderQuery =
              orderQuery
                .neq(
                  'payment_status',
                  'PAID'
                )
                .neq(
                  'status',
                  'CANCELLED'
                )

          } else if (
            filter ===
            'ACTIVE'
          ) {

            orderQuery =
              orderQuery.not(
                'status',
                'in',
                '(COMPLETED,CANCELLED)'
              )

          } else if (
            filter ===
            'PAID'
          ) {

            orderQuery =
              orderQuery.eq(
                'payment_status',
                'PAID'
              )

          }


          // SEARCH

          if (cleanSearch) {

            const pattern =
              `%${cleanSearch}%`


            orderQuery =
              orderQuery.or(
                [
                  `order_no.ilike.${pattern}`,
                  `sale_no.ilike.${pattern}`,
                  `table_code.ilike.${pattern}`,
                  `table_name.ilike.${pattern}`,
                  `outlet_code.ilike.${pattern}`,
                  `outlet_name.ilike.${pattern}`,
                  `guest_name.ilike.${pattern}`,
                ].join(',')
              )

          }


          const rangeFrom =
            historyPage *
            historyPageSize


          const rangeTo =
            rangeFrom +
            historyPageSize -
            1


          const {
            data:
              orderData,

            count:
              orderCount,

            error:
              orderError,
          } =
            await orderQuery
              .order(
                'opened_at',
                {
                  ascending:
                    false,
                }
              )
              .range(
                rangeFrom,
                rangeTo
              )


          if (orderError) {
            throw orderError
          }


          const nextOrders =
            (
              orderData ||
              []
            ) as Order[]


          const total =
            Number(
              orderCount ||
              0
            )


          setHistoryServerTotal(
            total
          )


          setOrders(
            nextOrders
          )


          // ==================================================
          // SUMMARY FOR SELECTED PERIOD
          // Summary intentionally ignores the status tab,
          // so the cards always show complete period metrics.
          // ==================================================

          const {
            data:
              summaryData,

            error:
              summaryError,
          } =
            await supabase.rpc(
              'get_restaurant_orders_summary_secure',
              {
                p_date_from:
                  dateFromIso,

                p_date_to_exclusive:
                  dateToExclusiveIso,

                p_outlet_id:
                  historyOutletFilter ===
                  'ALL'
                    ? null
                    : historyOutletFilter,

                p_order_type:
                  historyOrderTypeFilter ===
                  'ALL'
                    ? null
                    : historyOrderTypeFilter,

                p_search:
                  cleanSearch ||
                  null,
              }
            )


          if (summaryError) {
            throw summaryError
          }


          const summary =
            (
              summaryData?.[0] ||
              {
                total_orders: 0,
                unpaid_orders: 0,
                active_orders: 0,
                paid_orders: 0,
                paid_sales: 0,
              }
            ) as OrdersSummary


          setHistorySummary(
            summary
          )


          // Current page may disappear after payment/status change.

          const serverPages =
            Math.max(
              1,
              Math.ceil(
                total /
                historyPageSize
              )
            )


          if (
            historyPage >
              0 &&
            historyPage >=
              serverPages
          ) {

            setHistoryPage(
              serverPages -
              1
            )

          }


          // ==================================================
          // ONLY CURRENT PAGE DETAILS
          // ==================================================

          if (
            nextOrders.length ===
            0
          ) {

            setItems([])
            setKitchenProgress([])
            setError('')

            return

          }


          const orderIds =
            nextOrders.map(
              (
                order
              ) =>
                order.id
            )


          const [
            itemResult,
            kdsResult,
          ] =
            await Promise.all([
              supabase
                .from(
                  'restaurant_order_items_secure'
                )
                .select('*')
                .in(
                  'order_id',
                  orderIds
                )
                .eq(
                  'status',
                  'ACTIVE'
                )
                .order(
                  'created_at',
                  {
                    ascending:
                      true,
                  }
                ),

              supabase
                .from(
                  'restaurant_order_kds_status_secure'
                )
                .select('*')
                .in(
                  'order_id',
                  orderIds
                ),
            ])


          if (
            itemResult.error
          ) {
            throw itemResult.error
          }


          if (
            kdsResult.error
          ) {
            throw kdsResult.error
          }


          setItems(
            (
              itemResult.data ||
              []
            ) as OrderItem[]
          )


          setKitchenProgress(
            (
              kdsResult.data ||
              []
            ) as KitchenProgress[]
          )


          setError('')

        } catch (
          err: any
        ) {

          setError(
            err?.message ||
            err?.details ||
            'Failed to load orders.'
          )

        } finally {

          setLoading(
            false
          )

        }

      },
      [
        supabase,
        filter,
        historyDateFrom,
        historyDateTo,
        historyOutletFilter,
        historyOrderTypeFilter,
        historySearchQuery,
        historyPage,
        historyPageSize,
      ]
    )


  useEffect(
    () => {

      let active =
        true


      async function loadOutletOptions() {

        const {
          data,
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
              'is_active',
              true
            )
            .eq(
              'type',
              'OUTLET'
            )
            .order(
              'name'
            )


        if (!active) {
          return
        }


        setServerOutletOptions(
          (
            data ||
            []
          ) as ServerOutletOption[]
        )

      }


      void loadOutletOptions()


      return () => {
        active =
          false
      }

    },
    [
      supabase,
    ]
  )


  useEffect(
    () => {

      void loadOrders()

      const timer =
        window.setInterval(
          () => {

            if (
              document.visibilityState !==
              'visible'
            ) {
              return
            }


            void loadOrders(
              true
            )

          },
          5000
        )

      return () =>
        window.clearInterval(
          timer
        )

    },
    [loadOrders]
  )


  const filtered =
    useMemo(
      () =>
        orders.filter(
          (order) => {

            if (
              filter ===
              'UNPAID'
            ) {
              return (
                order
                  .payment_status !==
                'PAID'
                &&
                order.status !==
                  'CANCELLED'
              )
            }


            if (
              filter ===
              'ACTIVE'
            ) {
              return ![
                'COMPLETED',
                'CANCELLED',
              ].includes(
                order.status
              )
            }


            if (
              filter ===
              'PAID'
            ) {
              return (
                order
                  .payment_status ===
                'PAID'
              )
            }


            return true
          }
        ),
      [
        orders,
        filter,
      ]
    )


  function itemsForOrder(
    orderId: string
  ) {
    return items.filter(
      (item) =>
        item.order_id ===
        orderId
    )
  }


  function mergeOrderItems(
    rows: OrderItem[]
  ): DisplayOrderItem[] {

    const map =
      new Map<
        string,
        DisplayOrderItem
      >()


    for (
      const row
      of rows
    ) {

      const key =
        row.menu_item_id


      const existing =
        map.get(
          key
        )


      if (existing) {

        existing.quantity =
          Number(
            existing.quantity
          ) +
          Number(
            row.quantity
          )


        existing.line_total =
          Number(
            existing.line_total
          ) +
          Number(
            row.line_total
          )


        existing.source_item_ids.push(
          row.id
        )


        if (
          row.notes &&
          !String(
            existing.notes ||
            ''
          ).includes(
            row.notes
          )
        ) {

          existing.notes =
            [
              existing.notes,
              row.notes,
            ]
              .filter(Boolean)
              .join(' | ')

        }


        continue

      }


      map.set(
        key,
        {
          ...row,

          quantity:
            Number(
              row.quantity
            ),

          line_total:
            Number(
              row.line_total
            ),

          source_item_ids: [
            row.id,
          ],
        }
      )

    }


    return Array.from(
      map.values()
    )

  }


  function kdsForMergedItem(
    item: DisplayOrderItem
  ) {

    const progresses =
      item.source_item_ids
        .map(
          (id) =>
            kdsForItem(
              id
            )
        )
        .filter(Boolean) as KitchenProgress[]


    if (
      progresses.length ===
      0
    ) {
      return undefined
    }


    const stations =
      Array.from(
        new Set(
          progresses
            .map(
              (progress) =>
                String(
                  progress.station ||
                  ''
                ).toUpperCase()
            )
            .filter(Boolean)
        )
      )


    const statuses =
      progresses.map(
        (progress) =>
          String(
            progress.status ||
            ''
          ).toUpperCase()
      )


    let status =
      'NEW'


    if (
      statuses.every(
        (value) =>
          value ===
          'COMPLETED'
      )
    ) {
      status =
        'COMPLETED'

    } else if (
      statuses.includes(
        'PREPARING'
      )
    ) {
      status =
        'PREPARING'

    } else if (
      statuses.includes(
        'NEW'
      )
    ) {
      status =
        'NEW'

    } else if (
      statuses.includes(
        'READY'
      )
    ) {
      status =
        'READY'
    }


    return {
      ...progresses[0],

      station:
        stations.length === 1
          ? stations[0]
          : 'MULTI',

      status,
    }

  }


  function kdsForItem(
    orderItemId: string
  ) {

    return kitchenProgress.find(
      (progress) =>
        progress
          .restaurant_order_item_id ===
        orderItemId
    )

  }


  function displayKitchenStatus(
    status:
      | string
      | null
      | undefined
  ) {

    const value =
      String(
        status || ''
      ).toUpperCase()


    if (
      value ===
      'COMPLETED'
    ) {
      return 'DONE'
    }


    if (
      value ===
      'NEW'
    ) {
      return 'NEW'
    }


    if (
      value ===
      'PREPARING'
    ) {
      return 'PREPARING'
    }


    if (
      value ===
      'READY'
    ) {
      return 'READY'
    }


    if (
      value ===
      'CANCELLED'
    ) {
      return 'CANCELLED'
    }


    return value ||
      'WAITING'

  }


  function kitchenStatusStyle(
    status:
      | string
      | null
      | undefined
  ) {

    const value =
      String(
        status || ''
      ).toUpperCase()


    if (
      value ===
        'READY' ||
      value ===
        'COMPLETED'
    ) {
      return 'bg-green-50 text-green-700'
    }


    if (
      value ===
      'PREPARING'
    ) {
      return 'bg-amber-50 text-amber-700'
    }


    if (
      value ===
      'CANCELLED'
    ) {
      return 'bg-red-50 text-red-700'
    }


    return 'bg-zinc-100 text-zinc-600'

  }



  function receiptPrinterFor(
    outletId: string
  ) {
    return printerSettings.find(
      (setting) =>
        setting.outlet_id ===
          outletId &&
        setting.printer_role ===
          'RECEIPT'
    )
  }


  async function printBluetoothOrderReceipt(
    orderId: string,
    printerSetting:
      ReceiptPrinterSetting
  ) {
    const address =
      printerSetting
        .device_identifier
        ?.trim() ||
      ''

    if (!address) {
      throw new Error(
        'Bluetooth printer address is empty. Re-save the printer in Printer Settings.'
      )
    }

    const {
      data:
        receipt,
      error:
        receiptError,
    } =
      await supabase
        .from(
          'restaurant_order_receipt_secure'
        )
        .select('*')
        .eq(
          'order_id',
          orderId
        )
        .maybeSingle()

    if (
      receiptError ||
      !receipt
    ) {
      throw new Error(
        receiptError?.message ||
        'Receipt data is not available.'
      )
    }

    const {
      data:
        receiptItems,
      error:
        itemError,
    } =
      await supabase
        .from(
          'sale_items_secure'
        )
        .select(`
          id,
          sale_id,
          menu_item_id,
          menu_code,
          menu_name,
          quantity,
          unit_price,
          gross_amount,
          discount_amount,
          net_amount,
          notes,
          line_status,
          created_at
        `)
        .eq(
          'sale_id',
          receipt.sale_id
        )
        .eq(
          'line_status',
          'ACTIVE'
        )
        .order(
          'created_at',
          {
            ascending: true,
          }
        )

    if (itemError) {
      throw new Error(
        itemError.message
      )
    }

    await printBluetoothReceipt(
      address,
      receipt,
      receiptItems || []
    )
  }


  async function printOrderReceipt(
    orderId: string,
    outletId: string
  ) {
    const printerSetting =
      receiptPrinterFor(
        outletId
      )

    const nativeBluetooth =
      isAndroidNative() &&
      Boolean(
        printerSetting
          ?.is_active
      ) &&
      printerSetting
        ?.connection_type ===
        'ANDROID_BLUETOOTH'

    if (
      nativeBluetooth &&
      printerSetting
    ) {
      try {
        await printBluetoothOrderReceipt(
          orderId,
          printerSetting
        )

        return

      } catch (printError) {

        console.warn(
          'BLUETOOTH RECEIPT PRINT ERROR:',
          printError
        )

        window.alert(
          printError instanceof Error
            ? printError.message
            : 'Receipt print failed.'
        )

        return
      }
    }

    window.open(
      `/print/order-receipt/${orderId}?autoprint=1`,
      '_blank',
      'noopener,noreferrer'
    )
  }


  async function payOrder(
    order: Order
  ) {

    setError('')
    setSuccess('')


    // ========================================================
    // AUTO PRINT PREPARE
    //
    // Browser popup must be created directly from the
    // cashier click before the first await, otherwise
    // Safari / Chrome may block it.
    // ========================================================

    const printerSetting =
      printerSettings.find(
        (setting) =>
          setting.outlet_id ===
            order.outlet_id &&
          setting.printer_role ===
            'RECEIPT'
      )


    const shouldBrowserAutoPrint =
      Boolean(
        printerSetting
          ?.is_active
      ) &&
      Boolean(
        printerSetting
          ?.auto_print_after_payment
      ) &&
      printerSetting
        ?.connection_type ===
        'BROWSER'




    const shouldBluetoothAutoPrint =
      Boolean(
        printerSetting
          ?.is_active
      ) &&
      Boolean(
        printerSetting
          ?.auto_print_after_payment
      ) &&
      printerSetting
        ?.connection_type ===
        'ANDROID_BLUETOOTH' &&
      isAndroidNative()
let autoPrintWindow:
      Window |
      null =
        null


    if (
      shouldBrowserAutoPrint
    ) {

      autoPrintWindow =
        window.open(
          '',
          '_blank',
          'width=420,height=720'
        )


      if (
        autoPrintWindow
      ) {

        autoPrintWindow.document.open()

        autoPrintWindow.document.write(`
          <!doctype html>
          <html>
            <head>
              <title>Preparing Receipt</title>
            </head>

            <body
              style="
                margin:0;
                padding:32px;
                font-family:Arial,sans-serif;
                text-align:center;
              "
            >
              <strong>
                Preparing receipt...
              </strong>

              <p
                style="
                  color:#71717a;
                  font-size:13px;
                "
              >
                ${
                  printerSetting
                    ?.device_name ||
                  'Receipt Printer'
                }
              </p>
            </body>
          </html>
        `)

        autoPrintWindow.document.close()

      }

    }



    setPayingId(
      order.id
    )

    try {
      const paymentMethod =
        paymentMethods[
          order.id
        ] ||
        'QRIS'


      const {
        data,
        error:
          rpcError,
      } =
        await supabase.rpc(
          'settle_restaurant_order_secure',
          {
            p_order_id:
              order.id,

            p_payment_method:
              paymentMethod,

            p_service_amount:
              Number(
                order.service_amount ||
                0
              ),

            p_tax_amount:
              Number(
                order.tax_amount ||
                0
              ),

            p_override_stock:
              false,

            p_override_reason:
              null,
          }
        )


      if (rpcError) {
        throw rpcError
      }


      const saleId =
        String(
          data || ''
        )


      // Settlement already succeeded.
      // Sale lookup is only enrichment for the success UI.
      const {
        data:
          saleRow,
      } =
        await supabase
          .from(
            'sales_secure'
          )
          .select(`
            id,
            sale_no,
            payment_method,
            grand_total
          `)
          .eq(
            'id',
            saleId
          )
          .maybeSingle()


      setPaymentSuccess({
        orderId:
          order.id,

        outletId:
          order.outlet_id,

        orderNo:
          order.order_no,

        tableCode:
          order.table_code,

        tableName:
          order.table_name,

        saleId,

        saleNo:
          String(
            saleRow?.sale_no ||
            saleId
          ),

        paymentMethod:
          String(
            saleRow?.payment_method ||
            paymentMethod
          ),

        total:
          Number(
            saleRow?.grand_total ??
            order.grand_total ??
            0
          ),
      })


      setSuccess('')


      // ======================================================
      // AUTO PRINT RECEIPT
      //
      // Settlement + sale creation are complete at this point.
      // The reserved browser window can safely load the final
      // 80 mm receipt and trigger window.print().
      // ======================================================

      if (
        shouldBrowserAutoPrint &&
        autoPrintWindow &&
        !autoPrintWindow.closed
      ) {

        autoPrintWindow.location.href =
          `/print/order-receipt/${order.id}?autoprint=1`

      }


      if (
        shouldBluetoothAutoPrint &&
        printerSetting
      ) {
        try {

          await printBluetoothOrderReceipt(
            order.id,
            printerSetting
          )

        } catch (
          printError
        ) {

          /*
           * Payment is already settled at this point.
           * Printing must NEVER turn a successful payment
           * into a payment failure.
           */
          console.warn(
            'AUTO BLUETOOTH RECEIPT PRINT ERROR:',
            printError
          )

          setSuccess(
            'Payment successful. Automatic receipt printing failed; use REPRINT RECEIPT.'
          )

        }
      }



      // Refresh data in background,
      // but DO NOT switch tab yet.
      await loadOrders(
        true
      )

    } catch (
      err: any
    ) {

      if (
        autoPrintWindow &&
        !autoPrintWindow.closed
      ) {
        autoPrintWindow.close()
      }


      const paymentErrorMessage =
        [
          err?.message,
          err?.details,
          err?.hint,
          err?.code,
        ]
          .filter(Boolean)
          .join(' · ') ||
        'Payment failed'


      console.warn(
        'ORDER PAYMENT ERROR:',
        paymentErrorMessage
      )

      const message =
        err?.message ||
        err?.details ||
        err?.hint ||
        err?.code ||
        'Payment failed.'

      setError(message)

    } finally {

      setPayingId('')

    }
  }



  // ========================================================
  // FILTERED ORDER WORKSPACE
  // ========================================================

  const historyOutletOptions =
    Array.from(
      new Map(
        orders.map(
          (
            order
          ) => [
            order.outlet_id,
            {
              id:
                order.outlet_id,

              code:
                order.outlet_code,

              name:
                order.outlet_name,
            },
          ]
        )
      ).values()
    )
      .sort(
        (
          a,
          b
        ) =>
          String(
            a.name
          ).localeCompare(
            String(
              b.name
            )
          )
      )


  function orderActivityDate(
    order: Order
  ) {

    if (
      order.payment_status ===
      'PAID'
    ) {

      return (
        order.closed_at ||
        order.opened_at
      )

    }


    return order.opened_at

  }


  const historyScopedOrders =
    useMemo(
      () => {

        const q =
          historySearch
            .trim()
            .toLowerCase()


        return orders.filter(
          (
            order
          ) => {

            const dateKey =
              jakartaDateKey(
                orderActivityDate(
                  order
                )
              )


            if (
              historyDateFrom &&
              dateKey <
                historyDateFrom
            ) {
              return false
            }


            if (
              historyDateTo &&
              dateKey >
                historyDateTo
            ) {
              return false
            }


            if (
              historyOutletFilter !==
                'ALL' &&
              order.outlet_id !==
                historyOutletFilter
            ) {
              return false
            }


            if (
              historyOrderTypeFilter !==
                'ALL' &&
              order.order_type !==
                historyOrderTypeFilter
            ) {
              return false
            }


            if (!q) {
              return true
            }


            const haystack =
              [
                order.order_no,
                order.sale_no,
                order.table_code,
                order.table_name,
                order.outlet_code,
                order.outlet_name,
                order.guest_name,
                order.source,
                order.order_type,
                order.status,
                order.payment_status,
              ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()


            return haystack.includes(
              q
            )

          }
        )

      },
      [
        orders,
        historySearch,
        historyOutletFilter,
        historyOrderTypeFilter,
        historyDateFrom,
        historyDateTo,
      ]
    )


  const historyFilteredOrders =
    useMemo(
      () => {

        return historyScopedOrders.filter(
          (
            order
          ) => {

            if (
              filter ===
              'ALL'
            ) {
              return true
            }


            if (
              filter ===
              'PAID'
            ) {
              return (
                order.payment_status ===
                'PAID'
              )
            }


            if (
              filter ===
              'UNPAID'
            ) {
              return (
                order.payment_status !==
                'PAID'
              )
            }


            if (
              filter ===
              'ACTIVE'
            ) {
              return ![
                'COMPLETED',
                'CANCELLED',
              ].includes(
                String(
                  order.status
                ).toUpperCase()
              )
            }


            return true

          }
        )

      },
      [
        historyScopedOrders,
        filter,
      ]
    )


  const historyTotalPages =
    Math.max(
      1,
      Math.ceil(
        historyServerTotal /
        historyPageSize
      )
    )


  const safeHistoryPage =
    Math.min(
      historyPage,
      historyTotalPages -
      1
    )


  const pagedOrders =
    orders


  const pagedOrderIdSet =
    new Set(
      pagedOrders.map(
        (
          order
        ) =>
          order.id
      )
    )


  const historyUnpaidCount =
    historyScopedOrders.filter(
      (
        order
      ) =>
        order.payment_status !==
        'PAID'
    ).length


  const historyPaidCount =
    historyScopedOrders.filter(
      (
        order
      ) =>
        order.payment_status ===
        'PAID'
    ).length


  const historyActiveCount =
    historyScopedOrders.filter(
      (
        order
      ) =>
        ![
          'COMPLETED',
          'CANCELLED',
        ].includes(
          String(
            order.status
          ).toUpperCase()
        )
    ).length


  const historyPaidSales =
    historyScopedOrders
      .filter(
        (
          order
        ) =>
          order.payment_status ===
          'PAID'
      )
      .reduce(
        (
          total,
          order
        ) =>
          total +
          Number(
            order.grand_total ||
            0
          ),
        0
      )


  useEffect(
    () => {

      setHistoryPage(
        0
      )

    },
    [
      filter,
      historySearch,
      historyOutletFilter,
      historyOrderTypeFilter,
      historyDateFrom,
      historyDateTo,
      historyPageSize,
    ]
  )


  function setHistoryPreset(
    preset:
      | 'TODAY'
      | '7D'
      | '30D'
      | 'ALL'
  ) {

    if (
      preset ===
      'ALL'
    ) {

      setHistoryDateFrom(
        ''
      )

      setHistoryDateTo(
        ''
      )

      return

    }


    const now =
      new Date()


    let daysBack =
      0


    if (
      preset ===
      '7D'
    ) {
      daysBack =
        6
    }


    if (
      preset ===
      '30D'
    ) {
      daysBack =
        29
    }


    const from =
      new Date(
        now.getTime() -
        (
          daysBack *
          24 *
          60 *
          60 *
          1000
        )
      )


    setHistoryDateFrom(
      jakartaDateKey(
        from
      )
    )

    setHistoryDateTo(
      jakartaDateKey(
        now
      )
    )

  }


  function resetHistoryFilters() {

    setHistorySearch(
      ''
    )

    setHistoryOutletFilter(
      'ALL'
    )

    setHistoryOrderTypeFilter(
      'ALL'
    )

    setHistoryDateFrom(
      todayJakarta
    )

    setHistoryDateTo(
      todayJakarta
    )

    setFilter(
      'UNPAID'
    )

    setHistoryPage(
      0
    )

  }


  return (
    <main className="min-h-screen bg-zinc-100 p-6 text-zinc-950">

      <div className="mx-auto max-w-[1700px]">

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">

          <div>

            <Link
              href="/dashboard/pos"
              className="text-sm font-semibold text-zinc-500 hover:text-red-900"
            >
              ← Point of Sale
            </Link>

            <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-red-800">
              Restaurant Operations
            </p>

            <h1 className="mt-1 text-3xl font-black">
              Open Orders & History
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Kitchen orders, table status and payment settlement.
            </p>

          </div>


          <div className="flex gap-2">

            <Link
              href="/dashboard/pos/closing"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black hover:bg-zinc-50"
            >
              Cashier Shift
            </Link>


            <Link
              href="/dashboard/kitchen"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-bold"
            >
              Kitchen Display
            </Link>

            <button
              type="button"
              onClick={() =>
                void loadOrders()
              }
              className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-bold text-white"
            >
              Refresh
            </button>

          </div>

        </div>


        <div className="mb-6 flex flex-wrap gap-2">

          {(
            [
              'UNPAID',
              'ACTIVE',
              'PAID',
              'ALL',
            ] as Filter[]
          ).map(
            (value) => (

              <button
                key={value}
                type="button"
                onClick={() =>
                  setFilter(
                    value
                  )
                }
                className={
                  `rounded-xl px-4 py-2 text-sm font-bold ${
                    filter === value
                      ? 'bg-zinc-950 text-white'
                      : 'border border-zinc-300 bg-white text-zinc-600'
                  }`
                }
              >
                {value}
              </button>

            )
          )}

        </div>


        {/* ===================================================
            ORDERS FILTER UX V2
        =================================================== */}

        <section className="mb-6">

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">

              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                Orders
              </p>

              <div className="mt-2 flex items-end justify-between">

                <p className="text-2xl font-black">
                  {
                    Number(
                      historySummary.total_orders ||
                      0
                    )
                  }
                </p>

                <span className="text-xs font-bold text-zinc-400">
                  selected period
                </span>

              </div>

            </div>


            <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">

              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-500">
                Unpaid
              </p>

              <p className="mt-2 text-2xl font-black text-red-900">
                {
                  Number(
                    historySummary.unpaid_orders ||
                    0
                  )
                }
              </p>

            </div>


            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">

              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-600">
                Active
              </p>

              <p className="mt-2 text-2xl font-black text-amber-800">
                {
                  Number(
                    historySummary.active_orders ||
                    0
                  )
                }
              </p>

            </div>


            <div className="rounded-2xl border border-green-100 bg-green-50/70 p-4">

              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-green-600">
                Paid
              </p>

              <p className="mt-2 text-2xl font-black text-green-800">
                {
                  Number(
                    historySummary.paid_orders ||
                    0
                  )
                }
              </p>

            </div>


            <div className="rounded-2xl border border-zinc-200 bg-zinc-950 p-4 text-white shadow-sm">

              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                Paid Sales
              </p>

              <p className="mt-2 text-xl font-black">
                {
                  money(
                    Number(
                      historySummary.paid_sales ||
                      0
                    )
                  )
                }
              </p>

            </div>

          </div>


          <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">

              <div>

                <p className="font-black">
                  Transaction Filters
                </p>

                <p className="mt-0.5 text-xs text-zinc-500">
                  Default view shows today&apos;s restaurant orders.
                </p>

              </div>


              <div className="flex flex-wrap gap-2">

                <button
                  type="button"
                  onClick={() =>
                    setHistoryPreset(
                      'TODAY'
                    )
                  }
                  className={
                    `rounded-lg px-3 py-2 text-xs font-black ${
                      historyDateFrom ===
                        todayJakarta &&
                      historyDateTo ===
                        todayJakarta
                        ? 'bg-zinc-950 text-white'
                        : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                    }`
                  }
                >
                  Today
                </button>


                <button
                  type="button"
                  onClick={() =>
                    setHistoryPreset(
                      '7D'
                    )
                  }
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-600 hover:bg-zinc-50"
                >
                  Last 7 Days
                </button>


                <button
                  type="button"
                  onClick={() =>
                    setHistoryPreset(
                      '30D'
                    )
                  }
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-600 hover:bg-zinc-50"
                >
                  Last 30 Days
                </button>


                <button
                  type="button"
                  onClick={() =>
                    setHistoryPreset(
                      'ALL'
                    )
                  }
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-600 hover:bg-zinc-50"
                >
                  All Dates
                </button>

              </div>

            </div>


            <div className="grid gap-3 p-5 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr]">

              <label className="block">

                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400">
                  Search Transaction
                </span>

                <input
                  value={
                    historySearch
                  }
                  onChange={(
                    event
                  ) =>
                    setHistorySearch(
                      event.target.value
                    )
                  }
                  placeholder="Order no, sale no, table, outlet, guest..."
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-100"
                />

              </label>


              <label className="block">

                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400">
                  Outlet
                </span>

                <select
                  value={
                    historyOutletFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setHistoryOutletFilter(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm font-bold"
                >
                  <option value="ALL">
                    All Outlets
                  </option>

                  {serverOutletOptions.map(
                    (
                      outlet
                    ) => (

                      <option
                        key={
                          outlet.id
                        }
                        value={
                          outlet.id
                        }
                      >
                        {
                          outlet.code
                        } · {
                          outlet.name
                        }
                      </option>

                    )
                  )}

                </select>

              </label>


              <label className="block">

                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400">
                  Order Type
                </span>

                <select
                  value={
                    historyOrderTypeFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setHistoryOrderTypeFilter(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm font-bold"
                >
                  <option value="ALL">
                    All Types
                  </option>

                  <option value="DINE_IN">
                    Dine In
                  </option>

                  <option value="TAKEAWAY">
                    Takeaway
                  </option>

                </select>

              </label>


              <label className="block">

                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400">
                  Start Date
                </span>

                <input
                  type="date"
                  value={
                    historyDateFrom
                  }
                  onChange={(
                    event
                  ) =>
                    setHistoryDateFrom(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm font-bold"
                />

              </label>


              <label className="block">

                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400">
                  End Date
                </span>

                <input
                  type="date"
                  value={
                    historyDateTo
                  }
                  onChange={(
                    event
                  ) =>
                    setHistoryDateTo(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm font-bold"
                />

              </label>

            </div>


            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-100 bg-zinc-50/70 px-5 py-3">

              <div className="flex flex-wrap items-center gap-3">

                <p className="text-sm text-zinc-500">
                  Showing{' '}
                  <strong className="text-zinc-950">
                    {
                      historyServerTotal ===
                      0
                        ? 0
                        : (
                            safeHistoryPage *
                            historyPageSize
                          ) + 1
                    }–{
                      Math.min(
                        (
                          safeHistoryPage +
                          1
                        ) *
                        historyPageSize,
                        historyServerTotal
                      )
                    }
                  </strong>
                  {' '}of{' '}
                  <strong className="text-zinc-950">
                    {
                      historyServerTotal
                    }
                  </strong>
                  {' '}orders
                </p>


                <button
                  type="button"
                  onClick={
                    resetHistoryFilters
                  }
                  className="text-xs font-black text-red-800 hover:underline"
                >
                  Reset Filters
                </button>

              </div>


              <div className="flex items-center gap-2">

                <select
                  value={
                    historyPageSize
                  }
                  onChange={(
                    event
                  ) =>
                    setHistoryPageSize(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-bold"
                >
                  <option value="6">
                    6 / page
                  </option>

                  <option value="9">
                    9 / page
                  </option>

                  <option value="12">
                    12 / page
                  </option>

                  <option value="24">
                    24 / page
                  </option>
                </select>


                <button
                  type="button"
                  disabled={
                    safeHistoryPage ===
                    0
                  }
                  onClick={() =>
                    setHistoryPage(
                      Math.max(
                        0,
                        safeHistoryPage -
                        1
                      )
                    )
                  }
                  className="h-9 w-9 rounded-lg border border-zinc-300 bg-white font-black disabled:opacity-30"
                >
                  ‹
                </button>


                <span className="min-w-16 text-center text-xs font-black">
                  {
                    safeHistoryPage +
                    1
                  } / {
                    historyTotalPages
                  }
                </span>


                <button
                  type="button"
                  disabled={
                    safeHistoryPage +
                    1 >=
                    historyTotalPages
                  }
                  onClick={() =>
                    setHistoryPage(
                      Math.min(
                        historyTotalPages -
                        1,
                        safeHistoryPage +
                        1
                      )
                    )
                  }
                  className="h-9 w-9 rounded-lg border border-zinc-300 bg-white font-black disabled:opacity-30"
                >
                  ›
                </button>

              </div>

            </div>

          </div>


          {historyServerTotal ===
            0 && (

            <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">

              <p className="text-lg font-black text-zinc-700">
                No transactions found
              </p>

              <p className="mt-2 text-sm text-zinc-400">
                Try another status, date range, outlet or search keyword.
              </p>

            </div>

          )}

        </section>


        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}


        {success && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
            {success}
          </div>
        )}


        {loading ? (

          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            Loading orders...
          </div>

        ) : (

          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">

            {filtered.map(
              (order) => {

                if (
                  !pagedOrderIdSet.has(
                    order.id
                  )
                ) {
                  return null
                }


                const orderItems =
                  itemsForOrder(
                    order.id
                  )

                const unpaid =
                  order
                    .payment_status !==
                  'PAID'


                return (
                  <article
                    key={
                      order.id
                    }
                    className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
                  >

                    <div className="border-b border-zinc-200 p-5">

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <p className="text-xs font-black uppercase tracking-wide text-red-800">
                            {
                              order.source
                            }
                            {' · '}
                            {
                              order.order_type
                            }
                          </p>

                          <h2 className="mt-1 text-xl font-black">
                            {
                              order.order_no
                            }
                          </h2>

                        </div>


                        <div className="text-right">

                          <p className="text-xs font-bold text-zinc-500">
                            {
                              formatTime(
                                order.opened_at
                              )
                            }
                          </p>

                        </div>

                      </div>


                      <div className="mt-3 flex flex-wrap gap-2">

                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold">
                          {
                            order.outlet_name
                          }
                        </span>


                        {order.table_code && (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                            {
                              order.table_code
                            }
                            {' · '}
                            {
                              order.table_name
                            }
                          </span>
                        )}


                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                          {
                            order.status
                          }
                        </span>


                        <span
                          className={
                            `rounded-full px-3 py-1 text-xs font-bold ${
                              unpaid
                                ? 'bg-red-50 text-red-700'
                                : 'bg-green-50 text-green-700'
                            }`
                          }
                        >
                          {
                            order.payment_status
                          }
                        </span>

                      </div>

                    </div>


                    <div className="divide-y divide-zinc-100">

                      {mergeOrderItems(
                        orderItems
                      ).map(
                        (item) => {

                          const progress =
                            kdsForMergedItem(
                              item
                            )


                          const station =
                            String(
                              progress?.station ||
                              ''
                            ).toUpperCase()


                          return (

                            <div
                              key={
                                item.id
                              }
                              className="flex items-start justify-between gap-4 px-5 py-4"
                            >

                              <div className="min-w-0">

                                <p className="font-bold">
                                  {
                                    Number(
                                      item.quantity
                                    )
                                  }
                                  ×{' '}
                                  {
                                    item.menu_name
                                  }
                                </p>


                                {progress && (

                                  <div className="mt-2 flex flex-wrap items-center gap-2">

                                    <span
                                      className={
                                        `rounded-full px-2.5 py-1 text-[11px] font-black ${
                                          station ===
                                          'BAR'
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'bg-red-50 text-red-700'
                                        }`
                                      }
                                    >
                                      {
                                        station ||
                                        'KITCHEN'
                                      }
                                    </span>


                                    <span
                                      className={
                                        `rounded-full px-2.5 py-1 text-[11px] font-black ${kitchenStatusStyle(
                                          progress.status
                                        )}`
                                      }
                                    >
                                      {
                                        displayKitchenStatus(
                                          progress.status
                                        )
                                      }
                                    </span>

                                  </div>

                                )}


                                {item.notes && (

                                  <p className="mt-2 text-xs text-amber-700">
                                    {
                                      item.notes
                                    }
                                  </p>

                                )}

                              </div>


                              <p className="shrink-0 font-bold">
                                {
                                  money(
                                    item.line_total
                                  )
                                }
                              </p>

                            </div>

                          )

                        }
                      )}

                    </div>


                    <div className="border-t border-zinc-200 p-5">

                      <div className="flex items-end justify-between">

                        <div>

                          <p className="text-xs text-zinc-500">
                            Grand Total
                          </p>

                          <p className="mt-1 text-2xl font-black text-red-900">
                            {
                              money(
                                order.grand_total
                              )
                            }
                          </p>

                        </div>


                        {order.sale_no && (

                          <div className="text-right">

                            <p className="text-xs text-zinc-500">
                              Sale
                            </p>

                            <p className="text-sm font-bold">
                              {
                                order.sale_no
                              }
                            </p>

                          </div>

                        )}

                      </div>


                      {!unpaid &&
                        order.sale_id && (

                        <button
                          type="button"
                          onClick={() => {
                            void printOrderReceipt(
                              order.id,
                              order.outlet_id
                            )
                          }}
                          className="mt-5 flex w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3 font-black text-zinc-950 hover:bg-zinc-50"
                        >
                          REPRINT RECEIPT
                        </button>

                      )}


                      {unpaid &&
                        ![
                          'CANCELLED',
                          'COMPLETED',
                        ].includes(
                          order.status
                        ) && (

                        <>
                        <Link
                          href={`/dashboard/pos/orders/${order.id}/add-items`}
                          className="mt-5 flex w-full items-center justify-center rounded-xl border-2 border-zinc-950 bg-white px-5 py-3 font-black text-zinc-950 hover:bg-zinc-50"
                        >
                          + ADD ITEMS
                        </Link>


                        <button
                          type="button"
                          onClick={() => {
                            window.open(
                              `/print/order-bill/${order.id}?autoprint=1`,
                              '_blank',
                              'noopener,noreferrer'
                            )
                          }}
                          className="mt-3 flex w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3 font-black text-zinc-950 hover:bg-zinc-50"
                        >
                          PRINT BILL
                        </button>
                        </>

                      )}


                      {unpaid &&
                        order.status !==
                          'CANCELLED' && (

                        <div className="mt-5">

                          <label className="mb-2 block text-xs font-bold">
                            Payment Method
                          </label>

                          <select
                            value={
                              paymentMethods[
                                order.id
                              ] ||
                              'QRIS'
                            }
                            onChange={(
                              event
                            ) =>
                              setPaymentMethods(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  [
                                    order.id
                                  ]:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                            className="w-full rounded-xl border border-zinc-300 px-4 py-3"
                          >

                            <option value="QRIS">
                              QRIS
                            </option>

                            <option value="CASH">
                              Cash
                            </option>

                            <option value="CARD">
                              Card
                            </option>

                            <option value="TRANSFER">
                              Transfer
                            </option>

                            <option value="OTHER">
                              Other
                            </option>

                          </select>


                          <button
                            type="button"
                            disabled={
                              payingId ===
                              order.id
                            }
                            onClick={() =>
                              void payOrder(
                                order
                              )
                            }
                            className="mt-3 w-full rounded-xl bg-green-700 px-5 py-4 font-black text-white hover:bg-green-800 disabled:opacity-50"
                          >
                            {
                              payingId ===
                              order.id
                                ? 'PROCESSING PAYMENT...'
                                : `PAY ${money(
                                    order.grand_total
                                  )}`
                            }
                          </button>

                        </div>

                      )}

                    </div>

                  </article>
                )

              }
            )}


            {filtered.length ===
              0 && (

              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center text-zinc-500">
                No orders found.
              </div>

            )}

          </div>
        )}

      </div>



      {paymentSuccess && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4">

          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">

            <div className="bg-green-600 px-6 py-8 text-center text-white">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl font-black text-green-600">
                ✓
              </div>


              <h2 className="mt-4 text-2xl font-black">
                PAYMENT SUCCESSFUL
              </h2>


              <p className="mt-1 text-sm font-semibold text-green-50">
                Transaction has been completed.
              </p>

            </div>


            <div className="p-6">

              <div className="rounded-2xl bg-zinc-50 p-5">

                <div className="flex items-center justify-between gap-4">

                  <span className="text-sm text-zinc-500">
                    Table
                  </span>

                  <strong>
                    {
                      paymentSuccess.tableCode
                        ? `${
                            paymentSuccess.tableCode
                          }${
                            paymentSuccess.tableName
                              ? ` · ${paymentSuccess.tableName}`
                              : ''
                          }`
                        : 'TAKEAWAY'
                    }
                  </strong>

                </div>


                <div className="mt-3 flex items-center justify-between gap-4">

                  <span className="text-sm text-zinc-500">
                    Order
                  </span>

                  <strong className="text-right text-sm">
                    {
                      paymentSuccess.orderNo
                    }
                  </strong>

                </div>


                <div className="mt-3 flex items-center justify-between gap-4">

                  <span className="text-sm text-zinc-500">
                    Sale
                  </span>

                  <strong className="text-right text-sm">
                    {
                      paymentSuccess.saleNo
                    }
                  </strong>

                </div>


                <div className="mt-3 flex items-center justify-between gap-4">

                  <span className="text-sm text-zinc-500">
                    Payment
                  </span>

                  <strong>
                    {
                      paymentSuccess.paymentMethod
                    }
                  </strong>

                </div>


                <div className="mt-5 border-t border-zinc-200 pt-5">

                  <div className="flex items-end justify-between gap-4">

                    <span className="font-bold">
                      Total Paid
                    </span>

                    <strong className="text-2xl text-green-700">
                      {
                        money(
                          paymentSuccess.total
                        )
                      }
                    </strong>

                  </div>

                </div>

              </div>


              <button
                type="button"
                onClick={() => {
                  void printOrderReceipt(
                    paymentSuccess.orderId,
                    paymentSuccess.outletId
                  )
                }}
                className="mt-5 w-full rounded-xl bg-zinc-950 px-5 py-4 font-black text-white hover:bg-zinc-800"
              >
                PRINT RECEIPT
              </button>


              <button
                type="button"
                onClick={() => {
                  window.location.href =
                    '/dashboard/pos/sales/' + paymentSuccess.saleId
                }}
                className="mt-3 w-full rounded-xl border border-zinc-950 bg-white px-5 py-4 font-black text-zinc-950 hover:bg-zinc-50"
              >
                VIEW SALE DETAIL
              </button>

              <div className="mt-3 grid grid-cols-2 gap-3">

                <button
                  type="button"
                  onClick={() => {

                    setPaymentSuccess(
                      null
                    )

                    setFilter(
                      'PAID'
                    )

                    void loadOrders(
                      true
                    )

                  }}
                  className="rounded-xl border border-zinc-300 bg-white px-4 py-3 font-black"
                >
                  DONE
                </button>


                <button
                  type="button"
                  onClick={() => {
                    window.location.href =
                      '/dashboard/pos'
                  }}
                  className="rounded-xl bg-red-900 px-4 py-3 font-black text-white"
                >
                  NEW ORDER
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </main>
  )
}
