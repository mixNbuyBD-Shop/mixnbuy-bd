/* =========================================================
   MIXNBUY.BD
   LIVE ADMIN DASHBOARD
   Supabase Integration
   ========================================================= */

(function () {

  "use strict";


  /* =======================================================
     HELPERS
     ======================================================= */

  const $ = (id) =>
    document.getElementById(id);


  const admin =
    window.MIXNBUY_ADMIN || {};


  const supabase =
    window.supabaseClient ||
    window.supabase ||
    null;


  /* =======================================================
     FORMATTERS
     ======================================================= */

  function money(value) {

    if (
      typeof admin.formatMoney ===
      "function"
    ) {

      return admin.formatMoney(
        value || 0
      );

    }


    return (
      "BDT " +
      Number(value || 0)
        .toLocaleString(
          "en-BD",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }
        )
    );
  }


  function number(value) {

    if (
      typeof admin.formatNumber ===
      "function"
    ) {

      return admin.formatNumber(
        value || 0
      );

    }


    return Number(value || 0)
      .toLocaleString("en-BD");
  }


  function escapeHtml(value) {

    if (
      typeof admin.escapeHtml ===
      "function"
    ) {

      return admin.escapeHtml(
        value
      );

    }


    return String(
      value ?? ""
    )
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  function statusBadge(status) {

    if (
      typeof admin.statusBadge ===
      "function"
    ) {

      return admin.statusBadge(
        status
      );

    }


    return `
      <span class="badge badge-gray">
        ${escapeHtml(status || "-")}
      </span>
    `;
  }


  function date(value) {

    if (
      typeof admin.formatDate ===
      "function"
    ) {

      return admin.formatDate(
        value
      );

    }


    if (!value) return "-";


    const d =
      new Date(value);


    if (
      Number.isNaN(
        d.getTime()
      )
    ) {

      return "-";

    }


    return d.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );
  }


  /* =======================================================
     SUPABASE CLIENT
     ======================================================= */

  function getSupabase() {

    return (
      window.supabaseClient ||
      window.supabase ||
      supabase
    );
  }


  /* =======================================================
     LOAD DASHBOARD
     ======================================================= */

  async function loadDashboard() {

    console.log(
      "Dashboard: Loading live Supabase data..."
    );


    const client =
      getSupabase();


    if (!client) {

      console.error(
        "Supabase client is not initialized."
      );

      showDashboardError(
        "Supabase client is not initialized."
      );

      return;

    }


    try {

      setDashboardLoading(
        true
      );


      const {
        data,
        error
      } = await client.rpc(
        "get_dashboard_summary"
      );


      if (error) {

        console.error(
          "Dashboard RPC Error:",
          error
        );

        throw error;

      }


      console.log(
        "Dashboard Live Data:",
        data
      );


      if (!data) {

        throw new Error(
          "Dashboard returned empty data."
        );

      }


      renderDashboard(
        data
      );


      console.log(
        "Dashboard: Live data loaded successfully."
      );


    } catch (error) {

      console.error(
        "Dashboard Load Failed:",
        error
      );


      showDashboardError(
        error.message ||
        "Unable to load dashboard."
      );


    } finally {

      setDashboardLoading(
        false
      );

    }
  }


  /* =======================================================
     RENDER DASHBOARD
     ======================================================= */

  function renderDashboard(
    data
  ) {

    /* -------------------------------
       STAT CARDS
       ------------------------------- */

    setText(
      "totalSales",
      money(data.totalSales)
    );


    setText(
      "totalPurchases",
      money(data.totalPurchases)
    );


    setText(
      "totalOrders",
      number(data.totalOrders)
    );


    setText(
      "totalCustomers",
      number(data.totalCustomers)
    );


    setText(
      "stockValue",
      money(data.stockValue)
    );


    setText(
      "profitLoss",
      money(data.profitLoss)
    );


    setText(
      "pendingOrders",
      number(data.pendingOrders)
    );


    setText(
      "lowStockAlerts",
      number(data.lowStock)
    );


    /* -------------------------------
       PROFIT / LOSS
       ------------------------------- */

    const profit =
      Number(
        data.profitLoss || 0
      );


    const profitEl =
      $("profitLoss");


    const profitStatus =
      $("profitLossStatus");


    if (profitEl) {

      profitEl.classList.remove(
        "text-success",
        "text-danger"
      );


      if (profit > 0) {

        profitEl.classList.add(
          "text-success"
        );

      } else if (profit < 0) {

        profitEl.classList.add(
          "text-danger"
        );

      }

    }


    if (profitStatus) {

      profitStatus.textContent =
        profit > 0
          ? "Current Profit"
          : profit < 0
            ? "Current Loss"
            : "Break Even";

    }


    /* -------------------------------
       PURCHASE SUMMARY
       ------------------------------- */

    const summary =
      data.purchaseSummary || {};


    setText(
      "purchaseCount",
      number(summary.count)
    );


    setText(
      "purchasePaid",
      money(summary.paid)
    );


    /* -------------------------------
       TABLES
       ------------------------------- */

    renderRecentOrders(
      data.recentOrders || []
    );


    renderRecentSales(
      data.recentSales || []
    );


    renderLowStock(
      data.lowStockProducts || []
    );


    /* -------------------------------
       CHARTS
       ------------------------------- */

    renderSalesPurchaseChart(
      data.salesPurchase || []
    );


    renderMonthlyRevenueChart(
      data.monthlyRevenue || []
    );

  }


  /* =======================================================
     SET TEXT
     ======================================================= */

  function setText(
    id,
    value
  ) {

    const el =
      $(id);


    if (el) {

      el.textContent =
        value ?? "0";

    }

  }


  /* =======================================================
     RECENT ORDERS
     ======================================================= */

  function renderRecentOrders(
    list
  ) {

    const tbody =
      $("recentOrdersBody");


    if (!tbody) return;


    if (
      !Array.isArray(list) ||
      list.length === 0
    ) {

      tbody.innerHTML = `
        <tr>
          <td colspan="4">
            <div class="empty-state">
              <i class="bi bi-inbox"></i>
              <div>No recent orders found.</div>
            </div>
          </td>
        </tr>
      `;

      return;

    }


    tbody.innerHTML =
      list.map(
        order => `

          <tr>

            <td>
              <strong>
                ${escapeHtml(
                  order.orderId || "-"
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                order.customerName || "-"
              )}
            </td>

            <td>
              <strong>
                ${money(
                  order.totalAmount
                )}
              </strong>
            </td>

            <td>
              ${statusBadge(
                order.status
              )}
            </td>

          </tr>

        `
      ).join("");

  }


  /* =======================================================
     RECENT SALES
     ======================================================= */

  function renderRecentSales(
    list
  ) {

    const tbody =
      $("recentSalesBody");


    if (!tbody) return;


    if (
      !Array.isArray(list) ||
      list.length === 0
    ) {

      tbody.innerHTML = `
        <tr>
          <td colspan="4">
            <div class="empty-state">
              <i class="bi bi-receipt"></i>
              <div>No recent sales found.</div>
            </div>
          </td>
        </tr>
      `;

      return;

    }


    tbody.innerHTML =
      list.map(
        sale => `

          <tr>

            <td>
              <strong>
                ${escapeHtml(
                  sale.saleNo || "-"
                )}
              </strong>
            </td>

            <td>
              <strong>
                ${money(
                  sale.totalAmount
                )}
              </strong>
            </td>

            <td>
              ${date(
                sale.saleDate ||
                sale.createdAt
              )}
            </td>

            <td>
              ${statusBadge(
                sale.status
              )}
            </td>

          </tr>

        `
      ).join("");

  }


  /* =======================================================
     LOW STOCK
     ======================================================= */

  function renderLowStock(
    list
  ) {

    const tbody =
      $("lowStockProductsBody");


    if (!tbody) return;


    if (
      !Array.isArray(list) ||
      list.length === 0
    ) {

      tbody.innerHTML = `
        <tr>
          <td colspan="3">
            <div class="empty-state">
              <i class="bi bi-check-circle"></i>
              <div>All products have healthy stock.</div>
            </div>
          </td>
        </tr>
      `;

      return;

    }


    tbody.innerHTML =
      list.map(
        product => `

          <tr>

            <td>

              <strong>
                ${escapeHtml(
                  product.name || "-"
                )}
              </strong>

              <div class="text-muted">
                ${escapeHtml(
                  product.productCode || ""
                )}
              </div>

            </td>

            <td>

              <strong class="${
                Number(
                  product.currentStock || 0
                ) <= 0
                  ? "text-danger"
                  : "text-warning"
              }">

                ${number(
                  product.currentStock
                )}

              </strong>

            </td>

            <td>

              ${number(
                product.minimumStock
              )}

            </td>

          </tr>

        `
      ).join("");

  }


  /* =======================================================
     SALES VS PURCHASE CHART
     ======================================================= */

  function renderSalesPurchaseChart(
    list
  ) {

    const container =
      $("salesPurchaseChart");


    if (!container) return;


    if (
      !Array.isArray(list) ||
      list.length === 0
    ) {

      container.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-bar-chart"></i>
          <div>No chart data available.</div>
        </div>
      `;

      return;

    }


    const maxValue =
      Math.max(
        1,
        ...list.flatMap(
          item => [
            Number(item.sales || 0),
            Number(item.purchases || 0)
          ]
        )
      );


    container.innerHTML = `

      <div
        style="
          display:flex;
          align-items:flex-end;
          gap:18px;
          height:230px;
          padding:15px 10px 5px;
          overflow-x:auto;
        "
      >

        ${list.map(
          item => {

            const sales =
              Number(
                item.sales || 0
              );


            const purchases =
              Number(
                item.purchases || 0
              );


            const salesHeight =
              Math.max(
                5,
                (sales / maxValue) *
                170
              );


            const purchaseHeight =
              Math.max(
                5,
                (purchases / maxValue) *
                170
              );


            return `

              <div
                style="
                  min-width:70px;
                  height:210px;
                  display:flex;
                  flex-direction:column;
                  justify-content:flex-end;
                  align-items:center;
                "
              >

                <div
                  style="
                    display:flex;
                    align-items:flex-end;
                    gap:5px;
                    height:180px;
                  "
                >

                  <div
                    title="Sales: ${money(sales)}"
                    style="
                      width:18px;
                      height:${salesHeight}px;
                      background:#6c3bff;
                      border-radius:5px 5px 0 0;
                    "
                  ></div>

                  <div
                    title="Purchase: ${money(purchases)}"
                    style="
                      width:18px;
                      height:${purchaseHeight}px;
                      background:#ff5a5f;
                      border-radius:5px 5px 0 0;
                    "
                  ></div>

                </div>

                <div
                  style="
                    margin-top:8px;
                    font-size:11px;
                    font-weight:700;
                    color:#667085;
                  "
                >
                  ${escapeHtml(
                    item.month || "-"
                  )}
                </div>

              </div>

            `;

          }
        ).join("")}

      </div>


      <div
        style="
          display:flex;
          justify-content:center;
          gap:20px;
          margin-top:5px;
          font-size:11px;
          font-weight:700;
        "
      >

        <span>
          <i
            class="bi bi-square-fill"
            style="color:#6c3bff"
          ></i>
          Sales
        </span>

        <span>
          <i
            class="bi bi-square-fill"
            style="color:#ff5a5f"
          ></i>
          Purchases
        </span>

      </div>

    `;

  }


  /* =======================================================
     MONTHLY REVENUE CHART
     ======================================================= */

  function renderMonthlyRevenueChart(
    list
  ) {

    const container =
      $("monthlyRevenueChart");


    if (!container) return;


    if (
      !Array.isArray(list) ||
      list.length === 0
    ) {

      container.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-graph-up"></i>
          <div>No revenue data available.</div>
        </div>
      `;

      return;

    }


    const maxValue =
      Math.max(
        1,
        ...list.map(
          item =>
            Number(
              item.revenue || 0
            )
        )
      );


    container.innerHTML = `

      <div
        style="
          height:230px;
          display:flex;
          align-items:flex-end;
          gap:18px;
          padding:15px 10px 5px;
          overflow-x:auto;
        "
      >

        ${list.map(
          item => {

            const revenue =
              Number(
                item.revenue || 0
              );


            const height =
              Math.max(
                5,
                (revenue / maxValue) *
                175
              );


            return `

              <div
                style="
                  min-width:65px;
                  height:210px;
                  display:flex;
                  flex-direction:column;
                  justify-content:flex-end;
                  align-items:center;
                "
              >

                <div
                  title="${money(revenue)}"
                  style="
                    width:30px;
                    height:${height}px;
                    background:#00b894;
                    border-radius:6px 6px 0 0;
                  "
                ></div>

                <div
                  style="
                    margin-top:8px;
                    font-size:11px;
                    font-weight:700;
                    color:#667085;
                  "
                >
                  ${escapeHtml(
                    item.month || "-"
                  )}
                </div>

              </div>

            `;

          }
        ).join("")}

      </div>


      <div
        style="
          text-align:center;
          margin-top:5px;
          color:#667085;
          font-size:11px;
          font-weight:700;
        "
      >
        Completed Sales Revenue — Last 6 Months
      </div>

    `;

  }


  /* =======================================================
     LOADING
     ======================================================= */

  function setDashboardLoading(
    loading
  ) {

    if (!loading) return;


    [
      "totalSales",
      "totalPurchases",
      "totalOrders",
      "totalCustomers",
      "stockValue",
      "profitLoss",
      "pendingOrders",
      "lowStockAlerts"
    ]
    .forEach(
      id => {

        const el =
          $(id);

        if (el) {

          el.textContent =
            "...";

        }

      }
    );

  }


  /* =======================================================
     ERROR
     ======================================================= */

  function showDashboardError(
    message
  ) {

    console.error(
      "Dashboard Error:",
      message
    );


    const orderBody =
      $("recentOrdersBody");


    const saleBody =
      $("recentSalesBody");


    const stockBody =
      $("lowStockProductsBody");


    if (orderBody) {

      orderBody.innerHTML = `

        <tr>

          <td colspan="4">

            <div class="error-state">

              <i class="bi bi-exclamation-circle"></i>

              <div>
                ${escapeHtml(message)}
              </div>

            </div>

          </td>

        </tr>

      `;

    }


    if (saleBody) {

      saleBody.innerHTML = `

        <tr>

          <td colspan="4">

            <div class="error-state">

              <i class="bi bi-exclamation-circle"></i>

              <div>
                Dashboard data could not be loaded.
              </div>

            </div>

          </td>

        </tr>

      `;

    }


    if (stockBody) {

      stockBody.innerHTML = `

        <tr>

          <td colspan="3">

            <div class="error-state">

              <i class="bi bi-exclamation-circle"></i>

              <div>
                Dashboard data could not be loaded.
              </div>

            </div>

          </td>

        </tr>

      `;

    }

  }


  /* =======================================================
     REFRESH
     ======================================================= */

  function refreshDashboard() {

    loadDashboard();

  }


  window.loadDashboard =
    loadDashboard;


  window.refreshDashboard =
    refreshDashboard;


  /* =======================================================
     INIT
     ======================================================= */

  async function initDashboard() {

    console.log(
      "MIXNBUY.BD Dashboard initializing..."
    );


    if (
      typeof admin.setPageTitle ===
      "function"
    ) {

      admin.setPageTitle(
        "Dashboard",
        "Live business overview"
      );

    }


    if (
      typeof admin.renderAdminProfile ===
      "function"
    ) {

      admin.renderAdminProfile();

    }


    await loadDashboard();

  }


  /* =======================================================
     AUTO REFRESH
     ======================================================= */

  let refreshTimer = null;


  function startAutoRefresh() {

    if (refreshTimer) {

      clearInterval(
        refreshTimer
      );

    }


    refreshTimer =
      setInterval(
        () => {

          if (
            document.visibilityState ===
            "visible"
          ) {

            loadDashboard();

          }

        },
        30000
      );

  }


  /* =======================================================
     ONLINE / OFFLINE
     ======================================================= */

  window.addEventListener(
    "online",
    () => {

      console.log(
        "Internet connection restored."
      );

      loadDashboard();

    }
  );


  window.addEventListener(
    "offline",
    () => {

      console.warn(
        "Internet connection lost."
      );

    }
  );


  /* =======================================================
     DOM READY
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      async () => {

        await initDashboard();

        startAutoRefresh();

      }
    );

  } else {

    initDashboard();

    startAutoRefresh();

  }


})();