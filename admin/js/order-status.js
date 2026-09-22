/* =========================================================
   MIXNBUY.BD — ORDER STATUS / TRACKING
   File: admin/js/order-status.js
   ========================================================= */

(function () {

  "use strict";


  /* =======================================================
     HELPERS
     ======================================================= */

  const $ = (id) =>
    document.getElementById(id);


  let currentOrder = null;
  let currentItems = [];
  let currentHistory = [];


  function getClient() {

    return (
      window.supabaseClient ||
      window.supabase ||
      null
    );

  }


  function escapeHtml(value) {

    if (
      window.MIXNBUY_ADMIN &&
      typeof window.MIXNBUY_ADMIN.escapeHtml === "function"
    ) {
      return window.MIXNBUY_ADMIN.escapeHtml(value);
    }

    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }


  function money(value) {

    const amount =
      Number(value || 0);

    if (
      window.MIXNBUY_ADMIN &&
      typeof window.MIXNBUY_ADMIN.formatMoney === "function"
    ) {
      return window.MIXNBUY_ADMIN.formatMoney(
        amount
      );
    }

    return (
      "BDT " +
      amount.toLocaleString(
        "en-BD",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )
    );

  }


  function formatDate(
    value,
    withTime = false
  ) {

    if (!value) {
      return "-";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "-";
    }

    const options = {
      day: "2-digit",
      month: "short",
      year: "numeric"
    };

    if (withTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
    }

    return date.toLocaleDateString(
      "en-GB",
      options
    );

  }


  function normalize(value) {

    return String(
      value || ""
    )
      .trim()
      .toLowerCase();

  }


  function statusLabel(value) {

    const status =
      normalize(value);

    if (!status) {
      return "-";
    }

    return (
      status.charAt(0).toUpperCase() +
      status.slice(1)
    );

  }


  function showToast(
    message,
    type = "success"
  ) {

    const toast =
      $("trackingToast");

    if (!toast) {
      return;
    }

    toast.textContent =
      message;

    toast.className =
      `tracking-toast ${type} show`;

    clearTimeout(
      toast._timer
    );

    toast._timer =
      setTimeout(() => {

        toast.classList.remove(
          "show"
        );

      }, 3200);

  }


  /* =======================================================
     STATUS HELPERS
     ======================================================= */

  const STATUS_FLOW = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered"
  ];


  function renderStatusBadge(
    status
  ) {

    const normalized =
      normalize(status);

    let icon =
      "bi-hourglass-split";

    if (
      normalized === "confirmed"
    ) {
      icon = "bi-check-circle";
    }

    if (
      normalized === "processing"
    ) {
      icon = "bi-box-seam";
    }

    if (
      normalized === "shipped"
    ) {
      icon = "bi-truck";
    }

    if (
      normalized === "delivered"
    ) {
      icon = "bi-check2-circle";
    }

    if (
      normalized === "cancelled"
    ) {
      icon = "bi-x-circle";
    }

    if (
      normalized === "returned"
    ) {
      icon = "bi-arrow-return-left";
    }

    return `
      <span class="
        tracking-status-badge
        ${escapeHtml(normalized)}
      ">
        <i class="bi ${icon}"></i>
        ${escapeHtml(
          statusLabel(status)
        )}
      </span>
    `;

  }


  function renderProgress(
    currentStatus
  ) {

    const status =
      normalize(currentStatus);

    const currentIndex =
      STATUS_FLOW.indexOf(status);

    if (
      status === "cancelled"
    ) {

      return `
        <div class="special-status-box cancelled">

          <i class="bi bi-x-circle-fill"></i>

          <div>
            <strong>Order Cancelled</strong>

            <span>
              This order has been cancelled.
            </span>
          </div>

        </div>
      `;

    }


    if (
      status === "returned"
    ) {

      return `
        <div class="special-status-box returned">

          <i class="bi bi-arrow-return-left"></i>

          <div>
            <strong>Order Returned</strong>

            <span>
              This order has been returned.
            </span>
          </div>

        </div>
      `;

    }


    let progress =
      0;

    if (
      currentIndex > 0
    ) {

      progress =
        (
          currentIndex /
          (STATUS_FLOW.length - 1)
        ) * 100;

    }


    const icons = {
      pending:
        "bi-hourglass-split",

      confirmed:
        "bi-check-circle",

      processing:
        "bi-box-seam",

      shipped:
        "bi-truck",

      delivered:
        "bi-check2-circle"
    };


    return `
      <div class="status-progress">

        <div class="status-progress-line">

          <div
            class="status-progress-line-fill"
            style="width:${progress}%"
          ></div>

        </div>


        ${STATUS_FLOW.map(
          (
            step,
            index
          ) => {

            let className = "";

            if (
              index <
              currentIndex
            ) {
              className =
                "completed";
            }

            if (
              index ===
              currentIndex
            ) {
              className =
                "current";
            }

            return `
              <div
                class="
                  status-progress-step
                  ${className}
                "
              >

                <div class="status-progress-dot">

                  <i class="
                    bi
                    ${icons[step]}
                  "></i>

                </div>

                <div class="status-progress-label">
                  ${escapeHtml(
                    statusLabel(step)
                  )}
                </div>

              </div>
            `;

          }
        ).join("")}

      </div>
    `;

  }


  /* =======================================================
     SEARCH
     ======================================================= */

  async function searchOrder() {

    const input =
      $("orderIdInput");

    if (!input) {
      return;
    }

    const orderId =
      input.value.trim();

    if (!orderId) {

      showToast(
        "Please enter an Order ID.",
        "error"
      );

      input.focus();

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


    const result =
      $("trackingResult");

    if (result) {

      result.innerHTML = `
        <div class="tracking-loading">

          <i class="bi bi-arrow-repeat"></i>

          <span>
            Searching order...
          </span>

        </div>
      `;

    }


    const hint =
      $("searchHint");

    if (hint) {

      hint.textContent =
        `Searching for ${orderId}...`;

    }


    try {

      const {
        data: order,
        error
      } = await client
        .from("orders")
        .select("*")
        .ilike(
          "order_id",
          orderId
        )
        .maybeSingle();


      if (error) {
        throw error;
      }


      if (!order) {

        renderNotFound(
          orderId
        );

        return;
      }


      currentOrder =
        order;


      const [
        items,
        history
      ] =
        await Promise.all([
          loadOrderItems(
            order.id
          ),
          loadStatusHistory(
            order.id
          )
        ]);


      currentItems =
        items;

      currentHistory =
        history;


      renderOrder(
        order,
        items,
        history
      );


      if (hint) {

        hint.textContent =
          `Order found: ${order.order_id}`;

      }


    } catch (error) {

      console.error(
        "Order tracking error:",
        error
      );


      renderError(
        error?.message ||
        "Failed to search order."
      );

    }

  }


  /* =======================================================
     LOAD ORDER ITEMS
     ======================================================= */

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
        product_id,
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


  /* =======================================================
     LOAD STATUS HISTORY
     ======================================================= */

  async function loadStatusHistory(
    orderId
  ) {

    const client =
      getClient();


    const {
      data,
      error
    } = await client
      .from("order_status_history")
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
          ascending: true
        }
      );


    if (error) {

      console.warn(
        "Order history error:",
        error
      );

      return [];

    }


    return data || [];

  }


  /* =======================================================
     RENDER ORDER
     ======================================================= */

  function renderOrder(
    order,
    items,
    history
  ) {

    const result =
      $("trackingResult");

    if (!result) {
      return;
    }


    const address = [
      order.address,
      order.city,
      order.district,
      order.postal_code
    ]
      .filter(Boolean)
      .join(", ");


    const itemCount =
      items.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.quantity || 0
          ),
        0
      );


    result.innerHTML = `

      <div class="tracking-result">


        <!-- ORDER HEADER -->
        <div class="tracking-order-header">

          <div>

            <div class="tracking-order-id-label">
              Order ID
            </div>

            <h2 class="tracking-order-id">
              ${escapeHtml(
                order.order_id ||
                "-"
              )}
            </h2>

            <div class="tracking-order-date">
              Placed on
              ${formatDate(
                order.created_at,
                true
              )}
            </div>

          </div>


          <div>

            ${renderStatusBadge(
              order.status
            )}

          </div>

        </div>


        <!-- SUMMARY -->
        <div class="tracking-summary-grid">


          <div class="tracking-summary-card">

            <div class="tracking-summary-label">
              Customer
            </div>

            <div class="tracking-summary-value">
              ${escapeHtml(
                order.customer_name ||
                "Walk-in Customer"
              )}
            </div>

            <div class="tracking-summary-sub">
              ${escapeHtml(
                order.customer_phone ||
                "-"
              )}
            </div>

          </div>


          <div class="tracking-summary-card">

            <div class="tracking-summary-label">
              Items
            </div>

            <div class="tracking-summary-value">
              ${itemCount}
            </div>

            <div class="tracking-summary-sub">
              Product quantity
            </div>

          </div>


          <div class="tracking-summary-card">

            <div class="tracking-summary-label">
              Payment
            </div>

            <div class="tracking-summary-value">
              ${escapeHtml(
                statusLabel(
                  order.payment_status
                )
              )}
            </div>

            <div class="tracking-summary-sub">
              ${escapeHtml(
                statusLabel(
                  order.payment_method
                )
              )}
            </div>

          </div>


          <div class="tracking-summary-card">

            <div class="tracking-summary-label">
              Order Total
            </div>

            <div class="tracking-summary-value">
              ${money(
                order.total_amount
              )}
            </div>

            <div class="tracking-summary-sub">
              Including delivery
            </div>

          </div>


        </div>


        <!-- STATUS -->
        <div class="tracking-card">

          <div class="tracking-card-title">

            <h3>
              Order Status
            </h3>

            <p>
              Current delivery progress
            </p>

          </div>

          ${renderProgress(
            order.status
          )}

        </div>


        <!-- CUSTOMER + DELIVERY -->
        <div class="info-grid">


          <div class="info-section">

            <div class="info-section-title">
              Customer Information
            </div>


            <div class="info-row">

              <span class="info-label">
                Name
              </span>

              <span class="info-value">
                ${escapeHtml(
                  order.customer_name ||
                  "-"
                )}
              </span>

            </div>


            <div class="info-row">

              <span class="info-label">
                Phone
              </span>

              <span class="info-value">
                ${escapeHtml(
                  order.customer_phone ||
                  "-"
                )}
              </span>

            </div>


            <div class="info-row">

              <span class="info-label">
                Email
              </span>

              <span class="info-value">
                ${escapeHtml(
                  order.email ||
                  "-"
                )}
              </span>

            </div>


          </div>


          <div class="info-section">

            <div class="info-section-title">
              Delivery Information
            </div>


            <div class="info-row">

              <span class="info-label">
                Address
              </span>

              <span class="
                info-value
                address-value
              ">
                ${escapeHtml(
                  address ||
                  "-"
                )}
              </span>

            </div>


            <div class="info-row">

              <span class="info-label">
                Payment
              </span>

              <span class="info-value">
                ${escapeHtml(
                  statusLabel(
                    order.payment_method
                  )
                )}
              </span>

            </div>


            <div class="info-row">

              <span class="info-label">
                Payment Status
              </span>

              <span class="info-value">
                ${escapeHtml(
                  statusLabel(
                    order.payment_status
                  )
                )}
              </span>

            </div>


          </div>


        </div>


        <!-- PRODUCTS -->
        <div class="tracking-card">

          <div class="tracking-card-title">

            <h3>
              Ordered Products
            </h3>

            <p>
              Products included in this order
            </p>

          </div>


          <div class="order-items-wrap">

            <table class="order-items-table">

              <thead>

                <tr>

                  <th>
                    Product
                  </th>

                  <th>
                    SKU
                  </th>

                  <th>
                    Qty
                  </th>

                  <th>
                    Price
                  </th>

                  <th>
                    Discount
                  </th>

                  <th>
                    Total
                  </th>

                </tr>

              </thead>


              <tbody>

                ${
                  items.length
                    ? items.map(
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
                              ${Number(
                                item.quantity ||
                                0
                              ).toLocaleString(
                                "en-BD"
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
                      ).join("")
                    : `
                      <tr>
                        <td colspan="6">
                          No products found.
                        </td>
                      </tr>
                    `
                }


                <tr class="order-total-row">

                  <td colspan="5">
                    Subtotal
                  </td>

                  <td>
                    ${money(
                      order.subtotal
                    )}
                  </td>

                </tr>


                <tr class="order-total-row">

                  <td colspan="5">
                    Discount
                  </td>

                  <td>
                    - ${money(
                      order.discount
                    )}
                  </td>

                </tr>


                <tr class="order-total-row">

                  <td colspan="5">
                    Delivery Charge
                  </td>

                  <td>
                    ${money(
                      order.delivery_charge
                    )}
                  </td>

                </tr>


                <tr class="
                  order-total-row
                  order-grand-total
                ">

                  <td colspan="5">
                    Grand Total
                  </td>

                  <td>
                    ${money(
                      order.total_amount
                    )}
                  </td>

                </tr>


              </tbody>

            </table>

          </div>

        </div>


        ${
          order.note
            ? `
              <div class="tracking-card">

                <div class="tracking-card-title">
                  <h3>Order Note</h3>
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


        <!-- HISTORY -->
        <div class="tracking-card">

          <div class="tracking-card-title">

            <h3>
              Status History
            </h3>

            <p>
              Complete order status timeline
            </p>

          </div>


          ${
            history.length
              ? `
                <div class="status-history">

                  ${history.map(
                    (
                      item
                    ) => `
                      <div class="history-item">

                        <div class="history-dot"></div>

                        <div class="history-title">

                          ${
                            item.old_status
                              ? `
                                ${escapeHtml(
                                  statusLabel(
                                    item.old_status
                                  )
                                )}
                                →
                              `
                              : ""
                          }

                          ${escapeHtml(
                            statusLabel(
                              item.new_status
                            )
                          )}

                        </div>


                        <div class="history-meta">

                          ${formatDate(
                            item.changed_at,
                            true
                          )}

                        </div>


                        ${
                          item.note
                            ? `
                              <div class="history-note">

                                ${escapeHtml(
                                  item.note
                                )}

                              </div>
                            `
                            : ""
                        }

                      </div>
                    `
                  ).join("")}

                </div>
              `
              : `
                <div class="order-note-box">
                  No status history recorded yet.
                </div>
              `
          }


        </div>


      </div>

    `;

  }


  /* =======================================================
     NOT FOUND
     ======================================================= */

  function renderNotFound(
    orderId
  ) {

    const result =
      $("trackingResult");

    if (!result) {
      return;
    }


    result.innerHTML = `

      <div class="tracking-error">

        <div class="tracking-error-icon">
          <i class="bi bi-search"></i>
        </div>

        <h3>
          Order Not Found
        </h3>

        <p>
          No order was found with Order ID
          <strong>
            ${escapeHtml(orderId)}
          </strong>.
        </p>

      </div>

    `;


    const hint =
      $("searchHint");

    if (hint) {

      hint.textContent =
        "Please check the Order ID and try again.";

    }

  }


  /* =======================================================
     ERROR
     ======================================================= */

  function renderError(
    message
  ) {

    const result =
      $("trackingResult");

    if (!result) {
      return;
    }


    result.innerHTML = `

      <div class="tracking-error">

        <div class="tracking-error-icon">

          <i class="
            bi
            bi-exclamation-triangle
          "></i>

        </div>

        <h3>
          Something went wrong
        </h3>

        <p>
          ${escapeHtml(message)}
        </p>

      </div>

    `;

  }


  /* =======================================================
     CLEAR
     ======================================================= */

  function clearSearch() {

    const input =
      $("orderIdInput");

    if (input) {
      input.value = "";
      input.focus();
    }


    const hint =
      $("searchHint");

    if (hint) {

      hint.textContent =
        "Enter an Order ID and click Search.";

    }


    const result =
      $("trackingResult");

    if (result) {

      result.innerHTML = `

        <div class="tracking-empty">

          <div class="tracking-empty-icon">
            <i class="bi bi-box-seam"></i>
          </div>

          <h3>
            Track an Order
          </h3>

          <p>
            Enter an Order ID above to view
            the complete order status.
          </p>

        </div>

      `;

    }


    currentOrder =
      null;

    currentItems =
      [];

    currentHistory =
      [];

  }


  /* =======================================================
     EVENTS
     ======================================================= */

  function bindEvents() {

    $("searchOrderBtn")
      ?.addEventListener(
        "click",
        searchOrder
      );


    $("clearSearchBtn")
      ?.addEventListener(
        "click",
        clearSearch
      );


    $("orderIdInput")
      ?.addEventListener(
        "keydown",
        (event) => {

          if (
            event.key === "Enter"
          ) {

            event.preventDefault();

            searchOrder();

          }

        }
      );

  }


  /* =======================================================
     INIT
     ======================================================= */

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      bindEvents();

      const input =
        $("orderIdInput");

      if (input) {
        input.focus();
      }

    }
  );


  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.MIXNBUY_ORDER_STATUS = {

    search: searchOrder,

    clear: clearSearch

  };


})();