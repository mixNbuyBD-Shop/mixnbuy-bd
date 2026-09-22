/* =========================================================
   MIXNBUY.BD
   SALES RETURN ADMIN
   ========================================================= */

(function () {

  "use strict";


  /* =======================================================
     HELPERS
     ======================================================= */

  const $ = (id) => {
    return document.getElementById(id);
  };


  const admin = window.MIXNBUY_ADMIN || {};


  let selectedSale = null;

  let selectedSaleItems = [];

  let searchTimer = null;


  /* =======================================================
     SUPABASE CLIENT
     ======================================================= */

  function getClient() {

    return (
      window.supabaseClient ||
      window.supabase ||
      null
    );

  }


  /* =======================================================
     HTML ESCAPE
     ======================================================= */

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


  /* =======================================================
     MONEY
     ======================================================= */

  function money(value) {

    const amount = Number(value || 0);

    if (
      typeof admin.formatMoney === "function"
    ) {
      return admin.formatMoney(amount);
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


  /* =======================================================
     NUMBER
     ======================================================= */

  function number(value) {

    const n = Number(value || 0);

    return n.toLocaleString(
      "en-BD",
      {
        maximumFractionDigits: 2
      }
    );

  }


  /* =======================================================
     DATE
     ======================================================= */

  function formatDate(value) {

    if (!value) {
      return "-";
    }

    if (
      typeof admin.formatDate === "function"
    ) {
      return admin.formatDate(value);
    }

    const date = new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
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


  /* =======================================================
     NOTIFICATION
     ======================================================= */

  function notify(
    type,
    title,
    text
  ) {

    if (window.Swal) {

      return Swal.fire({
        icon: type,
        title: title,
        text: text,
        confirmButtonText: "OK"
      });

    }

    alert(
      title +
      "\n\n" +
      text
    );

  }


  function success(
    title,
    text
  ) {

    if (window.Swal) {

      return Swal.fire({
        icon: "success",
        title: title,
        text: text,
        confirmButtonText: "OK"
      });

    }

    alert(
      title +
      "\n\n" +
      text
    );

  }


  /* =======================================================
     OPEN MODAL
     ======================================================= */

  function openModal(id) {

    const modal = $(id);

    if (!modal) {
      return;
    }

    modal.classList.add(
      "is-open"
    );

    modal.setAttribute(
      "aria-hidden",
      "false"
    );

    document.body.classList.add(
      "return-modal-open"
    );

  }


  /* =======================================================
     CLOSE MODAL
     ======================================================= */

  function closeModal(id) {

    const modal = $(id);

    if (!modal) {
      return;
    }

    modal.classList.remove(
      "is-open"
    );

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.classList.remove(
      "return-modal-open"
    );

  }


  /* =======================================================
     RESET RETURN FORM
     ======================================================= */

  function resetReturnForm() {

    selectedSale = null;

    selectedSaleItems = [];

    const searchInput =
      $("saleSearchInput");

    if (searchInput) {
      searchInput.value = "";
    }


    const searchResults =
      $("saleSearchResults");

    if (searchResults) {
      searchResults.innerHTML = "";
    }


    const productsStep =
      $("returnProductsStep");

    if (productsStep) {
      productsStep.classList.add(
        "is-hidden"
      );
    }


    const productsBody =
      $("returnProductsBody");

    if (productsBody) {
      productsBody.innerHTML = "";
    }


    const saleCard =
      $("selectedSaleCard");

    if (saleCard) {
      saleCard.innerHTML = "";
    }


    const reason =
      $("returnReason");

    if (reason) {
      reason.value = "";
    }


    const refundStatus =
      $("refundStatus");

    if (refundStatus) {
      refundStatus.value =
        "pending";
    }


    const note =
      $("returnNote");

    if (note) {
      note.value = "";
    }


    updateReturnSummary();

    const submit =
      $("submitReturnBtn");

    if (submit) {
      submit.disabled = true;
    }

  }


  /* =======================================================
     OPEN NEW RETURN
     ======================================================= */

  function openNewReturn() {

    resetReturnForm();

    openModal(
      "returnModal"
    );

    setTimeout(() => {

      const input =
        $("saleSearchInput");

      if (input) {
        input.focus();
      }

    }, 100);

  }


  /* =======================================================
     SEARCH SALE
     ======================================================= */

  async function searchSales() {

    const input =
      $("saleSearchInput");

    if (!input) {
      return;
    }

    const keyword =
      input.value.trim();

    const results =
      $("saleSearchResults");

    if (!results) {
      return;
    }


    if (!keyword) {

      results.innerHTML = "";

      return;

    }


    const client =
      getClient();

    if (!client) {

      results.innerHTML = `
        <div class="sale-search-empty">
          <i class="bi bi-database-x"></i>
          <div>
            Supabase client is not initialized.
          </div>
        </div>
      `;

      return;

    }


    results.innerHTML = `
      <div class="return-loading">
        <i class="bi bi-arrow-repeat"></i>
        <div>Searching sales...</div>
      </div>
    `;


    try {

      /*
       * -----------------------------------------------------
       * 1. SEARCH BY SALE NUMBER
       * -----------------------------------------------------
       */

      const salePromise =
        client
          .from("sales")
          .select(`
            id,
            sale_no,
            order_id,
            customer_id,
            sale_date,
            subtotal,
            discount,
            delivery_charge,
            other_charge,
            total_amount,
            payment_method,
            payment_status,
            status
          `)
          .eq(
            "status",
            "completed"
          )
          .ilike(
            "sale_no",
            `%${keyword}%`
          )
          .order(
            "sale_date",
            {
              ascending: false
            }
          )
          .limit(20);


      /*
       * -----------------------------------------------------
       * 2. SEARCH CUSTOMERS
       * -----------------------------------------------------
       */

      const customerPromise =
        client
          .from("customers")
          .select(`
            id,
            name,
            mobile,
            phone,
            email
          `)
          .or(
            [
              `name.ilike.%${keyword}%`,
              `mobile.ilike.%${keyword}%`,
              `phone.ilike.%${keyword}%`
            ].join(",")
          )
          .limit(20);


      const [
        saleResult,
        customerResult
      ] = await Promise.all([
        salePromise,
        customerPromise
      ]);


      if (saleResult.error) {
        throw saleResult.error;
      }


      /*
       * Customer error is tolerated because
       * phone column may differ in an older schema.
       */

      let customerRows = [];

      if (!customerResult.error) {
        customerRows =
          customerResult.data || [];
      }


      let sales =
        saleResult.data || [];


      /*
       * -----------------------------------------------------
       * ADD SALES FOUND THROUGH CUSTOMER
       * -----------------------------------------------------
       */

      if (
        customerRows.length
      ) {

        const customerIds =
          customerRows
            .map(
              customer =>
                customer.id
            )
            .filter(Boolean);


        if (customerIds.length) {

          const {
            data: customerSales,
            error:
              customerSalesError
          } =
            await client
              .from("sales")
              .select(`
                id,
                sale_no,
                order_id,
                customer_id,
                sale_date,
                subtotal,
                discount,
                delivery_charge,
                other_charge,
                total_amount,
                payment_method,
                payment_status,
                status
              `)
              .eq(
                "status",
                "completed"
              )
              .in(
                "customer_id",
                customerIds
              )
              .order(
                "sale_date",
                {
                  ascending: false
                }
              )
              .limit(20);


          if (
            !customerSalesError
          ) {

            const map =
              new Map();

            [
              ...sales,
              ...(customerSales || [])
            ].forEach(
              sale => {
                map.set(
                  sale.id,
                  sale
                );
              }
            );

            sales =
              Array.from(
                map.values()
              );

          }

        }

      }


      if (!sales.length) {

        results.innerHTML = `
          <div class="sale-search-empty">
            <i class="bi bi-receipt"></i>
            <div>
              No completed sale found.
            </div>
          </div>
        `;

        return;

      }


      /*
       * -----------------------------------------------------
       * CUSTOMER MAP
       * -----------------------------------------------------
       */

      const customerIds =
        [
          ...new Set(
            sales
              .map(
                sale =>
                  sale.customer_id
              )
              .filter(Boolean)
          )
        ];


      const customerMap =
        new Map();


      if (
        customerIds.length
      ) {

        const {
          data: customers,
          error
        } =
          await client
            .from("customers")
            .select(`
              id,
              name,
              mobile,
              phone,
              email
            `)
            .in(
              "id",
              customerIds
            );


        if (!error) {

          (
            customers || []
          ).forEach(
            customer => {

              customerMap.set(
                customer.id,
                customer
              );

            }
          );

        }

      }


      /*
       * -----------------------------------------------------
       * RENDER SALES
       * -----------------------------------------------------
       */

      results.innerHTML = `
        <div class="sale-result-list">

          ${sales.map(
            sale => {

              const customer =
                customerMap.get(
                  sale.customer_id
                ) || {};

              const customerName =
                customer.name ||
                "Walk-in Customer";

              const mobile =
                customer.mobile ||
                customer.phone ||
                "-";


              return `
                <button
                  type="button"
                  class="sale-result-item"
                  data-sale-id="${escapeHtml(
                    sale.id
                  )}"
                >

                  <div class="sale-result-main">

                    <div class="sale-result-no">
                      ${escapeHtml(
                        sale.sale_no ||
                        "-"
                      )}
                    </div>

                    <div class="sale-result-meta">

                      <span>
                        <i class="bi bi-person"></i>
                        ${escapeHtml(
                          customerName
                        )}
                      </span>

                      <span>
                        <i class="bi bi-telephone"></i>
                        ${escapeHtml(
                          mobile
                        )}
                      </span>

                      <span>
                        <i class="bi bi-calendar3"></i>
                        ${formatDate(
                          sale.sale_date
                        )}
                      </span>

                    </div>

                  </div>

                  <div class="sale-result-total">
                    ${money(
                      sale.total_amount
                    )}
                  </div>

                </button>
              `;

            }
          ).join("")}

        </div>
      `;


    } catch (error) {

      console.error(
        "Sale search error:",
        error
      );


      results.innerHTML = `
        <div class="sale-search-empty">
          <i class="bi bi-exclamation-triangle"></i>

          <div>
            ${
              escapeHtml(
                error?.message ||
                "Failed to search sales."
              )
            }
          </div>
        </div>
      `;

    }

  }


  /* =======================================================
     SELECT SALE
     ======================================================= */

  async function selectSale(
    saleId
  ) {

    const client =
      getClient();

    if (!client) {
      return;
    }


    const results =
      $("saleSearchResults");

    if (results) {

      results.innerHTML = `
        <div class="return-loading">
          <i class="bi bi-arrow-repeat"></i>
          <div>Loading sale details...</div>
        </div>
      `;

    }


    try {

      /*
       * -----------------------------------------------------
       * SALE
       * -----------------------------------------------------
       */

      const {
        data: sale,
        error: saleError
      } =
        await client
          .from("sales")
          .select(`
            id,
            sale_no,
            order_id,
            customer_id,
            sale_date,
            subtotal,
            discount,
            delivery_charge,
            other_charge,
            total_amount,
            payment_method,
            payment_status,
            status
          `)
          .eq(
            "id",
            saleId
          )
          .maybeSingle();


      if (saleError) {
        throw saleError;
      }


      if (!sale) {
        throw new Error(
          "Sale not found."
        );
      }


      if (
        String(sale.status)
          .toLowerCase() !==
        "completed"
      ) {

        throw new Error(
          "Only completed sales can be returned."
        );

      }


      /*
       * -----------------------------------------------------
       * CUSTOMER
       * -----------------------------------------------------
       */

      let customer = null;


      if (
        sale.customer_id
      ) {

        const {
          data,
          error
        } =
          await client
            .from("customers")
            .select(`
              id,
              name,
              mobile,
              phone,
              email,
              address
            `)
            .eq(
              "id",
              sale.customer_id
            )
            .maybeSingle();


        if (!error) {
          customer = data;
        }

      }


      /*
       * -----------------------------------------------------
       * SALE ITEMS
       * -----------------------------------------------------
       */

      const {
        data: items,
        error: itemsError
      } =
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
          .eq(
            "sale_id",
            sale.id
          )
          .order(
            "created_at",
            {
              ascending: true
            }
          );


      if (itemsError) {
        throw itemsError;
      }


      const saleItems =
        items || [];


      /*
       * -----------------------------------------------------
       * ALREADY RETURNED
       * -----------------------------------------------------
       */

      const saleItemIds =
        saleItems
          .map(
            item =>
              item.id
          )
          .filter(Boolean);


      let returnedMap =
        new Map();


      if (
        saleItemIds.length
      ) {

        const {
          data: returnItems,
          error:
            returnItemsError
        } =
          await client
            .from("return_items")
            .select(`
              sale_item_id,
              quantity,
              return_id
            `)
            .in(
              "sale_item_id",
              saleItemIds
            );


        if (
          returnItemsError
        ) {
          throw returnItemsError;
        }


        const returnIds =
          [
            ...new Set(
              (returnItems || [])
                .map(
                  item =>
                    item.return_id
                )
                .filter(Boolean)
            )
          ];


        let completedReturns =
          new Set();


        if (
          returnIds.length
        ) {

          const {
            data: returns,
            error: returnsError
          } =
            await client
              .from("returns")
              .select(`
                id,
                status
              `)
              .in(
                "id",
                returnIds
              );


          if (
            returnsError
          ) {
            throw returnsError;
          }


          (returns || [])
            .forEach(
              row => {

                if (
                  String(
                    row.status
                  ).toLowerCase() ===
                  "completed"
                ) {

                  completedReturns.add(
                    row.id
                  );

                }

              }
            );

        }


        (
          returnItems || []
        ).forEach(
          item => {

            if (
              !completedReturns.has(
                item.return_id
              )
            ) {
              return;
            }


            const current =
              Number(
                returnedMap.get(
                  item.sale_item_id
                ) || 0
              );


            returnedMap.set(
              item.sale_item_id,
              current +
              Number(
                item.quantity || 0
              )
            );

          }
        );

      }


      /*
       * -----------------------------------------------------
       * STORE SELECTED SALE
       * -----------------------------------------------------
       */

      selectedSale = {
        ...sale,
        customer: customer
      };


      selectedSaleItems =
        saleItems.map(
          item => {

            const sold =
              Number(
                item.quantity || 0
              );

            const returned =
              Number(
                returnedMap.get(
                  item.id
                ) || 0
              );

            const available =
              Math.max(
                0,
                sold - returned
              );


            return {
              ...item,

              soldQty: sold,

              returnedQty: returned,

              availableQty:
                available,

              returnQty: 0,

              selected: false
            };

          }
        );


      renderSelectedSale();

      renderReturnProducts();

      updateReturnSummary();


      const productsStep =
        $("returnProductsStep");

      if (productsStep) {

        productsStep.classList.remove(
          "is-hidden"
        );

        productsStep.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

      }


      if (results) {
        results.innerHTML = "";
      }


    } catch (error) {

      console.error(
        "Select sale error:",
        error
      );


      if (results) {

        results.innerHTML = `
          <div class="sale-search-empty">
            <i class="bi bi-exclamation-triangle"></i>

            <div>
              ${
                escapeHtml(
                  error?.message ||
                  "Failed to load sale."
                )
              }
            </div>
          </div>
        `;

      }

    }

  }


  /* =======================================================
     RENDER SELECTED SALE
     ======================================================= */

  function renderSelectedSale() {

    const container =
      $("selectedSaleCard");

    if (!container) {
      return;
    }


    if (!selectedSale) {

      container.innerHTML = "";

      return;

    }


    const customer =
      selectedSale.customer ||
      {};


    const customerName =
      customer.name ||
      "Walk-in Customer";


    const mobile =
      customer.mobile ||
      customer.phone ||
      "-";


    container.innerHTML = `

      <div class="selected-sale-grid">

        <div class="selected-sale-field">

          <span>
            Sale Number
          </span>

          <strong>
            ${escapeHtml(
              selectedSale.sale_no ||
              "-"
            )}
          </strong>

        </div>


        <div class="selected-sale-field">

          <span>
            Customer
          </span>

          <strong>
            ${escapeHtml(
              customerName
            )}
          </strong>

        </div>


        <div class="selected-sale-field">

          <span>
            Phone
          </span>

          <strong>
            ${escapeHtml(
              mobile
            )}
          </strong>

        </div>


        <div class="selected-sale-field">

          <span>
            Sale Date
          </span>

          <strong>
            ${formatDate(
              selectedSale.sale_date
            )}
          </strong>

        </div>


        <div class="selected-sale-field">

          <span>
            Sale Total
          </span>

          <strong>
            ${money(
              selectedSale.total_amount
            )}
          </strong>

        </div>


        <div class="selected-sale-field">

          <span>
            Payment
          </span>

          <strong>
            ${escapeHtml(
              selectedSale.payment_method ||
              "-"
            )}
          </strong>

        </div>


        <div class="selected-sale-field">

          <span>
            Payment Status
          </span>

          <strong>
            ${escapeHtml(
              selectedSale.payment_status ||
              "-"
            )}
          </strong>

        </div>


        <div class="selected-sale-field">

          <span>
            Status
          </span>

          <strong>
            Completed
          </strong>

        </div>

      </div>

    `;

  }


  /* =======================================================
     RENDER PRODUCTS
     ======================================================= */

  function renderReturnProducts() {

    const body =
      $("returnProductsBody");

    if (!body) {
      return;
    }


    if (
      !selectedSaleItems.length
    ) {

      body.innerHTML = `
        <tr>
          <td colspan="7">

            <div class="return-empty">

              <i class="bi bi-box-seam"></i>

              <div>
                No products found in this sale.
              </div>

            </div>

          </td>
        </tr>
      `;

      return;

    }


    body.innerHTML =
      selectedSaleItems
        .map(
          (item, index) => {

            const available =
              Number(
                item.availableQty || 0
              );


            const disabled =
              available <= 0;


            return `

              <tr
                data-item-index="${index}"
                class="${
                  disabled
                    ? ""
                    : ""
                }"
              >

                <td class="return-check-col">

                  <input
                    type="checkbox"
                    class="return-check"
                    data-index="${index}"
                    ${
                      disabled
                        ? "disabled"
                        : ""
                    }
                  >

                </td>


                <td>

                  <div class="return-product-name">

                    ${escapeHtml(
                      item.product_name ||
                      "-"
                    )}

                  </div>

                  ${
                    item.sku
                      ? `
                        <span class="return-product-sku">
                          SKU: ${escapeHtml(
                            item.sku
                          )}
                        </span>
                      `
                      : ""
                  }

                </td>


                <td>

                  <span class="return-number">
                    ${number(
                      item.soldQty
                    )}
                  </span>

                </td>


                <td>

                  <span class="return-number">
                    ${number(
                      item.returnedQty
                    )}
                  </span>

                </td>


                <td>

                  <span
                    class="${
                      available > 0
                        ? "return-available"
                        : "return-unavailable"
                    }"
                  >
                    ${number(
                      available
                    )}
                  </span>

                </td>


                <td>

                  <input
                    type="number"
                    class="return-qty-input"
                    data-index="${index}"
                    min="0"
                    max="${available}"
                    step="1"
                    value="0"
                    ${
                      disabled
                        ? "disabled"
                        : ""
                    }
                  >

                  <span
                    class="return-item-error"
                    id="returnError${index}"
                  ></span>

                </td>


                <td>

                  <span
                    class="return-refund"
                    id="returnRefund${index}"
                  >
                    ${money(0)}
                  </span>

                </td>

              </tr>

            `;

          }
        )
        .join("");

  }


  /* =======================================================
     GET EFFECTIVE UNIT REFUND
     ======================================================= */

  function getUnitRefund(
    item
  ) {

    const quantity =
      Number(
        item.quantity || 0
      );


    const total =
      Number(
        item.total_amount || 0
      );


    if (
      quantity <= 0
    ) {
      return 0;
    }


    return (
      total /
      quantity
    );

  }


  /* =======================================================
     UPDATE SINGLE ITEM
     ======================================================= */

  function updateItem(
    index,
    quantity,
    selected
  ) {

    const item =
      selectedSaleItems[index];

    if (!item) {
      return;
    }


    const available =
      Number(
        item.availableQty || 0
      );


    let qty =
      Number(
        quantity || 0
      );


    if (
      !Number.isFinite(qty)
    ) {
      qty = 0;
    }


    qty =
      Math.floor(qty);


    if (qty < 0) {
      qty = 0;
    }


    if (qty > available) {
      qty = available;
    }


    item.returnQty =
      qty;


    item.selected =
      Boolean(
        selected ||
        qty > 0
      );


    const refund =
      qty *
      getUnitRefund(item);


    const input =
      document.querySelector(
        `.return-qty-input[data-index="${index}"]`
      );


    const checkbox =
      document.querySelector(
        `.return-check[data-index="${index}"]`
      );


    const refundEl =
      $(
        `returnRefund${index}`
      );


    const errorEl =
      $(
        `returnError${index}`
      );


    if (input) {

      input.value =
        String(qty);

      input.classList.remove(
        "qty-error"
      );

    }


    if (checkbox) {

      checkbox.checked =
        item.selected;

    }


    if (refundEl) {

      refundEl.textContent =
        money(refund);

    }


    if (errorEl) {

      errorEl.textContent =
        "";

    }


    const row =
      document.querySelector(
        `tr[data-item-index="${index}"]`
      );


    if (row) {

      row.classList.toggle(
        "return-row-selected",
        item.selected
      );

    }


    updateReturnSummary();

  }


  /* =======================================================
     VALIDATE QUANTITY
     ======================================================= */

  function validateItemQuantity(
    index,
    showMessage = true
  ) {

    const item =
      selectedSaleItems[index];

    if (!item) {
      return false;
    }


    const input =
      document.querySelector(
        `.return-qty-input[data-index="${index}"]`
      );


    if (!input) {
      return false;
    }


    const value =
      Number(
        input.value || 0
      );


    const available =
      Number(
        item.availableQty || 0
      );


    const errorEl =
      $(
        `returnError${index}`
      );


    if (
      !Number.isFinite(value) ||
      value < 0
    ) {

      input.classList.add(
        "qty-error"
      );

      if (errorEl) {

        errorEl.textContent =
          "Invalid quantity.";

      }

      return false;

    }


    if (
      value > available
    ) {

      input.classList.add(
        "qty-error"
      );

      if (errorEl) {

        errorEl.textContent =
          `Maximum ${number(
            available
          )} allowed.`;

      }

      if (showMessage) {

        notify(
          "warning",
          "Invalid Quantity",
          `Only ${number(
            available
          )} unit(s) can be returned for this product.`
        );

      }

      return false;

    }


    if (
      value > 0
    ) {

      item.returnQty =
        Math.floor(value);

      item.selected =
        true;

    } else {

      item.returnQty =
        0;

      item.selected =
        false;

    }


    input.classList.remove(
      "qty-error"
    );


    if (errorEl) {

      errorEl.textContent =
        "";

    }


    const checkbox =
      document.querySelector(
        `.return-check[data-index="${index}"]`
      );


    if (checkbox) {

      checkbox.checked =
        item.selected;

    }


    const row =
      document.querySelector(
        `tr[data-item-index="${index}"]`
      );


    if (row) {

      row.classList.toggle(
        "return-row-selected",
        item.selected
      );

    }


    const refund =
      item.returnQty *
      getUnitRefund(item);


    const refundEl =
      $(
        `returnRefund${index}`
      );


    if (refundEl) {

      refundEl.textContent =
        money(refund);

    }


    updateReturnSummary();

    return true;

  }


  /* =======================================================
     UPDATE SUMMARY
     ======================================================= */

  function updateReturnSummary() {

    let selectedCount = 0;

    let totalQuantity = 0;

    let totalRefund = 0;


    selectedSaleItems
      .forEach(
        item => {

          const qty =
            Number(
              item.returnQty || 0
            );


          if (
            qty > 0
          ) {

            selectedCount++;

            totalQuantity +=
              qty;

            totalRefund +=
              qty *
              getUnitRefund(item);

          }

        }
      );


    const countEl =
      $("selectedItemCount");

    if (countEl) {

      countEl.textContent =
        number(
          selectedCount
        );

    }


    const quantityEl =
      $("selectedQuantity");

    if (quantityEl) {

      quantityEl.textContent =
        number(
          totalQuantity
        );

    }


    const refundEl =
      $("selectedRefund");

    if (refundEl) {

      refundEl.textContent =
        money(
          totalRefund
        );

    }


    const submit =
      $("submitReturnBtn");

    if (submit) {

      submit.disabled =
        !selectedSale ||
        selectedCount === 0 ||
        totalQuantity <= 0;

    }

  }


  /* =======================================================
     SUBMIT RETURN
     ======================================================= */

  async function submitReturn() {

    if (!selectedSale) {

      notify(
        "warning",
        "Select Sale",
        "Please select a completed sale first."
      );

      return;

    }


    /*
     * Validate all selected inputs
     */

    for (
      let index = 0;
      index < selectedSaleItems.length;
      index++
    ) {

      const item =
        selectedSaleItems[index];


      const input =
        document.querySelector(
          `.return-qty-input[data-index="${index}"]`
        );


      if (!input) {
        continue;
      }


      const qty =
        Number(
          input.value || 0
        );


      if (
        qty > 0 ||
        item.selected
      ) {

        const valid =
          validateItemQuantity(
            index,
            true
          );


        if (!valid) {
          return;
        }

      }

    }


    const returnItems =
      selectedSaleItems
        .filter(
          item =>
            Number(
              item.returnQty || 0
            ) > 0
        )
        .map(
          item => {

            return {
              sale_item_id:
                item.id,

              quantity:
                Number(
                  item.returnQty
                ),

              reason:
                $("returnReason")?.value ||
                null
            };

          }
        );


    if (
      !returnItems.length
    ) {

      notify(
        "warning",
        "No Product Selected",
        "Please select at least one product to return."
      );

      return;

    }


    const reason =
      $("returnReason")?.value ||
      null;


    const refundStatus =
      $("refundStatus")?.value ||
      "pending";


    const note =
      $("returnNote")?.value.trim() ||
      "";


    let finalReason =
      reason;


    if (note) {

      finalReason =
        finalReason
          ? `${finalReason} - ${note}`
          : note;

    }


    const client =
      getClient();


    if (!client) {

      notify(
        "error",
        "Connection Error",
        "Supabase client is not initialized."
      );

      return;

    }


    const submit =
      $("submitReturnBtn");


    if (submit) {

      submit.disabled = true;

      submit.innerHTML = `
        <i class="bi bi-arrow-repeat"></i>
        Processing...
      `;

    }


    try {

      /*
       * Existing DB RPC
       *
       * process_sales_return(
       *   p_sale_id,
       *   p_items,
       *   p_reason,
       *   p_refund_status,
       *   p_return_date
       * )
       */

      const {
        data,
        error
      } =
        await client.rpc(
          "process_sales_return",
          {
            p_sale_id:
              selectedSale.id,

            p_items:
              returnItems,

            p_reason:
              finalReason,

            p_refund_status:
              refundStatus,

            p_return_date:
              new Date().toISOString()
          }
        );


      if (error) {
        throw error;
      }


      /*
       * RPC returns:
       * return_id
       * return_no
       * refund_amount
       * profit_adjustment
       */

      const result =
        data || {};


      closeModal(
        "returnModal"
      );


      await success(
        "Return Completed",
        `Return ${
          result.return_no ||
          ""
        } has been successfully created.`
      );


      resetReturnForm();


      await loadReturns();


    } catch (error) {

      console.error(
        "Submit return error:",
        error
      );


      notify(
        "error",
        "Return Failed",
        error?.message ||
        "Failed to process sales return."
      );


    } finally {

      if (submit) {

        submit.disabled =
          false;

        submit.innerHTML = `
          <i class="bi bi-check2-circle"></i>
          Submit Return
        `;

        updateReturnSummary();

      }

    }

  }


  /* =======================================================
     LOAD RETURNS
     ======================================================= */

  async function loadReturns() {

    const body =
      $("returnsTableBody");


    if (!body) {

      console.error(
        "Sales Returns: #returnsTableBody not found."
      );

      return;

    }


    const client =
      getClient();


    if (!client) {

      body.innerHTML = `
        <tr>
          <td colspan="8">

            <div class="return-empty">

              <i class="bi bi-database-x"></i>

              <div>
                Supabase client is not initialized.
              </div>

            </div>

          </td>
        </tr>
      `;

      return;

    }


    body.innerHTML = `
      <tr>
        <td colspan="8">

          <div class="return-loading">

            <i class="bi bi-arrow-repeat"></i>

            <div>
              Loading returns...
            </div>

          </div>

        </td>
      </tr>
    `;


    try {

      const {
        data: rows,
        error
      } =
        await client
          .from("returns")
          .select(`
            id,
            return_no,
            sale_id,
            customer_id,
            return_date,
            refund_amount,
            refund_status,
            reason,
            status,
            created_at
          `)
          .order(
            "return_date",
            {
              ascending: false
            }
          );


      if (error) {
        throw error;
      }


      const returns =
        rows || [];


      if (!returns.length) {

        updateReturnStats(
          returns,
          []
        );


        body.innerHTML = `
          <tr>
            <td colspan="8">

              <div class="return-empty">

                <i class="bi bi-arrow-return-left"></i>

                <div>
                  No sales returns found.
                </div>

              </div>

            </td>
          </tr>
        `;

        return;

      }


      /*
       * SALES
       */

      const saleIds =
        [
          ...new Set(
            returns
              .map(
                row =>
                  row.sale_id
              )
              .filter(Boolean)
          )
        ];


      const customerIds =
        [
          ...new Set(
            returns
              .map(
                row =>
                  row.customer_id
              )
              .filter(Boolean)
          )
        ];


      const saleMap =
        new Map();


      const customerMap =
        new Map();


      if (
        saleIds.length
      ) {

        const {
          data: sales,
          error: salesError
        } =
          await client
            .from("sales")
            .select(
              "id,sale_no"
            )
            .in(
              "id",
              saleIds
            );


        if (salesError) {
          throw salesError;
        }


        (
          sales || []
        ).forEach(
          sale => {

            saleMap.set(
              sale.id,
              sale.sale_no
            );

          }
        );

      }


      /*
       * CUSTOMERS
       */

      if (
        customerIds.length
      ) {

        const {
          data: customers,
          error:
            customersError
        } =
          await client
            .from("customers")
            .select(
              "id,name"
            )
            .in(
              "id",
              customerIds
            );


        if (customersError) {
          throw customersError;
        }


        (
          customers || []
        ).forEach(
          customer => {

            customerMap.set(
              customer.id,
              customer.name
            );

          }
        );

      }


      /*
       * RETURN ITEMS
       */

      const returnIds =
        returns
          .map(
            row =>
              row.id
          )
          .filter(Boolean);


      let returnItems =
        [];


      if (
        returnIds.length
      ) {

        const {
          data,
          error:
            itemsError
        } =
          await client
            .from("return_items")
            .select(`
              return_id,
              profit_adjustment
            `)
            .in(
              "return_id",
              returnIds
            );


        if (!itemsError) {

          returnItems =
            data || [];

        }

      }


      updateReturnStats(
        returns,
        returnItems
      );


      /*
       * TABLE
       */

      body.innerHTML =
        returns
          .map(
            row => {

              const saleNo =
                saleMap.get(
                  row.sale_id
                ) ||
                row.sale_id ||
                "-";


              const customerName =
                customerMap.get(
                  row.customer_id
                ) ||
                "Walk-in Customer";


              return `
                <tr>

                  <td>

                    <strong>
                      ${escapeHtml(
                        row.return_no ||
                        "-"
                      )}
                    </strong>

                  </td>


                  <td>
                    ${escapeHtml(
                      saleNo
                    )}
                  </td>


                  <td>
                    ${escapeHtml(
                      customerName
                    )}
                  </td>


                  <td>
                    ${formatDate(
                      row.return_date ||
                      row.created_at
                    )}
                  </td>


                  <td>
                    ${money(
                      row.refund_amount
                    )}
                  </td>


                  <td>
                    ${returnStatusBadge(
                      row.refund_status ||
                      row.status
                    )}
                  </td>


                  <td>
                    ${escapeHtml(
                      row.reason ||
                      "-"
                    )}
                  </td>


                  <td>

                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      data-return-id="${
                        escapeHtml(
                          row.id
                        )
                      }"
                    >
                      <i class="bi bi-eye"></i>
                      View
                    </button>

                  </td>

                </tr>
              `;

            }
          )
          .join("");


    } catch (error) {

      console.error(
        "Load returns error:",
        error
      );


      body.innerHTML = `
        <tr>
          <td colspan="8">

            <div class="return-empty">

              <i class="bi bi-exclamation-triangle"></i>

              <div>
                ${
                  escapeHtml(
                    error?.message ||
                    "Failed to load sales returns."
                  )
                }
              </div>

            </div>

          </td>
        </tr>
      `;

    }

  }


  /* =======================================================
     RETURN STATUS BADGE
     ======================================================= */

  function returnStatusBadge(
    status
  ) {

    const value =
      String(
        status || "-"
      ).toLowerCase();


    let cls =
      "return-status-pending";


    if (
      value === "refunded" ||
      value === "completed"
    ) {

      cls =
        "return-status-refunded";

    } else if (
      value === "cancelled"
    ) {

      cls =
        "return-status-cancelled";

    }


    return `
      <span
        class="return-status-badge ${cls}"
      >
        ${escapeHtml(
          status || "-"
        )}
      </span>
    `;

  }


  /* =======================================================
     UPDATE STATS
     ======================================================= */

  function updateReturnStats(
    returns,
    returnItems
  ) {

    let refundTotal = 0;

    let pendingCount = 0;

    let profitAdjustment = 0;


    (
      returns || []
    ).forEach(
      row => {

        refundTotal +=
          Number(
            row.refund_amount ||
            0
          );


        if (
          String(
            row.refund_status ||
            ""
          ).toLowerCase() ===
          "pending"
        ) {

          pendingCount++;

        }

      }
    );


    (
      returnItems || []
    ).forEach(
      item => {

        profitAdjustment +=
          Number(
            item.profit_adjustment ||
            0
          );

      }
    );


    const totalEl =
      $("totalReturns");

    if (totalEl) {

      totalEl.textContent =
        number(
          returns.length
        );

    }


    const refundEl =
      $("refundAmount");

    if (refundEl) {

      refundEl.textContent =
        money(
          refundTotal
        );

    }


    const profitEl =
      $("profitAdjustment");

    if (profitEl) {

      profitEl.textContent =
        money(
          profitAdjustment
        );

    }


    const pendingEl =
      $("pendingRefund");

    if (pendingEl) {

      pendingEl.textContent =
        number(
          pendingCount
        );

    }

  }


  /* =======================================================
     VIEW RETURN DETAILS
     ======================================================= */

  async function viewReturn(
    returnId
  ) {

    const body =
      $("returnDetailsBody");


    if (!body) {
      return;
    }


    openModal(
      "viewReturnModal"
    );


    body.innerHTML = `
      <div class="return-loading">

        <i class="bi bi-arrow-repeat"></i>

        <div>
          Loading return details...
        </div>

      </div>
    `;


    const client =
      getClient();


    if (!client) {

      body.innerHTML = `
        <div class="return-empty">

          <i class="bi bi-database-x"></i>

          <div>
            Supabase client is not initialized.
          </div>

        </div>
      `;

      return;

    }


    try {

      /*
       * RETURN
       */

      const {
        data: returnRow,
        error
      } =
        await client
          .from("returns")
          .select(`
            id,
            return_no,
            order_id,
            sale_id,
            customer_id,
            return_date,
            refund_amount,
            refund_status,
            reason,
            status,
            created_by,
            created_at
          `)
          .eq(
            "id",
            returnId
          )
          .maybeSingle();


      if (error) {
        throw error;
      }


      if (!returnRow) {

        throw new Error(
          "Return not found."
        );

      }


      /*
       * SALE
       */

      let sale = null;


      if (
        returnRow.sale_id
      ) {

        const {
          data,
          error:
            saleError
        } =
          await client
            .from("sales")
            .select(`
              id,
              sale_no,
              sale_date,
              total_amount,
              payment_method,
              payment_status,
              status
            `)
            .eq(
              "id",
              returnRow.sale_id
            )
            .maybeSingle();


        if (saleError) {
          throw saleError;
        }


        sale = data;

      }


      /*
       * CUSTOMER
       */

      let customer = null;


      if (
        returnRow.customer_id
      ) {

        const {
          data,
          error:
            customerError
        } =
          await client
            .from("customers")
            .select(`
              id,
              name,
              mobile,
              phone,
              email,
              address
            `)
            .eq(
              "id",
              returnRow.customer_id
            )
            .maybeSingle();


        if (!customerError) {
          customer = data;
        }

      }


      /*
       * ITEMS
       */

      const {
        data: items,
        error:
          itemsError
      } =
        await client
          .from("return_items")
          .select(`
            id,
            sale_item_id,
            product_id,
            product_name,
            quantity,
            purchase_price,
            selling_price,
            refund_amount,
            reason,
            profit_adjustment,
            created_at
          `)
          .eq(
            "return_id",
            returnId
          )
          .order(
            "created_at",
            {
              ascending: true
            }
          );


      if (itemsError) {
        throw itemsError;
      }


      renderReturnDetails(
        returnRow,
        sale,
        customer,
        items || []
      );


    } catch (error) {

      console.error(
        "View return error:",
        error
      );


      body.innerHTML = `
        <div class="return-empty">

          <i class="bi bi-exclamation-triangle"></i>

          <div>
            ${
              escapeHtml(
                error?.message ||
                "Failed to load return details."
              )
            }
          </div>

        </div>
      `;

    }

  }


  /* =======================================================
     RENDER RETURN DETAILS
     ======================================================= */

  function renderReturnDetails(
    returnRow,
    sale,
    customer,
    items
  ) {

    const body =
      $("returnDetailsBody");


    if (!body) {
      return;
    }


    const customerName =
      customer?.name ||
      "Walk-in Customer";


    const customerPhone =
      customer?.mobile ||
      customer?.phone ||
      "-";


    const saleNo =
      sale?.sale_no ||
      returnRow.sale_id ||
      "-";


    const totalRefund =
      Number(
        returnRow.refund_amount ||
        0
      );


    body.innerHTML = `

      <div class="return-detail-header">


        <div class="return-detail-box">

          <span>
            Return No
          </span>

          <strong>
            ${escapeHtml(
              returnRow.return_no ||
              "-"
            )}
          </strong>

        </div>


        <div class="return-detail-box">

          <span>
            Sale No
          </span>

          <strong>
            ${escapeHtml(
              saleNo
            )}
          </strong>

        </div>


        <div class="return-detail-box">

          <span>
            Customer
          </span>

          <strong>
            ${escapeHtml(
              customerName
            )}
          </strong>

        </div>


        <div class="return-detail-box">

          <span>
            Date
          </span>

          <strong>
            ${formatDate(
              returnRow.return_date ||
              returnRow.created_at
            )}
          </strong>

        </div>


        <div class="return-detail-box">

          <span>
            Phone
          </span>

          <strong>
            ${escapeHtml(
              customerPhone
            )}
          </strong>

        </div>


        <div class="return-detail-box">

          <span>
            Refund
          </span>

          <strong>
            ${money(
              totalRefund
            )}
          </strong>

        </div>


        <div class="return-detail-box">

          <span>
            Refund Status
          </span>

          <strong>
            ${returnStatusBadge(
              returnRow.refund_status
            )}
          </strong>

        </div>


        <div class="return-detail-box">

          <span>
            Status
          </span>

          <strong>
            ${returnStatusBadge(
              returnRow.status
            )}
          </strong>

        </div>


      </div>


      <div class="return-detail-title">
        Returned Products
      </div>


      <div class="return-detail-table-wrap">

        <table class="return-detail-table">

          <thead>

            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Selling Price</th>
              <th>Refund</th>
              <th>Profit Adjustment</th>
              <th>Reason</th>
            </tr>

          </thead>


          <tbody>

            ${
              items.length
                ? items
                    .map(
                      item => `
                        <tr>

                          <td>
                            ${escapeHtml(
                              item.product_name ||
                              "-"
                            )}
                          </td>

                          <td>
                            ${number(
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
                              item.refund_amount
                            )}
                          </td>

                          <td>
                            ${money(
                              item.profit_adjustment
                            )}
                          </td>

                          <td>
                            ${escapeHtml(
                              item.reason ||
                              returnRow.reason ||
                              "-"
                            )}
                          </td>

                        </tr>
                      `
                    )
                    .join("")
                : `
                    <tr>
                      <td colspan="6">
                        No return items found.
                      </td>
                    </tr>
                  `
            }

          </tbody>

        </table>

      </div>


      <div class="return-detail-title">
        Return Reason
      </div>


      <div class="return-detail-box">

        <strong>
          ${escapeHtml(
            returnRow.reason ||
            "-"
          )}
        </strong>

      </div>


      <div class="return-detail-total">

        <span>
          Total Refund:
        </span>

        <strong>
          ${money(
            totalRefund
          )}
        </strong>

      </div>

    `;

  }


  /* =======================================================
     EVENT BINDING
     ======================================================= */

  function bindEvents() {


    /* -----------------------------------------------------
       NEW RETURN
       ----------------------------------------------------- */

    const newReturn =
      $("newReturnBtn");


    if (newReturn) {

      newReturn.addEventListener(
        "click",
        openNewReturn
      );

    }


    /* -----------------------------------------------------
       REFRESH
       ----------------------------------------------------- */

    const refresh =
      $("refreshReturnsBtn");


    if (refresh) {

      refresh.addEventListener(
        "click",
        loadReturns
      );

    }


    /* -----------------------------------------------------
       CLOSE NEW RETURN
       ----------------------------------------------------- */

    const closeNew =
      $("closeReturnModalBtn");


    if (closeNew) {

      closeNew.addEventListener(
        "click",
        () => {

          closeModal(
            "returnModal"
          );

        }
      );

    }


    /* -----------------------------------------------------
       CANCEL NEW RETURN
       ----------------------------------------------------- */

    const cancel =
      $("cancelReturnBtn");


    if (cancel) {

      cancel.addEventListener(
        "click",
        () => {

          closeModal(
            "returnModal"
          );

        }
      );

    }


    /* -----------------------------------------------------
       SEARCH SALE
       ----------------------------------------------------- */

    const searchButton =
      $("searchSaleBtn");


    if (searchButton) {

      searchButton.addEventListener(
        "click",
        searchSales
      );

    }


    /* -----------------------------------------------------
       ENTER SEARCH
       ----------------------------------------------------- */

    const searchInput =
      $("saleSearchInput");


    if (searchInput) {

      searchInput.addEventListener(
        "keydown",
        event => {

          if (
            event.key ===
            "Enter"
          ) {

            event.preventDefault();

            searchSales();

          }

        }
      );


      /*
       * Small debounce for typing
       */

      searchInput.addEventListener(
        "input",
        () => {

          clearTimeout(
            searchTimer
          );


          if (
            searchInput.value.trim()
              .length < 3
          ) {
            return;
          }


          searchTimer =
            setTimeout(
              () => {
                searchSales();
              },
              600
            );

        }
      );

    }


    /* -----------------------------------------------------
       SALE SEARCH RESULT
       ----------------------------------------------------- */

    const searchResults =
      $("saleSearchResults");


    if (searchResults) {

      searchResults.addEventListener(
        "click",
        event => {

          const button =
            event.target.closest(
              "[data-sale-id]"
            );


          if (!button) {
            return;
          }


          const saleId =
            button.getAttribute(
              "data-sale-id"
            );


          if (saleId) {

            selectSale(
              saleId
            );

          }

        }
      );

    }


    /* -----------------------------------------------------
       PRODUCT CHECKBOX
       ----------------------------------------------------- */

    const productsBody =
      $("returnProductsBody");


    if (productsBody) {

      productsBody.addEventListener(
        "change",
        event => {

          const checkbox =
            event.target.closest(
              ".return-check"
            );


          if (!checkbox) {
            return;
          }


          const index =
            Number(
              checkbox.dataset.index
            );


          const item =
            selectedSaleItems[
              index
            ];


          if (!item) {
            return;
          }


          const input =
            document.querySelector(
              `.return-qty-input[data-index="${index}"]`
            );


          if (
            checkbox.checked
          ) {

            if (
              Number(
                input?.value || 0
              ) <= 0
            ) {

              updateItem(
                index,
                1,
                true
              );

            } else {

              updateItem(
                index,
                input.value,
                true
              );

            }

          } else {

            updateItem(
              index,
              0,
              false
            );

          }

        }
      );


      /* ---------------------------------------------------
         QUANTITY INPUT
         --------------------------------------------------- */

      productsBody.addEventListener(
        "input",
        event => {

          const input =
            event.target.closest(
              ".return-qty-input"
            );


          if (!input) {
            return;
          }


          const index =
            Number(
              input.dataset.index
            );


          const item =
            selectedSaleItems[
              index
            ];


          if (!item) {
            return;
          }


          const value =
            Number(
              input.value || 0
            );


          const available =
            Number(
              item.availableQty || 0
            );


          if (
            value > available
          ) {

            input.classList.add(
              "qty-error"
            );


            const errorEl =
              $(
                `returnError${index}`
              );


            if (errorEl) {

              errorEl.textContent =
                `Maximum ${number(
                  available
                )} allowed.`;

            }


            updateReturnSummary();

            return;

          }


          input.classList.remove(
            "qty-error"
          );


          const errorEl =
            $(
              `returnError${index}`
            );


          if (errorEl) {

            errorEl.textContent =
              "";

          }


          item.returnQty =
            Math.floor(
              Math.max(
                0,
                value
              )
            );


          item.selected =
            item.returnQty > 0;


          const checkbox =
            document.querySelector(
              `.return-check[data-index="${index}"]`
            );


          if (checkbox) {

            checkbox.checked =
              item.selected;

          }


          const refund =
            item.returnQty *
            getUnitRefund(
              item
            );


          const refundEl =
            $(
              `returnRefund${index}`
            );


          if (refundEl) {

            refundEl.textContent =
              money(
                refund
              );

          }


          const row =
            document.querySelector(
              `tr[data-item-index="${index}"]`
            );


          if (row) {

            row.classList.toggle(
              "return-row-selected",
              item.selected
            );

          }


          updateReturnSummary();

        }
      );


      /* ---------------------------------------------------
         QUANTITY BLUR
         --------------------------------------------------- */

      productsBody.addEventListener(
        "blur",
        event => {

          const input =
            event.target.closest(
              ".return-qty-input"
            );


          if (!input) {
            return;
          }


          const index =
            Number(
              input.dataset.index
            );


          validateItemQuantity(
            index,
            false
          );

        },
        true
      );

    }


    /* -----------------------------------------------------
       SUBMIT
       ----------------------------------------------------- */

    const submit =
      $("submitReturnBtn");


    if (submit) {

      submit.addEventListener(
        "click",
        submitReturn
      );

    }


    /* -----------------------------------------------------
       VIEW RETURN
       ----------------------------------------------------- */

    const returnsBody =
      $("returnsTableBody");


    if (returnsBody) {

      returnsBody.addEventListener(
        "click",
        event => {

          const button =
            event.target.closest(
              "[data-return-id]"
            );


          if (!button) {
            return;
          }


          const returnId =
            button.getAttribute(
              "data-return-id"
            );


          if (returnId) {

            viewReturn(
              returnId
            );

          }

        }
      );

    }


    /* -----------------------------------------------------
       CLOSE VIEW
       ----------------------------------------------------- */

    const closeView =
      $("closeViewReturnModalBtn");


    if (closeView) {

      closeView.addEventListener(
        "click",
        () => {

          closeModal(
            "viewReturnModal"
          );

        }
      );

    }


    const closeViewButton =
      $("closeViewReturnBtn");


    if (closeViewButton) {

      closeViewButton.addEventListener(
        "click",
        () => {

          closeModal(
            "viewReturnModal"
          );

        }
      );

    }


    /* -----------------------------------------------------
       OVERLAY CLOSE
       ----------------------------------------------------- */

    [
      "returnModal",
      "viewReturnModal"
    ].forEach(
      modalId => {

        const modal =
          $(modalId);


        if (!modal) {
          return;
        }


        modal.addEventListener(
          "click",
          event => {

            if (
              event.target ===
              modal
            ) {

              closeModal(
                modalId
              );

            }

          }
        );

      }
    );


    /* -----------------------------------------------------
       ESC KEY
       ----------------------------------------------------- */

    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key !==
          "Escape"
        ) {
          return;
        }


        closeModal(
          "returnModal"
        );

        closeModal(
          "viewReturnModal"
        );

      }
    );

  }


  /* =======================================================
     INIT
     ======================================================= */

  async function init() {

    bindEvents();

    await loadReturns();

  }


  /* =======================================================
     GLOBAL
     ======================================================= */

  window.MIXNBUY_SALES_RETURNS = {

    loadReturns,

    openNewReturn,

    searchSales,

    submitReturn,

    viewReturn

  };


  /* =======================================================
     DOM READY
     ======================================================= */

  document.addEventListener(
    "DOMContentLoaded",
    init
  );


})();