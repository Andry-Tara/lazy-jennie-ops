import {
  NextRequest,
} from 'next/server'

import {
  PDFDocument,
  StandardFonts,
  rgb,
} from 'pdf-lib'

import {
  loadSalesOnlyRevenueExport,
  RevenueExportError,
} from '@/lib/sales-only-revenue-export'


export const runtime =
  'nodejs'


function money(
  value: number
) {

  return (
    'Rp ' +
    new Intl.NumberFormat(
      'id-ID',
      {
        maximumFractionDigits:
          0,
      }
    ).format(
      value
    )
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

      day:
        '2-digit',

      month:
        'short',

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


function nowWib() {

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone:
        'Asia/Jakarta',

      day:
        '2-digit',

      month:
        'short',

      year:
        'numeric',

      hour:
        '2-digit',

      minute:
        '2-digit',

      second:
        '2-digit',
    }
  ).format(
    new Date()
  )

}


function cut(
  value: string,
  length: number
) {

  const clean =
    String(
      value ||
      ''
    )

  if (
    clean.length <=
    length
  ) {
    return clean
  }

  return (
    clean.slice(
      0,
      Math.max(
        length - 3,
        1
      )
    )
    + '...'
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


    const pdf =
      await PDFDocument.create()


    const regular =
      await pdf.embedFont(
        StandardFonts.Helvetica
      )


    const bold =
      await pdf.embedFont(
        StandardFonts.HelveticaBold
      )


    const PAGE_WIDTH =
      595.28

    const PAGE_HEIGHT =
      841.89

    const MARGIN =
      40


    let page =
      pdf.addPage([
        PAGE_WIDTH,
        PAGE_HEIGHT,
      ])


    let y =
      PAGE_HEIGHT -
      MARGIN


    const black =
      rgb(
        0.08,
        0.08,
        0.08
      )


    const gray =
      rgb(
        0.42,
        0.42,
        0.46
      )


    const light =
      rgb(
        0.94,
        0.94,
        0.95
      )


    const red =
      rgb(
        0.55,
        0.08,
        0.08
      )


    const green =
      rgb(
        0.02,
        0.45,
        0.20
      )


    function newPage() {

      page =
        pdf.addPage([
          PAGE_WIDTH,
          PAGE_HEIGHT,
        ])

      y =
        PAGE_HEIGHT -
        MARGIN

    }


    function ensure(
      height: number
    ) {

      if (
        y - height <
        55
      ) {
        newPage()
      }

    }


    function text(
      value: string,
      x: number,
      size = 10,
      font = regular,
      color = black
    ) {

      page.drawText(
        String(
          value
        ),
        {
          x,
          y,
          size,
          font,
          color,
        }
      )

    }


    function line(
      topGap = 8,
      bottomGap = 12
    ) {

      y -=
        topGap

      page.drawLine({
        start: {
          x:
            MARGIN,
          y,
        },

        end: {
          x:
            PAGE_WIDTH -
            MARGIN,
          y,
        },

        thickness:
          0.7,

        color:
          light,
      })

      y -=
        bottomGap

    }


    function section(
      title: string
    ) {

      ensure(
        35
      )

      text(
        title.toUpperCase(),
        MARGIN,
        9,
        bold,
        red
      )

      y -=
        18

    }


    // ======================================================
    // HEADER
    // ======================================================

    text(
      data.brandName.toUpperCase(),
      MARGIN,
      9,
      bold,
      red
    )

    y -=
      24


    text(
      'Reports & Revenue',
      MARGIN,
      22,
      bold,
      black
    )

    y -=
      20


    text(
      `${data.outlet.code} - ${data.outlet.name}`,
      MARGIN,
      9,
      regular,
      gray
    )

    y -=
      14


    text(
      `Period: ${data.filters.from} to ${data.filters.to}`,
      MARGIN,
      9,
      regular,
      gray
    )

    y -=
      14


    text(
      `Payment: ${data.filters.payment} | Order Type: ${data.filters.orderType}`,
      MARGIN,
      9,
      regular,
      gray
    )

    y -=
      14


    text(
      `Generated: ${nowWib()} WIB`,
      MARGIN,
      8,
      regular,
      gray
    )

    y -=
      6


    line(
      8,
      18
    )


    // ======================================================
    // KPI
    // ======================================================

    section(
      'Summary'
    )


    const cards =
      [
        [
          'Revenue',
          money(
            data.kpi.revenue
          ),
        ],

        [
          'Transactions',
          String(
            data.kpi.transactions
          ),
        ],

        [
          'Average Ticket',
          money(
            data.kpi.averageTicket
          ),
        ],

        [
          'Total Collected',
          money(
            data.kpi.totalCollected
          ),
        ],

        [
          'Dine In',
          String(
            data.kpi.dineIn
          ),
        ],

        [
          'Takeaway',
          String(
            data.kpi.takeaway
          ),
        ],

        [
          'Service',
          money(
            data.kpi.totalService
          ),
        ],

        [
          'Tax',
          money(
            data.kpi.totalTax
          ),
        ],
      ]


    const cardWidth =
      (
        PAGE_WIDTH -
        MARGIN * 2 -
        12
      ) / 2


    for (
      let i = 0;
      i < cards.length;
      i += 2
    ) {

      ensure(
        54
      )


      for (
        let col = 0;
        col < 2;
        col += 1
      ) {

        const card =
          cards[
            i + col
          ]


        if (!card) {
          continue
        }


        const x =
          MARGIN +
          col *
          (
            cardWidth +
            12
          )


        page.drawRectangle({
          x,
          y:
            y - 38,

          width:
            cardWidth,

          height:
            46,

          color:
            col === 0 &&
            i === 0
              ? black
              : rgb(
                  0.975,
                  0.975,
                  0.98
                ),

          borderColor:
            light,

          borderWidth:
            0.7,
        })


        page.drawText(
          card[0],
          {
            x:
              x + 10,

            y:
              y - 8,

            size:
              7,

            font:
              bold,

            color:
              col === 0 &&
              i === 0
                ? rgb(
                    0.75,
                    0.75,
                    0.78
                  )
                : gray,
          }
        )


        page.drawText(
          card[1],
          {
            x:
              x + 10,

            y:
              y - 28,

            size:
              13,

            font:
              bold,

            color:
              col === 0 &&
              i === 0
                ? rgb(
                    1,
                    1,
                    1
                  )
                : black,
          }
        )

      }


      y -=
        54

    }


    y -=
      8


    // ======================================================
    // PAYMENT MIX
    // ======================================================

    section(
      'Payment Mix'
    )


    if (
      data.paymentRows.length ===
      0
    ) {

      text(
        'No payment data.',
        MARGIN,
        9,
        regular,
        gray
      )

      y -=
        18

    } else {

      for (
        const row
        of data.paymentRows
      ) {

        ensure(
          20
        )


        text(
          row.method,
          MARGIN,
          9,
          bold
        )


        text(
          `${row.transactions} trx`,
          180,
          9,
          regular,
          gray
        )


        text(
          money(
            row.amount
          ),
          390,
          9,
          bold,
          green
        )


        y -=
          18

      }

    }


    y -=
      10


    // ======================================================
    // DAILY REVENUE
    // ======================================================

    section(
      'Daily Revenue'
    )


    for (
      const row
      of data.dailyRows
    ) {

      ensure(
        20
      )


      text(
        row.date,
        MARGIN,
        9,
        bold
      )


      text(
        `${row.transactions} trx`,
        180,
        9,
        regular,
        gray
      )


      text(
        money(
          row.revenue
        ),
        390,
        9,
        bold
      )


      y -=
        18

    }


    y -=
      10


    // ======================================================
    // TOP MENU
    // ======================================================

    section(
      'Top Menu'
    )


    text(
      'MENU',
      MARGIN,
      7,
      bold,
      gray
    )

    text(
      'CATEGORY',
      300,
      7,
      bold,
      gray
    )

    text(
      'QTY',
      420,
      7,
      bold,
      gray
    )

    text(
      'REVENUE',
      465,
      7,
      bold,
      gray
    )

    y -=
      16


    for (
      const row
      of data.topMenus
    ) {

      ensure(
        20
      )


      text(
        cut(
          row.name,
          38
        ),
        MARGIN,
        8,
        bold
      )


      text(
        cut(
          row.category,
          16
        ),
        300,
        8,
        regular,
        gray
      )


      text(
        String(
          row.quantity
        ),
        420,
        8,
        regular
      )


      text(
        money(
          row.revenue
        ),
        465,
        8,
        bold
      )


      y -=
        17

    }


    y -=
      12


    // ======================================================
    // TRANSACTION HISTORY
    // ======================================================

    section(
      'Transaction History'
    )


    function transactionHeader() {

      text(
        'DATE/TIME',
        MARGIN,
        6.5,
        bold,
        gray
      )

      text(
        'SALE',
        120,
        6.5,
        bold,
        gray
      )

      text(
        'ORDER',
        235,
        6.5,
        bold,
        gray
      )

      text(
        'TABLE',
        360,
        6.5,
        bold,
        gray
      )

      text(
        'PAY',
        408,
        6.5,
        bold,
        gray
      )

      text(
        'AMOUNT',
        470,
        6.5,
        bold,
        gray
      )

      y -=
        14

    }


    transactionHeader()


    for (
      const row
      of data.transactions
    ) {

      if (
        y <
        70
      ) {

        newPage()

        text(
          'Transaction History',
          MARGIN,
          12,
          bold,
          red
        )

        y -=
          22

        transactionHeader()

      }


      text(
        cut(
          jakartaDateTime(
            row.transactionDate
          ),
          20
        ),
        MARGIN,
        7.2,
        regular
      )


      text(
        cut(
          row.saleNo,
          20
        ),
        120,
        7.2,
        regular
      )


      text(
        cut(
          row.orderNo ||
          '-',
          21
        ),
        235,
        7.2,
        regular
      )


      text(
        cut(
          row.table ||
          '-',
          7
        ),
        360,
        7.2,
        regular
      )


      text(
        cut(
          row.payment,
          10
        ),
        408,
        7.2,
        bold
      )


      text(
        money(
          row.amount
        ),
        470,
        7.2,
        bold
      )


      y -=
        15

    }


    // ======================================================
    // FOOTERS
    // ======================================================

    const pages =
      pdf.getPages()


    pages.forEach(
      (
        currentPage,
        index
      ) => {

        currentPage.drawLine({
          start: {
            x:
              MARGIN,
            y:
              35,
          },

          end: {
            x:
              PAGE_WIDTH -
              MARGIN,
            y:
              35,
          },

          thickness:
            0.5,

          color:
            light,
        })


        currentPage.drawText(
          'Sales-Only Reporting - No Inventory / BOM / COGS',
          {
            x:
              MARGIN,

            y:
              20,

            size:
              6.5,

            font:
              regular,

            color:
              gray,
          }
        )


        currentPage.drawText(
          `Page ${index + 1} of ${pages.length}`,
          {
            x:
              PAGE_WIDTH -
              92,

            y:
              20,

            size:
              6.5,

            font:
              regular,

            color:
              gray,
          }
        )

      }
    )


    const bytes =
      await pdf.save()


    const filename =
      `Rangka-Revenue-${data.filters.from}-to-${data.filters.to}.pdf`


    return new Response(
      Buffer.from(
        bytes
      ),
      {
        headers: {
          'Content-Type':
            'application/pdf',

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
      'REVENUE PDF EXPORT ERROR',
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
        : 'Failed to generate PDF'


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
