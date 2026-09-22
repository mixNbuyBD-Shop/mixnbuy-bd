/* =========================================================
   MIXNBUY.BD ADMIN
   Reports Module
   File: admin/js/reports.js
   ========================================================= */

let reportState = {
  startDate: "",
  endDate: "",

  sales: [],
  saleItems: [],

  purchases: [],

  returns: [],
  returnItems: [],

  orders: [],

  expenses: []
};


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  setDefaultDateRange();

  bindReportEvents();

  await generateReport();

});


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

function getReportsClient() {

  if (typeof window.getClient === "function") {
    return window.getClient();
  }

  if (window.supabaseClient) {
    return window.supabaseClient;
  }

  if (window.sb) {
    return window.sb;
  }

  return null;

}


/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


function money(value) {

  return "৳" + Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

}


function numberFormat(value) {

  return Number(value || 0).toLocaleString("en-BD");

}


function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function formatDate(value) {

  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

}


function dateKey(value) {

  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");

}


function toInputDate(date) {

  const d = new Date(date);

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");

}


function titleCase(value) {

  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, char => char.toUpperCase());

}


/* =========================================================
   DEFAULT DATE RANGE
   ========================================================= */

function setDefaultDateRange() {

  const today = new Date();

  const start = new Date(today);

  start.setDate(today.getDate() - 29);

  $("reportStartDate").value = toInputDate(start);

  $("reportEndDate").value = toInputDate(today);

}


/* =========================================================
   GET DATE RANGE
   ========================================================= */

function getDateRange() {

  const start = $("reportStartDate").value;

  const end = $("reportEndDate").value;


  if (!start || !end) {

    throw new Error(
      "Please select both dates."
    );

  }


  if (start > end) {

    throw new Error(
      "Start date cannot be after end date."
    );

  }


  return {

    start,

    end,

    startIso: `${start}T00:00:00.000Z`,

    endIso: `${end}T23:59:59.999Z`

  };

}


/* =========================================================
   EVENT BINDING
   ========================================================= */

function bindReportEvents() {

  $("generateReportBtn")?.addEventListener(
    "click",
    generateReport
  );


  $("refreshReportsBtn")?.addEventListener(
    "click",
    generateReport
  );


  $("exportReportBtn")?.addEventListener(
    "click",
    exportCSV
  );


  document
    .querySelectorAll(".report-preset")
    .forEach(button => {

      button.addEventListener("click", () => {

        applyPreset(button.dataset.range);

        generateReport();

      });

    });

}


/* =========================================================
   DATE PRESETS
   ========================================================= */

function applyPreset(range) {

  const today = new Date();

  let start = new Date(today);


  switch (range) {

    case "today":

      start = new Date(today);

      break;


    case "7":

      start.setDate(
        today.getDate() - 6
      );

      break;


    case "30":

      start.setDate(
        today.getDate() - 29
      );

      break;


    case "month":

      start = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      break;


    case "year":

      start = new Date(
        today.getFullYear(),
        0,
        1
      );

      break;

  }


  $("reportStartDate").value =
    toInputDate(start);


  $("reportEndDate").value =
    toInputDate(today);

}


/* =========================================================
   MAIN REPORT FUNCTION
   ========================================================= */

