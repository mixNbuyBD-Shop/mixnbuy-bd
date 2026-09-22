/* =========================================================
   MIXNBUY.BD
   PROFIT / LOSS
   ========================================================= */

"use strict";


/* =========================================================
   STATE
   ========================================================= */

const profitLossState = {

    startDate: null,

    endDate: null,

    sales: [],

    saleItems: [],

    returns: [],

    returnItems: [],

    expenses: [],

    daily: [],

    products: [],

    expenseGroups: {},

    chart: null

};


/* =========================================================
   CLIENT
   ========================================================= */

function getProfitLossClient() {

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
   DOM
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   NUMBER HELPERS
   ========================================================= */

function num(value) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}


function money(value) {

    return `৳${num(value).toLocaleString("en-BD", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}


function percent(value) {

    return `${num(value).toFixed(2)}%`;
}


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   DATE HELPERS
   ========================================================= */

function formatDateInput(date) {

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function startOfDay(date) {

    const d = new Date(date);

    d.setHours(
        0,
        0,
        0,
        0
    );

    return d;
}


function endOfDay(date) {

    const d = new Date(date);

    d.setHours(
        23,
        59,
        59,
        999
    );

    return d;
}


function formatDisplayDate(dateValue) {

    if (!dateValue) {
        return "-";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function formatShortDate(dateValue) {

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short"
        }
    );
}


/* =========================================================
   DEFAULT RANGE
   ========================================================= */

function setDefaultRange() {

    const end = new Date();

    const start = new Date();

    start.setDate(
        start.getDate() - 29
    );

    $("profitLossStartDate").value =
        formatDateInput(start);

    $("profitLossEndDate").value =
        formatDateInput(end);

    profitLossState.startDate =
        formatDateInput(start);

    profitLossState.endDate =
        formatDateInput(end);
}


/* =========================================================
   GET RANGE
   ========================================================= */

function getSelectedRange() {

    const start =
        $("profitLossStartDate").value;

    const end =
        $("profitLossEndDate").value;

    if (!start || !end) {

        throw new Error(
            "Please select start date and end date."
        );
    }

    if (start > end) {

        throw new Error(
            "Start date cannot be greater than end date."
        );
    }

    return {
        start,
        end
    };
}


/* =========================================================
   LOADING
   ========================================================= */

function setLoading(show) {

    const overlay =
        $("profitLossLoading");

    if (!overlay) {
        return;
    }

    overlay.classList.toggle(
        "show",
        Boolean(show)
    );
}


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(
    title,
    text,
    type = "info"
) {

    const overlay =
        $("profitLossMessage");

    if (!overlay) {
        return;
    }

    $("profitLossMessageTitle").textContent =
        title;

    $("profitLossMessageText").textContent =
        text;

    const icon =
        $("profitLossMessageIcon");

    if (icon) {

        icon.className =
            type === "error"
                ? "bi bi-exclamation-triangle-fill"
                : "bi bi-info-circle-fill";
    }

    overlay.classList.add("show");
}


function hideMessage() {

    const overlay =
        $("profitLossMessage");

    if (overlay) {
        overlay.classList.remove("show");
    }
}


/* =========================================================
   LOAD DATA
   ========================================================= */

async function loadProfitLossData() {

    const client =
        getProfitLossClient();

    if (!client) {

        throw new Error(
            "Supabase client is not initialized."
        );
    }


    const {
        start,
        end
    } = getSelectedRange();


    profitLossState.startDate = start;

    profitLossState.endDate = end;


    const startDateTime =
        `${start}T00:00:00`;

    const endDateTime =
        `${end}T23:59:59`;


    /*
     * SALES
     */

    const salesResult =
        await client
            .from("sales")
            .select("*")
            .gte(
                "sale_date",
                startDateTime
            )
            .lte(
                "sale_date",
                endDateTime
            )
            .order(
                "sale_date",
                {
                    ascending: true
                }
            );


    if (salesResult.error) {
        throw salesResult.error;
    }


    profitLossState.sales =
        Array.isArray(salesResult.data)
            ? salesResult.data
            : [];


    /*
     * SALES ITEMS
     */

    const saleIds =
        profitLossState.sales
            .map(row => row.id)
            .filter(Boolean);


    if (saleIds.length) {

        const saleItemsResult =
            await client
                .from("sales_items")
                .select(`
                    id,
                    sale_id,
                    product_id,
                    product_name,
                    sku,
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
                );


        if (saleItemsResult.error) {
            throw saleItemsResult.error;
        }


        profitLossState.saleItems =
            Array.isArray(
                saleItemsResult.data
            )
                ? saleItemsResult.data
                : [];

    } else {

        profitLossState.saleItems = [];

    }


    /*
     * RETURNS
     */

    const returnsResult =
        await client
            .from("returns")
            .select("*")
            .gte(
                "return_date",
                startDateTime
            )
            .lte(
                "return_date",
                endDateTime
            )
            .order(
                "return_date",
                {
                    ascending: true
                }
            );


    if (returnsResult.error) {
        throw returnsResult.error;
    }


    profitLossState.returns =
        Array.isArray(returnsResult.data)
            ? returnsResult.data
            : [];


    /*
     * RETURN ITEMS
     */

    const returnIds =
        profitLossState.returns
            .map(row => row.id)
            .filter(Boolean);


    if (returnIds.length) {

        const returnItemsResult =
            await client
                .from("return_items")
                .select(`
                    id,
                    return_id,
                    product_id,
                    product_name,
                    quantity,
                    purchase_price,
                    selling_price,
                    refund_amount,
                    profit_adjustment
                `)
                .in(
                    "return_id",
                    returnIds
                );


        if (returnItemsResult.error) {
            throw returnItemsResult.error;
        }


        profitLossState.returnItems =
            Array.isArray(
                returnItemsResult.data
            )
                ? returnItemsResult.data
                : [];

    } else {

        profitLossState.returnItems = [];

    }


    /*
     * EXPENSES
     */

    const expensesResult =
        await client
            .from("expenses")
            .select("*")
            .gte(
                "created_at",
                startDateTime
            )
            .lte(
                "created_at",
                endDateTime
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (expensesResult.error) {

        /*
         * Some installations may use
         * expense_date instead of created_at.
         */

        const fallback =
            await client
                .from("expenses")
                .select("*")
                .gte(
                    "expense_date",
                    startDate
                )
                .lte(
                    "expense_date",
                    end
                )
                .order(
                    "expense_date",
                    {
                        ascending: true
                    }
                );


        if (fallback.error) {

            console.warn(
                "Expenses could not be loaded:",
                expensesResult.error
            );

            profitLossState.expenses = [];

        } else {

            profitLossState.expenses =
                Array.isArray(fallback.data)
                    ? fallback.data
                    : [];
        }

    } else {

        profitLossState.expenses =
            Array.isArray(
                expensesResult.data
            )
                ? expensesResult.data
                : [];

    }

}


