/* =========================================================
   MIXNBUY.BD
   SUPPLIERS MANAGEMENT
   ========================================================= */

"use strict";


/* =========================================================
   STATE
   ========================================================= */

let allSuppliers = [];

let filteredSuppliers = [];

let editingSupplierId = null;

let deletingSupplierId = null;

let viewingSupplierId = null;



/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

function supplierClient() {

  if (typeof getClient === "function") {

    const client = getClient();

    if (client) {
      return client;
    }

  }


  if (
    typeof window.supabaseClient !== "undefined" &&
    window.supabaseClient
  ) {

    return window.supabaseClient;

  }


  if (
    typeof window.supabase !== "undefined" &&
    window.supabase
  ) {

    return window.supabase;

  }


  return null;

}



/* =========================================================
   DOM
   ========================================================= */

const $ = (id) =>
  document.getElementById(id);



/* =========================================================
   INIT
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  initSuppliers
);


async function initSuppliers() {

  bindEvents();

  await loadSuppliers();

}



/* =========================================================
   EVENTS
   ========================================================= */

function bindEvents() {


  $("newSupplierBtn")
    ?.addEventListener(
      "click",
      () => openSupplierModal()
    );


  $("toolbarAddSupplierBtn")
    ?.addEventListener(
      "click",
      () => openSupplierModal()
    );


  $("refreshSuppliersBtn")
    ?.addEventListener(
      "click",
      loadSuppliers
    );


  $("supplierSearch")
    ?.addEventListener(
      "input",
      applyFilters
    );


  $("statusFilter")
    ?.addEventListener(
      "change",
      applyFilters
    );


  $("supplierForm")
    ?.addEventListener(
      "submit",
      saveSupplier
    );


  $("closeSupplierModal")
    ?.addEventListener(
      "click",
      closeSupplierModal
    );


  $("cancelSupplierBtn")
    ?.addEventListener(
      "click",
      closeSupplierModal
    );


  $("closeViewSupplierModal")
    ?.addEventListener(
      "click",
      closeViewSupplierModal
    );


  $("viewCloseBtn")
    ?.addEventListener(
      "click",
      closeViewSupplierModal
    );


  $("viewEditBtn")
    ?.addEventListener(
      "click",
      editViewedSupplier
    );


  $("cancelDeleteSupplier")
    ?.addEventListener(
      "click",
      closeDeleteModal
    );


  $("confirmDeleteSupplier")
    ?.addEventListener(
      "click",
      confirmDeleteSupplier
    );


  document.addEventListener(
    "keydown",
    handleEscape
  );

}



/* =========================================================
   ESCAPE
   ========================================================= */

function handleEscape(event) {

  if (event.key !== "Escape") {
    return;
  }


  closeSupplierModal();

  closeViewSupplierModal();

  closeDeleteModal();

}



/* =========================================================
   LOAD SUPPLIERS
   ========================================================= */

async function loadSuppliers() {

  const client = supplierClient();


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
    "Loading suppliers...",
    "bi-arrow-repeat"
  );


  try {

    const {
      data,
      error
    } = await client

      .from("suppliers")

      .select(`
        id,
        supplier_code,
        name,
        company_name,
        phone,
        email,
        address,
        city,
        district,
        opening_balance,
        status,
        note,
        created_at,
        updated_at
      `)

      .order(
        "name",
        {
          ascending: true
        }
      );


    if (error) {
      throw error;
    }


    allSuppliers =
      Array.isArray(data)
        ? data
        : [];


    allSuppliers.forEach(
      supplier => {

        supplier.opening_balance =
          Number(
            supplier.opening_balance || 0
          );

      }
    );


    filteredSuppliers =
      [...allSuppliers];


    updateStats();

    renderSuppliers();


  } catch (error) {

    console.error(
      "Supplier load error:",
      error
    );


    allSuppliers = [];

    filteredSuppliers = [];


    updateStats();


    showTableMessage(
      error?.message ||
      "Failed to load suppliers.",
      "bi-exclamation-triangle"
    );

  }

}



/* =========================================================
   FILTER
   ========================================================= */

