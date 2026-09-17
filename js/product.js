/* =========================================================
   MIXNBUY.BD — PRODUCT DETAILS
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    const $ = id => document.getElementById(id);

    const loading = $("productLoading");
    const errorBox = $("productError");
    const errorText = $("productErrorText");
    const details = $("productDetails");
    const extra = $("productExtra");

    let product = null;
    let maxStock = 0;
    let currentImage = "";


    /* =========================================
       HELPERS
    ========================================= */

    function escapeHtml(value) {
        if (window.MXB?.escape) {
            return MXB.escape(String(value ?? ""));
        }

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    function money(value) {
        if (window.MXB?.money) {
            return MXB.money(Number(value || 0));
        }

        return `BDT ${Number(value || 0).toLocaleString("en-BD")}`;
    }


    function imageFor(item) {
        if (window.MXB?.productImage) {
            return MXB.productImage(item);
        }

        if (item?.image_url) return item.image_url;

        if (Array.isArray(item?.gallery) && item.gallery.length) {
            const first = item.gallery[0];

            if (typeof first === "string") return first;
            if (first?.url) return first.url;
        }

        return "assets/images/product-placeholder.svg";
    }


    function showToast(message) {

        if (window.MXB?.toast) {
            MXB.toast(message);
            return;
        }

        const old = document.querySelector(".product-toast");
        old?.remove();

        const toast = document.createElement("div");
        toast.className = "product-toast";
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 2500);
    }


    function getProductId() {
        const params = new URLSearchParams(window.location.search);
        return params.get("id");
    }


    function getGalleryImages(item) {

        const images = [];

        const main = imageFor(item);

        if (main && main !== "assets/images/product-placeholder.svg") {
            images.push(main);
        }

        if (Array.isArray(item.gallery)) {

            item.gallery.forEach(entry => {

                let url = "";

                if (typeof entry === "string") {
                    url = entry;
                } else if (entry && typeof entry === "object") {
                    url = entry.url || entry.image_url || "";
                }

                if (url && !images.includes(url)) {
                    images.push(url);
                }
            });
        }

        return images.length
            ? images
            : ["assets/images/product-placeholder.svg"];
    }


    function setMainImage(url) {

        currentImage = url;

        $("mainProductImage").src = url;
        $("mainProductImage").alt = product?.name || "Product";

        document
            .querySelectorAll(".product-thumbnail")
            .forEach(button => {
                button.classList.toggle(
                    "active",
                    button.dataset.image === url
                );
            });
    }


    function updateQuantity(value) {

        let qty = Number(value);

        if (!Number.isFinite(qty) || qty < 1) {
            qty = 1;
        }

        if (maxStock > 0) {
            qty = Math.min(qty, maxStock);
        }

        $("quantity").value = qty;
    }


    /* =========================================
       HEADER SEARCH
    ========================================= */

    $("searchForm")?.addEventListener("submit", event => {

        event.preventDefault();

        const keyword =
            $("globalSearch")?.value.trim();

        if (keyword) {
            window.location.href =
                `products.html?search=${encodeURIComponent(keyword)}`;
        }
    });


    /* =========================================
       MOBILE MENU
    ========================================= */

    const mobileBtn = $("mobileMenuBtn");
    const mainNav = $("mainNav");

    mobileBtn?.addEventListener("click", () => {

        mainNav?.classList.toggle("open");

        if (mainNav?.classList.contains("open")) {
            mobileBtn.innerHTML =
                '<i class="bi bi-x-lg"></i>';
        } else {
            mobileBtn.innerHTML =
                '<i class="bi bi-list"></i>';
        }
    });


    /* =========================================
       LOAD PRODUCT
    ========================================= */

    const productId = getProductId();

    if (!productId) {
        loading.classList.add("hidden");
        errorText.textContent =
            "No product was selected.";

        errorBox.classList.remove("hidden");
        return;
    }


    try {

        if (!window.supabaseClient) {
            throw new Error(
                "Supabase client is not initialized."
            );
        }


        const { data, error } =
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
                .eq("id", productId)
                .eq("is_active", true)
                .maybeSingle();


        if (error) {
            throw error;
        }


        if (!data) {
            throw new Error(
                "This product is not available."
            );
        }


        product = data;
        maxStock = Math.max(
            0,
            Number(product.current_stock || 0)
        );


        /* =====================================
           CATEGORY
        ===================================== */

        let categoryName = "MIXNBUY";

        if (product.category_id) {

            const categoryResult =
                await window.supabaseClient
                    .from("categories")
                    .select("id,name")
                    .eq("id", product.category_id)
                    .maybeSingle();

            if (
                !categoryResult.error &&
                categoryResult.data?.name
            ) {
                categoryName =
                    categoryResult.data.name;
            }
        }


        renderProduct(categoryName);

        loading.classList.add("hidden");
        details.classList.remove("hidden");
        extra.classList.remove("hidden");


    } catch (err) {

        console.error("Product Details:", err);

        loading.classList.add("hidden");

        errorText.textContent =
            err?.message ||
            "Unable to load this product.";

        errorBox.classList.remove("hidden");
    }


    /* =========================================
       RENDER
    ========================================= */

    function renderProduct(categoryName) {

        const regularPrice =
            Number(product.selling_price || 0);

        const salePrice =
            Number(
                product.discount_price ??
                product.selling_price ??
                0
            );

        const hasDiscount =
            product.discount_price !== null &&
            product.discount_price !== undefined &&
            salePrice < regularPrice;

        const description =
            product.description?.trim() ||
            "No additional description is available for this product.";

        const brand =
            product.brand?.trim() ||
            "MIXNBUY";


        $("breadcrumbProduct").textContent =
            product.name;

        $("productCategory").textContent =
            categoryName;

        $("productName").textContent =
            product.name;

        $("productCode").textContent =
            `Product Code: ${product.product_code || "—"}`;

        $("productBrand").textContent =
            `Brand: ${brand}`;

        $("productPrice").textContent =
            money(salePrice);

        $("productOldPrice").textContent =
            money(regularPrice);

        $("productDescription").textContent =
            description;

        $("longDescription").textContent =
            description;


        /* Discount */

        if (hasDiscount) {

            $("saleBadge").classList.remove("hidden");

            $("productOldPrice")
                .classList.remove("hidden");

            const discount =
                Math.round(
                    ((regularPrice - salePrice) /
                        regularPrice) *
                    100
                );

            $("discountPercent").textContent =
                `${discount}% OFF`;

            $("discountPercent")
                .classList.remove("hidden");

        } else {

            $("saleBadge")
                .classList.add("hidden");

            $("productOldPrice")
                .classList.add("hidden");

            $("discountPercent")
                .classList.add("hidden");
        }


        /* Featured */

        if (product.is_featured) {
            $("featuredBadge")
                .classList.remove("hidden");
        }


        /* Stock */

        if (maxStock > 0) {

            $("stockText").textContent =
                maxStock <= 5
                    ? `Only ${maxStock} left in stock`
                    : "In Stock";

            $("stockSubtext").textContent =
                "Ready to order";

        } else {

            $("stockText").textContent =
                "Out of Stock";

            $("stockSubtext").textContent =
                "Currently unavailable";

            $("stockIcon").innerHTML =
                '<i class="bi bi-x-circle-fill"></i>';

            $("stockBox")?.classList.add("out");

            $("addToCartBtn").disabled = true;
            $("buyNowBtn").disabled = true;
            $("qtyMinus").disabled = true;
            $("qtyPlus").disabled = true;
            $("quantity").disabled = true;
        }


        /* Images */

        const images =
            getGalleryImages(product);

        const thumbnails =
            $("productThumbnails");

        thumbnails.innerHTML =
            images.map((url, index) => `
                <button
                    type="button"
                    class="product-thumbnail ${index === 0 ? "active" : ""}"
                    data-image="${escapeHtml(url)}"
                    aria-label="View image ${index + 1}"
                >
                    <img
                        src="${escapeHtml(url)}"
                        alt="${escapeHtml(product.name)}"
                        onerror="this.src='assets/images/product-placeholder.svg';"
                    >
                </button>
            `).join("");


        thumbnails
            .querySelectorAll(".product-thumbnail")
            .forEach(button => {

                button.addEventListener("click", () => {
                    setMainImage(button.dataset.image);
                });

            });


        setMainImage(images[0]);


        /* Information */

        $("infoProductCode").textContent =
            product.product_code || "—";

        $("infoSku").textContent =
            product.sku || "—";

        $("infoBrand").textContent =
            brand;

        $("infoUnit").textContent =
            product.unit || "—";

        $("infoCategory").textContent =
            categoryName;


        /* Page title */

        document.title =
            `${product.name} | MIXNBUY.BD`;
    }


    /* =========================================
       QUANTITY
    ========================================= */

    $("qtyMinus")?.addEventListener("click", () => {

        const current =
            Number($("quantity").value || 1);

        updateQuantity(current - 1);
    });


    $("qtyPlus")?.addEventListener("click", () => {

        const current =
            Number($("quantity").value || 1);

        updateQuantity(current + 1);
    });


    $("quantity")?.addEventListener("input", event => {
        updateQuantity(event.target.value);
    });


    /* =========================================
       ADD TO CART
    ========================================= */

    $("addToCartBtn")?.addEventListener("click", () => {

        if (!product || maxStock <= 0) return;

        const quantity =
            Number($("quantity").value || 1);

        if (window.MXB?.addToCart) {

            MXB.addToCart(
                product,
                quantity
            );

            return;
        }


        /* Fallback cart */

        const key = "mxb_cart";

        let cart = [];

        try {
            cart =
                JSON.parse(
                    localStorage.getItem(key) || "[]"
                );
        } catch {
            cart = [];
        }

        const existing =
            cart.find(item =>
                item.id === product.id
            );

        if (existing) {
            existing.quantity =
                Math.min(
                    Number(existing.quantity || 0) +
                    quantity,
                    maxStock
                );
        } else {
            cart.push({
                ...product,
                quantity
            });
        }

        localStorage.setItem(
            key,
            JSON.stringify(cart)
        );

        showToast("Product added to cart.");
    });


    /* =========================================
       BUY NOW
    ========================================= */

    $("buyNowBtn")?.addEventListener("click", () => {

        if (!product || maxStock <= 0) return;

        const quantity =
            Number($("quantity").value || 1);


        if (window.MXB?.addToCart) {

            MXB.addToCart(
                product,
                quantity
            );

        } else {

            const key = "mxb_cart";

            localStorage.setItem(
                key,
                JSON.stringify([{
                    ...product,
                    quantity
                }])
            );
        }

        window.location.href =
            "checkout.html";
    });


    /* =========================================
       TABS
    ========================================= */

    document
        .querySelectorAll(".extra-tab")
        .forEach(tab => {

            tab.addEventListener("click", () => {

                const target =
                    tab.dataset.tab;

                document
                    .querySelectorAll(".extra-tab")
                    .forEach(item =>
                        item.classList.remove("active")
                    );

                document
                    .querySelectorAll(".extra-panel")
                    .forEach(panel =>
                        panel.classList.remove("active")
                    );

                tab.classList.add("active");

                const panel =
                    target === "description"
                        ? $("tabDescription")
                        : $("tabInformation");

                panel.classList.add("active");
            });

        });

});
