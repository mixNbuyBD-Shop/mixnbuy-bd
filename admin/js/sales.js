/* =========================================================
   MIXNBUY.BD ADMIN — SALES
   Supabase Integration
   ========================================================= */

(() => {

  "use strict";


  /* =======================================================
     GLOBALS
     ======================================================= */

  const sb =
    window.supabaseClient ||
    window.supabase ||
    null;

  let sales = [];
  let products = [];

  let editingSaleId = null;
  let viewOnly = false;


  /* =======================================================
     HELPERS
     ======================================================= */

  const $ = (id) =>
    document.getElementById(id);


  function money(value) {

    const number = Number(value || 0);

    return `BDT ${number.toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

  }


  function number(value) {

    const n = Number(value);

    return Number.isFinite(n) ? n : 0;

  }


  function escapeHtml(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  function formatDate(value) {

    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

  }


  function toLocalDateTime() {

    const d = new Date();

    const pad = (n) =>
      String(n).padStart(2, "0");

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  }


  function showToast(message, type = "success") {

    if (typeof window.showToast === "function") {
      window.showToast(message, type);
      return;
    }

    alert(message);

  }


  function showConfirm(message) {

    if (typeof window.showConfirm === "function") {
      return window.showConfirm(message);
    }

    return Promise.resolve(
      window.confirm(message)
    );

  }


  function statusBadge(status) {

    const safe =
      escapeHtml(status || "draft");

    return `
      <span class="sale-badge ${safe}">
        ${safe.charAt(0).toUpperCase() + safe.slice(1)}
      </span>
    `;

  }


  function paymentBadge(status) {

    const safe =
      escapeHtml(status || "unpaid");

    return `
      <span class="payment-badge ${safe}">
        ${safe.charAt(0).toUpperCase() + safe.slice(1)}
      </span>
    `;

  }


  /* =======================================================
     INITIALIZE
     ======================================================= */

  document.addEventListener(
    "DOMContentLoaded",
    init
  );


  async function init() {

    console.log(
      "MIXNBUY.BD Sales initializing..."
    );


    if (!sb) {

      console.error(
        "Supabase client is not initialized."
      );

      showToast(
        "Supabase client is not initialized.",
        "error"
      );

      return;

    }


    bindEvents();

    setDefaultForm();

    await loadProducts();

    await loadSales();

  }


  /* =======================================================
     EVENTS
     ======================================================= */

  function bindEvents() {

    $("newSaleBtn")
      ?.addEventListener(
        "click",
        () => openSaleModal()
      );


    $("emptyNewSaleBtn")
      ?.addEventListener(
        "click",
        () => openSaleModal()
      );


    $("addSaleItem")
      ?.addEventListener(
        "click",
        addSaleRow
      );


    $("closeSaleModal")
      ?.addEventListener(
        "click",
        closeSaleModal
      );


    $("cancelSale")
      ?.addEventListener(
        "click",
        closeSaleModal
      );


    $("saleForm")
      ?.addEventListener(
        "submit",
        saveSale
      );


    $("searchSale")
      ?.addEventListener(
        "input",
        renderSales
      );


    $("statusFilter")
      ?.addEventListener(
        "change",
        renderSales
      );


    $("paymentFilter")
      ?.addEventListener(
        "change",
        renderSales
      );


    $("refreshSalesBtn")
      ?.addEventListener(
        "click",
        async () => {

          await loadProducts();
          await loadSales();

        }
      );


    $("saleStatus")
      ?.addEventListener(
        "change",
        updateFormState
      );


    $("paymentStatus")
      ?.addEventListener(
        "change",
        updateFormState
      );


    $("saleModal")
      ?.addEventListener(
        "click",
        (event) => {

          if (
            event.target === $("saleModal")
          ) {

            closeSaleModal();

          }

        }
      );

  }


  /* =======================================================
     PRODUCTS
     ======================================================= */

  async function loadProducts() {

    const {
      data,
      error
    } = await sb
      .from("products")
      .select(`
        id,
        product_code,
        sku,
        name,
        current_stock,
        purchase_price,
        selling_price,
        discount_price,
        is_active
      `)
      .eq("is_active", true)
      .order("name", {
        ascending: true
      });


    if (error) {

      console.error(
        "Products load error:",
        error
      );

      showToast(
        error.message,
        "error"
      );

      return;

    }


    products = data || [];

  }


  /* =======================================================
     SALES
     ======================================================= */

  async function loadSales() {

    const tbody =
      $("salesTableBody");

    if (tbody) {

      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="sales-loading">
              <i class="bi bi-arrow-repeat"></i>
              <div>Loading sales...</div>
            </div>
          </td>
        </tr>
      `;

    }


    const {
      data,
      error
    } = await sb
      .from("sales")
      .select(`
        id,
        sale_no,
        sale_date,
        subtotal,
        discount,
        total_amount,
        payment_method,
        payment_status,
        status,
        note,
        created_at,
        updated_at,
        sales_items (
          id,
          product_id,
          product_name,
          sku,
          quantity,
          purchase_price,
          selling_price,
          discount,
          total_amount,
          gross_profit
        )
      `)
      .order("created_at", {
        ascending: false
      });


    if (error) {

      console.error(
        "Sales load error:",
        error
      );

      if (tbody) {
        tbody.innerHTML = "";
      }

      showToast(
        error.message,
        "error"
      );

      return;

    }


    sales = data || [];

    renderStats();

    renderSales();

  }


  /* =======================================================
     STATS
     ======================================================= */

  function renderStats() {

    let totalSales = 0;
    let completed = 0;
    let draft = 0;
    let totalProfit = 0;


    sales.forEach((sale) => {

      if (sale.status === "completed") {

        totalSales +=
          number(sale.total_amount);

        completed++;

        totalProfit +=
          (sale.sales_items || [])
            .reduce(
              (sum, item) =>
                sum + number(item.gross_profit),
              0
            );

      }


      if (sale.status === "draft") {
        draft++;
      }

    });


    if ($("statSales")) {
      $("statSales").textContent =
        money(totalSales);
    }


    if ($("statCompleted")) {
      $("statCompleted").textContent =
        completed;
    }


    if ($("statDraft")) {
      $("statDraft").textContent =
        draft;
    }


    if ($("statProfit")) {
      $("statProfit").textContent =
        money(totalProfit);
    }

  }


  /* =======================================================
     RENDER SALES
     ======================================================= */

  function renderSales() {

    const tbody =
      $("salesTableBody");

    const empty =
      $("salesEmpty");

    if (!tbody) return;


    const search =
      (
        $("searchSale")?.value ||
        ""
      )
        .trim()
        .toLowerCase();


    const status =
      $("statusFilter")?.value ||
      "";


    const payment =
      $("paymentFilter")?.value ||
      "";


    const filtered =
      sales.filter((sale) => {

        const saleNo =
          String(
            sale.sale_no || ""
          ).toLowerCase();


        const matchesSearch =
          !search ||
          saleNo.includes(search);


        const matchesStatus =
          !status ||
          sale.status === status;


        const matchesPayment =
          !payment ||
          sale.payment_status === payment;


        return (
          matchesSearch &&
          matchesStatus &&
          matchesPayment
        );

      });


    tbody.innerHTML = "";


    filtered.forEach((sale) => {

      const items =
        sale.sales_items || [];


      const totalQty =
        items.reduce(
          (sum, item) =>
            sum + number(item.quantity),
          0
        );


      const locked =
        sale.status === "completed" ||
        sale.status === "cancelled";


      const row =
        document.createElement("tr");


      row.innerHTML = `

        <td>
          <span class="sale-number">
            ${escapeHtml(
              sale.sale_no || "—"
            )}
          </span>
        </td>

        <td>
          ${formatDate(sale.sale_date)}
        </td>

        <td>
          <span class="item-count">
            ${items.length} item(s)
            · ${totalQty} qty
          </span>
        </td>

        <td>
          <span class="sale-total">
            ${money(sale.total_amount)}
          </span>
        </td>

        <td>
          ${paymentBadge(
            sale.payment_status
          )}
        </td>

        <td>
          ${statusBadge(
            sale.status
          )}
        </td>

        <td>
          <div class="sale-actions">

            <button
              type="button"
              class="sale-action-btn"
              title="View"
              data-action="view"
              data-id="${sale.id}"
            >
              <i class="bi bi-eye"></i>
            </button>

            ${
              locked
                ? `
                  <button
                    type="button"
                    class="sale-action-btn locked"
                    title="Locked"
                    disabled
                  >
                    <i class="bi bi-lock-fill"></i>
                  </button>
                `
                : `
                  <button
                    type="button"
                    class="sale-action-btn edit"
                    title="Edit"
                    data-action="edit"
                    data-id="${sale.id}"
                  >
                    <i class="bi bi-pencil-square"></i>
                  </button>
                `
            }

          </div>
        </td>

      `;


      tbody.appendChild(row);

    });


    tbody
      .querySelectorAll(
        "[data-action]"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.id;

            const action =
              button.dataset.action;


            if (action === "view") {
              openSaleModal(
                id,
                true
              );
            }


            if (action === "edit") {
              openSaleModal(
                id,
                false
              );
            }

          }
        );

      });


    if (empty) {

      empty.classList.toggle(
        "show",
        filtered.length === 0
      );

    }


    if ($("saleRecordCount")) {

      $("saleRecordCount")
        .textContent =
        `${filtered.length} Record${filtered.length === 1 ? "" : "s"}`;

    }

  }


  /* =======================================================
     DEFAULT FORM
     ======================================================= */

  function setDefaultForm() {

    if ($("saleDate")) {

      $("saleDate").value =
        toLocalDateTime();

    }


    if ($("saleStatus")) {
      $("saleStatus").value =
        "draft";
    }


    if ($("paymentMethod")) {
      $("paymentMethod").value =
        "cash";
    }


    if ($("paymentStatus")) {
      $("paymentStatus").value =
        "paid";
    }

  }


  /* =======================================================
     OPEN MODAL
     ======================================================= */

  function openSaleModal(
    saleId = null,
    readOnly = false
  ) {

    editingSaleId =
      saleId;

    viewOnly =
      readOnly;


    const modal =
      $("saleModal");

    if (!modal) return;


    modal.classList.add("show");


    if (!saleId) {

      $("modalTitle").textContent =
        "New Sale";


      setDefaultForm();


      $("saleId").value = "";


      $("saleNote").value = "";


      $("saleItemsBody").innerHTML = "";


      addSaleRow();

      updateFormState();

      calculateTotals();

      return;

    }


    const sale =
      sales.find(
        item => item.id === saleId
      );


    if (!sale) {

      showToast(
        "Sale not found.",
        "error"
      );

      closeSaleModal();

      return;

    }


    $("modalTitle").textContent =
      readOnly
        ? `View ${sale.sale_no || "Sale"}`
        : `Edit ${sale.sale_no || "Sale"}`;


    $("saleId").value =
      sale.id;


    $("saleDate").value =
      toInputDateTime(
        sale.sale_date
      );


    $("saleStatus").value =
      sale.status;


    $("paymentMethod").value =
      sale.payment_method ||
      "cash";


    $("paymentStatus").value =
      sale.payment_status ||
      "paid";


    $("saleNote").value =
      sale.note || "";


    $("saleItemsBody").innerHTML = "";


    (sale.sales_items || [])
      .forEach((item) => {

        addSaleRow(item);

      });


    updateFormState();

    calculateTotals();

  }


  function closeSaleModal() {

    $("saleModal")
      ?.classList.remove("show");

    editingSaleId = null;

    viewOnly = false;

  }


  function toInputDateTime(value) {

    if (!value) {
      return toLocalDateTime();
    }


    const d =
      new Date(value);


    if (Number.isNaN(d.getTime())) {
      return toLocalDateTime();
    }


    const pad =
      (n) =>
        String(n).padStart(2, "0");


    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  }


  /* =======================================================
     SALE ROW
     ======================================================= */

  function addSaleRow(item = null) {

    const tbody =
      $("saleItemsBody");

    if (!tbody) return;


    const tr =
      document.createElement("tr");


    tr.className =
      "sale-item-row";


    tr.innerHTML = `

      <td>
        <select
          class="sale-product"
          ${viewOnly ? "disabled" : ""}
        >
          <option value="">
            Select Product
          </option>

          ${products.map(product => `
            <option
              value="${product.id}"
              data-stock="${number(product.current_stock)}"
              data-price="${number(product.selling_price)}"
            >
              ${escapeHtml(product.name)}
              ${product.sku
                ? ` — ${escapeHtml(product.sku)}`
                : ""}
            </option>
          `).join("")}

        </select>
      </td>


      <td>
        <span class="stock-display">
          —
        </span>
      </td>


      <td>
        <input
          type="number"
          class="sale-qty"
          min="0.01"
          step="0.01"
          value="${item ? number(item.quantity) : 1}"
          ${viewOnly ? "disabled" : ""}
        >
      </td>


      <td>
        <input
          type="number"
          class="sale-price"
          min="0"
          step="0.01"
          value="${item ? number(item.selling_price) : ""}"
          ${viewOnly ? "disabled" : ""}
        >
      </td>


      <td>
        <input
          type="number"
          class="sale-discount"
          min="0"
          step="0.01"
          value="${item ? number(item.discount) : 0}"
          ${viewOnly ? "disabled" : ""}
        >
      </td>


      <td>
        <span class="item-total">
          BDT 0.00
        </span>
      </td>


      <td>
        ${
          viewOnly
            ? ""
            : `
              <button
                type="button"
                class="remove-item-btn"
                title="Remove"
              >
                <i class="bi bi-trash3"></i>
              </button>
            `
        }
      </td>

    `;


    tbody.appendChild(tr);


    const productSelect =
      tr.querySelector(
        ".sale-product"
      );


    const qtyInput =
      tr.querySelector(
        ".sale-qty"
      );


    const priceInput =
      tr.querySelector(
        ".sale-price"
      );


    const discountInput =
      tr.querySelector(
        ".sale-discount"
      );


    productSelect
      ?.addEventListener(
        "change",
        () => {

          const option =
            productSelect
              .selectedOptions[0];


          const stock =
            number(
              option?.dataset.stock
            );


          const price =
            number(
              option?.dataset.price
            );


          tr.querySelector(
            ".stock-display"
          ).textContent =
            stock;


          tr.querySelector(
            ".stock-display"
          ).classList.toggle(
            "out",
            stock <= 0
          );


          if (
            !priceInput.value ||
            number(priceInput.value) === 0
          ) {

            priceInput.value =
              price;

          }


          calculateTotals();

        }
      );


    qtyInput
      ?.addEventListener(
        "input",
        calculateTotals
      );


    priceInput
      ?.addEventListener(
        "input",
        calculateTotals
      );


    discountInput
      ?.addEventListener(
        "input",
        calculateTotals
      );


    tr.querySelector(
      ".remove-item-btn"
    )?.addEventListener(
      "click",
      () => {

        tr.remove();

        calculateTotals();

      }
    );


    if (item) {

      productSelect.value =
        item.product_id;


      const product =
        products.find(
          p => p.id === item.product_id
        );


      const stock =
        number(
          product?.current_stock
        );


      tr.querySelector(
        ".stock-display"
      ).textContent =
        stock;


      tr.querySelector(
        ".stock-display"
      ).classList.toggle(
        "out",
        stock <= 0
      );

    }

  }


  /* =======================================================
     TOTALS
     ======================================================= */

  function calculateTotals() {

    const rows =
      document.querySelectorAll(
        ".sale-item-row"
      );


    let subtotal = 0;
    let discount = 0;


    rows.forEach((row) => {

      const qty =
        number(
          row.querySelector(
            ".sale-qty"
          )?.value
        );


      const price =
        number(
          row.querySelector(
            ".sale-price"
          )?.value
        );


      const itemDiscount =
        number(
          row.querySelector(
            ".sale-discount"
          )?.value
        );


      const itemAmount =
        qty * price;


      const total =
        Math.max(
          0,
          itemAmount - itemDiscount
        );


      subtotal +=
        itemAmount;


      discount +=
        itemDiscount;


      const totalElement =
        row.querySelector(
          ".item-total"
        );


      if (totalElement) {

        totalElement.textContent =
          money(total);

      }

    });


    const total =
      Math.max(
        0,
        subtotal - discount
      );


    if ($("formSubtotal")) {

      $("formSubtotal")
        .textContent =
        money(subtotal);

    }


    if ($("formDiscount")) {

      $("formDiscount")
        .textContent =
        money(discount);

    }


    if ($("formTotal")) {

      $("formTotal")
        .textContent =
        money(total);

    }

  }


  /* =======================================================
     FORM STATE
     ======================================================= */

  function updateFormState() {

    const disabled =
      viewOnly ||
      $("saleStatus")?.value === "completed" ||
      $("saleStatus")?.value === "cancelled";


    const controls = [
      $("saleDate"),
      $("saleStatus"),
      $("paymentMethod"),
      $("paymentStatus"),
      $("saleNote"),
      $("addSaleItem")
    ];


    controls.forEach(
      (control) => {

        if (control) {
          control.disabled =
            viewOnly;
        }

      }
    );


    document
      .querySelectorAll(
        "#saleItemsBody input, #saleItemsBody select, #saleItemsBody button"
      )
      .forEach(
        control => {

          if (
            !viewOnly
          ) {

            control.disabled =
              false;

          } else {

            control.disabled =
              true;

          }

        }
      );


    const saveButton =
      $("saveSale");


    if (saveButton) {

      saveButton.style.display =
        viewOnly
          ? "none"
          : "inline-flex";

    }


    if ($("modalTitle")) {

      if (viewOnly) {

        $("modalTitle")
          .textContent =
          "View Sale";

      }

    }

  }


  /* =======================================================
     COLLECT ITEMS
     ======================================================= */

  function collectItems() {

    const rows =
      document.querySelectorAll(
        ".sale-item-row"
      );


    const items = [];


    rows.forEach((row) => {

      const productId =
        row.querySelector(
          ".sale-product"
        )?.value;


      const quantity =
        number(
          row.querySelector(
            ".sale-qty"
          )?.value
        );


      const sellingPrice =
        number(
          row.querySelector(
            ".sale-price"
          )?.value
        );


      const discount =
        number(
          row.querySelector(
            ".sale-discount"
          )?.value
        );


      if (!productId) {
        return;
      }


      items.push({

        product_id:
          productId,

        quantity:
          quantity,

        selling_price:
          sellingPrice,

        discount:
          discount

      });

    });


    return items;

  }


  /* =======================================================
     VALIDATE
     ======================================================= */

  function validateItems(items) {

    if (!items.length) {

      showToast(
        "Add at least one product.",
        "error"
      );

      return false;

    }


    for (const item of items) {

      if (
        !item.product_id
      ) {

        showToast(
          "Please select a product.",
          "error"
        );

        return false;

      }


      if (
        item.quantity <= 0
      ) {

        showToast(
          "Quantity must be greater than zero.",
          "error"
        );

        return false;

      }


      if (
        item.selling_price < 0
      ) {

        showToast(
          "Selling price cannot be negative.",
          "error"
        );

        return false;

      }


      if (
        item.discount < 0
      ) {

        showToast(
          "Discount cannot be negative.",
          "error"
        );

        return false;

      }


      const product =
        products.find(
          p => p.id === item.product_id
        );


      if (!product) {

        showToast(
          "Selected product is no longer available.",
          "error"
        );

        return false;

      }


      if (
        $("saleStatus")?.value === "completed" &&
        number(product.current_stock) <
        item.quantity
      ) {

        showToast(
          `Insufficient stock for ${product.name}. Available: ${product.current_stock}`,
          "error"
        );

        return false;

      }

    }


    return true;

  }


  /* =======================================================
     SAVE SALE
     ======================================================= */

  async function saveSale(event) {

    event.preventDefault();


    if (viewOnly) {
      return;
    }


    const items =
      collectItems();


    if (
      !validateItems(items)
    ) {
      return;
    }


    const status =
      $("saleStatus")?.value ||
      "draft";


    const payload = {

      p_sale_id:
        editingSaleId || null,

      p_sale_date:
        $("saleDate")?.value
          ? new Date(
              $("saleDate").value
            ).toISOString()
          : new Date().toISOString(),

      p_payment_method:
        $("paymentMethod")?.value ||
        "cash",

      p_payment_status:
        $("paymentStatus")?.value ||
        "paid",

      p_note:
        $("saleNote")?.value ||
        null,

      p_status:
        status,

      p_items:
        items

    };


    const button =
      $("saveSale");


    if (button) {

      button.disabled =
        true;

      button.innerHTML = `
        <i class="bi bi-arrow-repeat"></i>
        Saving...
      `;

    }


    try {

      const {
        data,
        error
      } = await sb.rpc(
        "save_sale",
        payload
      );


      if (error) {

        console.error(
          "save_sale error:",
          error
        );

        throw error;

      }


      console.log(
        "Sale saved:",
        data
      );


      showToast(
        status === "completed"
          ? "Sale completed successfully. Stock OUT processed."
          : "Sale saved successfully.",
        "success"
      );


      closeSaleModal();


      await loadProducts();

      await loadSales();

    }
    catch (error) {

      console.error(
        "Save sale failed:",
        error
      );


      showToast(
        error.message ||
        "Failed to save sale.",
        "error"
      );

    }
    finally {

      if (button) {

        button.disabled =
          false;

        button.innerHTML = `
          <i class="bi bi-check-lg"></i>
          Save Sale
        `;

      }

    }

  }


})();