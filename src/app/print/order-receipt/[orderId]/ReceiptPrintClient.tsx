'use client'

import Link from 'next/link'

import {
  useEffect,
} from 'react'

import {
  isAndroidNative,
  printBluetoothReceipt,
} from '@/lib/pos/bluetooth-printer'



type PrinterSetting = {
  device_name: string | null
  connection_type: string
  device_identifier: string | null
  paper_width_mm: number
  auto_print_after_payment: boolean
  is_active: boolean
}


type Props = {
  receipt: any

  printerSetting:
    PrinterSetting | null
  items: any[]
  autoPrint: boolean
}


function amount(
  value: any
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
  value: any
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


function qty(
  value: any
) {

  const number =
    Number(
      value || 0
    )


  if (
    Number.isInteger(
      number
    )
  ) {
    return String(
      number
    )
  }


  return new Intl.NumberFormat(
    'id-ID',
    {
      maximumFractionDigits: 2,
    }
  ).format(
    number
  )

}


export default function ReceiptPrintClient({
  receipt,
  printerSetting,
  items,
  autoPrint,
}: Props) {

  async function printReceipt() {
    try {
      const bluetoothSelected =
        isAndroidNative() &&
        Boolean(
          printerSetting
            ?.is_active
        ) &&
        printerSetting
          ?.connection_type ===
          'ANDROID_BLUETOOTH'

      if (
        bluetoothSelected
      ) {
        const address =
          printerSetting
            ?.device_identifier
            ?.trim() ||
          ''

        if (!address) {
          throw new Error(
            'Bluetooth printer belum memiliki device address. Pilih printer kembali di Printer Settings.'
          )
        }

        await printBluetoothReceipt(
          address,
          receipt,
          items
        )

        return
      }

      window.print()

    } catch (error) {

      window.alert(
        error instanceof Error
          ? error.message
          : 'Failed to print receipt.'
      )

    }
  }


  useEffect(
    () => {

      if (!autoPrint) {
        return
      }

      const timer =
        window.setTimeout(
          () => {
            void printReceipt()
          },
          350
        )

      return () =>
        window.clearTimeout(
          timer
        )

    },
    [autoPrint]
  )

const table =
    receipt.table_code
      ? (
          receipt.table_name
            ? `${receipt.table_code} · ${receipt.table_name}`
            : receipt.table_code
        )
      : 'TAKEAWAY'


  const transactionTime =
    receipt.posted_at ||
    receipt.transaction_date ||
    receipt.created_at


  return (

    <main className="receipt-page">


      <div className="screen-controls">

        <Link
          href="/dashboard/pos/orders"
        >
          ← Open Orders
        </Link>


        <button
          type="button"
          onClick={() => {
            void printReceipt()
          }}
        >
          PRINT RECEIPT
        </button>

      </div>


      <section className="receipt">


        <header className="receipt-header">

          <h1>
            {
              receipt.outlet_name ||
              'RANGKA CAFE'
            }
          </h1>


          {receipt.outlet_address && (

            <p>
              {
                receipt.outlet_address
              }
            </p>

          )}


          {receipt.outlet_phone && (

            <p>
              Tel. {
                receipt.outlet_phone
              }
            </p>

          )}


          <div className="receipt-title">
            RECEIPT
          </div>


          <div className="paid-badge">
            PAID
          </div>

        </header>


        <div className="separator" />


        <section className="meta">

          <div>
            <span>Order</span>

            <strong>
              {
                receipt.order_no ||
                '-'
              }
            </strong>
          </div>


          <div>
            <span>Sale</span>

            <strong>
              {
                receipt.sale_no ||
                '-'
              }
            </strong>
          </div>


          <div>
            <span>Table</span>

            <strong>
              {table}
            </strong>
          </div>


          <div>
            <span>Payment</span>

            <strong>
              {
                receipt.payment_method ||
                '-'
              }
            </strong>
          </div>


          <div>
            <span>Date</span>

            <strong>
              {
                dateTime(
                  transactionTime
                )
              }
            </strong>
          </div>

        </section>


        <div className="separator" />


        <section className="items">

          {items.map(
            (item) => (

              <article
                key={
                  item.id
                }
                className="line-item"
              >

                <div className="item-name">
                  {
                    item.menu_name ||
                    'Menu Item'
                  }
                </div>


                <div className="item-detail">

                  <span>
                    {
                      qty(
                        item.quantity
                      )
                    }
                    {' x '}
                    {
                      amount(
                        item.unit_price
                      )
                    }
                  </span>


                  <strong>
                    {
                      amount(
                        item.net_amount
                      )
                    }
                  </strong>

                </div>


                {item.notes && (

                  <div className="item-note">
                    Note: {
                      item.notes
                    }
                  </div>

                )}

              </article>

            )
          )}

        </section>


        <div className="separator" />


        <section className="totals">

          <div>
            <span>
              Subtotal
            </span>

            <span>
              {
                amount(
                  receipt.subtotal
                )
              }
            </span>
          </div>


          {Number(
            receipt.discount_amount ||
            0
          ) > 0 && (

            <div>
              <span>
                Discount
              </span>

              <span>
                -{
                  amount(
                    receipt.discount_amount
                  )
                }
              </span>
            </div>

          )}


          <div>
            <span>
              Service
            </span>

            <span>
              {
                amount(
                  receipt.service_amount
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
                amount(
                  receipt.tax_amount
                )
              }
            </span>
          </div>


          <div className="grand-total">

            <span>
              TOTAL
            </span>

            <strong>
              Rp {
                amount(
                  receipt.grand_total
                )
              }
            </strong>

          </div>

        </section>


        <div className="separator" />


        <footer>

          <strong>
            THANK YOU
          </strong>


          <p>
            Thank you for your visit.
          </p>


          <p className="footer-sale">
            {
              receipt.sale_no
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
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
        }


        .receipt-page {
          min-height: 100vh;
          padding: 28px 12px;
        }


        .screen-controls {
          width: 80mm;
          max-width: 100%;
          margin: 0 auto 16px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }


        .screen-controls a,
        .screen-controls button {
          border: 1px solid #d4d4d8;
          border-radius: 9px;
          padding: 10px 13px;
          background: #fff;
          color: #111;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
        }


        .screen-controls button {
          background: #111;
          border-color: #111;
          color: #fff;
        }


        .receipt {
          width: 80mm;
          max-width: 100%;
          margin: 0 auto;
          padding: 4mm 4mm 5mm;
          background: #fff;
          color: #000;
          font-family:
            "Courier New",
            Courier,
            monospace;
          font-size: 11px;
          line-height: 1.3;
          box-shadow:
            0 2px 18px
            rgba(0, 0, 0, 0.08);
        }


        .receipt-header {
          text-align: center;
        }


        .receipt-header h1 {
          margin: 0;
          font-size: 18px;
          line-height: 1.15;
          font-weight: 900;
          text-transform: uppercase;
        }


        .receipt-header p {
          margin: 3px auto 0;
          max-width: 64mm;
          font-size: 9px;
          line-height: 1.3;
        }


        .receipt-title {
          margin-top: 11px;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 2px;
        }


        .paid-badge {
          margin-top: 2px;
          font-size: 11px;
          font-weight: 900;
        }


        .separator {
          width: 100%;
          margin: 9px 0;
          border-top:
            1px dashed #000;
        }


        .meta {
          display: grid;
          gap: 3px;
        }


        .meta > div {
          display: grid;
          grid-template-columns:
            58px
            minmax(0, 1fr);
          gap: 5px;
        }


        .meta span {
          white-space: nowrap;
        }


        .meta strong {
          min-width: 0;
          text-align: right;
          overflow-wrap: anywhere;
        }


        .items {
          display: grid;
          gap: 9px;
        }


        .line-item {
          break-inside: avoid;
        }


        .item-name {
          font-size: 11px;
          font-weight: 900;
          overflow-wrap: anywhere;
        }


        .item-detail {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-top: 2px;
        }


        .item-detail span {
          color: #111;
        }


        .item-detail strong {
          white-space: nowrap;
          text-align: right;
        }


        .item-note {
          margin-top: 3px;
          padding-left: 8px;
          border-left: 2px solid #000;
          font-size: 9px;
          font-style: italic;
          overflow-wrap: anywhere;
        }


        .totals {
          display: grid;
          gap: 3px;
        }


        .totals > div {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 10px;
        }


        .grand-total {
          margin-top: 6px;
          padding-top: 7px;
          border-top: 1px solid #000;
          font-size: 15px;
          font-weight: 900;
        }


        .grand-total strong {
          white-space: nowrap;
        }


        footer {
          text-align: center;
          font-size: 10px;
        }


        footer strong {
          font-size: 12px;
          letter-spacing: 1px;
        }


        footer p {
          margin: 4px 0 0;
        }


        .footer-sale {
          margin-top: 8px;
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
            margin: 0;
            padding: 0;
            background: #fff;
          }


          .receipt-page {
            width: 80mm;
            min-height: 0;
            margin: 0;
            padding: 0;
          }


          .screen-controls {
            display: none !important;
          }


          .receipt {
            width: 80mm;
            max-width: none;
            margin: 0;
            padding: 3mm 4mm 4mm;
            box-shadow: none;
          }

        }

      `}</style>


    </main>

  )
}