/* =========================================================
   COMPLETED SALES
   ========================================================= */

function getCompletedSales() {

    return profitLossState.sales.filter(
        sale =>
            String(
                sale.status || ""
            ).toLowerCase() === "completed"
    );

}


/* =========================================================
   RETURN AMOUNT
   ========================================================= */

function getReturnAmount() {

    return profitLossState.returns
        .filter(
            row =>
                String(
                    row.status || ""
                ).toLowerCase() === "completed"
        )
        .reduce(
            (
                total,
                row
            ) => {

                return total +
                    num(
                        row.refund_amount
                    );

            },
            0
        );

}


/* =========================================================
   SALES TOTAL
   ========================================================= */

function getGrossSales() {

    return getCompletedSales()
        .reduce(
            (
                total,
                row
            ) => {

                return total +
                    num(
                        row.total_amount
                    );

            },
            0
        );

}


/* =========================================================
   COGS
   ========================================================= */

function getCogs() {

    const completedSaleIds =
        new Set(
            getCompletedSales()
                .map(row => row.id)
        );


    return profitLossState.saleItems
        .filter(
            item =>
                completedSaleIds.has(
                    item.sale_id
                )
        )
        .reduce(
            (
                total,
                item
            ) => {

                return total +
                    (
                        num(item.quantity) *
                        num(item.purchase_price)
                    );

            },
            0
        );

}


