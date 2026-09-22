"use strict";


/* =========================================================
   GLOBAL STATE
========================================================= */

let allProducts = [];

let filteredProducts = [];

let allCategories = [];

let categoryMap = new Map();


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initProducts
);


async function initProducts() {

    bindProductEvents();

    await loadCategories();

    await loadProducts();

}


/* =========================================================
   SUPABASE CLIENT
========================================================= */

function getProductsClient() {

    if (
        typeof window.getClient === "function"
    ) {
        return window.getClient();
    }


    if (
        typeof window.supabaseClient !== "undefined"
    ) {
        return window.supabaseClient;
    }


    console.error(
        "Supabase client not found."
    );


    return null;

}


/* =========================================================
   EVENTS
========================================================= */

function bindProductEvents() {


    document
        .getElementById("addProductBtn")
        ?.addEventListener(
            "click",
            openAddProductModal
        );


    document
        .getElementById("refreshProductsBtn")
        ?.addEventListener(
            "click",
            async () => {

                await loadCategories();

                await loadProducts();

            }
        );


    document
        .getElementById("productSearch")
        ?.addEventListener(
            "input",
            applyProductFilters
        );


    document
        .getElementById("categoryFilter")
        ?.addEventListener(
            "change",
            applyProductFilters
        );


    document
        .getElementById("statusFilter")
        ?.addEventListener(
            "change",
            applyProductFilters
        );


    document
        .getElementById("productForm")
        ?.addEventListener(
            "submit",
            saveProduct
        );


    document
        .getElementById("closeProductModal")
        ?.addEventListener(
            "click",
            closeProductModal
        );


    document
        .getElementById("cancelProductBtn")
        ?.addEventListener(
            "click",
            closeProductModal
        );


    document
        .getElementById("closeViewProductModal")
        ?.addEventListener(
            "click",
            closeViewProductModal
        );


    document
        .getElementById("productModal")
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "productModal"
                ) {

                    closeProductModal();

                }

            }
        );


    document
        .getElementById("viewProductModal")
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "viewProductModal"
                ) {

                    closeViewProductModal();

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

                closeProductModal();

                closeViewProductModal();

            }

        }
    );

}


/* =========================================================
   LOAD CATEGORIES
========================================================= */

async function loadCategories() {

    const client =
        getProductsClient();


    if (!client) {
        return;
    }


    const modalSelect =
        document.getElementById(
            "productCategory"
        );


    const filterSelect =
        document.getElementById(
            "categoryFilter"
        );


    try {


        /*
         * IMPORTANT:
         *
         * Live categories table is returning
         * 400 when slug/is_active are requested.
         *
         * Therefore ONLY id,name are requested.
         */

        const {
            data,
            error
        } = await client
            .from("categories")
            .select(
                "id,name"
            )
            .order(
                "name",
                {
                    ascending: true
                }
            );


        if (error) {

            console.error(
                "Category load error:",
                error
            );

            throw error;

        }


        allCategories =
            Array.isArray(data)
                ? data
                : [];


        categoryMap =
            new Map(
                allCategories.map(
                    category => [
                        String(category.id),
                        category.name
                    ]
                )
            );


        /* =============================================
           PRODUCT MODAL CATEGORY
        ============================================== */

        if (modalSelect) {

            modalSelect.innerHTML = `
                <option value="">
                    Select Category
                </option>
            `;


            allCategories.forEach(
                category => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        category.id;


                    option.textContent =
                        category.name;


                    modalSelect.appendChild(
                        option
                    );

                }
            );

        }


        /* =============================================
           FILTER CATEGORY
        ============================================== */

        if (filterSelect) {

            filterSelect.innerHTML = `
                <option value="">
                    All Categories
                </option>
            `;


            allCategories.forEach(
                category => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        category.id;


                    option.textContent =
                        category.name;


                    filterSelect.appendChild(
                        option
                    );

                }
            );

        }

    }
    catch (error) {

        console.error(
            "Category load error:",
            error
        );


        allCategories = [];

        categoryMap =
            new Map();


        if (modalSelect) {

            modalSelect.innerHTML = `
                <option value="">
                    Category Load Failed
                </option>
            `;

        }


        if (filterSelect) {

            filterSelect.innerHTML = `
                <option value="">
                    All Categories
                </option>
            `;

        }

    }

}


/* =========================================================
   LOAD PRODUCTS
========================================================= */

