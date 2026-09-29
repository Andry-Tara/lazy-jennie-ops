import {
  NextRequest,
} from 'next/server'

import {
  loadSalesOnlyRevenueExport,
  RevenueExportError,
} from '@/lib/sales-only-revenue-export'


export const runtime =
  'nodejs'


function csvCell(
  value:
    string |
    number |
    null |
    undefined
) {

  let text =
    String(
      value ??
      ''
    )


  // Excel formula-injection protection.
  if (
    /^[=+\-@]/.test(
      text
    )
  ) {
    text =
      `'${text}`
  }


  return (
    '"' +
    text.replace(
      /"/g,
      '""'
    ) +
    '"'
  )

}


function jakartaDateTime(
  value: string
) {

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone:
        'Asia/Jakarta',

      year:
        'numeric',

      month:
        '2-digit',

      day:
        '2-digit',

      hour:
        '2-digit',

      minute:
        '2-digit',

      second:
        '2-digit',
    }
  ).format(
    new Date(
      value
    )
  )

}


export async function GET(
  request: NextRequest
) {

  try {

    const url =
      new URL(
        request.url
      )


    const data =
      await loadSalesOnlyRevenueExport({
        from:
          url.searchParams.get(
            'from'
          ),

        to:
          url.searchParams.get(
            'to'
          ),

        payment:
          url.searchParams.get(
            'payment'
          ),

        orderType:
          url.searchParams.get(
            'orderType'
          ),
      })


    const rows:
      Array<
        Array<
          string |
          number
        >
      > =
      []


    rows.push([
      'Date / Time',
      'Sale No',
      'Order No',
      'Table',
      'Order Type',
      'Payment',
      'Amount',
    ])


    for (
      const row
      of data.transactions
    ) {

      rows.push([
        jakartaDateTime(
          row.transactionDate
        ),

        row.saleNo,

        row.orderNo ||
          '-',

        row.table ||
          '-',

        row.orderType,

        row.payment,

        row.amount,
      ])

    }


    const content =
      '\uFEFF' +
      rows
        .map(
          row =>
            row
              .map(
                csvCell
              )
              .join(
                ','
              )
        )
        .join(
          '\r\n'
        )


    const filename =
      `Rangka-Revenue-${data.filters.from}-to-${data.filters.to}.csv`


    return new Response(
      content,
      {
        headers: {
          'Content-Type':
            'text/csv; charset=utf-8',

          'Content-Disposition':
            `attachment; filename="${filename}"`,

          'Cache-Control':
            'private, no-store',
        },
      }
    )

  } catch (
    error
  ) {

    console.error(
      'REVENUE CSV EXPORT ERROR',
      error
    )


    const status =
      error instanceof
      RevenueExportError
        ? error.status
        : 500


    const message =
      error instanceof
      Error
        ? error.message
        : 'Failed to generate CSV'


    return Response.json(
      {
        error:
          message,
      },
      {
        status,
      }
    )

  }

}