/* =========================================================
   SALES ITEM NET
   ========================================================= */

function getItemSalesTotal() {

    const completedSaleIds =
        new Set(
            getCompletedSales()
                .map(row => row.id)
        );


    return profitLossState.saleItems
        .filter(
            item =>
                completedSaleIds.has(
                    item.sale_id
                )
        )
        .reduce(
            (
                total,
                item
            ) => {

                return total +
                    num(
                        item.total_amount
                    );

            },
            0
        );

}


/* =========================================================
   GROSS PROFIT
   ========================================================= */

function getGrossProfit() {

    const completedSaleIds =
        new Set(
            getCompletedSales()
                .map(row => row.id)
        );


    const directProfit =
        profitLossState.saleItems
            .filter(
                item =>
                    completedSaleIds.has(
                        item.sale_id
                    )
            )
            .reduce(
                (
                    total,
                    item
                ) => {

                    return total +
                        num(
                            item.gross_profit
                        );

                },
                0
            );


    /*
     * Returns reduce profit.
     */

    const returnProfitAdjustment =
        profitLossState.returnItems
            .filter(
                item => {

                    const returnHeader =
                        profitLossState.returns
                            .find(
                                row =>
                                    row.id ===
                                    item.return_id
                            );

                    return returnHeader &&
                        String(
                            returnHeader.status || ""
                        ).toLowerCase() ===
                        "completed";

                }
            )
            .reduce(
                (
                    total,
                    item
                ) => {

                    return total +
                        num(
                            item.profit_adjustment
                        );

                },
                0
            );


    return directProfit -
        returnProfitAdjustment;

}


/* =========================================================
   EXPENSE AMOUNT
   ========================================================= */

function getExpenseAmount(row) {

    return num(
        row.amount ??
        row.expense_amount ??
        row.total_amount ??
        row.value
    );

}


/* =========================================================
   EXPENSE TOTAL
   ========================================================= */

function getExpensesTotal() {

    return profitLossState.expenses
        .reduce(
            (
                total,
                row
            ) => {

                return total +
                    getExpenseAmount(row);

            },
            0
        );

}


/* =========================================================
   EXPENSE CATEGORY
   ========================================================= */

function getExpenseCategory(row) {

    return String(
        row.category ??
        row.expense_category ??
        row.type ??
        row.name ??
        "Other"
    ).trim() || "Other";

}


/* =========================================================
   CALCULATE
   ========================================================= */

function calculateProfitLoss() {

    const grossSales =
        getGrossSales();

    const returns =
        getReturnAmount();

    const netSales =
        Math.max(
            grossSales - returns,
            0
        );

    const cogs =
        getCogs();

    const grossProfit =
        getGrossProfit();

    const expenses =
        getExpensesTotal();

    const netProfit =
        grossProfit - expenses;

    const grossMargin =
        netSales > 0
            ? (
                grossProfit /
                netSales
            ) * 100
            : 0;

    const netMargin =
        netSales > 0
            ? (
                netProfit /
                netSales
            ) * 100
            : 0;


    return {
        grossSales,
        returns,
        netSales,
        cogs,
        grossProfit,
        expenses,
        netProfit,
        grossMargin,
        netMargin
    };

}


/* =========================================================
   KPI RENDER
   ========================================================= */

function renderKpis() {

    const data =
        calculateProfitLoss();


    $("plNetSales").textContent =
        money(data.netSales);

    $("plCogs").textContent =
        money(data.cogs);

    $("plGrossProfit").textContent =
        money(data.grossProfit);

    $("plGrossMargin").textContent =
        percent(data.grossMargin);

    $("plReturns").textContent =
        money(data.returns);

    $("plExpenses").textContent =
        money(data.expenses);

    $("plNetProfit").textContent =
        money(data.netProfit);

    $("plNetMargin").textContent =
        percent(data.netMargin);


    const netCard =
        document.querySelector(
            ".pl-kpi-card.net"
        );


    if (netCard) {

        netCard.classList.toggle(
            "is-loss",
            data.netProfit < 0
        );
    }

}