async function generateReport() {

  const client = getReportsClient();


  if (!client) {

    showError(
      "Supabase client is not initialized."
    );

    return;

  }


  try {

    const range = getDateRange();


    setLoading(true);


    reportState.startDate =
      range.start;


    reportState.endDate =
      range.end;


    /* -----------------------------------------------------
       LOAD MAIN REPORT DATA
       ----------------------------------------------------- */

    const [

      salesResult,

      purchasesResult,

      returnsResult,

      ordersResult,

      expensesResult

    ] = await Promise.all([


      /* SALES */

      client
        .from("sales")
        .select("*")
        .gte(
          "sale_date",
          range.startIso
        )
        .lte(
          "sale_date",
          range.endIso
        )
        .order(
          "sale_date",
          {
            ascending: true
          }
        )
        .limit(5000),


      /* PURCHASES */

      client
        .from("purchases")
        .select("*")
        .gte(
          "purchase_date",
          range.startIso
        )
        .lte(
          "purchase_date",
          range.endIso
        )
        .order(
          "purchase_date",
          {
            ascending: true
          }
        )
        .limit(5000),


      /* RETURNS */

      client
        .from("returns")
        .select("*")
        .gte(
          "return_date",
          range.startIso
        )
        .lte(
          "return_date",
          range.endIso
        )
        .order(
          "return_date",
          {
            ascending: true
          }
        )
        .limit(5000),


      /* ORDERS */

      client
        .from("orders")
        .select("*")
        .gte(
          "created_at",
          range.startIso
        )
        .lte(
          "created_at",
          range.endIso
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        )
        .limit(5000),


      /* EXPENSES */

      client
        .from("expenses")
        .select("*")
        .gte(
          "created_at",
          range.startIso
        )
        .lte(
          "created_at",
          range.endIso
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        )
        .limit(5000)

    ]);


    /* -----------------------------------------------------
       CHECK ERRORS
       ----------------------------------------------------- */

    const results = [

      salesResult,

      purchasesResult,

      returnsResult,

      ordersResult,

      expensesResult

    ];


    const failed =
      results.find(
        result => result.error
      );


    if (failed) {

      throw failed.error;

    }


    /* -----------------------------------------------------
       STORE DATA
       ----------------------------------------------------- */

    reportState.sales =
      salesResult.data || [];


    reportState.purchases =
      purchasesResult.data || [];


    reportState.returns =
      returnsResult.data || [];


    reportState.orders =
      ordersResult.data || [];


    reportState.expenses =
      expensesResult.data || [];


    /* -----------------------------------------------------
       LOAD RELATED DATA
       ----------------------------------------------------- */

    await loadRelatedItems(client);


    /* -----------------------------------------------------
       RENDER
       ----------------------------------------------------- */

    renderReport();


    setLoading(false);


  } catch (error) {

    console.error(
      "Reports load error:",
      error
    );


    setLoading(false);


    showError(
      error?.message ||
      "Failed to generate report."
    );

  }

}


/* =========================================================
   LOAD SALES ITEMS + RETURN ITEMS
   ========================================================= */

async function loadRelatedItems(client) {

  reportState.saleItems = [];

  reportState.returnItems = [];


  const saleIds =
    reportState.sales
      .map(row => row.id)
      .filter(Boolean);


  const returnIds =
    reportState.returns
      .map(row => row.id)
      .filter(Boolean);


  const tasks = [];


  /* -------------------------------------------------------
     SALES ITEMS
     ------------------------------------------------------- */

  if (saleIds.length) {

    tasks.push(

      client
        .from("sales_items")
        .select(`
          sale_id,
          quantity,
          purchase_price,
          selling_price,
          discount,
          total_amount,
          gross_profit
        `)
        .in(
          "sale_id",
          saleIds
        )
        .limit(10000)

        .then(({ data, error }) => {

          if (error) {
            throw error;
          }

          reportState.saleItems =
            data || [];

        })

    );

  }


  /* -------------------------------------------------------
     RETURN ITEMS
     ------------------------------------------------------- */

  if (returnIds.length) {

    tasks.push(

      client
        .from("return_items")
        .select(`
          return_id,
          refund_amount,
          profit_adjustment,
          quantity
        `)
        .in(
          "return_id",
          returnIds
        )
        .limit(10000)

        .then(({ data, error }) => {

          if (error) {
            throw error;
          }

          reportState.returnItems =
            data || [];

        })

    );

  }


  await Promise.all(tasks);

}


/* =========================================================
   FILTER COMPLETED SALES
   ========================================================= */

function completedSales() {

  return reportState.sales.filter(
    row =>
      String(row.status || "")
        .toLowerCase() === "completed"
  );

}


/* =========================================================
   FILTER COMPLETED PURCHASES
   ========================================================= */

function completedPurchases() {

  return reportState.purchases.filter(row => {

    const status =
      String(row.status || "")
        .toLowerCase();


    return [

      "completed",

      "complete",

      "received"

    ].includes(status);

  });

}


/* =========================================================
   FILTER COMPLETED RETURNS
   ========================================================= */

