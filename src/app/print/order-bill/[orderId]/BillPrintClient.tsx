'use client'

import Link from 'next/link'

import {
  useEffect,
  useMemo,
} from 'react'


type Order = {
  id: string
  order_no: string

  outlet_code:
    string | null

  outlet_name: string

  outlet_address:
    string | null

  outlet_phone:
    string | null

  table_code:
    string | null

  table_name:
    string | null

  source: string
  order_type: string

  status: string
  payment_status: string

  guest_name:
    string | null

  subtotal:
    number | string

  service_amount:
    number | string

  tax_amount:
    number | string

  grand_total:
    number | string

  opened_at:
    string | null

  created_at: string
}


type BillItem = {
  id: string

  menu_name: string

  quantity:
    number | string

  unit_price:
    number | string

  line_total:
    number | string

  notes:
    string | null

  round_no:
    number | string
}


function money(
  value:
    | number
    | string
) {

  return new Intl.NumberFormat(
    'id-ID',
    {
      maximumFractionDigits: 0,
    }
  ).format(
    Number(
      value || 0
    )
  )

}


function dateTime(
  value:
    string |
    null
) {

  if (!value) {
    return '-'
  }


  return new Intl.DateTimeFormat(
    'id-ID',
    {
      timeZone:
        'Asia/Jakarta',

      day:
        '2-digit',

      month:
        '2-digit',

      year:
        'numeric',

      hour:
        '2-digit',

      minute:
        '2-digit',
    }
  ).format(
    new Date(
      value
    )
  )

}


