/* ============================================================
   MIXNBUY.BD
   Purchases - Supabase Production Integration
   ============================================================ */

(function () {
    "use strict";

    const sb = window.supabaseClient;
    const $ = id => document.getElementById(id);

    let purchases = [];
    let products = [];
    let suppliers = [];
    let editingId = null;
    let itemRows = [];

    /* =========================================================
       HELPERS
       ========================================================= */

    const money = value =>
        "৳" +
        Number(value || 0).toLocaleString("en-BD", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    const esc = value =>
        String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char]));

    const toast = (message, type = "info") => {
        if (typeof window.showToast === "function") {
            window.showToast(message, type);
        } else {
            alert(message);
        }
    };

    const adminId = () =>
        window.MXB_ADMIN?.user_id ||
        window.MXB_ADMIN?.id ||
        null;

    function badge(value) {
        const status =
            String(value || "draft").toLowerCase();

        return `
            <span class="badge badge-${esc(status)}">
                ${esc(
                    status.charAt(0).toUpperCase() +
                    status.slice(1)
                )}
            </span>
        `;
    }

    function localDateTime() {
        const d = new Date();

        const p = n =>
            String(n).padStart(2, "0");

        return (
            d.getFullYear() +
            "-" +
            p(d.getMonth() + 1) +
            "-" +
            p(d.getDate()) +
            "T" +
            p(d.getHours()) +
            ":" +
            p(d.getMinutes())
        );
    }


    /* =========================================================
       LOAD PRODUCTS
       ========================================================= */

    async function loadProducts() {

        const { data, error } =
            await sb
                .from("products")
                .select(`
                    id,
                    product_code,
                    sku,
                    name,
                    purchase_price,
                    is_active
                `)
                .eq("is_active", true)
                .order("name");

        if (error) {
            throw error;
        }

        products = data || [];
    }


    /* =========================================================
       LOAD SUPPLIERS
       ========================================================= */

    async function loadSuppliers() {

        const { data, error } =
            await sb
                .from("suppliers")
                .select(`
                    id,
                    supplier_code,
                    name,
                    company_name,
                    phone,
                    status
                `)
                .eq("status", "active")
                .order("name");

        if (error) {
            throw error;
        }

        suppliers = data || [];
    }


    /* =========================================================
       LOAD PURCHASES
       ========================================================= */

    async function loadPurchases() {

        const { data, error } =
            await sb
                .from("purchases")
                .select(`
                    id,
                    purchase_no,
                    supplier_id,
                    purchase_date,
                    subtotal,
                    discount,
                    other_cost,
                    total_amount,
                    paid_amount,
                    due_amount,
                    payment_status,
                    status,
                    note,
                    created_by,
                    created_at,
                    updated_at
                `)
                .order(
                    "purchase_date",
                    {
                        ascending: false
                    }
                );

        if (error) {
            throw error;
        }

        purchases = data || [];

        render();
    }


    /* =========================================================
       SUPPLIER
       ========================================================= */

    function supplierName(id) {

        const supplier =
            suppliers.find(
                item =>
                    String(item.id) ===
                    String(id)
            );

        if (!supplier) {
            return "—";
        }

        return (
            supplier.company_name ||
            supplier.name ||
            supplier.supplier_code ||
            "Supplier"
        );
    }


    function supplierOptions(selected = "") {

        $("supplierId").innerHTML =
            `
            <option value="">
                No supplier selected
            </option>
            ` +
            suppliers
                .map(supplier => {

                    const label =
                        supplier.company_name ||
                        supplier.name ||
                        supplier.supplier_code ||
                        `Supplier #${supplier.id}`;

                    return `
                        <option
                            value="${esc(supplier.id)}"
                            ${
                                String(supplier.id) ===
                                String(selected)
                                    ? "selected"
                                    : ""
                            }
                        >
                            ${esc(label)}
                            ${
                                supplier.phone
                                    ? " • " +
                                      esc(
                                          supplier.phone
                                      )
                                    : ""
                            }
                        </option>
                    `;
                })
                .join("");
    }


    /* =========================================================
       PRODUCT OPTIONS
       ========================================================= */

    function productOptions(selected = "") {

        return (
            `
            <option value="">
                Select product
            </option>
            ` +
            products
                .map(product => {

                    return `
                        <option
                            value="${esc(product.id)}"
                            ${
                                String(
                                    product.id
                                ) ===
                                String(selected)
                                    ? "selected"
                                    : ""
                            }
                        >
                            ${esc(product.name)}
                            ${
                                product.sku
                                    ? " • " +
                                      esc(product.sku)
                                    : ""
                            }
                        </option>
                    `;
                })
                .join("")
        );
    }


    /* =========================================================
       STATS
       ========================================================= */

    function renderStats() {

        $("statPurchases").textContent =
            purchases.length;

        $("statAmount").textContent =
            money(
                purchases.reduce(
                    (sum, purchase) =>
                        sum +
                        Number(
                            purchase.total_amount ||
                            0
                        ),
                    0
                )
            );

        $("statPaid").textContent =
            money(
                purchases.reduce(
                    (sum, purchase) =>
                        sum +
                        Number(
                            purchase.paid_amount ||
                            0
                        ),
                    0
                )
            );

        $("statDue").textContent =
            money(
                purchases.reduce(
                    (sum, purchase) =>
                        sum +
                        Number(
                            purchase.due_amount ||
                            0
                        ),
                    0
                )
            );
    }


    /* =========================================================
       RENDER PURCHASE LIST
       ========================================================= */

    function render() {

        renderStats();

        const search =
            $("searchPurchase")
                .value
                .trim()
                .toLowerCase();

        const status =
            $("statusFilter").value;

        const payment =
            $("paymentFilter").value;

        const rows =
            purchases.filter(purchase => {

                const matchesSearch =
                    !search ||
                    String(
                        purchase.purchase_no || ""
                    )
                        .toLowerCase()
                        .includes(search) ||
                    supplierName(
                        purchase.supplier_id
                    )
                        .toLowerCase()
                        .includes(search);

                const matchesStatus =
                    !status ||
                    purchase.status === status;

                const matchesPayment =
                    !payment ||
                    purchase.payment_status ===
                        payment;

                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesPayment
                );
            });


        $("purchaseEmpty").style.display =
            rows.length ? "none" : "block";


        $("purchaseTableBody").innerHTML =
            rows
                .map(purchase => {

                    const locked =
                        purchase.status ===
                        "completed" ||
                        purchase.status ===
                        "cancelled";

                    return `
                        <tr>

                            <td>
                                <strong>
                                    ${esc(
                                        purchase.purchase_no
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${
                                    purchase.purchase_date
                                        ? new Date(
                                              purchase.purchase_date
                                          ).toLocaleString(
                                              "en-BD"
                                          )
                                        : "—"
                                }
                            </td>

                            <td>
                                ${esc(
                                    supplierName(
                                        purchase.supplier_id
                                    )
                                )}
                            </td>

                            <td>
                                <strong>
                                    ${money(
                                        purchase.total_amount
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${money(
                                    purchase.paid_amount
                                )}
                            </td>

                            <td>
                                ${money(
                                    purchase.due_amount
                                )}
                            </td>

                            <td>
                                ${badge(
                                    purchase.payment_status
                                )}
                            </td>

                            <td>
                                ${badge(
                                    purchase.status
                                )}
                            </td>

                            <td>
                                <div class="row-actions">

                                    <button
                                        class="icon-btn"
                                        data-view="${esc(
                                            purchase.id
                                        )}"
                                        title="View"
                                    >
                                        <i class="bi bi-eye"></i>
                                    </button>

                                    ${
                                        !locked
                                            ? `
                                            <button
                                                class="icon-btn"
                                                data-edit="${esc(
                                                    purchase.id
                                                )}"
                                                title="Edit"
                                            >
                                                <i class="bi bi-pencil"></i>
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


        document
            .querySelectorAll("[data-view]")
            .forEach(button => {

                button.onclick = () =>
                    openPurchase(
                        button.dataset.view,
                        true
                    );
            });


        document
            .querySelectorAll("[data-edit]")
            .forEach(button => {

                button.onclick = () =>
                    openPurchase(
                        button.dataset.edit,
                        false
                    );
            });
    }


    /* =========================================================
       ITEMS
       ========================================================= */

    function addItem(item = {}) {

        itemRows.push({

            product_id:
                item.product_id || "",

            quantity:
                Number(
                    item.quantity || 1
                ),

            purchase_price:
                Number(
                    item.purchase_price ||
                    0
                ),

            discount:
                Number(
                    item.discount || 0
                )
        });

        renderItems();
    }


    function renderItems() {

        $("purchaseItemsBody").innerHTML =
            itemRows
                .map((item, index) => {

                    return `
                        <tr
                            data-row="${index}"
                        >

                            <td>
                                <select
                                    data-field="product_id"
                                >
                                    ${productOptions(
                                        item.product_id
                                    )}
                                </select>
                            </td>

                            <td>
                                <input
                                    data-field="quantity"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value="${esc(
                                        item.quantity
                                    )}"
                                >
                            </td>

                            <td>
                                <input
                                    data-field="purchase_price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value="${esc(
                                        item.purchase_price
                                    )}"
                                >
                            </td>

                            <td>
                                <input
                                    data-field="discount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value="${esc(
                                        item.discount
                                    )}"
                                >
                            </td>

                            <td class="item-total">
                                ${money(
                                    Math.max(
                                        0,
                                        item.quantity *
                                            item.purchase_price -
                                            item.discount
                                    )
                                )}
                            </td>

                            <td>
                                <button
                                    type="button"
                                    class="remove-item"
                                    data-remove="${index}"
                                    title="Remove"
                                >
                                    <i class="bi bi-trash3"></i>
                                </button>
                            </td>

                        </tr>
                    `;
                })
                .join("");


        $("purchaseItemsBody")
            .querySelectorAll(
                "select, input"
            )
            .forEach(element => {

                element.oninput =
                    updateItem;

                element.onchange =
                    updateItem;
            });


        $("purchaseItemsBody")
            .querySelectorAll(
                "[data-remove]"
            )
            .forEach(button => {

                button.onclick = () => {

                    itemRows.splice(
                        Number(
                            button.dataset.remove
                        ),
                        1
                    );

                    renderItems();
                };
            });


        calculate();
    }


    function updateItem(event) {

        const row =
            event.target.closest("tr");

        const index =
            Number(row.dataset.row);

        const field =
            event.target.dataset.field;


        if (field === "product_id") {

            itemRows[index][field] =
                event.target.value;

            const product =
                products.find(
                    item =>
                        String(item.id) ===
                        String(
                            event.target.value
                        )
                );

            if (product) {

                itemRows[index]
                    .purchase_price =
                    Number(
                        product.purchase_price ||
                        0
                    );
            }

        } else {

            itemRows[index][field] =
                Number(
                    event.target.value || 0
                );
        }


        renderItems();
    }


    /* =========================================================
       CALCULATE PREVIEW
       ========================================================= */

    function calculate() {

        const subtotal =
            itemRows.reduce(
                (sum, item) =>
                    sum +
                    item.quantity *
                        item.purchase_price,
                0
            );


        const discount =
            itemRows.reduce(
                (sum, item) =>
                    sum +
                    item.discount,
                0
            );


        const otherCost =
            Math.max(
                0,
                Number(
                    $("otherCost").value || 0
                )
            );


        const total =
            Math.max(
                0,
                subtotal -
                    discount +
                    otherCost
            );


        const paid =
            Math.max(
                0,
                Math.min(
                    total,
                    Number(
                        $("paidAmount")
                            .value || 0
                    )
                )
            );


        $("formSubtotal")
            .textContent =
            money(subtotal);

        $("formDiscount")
            .textContent =
            money(discount);

        $("formOtherCost")
            .textContent =
            money(otherCost);

        $("formTotal")
            .textContent =
            money(total);

        $("formDue")
            .textContent =
            money(
                total - paid
            );
    }


    /* =========================================================
       LOAD PURCHASE ITEMS
       ========================================================= */

    async function getItems(purchaseId) {

        const {
            data,
            error
        } =
            await sb
                .from("purchase_items")
                .select(`
                    id,
                    product_id,
                    quantity,
                    purchase_price,
                    discount,
                    total_amount
                `)
                .eq(
                    "purchase_id",
                    purchaseId
                )
                .order("created_at");


        if (error) {
            throw error;
        }

        return data || [];
    }


    /* =========================================================
       RESET
       ========================================================= */

    function resetForm() {

        editingId = null;

        $("modalTitle").textContent =
            "New Purchase";

        $("purchaseDate").value =
            localDateTime();

        $("purchaseStatus").value =
            "draft";

        $("otherCost").value =
            "0";

        $("paidAmount").value =
            "0";

        $("purchaseNote").value =
            "";

        itemRows = [];

        addItem();
    }


    /* =========================================================
       OPEN PURCHASE
       ========================================================= */

    async function openPurchase(
        id,
        viewOnly
    ) {

        try {

            const purchase =
                purchases.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

            if (!purchase) {
                return;
            }


            editingId =
                purchase.id;


            $("modalTitle").textContent =
                viewOnly
                    ? `Purchase ${purchase.purchase_no}`
                    : `Edit ${purchase.purchase_no}`;


            supplierOptions(
                purchase.supplier_id
            );


            $("purchaseDate").value =
                purchase.purchase_date
                    ? new Date(
                          purchase.purchase_date
                      )
                          .toISOString()
                          .slice(0, 16)
                    : localDateTime();


            $("purchaseStatus").value =
                purchase.status ||
                "draft";


            $("otherCost").value =
                Number(
                    purchase.other_cost ||
                    0
                );


            $("paidAmount").value =
                Number(
                    purchase.paid_amount ||
                    0
                );


            $("purchaseNote").value =
                purchase.note ||
                "";


            const items =
                await getItems(
                    purchase.id
                );


            itemRows =
                items.map(item => ({

                    product_id:
                        item.product_id,

                    quantity:
                        Number(
                            item.quantity ||
                            0
                        ),

                    purchase_price:
                        Number(
                            item.purchase_price ||
                            0
                        ),

                    discount:
                        Number(
                            item.discount ||
                            0
                        )
                }));


            if (!itemRows.length) {
                addItem();
            } else {
                renderItems();
            }


            const locked =
                viewOnly ||
                purchase.status ===
                    "completed" ||
                purchase.status ===
                    "cancelled";


            [
                "supplierId",
                "purchaseDate",
                "purchaseStatus",
                "otherCost",
                "paidAmount",
                "purchaseNote"
            ].forEach(id => {

                $(id).disabled =
                    locked;
            });


            $("addPurchaseItem")
                .style.display =
                locked
                    ? "none"
                    : "";


            $("savePurchase")
                .style.display =
                viewOnly
                    ? "none"
                    : "";


            $("purchaseModal")
                .classList
                .add("show");

        } catch (error) {

            console.error(
                "Open Purchase Error:",
                error
            );

            toast(
                error.message ||
                "Unable to open purchase",
                "error"
            );
        }
    }


    /* =========================================================
       CLOSE
       ========================================================= */

    function closeModal() {

        $("purchaseModal")
            .classList
            .remove("show");
    }


    /* =========================================================
       VALIDATE
       ========================================================= */

    function validate() {

        if (
            !$("purchaseDate").value
        ) {
            return "Select a purchase date.";
        }


        if (
            !$("purchaseStatus").value
        ) {
            return "Select purchase status.";
        }


        if (
            !itemRows.length
        ) {
            return "Add at least one product.";
        }


        for (
            const item of itemRows
        ) {

            if (!item.product_id) {
                return "Select a product for every item.";
            }


            if (
                !(item.quantity > 0)
            ) {
                return "Quantity must be greater than zero.";
            }


            if (
                item.purchase_price < 0
            ) {
                return "Purchase price cannot be negative.";
            }


            if (
                item.discount < 0
            ) {
                return "Discount cannot be negative.";
            }


            const itemAmount =
                item.quantity *
                item.purchase_price;


            if (
                item.discount >
                itemAmount
            ) {
                return "Item discount cannot exceed item amount.";
            }
        }


        return null;
    }


    /* =========================================================
       SAVE PURCHASE
       ========================================================= */

    async function savePurchase() {

        const validation =
            validate();

        if (validation) {

            toast(
                validation,
                "error"
            );

            return;
        }


        const button =
            $("savePurchase");


        button.classList.add(
            "loading"
        );


        button.disabled = true;


        try {

            const supplierValue =
                $("supplierId").value;


            const requestedStatus =
                $("purchaseStatus").value;


            const items =
                itemRows.map(item => ({

                    product_id:
                        item.product_id,

                    quantity:
                        Number(
                            item.quantity
                        ),

                    purchase_price:
                        Number(
                            item.purchase_price
                        ),

                    discount:
                        Number(
                            item.discount
                        )
                }));


            const {
                data,
                error
            } =
                await sb.rpc(
                    "save_purchase",
                    {
                        p_purchase_id:
                            editingId ||
                            null,

                        p_supplier_id:
                            supplierValue
                                ? Number(
                                      supplierValue
                                  )
                                : null,

                        p_purchase_date:
                            new Date(
                                $("purchaseDate")
                                    .value
                            ).toISOString(),

                        p_other_cost:
                            Math.max(
                                0,
                                Number(
                                    $("otherCost")
                                        .value ||
                                    0
                                )
                            ),

                        p_paid_amount:
                            Math.max(
                                0,
                                Number(
                                    $("paidAmount")
                                        .value ||
                                    0
                                )
                            ),

                        p_note:
                            $("purchaseNote")
                                .value
                                .trim() ||
                            null,

                        p_status:
                            requestedStatus,

                        p_items:
                            items
                    }
                );


            if (error) {
                throw error;
            }


            if (
                !data ||
                data.success !== true
            ) {
                throw new Error(
                    data?.message ||
                    "Purchase save failed."
                );
            }


            toast(
                requestedStatus ===
                    "completed"
                    ? "Purchase completed and stock received successfully."
                    : requestedStatus ===
                      "cancelled"
                    ? "Purchase cancelled successfully."
                    : "Purchase saved successfully.",
                "success"
            );


            closeModal();


            await loadPurchases();


        } catch (error) {

            console.error(
                "Save Purchase Error:",
                error
            );


            toast(
                error.message ||
                "Unable to save purchase.",
                "error"
            );

        } finally {

            button.classList.remove(
                "loading"
            );

            button.disabled =
                false;
        }
    }


    /* =========================================================
       BIND EVENTS
       ========================================================= */

    function bind() {

        $("newPurchaseBtn")
            .onclick = () => {

                resetForm();

                supplierOptions();

                [
                    "supplierId",
                    "purchaseDate",
                    "purchaseStatus",
                    "otherCost",
                    "paidAmount",
                    "purchaseNote"
                ].forEach(id => {

                    $(id).disabled =
                        false;
                });


                $("addPurchaseItem")
                    .style.display =
                    "";


                $("savePurchase")
                    .style.display =
                    "";


                $("purchaseModal")
                    .classList
                    .add("show");
            };


        $("refreshPurchases")
            .onclick =
            init;


        $("closePurchaseModal")
            .onclick =
            closeModal;


        $("cancelPurchase")
            .onclick =
            closeModal;


        $("addPurchaseItem")
            .onclick =
            () => addItem();


        $("savePurchase")
            .onclick =
            savePurchase;


        $("searchPurchase")
            .oninput =
            render;


        $("statusFilter")
            .onchange =
            render;


        $("paymentFilter")
            .onchange =
            render;


        $("otherCost")
            .oninput =
            calculate;


        $("paidAmount")
            .oninput =
            calculate;


        $("purchaseModal")
            .addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        $("purchaseModal")
                    ) {
                        closeModal();
                    }
                }
            );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Escape"
                ) {
                    closeModal();
                }
            }
        );
    }


    /* =========================================================
       INITIALIZE
       ========================================================= */

    async function init() {

        try {

            if (!sb) {
                throw new Error(
                    "Supabase client is not initialized."
                );
            }


            bind();


            await Promise.all([
                loadProducts(),
                loadSuppliers(),
                loadPurchases()
            ]);


            supplierOptions();


            console.log(
                "MIXNBUY.BD Purchases Supabase integration loaded successfully."
            );

        } catch (error) {

            console.error(
                "Purchases Initialization Error:",
                error
            );


            toast(
                error.message ||
                "Failed to load Purchases.",
                "error"
            );
        }
    }


    document.addEventListener(
        "DOMContentLoaded",
        init
    );

})();