function applyFilters() {

  const search =
    (
      $("supplierSearch")?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  const status =
    $("statusFilter")?.value ||
    "";


  filteredSuppliers =
    allSuppliers.filter(
      supplier => {


        const searchable = [

          supplier.supplier_code,

          supplier.name,

          supplier.company_name,

          supplier.phone,

          supplier.email,

          supplier.address,

          supplier.city,

          supplier.district

        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();


        const matchesSearch =
          !search ||
          searchable.includes(search);


        const matchesStatus =
          !status ||
          String(
            supplier.status || ""
          ).toLowerCase() === status;


        return (
          matchesSearch &&
          matchesStatus
        );

      }
    );


  renderSuppliers();

}



/* =========================================================
   STATS
   ========================================================= */

function updateStats() {

  const total =
    allSuppliers.length;


  const active =
    allSuppliers.filter(
      supplier =>
        String(
          supplier.status || ""
        ).toLowerCase() === "active"
    ).length;


  const inactive =
    total - active;


  const balance =
    allSuppliers.reduce(
      (
        sum,
        supplier
      ) =>
        sum +
        Number(
          supplier.opening_balance || 0
        ),
      0
    );


  setText(
    "totalSuppliers",
    total
  );


  setText(
    "activeSuppliers",
    active
  );


  setText(
    "inactiveSuppliers",
    inactive
  );


  setText(
    "openingBalance",
    formatMoney(balance)
  );

}



/* =========================================================
   RENDER
   ========================================================= */

function renderSuppliers() {

  const tbody =
    $("suppliersTableBody");


  if (!tbody) {
    return;
  }


  setText(
    "supplierResultCount",
    `${filteredSuppliers.length} supplier${
      filteredSuppliers.length === 1
        ? ""
        : "s"
    }`
  );


  if (!filteredSuppliers.length) {

    tbody.innerHTML = `

      <tr>

        <td colspan="7">

          <div class="supplier-empty">

            <i class="bi bi-buildings"></i>

            <strong>
              No suppliers found
            </strong>

            <div>
              Try another search or add a new supplier.
            </div>

          </div>

        </td>

      </tr>

    `;

    return;

  }


  tbody.innerHTML =
    filteredSuppliers
      .map(
        supplier =>
          supplierRow(supplier)
      )
      .join("");

}



/* =========================================================
   SUPPLIER ROW
   ========================================================= */

function supplierRow(supplier) {

  const id =
    escapeHtml(
      supplier.id
    );


  const name =
    escapeHtml(
      supplier.name ||
      "Unnamed Supplier"
    );


  const code =
    escapeHtml(
      supplier.supplier_code ||
      "No Code"
    );


  const company =
    supplier.company_name
      ? escapeHtml(
          supplier.company_name
        )
      : `<span class="company-empty">—</span>`;


  const phone =
    supplier.phone
      ? escapeHtml(
          supplier.phone
        )
      : "—";


  const email =
    supplier.email
      ? escapeHtml(
          supplier.email
        )
      : "—";


  const city =
    supplier.city
      ? escapeHtml(
          supplier.city
        )
      : "";


  const district =
    supplier.district
      ? escapeHtml(
          supplier.district
        )
      : "";


  const location =
    city || district
      ? `

        <div class="location-cell">

          ${
            city
              ? `<div class="location-city">${city}</div>`
              : ""
          }

          ${
            district
              ? `<div class="location-district">${district}</div>`
              : ""
          }

        </div>

      `
      : `<span class="company-empty">—</span>`;


  const balance =
    Number(
      supplier.opening_balance || 0
    );


  const balanceClass =
    balance > 0
      ? "balance-positive"
      : "balance-zero";


  const status =
    String(
      supplier.status || "active"
    ).toLowerCase();


  const statusLabel =
    status === "active"
      ? "Active"
      : "Inactive";


  const initials =
    getInitials(
      supplier.name
    );


  return `

    <tr>


      <!-- Supplier -->

      <td>

        <div class="supplier-cell">


          <div class="supplier-avatar">

            <i class="bi bi-buildings"></i>

          </div>


          <div class="supplier-main">

            <div class="supplier-name">
              ${name}
            </div>

            <div class="supplier-code">
              ${code}
            </div>

          </div>


        </div>

      </td>



      <!-- Company -->

      <td>

        <div class="company-cell">

          ${company}

        </div>

      </td>



      <!-- Contact -->

      <td>

        <div class="contact-cell">


          <div class="contact-item">

            <i class="bi bi-telephone"></i>

            <span>
              ${phone}
            </span>

          </div>


          ${
            supplier.email
              ? `

                <div class="contact-item">

                  <i class="bi bi-envelope"></i>

                  <span>
                    ${email}
                  </span>

                </div>

              `
              : ""
          }


        </div>

      </td>



      <!-- Location -->

      <td>

        ${location}

      </td>



      <!-- Balance -->

      <td>

        <div
          class="balance-cell ${balanceClass}"
        >

          ${formatMoney(balance)}

        </div>

      </td>



      <!-- Status -->

      <td>

        <span
          class="supplier-status ${status}"
        >

          <span class="supplier-status-dot"></span>

          ${statusLabel}

        </span>

      </td>



      <!-- Actions -->

      <td>

        <div class="supplier-actions">


          <button
            type="button"
            class="supplier-action-btn view"
            title="View Supplier"
            onclick="viewSupplier('${id}')"
          >

            <i class="bi bi-eye"></i>

          </button>


          <button
            type="button"
            class="supplier-action-btn edit"
            title="Edit Supplier"
            onclick="editSupplier('${id}')"
          >

            <i class="bi bi-pencil"></i>

          </button>


          <button
            type="button"
            class="supplier-action-btn delete"
            title="Delete Supplier"
            onclick="deleteSupplier('${id}')"
          >

            <i class="bi bi-trash"></i>

          </button>


        </div>

      </td>


    </tr>

  `;

}



/* =========================================================
   OPEN ADD / EDIT MODAL
   ========================================================= */

function openSupplierModal(
  supplier = null
) {

  const modal =
    $("supplierModal");


  const form =
    $("supplierForm");


  if (!modal || !form) {
    return;
  }


  form.reset();


  editingSupplierId =
    supplier?.id || null;


  setText(
    "supplierModalTitle",
    supplier
      ? "Edit Supplier"
      : "Add Supplier"
  );


  setText(
    "saveSupplierBtn",
    supplier
      ? "Update Supplier"
      : "Save Supplier"
  );


  $("supplierId").value =
    supplier?.id || "";


  $("supplierName").value =
    supplier?.name || "";


  $("supplierCompany").value =
    supplier?.company_name || "";


  $("supplierPhone").value =
    supplier?.phone || "";


  $("supplierEmail").value =
    supplier?.email || "";


  $("supplierAddress").value =
    supplier?.address || "";


  $("supplierCity").value =
    supplier?.city || "";


  $("supplierDistrict").value =
    supplier?.district || "";


  $("supplierOpeningBalance").value =
    Number(
      supplier?.opening_balance || 0
    );


  $("supplierStatus").value =
    supplier?.status || "active";


  $("supplierNote").value =
    supplier?.note || "";


  modal.hidden = false;


  document.body.classList.add(
    "modal-open"
  );


  setTimeout(
    () =>
      $("supplierName")?.focus(),
    50
  );

}



/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeSupplierModal() {

  const modal =
    $("supplierModal");


  if (!modal) {
    return;
  }


  modal.hidden = true;

  editingSupplierId = null;

}



/* =========================================================
   SAVE SUPPLIER
   ========================================================= */

async function saveSupplier(event) {

  event.preventDefault();


  const client =
    supplierClient();


  if (!client) {

    showToast(
      "Supabase connection is not available.",
      "error"
    );

    return;

  }


  const name =
    $("supplierName")
      .value
      .trim();


  if (!name) {

    showToast(
      "Supplier name is required.",
      "error"
    );

    $("supplierName").focus();

    return;

  }


  const openingBalance =
    Number(
      $("supplierOpeningBalance").value || 0
    );


  if (
    Number.isNaN(openingBalance) ||
    openingBalance < 0
  ) {

    showToast(
      "Please enter a valid opening balance.",
      "error"
    );

    return;

  }


  const payload = {

    name,

    company_name:
      cleanValue(
        $("supplierCompany").value
      ),

    phone:
      cleanValue(
        $("supplierPhone").value
      ),

    email:
      cleanValue(
        $("supplierEmail").value
      ),

    address:
      cleanValue(
        $("supplierAddress").value
      ),

    city:
      cleanValue(
        $("supplierCity").value
      ),

    district:
      cleanValue(
        $("supplierDistrict").value
      ),

    opening_balance:
      openingBalance,

    status:
      $("supplierStatus").value ||
      "active",

    note:
      cleanValue(
        $("supplierNote").value
      ),

    updated_at:
      new Date().toISOString()

  };


  const saveButton =
    $("saveSupplierBtn");


  const originalText =
    saveButton.innerHTML;


  saveButton.disabled = true;


  saveButton.innerHTML = `

    <i class="bi bi-arrow-repeat"></i>

    Saving...

  `;


  try {


    if (editingSupplierId) {


      const {
        data,
        error
      } = await client

        .from("suppliers")

        .update(payload)

        .eq(
          "id",
          editingSupplierId
        )

        .select()
        .single();


      if (error) {
        throw error;
      }


      replaceSupplier(
        data
      );


      showToast(
        "Supplier updated successfully.",
        "success"
      );


    } else {


      payload.supplier_code =
        await generateSupplierCode(
          client
        );


      payload.created_at =
        new Date().toISOString();


      const {
        data,
        error
      } = await client

        .from("suppliers")

        .insert(
          payload
        )

        .select()
        .single();


      if (error) {
        throw error;
      }


      allSuppliers.push(
        data
      );


      showToast(
        "Supplier added successfully.",
        "success"
      );

    }


    allSuppliers.sort(
      (a, b) =>
        String(
          a.name || ""
        ).localeCompare(
          String(
            b.name || ""
          )
        )
    );


    applyFilters();

    updateStats();

    closeSupplierModal();


  } catch (error) {

    console.error(
      "Save supplier error:",
      error
    );


    showToast(
      error?.message ||
      "Failed to save supplier.",
      "error"
    );


  } finally {

    saveButton.disabled = false;

    saveButton.innerHTML =
      originalText;

  }

}



/* =========================================================
   GENERATE SUPPLIER CODE
   ========================================================= */

async function generateSupplierCode(
  client
) {

  try {

    const {
      data,
      error
    } = await client

      .from("suppliers")

      .select("supplier_code")

      .not(
        "supplier_code",
        "is",
        null
      )

      .order(
        "supplier_code",
        {
          ascending: false
        }
      )

      .limit(1);


    if (
      !error &&
      data &&
      data.length
    ) {

      const latest =
        String(
          data[0].supplier_code || ""
        );


      const match =
        latest.match(
          /(\d+)$/
        );


      if (match) {

        const number =
          Number(
            match[1]
          ) + 1;


        return (
          "SUP-" +
          String(
            number
          ).padStart(
            6,
            "0"
          )
        );

      }

    }

  } catch (error) {

    console.warn(
      "Supplier code generation fallback:",
      error
    );

  }


  return (
    "SUP-" +
    String(
      Date.now()
    ).slice(-6)
  );

}



/* =========================================================
   VIEW SUPPLIER
   ========================================================= */

window.viewSupplier =
  function viewSupplier(id) {

    const supplier =
      findSupplier(id);


    if (!supplier) {
      return;
    }


    viewingSupplierId =
      supplier.id;


    setText(
      "viewSupplierName",
      supplier.name ||
      "-"
    );


    setText(
      "viewSupplierCompany",
      supplier.company_name ||
      "No company name"
    );


    setText(
      "viewSupplierCode",
      supplier.supplier_code ||
      "-"
    );


    const status =
      String(
        supplier.status || "active"
      ).toLowerCase();


    setText(
      "viewSupplierStatus",
      status === "active"
        ? "Active"
        : "Inactive"
    );


    setText(
      "viewSupplierPhone",
      supplier.phone ||
      "-"
    );


    setText(
      "viewSupplierEmail",
      supplier.email ||
      "-"
    );


    setText(
      "viewSupplierCity",
      supplier.city ||
      "-"
    );


    setText(
      "viewSupplierDistrict",
      supplier.district ||
      "-"
    );


    setText(
      "viewSupplierBalance",
      formatMoney(
        supplier.opening_balance
      )
    );


    setText(
      "viewSupplierAddress",
      supplier.address ||
      "-"
    );


    setText(
      "viewSupplierNote",
      supplier.note ||
      "-"
    );


    $("viewSupplierModal").hidden =
      false;

  };



/* =========================================================
   EDIT SUPPLIER
   ========================================================= */

window.editSupplier =
  function editSupplier(id) {

    const supplier =
      findSupplier(id);


    if (!supplier) {
      return;
    }


    openSupplierModal(
      supplier
    );

  };



/* =========================================================
   EDIT VIEWED SUPPLIER
   ========================================================= */

function editViewedSupplier() {

  if (!viewingSupplierId) {
    return;
  }


  const supplier =
    findSupplier(
      viewingSupplierId
    );


  closeViewSupplierModal();


  if (supplier) {

    openSupplierModal(
      supplier
    );

  }

}



/* =========================================================
   DELETE SUPPLIER
   ========================================================= */

window.deleteSupplier =
  function deleteSupplier(id) {

    const supplier =
      findSupplier(id);


    if (!supplier) {
      return;
    }


    deletingSupplierId =
      supplier.id;


    setText(
      "deleteSupplierName",
      supplier.name ||
      "this supplier"
    );


    $("deleteSupplierModal").hidden =
      false;

  };



/* =========================================================
   CONFIRM DELETE
   ========================================================= */

async function confirmDeleteSupplier() {

  if (!deletingSupplierId) {
    return;
  }


  const client =
    supplierClient();


  if (!client) {

    showToast(
      "Supabase connection is not available.",
      "error"
    );

    return;

  }


  const button =
    $("confirmDeleteSupplier");


  const originalText =
    button.innerHTML;


  button.disabled = true;


  button.innerHTML = `

    <i class="bi bi-arrow-repeat"></i>

    Deleting...

  `;


  try {


    const {
      error
    } = await client

      .from("suppliers")

      .delete()

      .eq(
        "id",
        deletingSupplierId
      );


    if (error) {
      throw error;
    }


    allSuppliers =
      allSuppliers.filter(
        supplier =>
          String(
            supplier.id
          ) !==
          String(
            deletingSupplierId
          )
      );


    filteredSuppliers =
      [...allSuppliers];


    updateStats();

    applyFilters();


    showToast(
      "Supplier deleted successfully.",
      "success"
    );


    closeDeleteModal();


  } catch (error) {

    console.error(
      "Delete supplier error:",
      error
    );


    let message =
      error?.message ||
      "Failed to delete supplier.";


    if (
      message.toLowerCase().includes(
        "foreign key"
      )
    ) {

      message =
        "This supplier is already used in purchases and cannot be deleted.";

    }


    showToast(
      message,
      "error"
    );


  } finally {

    button.disabled = false;

    button.innerHTML =
      originalText;

  }

}



/* =========================================================
   CLOSE VIEW MODAL
   ========================================================= */

function closeViewSupplierModal() {

  const modal =
    $("viewSupplierModal");


  if (modal) {

    modal.hidden = true;

  }


  viewingSupplierId = null;

}



/* =========================================================
   CLOSE DELETE MODAL
   ========================================================= */

function closeDeleteModal() {

  const modal =
    $("deleteSupplierModal");


  if (modal) {

    modal.hidden = true;

  }


  deletingSupplierId = null;

}



/* =========================================================
   FIND SUPPLIER
   ========================================================= */

function findSupplier(id) {

  return allSuppliers.find(
    supplier =>
      String(
        supplier.id
      ) ===
      String(id)
  );

}



/* =========================================================
   REPLACE SUPPLIER
   ========================================================= */

function replaceSupplier(
  supplier
) {

  const index =
    allSuppliers.findIndex(
      item =>
        String(
          item.id
        ) ===
        String(
          supplier.id
        )
    );


  if (index >= 0) {

    allSuppliers[index] =
      supplier;

  }

}



/* =========================================================
   TABLE MESSAGE
   ========================================================= */

function showTableMessage(
  message,
  icon = "bi-info-circle"
) {

  const tbody =
    $("suppliersTableBody");


  if (!tbody) {
    return;
  }


  tbody.innerHTML = `

    <tr>

      <td colspan="7">

        <div class="supplier-empty">

          <i class="bi ${icon}"></i>

          <strong>
            ${escapeHtml(message)}
          </strong>

        </div>

      </td>

    </tr>

  `;

}



/* =========================================================
   TOAST
   ========================================================= */

function showToast(
  message,
  type = "success"
) {

  const toast =
    $("supplierToast");


  const text =
    $("supplierToastMessage");


  if (!toast || !text) {
    return;
  }


  text.textContent =
    message;


  toast.classList.remove(
    "success",
    "error",
    "show"
  );


  toast.classList.add(
    type
  );


  requestAnimationFrame(
    () =>
      toast.classList.add(
        "show"
      )
  );


  clearTimeout(
    showToast.timer
  );


  showToast.timer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      3000
    );

}



/* =========================================================
   FORMAT MONEY
   ========================================================= */

function formatMoney(
  value
) {

  const amount =
    Number(
      value || 0
    );


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



/* =========================================================
   INITIALS
   ========================================================= */

function getInitials(
  name
) {

  const words =
    String(
      name || "Supplier"
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean);


  if (!words.length) {
    return "S";
  }


  if (words.length === 1) {

    return words[0]
      .substring(0, 2)
      .toUpperCase();

  }


  return (
    words[0][0] +
    words[1][0]
  ).toUpperCase();

}



/* =========================================================
   CLEAN VALUE
   ========================================================= */

function cleanValue(
  value
) {

  const result =
    String(
      value || ""
    ).trim();


  return result
    ? result
    : null;

}



/* =========================================================
   SET TEXT
   ========================================================= */

function setText(
  id,
  value
) {

  const element =
    $(id);


  if (element) {

    element.textContent =
      value ?? "";

  }

}



/* =========================================================
   ESCAPE HTML
   ========================================================= */

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



/* =========================================================
   GLOBAL API
   ========================================================= */

window.MIXNBUY_SUPPLIERS = {

  load: loadSuppliers,

  refresh: loadSuppliers,

  getAll: () =>
    [...allSuppliers],

  getFiltered: () =>
    [...filteredSuppliers]

};