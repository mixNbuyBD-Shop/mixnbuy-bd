/* =========================================================
   MIXNBUY.BD — CART PAGE
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const $ = id => document.getElementById(id);

    const CART_KEY = "mxb_cart";

    let cart = [];
    let deliveryCharge = 120;
    let freeDeliveryMinimum = 2000;


    /* =========================================
       HELPERS
    ========================================= */

    function money(value) {
        const amount = Number(value || 0);

        if (window.MXB?.money) {
            return MXB.money(amount);
        }

        return `BDT ${amount.toLocaleString("en-BD", {
            maximumFractionDigits: 2
        })}`;
    }


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


    function imageFor(item) {

        if (window.MXB?.productImage) {
            return MXB.productImage(item);
        }

        if (item?.image_url) {
            return item.image_url;
        }

        if (Array.isArray(item?.gallery) && item.gallery.length) {

            const first = item.gallery[0];

            if (typeof first === "string") {
                return first;
            }

            if (first?.url) {
                return first.url;
            }

            if (first?.image_url) {
                return first.image_url;
            }
        }

        return "assets/images/product-placeholder.svg";
    }


    function showToast(message) {

        if (window.MXB?.toast) {
            MXB.toast(message);
            return;
        }

        const old = document.querySelector(".cart-toast");
        old?.remove();

        const toast = document.createElement("div");
        toast.className = "cart-toast";
        toast.textContent = message;

        Object.assign(toast.style, {
            position: "fixed",
            left: "50%",
            bottom: "25px",
            transform: "translateX(-50%)",
            zIndex: "9999",
            padding: "12px 18px",
            borderRadius: "10px",
            background: "#172033",
            color: "#fff",
            fontSize: "12px",
            fontWeight: "700",
            boxShadow: "0 10px 30px rgba(0,0,0,.18)"
        });

        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 2400);
    }


    function readCart() {

        try {
            const raw = localStorage.getItem(CART_KEY);
            const parsed = JSON.parse(raw || "[]");

            return Array.isArray(parsed)
                ? parsed
                : [];
        } catch {
            return [];
        }
    }


    function saveCart() {
        localStorage.setItem(
            CART_KEY,
            JSON.stringify(cart)
        );

        updateHeaderCartCount();
    }


    function updateHeaderCartCount() {

        const count = cart.reduce(
            (sum, item) =>
                sum + Math.max(0, Number(item.quantity || 0)),
            0
        );

        document
            .querySelectorAll("[data-cart-count]")
            .forEach(el => {
                el.textContent = count;
            });
    }


    function getUnitPrice(item) {

        const selling = Number(
            item?.selling_price ??
            item?.price ??
            0
        );

        const discount = Number(
            item?.discount_price
        );

        if (
            item?.discount_price !== null &&
            item?.discount_price !== undefined &&
            Number.isFinite(discount) &&
            discount > 0 &&
            discount < selling
        ) {
            return discount;
        }

        return selling;
    }


    function getRegularPrice(item) {

        return Number(
            item?.selling_price ??
            item?.price ??
            0
        );
    }


    function getStock(item) {

        const stock = Number(
            item?.current_stock
        );

        if (!Number.isFinite(stock)) {
            return Infinity;
        }

        return Math.max(0, stock);
    }


    function itemQuantity(item) {

        return Math.max(
            1,
            Number(item.quantity || 1)
        );
    }


    function normalizeCart() {

        cart = cart
            .filter(item => item && item.id)
            .map(item => ({
                ...item,
                quantity: itemQuantity(item)
            }));

        /*
         * If stock information exists and is zero,
         * keep the item visible so the customer can
         * remove it. Quantities are capped below.
         */
        cart.forEach(item => {

            const stock = getStock(item);

            if (Number.isFinite(stock) && stock > 0) {
                item.quantity =
                    Math.min(item.quantity, stock);
            }
        });
    }


    /* =========================================
       SETTINGS
    ========================================= */

    async function loadSettings() {

        if (!window.supabaseClient) {
            return;
        }

        try {

            const { data, error } =
                await window.supabaseClient
                    .from("settings")
                    .select("key,value");

            if (error || !Array.isArray(data)) {
                return;
            }

            const settings = {};

            data.forEach(row => {
                if (row?.key) {
                    settings[row.key] = row.value;
                }
            });

            const charge = Number(
                settings.DeliveryCharge ??
                settings.delivery_charge
            );

            const free = Number(
                settings.FreeDelivery ??
                settings.free_delivery
            );

            if (Number.isFinite(charge) && charge >= 0) {
                deliveryCharge = charge;
            }

            if (Number.isFinite(free) && free > 0) {
                freeDeliveryMinimum = free;
            }

        } catch {
            /* Keep safe defaults. */
        }
    }


    /* =========================================
       CALCULATIONS
    ========================================= */

    function getSubtotal() {

        return cart.reduce(
            (sum, item) =>
                sum +
                getUnitPrice(item) *
                itemQuantity(item),
            0
        );
    }


    function getDelivery(subtotal) {

        if (subtotal <= 0) {
            return 0;
        }

        return subtotal >= freeDeliveryMinimum
            ? 0
            : deliveryCharge;
    }


    function getTotals() {

        const subtotal = getSubtotal();
        const delivery = getDelivery(subtotal);

        return {
            subtotal,
            delivery,
            total: subtotal + delivery
        };
    }


    /* =========================================
       RENDER
    ========================================= */

    function renderCart() {

        const loading = $("cartLoading");
        const empty = $("cartEmpty");
        const content = $("cartContent");

        loading?.classList.add("hidden");

        updateHeaderCartCount();

        const itemCount = cart.reduce(
            (sum, item) =>
                sum + itemQuantity(item),
            0
        );

        $("cartItemSummary").textContent =
            `${itemCount} ${itemCount === 1 ? "item" : "items"}`;

        $("cartHeaderCount").textContent =
            `${itemCount} ${itemCount === 1 ? "item" : "items"}`;

        if (!cart.length) {

            content?.classList.add("hidden");
            empty?.classList.remove("hidden");

            return;
        }

        empty?.classList.add("hidden");
        content?.classList.remove("hidden");

        renderItems();
        renderSummary();
    }


    function renderItems() {

        const container = $("cartItems");

        if (!container) return;

        container.innerHTML = cart
            .map((item, index) => {

                const unitPrice = getUnitPrice(item);
                const regularPrice = getRegularPrice(item);
                const qty = itemQuantity(item);
                const total = unitPrice * qty;

                const stock = getStock(item);
                const max =
                    Number.isFinite(stock) && stock > 0
                        ? stock
                        : 9999;

                const hasDiscount =
                    regularPrice > unitPrice;

                const image = imageFor(item);

                return `
                    <article
                        class="cart-item"
                        data-index="${index}">

                        <a
                            class="cart-item-image"
                            href="product.html?id=${encodeURIComponent(item.id)}">

                            <img
                                src="${escapeHtml(image)}"
                                alt="${escapeHtml(item.name || "Product")}"
                                loading="lazy"
                                onerror="this.src='assets/images/product-placeholder.svg';"
                            >

                        </a>


                        <div class="cart-item-info">

                            <span class="cart-item-brand">
                                ${escapeHtml(item.brand || "MIXNBUY")}
                            </span>

                            <h3 class="cart-item-name">

                                <a
                                    href="product.html?id=${encodeURIComponent(item.id)}">

                                    ${escapeHtml(item.name || "Product")}

                                </a>

                            </h3>

                            ${
                                item.product_code
                                ?
                                `<div class="cart-item-code">
                                    Code: ${escapeHtml(item.product_code)}
                                </div>`
                                :
                                ""
                            }

                            <div class="cart-item-price">

                                <strong>
                                    ${money(unitPrice)}
                                </strong>

                                ${
                                    hasDiscount
                                    ?
                                    `<del>${money(regularPrice)}</del>`
                                    :
                                    ""
                                }

                            </div>

                        </div>


                        <div class="cart-item-controls">

                            <div class="quantity-control">

                                <button
                                    type="button"
                                    data-action="decrease"
                                    aria-label="Decrease quantity">
                                    <i class="bi bi-dash"></i>
                                </button>

                                <input
                                    type="number"
                                    min="1"
                                    max="${max}"
                                    value="${qty}"
                                    data-action="input"
                                    aria-label="Quantity"
                                >

                                <button
                                    type="button"
                                    data-action="increase"
                                    aria-label="Increase quantity">
                                    <i class="bi bi-plus"></i>
                                </button>

                            </div>


                            <div class="item-total">

                                <strong>
                                    ${money(total)}
                                </strong>

                                <button
                                    type="button"
                                    class="remove-item"
                                    data-action="remove">
                                    <i class="bi bi-trash3"></i>
                                    Remove
                                </button>

                            </div>

                        </div>

                    </article>
                `;
            })
            .join("");
    }


    function renderSummary() {

        const {
            subtotal,
            delivery,
            total
        } = getTotals();

        $("subtotalValue").textContent =
            money(subtotal);

        $("deliveryValue").textContent =
            delivery === 0 && subtotal > 0
                ? "FREE"
                : money(delivery);

        $("grandTotalValue").textContent =
            money(total);


        const freeNote =
            $("freeDeliveryNote");

        if (subtotal >= freeDeliveryMinimum && subtotal > 0) {
            freeNote?.classList.remove("hidden");
        } else {
            freeNote?.classList.add("hidden");
        }


        renderDeliveryProgress(subtotal);
    }


    function renderDeliveryProgress(subtotal) {

        const title = $("progressTitle");
        const text = $("progressText");
        const bar = $("progressBar");

        if (!title || !text || !bar) return;

        if (subtotal <= 0) {

            title.textContent =
                `Free delivery above ${money(freeDeliveryMinimum)}`;

            text.textContent =
                "Add products to start your order.";

            bar.style.width = "0%";

            return;
        }


        if (subtotal >= freeDeliveryMinimum) {

            title.textContent =
                "You've unlocked free delivery!";

            text.textContent =
                "Great! Your delivery charge is now free.";

            bar.style.width = "100%";

            return;
        }


        const remaining =
            freeDeliveryMinimum - subtotal;

        const percentage =
            Math.min(
                100,
                Math.max(
                    0,
                    (subtotal / freeDeliveryMinimum) * 100
                )
            );

        title.textContent =
            `Add ${money(remaining)} more`;

        text.textContent =
            `to qualify for free delivery.`;

        bar.style.width =
            `${percentage}%`;
    }


    /* =========================================
       CART EVENTS
    ========================================= */

    $("cartItems")?.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest("[data-action]");

            if (!button) return;

            const itemEl =
                button.closest(".cart-item");

            if (!itemEl) return;

            const index =
                Number(itemEl.dataset.index);

            const item = cart[index];

            if (!item) return;

            const action =
                button.dataset.action;

            if (action === "increase") {

                const stock = getStock(item);

                if (
                    Number.isFinite(stock) &&
                    stock > 0 &&
                    item.quantity >= stock
                ) {
                    showToast("Maximum available stock reached.");
                    return;
                }

                item.quantity =
                    itemQuantity(item) + 1;

            } else if (action === "decrease") {

                item.quantity =
                    itemQuantity(item) - 1;

                if (item.quantity <= 0) {
                    cart.splice(index, 1);
                }

            } else if (action === "remove") {

                cart.splice(index, 1);

                showToast("Product removed from cart.");
            }

            normalizeCart();
            saveCart();
            renderCart();
        }
    );


    $("cartItems")?.addEventListener(
        "change",
        event => {

            const input =
                event.target.closest(
                    'input[data-action="input"]'
                );

            if (!input) return;

            const itemEl =
                input.closest(".cart-item");

            const index =
                Number(itemEl?.dataset.index);

            const item = cart[index];

            if (!item) return;

            let qty =
                Number(input.value);

            if (!Number.isFinite(qty) || qty < 1) {
                qty = 1;
            }

            const stock = getStock(item);

            if (Number.isFinite(stock) && stock > 0) {
                qty = Math.min(qty, stock);
            }

            item.quantity = qty;

            saveCart();
            renderCart();
        }
    );


    $("clearCartBtn")?.addEventListener(
        "click",
        () => {

            if (!cart.length) return;

            const confirmed =
                window.confirm(
                    "Remove all items from your cart?"
                );

            if (!confirmed) return;

            cart = [];

            saveCart();
            renderCart();

            showToast("Cart cleared.");
        }
    );


    /* =========================================
       COUPON
    ========================================= */

    $("couponToggle")?.addEventListener(
        "click",
        () => {

            const panel =
                $("couponPanel");

            const toggle =
                $("couponToggle");

            if (!panel || !toggle) return;

            const isHidden =
                panel.classList.contains("hidden");

            panel.classList.toggle(
                "hidden",
                !isHidden
            );

            toggle.setAttribute(
                "aria-expanded",
                String(isHidden)
            );

            const icon =
                toggle.querySelector(
                    ":scope > i"
                );

            if (icon) {
                icon.className =
                    isHidden
                        ? "bi bi-chevron-up"
                        : "bi bi-chevron-down";
            }
        }
    );


    function restoreCoupon() {

        const code =
            sessionStorage.getItem(
                "mxb_coupon_code"
            );

        if (code && $("couponCode")) {

            $("couponCode").value = code;

            $("couponMessage").textContent =
                "Coupon saved for checkout verification.";

            $("couponMessage").classList.add("success");
        }
    }


    $("saveCouponBtn")?.addEventListener(
        "click",
        () => {

            const input =
                $("couponCode");

            const message =
                $("couponMessage");

            const code =
                input?.value.trim().toUpperCase();

            if (!code) {

                message.textContent =
                    "Please enter a coupon code.";

                message.className = "error";

                return;
            }

            sessionStorage.setItem(
                "mxb_coupon_code",
                code
            );

            message.textContent =
                "Coupon saved. Final discount will be verified at checkout.";

            message.className = "success";

            showToast("Coupon saved.");
        }
    );


    /* =========================================
       CHECKOUT
    ========================================= */

    $("checkoutBtn")?.addEventListener(
        "click",
        () => {

            if (!cart.length) {
                showToast("Your cart is empty.");
                return;
            }

            /*
             * Checkout is responsible for the final
             * server-side price, stock and coupon validation.
             */
            window.location.href =
                "checkout.html";
        }
    );


    /* =========================================
       HEADER SEARCH
    ========================================= */

    $("searchForm")?.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            const keyword =
                $("globalSearch")?.value.trim();

            if (keyword) {

                window.location.href =
                    `products.html?search=${encodeURIComponent(keyword)}`;
            }
        }
    );


    /* =========================================
       MOBILE MENU
    ========================================= */

    const mobileBtn =
        $("mobileMenuBtn");

    const mainNav =
        $("mainNav");

    mobileBtn?.addEventListener(
        "click",
        () => {

            mainNav?.classList.toggle("open");

            if (mainNav?.classList.contains("open")) {

                mobileBtn.innerHTML =
                    '<i class="bi bi-x-lg"></i>';

            } else {

                mobileBtn.innerHTML =
                    '<i class="bi bi-list"></i>';
            }
        }
    );


    /* =========================================
       INIT
    ========================================= */

    async function init() {

        cart = readCart();

        normalizeCart();

        await loadSettings();

        renderCart();

        restoreCoupon();
    }

    init();

});