function completedReturns() {

  return reportState.returns.filter(

    row =>
      String(row.status || "")
        .toLowerCase() === "completed"

  );

}


/* =========================================================
   SUM
   ========================================================= */

function sum(rows, field) {

  return rows.reduce(

    (total, row) => {

      return total +
        Number(row[field] || 0);

    },

    0

  );

}


/* =========================================================
   RENDER COMPLETE REPORT
   ========================================================= */

function renderReport() {

  const sales =
    completedSales();


  const purchases =
    completedPurchases();


  const returns =
    completedReturns();


  /* -------------------------------------------------------
     SALES TOTAL
     ------------------------------------------------------- */

  const salesTotal =
    sum(
      sales,
      "total_amount"
    );


  /* -------------------------------------------------------
     PURCHASE TOTAL
     ------------------------------------------------------- */

  const purchaseTotal =
    sum(
      purchases,
      "total_amount"
    );


  /* -------------------------------------------------------
     RETURN TOTAL
     ------------------------------------------------------- */

  const returnTotal =
    sum(
      returns,
      "refund_amount"
    );


  /* -------------------------------------------------------
     GROSS PROFIT
     ------------------------------------------------------- */

  const grossProfit =
    reportState.saleItems.reduce(

      (total, item) => {

        return total +
          Number(
            item.gross_profit || 0
          );

      },

      0

    );


  /* -------------------------------------------------------
     RETURN PROFIT ADJUSTMENT
     ------------------------------------------------------- */

  const returnProfitAdjustment =
    reportState.returnItems.reduce(

      (total, item) => {

        return total +
          Number(
            item.profit_adjustment || 0
          );

      },

      0

    );


  /* -------------------------------------------------------
     EXPENSES
     ------------------------------------------------------- */

  const expenseTotal =
    reportState.expenses.reduce(

      (total, row) => {

        const amount =
          row.amount ??
          row.expense_amount ??
          row.total_amount ??
          0;


        return total +
          Number(amount || 0);

      },

      0

    );


  /* -------------------------------------------------------
     ADJUSTED GROSS PROFIT
     ------------------------------------------------------- */

  const adjustedGrossProfit =
    grossProfit -
    returnProfitAdjustment;


  /* -------------------------------------------------------
     NET PROFIT
     ------------------------------------------------------- */

  const netProfit =
    adjustedGrossProfit -
    expenseTotal;


  /* -------------------------------------------------------
     STAT CARDS
     ------------------------------------------------------- */

  $("totalSales").textContent =
    money(salesTotal);


  $("totalPurchases").textContent =
    money(purchaseTotal);


  $("totalOrders").textContent =
    numberFormat(
      reportState.orders.length
    );


  $("totalReturns").textContent =
    money(returnTotal);


  $("grossProfit").textContent =
    money(adjustedGrossProfit);


  $("totalExpenses").textContent =
    money(expenseTotal);


  $("netProfit").textContent =
    money(netProfit);


  /* -------------------------------------------------------
     CUSTOMER COUNT
     ------------------------------------------------------- */

  const customerIds =
    new Set(

      reportState.orders
        .map(
          row => row.customer_id
        )
        .filter(Boolean)

    );


  $("totalCustomers").textContent =
    numberFormat(
      customerIds.size
    );


  /* -------------------------------------------------------
     PERIOD LABEL
     ------------------------------------------------------- */

  $("salesPeriodLabel").textContent =

    `${formatDate(reportState.startDate)}
     - ${formatDate(reportState.endDate)}`;


  /* -------------------------------------------------------
     SALES SUMMARY
     ------------------------------------------------------- */

  renderSalesSummary({

    salesTotal,

    purchaseTotal,

    returnTotal,

    grossProfit:
      adjustedGrossProfit,

    expenseTotal,

    netProfit

  });


  /* -------------------------------------------------------
     ORDER SUMMARY
     ------------------------------------------------------- */

  renderOrderSummary();


  /* -------------------------------------------------------
     DAILY PERFORMANCE
     ------------------------------------------------------- */

  renderPerformance();

}


/* =========================================================
   SALES SUMMARY
   ========================================================= */

