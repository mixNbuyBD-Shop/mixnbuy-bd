/* =========================================================
   MIXNBUY.BD
   COUPONS MODULE
   ========================================================= */

(function () {

  "use strict";


  /* =======================================================
     STATE
     ======================================================= */

  let allCoupons = [];
  let filteredCoupons = [];

  let editingCouponId = null;


  /* =======================================================
     SUPABASE CLIENT
     ======================================================= */

  function getCouponsClient() {

    if (
      typeof window.getClient === "function"
    ) {
      const client = window.getClient();

      if (client) {
        return client;
      }
    }

    if (window.supabaseClient) {
      return window.supabaseClient;
    }

    return null;
  }


  /* =======================================================
     INIT
     ======================================================= */

  document.addEventListener(
    "DOMContentLoaded",
    initCoupons
  );


  async function initCoupons() {

    bindEvents();

    await loadCoupons();

  }


  /* =======================================================
     EVENTS
     ======================================================= */

  function bindEvents() {

    const addButton =
      document.getElementById("addCouponBtn");

    const refreshButton =
      document.getElementById("refreshCouponsBtn");

    const searchInput =
      document.getElementById("couponSearch");

    const statusFilter =
      document.getElementById("couponStatusFilter");

    const typeFilter =
      document.getElementById("couponTypeFilter");

    const clearButton =
      document.getElementById(
        "clearCouponFiltersBtn"
      );

    const form =
      document.getElementById("couponForm");


    if (addButton) {

      addButton.addEventListener(
        "click",
        openAddCouponModal
      );

    }


    if (refreshButton) {

      refreshButton.addEventListener(
        "click",
        loadCoupons
      );

    }


    if (searchInput) {

      searchInput.addEventListener(
        "input",
        applyFilters
      );

    }


    if (statusFilter) {

      statusFilter.addEventListener(
        "change",
        applyFilters
      );

    }


    if (typeFilter) {

      typeFilter.addEventListener(
        "change",
        applyFilters
      );

    }


    if (clearButton) {

      clearButton.addEventListener(
        "click",
        clearFilters
      );

    }


    if (form) {

      form.addEventListener(
        "submit",
        saveCoupon
      );

    }


    bindModalEvents();

  }


  /* =======================================================
     MODAL EVENTS
     ======================================================= */

  function bindModalEvents() {

    const closeButton =
      document.getElementById(
        "closeCouponModal"
      );

    const cancelButton =
      document.getElementById(
        "cancelCouponBtn"
      );

    const closeViewButton =
      document.getElementById(
        "closeViewCouponModal"
      );

    const closeViewFooter =
      document.getElementById(
        "closeViewCouponBtn"
      );


    if (closeButton) {

      closeButton.addEventListener(
        "click",
        closeCouponModal
      );

    }


    if (cancelButton) {

      cancelButton.addEventListener(
        "click",
        closeCouponModal
      );

    }


    if (closeViewButton) {

      closeViewButton.addEventListener(
        "click",
        closeViewCouponModal
      );

    }


    if (closeViewFooter) {

      closeViewFooter.addEventListener(
        "click",
        closeViewCouponModal
      );

    }


    document.addEventListener(
      "keydown",
      function (event) {

        if (event.key !== "Escape") {
          return;
        }

        closeCouponModal();
        closeViewCouponModal();

      }
    );


    const couponType =
      document.getElementById(
        "couponType"
      );

    const couponValue =
      document.getElementById(
        "couponValue"
      );


    if (couponType) {

      couponType.addEventListener(
        "change",
        function () {

          updateValuePlaceholder();

        }
      );

    }


    if (couponValue) {

      couponValue.addEventListener(
        "input",
        function () {

          validateCouponValue();

        }
      );

    }

  }


  /* =======================================================
     LOAD COUPONS
     ======================================================= */

  async function loadCoupons() {

    const client = getCouponsClient();

    if (!client) {

      console.error(
        "Supabase client not initialized."
      );

      showTableMessage(
        "Supabase connection is not available.",
        "bi-database-x"
      );

      return;

    }


    showTableMessage(
      "Loading coupons...",
      "bi-arrow-repeat",
      true
    );


    try {

      const {
        data,
        error
      } = await client
        .from("coupons")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        )
        .limit(500);


      if (error) {

        console.error(
          "Coupon load error:",
          error
        );

        throw error;

      }


      allCoupons =
        Array.isArray(data)
          ? data.map(normalizeCoupon)
          : [];


      filteredCoupons =
        [...allCoupons];


      updateStats();

      renderCoupons();


    } catch (error) {

      console.error(
        "Coupon load error:",
        error
      );


      allCoupons = [];
      filteredCoupons = [];


      updateStats();


      showTableMessage(
        error?.message ||
        "Failed to load coupons.",
        "bi-exclamation-triangle"
      );

    }

  }


  /* =======================================================
     NORMALIZE
     ======================================================= */

  function normalizeCoupon(coupon) {

    return {

      ...coupon,

      code:
        String(
          coupon.code || ""
        ).trim().toUpperCase(),

      /*
       * IMPORTANT:
       * Supabase column = discount_type
       * Frontend uses = type
       */
      type:
        String(
          coupon.discount_type || "percentage"
        ).toLowerCase(),

      /*
       * IMPORTANT:
       * Supabase column = discount_value
       * Frontend uses = value
       */
      value:
        Number(
          coupon.discount_value || 0
        ),

      minimum_order:
        Number(
          coupon.minimum_order || 0
        ),

      maximum_discount:
        coupon.maximum_discount === null ||
        coupon.maximum_discount === undefined ||
        coupon.maximum_discount === ""
          ? null
          : Number(
              coupon.maximum_discount
            ),

      usage_limit:
        coupon.usage_limit === null ||
        coupon.usage_limit === undefined ||
        coupon.usage_limit === ""
          ? null
          : Number(
              coupon.usage_limit
            ),

      used_count:
        Number(
          coupon.used_count || 0
        ),

      status:
        String(
          coupon.status || "inactive"
        ).toLowerCase()

    };

  }


  /* =======================================================
     FILTERS
     ======================================================= */

  function applyFilters() {

    const search =
      (
        document.getElementById(
          "couponSearch"
        )?.value || ""
      )
      .trim()
      .toLowerCase();


    const status =
      document.getElementById(
        "couponStatusFilter"
      )?.value || "";


    const type =
      document.getElementById(
        "couponTypeFilter"
      )?.value || "";


    filteredCoupons =
      allCoupons.filter(
        function (coupon) {

          const matchesSearch =
            !search ||
            coupon.code
              .toLowerCase()
              .includes(search);


          const matchesStatus =
            !status ||
            coupon.status === status;


          const matchesType =
            !type ||
            coupon.type === type;


          return (
            matchesSearch &&
            matchesStatus &&
            matchesType
          );

        }
      );


    renderCoupons();

  }


  /* =======================================================
     CLEAR FILTERS
     ======================================================= */

  function clearFilters() {

    const search =
      document.getElementById(
        "couponSearch"
      );

    const status =
      document.getElementById(
        "couponStatusFilter"
      );

    const type =
      document.getElementById(
        "couponTypeFilter"
      );


    if (search) {
      search.value = "";
    }


    if (status) {
      status.value = "";
    }


    if (type) {
      type.value = "";
    }


    applyFilters();

  }


  /* =======================================================
     STATS
     ======================================================= */

  function updateStats() {

    const total =
      allCoupons.length;


    const active =
      allCoupons.filter(
        coupon =>
          coupon.status === "active" &&
          !isExpired(coupon)
      ).length;


    const expired =
      allCoupons.filter(
        coupon =>
          isExpired(coupon)
      ).length;


    const usage =
      allCoupons.reduce(
        function (sum, coupon) {

          return (
            sum +
            Number(
              coupon.used_count || 0
            )
          );

        },
        0
      );


    setText(
      "totalCoupons",
      total
    );


    setText(
      "activeCoupons",
      active
    );


    setText(
      "expiredCoupons",
      expired
    );


    setText(
      "totalCouponUsage",
      usage
    );

  }


  /* =======================================================
     RENDER
     ======================================================= */

  function renderCoupons() {

    const tbody =
      document.getElementById(
        "couponsTableBody"
      );


    const countText =
      document.getElementById(
        "couponCountText"
      );


    if (!tbody) {
      return;
    }


    if (countText) {

      countText.textContent =
        `${filteredCoupons.length} coupon${
          filteredCoupons.length === 1
            ? ""
            : "s"
        }`;

    }


    if (!filteredCoupons.length) {

      tbody.innerHTML = `

        <tr>

          <td colspan="9">

            <div class="empty-state">

              <i class="bi bi-ticket-perforated"></i>

              <div>
                No coupons found.
              </div>

            </div>

          </td>

        </tr>

      `;

      return;

    }


    tbody.innerHTML =
      filteredCoupons
        .map(renderCouponRow)
        .join("");


    bindRowActions();

  }


  /* =======================================================
     ROW
     ======================================================= */

  function renderCouponRow(coupon) {

    const status =
      getCouponDisplayStatus(coupon);


    const value =
      coupon.type === "percentage"
        ? `${formatNumber(coupon.value)}%`
        : formatMoney(coupon.value);


    const type =
      coupon.type === "percentage"
        ? "Percentage"
        : "Fixed Amount";


    const minOrder =
      coupon.minimum_order > 0
        ? formatMoney(
            coupon.minimum_order
          )
        : "No Minimum";


    const maxDiscount =
      coupon.maximum_discount !== null
        ? formatMoney(
            coupon.maximum_discount
          )
        : "No Limit";


    const usage =
      coupon.usage_limit !== null
        ? `${coupon.used_count} / ${coupon.usage_limit}`
        : `${coupon.used_count} / ∞`;


    const validity =
      renderValidity(coupon);


    return `

      <tr>

        <td>

          <div class="coupon-code">

            <i class="bi bi-ticket-perforated"></i>

            ${escapeHtml(coupon.code)}

          </div>

        </td>


        <td>

          <div class="coupon-type">
            ${type}
          </div>

        </td>


        <td>

          <div class="coupon-value">
            ${value}
          </div>

        </td>


        <td>
          ${minOrder}
        </td>


        <td>
          ${maxDiscount}
        </td>


        <td>
          ${validity}
        </td>


        <td>

          <div class="coupon-usage">

            <strong>
              ${usage}
            </strong>

          </div>

        </td>


        <td>

          <span
            class="coupon-status ${status.className}"
          >
            ${status.label}
          </span>

        </td>


        <td>

          <div class="coupon-actions">


            <button
              type="button"
              class="coupon-action-btn"
              title="View"
              data-action="view"
              data-id="${coupon.id}"
            >

              <i class="bi bi-eye"></i>

            </button>


            <button
              type="button"
              class="coupon-action-btn"
              title="Edit"
              data-action="edit"
              data-id="${coupon.id}"
            >

              <i class="bi bi-pencil"></i>

            </button>


            <button
              type="button"
              class="coupon-action-btn"
              title="${
                coupon.status === "active"
                  ? "Deactivate"
                  : "Activate"
              }"
              data-action="toggle"
              data-id="${coupon.id}"
            >

              <i class="bi ${
                coupon.status === "active"
                  ? "bi-toggle-on"
                  : "bi-toggle-off"
              }"></i>

            </button>


            <button
              type="button"
              class="coupon-action-btn danger"
              title="Delete"
              data-action="delete"
              data-id="${coupon.id}"
            >

              <i class="bi bi-trash"></i>

            </button>

          </div>

        </td>

      </tr>

    `;

  }


  /* =======================================================
     VALIDITY
     ======================================================= */

  function renderValidity(coupon) {

    const start =
      coupon.start_date
        ? formatDateTime(
            coupon.start_date
          )
        : "Immediately";


    const end =
      coupon.end_date
        ? formatDateTime(
            coupon.end_date
          )
        : "No Expiry";


    return `

      <div class="coupon-validity">

        <span>
          From: ${start}
        </span>

        <strong>
          To: ${end}
        </strong>

      </div>

    `;

  }


  /* =======================================================
     ROW ACTIONS
     ======================================================= */

  function bindRowActions() {

    document
      .querySelectorAll(
        "[data-action]"
      )
      .forEach(
        function (button) {

          button.addEventListener(
            "click",
            handleRowAction
          );

        }
      );

  }


  async function handleRowAction(event) {

    const button =
      event.currentTarget;


    const action =
      button.dataset.action;


    const id =
      button.dataset.id;


    if (!id) {
      return;
    }


    if (action === "view") {

      viewCoupon(id);

      return;

    }


    if (action === "edit") {

      editCoupon(id);

      return;

    }


    if (action === "toggle") {

      await toggleCouponStatus(id);

      return;

    }


    if (action === "delete") {

      await deleteCoupon(id);

    }

  }


  /* =======================================================
     ADD
     ======================================================= */

  function openAddCouponModal() {

    editingCouponId = null;


    const form =
      document.getElementById(
        "couponForm"
      );


    if (form) {
      form.reset();
    }


    setValue(
      "couponId",
      ""
    );


    setValue(
      "couponType",
      "percentage"
    );


    setValue(
      "couponStatus",
      "active"
    );


    setText(
      "couponModalTitle",
      "Add Coupon"
    );


    updateValuePlaceholder();


    openModal(
      "couponModal"
    );

  }


  /* =======================================================
     EDIT
     ======================================================= */

  function editCoupon(id) {

    const coupon =
      allCoupons.find(
        item =>
          String(item.id) ===
          String(id)
      );


    if (!coupon) {

      alert(
        "Coupon not found."
      );

      return;

    }


    editingCouponId =
      coupon.id;


    setValue(
      "couponId",
      coupon.id
    );


    setValue(
      "couponCode",
      coupon.code
    );


    setValue(
      "couponType",
      coupon.type
    );


    setValue(
      "couponValue",
      coupon.value
    );


    setValue(
      "minimumOrder",
      coupon.minimum_order || ""
    );


    setValue(
      "maximumDiscount",
      coupon.maximum_discount ?? ""
    );


    setValue(
      "startDate",
      toDateTimeLocal(
        coupon.start_date
      )
    );


    setValue(
      "endDate",
      toDateTimeLocal(
        coupon.end_date
      )
    );


    setValue(
      "usageLimit",
      coupon.usage_limit ?? ""
    );


    setValue(
      "couponStatus",
      coupon.status
    );


    setText(
      "couponModalTitle",
      "Edit Coupon"
    );


    updateValuePlaceholder();


    openModal(
      "couponModal"
    );

  }


  /* =======================================================
     SAVE
     ======================================================= */

  async function saveCoupon(event) {

    event.preventDefault();


    const client =
      getCouponsClient();


    if (!client) {

      alert(
        "Supabase connection is not available."
      );

      return;

    }


    const code =
      String(
        document.getElementById(
          "couponCode"
        )?.value || ""
      )
      .trim()
      .toUpperCase();


    const type =
      document.getElementById(
        "couponType"
      )?.value || "percentage";


    const value =
      Number(
        document.getElementById(
          "couponValue"
        )?.value || 0
      );


    const minimumOrder =
      Number(
        document.getElementById(
          "minimumOrder"
        )?.value || 0
      );


    const maximumDiscountRaw =
      document.getElementById(
        "maximumDiscount"
      )?.value;


    const usageLimitRaw =
      document.getElementById(
        "usageLimit"
      )?.value;


    const startDateRaw =
      document.getElementById(
        "startDate"
      )?.value;


    const endDateRaw =
      document.getElementById(
        "endDate"
      )?.value;


    const status =
      document.getElementById(
        "couponStatus"
      )?.value || "active";


    if (!code) {

      alert(
        "Please enter coupon code."
      );

      return;

    }


    if (!/^[A-Z0-9_-]+$/.test(code)) {

      alert(
        "Coupon code may contain only letters, numbers, underscore and hyphen."
      );

      return;

    }


    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {

      alert(
        "Please enter a valid discount value."
      );

      return;

    }


    if (
      type === "percentage" &&
      value > 100
    ) {

      alert(
        "Percentage discount cannot be greater than 100%."
      );

      return;

    }


    if (
      minimumOrder < 0
    ) {

      alert(
        "Minimum order cannot be negative."
      );

      return;

    }


    const maximumDiscount =
      maximumDiscountRaw === ""
        ? null
        : Number(
            maximumDiscountRaw
          );


    const usageLimit =
      usageLimitRaw === ""
        ? null
        : Number(
            usageLimitRaw
          );


    if (
      maximumDiscount !== null &&
      (
        !Number.isFinite(
          maximumDiscount
        ) ||
        maximumDiscount < 0
      )
    ) {

      alert(
        "Maximum discount is invalid."
      );

      return;

    }


    if (
      usageLimit !== null &&
      (
        !Number.isInteger(
          usageLimit
        ) ||
        usageLimit < 0
      )
    ) {

      alert(
        "Usage limit must be a valid whole number."
      );

      return;

    }


    const startDate =
      startDateRaw
        ? new Date(
            startDateRaw
          ).toISOString()
        : null;


    const endDate =
      endDateRaw
        ? new Date(
            endDateRaw
          ).toISOString()
        : null;


    if (
      startDate &&
      endDate &&
      new Date(startDate) >
      new Date(endDate)
    ) {

      alert(
        "End date must be after start date."
      );

      return;

    }


    const saveButton =
      document.getElementById(
        "saveCouponBtn"
      );


    setButtonLoading(
      saveButton,
      true,
      "Saving..."
    );


    try {

      /*
       * IMPORTANT SUPABASE FIELD NAMES
       *
       * Database:
       * discount_type
       * discount_value
       *
       * NOT:
       * type
       * value
       */

      const payload = {

        code,

        discount_type:
          type,

        discount_value:
          value,

        minimum_order:
          minimumOrder,

        maximum_discount:
          maximumDiscount,

        start_date:
          startDate,

        end_date:
          endDate,

        usage_limit:
          usageLimit,

        status

      };


      let error = null;


      if (editingCouponId) {

        const result =
          await client
            .from("coupons")
            .update(payload)
            .eq(
              "id",
              editingCouponId
            );


        error =
          result.error;

      } else {

        const result =
          await client
            .from("coupons")
            .insert(payload);


        error =
          result.error;

      }


      if (error) {

        console.error(
          "Coupon save error:",
          error
        );

        throw error;

      }


      closeCouponModal();


      await loadCoupons();


      alert(
        editingCouponId
          ? "Coupon updated successfully."
          : "Coupon created successfully."
      );


    } catch (error) {

      console.error(
        "Coupon save error:",
        error
      );


      alert(
        error?.message ||
        "Failed to save coupon."
      );

    } finally {

      setButtonLoading(
        saveButton,
        false,
        "Save Coupon"
      );

    }

  }


  /* =======================================================
     VIEW
     ======================================================= */

  function viewCoupon(id) {

    const coupon =
      allCoupons.find(
        item =>
          String(item.id) ===
          String(id)
      );


    if (!coupon) {
      return;
    }


    const container =
      document.getElementById(
        "couponDetailsContent"
      );


    if (!container) {
      return;
    }


    const status =
      getCouponDisplayStatus(
        coupon
      );


    const type =
      coupon.type === "percentage"
        ? "Percentage"
        : "Fixed Amount";


    const value =
      coupon.type === "percentage"
        ? `${formatNumber(coupon.value)}%`
        : formatMoney(coupon.value);


    const minimum =
      coupon.minimum_order > 0
        ? formatMoney(
            coupon.minimum_order
          )
        : "No Minimum";


    const maximum =
      coupon.maximum_discount !== null
        ? formatMoney(
            coupon.maximum_discount
          )
        : "No Limit";


    const usage =
      coupon.usage_limit !== null
        ? `${coupon.used_count} / ${coupon.usage_limit}`
        : `${coupon.used_count} / Unlimited`;


    container.innerHTML = `

      <div class="coupon-details-grid">


        <div class="coupon-detail-item full">

          <div class="coupon-detail-label">
            Coupon Code
          </div>

          <div class="coupon-detail-value">
            ${escapeHtml(coupon.code)}
          </div>

        </div>


        <div class="coupon-detail-item">

          <div class="coupon-detail-label">
            Discount Type
          </div>

          <div class="coupon-detail-value">
            ${type}
          </div>

        </div>


        <div class="coupon-detail-item">

          <div class="coupon-detail-label">
            Discount Value
          </div>

          <div class="coupon-detail-value">
            ${value}
          </div>

        </div>


        <div class="coupon-detail-item">

          <div class="coupon-detail-label">
            Minimum Order
          </div>

          <div class="coupon-detail-value">
            ${minimum}
          </div>

        </div>


        <div class="coupon-detail-item">

          <div class="coupon-detail-label">
            Maximum Discount
          </div>

          <div class="coupon-detail-value">
            ${maximum}
          </div>

        </div>


        <div class="coupon-detail-item">

          <div class="coupon-detail-label">
            Usage
          </div>

          <div class="coupon-detail-value">
            ${usage}
          </div>

        </div>


        <div class="coupon-detail-item">

          <div class="coupon-detail-label">
            Status
          </div>

          <div class="coupon-detail-value">

            <span
              class="coupon-status ${status.className}"
            >
              ${status.label}
            </span>

          </div>

        </div>


        <div class="coupon-detail-item">

          <div class="coupon-detail-label">
            Start Date
          </div>

          <div class="coupon-detail-value">
            ${
              coupon.start_date
                ? formatDateTime(
                    coupon.start_date
                  )
                : "Immediately"
            }
          </div>

        </div>


        <div class="coupon-detail-item">

          <div class="coupon-detail-label">
            End Date
          </div>

          <div class="coupon-detail-value">
            ${
              coupon.end_date
                ? formatDateTime(
                    coupon.end_date
                  )
                : "No Expiry"
            }
          </div>

        </div>


        <div class="coupon-detail-item">

          <div class="coupon-detail-label">
            Created
          </div>

          <div class="coupon-detail-value">
            ${
              coupon.created_at
                ? formatDateTime(
                    coupon.created_at
                  )
                : "—"
            }
          </div>

        </div>

      </div>

    `;


    openModal(
      "viewCouponModal"
    );

  }


  /* =======================================================
     TOGGLE STATUS
     ======================================================= */

  async function toggleCouponStatus(id) {

    const client =
      getCouponsClient();


    if (!client) {
      return;
    }


    const coupon =
      allCoupons.find(
        item =>
          String(item.id) ===
          String(id)
      );


    if (!coupon) {
      return;
    }


    const newStatus =
      coupon.status === "active"
        ? "inactive"
        : "active";


    const confirmed =
      confirm(
        `Are you sure you want to ${
          newStatus === "active"
            ? "activate"
            : "deactivate"
        } coupon "${coupon.code}"?`
      );


    if (!confirmed) {
      return;
    }


    try {

      const {
        error
      } = await client
        .from("coupons")
        .update({
          status: newStatus
        })
        .eq(
          "id",
          coupon.id
        );


      if (error) {
        throw error;
      }


      await loadCoupons();


    } catch (error) {

      console.error(
        "Coupon status error:",
        error
      );


      alert(
        error?.message ||
        "Failed to update coupon status."
      );

    }

  }


  /* =======================================================
     DELETE
     ======================================================= */

  async function deleteCoupon(id) {

    const client =
      getCouponsClient();


    if (!client) {
      return;
    }


    const coupon =
      allCoupons.find(
        item =>
          String(item.id) ===
          String(id)
      );


    if (!coupon) {
      return;
    }


    const confirmed =
      confirm(
        `Delete coupon "${coupon.code}"?\n\nThis action cannot be undone.`
      );


    if (!confirmed) {
      return;
    }


    try {

      const {
        error
      } = await client
        .from("coupons")
        .delete()
        .eq(
          "id",
          coupon.id
        );


      if (error) {

        console.error(
          "Coupon delete error:",
          error
        );

        throw error;

      }


      await loadCoupons();


      alert(
        "Coupon deleted successfully."
      );


    } catch (error) {

      console.error(
        "Coupon delete error:",
        error
      );


      alert(
        error?.message ||
        "Failed to delete coupon."
      );

    }

  }


  /* =======================================================
     STATUS
     ======================================================= */

  function getCouponDisplayStatus(
    coupon
  ) {

    if (
      coupon.status !== "active"
    ) {

      return {
        label: "Inactive",
        className: "inactive"
      };

    }


    if (
      isExpired(coupon)
    ) {

      return {
        label: "Expired",
        className: "expired"
      };

    }


    if (
      isNotStarted(coupon)
    ) {

      return {
        label: "Scheduled",
        className: "scheduled"
      };

    }


    if (
      coupon.usage_limit !== null &&
      coupon.used_count >=
      coupon.usage_limit
    ) {

      return {
        label: "Limit Reached",
        className: "limit"
      };

    }


    return {
      label: "Active",
      className: "active"
    };

  }


  function isExpired(coupon) {

    if (!coupon.end_date) {
      return false;
    }


    return (
      new Date(
        coupon.end_date
      ) < new Date()
    );

  }


  function isNotStarted(coupon) {

    if (!coupon.start_date) {
      return false;
    }


    return (
      new Date(
        coupon.start_date
      ) > new Date()
    );

  }


  /* =======================================================
     VALUE UI
     ======================================================= */

  function updateValuePlaceholder() {

    const type =
      document.getElementById(
        "couponType"
      )?.value;


    const input =
      document.getElementById(
        "couponValue"
      );


    if (!input) {
      return;
    }


    if (type === "percentage") {

      input.placeholder = "10";
      input.max = "100";

    } else {

      input.placeholder = "100";
      input.removeAttribute(
        "max"
      );

    }

  }


  function validateCouponValue() {

    const type =
      document.getElementById(
        "couponType"
      )?.value;


    const input =
      document.getElementById(
        "couponValue"
      );


    if (
      !input ||
      type !== "percentage"
    ) {
      return;
    }


    const value =
      Number(
        input.value || 0
      );


    if (value > 100) {

      input.value = 100;

    }

  }


  /* =======================================================
     MODALS
     ======================================================= */

  function openModal(id) {

    const modal =
      document.getElementById(id);


    if (!modal) {
      return;
    }


    modal.classList.add(
      "show"
    );


    modal.setAttribute(
      "aria-hidden",
      "false"
    );


    document.body.classList.add(
      "modal-open"
    );

  }


  function closeModal(id) {

    const modal =
      document.getElementById(id);


    if (!modal) {
      return;
    }


    modal.classList.remove(
      "show"
    );


    modal.setAttribute(
      "aria-hidden",
      "true"
    );


    if (
      !document.querySelector(
        ".admin-modal.show"
      )
    ) {

      document.body.classList.remove(
        "modal-open"
      );

    }

  }


  function closeCouponModal() {

    closeModal(
      "couponModal"
    );

  }


  function closeViewCouponModal() {

    closeModal(
      "viewCouponModal"
    );

  }


  /* =======================================================
     HELPERS
     ======================================================= */

  function setText(
    id,
    value
  ) {

    const element =
      document.getElementById(id);


    if (element) {
      element.textContent = value;
    }

  }


  function setValue(
    id,
    value
  ) {

    const element =
      document.getElementById(id);


    if (element) {
      element.value =
        value ?? "";
    }

  }


  function setButtonLoading(
    button,
    loading,
    text
  ) {

    if (!button) {
      return;
    }


    if (loading) {

      button.disabled = true;

      button.innerHTML = `

        <i class="bi bi-arrow-repeat"></i>
        ${text}

      `;

    } else {

      button.disabled = false;

      button.innerHTML = `

        <i class="bi bi-check-lg"></i>
        ${text}

      `;

    }

  }


  function showTableMessage(
    message,
    icon,
    spinning = false
  ) {

    const tbody =
      document.getElementById(
        "couponsTableBody"
      );


    if (!tbody) {
      return;
    }


    tbody.innerHTML = `

      <tr>

        <td colspan="9">

          <div class="loading-state">

            <i class="bi ${icon} ${
              spinning
                ? "bi-spin"
                : ""
            }"></i>

            <div>
              ${escapeHtml(message)}
            </div>

          </div>

        </td>

      </tr>

    `;

  }


  function formatMoney(
    value
  ) {

    const number =
      Number(value || 0);


    return (
      "BDT " +
      number.toLocaleString(
        "en-BD",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )
    );

  }


  function formatNumber(
    value
  ) {

    return Number(
      value || 0
    ).toLocaleString(
      "en-BD",
      {
        maximumFractionDigits: 2
      }
    );

  }


  function formatDateTime(
    value
  ) {

    if (!value) {
      return "—";
    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return "—";

    }


    return date.toLocaleString(
      "en-BD",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }
    );

  }


  function toDateTimeLocal(
    value
  ) {

    if (!value) {
      return "";
    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return "";

    }


    const offset =
      date.getTimezoneOffset();


    const local =
      new Date(
        date.getTime() -
        offset * 60000
      );


    return local
      .toISOString()
      .slice(
        0,
        16
      );

  }


  function escapeHtml(
    value
  ) {

    return String(
      value ?? ""
    )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

  }


  /* =======================================================
     GLOBAL API
     ======================================================= */

  window.MIXNBUY_COUPONS = {

    loadCoupons,

    openAddCouponModal,

    editCoupon,

    viewCoupon,

    toggleCouponStatus,

    deleteCoupon

  };


})();
