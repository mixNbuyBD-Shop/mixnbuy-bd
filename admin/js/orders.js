/* =========================================================
   MIXNBUY.BD — ORDERS ADMIN
   File: admin/js/orders.js
   ========================================================= */

(function () {
  "use strict";

  /* =========================================================
     GLOBALS
     ========================================================= */

  const $ = (id) => document.getElementById(id);

  const admin = window.MIXNBUY_ADMIN || {};

  let allOrders = [];
  let filteredOrders = [];
  let selectedStatusOrder = null;


  /* =========================================================
     ORDER STATUS FLOW
     ========================================================= */

  const STATUS_FLOW = {
    pending: ["confirmed", "cancelled"],

    confirmed: [
      "processing",
      "cancelled"
    ],

    processing: [
      "shipped",
      "cancelled"
    ],

    shipped: [
      "delivered",
      "returned"
    ],

    delivered: [
      "returned"
    ],

    cancelled: [],

    returned: []
  };


  /* =========================================================
     SUPABASE CLIENT
     ========================================================= */

  function getClient() {
    return (
      window.supabaseClient ||
      window.supabase ||
      null
    );
  }


  /* =========================================================
     HELPERS
     ========================================================= */

  function escapeHtml(value) {

    if (
      typeof admin.escapeHtml === "function"
    ) {
      return admin.escapeHtml(value);
    }

    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  function money(value) {

    const number = Number(value || 0);

    if (
      typeof admin.formatMoney === "function"
    ) {
      return admin.formatMoney(number);
    }

    return (
      "BDT " +
      number.toLocaleString("en-BD", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
  }


  function numberFormat(value) {

    return Number(value || 0)
      .toLocaleString("en-BD");
  }


  function formatDate(
    value,
    includeTime = false
  ) {

    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      return "-";
    }

    const options = {
      day: "2-digit",
      month: "short",
      year: "numeric"
    };

    if (includeTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
    }

    return date.toLocaleDateString(
      "en-GB",
      options
    );
  }


  function normalize(value) {

    return String(value || "")
      .trim()
      .toLowerCase();
  }


  function statusLabel(value) {

    const status = normalize(value);

    if (!status) {
      return "-";
    }

    return (
      status.charAt(0).toUpperCase() +
      status.slice(1)
    );
  }


  /* =========================================================
     STATUS BADGES
     ========================================================= */

  function statusBadge(status) {

    const normalized =
      normalize(status);

    return `
      <span class="order-status-badge status-${escapeHtml(
        normalized
      )}">
        ${escapeHtml(
          statusLabel(status)
        )}
      </span>
    `;
  }


  function paymentBadge(status) {

    const normalized =
      normalize(status);

    let className =
      "payment-pending";

    if (normalized === "paid") {
      className =
        "payment-paid";
    }

    else if (
      normalized === "partial"
    ) {
      className =
        "payment-partial";
    }

    else if (
      normalized === "failed"
    ) {
      className =
        "payment-failed";
    }

    return `
      <span class="payment-status-badge ${className}">
        ${escapeHtml(
          statusLabel(status)
        )}
      </span>
    `;
  }


  /* =========================================================
     MODAL HELPERS
     ========================================================= */

  function openModal(id) {

    const element = $(id);

    if (!element) {
      return;
    }

    element.classList.add("is-open");

    element.setAttribute(
      "aria-hidden",
      "false"
    );
  }


  function closeModal(id) {

    const element = $(id);

    if (!element) {
      return;
    }

    element.classList.remove(
      "is-open"
    );

    element.setAttribute(
      "aria-hidden",
      "true"
    );
  }


  /* =========================================================
     TOAST
     ========================================================= */

  function showToast(
    message,
    type = "success"
  ) {

    const element =
      $("ordersToast");

    if (!element) {
      return;
    }

    element.textContent =
      message;

    element.className =
      `orders-toast ${type} show`;

    clearTimeout(
      element._timer
    );

    element._timer =
      setTimeout(() => {

        element.classList.remove(
          "show"
        );

      }, 3200);
  }


  /* =========================================================
     TABLE MESSAGE
     ========================================================= */

  function showTableMessage(
    message,
    icon = "bi-info-circle"
  ) {

    const body =
      $("ordersTableBody");

    if (!body) {
      return;
    }

    body.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="orders-state">

            <i class="bi ${escapeHtml(
              icon
            )}"></i>

            <div>
              ${escapeHtml(message)}
            </div>

          </div>
        </td>
      </tr>
    `;
  }


  /* =========================================================
     NEXT STATUS
     ========================================================= */

  function getNextStatuses(
    currentStatus
  ) {

    return (
      STATUS_FLOW[
        normalize(currentStatus)
      ] || []
    );
  }


  /* =========================================================
     DASHBOARD STATS
     ========================================================= */

  function updateStats() {

    const pendingCount =
      allOrders.filter(
        (order) =>
          normalize(order.status) ===
          "pending"
      ).length;


    const activeCount =
      allOrders.filter(
        (order) =>
          [
            "confirmed",
            "processing",
            "shipped"
          ].includes(
            normalize(order.status)
          )
      ).length;


    const totalValue =
      allOrders.reduce(
        (total, order) =>
          total +
          Number(
            order.total_amount || 0
          ),
        0
      );


    if ($("totalOrders")) {
      $("totalOrders").textContent =
        numberFormat(
          allOrders.length
        );
    }


    if ($("pendingOrders")) {
      $("pendingOrders").textContent =
        numberFormat(
          pendingCount
        );
    }


    if ($("activeOrders")) {
      $("activeOrders").textContent =
        numberFormat(
          activeCount
        );
    }


    if ($("orderValue")) {
      $("orderValue").textContent =
        money(totalValue);
    }
  }


  /* =========================================================
     FILTER ORDERS
     ========================================================= */

  function filterOrders() {

    const search =
      normalize(
        $("orderSearch")?.value
      );


    const status =
      normalize(
        $("statusFilter")?.value ||
        "all"
      );


    filteredOrders =
      allOrders.filter(
        (order) => {

          const statusMatch =
            status === "all" ||
            normalize(
              order.status
            ) === status;


          const searchText = [

            order.order_id,

            order.customer_name,

            order.customer_phone,

            order.email,

            order.address,

            order.city,

            order.district,

            order.status,

            order.payment_status

          ]
            .map(normalize)
            .join(" ");


          const searchMatch =
            !search ||
            searchText.includes(
              search
            );


          return (
            statusMatch &&
            searchMatch
          );
        }
      );


    renderOrders();
  }


  /* =========================================================
     RENDER ORDERS
     ========================================================= */

  function renderOrders() {

    const body =
      $("ordersTableBody");

    if (!body) {
      return;
    }


    if ($("ordersResultCount")) {

      $("ordersResultCount")
        .textContent =
        `${numberFormat(
          filteredOrders.length
        )} ${
          filteredOrders.length === 1
            ? "order"
            : "orders"
        }`;
    }


    if (!filteredOrders.length) {

      showTableMessage(
        "No orders found for the selected filters.",
        "bi-search"
      );

      return;
    }


    body.innerHTML =
      filteredOrders
        .map((order) => {

          const nextStatuses =
            getNextStatuses(
              order.status
            );


          return `
            <tr>

              <!-- Order ID -->
              <td>
                <span class="order-id-cell">
                  ${escapeHtml(
                    order.order_id || "-"
                  )}
                </span>
              </td>


              <!-- Customer -->
              <td>

                <div>

                  <div class="order-customer-name">
                    ${escapeHtml(
                      order.customer_name ||
                      "Walk-in Customer"
                    )}
                  </div>

                  ${
                    order.address
                      ? `
                        <div class="order-customer-address">
                          ${escapeHtml(
                            order.address
                          )}
                        </div>
                      `
                      : ""
                  }

                </div>

              </td>


              <!-- Phone -->
              <td>
                ${escapeHtml(
                  order.customer_phone ||
                  "-"
                )}
              </td>


              <!-- Date -->
              <td>
                ${formatDate(
                  order.created_at
                )}
              </td>


              <!-- Items -->
              <td>

                <span class="order-items-count">

                  <i class="bi bi-bag"></i>

                  ${numberFormat(
                    order._item_count
                  )}

                </span>

              </td>


              <!-- Total -->
              <td>

                <span class="order-total">
                  ${money(
                    order.total_amount
                  )}
                </span>

              </td>


              <!-- Payment -->
              <td>
                ${paymentBadge(
                  order.payment_status
                )}
              </td>


              <!-- Status -->
              <td>
                ${statusBadge(
                  order.status
                )}
              </td>


              <!-- Actions -->
              <td>

                <div class="order-action-group">

                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    data-view-order="${escapeHtml(
                      order.id
                    )}"
                  >

                    <i class="bi bi-eye"></i>

                    View

                  </button>


                  ${
                    nextStatuses.length
                      ? `
                        <button
                          type="button"
                          class="btn btn-primary btn-sm"
                          data-status-order="${escapeHtml(
                            order.id
                          )}"
                        >

                          <i class="bi bi-arrow-repeat"></i>

                          Status

                        </button>
                      `
                      : ""
                  }

                </div>

              </td>

            </tr>
          `;
        })
        .join("");
  }


  /* =========================================================
     LOAD ORDER ITEM COUNTS
     ========================================================= */

  async function loadItemCounts() {

    const client =
      getClient();

    if (
      !client ||
      !allOrders.length
    ) {
      return;
    }


    const orderIds =
      allOrders
        .map(
          (order) => order.id
        )
        .filter(Boolean);


    const {
      data,
      error
    } = await client
      .from("order_items")
      .select(
        "order_id,quantity"
      )
      .in(
        "order_id",
        orderIds
      );


    if (error) {

      console.warn(
        "Order item count error:",
        error
      );

      return;
    }


    const countMap =
      new Map();


    (data || []).forEach(
      (item) => {

        const current =
          countMap.get(
            item.order_id
          ) || 0;


        countMap.set(
          item.order_id,
          current +
            Number(
              item.quantity || 0
            )
        );
      }
    );


    allOrders.forEach(
      (order) => {

        order._item_count =
          countMap.get(
            order.id
          ) || 0;
      }
    );
  }


  /* =========================================================
     LOAD ORDERS
     ========================================================= */

  async function loadOrders() {

    const client =
      getClient();


    if (!client) {

      showTableMessage(
        "Supabase client is not initialized.",
        "bi-database-x"
      );

      return;
    }


    showTableMessage(
      "Loading orders...",
      "bi-arrow-repeat"
    );


    try {

      const {
        data,
        error
      } = await client
        .from("orders")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        )
        .limit(500);


      if (error) {
        throw error;
      }


      allOrders =
        Array.isArray(data)
          ? data
          : [];


      await loadItemCounts();


      updateStats();

      filterOrders();


    }

    catch (error) {

      console.error(
        "Orders load error:",
        error
      );


      allOrders = [];

      updateStats();


      showTableMessage(
        error?.message ||
        "Failed to load orders.",
        "bi-exclamation-triangle"
      );
    }
  }


  /* =========================================================
     LOAD ORDER ITEMS
     ========================================================= */

  async function loadOrderItems(
    orderId
  ) {

    const client =
      getClient();


    const {
      data,
      error
    } = await client
      .from("order_items")
      .select(`
        id,
        product_name,
        sku,
        quantity,
        purchase_price,
        selling_price,
        discount,
        total_amount,
        created_at
      `)
      .eq(
        "order_id",
        orderId
      )
      .order(
        "created_at",
        {
          ascending: true
        }
      );


    if (error) {
      throw error;
    }


    return data || [];
  }


  /* =========================================================
     LOAD ORDER STATUS HISTORY
     ========================================================= */

  async function loadStatusHistory(
    orderId
  ) {

    const client =
      getClient();


    const {
      data,
      error
    } = await client
      .from(
        "order_status_history"
      )
      .select(`
        id,
        old_status,
        new_status,
        note,
        changed_by,
        changed_at
      `)
      .eq(
        "order_id",
        orderId
      )
      .order(
        "changed_at",
        {
          ascending: false
        }
      );


    if (error) {

      console.warn(
        "Status history error:",
        error
      );

      return [];
    }


    return data || [];
  }


  /* =========================================================
     VIEW ORDER DETAILS
     ========================================================= */

  async function viewOrder(
    orderId
  ) {

    const client =
      getClient();


    if (!client) {

      showToast(
        "Supabase client is not initialized.",
        "error"
      );

      return;
    }


    openModal(
      "orderDetailsModal"
    );


    const body =
      $("orderDetailsBody");


    if (!body) {
      return;
    }


    body.innerHTML = `
      <div class="orders-state">

        <i class="bi bi-arrow-repeat"></i>

        <div>
          Loading order details...
        </div>

      </div>
    `;


    try {

      const {
        data: order,
        error
      } = await client
        .from("orders")
        .select("*")
        .eq(
          "id",
          orderId
        )
        .maybeSingle();


      if (error) {
        throw error;
      }


      if (!order) {
        throw new Error(
          "Order not found."
        );
      }


      const [
        items,
        history
      ] = await Promise.all([

        loadOrderItems(
          orderId
        ),

        loadStatusHistory(
          orderId
        )

      ]);


      renderOrderDetails(
        order,
        items,
        history
      );


    }

    catch (error) {

      console.error(
        "Order details error:",
        error
      );


      body.innerHTML = `
        <div class="orders-state error">

          <i class="bi bi-exclamation-triangle"></i>

          <div>
            ${escapeHtml(
              error?.message ||
              "Failed to load order details."
            )}
          </div>

        </div>
      `;
    }
  }


  /* =========================================================
     RENDER ORDER DETAILS
     ========================================================= */

  function renderOrderDetails(
    order,
    items,
    history
  ) {

    const body =
      $("orderDetailsBody");


    if (!body) {
      return;
    }


    const total =
      Number(
        order.total_amount || 0
      );


    const address = [
      order.address,
      order.city,
      order.district,
      order.postal_code

    ]
      .filter(Boolean)
      .join(", ");


    body.innerHTML = `

      <!-- =========================================
           ORDER INFORMATION
           ========================================= -->

      <div class="order-detail-grid">

        <div class="order-detail-box">
          <div class="order-detail-label">
            Order ID
          </div>

          <div class="order-detail-value">
            ${escapeHtml(
              order.order_id || "-"
            )}
          </div>
        </div>


        <div class="order-detail-box">
          <div class="order-detail-label">
            Date
          </div>

          <div class="order-detail-value">
            ${formatDate(
              order.created_at,
              true
            )}
          </div>
        </div>


        <div class="order-detail-box">
          <div class="order-detail-label">
            Customer
          </div>

          <div class="order-detail-value">
            ${escapeHtml(
              order.customer_name ||
              "Walk-in Customer"
            )}
          </div>
        </div>


        <div class="order-detail-box">
          <div class="order-detail-label">
            Phone
          </div>

          <div class="order-detail-value">
            ${escapeHtml(
              order.customer_phone ||
              "-"
            )}
          </div>
        </div>


        <div class="order-detail-box">
          <div class="order-detail-label">
            Payment
          </div>

          <div class="order-detail-value">
            ${escapeHtml(
              statusLabel(
                order.payment_method
              )
            )}
          </div>
        </div>


        <div class="order-detail-box">
          <div class="order-detail-label">
            Payment Status
          </div>

          <div class="order-detail-value">
            ${paymentBadge(
              order.payment_status
            )}
          </div>
        </div>


        <div class="order-detail-box">
          <div class="order-detail-label">
            Status
          </div>

          <div class="order-detail-value">
            ${statusBadge(
              order.status
            )}
          </div>
        </div>


        <div class="order-detail-box">
          <div class="order-detail-label">
            Email
          </div>

          <div class="order-detail-value">
            ${escapeHtml(
              order.email || "-"
            )}
          </div>
        </div>

      </div>


      <!-- =========================================
           DELIVERY ADDRESS
           ========================================= -->

      <div class="order-detail-section">

        <div class="order-detail-section-title">
          Delivery Address
        </div>


        <div class="order-address-box">
          ${escapeHtml(
            address || "-"
          )}
        </div>

      </div>


      <!-- =========================================
           ORDERED PRODUCTS
           ========================================= -->

      <div class="order-detail-section">

        <div class="order-detail-section-title">
          Ordered Products
        </div>


        <div class="order-detail-table-wrap">

          <table class="order-detail-table">

            <thead>

              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Discount</th>
                <th>Total</th>
              </tr>

            </thead>


            <tbody>

              ${
                items.length
                  ? items
                      .map(
                        (item) => `
                          <tr>

                            <td>
                              <strong>
                                ${escapeHtml(
                                  item.product_name ||
                                  "-"
                                )}
                              </strong>
                            </td>

                            <td>
                              ${escapeHtml(
                                item.sku ||
                                "-"
                              )}
                            </td>

                            <td>
                              ${numberFormat(
                                item.quantity
                              )}
                            </td>

                            <td>
                              ${money(
                                item.selling_price
                              )}
                            </td>

                            <td>
                              ${money(
                                item.discount
                              )}
                            </td>

                            <td>
                              <strong>
                                ${money(
                                  item.total_amount
                                )}
                              </strong>
                            </td>

                          </tr>
                        `
                      )
                      .join("")
                  : `
                    <tr>
                      <td colspan="6">
                        No order items found.
                      </td>
                    </tr>
                  `
              }

            </tbody>

          </table>

        </div>


        <!-- =====================================
             ORDER TOTAL
             ===================================== -->

        <div class="order-detail-total-box">

          <div class="order-total-summary">

            <div class="summary-row">
              <span>Subtotal</span>

              <strong>
                ${money(
                  order.subtotal
                )}
              </strong>
            </div>


            <div class="summary-row">
              <span>Discount</span>

              <strong>
                - ${money(
                  order.discount
                )}
              </strong>
            </div>


            <div class="summary-row">
              <span>Delivery</span>

              <strong>
                ${money(
                  order.delivery_charge
                )}
              </strong>
            </div>


            <div class="summary-row">
              <span>Other</span>

              <strong>
                ${money(
                  order.other_charge
                )}
              </strong>
            </div>


            <div class="summary-row total">

              <span>
                Total
              </span>

              <strong>
                ${money(total)}
              </strong>

            </div>

          </div>

        </div>

      </div>


      <!-- =========================================
           ORDER NOTE
           ========================================= -->

      ${
        order.note
          ? `
            <div class="order-detail-section">

              <div class="order-detail-section-title">
                Order Note
              </div>

              <div class="order-note-box">
                ${escapeHtml(
                  order.note
                )}
              </div>

            </div>
          `
          : ""
      }


      <!-- =========================================
           STATUS HISTORY
           ========================================= -->

      <div class="order-detail-section">

        <div class="order-detail-section-title">
          Status History
        </div>


        ${
          history.length
            ? `
              <div class="order-timeline">

                ${history
                  .map(
                    (item) => `
                      <div class="timeline-item">

                        <div class="timeline-dot"></div>


                        <div class="timeline-title">

                          ${escapeHtml(
                            statusLabel(
                              item.old_status
                            )
                          )}

                          →

                          ${escapeHtml(
                            statusLabel(
                              item.new_status
                            )
                          )}

                        </div>


                        <div class="timeline-meta">

                          ${formatDate(
                            item.changed_at,
                            true
                          )}

                        </div>


                        ${
                          item.note
                            ? `
                              <div class="timeline-note">
                                ${escapeHtml(
                                  item.note
                                )}
                              </div>
                            `
                            : ""
                        }

                      </div>
                    `
                  )
                  .join("")}

              </div>
            `
            : `
              <div class="order-note-box">
                No status history recorded yet.
              </div>
            `
        }

      </div>

    `;
  }


  /* =========================================================
     OPEN STATUS MODAL
     ========================================================= */

  function openStatusModal(
    orderId
  ) {

    const order =
      allOrders.find(
        (item) =>
          item.id === orderId
      );


    if (!order) {

      showToast(
        "Order not found.",
        "error"
      );

      return;
    }


    const nextStatuses =
      getNextStatuses(
        order.status
      );


    if (!nextStatuses.length) {

      showToast(
        `Order ${
          order.order_id
        } has no further status changes.`,
        "error"
      );

      return;
    }


    selectedStatusOrder =
      order;


    if ($("currentStatusText")) {

      $("currentStatusText")
        .innerHTML =
        statusBadge(
          order.status
        );
    }


    if ($("statusOrderLabel")) {

      $("statusOrderLabel")
        .textContent =
        `Order ${
          order.order_id
        } — choose the next valid status.`;
    }


    if ($("newOrderStatus")) {

      $("newOrderStatus")
        .innerHTML =
        nextStatuses
          .map(
            (status) => `
              <option value="${escapeHtml(
                status
              )}">
                ${escapeHtml(
                  statusLabel(status)
                )}
              </option>
            `
          )
          .join("");
    }


    if ($("statusNote")) {
      $("statusNote").value = "";
    }


    openModal(
      "statusModal"
    );
  }


  /* =========================================================
     SAVE ORDER STATUS
     ========================================================= */

  async function saveOrderStatus() {

    const order =
      selectedStatusOrder;


    if (!order) {
      return;
    }


    const newStatus =
      normalize(
        $("newOrderStatus")?.value
      );


    const allowedStatuses =
      getNextStatuses(
        order.status
      );


    const note =
      $("statusNote")?.value
        ?.trim() || null;


    if (
      !allowedStatuses.includes(
        newStatus
      )
    ) {

      showToast(
        "Invalid status transition.",
        "error"
      );

      return;
    }


    const client =
      getClient();


    if (!client) {

      showToast(
        "Supabase client is not initialized.",
        "error"
      );

      return;
    }


    const button =
      $("saveStatusBtn");


    if (button) {

      button.disabled = true;

      button.innerHTML = `
        <i class="bi bi-arrow-repeat"></i>
        Updating...
      `;
    }


    try {

      const oldStatus =
        normalize(
          order.status
        );


      /* -----------------------------------------
         UPDATE ORDER
         ----------------------------------------- */

      const {
        data: updatedOrder,
        error
      } = await client
        .from("orders")
        .update({

          status: newStatus,

          updated_at:
            new Date().toISOString()

        })
        .eq(
          "id",
          order.id
        )
        .select("*")
        .single();


      if (error) {
        throw error;
      }


      /* -----------------------------------------
         CURRENT USER
         ----------------------------------------- */

      let userId = null;


      try {

        const {
          data
        } =
          await client.auth.getUser();


        userId =
          data?.user?.id ||
          null;

      }

      catch (error) {

        console.warn(
          "Could not get current user:",
          error
        );
      }


      /* -----------------------------------------
         STATUS HISTORY
         ----------------------------------------- */

      const {
        error: historyError
      } = await client
        .from(
          "order_status_history"
        )
        .insert({

          order_id:
            order.id,

          old_status:
            oldStatus,

          new_status:
            newStatus,

          note:
            note,

          changed_by:
            userId,

          changed_at:
            new Date().toISOString()

        });


      if (historyError) {

        console.warn(
          "Order updated but history insert failed:",
          historyError
        );
      }


      /* -----------------------------------------
         UPDATE LOCAL DATA
         ----------------------------------------- */

      const index =
        allOrders.findIndex(
          (item) =>
            item.id ===
            order.id
        );


      if (index >= 0) {

        updatedOrder._item_count =
          order._item_count;

        allOrders[index] =
          updatedOrder;
      }


      closeModal(
        "statusModal"
      );


      updateStats();

      filterOrders();


      showToast(
        `Order ${
          order.order_id
        } updated to ${
          statusLabel(
            newStatus
          )
        }.`
      );


      /* -----------------------------------------
         REFRESH DETAIL MODAL
         ----------------------------------------- */

      await viewOrder(
        order.id
      );

    }

    catch (error) {

      console.error(
        "Order status update error:",
        error
      );


      showToast(
        error?.message ||
        "Failed to update order status.",
        "error"
      );

    }

    finally {

      if (button) {

        button.disabled =
          false;

        button.innerHTML = `
          <i class="bi bi-check2-circle"></i>
          Update Status
        `;
      }
    }
  }


  /* =========================================================
     EVENT BINDING
     ========================================================= */

  function bindEvents() {

    /* Refresh */

    $("refreshOrdersBtn")
      ?.addEventListener(
        "click",
        loadOrders
      );


    /* Search */

    $("orderSearch")
      ?.addEventListener(
        "input",
        filterOrders
      );


    /* Status filter */

    $("statusFilter")
      ?.addEventListener(
        "change",
        filterOrders
      );


    /* Table buttons */

    $("ordersTableBody")
      ?.addEventListener(
        "click",
        (event) => {

          const viewButton =
            event.target.closest(
              "[data-view-order]"
            );


          const statusButton =
            event.target.closest(
              "[data-status-order]"
            );


          if (viewButton) {

            viewOrder(
              viewButton.dataset
                .viewOrder
            );

            return;
          }


          if (statusButton) {

            openStatusModal(
              statusButton.dataset
                .statusOrder
            );
          }
        }
      );


    /* Close order details */

    document.addEventListener(
      "click",
      (event) => {

        if (
          event.target.closest(
            "[data-close-order-modal]"
          )
        ) {

          closeModal(
            "orderDetailsModal"
          );
        }


        if (
          event.target.closest(
            "[data-close-status-modal]"
          )
        ) {

          closeModal(
            "statusModal"
          );
        }
      }
    );


    /* Update Status */

    $("saveStatusBtn")
      ?.addEventListener(
        "click",
        saveOrderStatus
      );


    /* ESC */

    document.addEventListener(
      "keydown",
      (event) => {

        if (
          event.key === "Escape"
        ) {

          closeModal(
            "orderDetailsModal"
          );

          closeModal(
            "statusModal"
          );
        }
      }
    );
  }


  /* =========================================================
     INITIALIZE
     ========================================================= */

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      bindEvents();

      loadOrders();
    }
  );


  /* =========================================================
     PUBLIC API
     ========================================================= */

  window.MIXNBUY_ORDERS = {

    load:
      loadOrders,

    view:
      viewOrder,

    openStatus:
      openStatusModal

  };

})();