async function loadProducts() {

    const client =
        getProductsClient();


    if (!client) {

        showProductMessage(
            "Supabase connection is not available.",
            "bi-database-x"
        );

        return;

    }


    showProductMessage(
        "Loading products...",
        "bi-arrow-repeat"
    );


    try {


        /*
         * IMPORTANT:
         *
         * category_id is used.
         *
         * We do NOT request category text.
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
                description,
                category_id,
                brand,
                unit,
                purchase_price,
                selling_price,
                discount_price,
                current_stock,
                image_url,
                gallery,
                is_featured,
                is_active,
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

            console.error(
                "Products load error:",
                error
            );

            throw error;

        }


        allProducts =
            Array.isArray(data)
                ? data
                : [];


        normalizeProducts();


        filteredProducts =
            [
                ...allProducts
            ];


        updateProductStats();

        renderProducts();

    }
    catch (error) {

        console.error(
            "Products load error:",
            error
        );


        allProducts = [];

        filteredProducts = [];


        updateProductStats();


        showProductMessage(
            error?.message ||
            "Failed to load products.",
            "bi-exclamation-triangle"
        );

    }

}


/* =========================================================
   NORMALIZE
========================================================= */

function normalizeProducts() {

    allProducts =
        allProducts.map(
            product => ({

                ...product,

                name:
                    product.name ||
                    "Unnamed Product",

                product_code:
                    product.product_code ||
                    "",

                sku:
                    product.sku ||
                    "",

                brand:
                    product.brand ||
                    "",

                unit:
                    product.unit ||
                    "pcs",

                purchase_price:
                    Number(
                        product.purchase_price || 0
                    ),

                selling_price:
                    Number(
                        product.selling_price || 0
                    ),

                discount_price:
                    product.discount_price === null ||
                    product.discount_price === undefined
                        ? null
                        : Number(
                            product.discount_price
                        ),

                current_stock:
                    Number(
                        product.current_stock || 0
                    ),

                is_featured:
                    Boolean(
                        product.is_featured
                    ),

                is_active:
                    product.is_active !== false

            })
        );

}


/* =========================================================
   CATEGORY NAME
========================================================= */

function getCategoryName(
    categoryId
) {

    if (
        !categoryId
    ) {

        return "Uncategorized";

    }


    return (
        categoryMap.get(
            String(categoryId)
        ) ||
        "Uncategorized"
    );

}


/* =========================================================
   FILTER
========================================================= */

function applyProductFilters() {

    const search =
        (
            document.getElementById(
                "productSearch"
            )?.value || ""
        )
        .trim()
        .toLowerCase();


    const categoryId =
        document.getElementById(
            "categoryFilter"
        )?.value || "";


    const status =
        document.getElementById(
            "statusFilter"
        )?.value || "";


    filteredProducts =
        allProducts.filter(
            product => {


                const matchesSearch =
                    !search ||

                    String(
                        product.name || ""
                    )
                    .toLowerCase()
                    .includes(search) ||

                    String(
                        product.product_code || ""
                    )
                    .toLowerCase()
                    .includes(search) ||

                    String(
                        product.sku || ""
                    )
                    .toLowerCase()
                    .includes(search) ||

                    String(
                        product.brand || ""
                    )
                    .toLowerCase()
                    .includes(search);


                const matchesCategory =
                    !categoryId ||
                    String(
                        product.category_id || ""
                    ) ===
                    String(categoryId);


                const matchesStatus =
                    !status ||
                    String(
                        product.is_active
                    ) === status;


                return (
                    matchesSearch &&
                    matchesCategory &&
                    matchesStatus
                );

            }
        );


    renderProducts();

}


/* =========================================================
   RENDER
========================================================= */

function renderProducts() {

    const tbody =
        document.getElementById(
            "productsTableBody"
        );


    const countText =
        document.getElementById(
            "productCountText"
        );


    if (!tbody) {
        return;
    }


    if (countText) {

        countText.textContent =
            `${filteredProducts.length} product${
                filteredProducts.length === 1
                    ? ""
                    : "s"
            }`;

    }


    if (
        filteredProducts.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="products-empty"
                >

                    <i class="bi bi-box-seam"></i>

                    No products found.

                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        filteredProducts
            .map(
                renderProductRow
            )
            .join("");

}


/* =========================================================
   ROW
========================================================= */

function renderProductRow(
    product
) {

    const category =
        getCategoryName(
            product.category_id
        );


    const stock =
        Number(
            product.current_stock || 0
        );


    let stockClass =
        "stock-normal";


    if (stock <= 0) {

        stockClass =
            "stock-out";

    }
    else if (stock <= 5) {

        stockClass =
            "stock-low";

    }


    return `

        <tr>


            <td>

                <div class="product-cell">


                    <div class="product-image">

                        ${
                            product.image_url
                                ? `

                                    <img
                                        src="${escapeHtml(
                                            product.image_url
                                        )}"
                                        alt="${escapeHtml(
                                            product.name
                                        )}"
                                        onerror="
                                            this.style.display='none';
                                            this.nextElementSibling.style.display='flex';
                                        "
                                    >

                                    <i
                                        class="bi bi-image"
                                        style="display:none;"
                                    ></i>

                                `
                                : `

                                    <i class="bi bi-box-seam"></i>

                                `
                        }

                    </div>


                    <div>

                        <div class="product-name">

                            ${escapeHtml(
                                product.name
                            )}

                        </div>


                        ${
                            product.brand
                                ? `

                                    <div class="product-brand">

                                        ${escapeHtml(
                                            product.brand
                                        )}

                                    </div>

                                `
                                : ""
                        }

                    </div>

                </div>

            </td>


            <td>

                ${escapeHtml(
                    product.product_code ||
                    "-"
                )}

            </td>


            <td>

                <span class="product-category">

                    ${escapeHtml(
                        category
                    )}

                </span>

            </td>


            <td>

                ${formatMoney(
                    product.purchase_price
                )}

            </td>


            <td>

                ${formatMoney(
                    product.selling_price
                )}

            </td>


            <td>

                <span
                    class="${stockClass}"
                >

                    ${formatNumber(
                        stock
                    )}

                    ${escapeHtml(
                        product.unit ||
                        "pcs"
                    )}

                </span>

            </td>


            <td>

                <span
                    class="product-status ${
                        product.is_active
                            ? "active"
                            : "inactive"
                    }"
                >

                    <i
                        class="bi ${
                            product.is_active
                                ? "bi-check-circle-fill"
                                : "bi-x-circle-fill"
                        }"
                    ></i>

                    ${
                        product.is_active
                            ? "Active"
                            : "Inactive"
                    }

                </span>

            </td>


            <td>

                <div class="product-actions">


                    <button
                        type="button"
                        class="product-action-btn view"
                        title="View"
                        onclick="
                            viewProduct('${product.id}')
                        "
                    >

                        <i class="bi bi-eye"></i>

                    </button>


                    <button
                        type="button"
                        class="product-action-btn edit"
                        title="Edit"
                        onclick="
                            editProduct('${product.id}')
                        "
                    >

                        <i class="bi bi-pencil"></i>

                    </button>


                    <button
                        type="button"
                        class="product-action-btn toggle"
                        title="${
                            product.is_active
                                ? "Deactivate"
                                : "Activate"
                        }"
                        onclick="
                            toggleProductStatus(
                                '${product.id}'
                            )
                        "
                    >

                        <i class="bi ${
                            product.is_active
                                ? "bi-toggle-on"
                                : "bi-toggle-off"
                        }"></i>

                    </button>


                </div>

            </td>


        </tr>

    `;

}