/* =========================================================
   STATEMENT
   ========================================================= */

function renderStatement() {

    const data =
        calculateProfitLoss();


    $("statementGrossSales").textContent =
        money(data.grossSales);

    $("statementReturns").textContent =
        money(data.returns);

    $("statementNetSales").textContent =
        money(data.netSales);

    $("statementCogs").textContent =
        money(data.cogs);

    $("statementGrossProfit").textContent =
        money(data.grossProfit);

    $("statementExpenses").textContent =
        money(data.expenses);

    $("statementNetProfit").textContent =
        money(data.netProfit);


    const finalRow =
        document.querySelector(
            ".pl-statement-row.final"
        );


    if (finalRow) {

        finalRow.classList.toggle(
            "loss",
            data.netProfit < 0
        );
    }

}


/* =========================================================
   EXPENSE BREAKDOWN
   ========================================================= */

function renderExpenseBreakdown() {

    const container =
        $("expenseBreakdown");


    const groups = {};


    profitLossState.expenses
        .forEach(
            row => {

                const category =
                    getExpenseCategory(row);

                groups[category] =
                    (
                        groups[category] || 0
                    ) +
                    getExpenseAmount(row);

            }
        );


    profitLossState.expenseGroups =
        groups;


    const entries =
        Object.entries(groups)
            .sort(
                (
                    a,
                    b
                ) =>
                    b[1] - a[1]
            );


    if (!entries.length) {

        container.innerHTML = `
            <div class="pl-empty-state">
                <i class="bi bi-bar-chart"></i>
                <span>No expense data</span>
            </div>
        `;

        return;
    }


    const total =
        entries.reduce(
            (
                sum,
                item
            ) =>
                sum + item[1],
            0
        );


    container.innerHTML =
        entries
            .map(
                (
                    [
                        name,
                        value
                    ]
                ) => {

                    const width =
                        total > 0
                            ? (
                                value /
                                total
                            ) * 100
                            : 0;


                    return `
                        <div class="pl-expense-item">

                            <div class="pl-expense-top">

                                <span class="pl-expense-name">
                                    ${escapeHtml(name)}
                                </span>

                                <span class="pl-expense-value">
                                    ${money(value)}
                                </span>

                            </div>

                            <div class="pl-expense-track">

                                <div
                                    class="pl-expense-bar"
                                    style="width:${Math.min(width, 100)}%"
                                ></div>

                            </div>

                        </div>
                    `;

                }
            )
            .join("");

}


/* =========================================================
   DATE LIST
   ========================================================= */

function getDateList() {

    const result = [];

    const start =
        new Date(
            `${profitLossState.startDate}T00:00:00`
        );

    const end =
        new Date(
            `${profitLossState.endDate}T00:00:00`
        );


    const cursor =
        new Date(start);


    while (
        cursor <= end
    ) {

        result.push(
            formatDateInput(cursor)
        );

        cursor.setDate(
            cursor.getDate() + 1
        );
    }


    return result;

}


/* =========================================================
   DAILY DATA
   ========================================================= */

