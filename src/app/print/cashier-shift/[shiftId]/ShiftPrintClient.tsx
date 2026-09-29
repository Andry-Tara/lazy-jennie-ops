'use client'

import {
  useEffect,
} from 'react'


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


function shiftDuration(
  start: any,
  end: any
) {

  if (
    !start ||
    !end
  ) {
    return '-'
  }


  const minutes =
    Math.max(
      0,
      Math.round(
        (
          new Date(
            end
          ).getTime() -
          new Date(
            start
          ).getTime()
        ) /
        60000
      )
    )


  const hours =
    Math.floor(
      minutes /
      60
    )


  const remaining =
    minutes %
    60


  if (
    hours ===
    0
  ) {
    return `${remaining} min`
  }


  return `${hours}h ${remaining}m`

}


function dt(
  value: any
) {

  if (!value) {
    return '-'
  }


  return new Intl.DateTimeFormat(
    'id-ID',
    {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }
  ).format(
    new Date(
      value
    )
  )

}


export default function ShiftPrintClient({
  shift,
  transactions,
  movements,
  format,
  autoPrint,
  generatedAt,
}: any) {

  useEffect(
    () => {

      if (!autoPrint) {
        return
      }


      const timer =
        window.setTimeout(
          () =>
            window.print(),
          350
        )


      return () =>
        window.clearTimeout(
          timer
        )

    },
    [
      autoPrint,
    ]
  )


  const variance =
    Number(
      shift.variance ||
      0
    )


  return (
    <main
      className={
        format ===
        'a4'
          ? 'print-page a4'
          : 'print-page thermal'
      }
    >

      <div className="controls">

        <button
          onClick={() =>
            window.print()
          }
        >
          PRINT
        </button>

      </div>


      <section className="sheet">

        <header>

          <h1>
            {
              shift.outlet_name
            }
          </h1>

          <h2>
            CASHIER CLOSING
          </h2>

          <p>
            {
              shift.shift_no
            }
          </p>

        </header>


        {/* CLOSING REPORT POLISH V2 */}

        {format ===
          'a4' && (

          <>

            <div className="a4-status-row">

              <div>

                <span className="status-badge">
                  {
                    shift.status
                  }
                </span>


                <span
                  className={
                    `balance-badge ${
                      variance === 0
                        ? 'balanced'
                        : 'variance'
                    }`
                  }
                >
                  {
                    variance === 0
                      ? 'BALANCED'
                      : variance > 0
                        ? 'CASH OVER'
                        : 'CASH SHORT'
                  }
                </span>

              </div>


              <div className="a4-generated">

                <p>
                  Outlet {
                    shift.outlet_code ||
                    '-'
                  }
                </p>

                <p>
                  Generated {
                    dt(
                      generatedAt
                    )
                  }
                </p>

              </div>

            </div>


            <div className="a4-metrics">

              <div>

                <small>
                  TOTAL SALES
                </small>

                <strong>
                  Rp {
                    amount(
                      shift.summary_total_sales
                    )
                  }
                </strong>

              </div>


              <div>

                <small>
                  TRANSACTIONS
                </small>

                <strong>
                  {
                    shift.summary_transaction_count
                  }
                </strong>

              </div>


              <div>

                <small>
                  VARIANCE
                </small>

                <strong>
                  Rp {
                    amount(
                      variance
                    )
                  }
                </strong>

              </div>

            </div>

          </>

        )}


        <div className="dash" />


        <div className="meta">

          <p>
            Cashier: {
              shift.cashier_email ||
              '-'
            }
          </p>

        </div>


        <div className="dash" />


        <h3>
          SHIFT PERIOD
        </h3>


        <Row
          label="Start Date"
          value={
            dt(
              shift.opened_at
            )
          }
        />


        <Row
          label="End Date"
          value={
            dt(
              shift.closed_at
            )
          }
        />


        <Row
          label="Duration"
          value={
            shiftDuration(
              shift.opened_at,
              shift.closed_at
            )
          }
        />


        <div className="dash" />


        <h3>
          SALES SUMMARY
        </h3>


        <Row
          label="Cash"
          value={
            amount(
              shift.summary_cash_sales
            )
          }
        />

        <Row
          label="QRIS"
          value={
            amount(
              shift.summary_qris_sales
            )
          }
        />

        <Row
          label="Card"
          value={
            amount(
              shift.summary_card_sales
            )
          }
        />

        <Row
          label="Transfer"
          value={
            amount(
              shift.summary_transfer_sales
            )
          }
        />


        <Row
          label="Total Sales"
          value={
            amount(
              shift.summary_total_sales
            )
          }
          strong
        />


        <Row
          label="Transactions"
          value={
            String(
              shift.summary_transaction_count
            )
          }
        />


        <div className="dash" />


        <h3>
          CASH RECONCILIATION
        </h3>


        <Row
          label="Opening Cash"
          value={
            amount(
              shift.opening_cash
            )
          }
        />

        <Row
          label="+ Cash Sales"
          value={
            amount(
              shift.summary_cash_sales
            )
          }
        />

        <Row
          label="+ Cash In"
          value={
            amount(
              shift.summary_cash_in
            )
          }
        />

        <Row
          label="- Cash Out"
          value={
            amount(
              shift.summary_cash_out
            )
          }
        />


        <Row
          label="Expected Cash"
          value={
            amount(
              shift.summary_expected_cash
            )
          }
          strong
        />


        <Row
          label="Actual Cash"
          value={
            amount(
              shift.actual_cash
            )
          }
          strong
        />


        <Row
          label="Variance"
          value={
            amount(
              variance
            )
          }
          strong
        />


        <p className="variance-status">
          {
            variance ===
            0
              ? 'BALANCED'
              : variance >
                0
                ? 'CASH OVER'
                : 'CASH SHORT'
          }
        </p>


        {format ===
          'a4' && (

          <>

            <div className="dash" />


            <h3>
              TRANSACTIONS
            </h3>


            <table>

              <thead>
                <tr>
                  <th>Time</th>
                  <th>Sale</th>
                  <th>Order</th>
                  <th>Table</th>
                  <th>Type</th>
                  <th>Payment</th>
                  <th>Amount</th>
                </tr>
              </thead>


              <tbody>

                {transactions.map(
                  (
                    row: any
                  ) => (

                    <tr
                      key={
                        row.sale_id
                      }
                    >

                      <td>
                        {
                          new Intl.DateTimeFormat(
                            'id-ID',
                            {
                              timeZone:
                                'Asia/Jakarta',

                              hour:
                                '2-digit',

                              minute:
                                '2-digit',

                              hour12:
                                false,
                            }
                          ).format(
                            new Date(
                              row.posted_at
                            )
                          )
                        }
                      </td>


                      <td>
                        {
                          row.sale_no
                        }
                      </td>


                      <td>
                        {
                          row.order_no ||
                          '-'
                        }
                      </td>


                      <td>
                        {
                          row.table_code ||
                          '-'
                        }
                      </td>


                      <td>
                        {
                          row.order_type ||
                          '-'
                        }
                      </td>


                      <td>
                        {
                          row.payment_method
                        }
                      </td>


                      <td>
                        {
                          amount(
                            row.grand_total
                          )
                        }
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </>

        )}


        {movements.length >
          0 && (

          <>

            <div className="dash" />


            <h3>
              CASH MOVEMENTS
            </h3>


            {movements.map(
              (
                row: any
              ) => (

                <div
                  key={
                    row.id
                  }
                  className="movement"
                >

                  <Row
                    label={
                      row.movement_type
                    }
                    value={
                      amount(
                        row.amount
                      )
                    }
                  />

                  <p>
                    {
                      row.reason
                    }
                  </p>

                </div>

              )
            )}

          </>

        )}


        {shift.closing_notes && (

          <>

            <div className="dash" />

            <h3>
              NOTES
            </h3>

            <p>
              {
                shift.closing_notes
              }
            </p>

          </>

        )}


        <div className="dash" />


        {format ===
          'a4' && (

          <div className="signatures">

            <div>

              <p className="signature-title">
                Cashier
              </p>

              <div className="signature-space" />

              <strong>
                {
                  shift.cashier_email ||
                  '________________'
                }
              </strong>

            </div>


            <div>

              <p className="signature-title">
                Checked By
              </p>

              <div className="signature-space" />

              <strong>
                ____________________
              </strong>

            </div>

          </div>

        )}


        <footer>

          <strong>
            SHIFT CLOSED
          </strong>

          <p>
            {
              shift.shift_no
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
          background: #f4f4f5;
          color: #111;
        }

        .print-page {
          min-height: 100vh;
          padding: 24px;
          font-family:
            Arial,
            sans-serif;
        }

        .controls {
          margin: 0 auto 16px;
        }

        .controls button {
          border: 0;
          border-radius: 8px;
          background: #111;
          color: white;
          padding: 10px 18px;
          font-weight: 700;
          cursor: pointer;
        }

        .sheet {
          background: white;
          margin: 0 auto;
        }

        .thermal .controls,
        .thermal .sheet {
          width: 80mm;
        }

        .thermal .sheet {
          padding: 4mm;
          font-family:
            "Courier New",
            monospace;
          font-size: 11px;
        }

        .a4 .controls,
        .a4 .sheet {
          width: 210mm;
        }

        .a4 .sheet {
          min-height: 297mm;
          padding: 15mm;
          font-size: 12px;
        }

        .a4-status-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-top: 18px;
        }

        .status-badge,
        .balance-badge {
          display: inline-block;
          margin-right: 7px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
        }

        .status-badge {
          background: #f4f4f5;
          color: #3f3f46;
        }

        .balance-badge.balanced {
          background: #dcfce7;
          color: #166534;
        }

        .balance-badge.variance {
          background: #fee2e2;
          color: #991b1b;
        }

        .a4-generated {
          text-align: right;
          color: #71717a;
          font-size: 10px;
        }

        .a4-generated p {
          margin: 2px 0;
        }

        .a4-metrics {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 10px;
          margin-top: 16px;
        }

        .a4-metrics > div {
          border: 1px solid #e4e4e7;
          border-radius: 10px;
          padding: 12px;
        }

        .a4-metrics small {
          display: block;
          color: #71717a;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .08em;
        }

        .a4-metrics strong {
          display: block;
          margin-top: 5px;
          font-size: 16px;
        }

        .signatures {
          display: grid;
          grid-template-columns:
            repeat(2, 1fr);
          gap: 90px;
          margin-top: 36px;
          padding-top: 20px;
          border-top: 1px solid #e4e4e7;
          text-align: center;
        }

        .signature-title {
          font-weight: 700;
        }

        .signature-space {
          height: 55px;
        }

        header {
          text-align: center;
        }

        h1 {
          margin: 0;
          font-size: 18px;
        }

        h2 {
          margin: 7px 0 3px;
          font-size: 14px;
        }

        h3 {
          margin: 10px 0 6px;
          font-size: 11px;
        }

        p {
          margin: 3px 0;
        }

        .dash {
          margin: 10px 0;
          border-top: 1px dashed #111;
        }

        .row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin: 4px 0;
        }

        .row.strong {
          margin-top: 7px;
          padding-top: 7px;
          border-top: 1px solid #111;
          font-weight: 900;
        }

        .variance-status {
          margin-top: 7px;
          text-align: center;
          font-weight: 900;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }

        th,
        td {
          border-bottom: 1px solid #ddd;
          padding: 7px;
          text-align: left;
        }

        td:last-child,
        th:last-child {
          text-align: right;
        }

        .movement p {
          font-size: 9px;
          opacity: .7;
        }

        footer {
          text-align: center;
          margin-top: 10px;
        }

        /* A4 PRINT SCALE FIX */

        @media print {

          .controls {
            display: none;
          }

          .print-page {
            padding: 0;
          }

          .sheet {
            box-shadow: none;
          }

          .thermal .sheet {
            width: 80mm;
            margin: 0;
          }

          .a4 {
            width: auto !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .a4 .sheet {
            width: 100% !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }

        }

        @page {
          margin: 10mm;
        }
      `}</style>

    
      {/* A4 ONE PAGE COMPACT FIX */}

      {format === 'a4' && (
        <style>{`
          @page {
            size: A4 portrait;
            margin: 5mm;
          }

          @media print {
            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }

            .print-page.a4 {
              width: auto !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            .a4 .sheet {
              width: 100% !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              font-size: 10px !important;
              line-height: 1.25 !important;
            }

            .a4 header {
              margin: 0 0 3px !important;
            }

            .a4 header h1 {
              margin: 0 !important;
              font-size: 18px !important;
              line-height: 1.1 !important;
            }

            .a4 header h2 {
              margin: 3px 0 2px !important;
              font-size: 12px !important;
            }

            .a4 header p {
              margin: 1px 0 !important;
            }

            .a4 .a4-status-row {
              margin-top: 6px !important;
            }

            .a4 .a4-metrics {
              gap: 6px !important;
              margin-top: 7px !important;
            }

            .a4 .a4-metrics > div {
              padding: 7px !important;
            }

            .a4 .a4-metrics strong {
              margin-top: 2px !important;
              font-size: 13px !important;
            }

            .a4 .dash {
              margin: 5px 0 !important;
            }

            .a4 h3 {
              margin: 5px 0 3px !important;
              font-size: 9.5px !important;
            }

            .a4 .row {
              margin: 1px 0 !important;
            }

            .a4 .row.strong {
              margin-top: 3px !important;
              padding-top: 3px !important;
            }

            .a4 .variance-status {
              margin: 3px 0 !important;
            }

            .a4 table {
              margin-top: 3px !important;
              font-size: 9px !important;
            }

            .a4 th,
            .a4 td {
              padding: 3px 3px !important;
            }

            .a4 .signatures {
              gap: 60px !important;
              margin-top: 8px !important;
              padding-top: 6px !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .a4 .signature-space {
              height: 16px !important;
            }

            .a4 .signature-title {
              margin: 0 !important;
            }

            .a4 footer {
              margin-top: 4px !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .a4 footer p {
              margin: 1px 0 !important;
            }
          }
        `}</style>
      )}

</main>
  )
}


function Row({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {

  return (
    <div
      className={
        `row ${
          strong
            ? 'strong'
            : ''
        }`
      }
    >
      <span>
        {label}
      </span>

      <span>
        {value}
      </span>
    </div>
  )
}