/* =========================================================
   STATS
========================================================= */

function updateProductStats() {

    const total =
        allProducts.length;


    const active =
        allProducts.filter(
            product =>
                product.is_active
        ).length;


    const featured =
        allProducts.filter(
            product =>
                product.is_featured
        ).length;


    const lowStock =
        allProducts.filter(
            product =>
                Number(
                    product.current_stock || 0
                ) <= 5
        ).length;


    setText(
        "totalProducts",
        total
    );


    setText(
        "activeProducts",
        active
    );


    setText(
        "featuredProducts",
        featured
    );


    setText(
        "lowStockProducts",
        lowStock
    );

}


/* =========================================================
   ADD
========================================================= */

function openAddProductModal() {

    document
        .getElementById(
            "productForm"
        )
        ?.reset();


    setValue(
        "productId",
        ""
    );


    setValue(
        "currentStock",
        "0"
    );


    setChecked(
        "isFeatured",
        false
    );


    setChecked(
        "isActive",
        true
    );


    setText(
        "productModalTitle",
        "Add Product"
    );


    const saveBtn =
        document.getElementById(
            "saveProductBtn"
        );


    if (saveBtn) {

        saveBtn.innerHTML = `
            <i class="bi bi-check-lg"></i>
            Save Product
        `;

    }


    openProductModal();

}


