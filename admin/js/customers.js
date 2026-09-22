/* =========================================================
   MIXNBUY.BD
   CUSTOMERS MODULE
========================================================= */

"use strict";


/* =========================================================
   STATE
========================================================= */

let allCustomers = [];
let filteredCustomers = [];

let currentCustomer = null;


/* =========================================================
   INIT
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    initCustomers();
});


async function initCustomers() {

    bindCustomerEvents();

    await loadCustomers();

}


/* =========================================================
   SUPABASE CLIENT
========================================================= */

function getCustomersClient() {

    if (typeof window.getClient === "function") {
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


/* =========================================================
   EVENTS
========================================================= */

function bindCustomerEvents() {

    const searchInput =
        document.getElementById("customerSearch");

    const statusFilter =
        document.getElementById("statusFilter");

    const refreshBtn =
        document.getElementById("refreshCustomersBtn");

    const customerForm =
        document.getElementById("customerForm");

    const closeViewModal =
        document.getElementById("closeCustomerViewModal");

    const closeViewBtn =
        document.getElementById("closeCustomerViewBtn");

    const closeEditModal =
        document.getElementById("closeCustomerEditModal");

    const cancelCustomerBtn =
        document.getElementById("cancelCustomerBtn");


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            applyCustomerFilters
        );

    }


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            applyCustomerFilters
        );

    }


    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            loadCustomers
        );

    }


    if (customerForm) {

        customerForm.addEventListener(
            "submit",
            saveCustomer
        );

    }


    if (closeViewModal) {

        closeViewModal.addEventListener(
            "click",
            closeCustomerView
        );

    }


    if (closeViewBtn) {

        closeViewBtn.addEventListener(
            "click",
            closeCustomerView
        );

    }


    if (closeEditModal) {

        closeEditModal.addEventListener(
            "click",
            closeCustomerEdit
        );

    }


    if (cancelCustomerBtn) {

        cancelCustomerBtn.addEventListener(
            "click",
            closeCustomerEdit
        );

    }


    document.addEventListener(
        "keydown",
        handleCustomerKeyboard
    );

}


/* =========================================================
   LOAD CUSTOMERS
========================================================= */

async function loadCustomers() {

    const client = getCustomersClient();

    const tbody =
        document.getElementById("customersTableBody");


    if (!client) {

        showCustomerTableMessage(
            "Supabase connection is not available.",
            "error"
        );

        return;
    }


    showCustomerTableMessage(
        "Loading customers...",
        "loading"
    );


    try {

        /*
         * Use select("*") because the current
         * database structure may contain optional
         * customer fields.
         */

        const {
            data,
            error
        } = await client
            .from("customers")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(1000);


        if (error) {
            throw error;
        }


        allCustomers =
            Array.isArray(data)
                ? data
                : [];


        normalizeCustomers();


        filteredCustomers =
            [...allCustomers];


        updateCustomerStats();

        renderCustomers();


    } catch (error) {

        console.error(
            "Customer load error:",
            error
        );


        allCustomers = [];

        filteredCustomers = [];


        updateCustomerStats();


        showCustomerTableMessage(
            error?.message ||
            "Failed to load customers.",
            "error"
        );

    }

}


/* =========================================================
   NORMALIZE
========================================================= */

function normalizeCustomers() {

    allCustomers.forEach(customer => {

        customer.name =
            String(
                customer.name || ""
            ).trim();


        customer.mobile =
            String(
                customer.mobile || ""
            ).trim();


        customer.email =
            String(
                customer.email || ""
            ).trim();


        customer.address =
            String(
                customer.address || ""
            ).trim();


        customer.city =
            String(
                customer.city || ""
            ).trim();


        customer.district =
            String(
                customer.district || ""
            ).trim();


        customer.total_orders =
            Number(
                customer.total_orders || 0
            );


        customer.total_amount =
            Number(
                customer.total_amount || 0
            );


        customer.status =
            String(
                customer.status || "active"
            ).toLowerCase();


        if (
            customer.status !== "active" &&
            customer.status !== "inactive"
        ) {

            customer.status = "active";

        }

    });

}


/* =========================================================
   FILTER
========================================================= */