export default function BillPrintClient({
  order,
  items,
  autoPrint,
}: {
  order: Order
  items: BillItem[]
  autoPrint: boolean
}) {

  const grouped =
    useMemo(
      () => {

        const map =
          new Map<
            number,
            BillItem[]
          >()


        for (
          const item
          of items
        ) {

          const round =
            Number(
              item.round_no ||
              1
            )


          const current =
            map.get(
              round
            ) ||
            []


          current.push(
            item
          )


          map.set(
            round,
            current
          )

        }


        return Array.from(
          map.entries()
        ).sort(
          (
            a,
            b
          ) =>
            a[0] -
            b[0]
        )

      },
      [items]
    )


  useEffect(
    () => {

      if (
        !autoPrint
      ) {
        return
      }


      const timer =
        window.setTimeout(
          () => {
            window.print()
          },
          350
        )


      return () => {
        window.clearTimeout(
          timer
        )
      }

    },
    [autoPrint]
  )


  const table =
    order.table_code
      ? (
          order.table_name
            ? `${order.table_code} · ${order.table_name}`
            : order.table_code
        )
      : 'TAKEAWAY'


  return (
    <main className="bill-page">

      <div className="screen-controls">

        <Link
          href="/dashboard/pos/orders"
          className="back-button"
        >
          ← Open Orders
        </Link>


        <button
          type="button"
          onClick={() =>
            window.print()
          }
          className="print-button"
        >
          PRINT BILL
        </button>

      </div>


      <section className="receipt">

        <header className="receipt-header">

          <h1>
            {
              order.outlet_name
            }
          </h1>


          {order.outlet_address && (

            <p>
              {
                order.outlet_address
              }
            </p>

          )}


          {order.outlet_phone && (

            <p>
              Tel. {
                order.outlet_phone
              }
            </p>

          )}


          <h2>
            BILL
          </h2>

          <p className="unpaid">
            UNPAID
          </p>

        </header>


        <div className="separator" />


        <section className="meta">

          <div>
            <span>
              Table
            </span>

            <strong>
              {table}
            </strong>
          </div>


          <div>
            <span>
              Order
            </span>

            <strong>
              {
                order.order_no
              }
            </strong>
          </div>


          <div>
            <span>
              Type
            </span>

            <strong>
              {
                order.order_type
              }
            </strong>
          </div>


          <div>
            <span>
              Opened
            </span>

            <strong>
              {
                dateTime(
                  order.opened_at ||
                  order.created_at
                )
              }
            </strong>
          </div>


          {order.guest_name && (

            <div>

              <span>
                Guest
              </span>

              <strong>
                {
                  order.guest_name
                }
              </strong>

            </div>

          )}

        </section>


        <div className="separator" />


        {grouped.map(
          ([
            round,
            roundItems,
          ]) => (

            <section
              key={
                round
              }
              className="round"
            >

              <p className="round-title">

                {
                  round === 1
                    ? 'ORDER'
                    : `ADDITIONAL ORDER · ROUND ${round}`
                }

              </p>


              {roundItems.map(
                (item) => (

                  <div
                    key={
                      item.id
                    }
                    className="item"
                  >

                    <div className="item-main">

                      <span className="qty">
                        {
                          Number(
                            item.quantity
                          )
                        }×
                      </span>


                      <span className="item-name">
                        {
                          item.menu_name
                        }
                      </span>


                      <span className="amount">
                        {
                          money(
                            item.line_total
                          )
                        }
                      </span>

                    </div>


                    {item.notes && (

                      <p className="item-note">
                        Notes: {
                          item.notes
                        }
                      </p>

                    )}

                  </div>

                )
              )}

            </section>

          )
        )}


        <div className="separator" />


        <section className="totals">

          <div>
            <span>
              Subtotal
            </span>

            <span>
              {
                money(
                  order.subtotal
                )
              }
            </span>
          </div>


          <div>
            <span>
              Service
            </span>

            <span>
              {
                money(
                  order.service_amount
                )
              }
            </span>
          </div>


          <div>
            <span>
              Tax
            </span>

            <span>
              {
                money(
                  order.tax_amount
                )
              }
            </span>
          </div>


          <div className="grand-total">

            <span>
              TOTAL
            </span>

            <span>
              Rp {
                money(
                  order.grand_total
                )
              }
            </span>

          </div>

        </section>


        <div className="separator" />


        <footer>

          <strong>
            PLEASE PROCEED TO CASHIER
          </strong>

          <p>
            This is not a payment receipt.
          </p>


          <p className="order-footer">
            {
              order.order_no
            }
          </p>

        </footer>

      </section>


      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #f4f4f5;
          color: #111;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .bill-page {
          min-height: 100vh;
          padding: 32px 16px;
        }

        .screen-controls {
          width: 80mm;
          max-width: 100%;
          margin: 0 auto 18px;
          display: flex;
          gap: 10px;
          justify-content: space-between;
        }

        .back-button,
        .print-button {
          border-radius: 10px;
          border: 1px solid #d4d4d8;
          padding: 10px 14px;
          background: #fff;
          color: #111;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
        }

        .print-button {
          background: #111;
          color: #fff;
          border-color: #111;
        }

        .receipt {
          width: 80mm;
          max-width: 100%;
          margin: 0 auto;
          background: #fff;
          padding: 4mm;
          font-family:
            "Courier New",
            Courier,
            monospace;
          font-size: 11px;
          line-height: 1.35;
          box-shadow:
            0 2px 16px rgba(
              0,
              0,
              0,
              0.08
            );
        }

        .receipt-header {
          text-align: center;
        }

        .receipt-header h1 {
          margin: 0;
          font-size: 17px;
          line-height: 1.2;
          font-weight: 900;
        }

        .receipt-header p {
          margin: 2px 0 0;
          font-size: 10px;
        }

        .receipt-header h2 {
          margin: 12px 0 2px;
          font-size: 15px;
          letter-spacing: 2px;
        }

        .receipt-header .unpaid {
          font-size: 12px;
          font-weight: 900;
        }

        .separator {
          margin: 9px 0;
          border-top: 1px dashed #111;
        }

        .meta {
          display: grid;
          gap: 3px;
        }

        .meta > div {
          display: grid;
          grid-template-columns:
            54px
            minmax(
              0,
              1fr
            );
          gap: 6px;
        }

        .meta span {
          color: #444;
        }

        .meta strong {
          overflow-wrap: anywhere;
        }

        .round + .round {
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px dotted #777;
        }

        .round-title {
          margin: 0 0 7px;
          font-size: 10px;
          font-weight: 900;
        }

        .item {
          margin-bottom: 7px;
        }

        .item-main {
          display: grid;
          grid-template-columns:
            25px
            minmax(
              0,
              1fr
            )
            auto;
          gap: 3px;
          align-items: start;
        }

        .qty {
          font-weight: 700;
        }

        .item-name {
          padding-right: 4px;
          font-weight: 700;
        }

        .amount {
          text-align: right;
          white-space: nowrap;
        }

        .item-note {
          margin:
            2px
            0
            0
            28px;
          font-size: 9px;
          color: #555;
        }

        .totals {
          display: grid;
          gap: 3px;
        }

        .totals > div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .grand-total {
          margin-top: 7px;
          padding-top: 7px;
          border-top: 1px solid #111;
          font-size: 15px;
          font-weight: 900;
        }

        footer {
          text-align: center;
          font-size: 10px;
        }

        footer p {
          margin: 4px 0 0;
        }

        .order-footer {
          margin-top: 10px;
          font-size: 8px;
          overflow-wrap: anywhere;
        }

        @page {
          size: 80mm auto;
          margin: 0;
        }

        @media print {

          html,
          body {
            width: 80mm;
            background: #fff;
          }

          .bill-page {
            min-height: 0;
            padding: 0;
          }

          .screen-controls {
            display: none !important;
          }

          .receipt {
            width: 80mm;
            margin: 0;
            padding: 4mm;
            box-shadow: none;
          }

        }
      `}</style>

    </main>
  )
}
