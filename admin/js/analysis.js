/* =========================================================
   MIXNBUY.BD
   BUSINESS ANALYSIS
========================================================= */

"use strict";


/* =========================================================
   STATE
========================================================= */

const analysisState = {
    startDate: null,
    endDate: null,

    sales: [],
    saleItems: [],

    purchases: [],

    returns: [],
    returnItems: [],

    orders: [],

    customers: [],
    categories: []
};


/* =========================================================
   SUPABASE CLIENT
========================================================= */

function getAnalysisClient() {

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
   GENERAL HELPERS
========================================================= */

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function numberValue(value) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}


function money(value) {

    return new Intl.NumberFormat("en-BD", {
        style: "currency",
        currency: "BDT",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numberValue(value));
}


function formatNumber(value) {

    return new Intl.NumberFormat("en-BD", {
        maximumFractionDigits: 2
    }).format(numberValue(value));
}


function formatDate(dateValue) {

    if (!dateValue) {
        return "-";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleDateString("en-GB");
}


function dateKey(value) {

    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString().slice(0, 10);
}


function toInputDate(date) {

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function parseInputDate(value) {

    if (!value) {
        return null;
    }

    const parts = value.split("-");

    if (parts.length !== 3) {
        return null;
    }

    return new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );
}


function normalizeStatus(value) {

    return String(value || "")
        .trim()
        .toLowerCase();
}


function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


/* =========================================================
   UI HELPERS
========================================================= */

function showAnalysisLoading() {

    const element =
        document.getElementById(
            "analysisLoading"
        );

    if (element) {
        element.hidden = false;
    }
}


function hideAnalysisLoading() {

    const element =
        document.getElementById(
            "analysisLoading"
        );

    if (element) {
        element.hidden = true;
    }
}


function showAnalysisMessage(
    message,
    type = "info",
    title = "Information"
) {

    const box =
        document.getElementById(
            "analysisMessage"
        );

    const titleElement =
        document.getElementById(
            "analysisMessageTitle"
        );

    const textElement =
        document.getElementById(
            "analysisMessageText"
        );

    if (!box) {
        return;
    }

    if (titleElement) {
        titleElement.textContent = title;
    }

    if (textElement) {
        textElement.textContent = message;
    }

    box.classList.remove(
        "success",
        "error"
    );

    if (type === "success") {
        box.classList.add("success");
    }

    if (type === "error") {
        box.classList.add("error");
    }

    box.hidden = false;
}


function hideAnalysisMessage() {

    const box =
        document.getElementById(
            "analysisMessage"
        );

    if (box) {
        box.hidden = true;
    }
}


/* =========================================================
   DATE RANGE
========================================================= */

function setDefaultAnalysisDates() {

    const end = new Date();

    const start = new Date();

    start.setDate(
        start.getDate() - 29
    );

    const startInput =
        document.getElementById(
            "analysisStartDate"
        );

    const endInput =
        document.getElementById(
            "analysisEndDate"
        );

    if (startInput) {
        startInput.value =
            toInputDate(start);
    }

    if (endInput) {
        endInput.value =
            toInputDate(end);
    }

    analysisState.startDate =
        toInputDate(start);

    analysisState.endDate =
        toInputDate(end);
}


function readAnalysisDates() {

    const startInput =
        document.getElementById(
            "analysisStartDate"
        );

    const endInput =
        document.getElementById(
            "analysisEndDate"
        );

    if (!startInput || !endInput) {
        return false;
    }

    const startDate =
        parseInputDate(
            startInput.value
        );

    const endDate =
        parseInputDate(
            endInput.value
        );

    if (!startDate || !endDate) {

        showAnalysisMessage(
            "Please select both start and end dates.",
            "error",
            "Invalid Date Range"
        );

        return false;
    }

    if (startDate > endDate) {

        showAnalysisMessage(
            "Start date cannot be greater than end date.",
            "error",
            "Invalid Date Range"
        );

        return false;
    }

    analysisState.startDate =
        startInput.value;

    analysisState.endDate =
        endInput.value;

    return true;
}


function setAnalysisRange(range) {

    const today = new Date();

    let start = new Date(today);

    const end = new Date(today);

    if (range === "today") {

        start = new Date(today);

    } else if (range === "7") {

        start.setDate(
            start.getDate() - 6
        );

    } else if (range === "30") {

        start.setDate(
            start.getDate() - 29
        );

    } else if (range === "month") {

        start = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );

    } else if (range === "year") {

        start = new Date(
            today.getFullYear(),
            0,
            1
        );
    }

    const startInput =
        document.getElementById(
            "analysisStartDate"
        );

    const endInput =
        document.getElementById(
            "analysisEndDate"
        );

    if (startInput) {
        startInput.value =
            toInputDate(start);
    }

    if (endInput) {
        endInput.value =
            toInputDate(end);
    }

    document.querySelectorAll(
        ".analysis-preset"
    ).forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.range === range
        );

    });

    readAnalysisDates();

    generateAnalysis();
}