function applyCustomerFilters() {

    const searchInput =
        document.getElementById("customerSearch");

    const statusFilter =
        document.getElementById("statusFilter");


    const search =
        String(
            searchInput?.value || ""
        )
        .trim()
        .toLowerCase();


    const status =
        String(
            statusFilter?.value || ""
        )
        .trim()
        .toLowerCase();


    filteredCustomers =
        allCustomers.filter(customer => {

            const searchableText = [

                customer.name,

                customer.mobile,

                customer.email,

                customer.address,

                customer.city,

                customer.district

            ]
                .join(" ")
                .toLowerCase();


            const matchesSearch =
                !search ||
                searchableText.includes(search);


            const matchesStatus =
                !status ||
                customer.status === status;


            return (
                matchesSearch &&
                matchesStatus
            );

        });


    renderCustomers();

}


/* =========================================================
   STATS
========================================================= */

function updateCustomerStats() {

    const total =
        allCustomers.length;


    const active =
        allCustomers.filter(
            customer =>
                customer.status === "active"
        ).length;


    const totalOrders =
        allCustomers.reduce(
            (sum, customer) =>
                sum +
                Number(
                    customer.total_orders || 0
                ),
            0
        );


    const totalValue =
        allCustomers.reduce(
            (sum, customer) =>
                sum +
                Number(
                    customer.total_amount || 0
                ),
            0
        );


    setText(
        "totalCustomers",
        formatNumber(total)
    );


    setText(
        "activeCustomers",
        formatNumber(active)
    );


    setText(
        "totalCustomerOrders",
        formatNumber(totalOrders)
    );


    setText(
        "totalCustomerValue",
        formatMoney(totalValue)
    );

}


/* =========================================================
   RENDER
========================================================= */