/* =========================================================
   EDIT
========================================================= */

function editProduct(
    productId
) {

    const product =
        allProducts.find(
            item =>
                String(item.id) ===
                String(productId)
        );


    if (!product) {

        alert(
            "Product not found."
        );

        return;

    }


    setValue(
        "productId",
        product.id
    );


    setValue(
        "productCode",
        product.product_code
    );


    setValue(
        "productSku",
        product.sku
    );


    setValue(
        "productName",
        product.name
    );


    /*
     * IMPORTANT:
     *
     * Category dropdown stores category UUID.
     */

    setValue(
        "productCategory",
        product.category_id || ""
    );


    setValue(
        "productBrand",
        product.brand
    );


    setValue(
        "productUnit",
        product.unit
    );


    setValue(
        "purchasePrice",
        product.purchase_price
    );


    setValue(
        "sellingPrice",
        product.selling_price
    );


    setValue(
        "discountPrice",
        product.discount_price ?? ""
    );


    setValue(
        "currentStock",
        product.current_stock
    );


    setValue(
        "productImage",
        product.image_url || ""
    );


    setValue(
        "productDescription",
        product.description || ""
    );


    setValue(
        "productGallery",
        getGalleryText(
            product.gallery
        )
    );


    setChecked(
        "isFeatured",
        product.is_featured
    );


    setChecked(
        "isActive",
        product.is_active
    );


    setText(
        "productModalTitle",
        "Edit Product"
    );


    const saveBtn =
        document.getElementById(
            "saveProductBtn"
        );


    if (saveBtn) {

        saveBtn.innerHTML = `
            <i class="bi bi-check-lg"></i>
            Update Product
        `;

    }


    openProductModal();

}


/* =========================================================
   SAVE / UPDATE
========================================================= */

async function saveProduct(
    event
) {

    event.preventDefault();


    const client =
        getProductsClient();


    if (!client) {

        alert(
            "Supabase connection is not available."
        );

        return;

    }


    const productId =
        getValue(
            "productId"
        );


    const name =
        getValue(
            "productName"
        ).trim();


    const categoryId =
        getValue(
            "productCategory"
        );


    const sellingPrice =
        Number(
            getValue(
                "sellingPrice"
            ) || 0
        );


    if (!name) {

        alert(
            "Please enter product name."
        );

        return;

    }


    if (!categoryId) {

        alert(
            "Please select a category."
        );

        return;

    }


    if (
        sellingPrice < 0
    ) {

        alert(
            "Selling price cannot be negative."
        );

        return;

    }


    /*
     * IMPORTANT:
     *
     * There is NO "category" field here.
     *
     * The database uses category_id.
     */

    const payload = {


        product_code:
            getValue(
                "productCode"
            ).trim() || null,


        sku:
            getValue(
                "productSku"
            ).trim() || null,


        name,


        category_id:
            categoryId,


        brand:
            getValue(
                "productBrand"
            ).trim() || null,


        unit:
            getValue(
                "productUnit"
            ) || "pcs",


        purchase_price:
            Number(
                getValue(
                    "purchasePrice"
                ) || 0
            ),


        selling_price:
            sellingPrice,


        discount_price:
            getValue(
                "discountPrice"
            ) === ""
                ? null
                : Number(
                    getValue(
                        "discountPrice"
                    )
                ),


        current_stock:
            Number(
                getValue(
                    "currentStock"
                ) || 0
            ),


        image_url:
            getValue(
                "productImage"
            ).trim() || null,


        gallery:
            buildGalleryValue(
                getValue(
                    "productGallery"
                )
            ),


        description:
            getValue(
                "productDescription"
            ).trim() || null,


        is_featured:
            isChecked(
                "isFeatured"
            ),


        is_active:
            isChecked(
                "isActive"
            )

    };


    const saveBtn =
        document.getElementById(
            "saveProductBtn"
        );


    setButtonLoading(
        saveBtn,
        true
    );


    try {


        let result;


        /* =============================================
           UPDATE
        ============================================== */

        if (productId) {


            result =
                await client
                    .from("products")
                    .update(
                        payload
                    )
                    .eq(
                        "id",
                        productId
                    )
                    .select()
                    .single();

        }


        /* =============================================
           INSERT
        ============================================== */

        else {


            result =
                await client
                    .from("products")
                    .insert(
                        payload
                    )
                    .select()
                    .single();

        }


        if (
            result.error
        ) {

            console.error(
                "Product save error:",
                result.error
            );


            throw result.error;

        }


        alert(
            productId
                ? "Product updated successfully."
                : "Product added successfully."
        );


        closeProductModal();


        await loadProducts();

    }
    catch (error) {

        console.error(
            "Product save error:",
            error
        );


        alert(
            error?.message ||
            "Failed to save product."
        );

    }
    finally {

        setButtonLoading(
            saveBtn,
            false
        );

    }

}


