/* =========================================================
   MIXNBUY.BD — INVENTORY / STOCK
   File: admin/js/stock.js
   ========================================================= */

(function () {
  "use strict";

  /* =======================================================
     GLOBALS
     ======================================================= */

  const $ = (id) => document.getElementById(id);

  let allProducts = [];
  let filteredProducts = [];
  let categories = [];
  let selectedProduct = null;


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


  /* =======================================================
     NUMBER FORMAT
     ======================================================= */

  function numberFormat(value) {
    return Number(value || 0).toLocaleString("en-BD", {
      maximumFractionDigits: 2
    });
  }


  /* =======================================================
     DATE FORMAT
     ======================================================= */

  function formatDate(value, withTime = false) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
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


  /* =======================================================
     NORMALIZE
     ======================================================= */

  function normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }


  /* =======================================================
     TOAST
     ======================================================= */

  function showToast(
    message,
    type = "success"
  ) {
    const toast = $("stockToast");

    if (!toast) {
      return;
    }

    toast.textContent = message;

    toast.className =
      `stock-toast ${type} show`;

    clearTimeout(toast._timer);

    toast._timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 3200);
  }


  /* =======================================================
     MODAL OPEN
     ======================================================= */

  function openModal(id) {
    const modal = $(id);

    if (!modal) {
      return;
    }

    modal.classList.add("is-open");

    modal.setAttribute(
      "aria-hidden",
      "false"
    );
  }


  /* =======================================================
     MODAL CLOSE
     ======================================================= */

  function closeModal(id) {
    const modal = $(id);

    if (!modal) {
      return;
    }

    modal.classList.remove("is-open");

    modal.setAttribute(
      "aria-hidden",
      "true"
    );
  }


  /* =======================================================
     STOCK THRESHOLD
     ======================================================= */

  function getMinStock(product) {
    /*
     * Current Products table does not safely expose
     * min_stock through the REST query.
     *
     * Temporary UI threshold:
     * 5 units
     */

    return Number(
      product.min_stock ?? 5
    );
  }


  function getMaxStock(product) {
    /*
     * Temporary UI maximum:
     * 100 units
     */

    return Number(
      product.max_stock ?? 100
    );
  }


  /* =======================================================
     STOCK STATUS
     ======================================================= */

  function getStockStatus(product) {
    const stock = Number(
      product.current_stock || 0
    );

    const min = getMinStock(product);
    const max = getMaxStock(product);


    if (stock <= 0) {
      return {
        key: "out-of-stock",
        label: "Out of Stock"
      };
    }


    if (
      min > 0 &&
      stock < min
    ) {
      return {
        key: "low-stock",
        label: "Low Stock"
      };
    }


    if (
      max > 0 &&
      stock > max
    ) {
      return {
        key: "over-stock",
        label: "Over Stock"
      };
    }


    return {
      key: "in-stock",
      label: "In Stock"
    };
  }


  /* =======================================================
     STOCK STATUS BADGE
     ======================================================= */

  function renderStockStatus(product) {
    const status =
      getStockStatus(product);

    return `
      <span class="stock-status ${status.key}">
        ${escapeHtml(status.label)}
      </span>
    `;
  }


  /* =======================================================
     TABLE MESSAGE
     ======================================================= */

  function showTableMessage(
    message,
    isError = false
  ) {
    const body =
      $("stockTableBody");

    if (!body) {
      return;
    }

    body.innerHTML = `
      <tr>
        <td colspan="8">

          <div class="
            stock-state
            ${isError ? "error" : ""}
          ">

            <i class="bi ${
              isError
                ? "bi-exclamation-triangle"
                : "bi-arrow-repeat"
            }"></i>

            <span>
              ${escapeHtml(message)}
            </span>

          </div>

        </td>
      </tr>
    `;
  }


  /* =======================================================
     LOAD CATEGORIES
     ======================================================= */

  async function loadCategories() {
    const client = getClient();

    if (!client) {
      console.warn(
        "Supabase client not available."
      );
      return;
    }


    try {
      const {
        data,
        error
      } = await client
        .from("categories")
        .select("id,name")
        .order("name", {
          ascending: true
        });


      if (error) {
        throw error;
      }


      categories =
        Array.isArray(data)
          ? data
          : [];


      const select =
        $("stockCategoryFilter");

      if (!select) {
        return;
      }


      select.innerHTML = `
        <option value="all">
          All Categories
        </option>

        ${categories.map(
          (category) => `
            <option
              value="${escapeHtml(
                category.id
              )}"
            >
              ${escapeHtml(
                category.name
              )}
            </option>
          `
        ).join("")}
      `;

    } catch (error) {

      console.warn(
        "Category load error:",
        error
      );

      /*
       * Category failure should NOT stop
       * the stock page.
       */

    }
  }


  /* =======================================================
     LOAD PRODUCTS
     ======================================================= */

  async function loadProducts() {
    const client = getClient();


    if (!client) {

      showTableMessage(
        "Supabase client is not initialized.",
        true
      );

      return;

    }


    showTableMessage(
      "Loading stock..."
    );


    try {

      /*
       * IMPORTANT
       *
       * Do NOT request min_stock / max_stock here.
       * Those fields were causing the HTTP 400.
       */

      const {
        data,
        error
      } = await client
        .from("products")
        .select(`
          id,
          product_code,
          sku,
          name,
          category_id,
          current_stock,
          is_active,
          unit
        `)
        .eq(
          "is_active",
          true
        )
        .order(
          "name",
          {
            ascending: true
          }
        );


      if (error) {

        console.error(
          "Supabase products error:",
          error
        );

        throw error;

      }


      allProducts =
        Array.isArray(data)
          ? data
          : [];


      /*
       * Normalize stock values.
       */

      allProducts.forEach(
        (product) => {

          product.current_stock =
            Number(
              product.current_stock || 0
            );


          /*
           * Temporary UI thresholds.
           */

          product.min_stock =
            5;

          product.max_stock =
            100;

        }
      );


      filteredProducts =
        [...allProducts];


      updateStats();

      populateAdjustmentProducts();

      filterProducts();


    } catch (error) {

      console.error(
        "Stock load error:",
        error
      );


      allProducts = [];

      filteredProducts = [];


      updateStats();


      showTableMessage(
        error?.message ||
        "Failed to load stock.",
        true
      );

    }
  }


  /* =======================================================
     UPDATE STATS
     ======================================================= */

  function updateStats() {

    const totalProducts =
      allProducts.length;


    const totalStock =
      allProducts.reduce(
        (
          total,
          product
        ) => {

          return (
            total +
            Number(
              product.current_stock || 0
            )
          );

        },
        0
      );


    const lowStock =
      allProducts.filter(
        (product) =>
          getStockStatus(product).key ===
          "low-stock"
      ).length;


    const outOfStock =
      allProducts.filter(
        (product) =>
          getStockStatus(product).key ===
          "out-of-stock"
      ).length;


    if ($("totalProducts")) {

      $("totalProducts")
        .textContent =
        numberFormat(
          totalProducts
        );

    }


    if ($("totalStock")) {

      $("totalStock")
        .textContent =
        numberFormat(
          totalStock
        );

    }


    if ($("lowStock")) {

      $("lowStock")
        .textContent =
        numberFormat(
          lowStock
        );

    }


    if ($("outOfStock")) {

      $("outOfStock")
        .textContent =
        numberFormat(
          outOfStock
        );

    }
  }


  /* =======================================================
     FILTER PRODUCTS
     ======================================================= */

  function filterProducts() {

    const search =
      normalize(
        $("stockSearch")?.value
      );


    const status =
      $("stockStatusFilter")?.value ||
      "all";


    const category =
      $("stockCategoryFilter")?.value ||
      "all";


    filteredProducts =
      allProducts.filter(
        (product) => {


          const searchText = [
            product.name,
            product.sku,
            product.product_code
          ]
            .map(normalize)
            .join(" ");


          const searchMatch =
            !search ||
            searchText.includes(
              search
            );


          const productStatus =
            getStockStatus(product).key;


          const statusMatch =
            status === "all" ||
            productStatus === status;


          const categoryMatch =
            category === "all" ||
            String(
              product.category_id || ""
            ) === String(category);


          return (
            searchMatch &&
            statusMatch &&
            categoryMatch
          );

        }
      );


    renderProducts();

  }


  /* =======================================================
     RENDER PRODUCTS
     ======================================================= */

  function renderProducts() {

    const body =
      $("stockTableBody");


    if (!body) {
      return;
    }


    const count =
      filteredProducts.length;


    if ($("stockResultCount")) {

      $("stockResultCount")
        .textContent =
        `${numberFormat(count)} ${
          count === 1
            ? "product"
            : "products"
        }`;

    }


    if (!count) {

      showTableMessage(
        "No products found.",
        false
      );

      return;

    }


    body.innerHTML =
      filteredProducts.map(
        (product) => {


          const stock =
            Number(
              product.current_stock || 0
            );


          const min =
            getMinStock(product);


          const max =
            getMaxStock(product);


          const status =
            getStockStatus(product);


          let stockClass = "";


          if (
            status.key ===
            "low-stock"
          ) {
            stockClass =
              "low";
          }


          if (
            status.key ===
            "out-of-stock"
          ) {
            stockClass =
              "out";
          }


          if (
            status.key ===
            "over-stock"
          ) {
            stockClass =
              "over";
          }


          const category =
            categories.find(
              (item) =>
                String(item.id) ===
                String(
                  product.category_id
                )
            );


          return `

            <tr>

              <td>

                <div class="stock-product-name">

                  ${escapeHtml(
                    product.name ||
                    "-"
                  )}

                </div>


                <div class="stock-product-code">

                  ${escapeHtml(
                    product.product_code ||
                    "-"
                  )}

                </div>

              </td>


              <td>

                <span class="stock-sku">

                  ${escapeHtml(
                    product.sku ||
                    "-"
                  )}

                </span>

              </td>


              <td>

                ${escapeHtml(
                  category?.name ||
                  "-"
                )}

              </td>


              <td>

                <span class="
                  stock-number
                  ${stockClass}
                ">

                  ${numberFormat(
                    stock
                  )}

                  ${
                    product.unit
                      ? `
                        <small>
                          ${escapeHtml(
                            product.unit
                          )}
                        </small>
                      `
                      : ""
                  }

                </span>

              </td>


              <td>

                ${numberFormat(
                  min
                )}

              </td>


              <td>

                ${numberFormat(
                  max
                )}

              </td>


              <td>

                ${renderStockStatus(
                  product
                )}

              </td>


              <td>

                <div class="
                  stock-action-group
                ">

                  <button
                    type="button"
                    class="stock-action-btn"
                    data-view-stock="${escapeHtml(
                      product.id
                    )}"
                  >

                    <i class="bi bi-eye"></i>

                    View

                  </button>


                  <button
                    type="button"
                    class="
                      stock-action-btn
                      adjust
                    "
                    data-adjust-stock="${escapeHtml(
                      product.id
                    )}"
                    title="Stock Adjustment"
                  >

                    <i class="bi bi-sliders"></i>

                  </button>

                </div>

              </td>

            </tr>

          `;

        }
      ).join("");

  }


  /* =======================================================
     POPULATE ADJUSTMENT PRODUCTS
     ======================================================= */

  function populateAdjustmentProducts() {

    const select =
      $("adjustProduct");


    if (!select) {
      return;
    }


    select.innerHTML = `

      <option value="">
        Select Product
      </option>

      ${allProducts.map(
        (product) => `

          <option
            value="${escapeHtml(
              product.id
            )}"
          >

            ${escapeHtml(
              product.name
            )}

            ${
              product.sku
                ? ` — ${escapeHtml(
                    product.sku
                  )}`
                : ""
            }

          </option>

        `
      ).join("")}

    `;
  }


  /* =======================================================
     UPDATE ADJUSTMENT CURRENT STOCK
     ======================================================= */

  function updateAdjustmentCurrent() {

    const productId =
      $("adjustProduct")?.value;


    const product =
      allProducts.find(
        (item) =>
          String(item.id) ===
          String(productId)
      );


    selectedProduct =
      product || null;


    if ($("adjustCurrentStock")) {

      $("adjustCurrentStock")
        .textContent =
        product
          ? numberFormat(
              product.current_stock
            )
          : "0";

    }


    updateAdjustmentPreview();

  }


  /* =======================================================
     ADJUSTMENT PREVIEW
     ======================================================= */

  function updateAdjustmentPreview() {

    const preview =
      $("adjustPreview");


    if (!preview) {
      return;
    }


    if (!selectedProduct) {

      preview.className =
        "adjust-preview";

      preview.innerHTML =
        "New stock will be calculated here.";

      return;

    }


    const current =
      Number(
        selectedProduct.current_stock ||
        0
      );


    const quantity =
      Number(
        $("adjustQuantity")?.value ||
        0
      );


    const direction =
      $("adjustDirection")?.value ||
      "in";


    if (
      quantity <= 0
    ) {

      preview.className =
        "adjust-preview";


      preview.innerHTML = `

        Current stock:

        <strong>
          ${numberFormat(
            current
          )}
        </strong>

      `;

      return;

    }


    let newStock;


    if (
      direction === "in"
    ) {

      newStock =
        current +
        quantity;

    } else {

      newStock =
        current -
        quantity;

    }


    const previewClass =
      direction === "in"
        ? "in"
        : "out";


    preview.className =
      `adjust-preview ${previewClass}`;


    preview.innerHTML = `

      Current:

      <strong>
        ${numberFormat(
          current
        )}
      </strong>

      &nbsp; →

      New Stock:

      <strong>
        ${numberFormat(
          newStock
        )}
      </strong>

    `;
  }


  /* =======================================================
     OPEN ADJUSTMENT
     ======================================================= */

  function openAdjustment(
    productId = null
  ) {

    openModal(
      "stockAdjustmentModal"
    );


    if ($("adjustProduct")) {

      $("adjustProduct")
        .value =
        productId || "";

    }


    if ($("adjustDirection")) {

      $("adjustDirection")
        .value =
        "in";

    }


    if ($("adjustQuantity")) {

      $("adjustQuantity")
        .value = "";

    }


    if ($("adjustReason")) {

      $("adjustReason")
        .value = "";

    }


    if ($("adjustNote")) {

      $("adjustNote")
        .value = "";

    }


    updateAdjustmentCurrent();

  }


  /* =======================================================
     SAVE STOCK ADJUSTMENT
     ======================================================= */

  async function saveAdjustment(event) {

    event.preventDefault();


    const client =
      getClient();


    if (!client) {

      showToast(
        "Supabase client is not initialized.",
        "error"
      );

      return;

    }


    const productId =
      $("adjustProduct")?.value;


    const direction =
      $("adjustDirection")?.value ||
      "in";


    const quantity =
      Number(
        $("adjustQuantity")?.value ||
        0
      );


    const reason =
      $("adjustReason")?.value ||
      "manual_adjustment";


    const note =
      $("adjustNote")?.value?.trim() ||
      "";


    if (!productId) {

      showToast(
        "Please select a product.",
        "error"
      );

      return;

    }


    if (
      quantity <= 0
    ) {

      showToast(
        "Quantity must be greater than zero.",
        "error"
      );

      return;

    }


    const product =
      allProducts.find(
        (item) =>
          String(item.id) ===
          String(productId)
      );


    if (!product) {

      showToast(
        "Product not found.",
        "error"
      );

      return;

    }


    const currentStock =
      Number(
        product.current_stock ||
        0
      );


    if (
      direction === "out" &&
      quantity > currentStock
    ) {

      showToast(
        `Insufficient stock. Available: ${numberFormat(
          currentStock
        )}`,
        "error"
      );

      return;

    }


    const button =
      $("saveAdjustmentBtn");


    if (button) {

      button.disabled =
        true;

      button.innerHTML = `
        <i class="bi bi-arrow-repeat"></i>
        Saving...
      `;

    }


    try {

      let createdBy = null;


      try {

        const {
          data
        } =
          await client.auth.getUser();


        createdBy =
          data?.user?.id ||
          null;

      } catch (error) {

        console.warn(
          "Could not get current user:",
          error
        );

      }


      const finalNote = [
        reason
          ? `Reason: ${reason}`
          : "",

        note

      ]
        .filter(Boolean)
        .join(" — ");


      /*
       * Existing secure RPC
       *
       * adjust_product_stock(
       *   p_product_id,
       *   p_quantity,
       *   p_direction,
       *   p_note,
       *   p_created_by
       * )
       */

      const {
        data,
        error
      } = await client.rpc(
        "adjust_product_stock",
        {
          p_product_id:
            productId,

          p_quantity:
            quantity,

          p_direction:
            direction,

          p_note:
            finalNote ||
            "Manual stock adjustment",

          p_created_by:
            createdBy
        }
      );


      if (error) {
        throw error;
      }


      console.log(
        "Stock adjustment result:",
        data
      );


      closeModal(
        "stockAdjustmentModal"
      );


      showToast(
        "Stock adjusted successfully."
      );


      await loadProducts();


    } catch (error) {

      console.error(
        "Stock adjustment error:",
        error
      );


      showToast(
        error?.message ||
        "Failed to adjust stock.",
        "error"
      );


    } finally {

      if (button) {

        button.disabled =
          false;

        button.innerHTML = `
          <i class="bi bi-check2-circle"></i>
          Save Adjustment
        `;

      }

    }
  }


  /* =======================================================
     VIEW STOCK
     ======================================================= */

  async function viewStock(
    productId
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


    const product =
      allProducts.find(
        (item) =>
          String(item.id) ===
          String(productId)
      );


    if (!product) {

      showToast(
        "Product not found.",
        "error"
      );

      return;

    }


    selectedProduct =
      product;


    if ($("stockDetailsSubtitle")) {

      $("stockDetailsSubtitle")
        .textContent =
        `${product.name} — ${
          product.sku ||
          product.product_code ||
          ""
        }`;

    }


    openModal(
      "stockDetailsModal"
    );


    const body =
      $("stockDetailsBody");


    if (!body) {
      return;
    }


    body.innerHTML = `

      <div class="stock-state">

        <i class="bi bi-arrow-repeat"></i>

        <span>
          Loading stock history...
        </span>

      </div>

    `;


    try {

      const {
        data,
        error
      } = await client
        .from("stock_movements")
        .select("*")
        .eq(
          "product_id",
          productId
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        )
        .limit(100);


      if (error) {
        throw error;
      }


      renderStockDetails(
        product,
        data || []
      );


    } catch (error) {

      console.error(
        "Stock history error:",
        error
      );


      body.innerHTML = `

        <div class="
          stock-state
          error
        ">

          <i class="
            bi
            bi-exclamation-triangle
          "></i>

          <span>
            ${escapeHtml(
              error?.message ||
              "Failed to load stock history."
            )}
          </span>

        </div>

      `;

    }

  }


  /* =======================================================
     MOVEMENT DIRECTION
     ======================================================= */

  function getMovementDirection(
    movement
  ) {

    const direction =
      normalize(
        movement.direction
      );


    if (
      direction === "in" ||
      direction === "out"
    ) {

      return direction;

    }


    const type =
      normalize(
        movement.movement_type ||
        movement.type
      );


    const inTypes = [
      "purchase",
      "return",
      "stock_in",
      "adjustment_in",
      "in"
    ];


    if (
      inTypes.includes(type)
    ) {

      return "in";

    }


    return "out";
  }


  /* =======================================================
     RENDER STOCK DETAILS
     ======================================================= */

  function renderStockDetails(
    product,
    movements
  ) {

    const body =
      $("stockDetailsBody");


    if (!body) {
      return;
    }


    const totalIn =
      movements
        .filter(
          (movement) =>
            getMovementDirection(
              movement
            ) === "in"
        )
        .reduce(
          (
            total,
            movement
          ) =>
            total +
            Number(
              movement.quantity || 0
            ),
          0
        );


    const totalOut =
      movements
        .filter(
          (movement) =>
            getMovementDirection(
              movement
            ) === "out"
        )
        .reduce(
          (
            total,
            movement
          ) =>
            total +
            Number(
              movement.quantity || 0
            ),
          0
        );


    const minStock =
      getMinStock(product);


    const maxStock =
      getMaxStock(product);


    body.innerHTML = `

      <!-- =============================================
           SUMMARY
           ============================================= -->

      <div class="
        stock-details-summary
      ">


        <div class="
          stock-detail-box
        ">

          <div class="
            stock-detail-label
          ">
            Current Stock
          </div>

          <div class="
            stock-detail-value
          ">
            ${numberFormat(
              product.current_stock
            )}
          </div>

        </div>


        <div class="
          stock-detail-box
        ">

          <div class="
            stock-detail-label
          ">
            Minimum Stock
          </div>

          <div class="
            stock-detail-value
          ">
            ${numberFormat(
              minStock
            )}
          </div>

        </div>


        <div class="
          stock-detail-box
        ">

          <div class="
            stock-detail-label
          ">
            Total IN
          </div>

          <div class="
            stock-detail-value
          ">
            ${numberFormat(
              totalIn
            )}
          </div>

        </div>


        <div class="
          stock-detail-box
        ">

          <div class="
            stock-detail-label
          ">
            Total OUT
          </div>

          <div class="
            stock-detail-value
          ">
            ${numberFormat(
              totalOut
            )}
          </div>

        </div>


      </div>


      <!-- =============================================
           PRODUCT INFORMATION
           ============================================= -->

      <div class="
        stock-detail-section
      ">

        <div class="
          stock-detail-section-title
        ">
          Product Information
        </div>


        <div
          style="
            display:grid;
            grid-template-columns:
              repeat(2,minmax(0,1fr));
            gap:12px;
          "
        >


          <div class="
            stock-detail-box
          ">

            <div class="
              stock-detail-label
            ">
              Product
            </div>

            <div
              class="
                stock-detail-value
              "
              style="
                font-size:13px;
              "
            >
              ${escapeHtml(
                product.name ||
                "-"
              )}
            </div>

          </div>


          <div class="
            stock-detail-box
          ">

            <div class="
              stock-detail-label
            ">
              Product Code
            </div>

            <div
              class="
                stock-detail-value
              "
              style="
                font-size:13px;
              "
            >
              ${escapeHtml(
                product.product_code ||
                "-"
              )}
            </div>

          </div>


          <div class="
            stock-detail-box
          ">

            <div class="
              stock-detail-label
            ">
              SKU
            </div>

            <div
              class="
                stock-detail-value
              "
              style="
                font-size:13px;
              "
            >
              ${escapeHtml(
                product.sku ||
                "-"
              )}
            </div>

          </div>


          <div class="
            stock-detail-box
          ">

            <div class="
              stock-detail-label
            ">
              Maximum Stock
            </div>

            <div
              class="
                stock-detail-value
              "
              style="
                font-size:13px;
              "
            >
              ${numberFormat(
                maxStock
              )}
            </div>

          </div>


          <div class="
            stock-detail-box
          ">

            <div class="
              stock-detail-label
            ">
              Unit
            </div>

            <div
              class="
                stock-detail-value
              "
              style="
                font-size:13px;
              "
            >
              ${escapeHtml(
                product.unit ||
                "-"
              )}
            </div>

          </div>


          <div class="
            stock-detail-box
          ">

            <div class="
              stock-detail-label
            ">
              Status
            </div>

            <div
              style="
                margin-top:5px;
              "
            >
              ${renderStockStatus(
                product
              )}
            </div>

          </div>


        </div>

      </div>


      <!-- =============================================
           MOVEMENT HISTORY
           ============================================= -->

      <div class="
        stock-detail-section
      ">

        <div class="
          stock-detail-section-title
        ">
          Stock Movement History
        </div>


        ${
          movements.length
            ? `

              <div class="
                stock-table-wrap
              ">

                <table
                  class="
                    movement-table
                  "
                >

                  <thead>

                    <tr>

                      <th>
                        Date
                      </th>

                      <th>
                        Type
                      </th>

                      <th>
                        Direction
                      </th>

                      <th>
                        Quantity
                      </th>

                      <th>
                        Reference
                      </th>

                      <th>
                        Note
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    ${movements.map(
                      (movement) => {

                        const direction =
                          getMovementDirection(
                            movement
                          );


                        const type =
                          movement.movement_type ||
                          movement.type ||
                          "-";


                        const reference =
                          movement.reference_type ||
                          "-";


                        return `

                          <tr>

                            <td>
                              ${formatDate(
                                movement.created_at,
                                true
                              )}
                            </td>


                            <td>
                              ${escapeHtml(
                                type
                              )}
                            </td>


                            <td>

                              <span class="
                                ${
                                  direction === "in"
                                    ? "movement-in"
                                    : "movement-out"
                                }
                              ">

                                <i class="
                                  bi
                                  ${
                                    direction === "in"
                                      ? "bi-arrow-down-left"
                                      : "bi-arrow-up-right"
                                  }
                                "></i>

                                ${
                                  direction === "in"
                                    ? "IN"
                                    : "OUT"
                                }

                              </span>

                            </td>


                            <td>
                              ${numberFormat(
                                movement.quantity
                              )}
                            </td>


                            <td>
                              ${escapeHtml(
                                reference
                              )}
                            </td>


                            <td>
                              ${escapeHtml(
                                movement.note ||
                                "-"
                              )}
                            </td>

                          </tr>

                        `;

                      }
                    ).join("")}

                  </tbody>

                </table>

              </div>

            `
            : `

              <div class="stock-state">

                <i class="
                  bi
                  bi-clock-history
                "></i>

                <span>
                  No stock movement history found.
                </span>

              </div>

            `
        }

      </div>

    `;

  }


  /* =======================================================
     BIND EVENTS
     ======================================================= */

  function bindEvents() {


    /* Refresh */

    $("refreshStockBtn")
      ?.addEventListener(
        "click",
        loadProducts
      );


    /* Search */

    $("stockSearch")
      ?.addEventListener(
        "input",
        filterProducts
      );


    /* Status */

    $("stockStatusFilter")
      ?.addEventListener(
        "change",
        filterProducts
      );


    /* Category */

    $("stockCategoryFilter")
      ?.addEventListener(
        "change",
        filterProducts
      );


    /* Header Adjustment */

    $("adjustStockBtn")
      ?.addEventListener(
        "click",
        () => openAdjustment()
      );


    /* Product select */

    $("adjustProduct")
      ?.addEventListener(
        "change",
        updateAdjustmentCurrent
      );


    /* Direction */

    $("adjustDirection")
      ?.addEventListener(
        "change",
        updateAdjustmentPreview
      );


    /* Quantity */

    $("adjustQuantity")
      ?.addEventListener(
        "input",
        updateAdjustmentPreview
      );


    /* Form */

    $("stockAdjustmentForm")
      ?.addEventListener(
        "submit",
        saveAdjustment
      );


    /* Table buttons */

    $("stockTableBody")
      ?.addEventListener(
        "click",
        (event) => {


          const viewButton =
            event.target.closest(
              "[data-view-stock]"
            );


          const adjustButton =
            event.target.closest(
              "[data-adjust-stock]"
            );


          if (viewButton) {

            viewStock(
              viewButton.dataset
                .viewStock
            );

            return;

          }


          if (adjustButton) {

            openAdjustment(
              adjustButton.dataset
                .adjustStock
            );

          }

        }
      );


    /* Close buttons */

    document.addEventListener(
      "click",
      (event) => {


        if (
          event.target.closest(
            "[data-close-stock-details]"
          )
        ) {

          closeModal(
            "stockDetailsModal"
          );

        }


        if (
          event.target.closest(
            "[data-close-stock-adjustment]"
          )
        ) {

          closeModal(
            "stockAdjustmentModal"
          );

        }


        /* Overlay */

        if (
          event.target.classList.contains(
            "stock-modal-overlay"
          )
        ) {

          const modal =
            event.target.closest(
              ".stock-modal"
            );


          if (modal) {

            modal.classList.remove(
              "is-open"
            );

            modal.setAttribute(
              "aria-hidden",
              "true"
            );

          }

        }

      }
    );


    /* ESC */

    document.addEventListener(
      "keydown",
      (event) => {

        if (
          event.key !== "Escape"
        ) {
          return;
        }


        closeModal(
          "stockDetailsModal"
        );


        closeModal(
          "stockAdjustmentModal"
        );

      }
    );

  }


  /* =======================================================
     INITIALIZE
     ======================================================= */

  document.addEventListener(
    "DOMContentLoaded",
    async () => {

      bindEvents();

      await loadCategories();

      await loadProducts();

    }
  );


  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.MIXNBUY_STOCK = {

    load:
      loadProducts,

    view:
      viewStock,

    adjust:
      openAdjustment

  };


})();