function buildDailyData() {

    const dates =
        getDateList();


    const completedSales =
        getCompletedSales();


    const completedSaleIds =
        new Set(
            completedSales.map(
                row => row.id
            )
        );


    const dailyMap = {};


    dates.forEach(
        date => {

            dailyMap[date] = {

                sales: 0,

                cogs: 0,

                grossProfit: 0,

                returns: 0,

                expenses: 0,

                netProfit: 0

            };

        }
    );


    /*
     * SALES
     */

    completedSales.forEach(
        sale => {

            const date =
                formatDateInput(
                    new Date(
                        sale.sale_date
                    )
                );


            if (!dailyMap[date]) {
                return;
            }


            dailyMap[date].sales +=
                num(
                    sale.total_amount
                );

        }
    );


    /*
     * SALE ITEMS
     */

    profitLossState.saleItems
        .filter(
            item =>
                completedSaleIds.has(
                    item.sale_id
                )
        )
        .forEach(
            item => {

                const sale =
                    completedSales.find(
                        row =>
                            row.id ===
                            item.sale_id
                    );


                if (!sale) {
                    return;
                }


                const date =
                    formatDateInput(
                        new Date(
                            sale.sale_date
                        )
                    );


                if (!dailyMap[date]) {
                    return;
                }


                dailyMap[date].cogs +=
                    num(item.quantity) *
                    num(item.purchase_price);


                dailyMap[date].grossProfit +=
                    num(
                        item.gross_profit
                    );

            }
        );


    /*
     * RETURNS
     */

    profitLossState.returns
        .filter(
            row =>
                String(
                    row.status || ""
                ).toLowerCase() ===
                "completed"
        )
        .forEach(
            row => {

                const date =
                    formatDateInput(
                        new Date(
                            row.return_date
                        )
                    );


                if (!dailyMap[date]) {
                    return;
                }


                dailyMap[date].returns +=
                    num(
                        row.refund_amount
                    );

            }
        );


    /*
     * EXPENSES
     */

    profitLossState.expenses
        .forEach(
            row => {

                const rawDate =
                    row.created_at ??
                    row.expense_date ??
                    row.date;


                if (!rawDate) {
                    return;
                }


                const date =
                    formatDateInput(
                        new Date(rawDate)
                    );


                if (!dailyMap[date]) {
                    return;
                }


                dailyMap[date].expenses +=
                    getExpenseAmount(row);

            }
        );


    /*
     * NET
     */

    Object.values(
        dailyMap
    ).forEach(
        day => {

            day.netProfit =
                day.grossProfit -
                day.expenses;

        }
    );


    profitLossState.daily =
        dates.map(
            date => ({
                date,
                ...dailyMap[date]
            })
        );


    return profitLossState.daily;

}


/* =========================================================
   DAILY TABLE
   ========================================================= */