/* =========================================================
   VIEW
========================================================= */

function viewProduct(
    productId
) {

    const product =
        allProducts.find(
            item =>
                String(item.id) ===
                String(productId)
        );


    if (!product) {

        alert(
            "Product not found."
        );

        return;

    }


    const container =
        document.getElementById(
            "productDetailsContent"
        );


    if (!container) {
        return;
    }


    const category =
        getCategoryName(
            product.category_id
        );


    container.innerHTML = `

        <div class="product-details">


            <div class="product-details-top">


                <div class="product-details-image">

                    ${
                        product.image_url
                            ? `

                                <img
                                    src="${escapeHtml(
                                        product.image_url
                                    )}"
                                    alt="${escapeHtml(
                                        product.name
                                    )}"
                                >

                            `
                            : `

                                <i class="bi bi-box-seam"></i>

                            `
                    }

                </div>


                <div class="product-details-title">

                    <h4>

                        ${escapeHtml(
                            product.name
                        )}

                    </h4>


                    <p>

                        ${escapeHtml(
                            product.product_code ||
                            "No Product Code"
                        )}

                    </p>

                </div>


            </div>


            <div class="product-details-grid">


                ${detailItem(
                    "Category",
                    category
                )}


                ${detailItem(
                    "SKU",
                    product.sku || "-"
                )}


                ${detailItem(
                    "Brand",
                    product.brand || "-"
                )}


                ${detailItem(
                    "Unit",
                    product.unit || "pcs"
                )}


                ${detailItem(
                    "Purchase Price",
                    formatMoney(
                        product.purchase_price
                    )
                )}


                ${detailItem(
                    "Selling Price",
                    formatMoney(
                        product.selling_price
                    )
                )}


                ${detailItem(
                    "Discount Price",
                    product.discount_price !== null
                        ? formatMoney(
                            product.discount_price
                        )
                        : "-"
                )}


                ${detailItem(
                    "Current Stock",
                    `${formatNumber(
                        product.current_stock
                    )} ${product.unit || "pcs"}`
                )}


                ${detailItem(
                    "Status",
                    product.is_active
                        ? "Active"
                        : "Inactive"
                )}


                ${detailItem(
                    "Featured",
                    product.is_featured
                        ? "Yes"
                        : "No"
                )}

            </div>


            ${
                product.description
                    ? `

                        <div class="product-detail-description">

                            <span>
                                Description
                            </span>

                            <p>

                                ${escapeHtml(
                                    product.description
                                )}

                            </p>

                        </div>

                    `
                    : ""
            }


        </div>

    `;


    openViewProductModal();

}


/* =========================================================
   TOGGLE STATUS
========================================================= */

async function toggleProductStatus(
    productId
) {

    const client =
        getProductsClient();


    if (!client) {

        alert(
            "Supabase connection is not available."
        );

        return;

    }


    const product =
        allProducts.find(
            item =>
                String(item.id) ===
                String(productId)
        );


    if (!product) {

        alert(
            "Product not found."
        );

        return;

    }


    const nextStatus =
        !product.is_active;


    const action =
        nextStatus
            ? "activate"
            : "deactivate";


    if (
        !confirm(
            `Are you sure you want to ${action} this product?`
        )
    ) {

        return;

    }


    try {


        const {
            error
        } = await client
            .from("products")
            .update({
                is_active:
                    nextStatus
            })
            .eq(
                "id",
                productId
            );


        if (error) {

            throw error;

        }


        await loadProducts();

    }
    catch (error) {

        console.error(
            "Product status error:",
            error
        );


        alert(
            error?.message ||
            "Failed to update product status."
        );

    }

}


/* =========================================================
   GALLERY
========================================================= */

function buildGalleryValue(
    value
) {

    if (!value) {
        return [];
    }


    const urls =
        value
            .split(",")
            .map(
                item =>
                    item.trim()
            )
            .filter(
                Boolean
            );


    return urls;

}