/* =========================================================
   LOAD SALES
========================================================= */

async function loadSales(client, start, end) {

    const result =
        await client
            .from("sales")
            .select("*")
            .gte(
                "sale_date",
                start
            )
            .lte(
                "sale_date",
                end
            )
            .order(
                "sale_date",
                {
                    ascending: true
                }
            );

    if (result.error) {
        throw result.error;
    }

    analysisState.sales =
        Array.isArray(result.data)
            ? result.data
            : [];
}


/* =========================================================
   LOAD SALES ITEMS
========================================================= */

async function loadSaleItems(client) {

    const saleIds =
        analysisState.sales
            .map(
                sale => sale.id
            )
            .filter(Boolean);

    if (!saleIds.length) {

        analysisState.saleItems = [];

        return;
    }

    const result =
        await client
            .from("sales_items")
            .select(`
                sale_id,
                product_id,
                product_name,
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

    if (result.error) {
        throw result.error;
    }

    analysisState.saleItems =
        Array.isArray(result.data)
            ? result.data
            : [];
}


/* =========================================================
   LOAD PURCHASES
========================================================= */

async function loadPurchases(
    client,
    start,
    end
) {

    const result =
        await client
            .from("purchases")
            .select("*")
            .gte(
                "purchase_date",
                start
            )
            .lte(
                "purchase_date",
                end
            )
            .order(
                "purchase_date",
                {
                    ascending: true
                }
            );

    if (result.error) {
        throw result.error;
    }

    analysisState.purchases =
        Array.isArray(result.data)
            ? result.data
            : [];
}


/* =========================================================
   LOAD RETURNS
========================================================= */

async function loadReturns(
    client,
    start,
    end
) {

    const result =
        await client
            .from("returns")
            .select("*")
            .gte(
                "return_date",
                start
            )
            .lte(
                "return_date",
                end
            )
            .order(
                "return_date",
                {
                    ascending: true
                }
            );

    if (result.error) {
        throw result.error;
    }

    analysisState.returns =
        Array.isArray(result.data)
            ? result.data
            : [];
}


/* =========================================================
   LOAD RETURN ITEMS
========================================================= */

async function loadReturnItems(client) {

    const returnIds =
        analysisState.returns
            .map(
                row => row.id
            )
            .filter(Boolean);

    if (!returnIds.length) {

        analysisState.returnItems = [];

        return;
    }

    const result =
        await client
            .from("return_items")
            .select(`
                return_id,
                product_id,
                product_name,
                quantity,
                refund_amount,
                profit_adjustment
            `)
            .in(
                "return_id",
                returnIds
            );

    if (result.error) {
        throw result.error;
    }

    analysisState.returnItems =
        Array.isArray(result.data)
            ? result.data
            : [];
}


/* =========================================================
   LOAD ORDERS
========================================================= */

async function loadOrders(
    client,
    start,
    end
) {

    const result =
        await client
            .from("orders")
            .select("*")
            .gte(
                "created_at",
                start
            )
            .lte(
                "created_at",
                end
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );

    if (result.error) {
        throw result.error;
    }

    analysisState.orders =
        Array.isArray(result.data)
            ? result.data
            : [];
}


/* =========================================================
   LOAD CUSTOMERS
   IMPORTANT:
   Only id, name, mobile are requested.
   There is NO phone column here.
========================================================= */

async function loadCustomers(client) {

    const customerIds =
        [
            ...new Set(
                analysisState.orders
                    .map(
                        order =>
                            order.customer_id
                    )
                    .filter(Boolean)
            )
        ];

    if (!customerIds.length) {

        analysisState.customers = [];

        return;
    }

    const result =
        await client
            .from("customers")
            .select(`
                id,
                name,
                mobile
            `)
            .in(
                "id",
                customerIds
            );

    if (result.error) {

        console.warn(
            "Customer analysis data could not be loaded:",
            result.error
        );

        /*
         * Customer information is not required
         * for the rest of the analysis.
         */
        analysisState.customers = [];

        return;
    }

    analysisState.customers =
        Array.isArray(result.data)
            ? result.data
            : [];
}


/* =========================================================
   LOAD CATEGORIES
========================================================= */

async function loadCategories(client) {

    const result =
        await client
            .from("categories")
            .select("id,name")
            .order(
                "name",
                {
                    ascending: true
                }
            );

    if (result.error) {

        console.warn(
            "Category data could not be loaded:",
            result.error
        );

        analysisState.categories = [];

        return;
    }

    analysisState.categories =
        Array.isArray(result.data)
            ? result.data
            : [];
}


/* =========================================================
   LOAD ALL ANALYSIS DATA
========================================================= */

async function loadAnalysisData() {

    const client =
        getAnalysisClient();

    if (!client) {

        throw new Error(
            "Supabase client is not initialized."
        );
    }

    const start =
        `${analysisState.startDate}T00:00:00`;

    const end =
        `${analysisState.endDate}T23:59:59.999`;


    await loadSales(
        client,
        start,
        end
    );

    await loadSaleItems(
        client
    );

    await loadPurchases(
        client,
        start,
        end
    );

    await loadReturns(
        client,
        start,
        end
    );

    await loadReturnItems(
        client
    );

    await loadOrders(
        client,
        start,
        end
    );

    /*
     * Customer query is intentionally isolated.
     * If customer data fails, the main analysis
     * still continues.
     */
    await loadCustomers(
        client
    );

    await loadCategories(
        client
    );
}


/* =========================================================
   COMPLETED DATA
========================================================= */

function completedSales() {

    return analysisState.sales.filter(
        sale =>
            normalizeStatus(
                sale.status
            ) === "completed"
    );
}


function completedPurchases() {

    return analysisState.purchases.filter(
        purchase => {

            const status =
                normalizeStatus(
                    purchase.status
                );

            return [
                "completed",
                "complete",
                "received"
            ].includes(status);
        }
    );
}


function completedReturns() {

    return analysisState.returns.filter(
        row =>
            normalizeStatus(
                row.status
            ) === "completed"
    );
}


/* =========================================================
   KPI
========================================================= */

function calculateKPIs() {

    const sales =
        completedSales();

    const returns =
        completedReturns();


    const totalSales =
        sales.reduce(
            (sum, sale) =>
                sum +
                numberValue(
                    sale.total_amount
                ),
            0
        );


    const grossProfit =
        analysisState.saleItems.reduce(
            (sum, item) => {

                const sale =
                    analysisState.sales.find(
                        row =>
                            row.id ===
                            item.sale_id
                    );

                if (
                    !sale ||
                    normalizeStatus(
                        sale.status
                    ) !== "completed"
                ) {
                    return sum;
                }

                return sum +
                    numberValue(
                        item.gross_profit
                    );
            },
            0
        );


    const returnProfitAdjustment =
        analysisState.returnItems.reduce(
            (sum, item) => {

                const returnRow =
                    analysisState.returns.find(
                        row =>
                            row.id ===
                            item.return_id
                    );

                if (
                    !returnRow ||
                    normalizeStatus(
                        returnRow.status
                    ) !== "completed"
                ) {
                    return sum;
                }

                return sum +
                    numberValue(
                        item.profit_adjustment
                    );
            },
            0
        );


    const totalProfit =
        grossProfit -
        returnProfitAdjustment;


    const orderCount =
        sales.length;


    const averageOrder =
        orderCount
            ? totalSales / orderCount
            : 0;


    const returnRate =
        orderCount
            ? (
                returns.length /
                orderCount
            ) * 100
            : 0;


    const customerSet =
        new Set(
            analysisState.orders
                .map(
                    order =>
                        order.customer_id
                )
                .filter(Boolean)
        );


    setText(
        "analysisSales",
        money(totalSales)
    );

    setText(
        "analysisProfit",
        money(totalProfit)
    );

    setText(
        "analysisAov",
        money(averageOrder)
    );

    setText(
        "analysisOrders",
        formatNumber(
            orderCount
        )
    );

    setText(
        "analysisReturnRate",
        `${returnRate.toFixed(1)}%`
    );

    setText(
        "analysisCustomers",
        formatNumber(
            customerSet.size
        )
    );


    setText(
        "summarySales",
        money(totalSales)
    );

    setText(
        "summaryProfit",
        money(totalProfit)
    );

    setText(
        "summaryOrders",
        formatNumber(
            orderCount
        )
    );

    setText(
        "summaryReturns",
        formatNumber(
            returns.length
        )
    );

    setText(
        "summaryCustomers",
        formatNumber(
            customerSet.size
        )
    );

    setText(
        "summaryReturnRate",
        `${returnRate.toFixed(1)}%`
    );
}


/* =========================================================
   DATE LIST
========================================================= */

function buildDateList() {

    const start =
        parseInputDate(
            analysisState.startDate
        );

    const end =
        parseInputDate(
            analysisState.endDate
        );

    const dates = [];

    if (!start || !end) {
        return dates;
    }

    const current =
        new Date(start);

    while (current <= end) {

        dates.push(
            toInputDate(current)
        );

        current.setDate(
            current.getDate() + 1
        );
    }

    return dates;
}


/* =========================================================
   TREND DATA
========================================================= */

function buildTrendData() {

    const dates =
        buildDateList();

    const sales =
        completedSales();

    const purchases =
        completedPurchases();

    const returns =
        completedReturns();


    const salesByDate = {};
    const purchasesByDate = {};
    const returnsByDate = {};
    const profitByDate = {};


    dates.forEach(
        date => {

            salesByDate[date] = 0;
            purchasesByDate[date] = 0;
            returnsByDate[date] = 0;
            profitByDate[date] = 0;

        }
    );


    sales.forEach(
        sale => {

            const key =
                dateKey(
                    sale.sale_date ||
                    sale.created_at
                );

            if (
                key &&
                salesByDate[key] !== undefined
            ) {

                salesByDate[key] +=
                    numberValue(
                        sale.total_amount
                    );
            }

        }
    );


    purchases.forEach(
        purchase => {

            const key =
                dateKey(
                    purchase.purchase_date ||
                    purchase.created_at
                );

            if (
                key &&
                purchasesByDate[key] !== undefined
            ) {

                purchasesByDate[key] +=
                    numberValue(
                        purchase.total_amount
                    );
            }

        }
    );


    returns.forEach(
        row => {

            const key =
                dateKey(
                    row.return_date ||
                    row.created_at
                );

            if (
                key &&
                returnsByDate[key] !== undefined
            ) {

                returnsByDate[key] +=
                    numberValue(
                        row.refund_amount
                    );
            }

        }
    );


    analysisState.saleItems.forEach(
        item => {

            const sale =
                analysisState.sales.find(
                    row =>
                        row.id ===
                        item.sale_id
                );

            if (
                !sale ||
                normalizeStatus(
                    sale.status
                ) !== "completed"
            ) {
                return;
            }


            const key =
                dateKey(
                    sale.sale_date ||
                    sale.created_at
                );

            if (
                key &&
                profitByDate[key] !== undefined
            ) {

                profitByDate[key] +=
                    numberValue(
                        item.gross_profit
                    );
            }

        }
    );


    analysisState.returnItems.forEach(
        item => {

            const returnRow =
                analysisState.returns.find(
                    row =>
                        row.id ===
                        item.return_id
                );

            if (
                !returnRow ||
                normalizeStatus(
                    returnRow.status
                ) !== "completed"
            ) {
                return;
            }


            const key =
                dateKey(
                    returnRow.return_date ||
                    returnRow.created_at
                );

            if (
                key &&
                profitByDate[key] !== undefined
            ) {

                profitByDate[key] -=
                    numberValue(
                        item.profit_adjustment
                    );
            }

        }
    );


    return {
        dates,

        sales: dates.map(
            date =>
                salesByDate[date]
        ),

        purchases: dates.map(
            date =>
                purchasesByDate[date]
        ),

        returns: dates.map(
            date =>
                returnsByDate[date]
        ),

        profit: dates.map(
            date =>
                profitByDate[date]
        )
    };
}


/* =========================================================
   CANVAS CHART
========================================================= */

function drawLineChart(
    containerId,
    labels,
    values,
    options = {}
) {

    const container =
        document.getElementById(
            containerId
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";


    if (!labels.length) {

        container.innerHTML = `
            <div class="analysis-empty-state">
                <i class="bi bi-bar-chart-line"></i>
                <p>No data available.</p>
            </div>
        `;

        return;
    }


    const canvas =
        document.createElement(
            "canvas"
        );

    canvas.className =
        "analysis-chart";

    container.appendChild(
        canvas
    );


    const ctx =
        canvas.getContext("2d");


    const width =
        Math.max(
            container.clientWidth - 30,
            500
        );

    const height = 240;


    const ratio =
        window.devicePixelRatio || 1;


    canvas.width =
        width * ratio;

    canvas.height =
        height * ratio;

    canvas.style.width =
        `${width}px`;

    canvas.style.height =
        `${height}px`;

    ctx.scale(
        ratio,
        ratio
    );


    const padding = {
        top: 20,
        right: 20,
        bottom: 40,
        left: 58
    };


    const chartWidth =
        width -
        padding.left -
        padding.right;

    const chartHeight =
        height -
        padding.top -
        padding.bottom;


    const maxValue =
        Math.max(
            ...values,
            1
        );


    const color =
        options.color ||
        "#2563eb";


    ctx.font =
        "11px Arial";

    ctx.textAlign =
        "right";

    ctx.textBaseline =
        "middle";


    for (
        let i = 0;
        i <= 4;
        i++
    ) {

        const ratioValue =
            i / 4;

        const y =
            padding.top +
            chartHeight -
            (
                ratioValue *
                chartHeight
            );


        ctx.strokeStyle =
            "#eef0f2";

        ctx.lineWidth = 1;

        ctx.beginPath();

        ctx.moveTo(
            padding.left,
            y
        );

        ctx.lineTo(
            width - padding.right,
            y
        );

        ctx.stroke();


        const value =
            maxValue *
            ratioValue;


        ctx.fillStyle =
            "#9ca3af";

        ctx.fillText(
            formatChartValue(value),
            padding.left - 8,
            y
        );
    }


    const pointGap =
        labels.length > 1
            ? chartWidth /
              (labels.length - 1)
            : chartWidth;


    const points = [];


    values.forEach(
        (value, index) => {

            const x =
                labels.length === 1
                    ? padding.left +
                      chartWidth / 2
                    : padding.left +
                      (
                        pointGap *
                        index
                    );


            const y =
                padding.top +
                chartHeight -
                (
                    (
                        numberValue(value) /
                        maxValue
                    ) *
                    chartHeight
                );


            points.push({
                x,
                y
            });

        }
    );


    const firstPoint =
        points[0];

    const lastPoint =
        points[
            points.length - 1
        ];


    /* Area */

    ctx.beginPath();

    points.forEach(
        (point, index) => {

            if (index === 0) {

                ctx.moveTo(
                    point.x,
                    point.y
                );

            } else {

                ctx.lineTo(
                    point.x,
                    point.y
                );

            }

        }
    );


    ctx.lineTo(
        lastPoint.x,
        padding.top +
        chartHeight
    );

    ctx.lineTo(
        firstPoint.x,
        padding.top +
        chartHeight
    );

    ctx.closePath();


    ctx.fillStyle =
        hexToRgba(
            color,
            0.10
        );

    ctx.fill();


    /* Line */

    ctx.beginPath();

    points.forEach(
        (point, index) => {

            if (index === 0) {

                ctx.moveTo(
                    point.x,
                    point.y
                );

            } else {

                ctx.lineTo(
                    point.x,
                    point.y
                );

            }

        }
    );


    ctx.strokeStyle =
        color;

    ctx.lineWidth = 2.5;

    ctx.stroke();


    /* Points */

    points.forEach(
        point => {

            ctx.beginPath();

            ctx.arc(
                point.x,
                point.y,
                3.5,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                "#ffffff";

            ctx.fill();

            ctx.strokeStyle =
                color;

            ctx.lineWidth = 2;

            ctx.stroke();

        }
    );


    /* Date labels */

    ctx.fillStyle =
        "#9ca3af";

    ctx.font =
        "10px Arial";

    ctx.textAlign =
        "center";

    ctx.textBaseline =
        "top";


    const labelStep =
        labels.length > 14
            ? Math.ceil(
                labels.length / 8
            )
            : 1;


    labels.forEach(
        (label, index) => {

            if (
                index % labelStep !== 0 &&
                index !==
                labels.length - 1
            ) {
                return;
            }


            const point =
                points[index];

            const date =
                parseInputDate(label);


            const text =
                date
                    ? `${String(
                        date.getDate()
                    ).padStart(2, "0")}/${String(
                        date.getMonth() + 1
                    ).padStart(2, "0")}`
                    : label;


            ctx.fillText(
                text,
                point.x,
                padding.top +
                chartHeight +
                10
            );

        }
    );
}


function formatChartValue(value) {

    const number =
        numberValue(value);

    if (number >= 1000000) {

        return `${(
            number / 1000000
        ).toFixed(1)}M`;
    }

    if (number >= 1000) {

        return `${(
            number / 1000
        ).toFixed(1)}K`;
    }

    return number.toFixed(0);
}


function hexToRgba(
    hex,
    alpha
) {

    const clean =
        hex.replace(
            "#",
            ""
        );

    const bigint =
        parseInt(
            clean,
            16
        );

    const r =
        (bigint >> 16) & 255;

    const g =
        (bigint >> 8) & 255;

    const b =
        bigint & 255;

    return `rgba(${r},${g},${b},${alpha})`;
}


/* =========================================================
   RENDER TRENDS
========================================================= */

function renderTrendCharts() {

    const trend =
        buildTrendData();


    drawLineChart(
        "salesTrendChart",
        trend.dates,
        trend.sales,
        {
            color: "#059669"
        }
    );


    drawLineChart(
        "profitTrendChart",
        trend.dates,
        trend.profit,
        {
            color: "#2563eb"
        }
    );


    drawLineChart(
        "purchaseTrendChart",
        trend.dates,
        trend.purchases,
        {
            color: "#7c3aed"
        }
    );


    drawLineChart(
        "returnTrendChart",
        trend.dates,
        trend.returns,
        {
            color: "#dc2626"
        }
    );
}


/* =========================================================
   TOP PRODUCTS
========================================================= */

function renderTopProducts() {

    const body =
        document.getElementById(
            "topProductsBody"
        );

    if (!body) {
        return;
    }


    const sales =
        completedSales();


    const saleIds =
        new Set(
            sales.map(
                sale =>
                    sale.id
            )
        );


    const productMap = {};


    analysisState.saleItems.forEach(
        item => {

            if (
                !saleIds.has(
                    item.sale_id
                )
            ) {
                return;
            }


            const key =
                item.product_id ||
                item.product_name ||
                "unknown";


            if (!productMap[key]) {

                productMap[key] = {
                    name:
                        item.product_name ||
                        "Unknown Product",

                    quantity: 0,

                    sales: 0,

                    profit: 0
                };
            }


            productMap[key].quantity +=
                numberValue(
                    item.quantity
                );


            productMap[key].sales +=
                numberValue(
                    item.total_amount
                );


            productMap[key].profit +=
                numberValue(
                    item.gross_profit
                );

        }
    );


    const rows =
        Object.values(
            productMap
        )
        .sort(
            (a, b) =>
                b.sales -
                a.sales
        )
        .slice(0, 10);


    if (!rows.length) {

        body.innerHTML = `
            <tr>
                <td colspan="5" class="table-empty">
                    No product data available.
                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML =
        rows.map(
            (item, index) => {

                const rankClass =
                    index === 0
                        ? "top-one"
                        : index === 1
                            ? "top-two"
                            : index === 2
                                ? "top-three"
                                : "";


                return `
                    <tr>

                        <td>
                            <span class="rank-badge ${rankClass}">
                                ${index + 1}
                            </span>
                        </td>

                        <td class="product-name-cell">
                            ${escapeHtml(
                                item.name
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                item.quantity
                            )}
                        </td>

                        <td>
                            ${money(
                                item.sales
                            )}
                        </td>

                        <td class="money-positive">
                            ${money(
                                item.profit
                            )}
                        </td>

                    </tr>
                `;
            }
        )
        .join("");
}


/* =========================================================
   CATEGORY PERFORMANCE
========================================================= */

async function renderCategoryPerformance() {

    const body =
        document.getElementById(
            "categoryPerformanceBody"
        );

    if (!body) {
        return;
    }


    const client =
        getAnalysisClient();


    if (!client) {
        return;
    }


    const sales =
        completedSales();


    const saleIds =
        new Set(
            sales.map(
                sale =>
                    sale.id
            )
        );


    const productIds =
        [
            ...new Set(
                analysisState.saleItems
                    .filter(
                        item =>
                            saleIds.has(
                                item.sale_id
                            )
                    )
                    .map(
                        item =>
                            item.product_id
                    )
                    .filter(Boolean)
            )
        ];


    const categoryMap = {};


    analysisState.categories.forEach(
        category => {

            categoryMap[
                category.id
            ] = {
                name:
                    category.name ||
                    "Uncategorized",

                products: 0,

                quantity: 0,

                sales: 0,

                profit: 0
            };

        }
    );


    let products = [];


    if (productIds.length) {

        const result =
            await client
                .from("products")
                .select(`
                    id,
                    category_id
                `)
                .in(
                    "id",
                    productIds
                );


        if (!result.error) {

            products =
                Array.isArray(
                    result.data
                )
                    ? result.data
                    : [];
        }
    }


    const productCategoryMap = {};


    products.forEach(
        product => {

            productCategoryMap[
                product.id
            ] =
                product.category_id;

        }
    );


    const productSets = {};


    analysisState.saleItems.forEach(
        item => {

            if (
                !saleIds.has(
                    item.sale_id
                )
            ) {
                return;
            }


            const categoryId =
                productCategoryMap[
                    item.product_id
                ];


            if (!categoryId) {
                return;
            }


            if (
                !categoryMap[
                    categoryId
                ]
            ) {

                categoryMap[
                    categoryId
                ] = {
                    name:
                        "Unknown Category",

                    products: 0,

                    quantity: 0,

                    sales: 0,

                    profit: 0
                };
            }


            categoryMap[
                categoryId
            ].quantity +=
                numberValue(
                    item.quantity
                );


            categoryMap[
                categoryId
            ].sales +=
                numberValue(
                    item.total_amount
                );


            categoryMap[
                categoryId
            ].profit +=
                numberValue(
                    item.gross_profit
                );


            if (
                !productSets[
                    categoryId
                ]
            ) {

                productSets[
                    categoryId
                ] = new Set();

            }


            if (item.product_id) {

                productSets[
                    categoryId
                ].add(
                    item.product_id
                );

            }

        }
    );


    Object.keys(
        productSets
    ).forEach(
        categoryId => {

            categoryMap[
                categoryId
            ].products =
                productSets[
                    categoryId
                ].size;

        }
    );


    const rows =
        Object.values(
            categoryMap
        )
        .filter(
            row =>
                row.sales > 0 ||
                row.quantity > 0
        )
        .sort(
            (a, b) =>
                b.sales -
                a.sales
        );


    if (!rows.length) {

        body.innerHTML = `
            <tr>
                <td colspan="5" class="table-empty">
                    No category data available.
                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML =
        rows.map(
            row => `
                <tr>

                    <td>
                        <strong>
                            ${escapeHtml(
                                row.name
                            )}
                        </strong>
                    </td>

                    <td>
                        ${formatNumber(
                            row.products
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            row.quantity
                        )}
                    </td>

                    <td>
                        ${money(
                            row.sales
                        )}
                    </td>

                    <td class="money-positive">
                        ${money(
                            row.profit
                        )}
                    </td>

                </tr>
            `
        )
        .join("");
}


/* =========================================================
   CUSTOMER PERFORMANCE
========================================================= */

function renderCustomerPerformance() {

    const body =
        document.getElementById(
            "customerPerformanceBody"
        );

    if (!body) {
        return;
    }


    const customerMap = {};


    analysisState.customers.forEach(
        customer => {

            customerMap[
                customer.id
            ] = {
                name:
                    customer.name ||
                    "Customer",

                phone:
                    customer.mobile ||
                    "-",

                orders: 0,

                sales: 0
            };

        }
    );


    completedSales().forEach(
        sale => {

            if (!sale.customer_id) {
                return;
            }


            if (
                !customerMap[
                    sale.customer_id
                ]
            ) {

                customerMap[
                    sale.customer_id
                ] = {
                    name:
                        sale.customer_name ||
                        "Customer",

                    phone:
                        sale.mobile ||
                        "-",

                    orders: 0,

                    sales: 0
                };

            }


            customerMap[
                sale.customer_id
            ].orders += 1;


            customerMap[
                sale.customer_id
            ].sales +=
                numberValue(
                    sale.total_amount
                );

        }
    );


    const rows =
        Object.values(
            customerMap
        )
        .filter(
            customer =>
                customer.orders > 0
        )
        .sort(
            (a, b) =>
                b.sales -
                a.sales
        )
        .slice(0, 10);


    if (!rows.length) {

        body.innerHTML = `
            <tr>
                <td colspan="6" class="table-empty">
                    No customer data available.
                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML =
        rows.map(
            (customer, index) => {

                const average =
                    customer.orders
                        ? customer.sales /
                          customer.orders
                        : 0;


                return `
                    <tr>

                        <td>
                            <span class="rank-badge">
                                ${index + 1}
                            </span>
                        </td>

                        <td>
                            <strong>
                                ${escapeHtml(
                                    customer.name
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escapeHtml(
                                customer.phone
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                customer.orders
                            )}
                        </td>

                        <td>
                            ${money(
                                customer.sales
                            )}
                        </td>

                        <td>
                            ${money(
                                average
                            )}
                        </td>

                    </tr>
                `;
            }
        )
        .join("");
}


/* =========================================================
   ORDER STATUS
========================================================= */

function renderOrderStatus() {

    const body =
        document.getElementById(
            "analysisOrderStatusBody"
        );

    if (!body) {
        return;
    }


    const statusMap = {};


    analysisState.orders.forEach(
        order => {

            const status =
                normalizeStatus(
                    order.status
                ) || "unknown";


            if (!statusMap[status]) {

                statusMap[status] = {
                    count: 0,
                    value: 0
                };

            }


            statusMap[
                status
            ].count += 1;


            statusMap[
                status
            ].value +=
                numberValue(
                    order.total_amount
                );

        }
    );


    const total =
        analysisState.orders.length;


    const rows =
        Object.entries(
            statusMap
        )
        .sort(
            (a, b) =>
                b[1].count -
                a[1].count
        );


    if (!rows.length) {

        body.innerHTML = `
            <tr>
                <td colspan="4" class="table-empty">
                    No order data available.
                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML =
        rows.map(
            ([status, data]) => {

                const share =
                    total
                        ? (
                            data.count /
                            total
                        ) * 100
                        : 0;


                return `
                    <tr>

                        <td>
                            <span class="analysis-status ${escapeHtml(status)}">
                                ${formatStatus(
                                    status
                                )}
                            </span>
                        </td>

                        <td>
                            ${formatNumber(
                                data.count
                            )}
                        </td>

                        <td>
                            ${money(
                                data.value
                            )}
                        </td>

                        <td>

                            <div class="status-share">

                                <strong>
                                    ${share.toFixed(1)}%
                                </strong>

                                <div class="status-share-bar">

                                    <div
                                        class="status-share-fill"
                                        style="width:${Math.min(
                                            share,
                                            100
                                        )}%"
                                    ></div>

                                </div>

                            </div>

                        </td>

                    </tr>
                `;
            }
        )
        .join("");
}


function formatStatus(status) {

    if (!status) {
        return "Unknown";
    }

    return status
        .split("_")
        .map(
            word =>
                word.charAt(0).toUpperCase() +
                word.slice(1)
        )
        .join(" ");
}


/* =========================================================
   CSV EXPORT
========================================================= */

function exportAnalysisCSV() {

    const trend =
        buildTrendData();


    const rows = [
        [
            "Date",
            "Sales",
            "Purchases",
            "Profit",
            "Returns"
        ]
    ];


    trend.dates.forEach(
        (date, index) => {

            rows.push([
                date,
                trend.sales[index],
                trend.purchases[index],
                trend.profit[index],
                trend.returns[index]
            ]);

        }
    );


    const csv =
        rows.map(
            row =>
                row.map(
                    value =>
                        `"${String(
                            value
                        ).replace(
                            /"/g,
                            '""'
                        )}"`
                ).join(",")
        ).join("\n");


    const blob =
        new Blob(
            [csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );

    link.href = url;

    link.download =
        `MIXNBUY-Analysis-${analysisState.startDate}-to-${analysisState.endDate}.csv`;

    document.body.appendChild(
        link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
        url
    );
}