function renderDailyTable() {

    const body =
        $("dailyProfitLossBody");


    const daily =
        buildDailyData();


    if (!daily.length) {

        body.innerHTML = `
            <tr>
                <td colspan="8" class="table-loading">
                    No data found
                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML =
        daily
            .map(
                day => {

                    const margin =
                        day.sales > 0
                            ? (
                                day.netProfit /
                                day.sales
                            ) * 100
                            : 0;


                    const profitClass =
                        day.netProfit >= 0
                            ? "profit"
                            : "loss";


                    return `
                        <tr>

                            <td>
                                ${formatDisplayDate(day.date)}
                            </td>

                            <td class="money">
                                ${money(day.sales)}
                            </td>

                            <td class="money">
                                ${money(day.cogs)}
                            </td>

                            <td class="money profit">
                                ${money(day.grossProfit)}
                            </td>

                            <td class="money">
                                ${money(day.returns)}
                            </td>

                            <td class="money">
                                ${money(day.expenses)}
                            </td>

                            <td class="money ${profitClass}">
                                ${money(day.netProfit)}
                            </td>

                            <td class="margin">
                                ${percent(margin)}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


/* =========================================================
   PRODUCT PROFITABILITY
   ========================================================= */

function buildProductProfitability() {

    const completedSaleIds =
        new Set(
            getCompletedSales()
                .map(row => row.id)
        );


    const map = {};


    profitLossState.saleItems
        .filter(
            item =>
                completedSaleIds.has(
                    item.sale_id
                )
        )
        .forEach(
            item => {

                const key =
                    item.product_id ||
                    item.product_name ||
                    item.sku ||
                    "unknown";


                if (!map[key]) {

                    map[key] = {

                        productId:
                            item.product_id,

                        name:
                            item.product_name ||
                            "Unknown Product",

                        sku:
                            item.sku ||
                            "",

                        quantity: 0,

                        sales: 0,

                        cost: 0,

                        profit: 0

                    };

                }


                map[key].quantity +=
                    num(
                        item.quantity
                    );


                map[key].sales +=
                    num(
                        item.total_amount
                    );


                map[key].cost +=
                    num(item.quantity) *
                    num(item.purchase_price);


                map[key].profit +=
                    num(
                        item.gross_profit
                    );

            }
        );


    return Object.values(map)
        .sort(
            (
                a,
                b
            ) =>
                b.profit - a.profit
        );

}


/* =========================================================
   PRODUCT TABLE
   ========================================================= */

function renderProductProfitability() {

    const body =
        $("productProfitabilityBody");


    const products =
        buildProductProfitability();


    profitLossState.products =
        products;


    if (!products.length) {

        body.innerHTML = `
            <tr>
                <td colspan="7" class="table-loading">
                    No product profitability data found
                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML =
        products
            .map(
                (
                    product,
                    index
                ) => {

                    const margin =
                        product.sales > 0
                            ? (
                                product.profit /
                                product.sales
                            ) * 100
                            : 0;


                    const profitClass =
                        product.profit >= 0
                            ? "profit"
                            : "loss";


                    return `
                        <tr>

                            <td>
                                ${index + 1}
                            </td>

                            <td>

                                <span class="pl-product-name">
                                    ${escapeHtml(product.name)}
                                </span>

                                ${
                                    product.sku
                                        ? `
                                            <span class="pl-product-code">
                                                ${escapeHtml(product.sku)}
                                            </span>
                                        `
                                        : ""
                                }

                            </td>

                            <td>
                                ${product.quantity.toLocaleString("en-BD")}
                            </td>

                            <td class="money">
                                ${money(product.sales)}
                            </td>

                            <td class="money">
                                ${money(product.cost)}
                            </td>

                            <td class="money ${profitClass}">
                                ${money(product.profit)}
                            </td>

                            <td class="margin">
                                ${percent(margin)}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


/* =========================================================
   CHART
   ========================================================= */

function drawChart() {

    const canvas =
        $("profitLossChart");


    if (!canvas) {
        return;
    }


    const context =
        canvas.getContext("2d");


    const daily =
        profitLossState.daily.length
            ? profitLossState.daily
            : buildDailyData();


    const width =
        canvas.clientWidth ||
        900;


    const height =
        canvas.clientHeight ||
        330;


    const ratio =
        window.devicePixelRatio ||
        1;


    canvas.width =
        width * ratio;

    canvas.height =
        height * ratio;


    context.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
    );


    context.clearRect(
        0,
        0,
        width,
        height
    );


    if (!daily.length) {
        return;
    }


    const padding = {

        left: 55,

        right: 20,

        top: 20,

        bottom: 45

    };


    const chartWidth =
        width -
        padding.left -
        padding.right;


    const chartHeight =
        height -
        padding.top -
        padding.bottom;


    const values = [];


    daily.forEach(
        day => {

            values.push(
                num(day.sales)
            );

            values.push(
                num(day.cogs)
            );

            values.push(
                num(day.netProfit)
            );

        }
    );


    let min =
        Math.min(
            0,
            ...values
        );


    let max =
        Math.max(
            0,
            ...values
        );


    if (max === min) {
        max = min + 100;
    }


    const range =
        max - min;


    const xStep =
        daily.length > 1
            ? chartWidth /
              (daily.length - 1)
            : chartWidth;


    function x(index) {

        return padding.left +
            (
                index *
                xStep
            );

    }


    function y(value) {

        return padding.top +
            chartHeight -
            (
                (
                    value - min
                ) /
                range
            ) *
            chartHeight;

    }


    /*
     * GRID
     */

    context.strokeStyle =
        "#e5e7eb";

    context.lineWidth = 1;

    context.font =
        "11px Arial";

    context.fillStyle =
        "#9ca3af";


    for (
        let i = 0;
        i <= 5;
        i++
    ) {

        const value =
            min +
            (
                range *
                i /
                5
            );


        const lineY =
            y(value);


        context.beginPath();

        context.moveTo(
            padding.left,
            lineY
        );

        context.lineTo(
            width -
            padding.right,
            lineY
        );

        context.stroke();


        context.fillText(
            money(value),
            4,
            lineY + 4
        );

    }


    /*
     * DRAW LINE
     */

    function drawLine(
        field,
        lineColor
    ) {

        context.beginPath();

        daily.forEach(
            (
                day,
                index
            ) => {

                const px =
                    x(index);

                const py =
                    y(
                        num(
                            day[field]
                        )
                    );


                if (index === 0) {

                    context.moveTo(
                        px,
                        py
                    );

                } else {

                    context.lineTo(
                        px,
                        py
                    );

                }

            }
        );


        context.strokeStyle =
            lineColor;

        context.lineWidth = 2.5;

        context.stroke();


        daily.forEach(
            (
                day,
                index
            ) => {

                const px =
                    x(index);

                const py =
                    y(
                        num(
                            day[field]
                        )
                    );


                context.beginPath();

                context.arc(
                    px,
                    py,
                    3,
                    0,
                    Math.PI * 2
                );

                context.fillStyle =
                    lineColor;

                context.fill();

            }
        );

    }


    drawLine(
        "sales",
        "#2563eb"
    );

    drawLine(
        "cogs",
        "#f97316"
    );

    drawLine(
        "netProfit",
        "#059669"
    );


    /*
     * X LABELS
     */

    context.fillStyle =
        "#9ca3af";

    context.font =
        "10px Arial";


    const labelStep =
        Math.max(
            1,
            Math.ceil(
                daily.length / 8
            )
        );


    daily.forEach(
        (
            day,
            index
        ) => {

            if (
                index % labelStep !== 0 &&
                index !== daily.length - 1
            ) {
                return;
            }


            context.fillText(
                formatShortDate(
                    day.date
                ),
                x(index) - 18,
                height - 15
            );

        }
    );


    /*
     * LEGEND
     */

    const legends = [

        {
            name: "Sales",
            color: "#2563eb"
        },

        {
            name: "COGS",
            color: "#f97316"
        },

        {
            name: "Net Profit",
            color: "#059669"
        }

    ];


    let legendX = padding.left;


    legends.forEach(
        item => {

            context.fillStyle =
                item.color;

            context.fillRect(
                legendX,
                5,
                12,
                3
            );


            context.fillStyle =
                "#6b7280";

            context.font =
                "11px Arial";

            context.fillText(
                item.name,
                legendX + 18,
                9
            );


            legendX +=
                item.name.length * 6 +
                70;

        }
    );

}


/* =========================================================
   EXPORT CSV
   ========================================================= */

function exportProfitLossCsv() {

    const data =
        calculateProfitLoss();


    const rows = [

        [
            "MIXNBUY.BD Profit & Loss"
        ],

        [
            "Period",
            profitLossState.startDate,
            profitLossState.endDate
        ],

        [],

        [
            "Particular",
            "Amount"
        ],

        [
            "Gross Sales",
            data.grossSales
        ],

        [
            "Sales Returns",
            data.returns
        ],

        [
            "Net Sales",
            data.netSales
        ],

        [
            "Cost of Goods Sold",
            data.cogs
        ],

        [
            "Gross Profit",
            data.grossProfit
        ],

        [
            "Operating Expenses",
            data.expenses
        ],

        [
            "Net Profit / Loss",
            data.netProfit
        ],

        [
            "Gross Margin %",
            data.grossMargin
        ],

        [
            "Net Margin %",
            data.netMargin
        ],

        [],

        [
            "Daily Profit & Loss"
        ],

        [
            "Date",
            "Sales",
            "COGS",
            "Gross Profit",
            "Returns",
            "Expenses",
            "Net Profit",
            "Margin %"
        ]

    ];


    profitLossState.daily
        .forEach(
            day => {

                const margin =
                    day.sales > 0
                        ? (
                            day.netProfit /
                            day.sales
                        ) * 100
                        : 0;


                rows.push([

                    day.date,

                    day.sales,

                    day.cogs,

                    day.grossProfit,

                    day.returns,

                    day.expenses,

                    day.netProfit,

                    margin

                ]);

            }
        );


    const csv =
        rows
            .map(
                row =>
                    row
                        .map(
                            value => {

                                const text =
                                    String(
                                        value ?? ""
                                    );


                                return `"${text.replace(
                                    /"/g,
                                    '""'
                                )}"`;

                            }
                        )
                        .join(",")
            )
            .join("\n");


    const blob =
        new Blob(
            [
                "\uFEFF" +
                csv
            ],
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
        `MIXNBUY-Profit-Loss-${profitLossState.startDate}-to-${profitLossState.endDate}.csv`;


    document.body.appendChild(link);

    link.click();

    link.remove();


    URL.revokeObjectURL(url);

}


/* =========================================================
   GENERATE
   ========================================================= */

async function generateProfitLoss() {

    try {

        setLoading(true);


        await loadProfitLossData();


        renderKpis();

        renderStatement();

        renderExpenseBreakdown();

        renderDailyTable();

        renderProductProfitability();

        drawChart();


    } catch (error) {

        console.error(
            "Profit/Loss load error:",
            error
        );


        showMessage(
            "Profit / Loss Error",
            error?.message ||
            "Unable to generate Profit & Loss report.",
            "error"
        );

    } finally {

        setLoading(false);

    }

}


/* =========================================================
   QUICK RANGE
   ========================================================= */

function applyQuickRange(range) {

    const today =
        new Date();


    let start =
        new Date(today);


    let end =
        new Date(today);


    if (range === "today") {

        start =
            new Date(today);

    }


    else if (
        range === "7"
    ) {

        start.setDate(
            start.getDate() - 6
        );

    }


    else if (
        range === "30"
    ) {

        start.setDate(
            start.getDate() - 29
        );

    }


    else if (
        range === "month"
    ) {

        start =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                1
            );

    }


    else if (
        range === "year"
    ) {

        start =
            new Date(
                today.getFullYear(),
                0,
                1
            );

    }


    $("profitLossStartDate").value =
        formatDateInput(start);

    $("profitLossEndDate").value =
        formatDateInput(end);


    document
        .querySelectorAll(
            ".pl-preset"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.range ===
                    range
                );

            }
        );


    generateProfitLoss();

}


/* =========================================================
   RESIZE
   ========================================================= */

let chartResizeTimer = null;


window.addEventListener(
    "resize",
    () => {

        clearTimeout(
            chartResizeTimer
        );


        chartResizeTimer =
            setTimeout(
                () => {

                    drawChart();

                },
                150
            );

    }
);


/* =========================================================
   EVENTS
   ========================================================= */

function bindEvents() {


    /*
     * Generate
     */

    $("generateProfitLossBtn")
        ?.addEventListener(
            "click",
            generateProfitLoss
        );


    /*
     * Refresh
     */

    $("refreshProfitLossBtn")
        ?.addEventListener(
            "click",
            generateProfitLoss
        );


    /*
     * Export
     */

    $("exportProfitLossBtn")
        ?.addEventListener(
            "click",
            exportProfitLossCsv
        );


    /*
     * Presets
     */

    document
        .querySelectorAll(
            ".pl-preset"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        applyQuickRange(
                            button.dataset.range
                        );

                    }
                );

            }
        );


    /*
     * Message close
     */

    $("closeProfitLossMessage")
        ?.addEventListener(
            "click",
            hideMessage
        );


    $("profitLossMessageOk")
        ?.addEventListener(
            "click",
            hideMessage
        );


    $("profitLossMessage")
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    $("profitLossMessage")
                ) {

                    hideMessage();

                }

            }
        );


    /*
     * Escape
     */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                hideMessage();

            }

        }
    );

}


/* =========================================================
   INIT
   ========================================================= */

async function initProfitLoss() {

    setDefaultRange();

    bindEvents();

    await generateProfitLoss();

}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initProfitLoss
);


/* =========================================================
   PUBLIC API
   ========================================================= */

window.MIXNBUY_PROFIT_LOSS = {

    refresh:
        generateProfitLoss,

    exportCsv:
        exportProfitLossCsv,

    getState:
        () => profitLossState

};