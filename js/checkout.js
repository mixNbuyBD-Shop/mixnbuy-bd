/* =========================================================
   MIXNBUY.BD — CHECKOUT
   Creates orders through the existing create-order
   Supabase Edge Function.
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const $ = id => document.getElementById(id);

    const CART_KEY = "mxb_cart";
    const COUPON_KEY = "mxb_coupon_code";

    const CREATE_ORDER_URL =
        "https://orecvjhywhauxmbcixhc.supabase.co/functions/v1/create-order";

    let cart = [];
    let deliveryCharge = 120;
    let freeDeliveryMinimum = 2000;
    let appliedCoupon = "";


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

            if (typeof first === "string") return first;
            if (first?.url) return first.url;
            if (first?.image_url) return first.image_url;
        }

        return "assets/images/product-placeholder.svg";
    }


    function readCart() {

        try {

            const parsed =
                JSON.parse(
                    localStorage.getItem(CART_KEY) || "[]"
                );

            return Array.isArray(parsed)
                ? parsed
                : [];

        } catch {
            return [];
        }
    }


    function updateCartCount() {

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


    function unitPrice(item) {

        const selling =
            Number(item?.selling_price ?? item?.price ?? 0);

        const discount =
            Number(item?.discount_price);

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


    function quantity(item) {
        return Math.max(1, Number(item?.quantity || 1));
    }


    function subtotal() {

        return cart.reduce(
            (sum, item) =>
                sum + unitPrice(item) * quantity(item),
            0
        );
    }


    function deliveryFor(amount) {

        if (amount <= 0) return 0;

        return amount >= freeDeliveryMinimum
            ? 0
            : deliveryCharge;
    }


    function totals() {

        const sub = subtotal();
        const delivery = deliveryFor(sub);

        /*
         * Coupon discount is intentionally not guessed on the
         * client. The backend validates the coupon and calculates
         * the final amount atomically when the order is created.
         */
        return {
            subtotal: sub,
            delivery,
            total: sub + delivery
        };
    }


    /* =========================================
       SETTINGS
    ========================================= */

    async function loadSettings() {

        if (!window.supabaseClient) return;

        try {

            const { data, error } =
                await window.supabaseClient
                    .from("settings")
                    .select("key,value");

            if (error || !Array.isArray(data)) return;

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
            /* safe defaults */
        }
    }


    /* =========================================
       RENDER
    ========================================= */

    function renderItems() {

        const box = $("checkoutItems");

        if (!box) return;

        box.innerHTML = cart.map(item => {

            const qty = quantity(item);
            const price = unitPrice(item);

            return `
                <div class="checkout-item">

                    <a
                        href="product.html?id=${encodeURIComponent(item.id)}"
                        class="checkout-item-image">

                        <img
                            src="${escapeHtml(imageFor(item))}"
                            alt="${escapeHtml(item.name || "Product")}"
                            onerror="this.src='assets/images/product-placeholder.svg';">

                    </a>

                    <div class="checkout-item-info">

                        <strong>
                            ${escapeHtml(item.name || "Product")}
                        </strong>

                        <span>
                            ${qty} × ${money(price)}
                        </span>

                    </div>

                    <div class="checkout-item-total">
                        ${money(qty * price)}
                    </div>

                </div>
            `;

        }).join("");
    }


    function renderSummary() {

        const t = totals();

        $("summarySubtotal").textContent =
            money(t.subtotal);

        $("summaryDelivery").textContent =
            t.delivery === 0 && t.subtotal > 0
                ? "FREE"
                : money(t.delivery);

        $("summaryTotal").textContent =
            money(t.total);


        if (appliedCoupon) {

            $("summaryCouponLabel").textContent =
                `(${appliedCoupon})`;

        } else {

            $("summaryCouponLabel").textContent = "";
        }


        if (t.subtotal >= freeDeliveryMinimum) {

            $("deliveryMessage").textContent =
                "Free delivery unlocked";

            $("deliverySubMessage").textContent =
                "Your order qualifies for free delivery.";

        } else {

            const remaining =
                freeDeliveryMinimum - t.subtotal;

            $("deliveryMessage").textContent =
                `Add ${money(remaining)} more`;

            $("deliverySubMessage").textContent =
                "to qualify for free delivery.";
        }
    }


    function showPageState() {

        $("checkoutLoading")?.classList.add("hidden");

        if (!cart.length) {

            $("checkoutContent")?.classList.add("hidden");
            $("checkoutEmpty")?.classList.remove("hidden");

            return;
        }

        $("checkoutEmpty")?.classList.add("hidden");
        $("checkoutContent")?.classList.remove("hidden");

        renderItems();
        renderSummary();
    }


    /* =========================================
       VALIDATION
    ========================================= */

    function setError(id, message) {

        const input = $(id);
        const error =
            document.querySelector(
                `[data-error-for="${id}"]`
            );

        input?.classList.toggle(
            "invalid",
            Boolean(message)
        );

        if (error) {
            error.textContent = message || "";
        }
    }


    function validateForm() {

        let valid = true;

        const name =
            $("customerName").value.trim();

        const phone =
            $("customerPhone").value.trim();

        const email =
            $("customerEmail").value.trim();

        const address =
            $("address").value.trim();


        setError(
            "customerName",
            name.length < 2
                ? "Please enter your full name."
                : ""
        );

        if (name.length < 2) valid = false;


        const normalizedPhone =
            phone.replace(/[\s-]/g, "");

        const phonePattern =
            /^(?:\+?880|0)1[3-9]\d{8}$/;

        setError(
            "customerPhone",
            !phonePattern.test(normalizedPhone)
                ? "Enter a valid Bangladesh mobile number."
                : ""
        );

        if (!phonePattern.test(normalizedPhone)) {
            valid = false;
        }


        if (email) {

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            setError(
                "customerEmail",
                !emailPattern.test(email)
                    ? "Enter a valid email address."
                    : ""
            );

            if (!emailPattern.test(email)) {
                valid = false;
            }

        } else {

            setError("customerEmail", "");
        }


        setError(
            "address",
            address.length < 5
                ? "Please enter your delivery address."
                : ""
        );

        if (address.length < 5) {
            valid = false;
        }


        const terms =
            $("termsAccepted").checked;

        $("termsError").textContent =
            terms
                ? ""
                : "Please confirm the order information.";

        if (!terms) {
            valid = false;
        }


        return valid;
    }


    /* =========================================
       COUPON
    ========================================= */

    function loadSavedCoupon() {

        const saved =
            sessionStorage.getItem(COUPON_KEY);

        if (!saved) return;

        appliedCoupon = saved;

        $("couponCode").value = saved;

        $("couponMessage").textContent =
            "Coupon saved. It will be verified securely when you place the order.";

        $("couponMessage").className = "success";

        renderSummary();
    }


    $("applyCouponBtn")?.addEventListener(
        "click",
        () => {

            const code =
                $("couponCode").value
                    .trim()
                    .toUpperCase();

            if (!code) {

                appliedCoupon = "";

                sessionStorage.removeItem(COUPON_KEY);

                $("couponMessage").textContent =
                    "Please enter a coupon code.";

                $("couponMessage").className = "error";

                renderSummary();

                return;
            }

            appliedCoupon = code;

            sessionStorage.setItem(
                COUPON_KEY,
                code
            );

            $("couponMessage").textContent =
                "Coupon saved. Final discount and eligibility will be verified securely when the order is placed.";

            $("couponMessage").className = "success";

            renderSummary();
        }
    );


    /* =========================================
       PLACE ORDER
    ========================================= */

    async function placeOrder() {

        if (!validateForm()) {

            document
                .querySelector(".invalid")
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

            return;
        }


        if (!cart.length) {
            return;
        }


        const button =
            $("placeOrderBtn");

        button.disabled = true;

        $("btn-normal")?.classList.add("hidden");
        document
            .querySelector(".btn-normal")
            ?.classList.add("hidden");

        document
            .querySelector(".btn-loading")
            ?.classList.remove("hidden");


        const payload = {

            customer_name:
                $("customerName").value.trim(),

            customer_phone:
                $("customerPhone").value.trim(),

            customer_email:
                $("customerEmail").value.trim() || null,

            customer_address:
                $("address").value.trim(),

            city:
                $("city").value.trim() || null,

            district:
                $("district").value.trim() || null,

            postal_code:
                $("postalCode").value.trim() || null,

            payment_method:
                document.querySelector(
                    'input[name="payment_method"]:checked'
                )?.value ||
                "cash_on_delivery",

            coupon_code:
                appliedCoupon || null,

            note:
                $("orderNote").value.trim() || null,

            items:
                cart.map(item => ({
                    product_id: String(item.id),
                    quantity: quantity(item)
                }))
        };


        try {

            const response =
                await fetch(
                    CREATE_ORDER_URL,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify(payload)
                    }
                );


            let result = null;

            try {
                result = await response.json();
            } catch {
                result = null;
            }


            if (!response.ok || !result?.success) {

                throw new Error(
                    result?.message ||
                    "Unable to place your order. Please try again."
                );
            }


            /*
             * The Edge Function returns the database result.
             * Support both direct order_id and nested data shapes.
             */
            const orderId =
                result.order_id ||
                result.data?.order_id ||
                result.order?.order_id;

            const internalId =
                result.id ||
                result.data?.id ||
                result.order?.id ||
                "";


            if (!orderId && !internalId) {

                throw new Error(
                    "Order was created but the order reference was not returned."
                );
            }


            /*
             * Save a small local receipt for the next page.
             * No sensitive payment information is stored.
             */
            sessionStorage.setItem(
                "mxb_last_order",
                JSON.stringify({
                    order_id: orderId || "",
                    id: internalId || "",
                    customer_name:
                        payload.customer_name,
                    total:
                        totals().total
                })
            );


            localStorage.removeItem(CART_KEY);

            sessionStorage.removeItem(COUPON_KEY);


            const target =
                orderId
                    ? `order-success.html?order_id=${encodeURIComponent(orderId)}`
                    : `order-success.html?id=${encodeURIComponent(internalId)}`;

            window.location.href = target;


        } catch (error) {

            console.error(
                "Place order error:",
                error
            );

            showToast(
                error?.message ||
                "Unable to place order."
            );

            button.disabled = false;

            document
                .querySelector(".btn-loading")
                ?.classList.add("hidden");

            document
                .querySelector(".btn-normal")
                ?.classList.remove("hidden");
        }
    }


    $("checkoutForm")?.addEventListener(
        "submit",
        event => {
            event.preventDefault();
            placeOrder();
        }
    );


    /* =========================================
       INPUT UX
    ========================================= */

    document
        .querySelectorAll(
            "#checkoutForm input, #checkoutForm textarea"
        )
        .forEach(input => {

            input.addEventListener(
                "input",
                () => {

                    if (input.id) {
                        input.classList.remove("invalid");
                    }

                    const error =
                        document.querySelector(
                            `[data-error-for="${input.id}"]`
                        );

                    if (error) {
                        error.textContent = "";
                    }

                    if (input.id === "termsAccepted") {
                        $("termsError").textContent = "";
                    }
                }
            );
        });


    /* =========================================
       SEARCH
    ========================================= */

    $("searchForm")?.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            const keyword =
                $("globalSearch")
                    .value
                    .trim();

            if (keyword) {

                window.location.href =
                    `products.html?search=${encodeURIComponent(keyword)}`;
            }
        }
    );


    /* =========================================
       MOBILE MENU
    ========================================= */

    $("mobileMenuBtn")?.addEventListener(
        "click",
        () => {

            const nav =
                $("mainNav");

            nav?.classList.toggle("open");

            $("mobileMenuBtn").innerHTML =
                nav?.classList.contains("open")
                    ? '<i class="bi bi-x-lg"></i>'
                    : '<i class="bi bi-list"></i>';
        }
    );


    /* =========================================
       TOAST
    ========================================= */

    function showToast(message) {

        if (window.MXB?.toast) {
            MXB.toast(message);
            return;
        }

        document
            .querySelector(".checkout-toast")
            ?.remove();

        const toast =
            document.createElement("div");

        toast.className =
            "checkout-toast";

        toast.textContent =
            message;

        Object.assign(
            toast.style,
            {
                position: "fixed",
                left: "50%",
                bottom: "24px",
                transform: "translateX(-50%)",
                zIndex: "99999",
                maxWidth: "calc(100% - 30px)",
                padding: "12px 17px",
                borderRadius: "10px",
                background: "#172033",
                color: "#fff",
                fontSize: "11px",
                fontWeight: "700",
                textAlign: "center",
                boxShadow:
                    "0 12px 30px rgba(0,0,0,.18)"
            }
        );

        document.body.appendChild(toast);

        setTimeout(
            () => toast.remove(),
            3500
        );
    }


    /* =========================================
       INIT
    ========================================= */

    async function init() {

        cart = readCart();

        updateCartCount();

        if (!cart.length) {
            showPageState();
            return;
        }

        await loadSettings();

        showPageState();

        loadSavedCoupon();
    }

    init();

});