/* =========================================================
   MAIN
========================================================= */

async function generateAnalysis() {

    if (!readAnalysisDates()) {
        return;
    }


    showAnalysisLoading();

    hideAnalysisMessage();


    try {

        await loadAnalysisData();

        calculateKPIs();

        renderTrendCharts();

        renderTopProducts();

        await renderCategoryPerformance();

        renderCustomerPerformance();

        renderOrderStatus();


        showAnalysisMessage(
            "Analysis data has been updated successfully.",
            "success",
            "Analysis Updated"
        );


    } catch (error) {

        console.error(
            "Analysis load error:",
            error
        );


        showAnalysisMessage(
            error?.message ||
            "Failed to load analysis data.",
            "error",
            "Analysis Error"
        );

    } finally {

        hideAnalysisLoading();
    }
}


/* =========================================================
   DEBOUNCE
========================================================= */

function debounce(
    callback,
    delay
) {

    let timer = null;

    return function (...args) {

        clearTimeout(timer);

        timer = setTimeout(
            () => {
                callback.apply(
                    this,
                    args
                );
            },
            delay
        );
    };
}


/* =========================================================
   EVENTS
========================================================= */

function bindAnalysisEvents() {

    const generateButton =
        document.getElementById(
            "generateAnalysisBtn"
        );

    if (generateButton) {

        generateButton.addEventListener(
            "click",
            generateAnalysis
        );

    }


    const refreshButton =
        document.getElementById(
            "refreshAnalysisBtn"
        );

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            generateAnalysis
        );

    }


    const exportButton =
        document.getElementById(
            "exportAnalysisBtn"
        );

    if (exportButton) {

        exportButton.addEventListener(
            "click",
            exportAnalysisCSV
        );

    }


    document.querySelectorAll(
        ".analysis-preset"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    setAnalysisRange(
                        button.dataset.range
                    );

                }
            );

        }
    );


    const closeMessage =
        document.getElementById(
            "closeAnalysisMessage"
        );

    if (closeMessage) {

        closeMessage.addEventListener(
            "click",
            hideAnalysisMessage
        );

    }


    window.addEventListener(
        "resize",
        debounce(
            () => {

                if (
                    analysisState.startDate &&
                    analysisState.endDate
                ) {

                    renderTrendCharts();

                }

            },
            250
        )
    );
}


/* =========================================================
   INITIALIZE
========================================================= */

async function initAnalysis() {

    setDefaultAnalysisDates();

    bindAnalysisEvents();

    await generateAnalysis();
}


/* =========================================================
   GLOBAL
========================================================= */

window.MIXNBUY_ANALYSIS = {

    init:
        initAnalysis,

    refresh:
        generateAnalysis,

    exportCSV:
        exportAnalysisCSV,

    getState:
        () => analysisState
};


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initAnalysis();

    }
);