function renderSalesSummary(data) {

  const body =
    $("salesSummaryBody");


  const rows = [

    [
      "Sales Revenue",
      money(data.salesTotal)
    ],

    [
      "Purchase Value",
      money(data.purchaseTotal)
    ],

    [
      "Sales Returns",
      money(data.returnTotal)
    ],

    [
      "Adjusted Gross Profit",
      money(data.grossProfit)
    ],

    [
      "Operating Expenses",
      money(data.expenseTotal)
    ],

    [
      "Net Profit",
      money(data.netProfit)
    ]

  ];


  body.innerHTML =
    rows.map(
      ([label, value]) => `

        <tr>

          <td>
            ${escapeHtml(label)}
          </td>

          <td>
            <strong>
              ${escapeHtml(value)}
            </strong>
          </td>

        </tr>

      `
    ).join("");

}


/* =========================================================
   ORDER SUMMARY
   ========================================================= */

function renderOrderSummary() {

  const body =
    $("orderSummaryBody");


  const map =
    new Map();


  reportState.orders.forEach(order => {

    const status =
      String(
        order.status ||
        "unknown"
      ).toLowerCase();


    if (!map.has(status)) {

      map.set(
        status,
        {
          count: 0,
          amount: 0
        }
      );

    }


    const item =
      map.get(status);


    item.count += 1;


    item.amount +=
      Number(
        order.total_amount || 0
      );

  });


  if (!map.size) {

    body.innerHTML = `

      <tr>

        <td colspan="3">

          <div class="report-loading">

            No orders found.

          </div>

        </td>

      </tr>

    `;

    return;

  }


  body.innerHTML =

    [...map.entries()]

      .sort(
        (a, b) =>
          a[0].localeCompare(b[0])
      )

      .map(
        ([status, data]) => `

          <tr>

            <td>
              ${escapeHtml(
                titleCase(status)
              )}
            </td>

            <td>
              ${numberFormat(
                data.count
              )}
            </td>

            <td>
              ${money(
                data.amount
              )}
            </td>

          </tr>

        `
      )

      .join("");

}


/* =========================================================
   DAILY PERFORMANCE
   ========================================================= */

function renderPerformance() {

  const body =
    $("performanceTableBody");


  const map =
    new Map();


  function ensure(date) {

    if (!map.has(date)) {

      map.set(
        date,
        {
          sales: 0,
          purchases: 0,
          returns: 0,
          grossProfit: 0
        }
      );

    }


    return map.get(date);

  }


  /* -------------------------------------------------------
     SALES
     ------------------------------------------------------- */

  completedSales().forEach(row => {

    const key =
      dateKey(
        row.sale_date
      );


    if (!key) {
      return;
    }


    ensure(key).sales +=
      Number(
        row.total_amount || 0
      );

  });


  /* -------------------------------------------------------
     PURCHASES
     ------------------------------------------------------- */

  completedPurchases().forEach(row => {

    const key =
      dateKey(
        row.purchase_date
      );


    if (!key) {
      return;
    }


    ensure(key).purchases +=
      Number(
        row.total_amount || 0
      );

  });


  /* -------------------------------------------------------
     RETURNS
     ------------------------------------------------------- */

  completedReturns().forEach(row => {

    const key =
      dateKey(
        row.return_date
      );


    if (!key) {
      return;
    }


    ensure(key).returns +=
      Number(
        row.refund_amount || 0
      );

  });


  /* -------------------------------------------------------
     SALES ITEM PROFIT
     ------------------------------------------------------- */

  reportState.saleItems.forEach(item => {

    const sale =
      reportState.sales.find(
        sale =>
          sale.id === item.sale_id
      );


    if (!sale) {
      return;
    }


    const key =
      dateKey(
        sale.sale_date
      );


    if (!key) {
      return;
    }


    ensure(key).grossProfit +=
      Number(
        item.gross_profit || 0
      );

  });


  /* -------------------------------------------------------
     RETURN PROFIT ADJUSTMENT
     ------------------------------------------------------- */

  reportState.returnItems.forEach(item => {

    const returnedSale =
      reportState.returns.find(
        row =>
          row.id === item.return_id
      );


    if (!returnedSale) {
      return;
    }


    const key =
      dateKey(
        returnedSale.return_date
      );


    if (!key) {
      return;
    }


    ensure(key).grossProfit -=
      Number(
        item.profit_adjustment || 0
      );

  });


  /* -------------------------------------------------------
     SORT DATES
     ------------------------------------------------------- */

  const entries =
    [...map.entries()]
      .sort(
        (a, b) =>
          a[0].localeCompare(b[0])
      );


  if (!entries.length) {

    body.innerHTML = `

      <tr>

        <td colspan="6">

          <div class="report-loading">

            No report data found.

          </div>

        </td>

      </tr>

    `;

    return;

  }


  /* -------------------------------------------------------
     EXPENSES
     ------------------------------------------------------- */

  const expenseTotal =
    reportState.expenses.reduce(

      (total, row) => {

        return total +

          Number(

            row.amount ??
            row.expense_amount ??
            row.total_amount ??
            0

          );

      },

      0

    );


  const totalDays =
    entries.length || 1;


  const dailyExpense =
    expenseTotal /
    totalDays;


  /* -------------------------------------------------------
     RENDER
     ------------------------------------------------------- */

  body.innerHTML =

    entries.map(
      ([date, data]) => {

        const net =
          data.grossProfit -
          dailyExpense;


        return `

          <tr>

            <td>

              <strong>

                ${escapeHtml(
                  formatDate(date)
                )}

              </strong>

            </td>


            <td>
              ${money(data.sales)}
            </td>


            <td>
              ${money(data.purchases)}
            </td>


            <td>
              ${money(data.returns)}
            </td>


            <td>
              ${money(data.grossProfit)}
            </td>


            <td>

              <strong
                class="${
                  net >= 0
                    ? "report-profit"
                    : "report-loss"
                }"
              >

                ${money(net)}

              </strong>

            </td>

          </tr>

        `;

      }
    ).join("");

}