function getGalleryText(
    gallery
) {

    if (!gallery) {
        return "";
    }


    if (
        Array.isArray(gallery)
    ) {

        return gallery.join(
            ", "
        );

    }


    if (
        typeof gallery ===
        "string"
    ) {

        return gallery;

    }


    try {

        if (
            typeof gallery ===
            "object"
        ) {

            return JSON.stringify(
                gallery
            );

        }

    }
    catch (error) {

        return "";

    }


    return "";

}


/* =========================================================
   MODALS
========================================================= */

function openProductModal() {

    const modal =
        document.getElementById(
            "productModal"
        );


    if (modal) {

        modal.classList.add(
            "show"
        );

        document.body.style.overflow =
            "hidden";

    }

}


function closeProductModal() {

    const modal =
        document.getElementById(
            "productModal"
        );


    if (modal) {

        modal.classList.remove(
            "show"
        );

    }


    document.body.style.overflow =
        "";

}


function openViewProductModal() {

    const modal =
        document.getElementById(
            "viewProductModal"
        );


    if (modal) {

        modal.classList.add(
            "show"
        );

        document.body.style.overflow =
            "hidden";

    }

}


function closeViewProductModal() {

    const modal =
        document.getElementById(
            "viewProductModal"
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
   HELPERS
========================================================= */

function showProductMessage(
    message,
    icon
) {

    const tbody =
        document.getElementById(
            "productsTableBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = `

        <tr>

            <td
                colspan="8"
                class="products-loading"
            >

                <i class="bi ${icon}"></i>

                ${escapeHtml(
                    message
                )}

            </td>

        </tr>

    `;

}


function detailItem(
    label,
    value
) {

    return `

        <div class="product-detail-item">

            <span>
                ${escapeHtml(
                    label
                )}
            </span>


            <strong>
                ${escapeHtml(
                    String(
                        value ?? "-"
                    )
                )}
            </strong>

        </div>

    `;

}


function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


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
        document.getElementById(
            id
        );


    if (element) {

        element.value =
            value ?? "";

    }

}


function getValue(
    id
) {

    return (
        document.getElementById(
            id
        )?.value || ""
    );

}


function setChecked(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.checked =
            Boolean(value);

    }

}


function isChecked(
    id
) {

    return Boolean(
        document.getElementById(
            id
        )?.checked
    );

}


function setButtonLoading(
    button,
    loading
) {

    if (!button) {
        return;
    }


    if (loading) {

        button.disabled =
            true;


        button.dataset.originalText =
            button.innerHTML;


        button.innerHTML = `

            <i class="bi bi-arrow-repeat"></i>

            Saving...

        `;

    }
    else {

        button.disabled =
            false;


        if (
            button.dataset.originalText
        ) {

            button.innerHTML =
                button.dataset.originalText;

        }

    }

}


function formatMoney(
    value
) {

    const number =
        Number(
            value || 0
        );


    return (
        "৳" +
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
   GLOBAL
========================================================= */

window.MIXNBUY_PRODUCTS = {

    loadProducts,

    loadCategories,

    editProduct,

    viewProduct,

    toggleProductStatus,

    openAddProductModal

}; 
function normalizeImageUrl(url) {

    if (!url) {
        return "";
    }

    let imageUrl = String(url).trim();

    if (!imageUrl) {
        return "";
    }

    /*
     * Google Drive:
     *
     * https://drive.google.com/file/d/FILE_ID/view
     *
     * converted to:
     *
     * https://drive.google.com/uc?export=view&id=FILE_ID
     */

    const driveFileMatch =
        imageUrl.match(
            /drive\.google\.com\/file\/d\/([^/]+)/
        );

    if (driveFileMatch) {

        return (
            "https://drive.google.com/uc?export=view&id=" +
            driveFileMatch[1]
        );

    }


    /*
     * Google Drive open?id=FILE_ID
     */

    const driveOpenMatch =
        imageUrl.match(
            /drive\.google\.com\/open\?id=([^&]+)/
        );

    if (driveOpenMatch) {

        return (
            "https://drive.google.com/uc?export=view&id=" +
            driveOpenMatch[1]
        );

    }


    /*
     * Already direct URL
     */

    if (
        imageUrl.startsWith("http://") ||
        imageUrl.startsWith("https://")
    ) {

        return imageUrl;

    }


    return "";

}