/* =========================================================
   MIXNBUY.BD - PRODUCTS PAGE
   FINAL VERSION
   Direct Supabase Client
========================================================= */

(() => {
    "use strict";

    /* =====================================================
       STATE
    ===================================================== */

    const state = {
        products: [],
        categories: [],
        filteredProducts: [],

        search: "",
        category: "",
        sort: "default",

        inStockOnly: false,
        featuredOnly: false
    };


    /* =====================================================
       DOM HELPERS
    ===================================================== */

    const $ = (id) => document.getElementById(id);


    const elements = {
        productGrid: $("productsGrid"),
        productCount: $("productCount"),

        loading: $("productsLoading"),
        empty: $("productsEmpty"),
        error: $("productsError"),
        errorMessage: $("productsErrorMessage"),

        categoryList: $("categoryList"),

        productSearch: $("productSearch"),
        headerSearch: $("headerSearch"),
        headerSearchForm: $("headerSearchForm"),

        sortProducts: $("sortProducts"),

        inStockOnly: $("inStockOnly"),
        featuredOnly: $("featuredOnly"),

        clearFilters: $("clearFilters"),
        emptyClearBtn: $("emptyClearBtn"),

        retryProducts: $("retryProducts"),

        activeFilters: $("activeFilters"),

        mobileFilterBtn: $("mobileFilterBtn"),
        productsSidebar: $("productsSidebar"),

        cartCount: $("cartCount"),
        footerYear: $("footerYear")
    };


    /* =====================================================
       INIT
    ===================================================== */

    document.addEventListener("DOMContentLoaded", init);


    async function init() {

        console.log("MIXNBUY.BD Products Page initializing...");


        try {

            setFooterYear();

            readURLParams();

            bindEvents();

            updateCartCount();

            checkSupabase();

            /*
             * Load categories first.
             */
            await loadCategories();

            /*
             * Then load products.
             */
            await loadProducts();

            /*
             * Apply URL/search/filter state.
             */
            applyFilters();

            console.log(
                "MIXNBUY.BD Products Page ready."
            );

        } catch (error) {

            console.error(
                "Products initialization error:",
                error
            );

            showError(
                error.message ||
                "Unable to load products."
            );

        }

    }


    /* =====================================================
       SUPABASE CHECK
    ===================================================== */

    function checkSupabase() {

        if (!window.supabaseClient) {

            throw new Error(
                "Supabase client is not initialized. Please check supabase.js."
            );

        }

        console.log(
            "Supabase client available for Products Page."
        );

    }


    /* =====================================================
       URL PARAMETERS
    ===================================================== */

    function readURLParams() {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const search =
            params.get("search");


        const category =
            params.get("category");


        const sort =
            params.get("sort");


        if (search) {

            state.search =
                search.trim();

            if (elements.productSearch) {
                elements.productSearch.value =
                    state.search;
            }

            if (elements.headerSearch) {
                elements.headerSearch.value =
                    state.search;
            }

        }


        if (category) {

            if (category === "featured") {

                state.featuredOnly = true;

                if (elements.featuredOnly) {
                    elements.featuredOnly.checked =
                        true;
                }

            } else {

                state.category =
                    category;

            }

        }


        if (sort) {

            const allowedSorts = [
                "default",
                "newest",
                "price-low",
                "price-high",
                "name-az",
                "name-za"
            ];


            if (
                allowedSorts.includes(sort)
            ) {

                state.sort = sort;

                if (elements.sortProducts) {
                    elements.sortProducts.value =
                        sort;
                }

            }

        }

    }


    /* =====================================================
       EVENTS
    ===================================================== */

    function bindEvents() {


        /* -----------------------------------------------
           Product Search
        ------------------------------------------------ */

        if (elements.productSearch) {

            elements.productSearch.addEventListener(
                "input",
                debounce(() => {

                    state.search =
                        elements.productSearch.value.trim();


                    if (elements.headerSearch) {

                        elements.headerSearch.value =
                            state.search;

                    }


                    applyFilters();

                    updateURL();

                }, 250)
            );

        }


        /* -----------------------------------------------
           Header Search
        ------------------------------------------------ */

        if (elements.headerSearchForm) {

            elements.headerSearchForm.addEventListener(
                "submit",
                (event) => {

                    event.preventDefault();


                    const value =
                        elements.headerSearch.value.trim();


                    state.search =
                        value;


                    if (elements.productSearch) {

                        elements.productSearch.value =
                            value;

                    }


                    applyFilters();

                    updateURL();

                }
            );

        }


        /* -----------------------------------------------
           Sort
        ------------------------------------------------ */

        if (elements.sortProducts) {

            elements.sortProducts.addEventListener(
                "change",
                () => {

                    state.sort =
                        elements.sortProducts.value;


                    applyFilters();

                    updateURL();

                }
            );

        }


        /* -----------------------------------------------
           In Stock
        ------------------------------------------------ */

        if (elements.inStockOnly) {

            elements.inStockOnly.addEventListener(
                "change",
                () => {

                    state.inStockOnly =
                        elements.inStockOnly.checked;


                    applyFilters();

                }
            );

        }


        /* -----------------------------------------------
           Featured
        ------------------------------------------------ */

        if (elements.featuredOnly) {

            elements.featuredOnly.addEventListener(
                "change",
                () => {

                    state.featuredOnly =
                        elements.featuredOnly.checked;


                    applyFilters();

                }
            );

        }


        /* -----------------------------------------------
           Clear Filters
        ------------------------------------------------ */

        if (elements.clearFilters) {

            elements.clearFilters.addEventListener(
                "click",
                clearAllFilters
            );

        }


        if (elements.emptyClearBtn) {

            elements.emptyClearBtn.addEventListener(
                "click",
                clearAllFilters
            );

        }


        /* -----------------------------------------------
           Retry
        ------------------------------------------------ */

        if (elements.retryProducts) {

            elements.retryProducts.addEventListener(
                "click",
                reloadProducts
            );

        }


        /* -----------------------------------------------
           Mobile Filter
        ------------------------------------------------ */

        if (elements.mobileFilterBtn) {

            elements.mobileFilterBtn.addEventListener(
                "click",
                () => {

                    if (!elements.productsSidebar) {
                        return;
                    }


                    elements.productsSidebar
                        .classList.toggle(
                            "mobile-open"
                        );

                }
            );

        }

    }


    /* =====================================================
       LOAD CATEGORIES
    ===================================================== */

   async function loadCategories() {

    if (!window.supabaseClient) {
        throw new Error(
            "Supabase client is not initialized."
        );
    }

    console.log("Loading categories...");

    const {
        data,
        error
    } = await window.supabaseClient
        .from("categories")
        .select(`
            id,
            name,
            slug
        `)
        .order(
            "name",
            {
                ascending: true
            }
        );

    if (error) {

        console.error(
            "Category query error:",
            error
        );

        throw new Error(
            "Unable to load categories: " +
            error.message
        );
    }

    state.categories =
        Array.isArray(data)
            ? data
            : [];

    console.log(
        `Categories loaded: ${state.categories.length}`
    );

    renderCategories();
}


    /* =====================================================
       RENDER CATEGORIES
    ===================================================== */

    function renderCategories() {

        if (!elements.categoryList) {
            return;
        }


        if (!state.categories.length) {

            elements.categoryList.innerHTML = `
                <div class="filter-loading">
                    No categories available.
                </div>
            `;

            return;

        }


        const allCount =
            state.products.length;


        let html = `

            <div
                class="category-filter-item ${
                    state.category === ""
                        ? "active"
                        : ""
                }"
                data-category="">

                <span class="category-filter-name">
                    <i class="bi bi-grid"></i>
                    All Categories
                </span>

                <span class="category-count">
                    ${allCount}
                </span>

            </div>

        `;


        state.categories.forEach(
            category => {

                const count =
                    state.products.filter(
                        product =>
                            product.category_id ===
                            category.id
                    ).length;


                html += `

                    <div
                        class="category-filter-item ${
                            state.category === category.id
                                ? "active"
                                : ""
                        }"
                        data-category="${escapeHTML(
                            category.id
                        )}">

                        <span class="category-filter-name">

                            <i class="bi bi-tag"></i>

                            ${escapeHTML(
                                category.name
                            )}

                        </span>

                        <span class="category-count">
                            ${count}
                        </span>

                    </div>

                `;

            }
        );


        elements.categoryList.innerHTML =
            html;


        /*
         * Category click events.
         */

        elements.categoryList
            .querySelectorAll(
                ".category-filter-item"
            )
            .forEach(item => {

                item.addEventListener(
                    "click",
                    () => {

                        state.category =
                            item.dataset.category || "";


                        /*
                         * If category is selected,
                         * turn featured filter off.
                         */

                        if (state.category) {

                            state.featuredOnly =
                                false;

                            if (
                                elements.featuredOnly
                            ) {

                                elements.featuredOnly.checked =
                                    false;

                            }

                        }


                        updateCategoryUI();

                        applyFilters();

                        updateURL();

                    }
                );

            });

    }


    /* =====================================================
       LOAD PRODUCTS
    ===================================================== */

    async function loadProducts() {

    showLoading();
    hideError();

    console.log(
        "Loading products from Supabase..."
    );

    if (!window.supabaseClient) {

        throw new Error(
            "Supabase client is not initialized."
        );
    }

    const {
        data,
        error
    } =
        await window.supabaseClient
            .from("products")
            .select(`
                id,
                product_code,
                sku,
                name,
                slug,
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
            .eq(
                "is_active",
                true
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

    if (error) {

        console.error(
            "Products query error:",
            error
        );

        throw new Error(
            "Unable to load products: " +
            error.message
        );
    }

    state.products =
        Array.isArray(data)
            ? data
            : [];

    console.log(
        `Products loaded: ${state.products.length}`
    );

    /*
     * Refresh category counts
     * after products are loaded.
     */
    renderCategories();
}


    /* =====================================================
       RELOAD PRODUCTS
    ===================================================== */

    async function reloadProducts() {

        try {

            hideError();

            await loadProducts();

            applyFilters();

        } catch (error) {

            console.error(
                "Reload products error:",
                error
            );

            showError(
                error.message ||
                "Unable to reload products."
            );

        }

    }


    /* =====================================================
       FILTER
    ===================================================== */

    function applyFilters() {

        let products =
            [...state.products];


        /* -----------------------------------------------
           Search
        ------------------------------------------------ */

        if (state.search) {

            const search =
                state.search.toLowerCase();


            products =
                products.filter(
                    product => {

                        const name =
                            String(
                                product.name || ""
                            ).toLowerCase();


                        const description =
                            String(
                                product.description || ""
                            ).toLowerCase();


                        const brand =
                            String(
                                product.brand || ""
                            ).toLowerCase();


                        const sku =
                            String(
                                product.sku || ""
                            ).toLowerCase();


                        const productCode =
                            String(
                                product.product_code || ""
                            ).toLowerCase();


                        return (
                            name.includes(search) ||
                            description.includes(search) ||
                            brand.includes(search) ||
                            sku.includes(search) ||
                            productCode.includes(search)
                        );

                    }
                );

        }


        /* -----------------------------------------------
           Category
        ------------------------------------------------ */

        if (state.category) {

            products =
                products.filter(
                    product =>
                        product.category_id ===
                        state.category
                );

        }


        /* -----------------------------------------------
           Stock
        ------------------------------------------------ */

        if (state.inStockOnly) {

            products =
                products.filter(
                    product =>
                        Number(
                            product.current_stock || 0
                        ) > 0
                );

        }


        /* -----------------------------------------------
           Featured
        ------------------------------------------------ */

        if (state.featuredOnly) {

            products =
                products.filter(
                    product =>
                        product.is_featured === true
                );

        }


        /* -----------------------------------------------
           Sort
        ------------------------------------------------ */

        products =
            sortProducts(
                products,
                state.sort
            );


        state.filteredProducts =
            products;


        renderProducts(
            products
        );


        renderActiveFilters();

    }


    /* =====================================================
       SORT PRODUCTS
    ===================================================== */

    function sortProducts(
        products,
        sort
    ) {

        return products.sort(
            (a, b) => {

                switch (sort) {

                    case "price-low":

                        return (
                            getPrice(a) -
                            getPrice(b)
                        );


                    case "price-high":

                        return (
                            getPrice(b) -
                            getPrice(a)
                        );


                    case "name-az":

                        return String(
                            a.name || ""
                        ).localeCompare(
                            String(
                                b.name || ""
                            )
                        );


                    case "name-za":

                        return String(
                            b.name || ""
                        ).localeCompare(
                            String(
                                a.name || ""
                            )
                        );


                    case "newest":

                        return (
                            getDateValue(
                                b.created_at
                            ) -
                            getDateValue(
                                a.created_at
                            )
                        );


                    case "default":

                    default:

                        /*
                         * Featured products first.
                         */

                        if (
                            a.is_featured === true &&
                            b.is_featured !== true
                        ) {

                            return -1;

                        }


                        if (
                            a.is_featured !== true &&
                            b.is_featured === true
                        ) {

                            return 1;

                        }


                        return (
                            getDateValue(
                                b.created_at
                            ) -
                            getDateValue(
                                a.created_at
                            )
                        );

                }

            }
        );

    }


    /* =====================================================
       RENDER PRODUCTS
    ===================================================== */

    function renderProducts(
        products
    ) {

        hideLoading();


        if (elements.productCount) {

            elements.productCount.textContent =
                products.length;

        }


        if (!products.length) {

            if (elements.productGrid) {
                elements.productGrid.innerHTML =
                    "";
            }

            showEmpty();

            return;

        }


        hideEmpty();


        if (!elements.productGrid) {
            return;
        }


        elements.productGrid.innerHTML =
            products
                .map(
                    productCard
                )
                .join("");


        bindProductButtons();

    }


    /* =====================================================
       PRODUCT CARD
    ===================================================== */

    function productCard(
        product
    ) {

        const price =
            getPrice(product);


        const oldPrice =
            getOldPrice(product);


        const stock =
            Number(
                product.current_stock || 0
            );


        const isOut =
            stock <= 0;


        const isLow =
            stock > 0 &&
            stock <= 5;


        const category =
            getCategoryName(
                product.category_id
            );


        const image =
            getProductImage(
                product
            );


        const discount =
            calculateDiscount(
                oldPrice,
                price
            );


        let badges = "";


        /*
         * Featured badge.
         */

        if (
            product.is_featured === true
        ) {

            badges += `
                <span class="product-badge featured">
                    <i class="bi bi-star-fill"></i>
                    Featured
                </span>
            `;

        }


        /*
         * Discount badge.
         */

        if (discount > 0) {

            const top =
                product.is_featured === true
                    ? "43px"
                    : "12px";


            badges += `
                <span
                    class="product-badge discount"
                    style="top:${top}">

                    -${discount}%

                </span>
            `;

        }


        /*
         * Out of stock badge.
         */

        if (isOut) {

            let top = "12px";


            if (
                product.is_featured === true &&
                discount > 0
            ) {

                top = "74px";

            } else if (
                product.is_featured === true ||
                discount > 0
            ) {

                top = "43px";

            }


            badges += `
                <span
                    class="product-badge out-stock"
                    style="top:${top}">

                    Out of Stock

                </span>
            `;

        }


        /*
         * Stock status.
         */

        let stockHTML;


        if (isOut) {

            stockHTML = `
                <span class="product-stock out-stock">
                    <i class="bi bi-circle-fill"></i>
                    Out of Stock
                </span>
            `;

        } else if (isLow) {

            stockHTML = `
                <span class="product-stock low-stock">
                    <i class="bi bi-circle-fill"></i>
                    Only ${stock} left
                </span>
            `;

        } else {

            stockHTML = `
                <span class="product-stock in-stock">
                    <i class="bi bi-circle-fill"></i>
                    In Stock
                </span>
            `;

        }


        const productId =
            encodeURIComponent(
                product.id
            );


        return `

            <article class="shop-product-card">

                <!-- Product Image -->

                <div class="shop-product-image">

                    ${badges}


                    <!-- View Product -->

                    <a
                        href="product.html?id=${productId}"
                        class="product-quick-view"
                        aria-label="View product">

                        <i class="bi bi-eye"></i>

                    </a>


                    <a
                        href="product.html?id=${productId}">

                        <img
                            src="${escapeHTML(image)}"
                            alt="${escapeHTML(
                                product.name ||
                                "Product"
                            )}"
                            loading="lazy"
                            onerror="
                                this.onerror=null;
                                this.src='assets/images/product-placeholder.svg';
                            "
                        >

                    </a>

                </div>


                <!-- Product Information -->

                <div class="shop-product-info">


                    <!-- Category -->

                    <div class="product-category">

                        ${escapeHTML(
                            category
                        )}

                    </div>


                    <!-- Product Name -->

                    <a
                        href="product.html?id=${productId}"
                        class="shop-product-name">

                        ${escapeHTML(
                            product.name ||
                            "Unnamed Product"
                        )}

                    </a>


                    <!-- Description -->

                    ${
                        product.description
                            ? `
                                <div class="product-description">

                                    ${escapeHTML(
                                        product.description
                                    )}

                                </div>
                            `
                            : ""
                    }


                    <!-- Price -->

                    <div class="product-price-row">

                        <span class="product-price">

                            ${formatMoney(
                                price
                            )}

                        </span>


                        ${
                            oldPrice > price
                                ? `
                                    <span class="product-old-price">

                                        ${formatMoney(
                                            oldPrice
                                        )}

                                    </span>
                                `
                                : ""
                        }

                    </div>


                    <!-- Bottom -->

                    <div class="product-card-bottom">

                        ${stockHTML}


                        <button
                            type="button"
                            class="add-cart-btn"
                            data-product-id="${escapeHTML(
                                product.id
                            )}"
                            ${isOut ? "disabled" : ""}>

                            <i class="bi bi-cart-plus"></i>

                            ${
                                isOut
                                    ? "Unavailable"
                                    : "Add to Cart"
                            }

                        </button>

                    </div>

                </div>

            </article>

        `;

    }


    /* =====================================================
       PRODUCT BUTTON EVENTS
    ===================================================== */

    function bindProductButtons() {

        document
            .querySelectorAll(
                ".add-cart-btn"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            const productId =
                                button.dataset.productId;


                            const product =
                                state.products.find(
                                    item =>
                                        item.id ===
                                        productId
                                );


                            if (!product) {

                                showToast(
                                    "Product not found.",
                                    "error"
                                );

                                return;

                            }


                            addProductToCart(
                                product
                            );

                        }
                    );

                }
            );

    }


    /* =====================================================
       ADD TO CART
    ===================================================== */

    function addProductToCart(
        product
    ) {

        try {

            /*
             * First try the existing common.js
             * function if available.
             */

            if (
                window.MXB &&
                typeof MXB.addToCart ===
                "function"
            ) {

                MXB.addToCart(
                    product
                );


                updateCartCount();


                showToast(
                    `${product.name} added to cart.`,
                    "success"
                );


                return;

            }


            /*
             * Local fallback.
             */

            let cart;


            try {

                cart =
                    JSON.parse(
                        localStorage.getItem(
                            "mxb_cart"
                        ) || "[]"
                    );

            } catch {

                cart = [];

            }


            if (!Array.isArray(cart)) {
                cart = [];
            }


            const existing =
                cart.find(
                    item =>
                        item.product_id ===
                        product.id ||
                        item.id ===
                        product.id
                );


            if (existing) {

                existing.quantity =
                    Number(
                        existing.quantity || 1
                    ) + 1;

            } else {

                cart.push({

                    product_id:
                        product.id,

                    id:
                        product.id,

                    product_code:
                        product.product_code,

                    name:
                        product.name,

                    price:
                        getPrice(product),

                    quantity:
                        1,

                    image_url:
                        product.image_url || ""

                });

            }


            localStorage.setItem(
                "mxb_cart",
                JSON.stringify(cart)
            );


            updateCartCount();


            showToast(
                `${product.name} added to cart.`,
                "success"
            );


        } catch (error) {

            console.error(
                "Add to cart error:",
                error
            );


            showToast(
                "Unable to add product to cart.",
                "error"
            );

        }

    }


    /* =====================================================
       CART COUNT
    ===================================================== */

    function updateCartCount() {

        if (!elements.cartCount) {
            return;
        }


        try {

            /*
             * Use common.js if available.
             */

            if (
                window.MXB &&
                typeof MXB.updateCartCount ===
                "function"
            ) {

                MXB.updateCartCount();

                return;

            }


            /*
             * Fallback.
             */

            const cart =
                JSON.parse(
                    localStorage.getItem(
                        "mxb_cart"
                    ) || "[]"
                );


            const count =
                Array.isArray(cart)
                    ? cart.reduce(
                        (
                            total,
                            item
                        ) =>
                            total +
                            Number(
                                item.quantity || 1
                            ),
                        0
                    )
                    : 0;


            elements.cartCount.textContent =
                count;


        } catch {

            elements.cartCount.textContent =
                "0";

        }

    }


    /* =====================================================
       ACTIVE FILTERS
    ===================================================== */

    function renderActiveFilters() {

        if (!elements.activeFilters) {
            return;
        }


        const filters = [];


        /*
         * Search.
         */

        if (state.search) {

            filters.push(`

                <span class="active-filter">

                    Search:
                    ${escapeHTML(
                        state.search
                    )}

                    <button
                        type="button"
                        data-filter="search"
                        aria-label="Remove search">

                        <i class="bi bi-x"></i>

                    </button>

                </span>

            `);

        }


        /*
         * Category.
         */

        if (state.category) {

            const category =
                state.categories.find(
                    item =>
                        item.id ===
                        state.category
                );


            if (category) {

                filters.push(`

                    <span class="active-filter">

                        ${escapeHTML(
                            category.name
                        )}

                        <button
                            type="button"
                            data-filter="category">

                            <i class="bi bi-x"></i>

                        </button>

                    </span>

                `);

            }

        }


        /*
         * Stock.
         */

        if (state.inStockOnly) {

            filters.push(`

                <span class="active-filter">

                    In Stock

                    <button
                        type="button"
                        data-filter="stock">

                        <i class="bi bi-x"></i>

                    </button>

                </span>

            `);

        }


        /*
         * Featured.
         */

        if (state.featuredOnly) {

            filters.push(`

                <span class="active-filter">

                    Featured

                    <button
                        type="button"
                        data-filter="featured">

                        <i class="bi bi-x"></i>

                    </button>

                </span>

            `);

        }


        if (!filters.length) {

            elements.activeFilters
                .classList.add(
                    "hidden"
                );

            elements.activeFilters.innerHTML =
                "";

            return;

        }


        elements.activeFilters
            .classList.remove(
                "hidden"
            );


        elements.activeFilters.innerHTML =
            filters.join("");


        elements.activeFilters
            .querySelectorAll(
                "button[data-filter]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            const filter =
                                button.dataset.filter;


                            if (
                                filter ===
                                "search"
                            ) {

                                state.search =
                                    "";

                                if (
                                    elements.productSearch
                                ) {

                                    elements.productSearch
                                        .value = "";

                                }


                                if (
                                    elements.headerSearch
                                ) {

                                    elements.headerSearch
                                        .value = "";

                                }

                            }


                            if (
                                filter ===
                                "category"
                            ) {

                                state.category =
                                    "";

                                updateCategoryUI();

                            }


                            if (
                                filter ===
                                "stock"
                            ) {

                                state.inStockOnly =
                                    false;


                                if (
                                    elements.inStockOnly
                                ) {

                                    elements.inStockOnly
                                        .checked = false;

                                }

                            }


                            if (
                                filter ===
                                "featured"
                            ) {

                                state.featuredOnly =
                                    false;


                                if (
                                    elements.featuredOnly
                                ) {

                                    elements.featuredOnly
                                        .checked = false;

                                }

                            }


                            applyFilters();

                            updateURL();

                        }
                    );

                }
            );

    }


    /* =====================================================
       UPDATE CATEGORY UI
    ===================================================== */

    function updateCategoryUI() {

        if (!elements.categoryList) {
            return;
        }


        elements.categoryList
            .querySelectorAll(
                ".category-filter-item"
            )
            .forEach(
                item => {

                    const category =
                        item.dataset.category ||
                        "";


                    item.classList.toggle(
                        "active",
                        category ===
                        state.category
                    );

                }
            );

    }


    /* =====================================================
       CLEAR ALL FILTERS
    ===================================================== */

    function clearAllFilters() {

        state.search =
            "";

        state.category =
            "";

        state.sort =
            "default";

        state.inStockOnly =
            false;

        state.featuredOnly =
            false;


        if (elements.productSearch) {
            elements.productSearch.value =
                "";
        }


        if (elements.headerSearch) {
            elements.headerSearch.value =
                "";
        }


        if (elements.sortProducts) {
            elements.sortProducts.value =
                "default";
        }


        if (elements.inStockOnly) {
            elements.inStockOnly.checked =
                false;
        }


        if (elements.featuredOnly) {
            elements.featuredOnly.checked =
                false;
        }


        updateCategoryUI();

        applyFilters();

        updateURL();


        /*
         * Close mobile sidebar.
         */

        if (elements.productsSidebar) {

            elements.productsSidebar
                .classList.remove(
                    "mobile-open"
                );

        }

    }


    /* =====================================================
       UPDATE URL
    ===================================================== */

    function updateURL() {

        const params =
            new URLSearchParams();


        if (state.search) {

            params.set(
                "search",
                state.search
            );

        }


        if (state.category) {

            params.set(
                "category",
                state.category
            );

        } else if (
            state.featuredOnly
        ) {

            params.set(
                "category",
                "featured"
            );

        }


        if (
            state.sort &&
            state.sort !== "default"
        ) {

            params.set(
                "sort",
                state.sort
            );

        }


        const query =
            params.toString();


        const newURL =
            query
                ? `${window.location.pathname}?${query}`
                : window.location.pathname;


        window.history.replaceState(
            {},
            "",
            newURL
        );

    }


    /* =====================================================
       PRICE
    ===================================================== */

    function getPrice(
        product
    ) {

        const sellingPrice =
            Number(
                product.selling_price
            );


        const discountPrice =
            Number(
                product.discount_price
            );


        /*
         * Use discount price only when
         * it is valid and lower than selling price.
         */

        if (
            Number.isFinite(
                discountPrice
            ) &&
            discountPrice > 0 &&
            Number.isFinite(
                sellingPrice
            ) &&
            discountPrice <
            sellingPrice
        ) {

            return discountPrice;

        }


        return Number.isFinite(
            sellingPrice
        )
            ? sellingPrice
            : 0;

    }


    /* =====================================================
       OLD PRICE
    ===================================================== */

    function getOldPrice(
        product
    ) {

        const sellingPrice =
            Number(
                product.selling_price
            );


        const discountPrice =
            Number(
                product.discount_price
            );


        if (
            Number.isFinite(
                sellingPrice
            ) &&
            Number.isFinite(
                discountPrice
            ) &&
            discountPrice > 0 &&
            discountPrice <
            sellingPrice
        ) {

            return sellingPrice;

        }


        return 0;

    }


    /* =====================================================
       DISCOUNT
    ===================================================== */

    function calculateDiscount(
        oldPrice,
        currentPrice
    ) {

        if (
            oldPrice <= 0 ||
            currentPrice <= 0 ||
            currentPrice >= oldPrice
        ) {

            return 0;

        }


        return Math.round(
            (
                (
                    oldPrice -
                    currentPrice
                ) /
                oldPrice
            ) *
            100
        );

    }


    /* =====================================================
       CATEGORY NAME
    ===================================================== */

    function getCategoryName(
        categoryId
    ) {

        const category =
            state.categories.find(
                item =>
                    item.id ===
                    categoryId
            );


        return category
            ? category.name
            : "General";

    }


    /* =====================================================
       PRODUCT IMAGE
    ===================================================== */

    function getProductImage(
        product
    ) {

        /*
         * image_url first.
         */

        if (
            product.image_url &&
            String(
                product.image_url
            ).trim()
        ) {

            return String(
                product.image_url
            ).trim();

        }


        /*
         * Gallery fallback.
         */

        if (
            Array.isArray(
                product.gallery
            ) &&
            product.gallery.length
        ) {

            const first =
                product.gallery[0];


            if (
                typeof first ===
                "string"
            ) {

                return first;

            }


            if (
                first &&
                typeof first ===
                "object"
            ) {

                return (
                    first.url ||
                    first.image_url ||
                    "assets/images/product-placeholder.svg"
                );

            }

        }


        /*
         * JSON gallery fallback.
         */

        if (
            typeof product.gallery ===
            "string"
        ) {

            try {

                const gallery =
                    JSON.parse(
                        product.gallery
                    );


                if (
                    Array.isArray(
                        gallery
                    ) &&
                    gallery.length
                ) {

                    const first =
                        gallery[0];


                    if (
                        typeof first ===
                        "string"
                    ) {

                        return first;

                    }


                    if (
                        first &&
                        typeof first ===
                        "object"
                    ) {

                        return (
                            first.url ||
                            first.image_url ||
                            "assets/images/product-placeholder.svg"
                        );

                    }

                }

            } catch {

                /*
                 * Ignore invalid gallery JSON.
                 */

            }

        }


        return "assets/images/product-placeholder.svg";

    }


    /* =====================================================
       MONEY
    ===================================================== */

    function formatMoney(
        amount
    ) {

        /*
         * Use existing common.js formatter.
         */

        if (
            window.MXB &&
            typeof MXB.money ===
            "function"
        ) {

            return MXB.money(
                Number(
                    amount || 0
                )
            );

        }


        return new Intl.NumberFormat(
            "en-BD",
            {
                style: "currency",
                currency: "BDT",
                maximumFractionDigits: 0
            }
        ).format(
            Number(
                amount || 0
            )
        );

    }


    /* =====================================================
       DATE VALUE
    ===================================================== */

    function getDateValue(
        value
    ) {

        if (!value) {
            return 0;
        }


        const date =
            new Date(value);


        const time =
            date.getTime();


        return Number.isNaN(time)
            ? 0
            : time;

    }


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

    function escapeHTML(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        return String(value)
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


    /* =====================================================
       DEBOUNCE
    ===================================================== */

    function debounce(
        callback,
        delay
    ) {

        let timer;


        return (...args) => {

            clearTimeout(
                timer
            );


            timer =
                setTimeout(
                    () => {
                        callback(
                            ...args
                        );
                    },
                    delay
                );

        };

    }


    /* =====================================================
       LOADING STATE
    ===================================================== */

    function showLoading() {

        if (elements.loading) {

            elements.loading
                .classList.remove(
                    "hidden"
                );

        }


        if (elements.empty) {

            elements.empty
                .classList.add(
                    "hidden"
                );

        }


        if (elements.error) {

            elements.error
                .classList.add(
                    "hidden"
                );

        }

    }


    function hideLoading() {

        if (elements.loading) {

            elements.loading
                .classList.add(
                    "hidden"
                );

        }

    }


    /* =====================================================
       EMPTY STATE
    ===================================================== */

    function showEmpty() {

        if (elements.empty) {

            elements.empty
                .classList.remove(
                    "hidden"
                );

        }

    }


    function hideEmpty() {

        if (elements.empty) {

            elements.empty
                .classList.add(
                    "hidden"
                );

        }

    }


    /* =====================================================
       ERROR STATE
    ===================================================== */

    function showError(
        message
    ) {

        hideLoading();

        hideEmpty();


        if (elements.errorMessage) {

            elements.errorMessage.textContent =
                message;

        }


        if (elements.error) {

            elements.error
                .classList.remove(
                    "hidden"
                );

        }

    }


    function hideError() {

        if (elements.error) {

            elements.error
                .classList.add(
                    "hidden"
                );

        }

    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(
        message,
        type = "success"
    ) {

        /*
         * Use existing common.js toast if available.
         */

        if (
            window.MXB &&
            typeof MXB.toast ===
            "function"
        ) {

            MXB.toast(
                message,
                type
            );

            return;

        }


        /*
         * Fallback toast.
         */

        let toast =
            document.getElementById(
                "mxbProductsToast"
            );


        if (!toast) {

            toast =
                document.createElement(
                    "div"
                );


            toast.id =
                "mxbProductsToast";


            toast.style.cssText = `
                position:fixed;
                right:20px;
                bottom:20px;
                z-index:99999;
                background:#172033;
                color:#fff;
                padding:12px 18px;
                border-radius:10px;
                font-size:13px;
                font-weight:600;
                box-shadow:0 10px 30px rgba(0,0,0,.18);
                transition:opacity .25s ease;
            `;


            document.body.appendChild(
                toast
            );

        }


        toast.textContent =
            message;


        toast.style.opacity =
            "1";


        clearTimeout(
            toast._timer
        );


        toast._timer =
            setTimeout(
                () => {

                    toast.style.opacity =
                        "0";

                },
                2500
            );

    }


    /* =====================================================
       FOOTER YEAR
    ===================================================== */

    function setFooterYear() {

        if (elements.footerYear) {

            elements.footerYear.textContent =
                new Date()
                    .getFullYear();

        }

    }

})();