function renderCustomers() {

    const tbody =
        document.getElementById(
            "customersTableBody"
        );


    const countText =
        document.getElementById(
            "customerCountText"
        );


    if (!tbody) {
        return;
    }


    if (!filteredCustomers.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="table-empty"
                >

                    <i class="bi bi-people"></i>

                    <div>
                        No customers found.
                    </div>

                </td>

            </tr>

        `;


        if (countText) {

            countText.textContent =
                "0 customers";

        }


        return;

    }


    tbody.innerHTML =
        filteredCustomers
            .map(renderCustomerRow)
            .join("");


    if (countText) {

        countText.textContent =
            `${filteredCustomers.length} customer${
                filteredCustomers.length === 1
                    ? ""
                    : "s"
            }`;

    }

}


/* =========================================================
   CUSTOMER ROW
========================================================= */

function renderCustomerRow(customer) {

    const name =
        escapeHtml(
            customer.name ||
            "Unknown Customer"
        );


    const mobile =
        escapeHtml(
            customer.mobile ||
            "—"
        );


    const email =
        escapeHtml(
            customer.email ||
            ""
        );


    const address =
        escapeHtml(
            buildAddress(customer)
        );


    const initials =
        getInitials(
            customer.name
        );


    const status =
        customer.status === "inactive"
            ? "inactive"
            : "active";


    const statusText =
        status === "active"
            ? "Active"
            : "Inactive";


    const orders =
        Number(
            customer.total_orders || 0
        );


    const amount =
        Number(
            customer.total_amount || 0
        );


    const lastOrder =
        formatDate(
            customer.last_order_date
        );


    return `

        <tr>

            <td>

                <div class="customer-name-cell">

                    <div class="customer-avatar">
                        ${initials}
                    </div>

                    <div>

                        <div class="customer-name">
                            ${name}
                        </div>

                        ${
                            email
                                ? `
                                    <div class="customer-email">
                                        ${email}
                                    </div>
                                  `
                                : ""
                        }

                    </div>

                </div>

            </td>


            <td>
                ${mobile}
            </td>


            <td>

                <div
                    class="customer-address"
                    title="${address}"
                >
                    ${address || "—"}
                </div>

            </td>


            <td>

                <span class="customer-orders-count">
                    ${formatNumber(orders)}
                </span>

            </td>


            <td>

                <span class="customer-amount">
                    ${formatMoney(amount)}
                </span>

            </td>


            <td>

                <span class="customer-last-order">
                    ${lastOrder}
                </span>

            </td>


            <td>

                <span
                    class="customer-status ${status}"
                >

                    <span class="customer-status-dot"></span>

                    ${statusText}

                </span>

            </td>


            <td>

                <div class="customer-actions">


                    <button
                        type="button"
                        class="customer-action-btn"
                        title="View Customer"
                        onclick="viewCustomer('${customer.id}')"
                    >
                        <i class="bi bi-eye"></i>
                    </button>


                    <button
                        type="button"
                        class="customer-action-btn"
                        title="Edit Customer"
                        onclick="editCustomer('${customer.id}')"
                    >
                        <i class="bi bi-pencil"></i>
                    </button>


                    <button
                        type="button"
                        class="customer-action-btn delete"
                        title="Delete Customer"
                        onclick="deleteCustomer('${customer.id}')"
                    >
                        <i class="bi bi-trash3"></i>
                    </button>

                </div>

            </td>

        </tr>

    `;

}


/* =========================================================
   VIEW CUSTOMER
========================================================= */

async function viewCustomer(customerId) {

    const customer =
        allCustomers.find(
            item =>
                String(item.id) ===
                String(customerId)
        );


    if (!customer) {

        alert(
            "Customer not found."
        );

        return;

    }


    currentCustomer =
        customer;


    const content =
        document.getElementById(
            "customerDetailsContent"
        );


    if (!content) {
        return;
    }


    content.innerHTML = `

        <div class="customer-details-header">

            <div class="customer-details-avatar">
                ${getInitials(customer.name)}
            </div>

            <div>

                <div class="customer-details-name">
                    ${escapeHtml(
                        customer.name ||
                        "Unknown Customer"
                    )}
                </div>

                <div class="customer-details-mobile">
                    ${escapeHtml(
                        customer.mobile ||
                        "No mobile number"
                    )}
                </div>

            </div>

        </div>


        <div class="customer-detail-grid">

            <div class="customer-detail-box">

                <span>
                    Total Orders
                </span>

                <strong>
                    ${formatNumber(
                        customer.total_orders
                    )}
                </strong>

            </div>


            <div class="customer-detail-box">

                <span>
                    Total Amount
                </span>

                <strong>
                    ${formatMoney(
                        customer.total_amount
                    )}
                </strong>

            </div>


            <div class="customer-detail-box">

                <span>
                    Status
                </span>

                <strong>
                    ${capitalize(
                        customer.status
                    )}
                </strong>

            </div>

        </div>


        <div class="customer-info-list">

            <div class="customer-info-row">

                <span class="customer-info-label">
                    Email
                </span>

                <span class="customer-info-value">
                    ${escapeHtml(
                        customer.email ||
                        "Not provided"
                    )}
                </span>

            </div>


            <div class="customer-info-row">

                <span class="customer-info-label">
                    Address
                </span>

                <span class="customer-info-value">
                    ${escapeHtml(
                        buildAddress(customer) ||
                        "Not provided"
                    )}
                </span>

            </div>


            <div class="customer-info-row">

                <span class="customer-info-label">
                    Last Order
                </span>

                <span class="customer-info-value">
                    ${formatDate(
                        customer.last_order_date
                    )}
                </span>

            </div>


            <div class="customer-info-row">

                <span class="customer-info-label">
                    Created
                </span>

                <span class="customer-info-value">
                    ${formatDate(
                        customer.created_at
                    )}
                </span>

            </div>

        </div>


        <div class="customer-history">

            <div class="customer-history-title">
                Order History
            </div>

            <div id="customerOrderHistory">
                Loading order history...
            </div>

        </div>

    `;


    openModal(
        "customerViewModal"
    );


    await loadCustomerOrders(
        customer.id
    );

}


/* =========================================================
   LOAD CUSTOMER ORDERS
========================================================= */

async function loadCustomerOrders(customerId) {

    const client =
        getCustomersClient();


    const container =
        document.getElementById(
            "customerOrderHistory"
        );


    if (!container) {
        return;
    }


    if (!client) {

        container.innerHTML =
            "<p>Supabase connection unavailable.</p>";

        return;

    }


    try {

        const {
            data,
            error
        } = await client
            .from("orders")
            .select(`
                id,
                order_no,
                order_date,
                total_amount,
                status,
                payment_status
            `)
            .eq(
                "customer_id",
                customerId
            )
            .order(
                "order_date",
                {
                    ascending: false
                }
            )
            .limit(100);


        if (error) {
            throw error;
        }


        if (!data || !data.length) {

            container.innerHTML = `

                <div class="table-empty">
                    No order history found.
                </div>

            `;

            return;

        }


        container.innerHTML = `

            <div style="overflow-x:auto;">

                <table
                    class="customer-history-table"
                >

                    <thead>

                        <tr>

                            <th>
                                Order
                            </th>

                            <th>
                                Date
                            </th>

                            <th>
                                Amount
                            </th>

                            <th>
                                Payment
                            </th>

                            <th>
                                Status
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        ${data
                            .map(renderCustomerOrder)
                            .join("")}

                    </tbody>

                </table>

            </div>

        `;


    } catch (error) {

        console.error(
            "Customer order history error:",
            error
        );


        container.innerHTML = `

            <div class="table-error">
                ${
                    escapeHtml(
                        error?.message ||
                        "Failed to load order history."
                    )
                }
            </div>

        `;

    }

}


/* =========================================================
   ORDER ROW
========================================================= */

function renderCustomerOrder(order) {

    return `

        <tr>

            <td>
                ${escapeHtml(
                    order.order_no ||
                    order.id ||
                    "—"
                )}
            </td>

            <td>
                ${formatDate(
                    order.order_date
                )}
            </td>

            <td>
                ${formatMoney(
                    order.total_amount
                )}
            </td>

            <td>
                ${escapeHtml(
                    capitalize(
                        order.payment_status ||
                        "—"
                    )
                )}
            </td>

            <td>

                <span class="history-status">
                    ${escapeHtml(
                        capitalize(
                            order.status ||
                            "—"
                        )
                    )}
                </span>

            </td>

        </tr>

    `;

}


/* =========================================================
   EDIT CUSTOMER
========================================================= */

function editCustomer(customerId) {

    const customer =
        allCustomers.find(
            item =>
                String(item.id) ===
                String(customerId)
        );


    if (!customer) {

        alert(
            "Customer not found."
        );

        return;

    }


    currentCustomer =
        customer;


    setValue(
        "customerId",
        customer.id
    );


    setValue(
        "customerName",
        customer.name
    );


    setValue(
        "customerMobile",
        customer.mobile
    );


    setValue(
        "customerEmail",
        customer.email
    );


    setValue(
        "customerAddress",
        customer.address
    );


    setValue(
        "customerCity",
        customer.city
    );


    setValue(
        "customerDistrict",
        customer.district
    );


    setValue(
        "customerStatus",
        customer.status
    );


    openModal(
        "customerEditModal"
    );

}


/* =========================================================
   SAVE CUSTOMER
========================================================= */

async function saveCustomer(event) {

    event.preventDefault();


    const client =
        getCustomersClient();


    if (!client) {

        alert(
            "Supabase connection is not available."
        );

        return;

    }


    const customerId =
        getValue("customerId");


    if (!customerId) {

        alert(
            "Customer ID is missing."
        );

        return;

    }


    const saveBtn =
        document.getElementById(
            "saveCustomerBtn"
        );


    const payload = {

        name:
            getValue("customerName").trim(),

        mobile:
            getValue("customerMobile").trim(),

        email:
            getValue("customerEmail").trim() ||
            null,

        address:
            getValue("customerAddress").trim() ||
            null,

        city:
            getValue("customerCity").trim() ||
            null,

        district:
            getValue("customerDistrict").trim() ||
            null,

        status:
            getValue("customerStatus") ||
            "active"

    };


    if (!payload.name) {

        alert(
            "Customer name is required."
        );

        return;

    }


    if (!payload.mobile) {

        alert(
            "Mobile number is required."
        );

        return;

    }


    try {

        if (saveBtn) {

            saveBtn.disabled = true;

            saveBtn.innerHTML = `
                <i class="bi bi-arrow-repeat"></i>
                Saving...
            `;

        }


        const {
            data,
            error
        } = await client
            .from("customers")
            .update(payload)
            .eq(
                "id",
                customerId
            )
            .select("*")
            .single();


        if (error) {
            throw error;
        }


        const index =
            allCustomers.findIndex(
                item =>
                    String(item.id) ===
                    String(customerId)
            );


        if (index !== -1) {

            allCustomers[index] =
                data;

        }


        normalizeCustomers();

        applyCustomerFilters();

        updateCustomerStats();

        closeCustomerEdit();


        alert(
            "Customer updated successfully."
        );


    } catch (error) {

        console.error(
            "Customer save error:",
            error
        );


        alert(
            error?.message ||
            "Failed to update customer."
        );


    } finally {

        if (saveBtn) {

            saveBtn.disabled = false;

            saveBtn.innerHTML = `
                <i class="bi bi-check-lg"></i>
                Save Changes
            `;

        }

    }

}


/* =========================================================
   DELETE CUSTOMER
========================================================= */

async function deleteCustomer(customerId) {

    const customer =
        allCustomers.find(
            item =>
                String(item.id) ===
                String(customerId)
        );


    if (!customer) {

        alert(
            "Customer not found."
        );

        return;

    }


    const customerName =
        customer.name ||
        "this customer";


    const confirmed =
        window.confirm(
            `Are you sure you want to delete ${customerName}?`
        );


    if (!confirmed) {
        return;
    }


    const client =
        getCustomersClient();


    if (!client) {

        alert(
            "Supabase connection is not available."
        );

        return;

    }


    try {

        const {
            error
        } = await client
            .from("customers")
            .delete()
            .eq(
                "id",
                customerId
            );


        if (error) {
            throw error;
        }


        allCustomers =
            allCustomers.filter(
                item =>
                    String(item.id) !==
                    String(customerId)
            );


        applyCustomerFilters();

        updateCustomerStats();


        alert(
            "Customer deleted successfully."
        );


    } catch (error) {

        console.error(
            "Customer delete error:",
            error
        );


        alert(
            error?.message ||
            "Failed to delete customer."
        );

    }

}


/* =========================================================
   MODAL
========================================================= */

function openModal(modalId) {

    const modal =
        document.getElementById(
            modalId
        );


    if (!modal) {
        return;
    }


    modal.classList.add(
        "show"
    );


    document.body.style.overflow =
        "hidden";

}


function closeCustomerView() {

    const modal =
        document.getElementById(
            "customerViewModal"
        );


    if (modal) {

        modal.classList.remove(
            "show"
        );

    }


    document.body.style.overflow =
        "";

}


function closeCustomerEdit() {

    const modal =
        document.getElementById(
            "customerEditModal"
        );


    if (modal) {

        modal.classList.remove(
            "show"
        );

    }


    document.body.style.overflow =
        "";

}


/* =========================================================
   KEYBOARD
========================================================= */

function handleCustomerKeyboard(event) {

    if (event.key !== "Escape") {
        return;
    }


    closeCustomerView();

    closeCustomerEdit();

}


/* =========================================================
   TABLE MESSAGE
========================================================= */

function showCustomerTableMessage(
    message,
    type = "loading"
) {

    const tbody =
        document.getElementById(
            "customersTableBody"
        );


    if (!tbody) {
        return;
    }


    let icon =
        "bi-arrow-repeat";


    if (type === "error") {

        icon =
            "bi-exclamation-triangle";

    }


    tbody.innerHTML = `

        <tr>

            <td
                colspan="8"
                class="table-${type}"
            >

                <i class="bi ${icon}"></i>

                ${escapeHtml(message)}

            </td>

        </tr>

    `;

}


/* =========================================================
   HELPERS
========================================================= */

function buildAddress(customer) {

    return [

        customer.address,

        customer.city,

        customer.district

    ]
        .filter(Boolean)
        .join(", ");

}


function getInitials(name) {

    const value =
        String(
            name || "Customer"
        )
        .trim();


    if (!value) {
        return "C";
    }


    const parts =
        value
            .split(/\s+/)
            .filter(Boolean);


    if (parts.length === 1) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();

    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();

}


function formatMoney(value) {

    const amount =
        Number(value || 0);


    return (
        "৳" +
        amount.toLocaleString(
            "en-BD",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        )
    );

}


function formatNumber(value) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-BD"
    );

}


function formatDate(value) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (Number.isNaN(
        date.getTime()
    )) {

        return "—";

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


function capitalize(value) {

    const text =
        String(
            value || ""
        );


    if (!text) {
        return "—";
    }


    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );

}


function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

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


function getValue(id) {

    const element =
        document.getElementById(id);


    return element
        ? element.value
        : "";

}


function escapeHtml(value) {

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

window.MIXNBUY_CUSTOMERS = {

    loadCustomers,

    viewCustomer,

    editCustomer,

    deleteCustomer,

    applyCustomerFilters

};