/* =========================================================
   CSV EXPORT
   ========================================================= */

function exportCSV() {

  const table =
    $("performanceTableBody");


  if (!table) {
    return;
  }


  const rows = [

    [
      "Date",
      "Sales",
      "Purchases",
      "Returns",
      "Gross Profit",
      "Net Profit"
    ]

  ];


  [
    ...table.querySelectorAll("tr")
  ].forEach(tr => {

    const cells =
      [
        ...tr.querySelectorAll("td")
      ];


    if (cells.length === 6) {

      rows.push(
        cells.map(
          cell =>
            cell.textContent.trim()
        )
      );

    }

  });


  if (rows.length === 1) {

    alert(
      "There is no report data to export."
    );

    return;

  }


  const csv =

    rows.map(row =>

      row.map(value =>

        `"${String(value)
          .replaceAll('"', '""')}"`

      ).join(",")

    ).join("\n");


  const blob =
    new Blob(

      ["\ufeff" + csv],

      {
        type:
          "text/csv;charset=utf-8;"
      }

    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");


  link.href = url;


  link.download =
    `MIXNBUY-Report-${reportState.startDate}-to-${reportState.endDate}.csv`;


  document.body.appendChild(link);


  link.click();


  link.remove();


  URL.revokeObjectURL(url);

}


/* =========================================================
   LOADING STATE
   ========================================================= */

function setLoading(loading) {

  const button =
    $("generateReportBtn");


  if (!button) {
    return;
  }


  button.disabled =
    loading;


  button.innerHTML =

    loading

      ? `

          <i class="bi bi-arrow-repeat report-spin"></i>

          Generating...

        `

      : `

          <i class="bi bi-file-earmark-bar-graph"></i>

          Generate Report

        `;

}


/* =========================================================
   ERROR MESSAGE
   ========================================================= */

function showError(message) {

  $("performanceTableBody").innerHTML = `

    <tr>

      <td colspan="6">

        <div class="report-loading">

          <i class="bi bi-exclamation-triangle"></i>

          <span>
            ${escapeHtml(message)}
          </span>

        </div>

      </td>

    </tr>

  `;

}


/* =========================================================
   PUBLIC API
   ========================================================= */

window.MIXNBUY_REPORTS = {

  generateReport,

  exportCSV,

  applyPreset

};