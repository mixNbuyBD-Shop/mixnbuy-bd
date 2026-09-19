/* =========================================================
   MIXNBUY.BD — CHECKOUT

   Creates orders through the existing create-order
   Supabase Edge Function.

   FINAL VERSION
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


    /* =====================================================
       HELPERS
    ===================================================== */

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

        if (
            Array.isArray(item?.gallery) &&
            item.gallery.length
        ) {

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


    function readCart() {

        try {

            const parsed = JSON.parse(
                localStorage.getItem(CART_KEY) || "[]"
            );

            return Array.isArray(parsed)
                ? parsed
                : [];

        } catch (error) {

            console.warn(
                "Unable to read cart:",
                error
            );

            return [];
        }
    }


    function updateCartCount() {

        const count = cart.reduce(
            (sum, item) => {

                return sum +
                    Math.max(
                        0,
                        Number(item.quantity || 0)
                    );

            },
            0
        );

        document
            .querySelectorAll("[data-cart-count]")
            .forEach(el => {

                el.textContent = count;

            });
    }


    /* =====================================================
       PRODUCT ID RESOLVER
    ===================================================== */

    function getProductId(item) {

        if (!item) {
            return "";
        }

        /*
         * Different possible cart structures are supported.
         */

        const candidates = [

            item.id,

            item.product_id,

            item.productId,

            item.product?.id,

            item.product?.product_id,

            item.product?.productId

        ];


        for (const value of candidates) {

            if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== "" &&
                String(value).trim() !== "undefined" &&
                String(value).trim() !== "null"
            ) {

                return String(value).trim();

            }
        }


        return "";
    }


    /* =====================================================
       UUID VALIDATION
    ===================================================== */

    function isValidUUID(value) {

        if (!value) {
            return false;
        }

        const uuid = String(value).trim();

        if (
            uuid === "undefined" ||
            uuid === "null"
        ) {
            return false;
        }

        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            uuid
        );
    }


    /* =====================================================
       UNIT PRICE
    ===================================================== */

    function unitPrice(item) {

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


    /* =====================================================
       QUANTITY
    ===================================================== */

    function quantity(item) {

        const qty = Number(
            item?.quantity || 1
        );

        return Math.max(
            1,
            Number.isFinite(qty)
                ? qty
                : 1
        );
    }


    /* =====================================================
       SUBTOTAL
    ===================================================== */

    function subtotal() {

        return cart.reduce(
            (sum, item) => {

                return sum +
                    unitPrice(item) *
                    quantity(item);

            },
            0
        );
    }


    /* =====================================================
       DELIVERY
    ===================================================== */

    function deliveryFor(amount) {

        if (amount <= 0) {
            return 0;
        }

        return amount >= freeDeliveryMinimum
            ? 0
            : deliveryCharge;
    }


    /* =====================================================
       TOTALS
    ===================================================== */

    function totals() {

        const sub = subtotal();

        const delivery =
            deliveryFor(sub);

        /*
         * Coupon discount is calculated securely
         * by the backend.
         */

        return {

            subtotal: sub,

            delivery,

            total:
                sub + delivery

        };
    }


    /* =====================================================
       SETTINGS
    ===================================================== */

    async function loadSettings() {

        if (!window.supabaseClient) {
            return;
        }

        try {

            const {
                data,
                error
            } = await window.supabaseClient
                .from("settings")
                .select("key,value");


            if (
                error ||
                !Array.isArray(data)
            ) {

                console.warn(
                    "Unable to load checkout settings:",
                    error
                );

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


            if (
                Number.isFinite(charge) &&
                charge >= 0
            ) {

                deliveryCharge = charge;

            }


            if (
                Number.isFinite(free) &&
                free > 0
            ) {

                freeDeliveryMinimum = free;

            }

        } catch (error) {

            console.warn(
                "Checkout settings could not be loaded:",
                error
            );

        }
    }


    /* =====================================================
       RENDER ITEMS
    ===================================================== */

    function renderItems() {

        const box =
            $("checkoutItems");

        if (!box) {
            return;
        }


        box.innerHTML = cart
            .map(item => {

                const qty =
                    quantity(item);

                const price =
                    unitPrice(item);

                const productId =
                    getProductId(item);


                return `

                    <div class="checkout-item">

                        <a
                            href="product.html?id=${encodeURIComponent(
                                productId
                            )}"
                            class="checkout-item-image"
                        >

                            <img
                                src="${escapeHtml(
                                    imageFor(item)
                                )}"
                                alt="${escapeHtml(
                                    item.name ||
                                    "Product"
                                )}"

                                onerror="
                                    this.onerror=null;
                                    this.src='assets/images/product-placeholder.svg';
                                "
                            >

                        </a>


                        <div class="checkout-item-info">

                            <strong>
                                ${escapeHtml(
                                    item.name ||
                                    "Product"
                                )}
                            </strong>

                            <span>
                                ${qty} × ${money(price)}
                            </span>

                        </div>


                        <div class="checkout-item-total">

                            ${money(
                                qty * price
                            )}

                        </div>

                    </div>

                `;

            })
            .join("");
    }


    /* =====================================================
       RENDER SUMMARY
    ===================================================== */

    function renderSummary() {

        const t =
            totals();


        if ($("summarySubtotal")) {

            $("summarySubtotal").textContent =
                money(t.subtotal);

        }


        if ($("summaryDelivery")) {

            $("summaryDelivery").textContent =
                t.delivery === 0 &&
                t.subtotal > 0

                    ? "FREE"

                    : money(
                        t.delivery
                    );

        }


        if ($("summaryTotal")) {

            $("summaryTotal").textContent =
                money(t.total);

        }


        if ($("summaryCouponLabel")) {

            $("summaryCouponLabel").textContent =
                appliedCoupon
                    ? `(${appliedCoupon})`
                    : "";

        }


        if (
            $("deliveryMessage") &&
            $("deliverySubMessage")
        ) {

            if (
                t.subtotal >=
                freeDeliveryMinimum
            ) {

                $("deliveryMessage").textContent =
                    "Free delivery unlocked";

                $("deliverySubMessage").textContent =
                    "Your order qualifies for free delivery.";

            } else {

                const remaining =
                    freeDeliveryMinimum -
                    t.subtotal;

                $("deliveryMessage").textContent =
                    `Add ${money(remaining)} more`;

                $("deliverySubMessage").textContent =
                    "to qualify for free delivery.";

            }
        }
    }


    /* =====================================================
       PAGE STATE
    ===================================================== */

    function showPageState() {

        $("checkoutLoading")
            ?.classList.add("hidden");


        if (!cart.length) {

            $("checkoutContent")
                ?.classList.add("hidden");

            $("checkoutEmpty")
                ?.classList.remove("hidden");

            return;
        }


        $("checkoutEmpty")
            ?.classList.add("hidden");

        $("checkoutContent")
            ?.classList.remove("hidden");


        renderItems();

        renderSummary();
    }


    /* =====================================================
       VALIDATION ERROR
    ===================================================== */

    function setError(
        id,
        message
    ) {

        const input =
            $(id);


        const error =
            document.querySelector(
                `[data-error-for="${id}"]`
            );


        input?.classList.toggle(
            "invalid",
            Boolean(message)
        );


        if (error) {

            error.textContent =
                message || "";

        }
    }


    /* =====================================================
       FORM VALIDATION
    ===================================================== */

    function validateForm() {

        let valid = true;


        const name =
            $("customerName")
                ?.value
                .trim() || "";


        const phone =
            $("customerPhone")
                ?.value
                .trim() || "";


        const email =
            $("customerEmail")
                ?.value
                .trim() || "";


        const address =
            $("address")
                ?.value
                .trim() || "";


        /* -----------------------------------------------
           NAME
        ----------------------------------------------- */

        setError(
            "customerName",

            name.length < 2
                ? "Please enter your full name."
                : ""
        );


        if (name.length < 2) {
            valid = false;
        }


        /* -----------------------------------------------
           BANGLADESH MOBILE
        ----------------------------------------------- */

        const normalizedPhone =
            phone.replace(
                /[\s-]/g,
                ""
            );


        const phonePattern =
            /^(?:\+880|880|0)1[3-9]\d{8}$/;


        const phoneValid =
            phonePattern.test(
                normalizedPhone
            );


        setError(
            "customerPhone",

            phoneValid
                ? ""
                : "Enter a valid Bangladesh mobile number."
        );


        if (!phoneValid) {
            valid = false;
        }


        /* -----------------------------------------------
           EMAIL
        ----------------------------------------------- */

        if (email) {

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            const emailValid =
                emailPattern.test(
                    email
                );


            setError(
                "customerEmail",

                emailValid
                    ? ""
                    : "Enter a valid email address."
            );


            if (!emailValid) {
                valid = false;
            }

        } else {

            setError(
                "customerEmail",
                ""
            );

        }


        /* -----------------------------------------------
           ADDRESS
        ----------------------------------------------- */

        setError(
            "address",

            address.length < 5
                ? "Please enter your delivery address."
                : ""
        );


        if (address.length < 5) {
            valid = false;
        }


        /* -----------------------------------------------
           TERMS
        ----------------------------------------------- */

        const terms =
            $("termsAccepted")
                ?.checked === true;


        if ($("termsError")) {

            $("termsError").textContent =
                terms
                    ? ""
                    : "Please confirm the order information.";

        }


        if (!terms) {
            valid = false;
        }


        return valid;
    }


    /* =====================================================
       CART VALIDATION BEFORE ORDER
    ===================================================== */

    function validateCartForOrder() {

        if (!Array.isArray(cart)) {
            return false;
        }


        if (!cart.length) {

            showToast(
                "Your cart is empty."
            );

            return false;
        }


        for (
            let index = 0;
            index < cart.length;
            index++
        ) {

            const item =
                cart[index];


            const productId =
                getProductId(item);


            const qty =
                quantity(item);


            if (!productId) {

                console.error(
                    "Cart product ID missing:",
                    item
                );


                showToast(
                    `Product information is missing for "${item?.name || "a product"}". Please remove it from cart and add it again.`
                );


                return false;
            }


            if (!isValidUUID(productId)) {

                console.error(
                    "Invalid cart product UUID:",
                    {
                        index,
                        productId,
                        item
                    }
                );


                showToast(
                    `Invalid product information for "${item?.name || "a product"}". Please remove it from cart and add it again.`
                );


                return false;
            }


            if (
                !Number.isInteger(qty) ||
                qty <= 0
            ) {

                console.error(
                    "Invalid cart quantity:",
                    {
                        index,
                        qty,
                        item
                    }
                );


                showToast(
                    "Invalid product quantity."
                );


                return false;
            }

        }


        return true;
    }


    /* =====================================================
       COUPON
    ===================================================== */

    function loadSavedCoupon() {

        const saved =
            sessionStorage.getItem(
                COUPON_KEY
            );


        if (!saved) {
            return;
        }


        appliedCoupon =
            saved
                .trim()
                .toUpperCase();


        if ($("couponCode")) {

            $("couponCode").value =
                appliedCoupon;

        }


        if ($("couponMessage")) {

            $("couponMessage").textContent =
                "Coupon saved. It will be verified securely when you place the order.";

            $("couponMessage").className =
                "success";

        }


        renderSummary();
    }


    $("applyCouponBtn")
        ?.addEventListener(
            "click",
            () => {

                const code =
                    $("couponCode")
                        ?.value
                        .trim()
                        .toUpperCase() || "";


                if (!code) {

                    appliedCoupon = "";


                    sessionStorage.removeItem(
                        COUPON_KEY
                    );


                    if ($("couponMessage")) {

                        $("couponMessage")
                            .textContent =
                            "Please enter a coupon code.";

                        $("couponMessage")
                            .className =
                            "error";

                    }


                    renderSummary();

                    return;
                }


                appliedCoupon =
                    code;


                sessionStorage.setItem(
                    COUPON_KEY,
                    code
                );


                if ($("couponMessage")) {

                    $("couponMessage")
                        .textContent =
                        "Coupon saved. Final discount and eligibility will be verified securely when the order is placed.";

                    $("couponMessage")
                        .className =
                        "success";

                }


                renderSummary();

            }
        );


    $("couponCode")
        ?.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {

                    event.preventDefault();

                    $("applyCouponBtn")
                        ?.click();

                }

            }
        );


    /* =====================================================
       PAYMENT UI
    ===================================================== */

    function updatePaymentChoice() {

        document
            .querySelectorAll(
                ".payment-choice"
            )
            .forEach(choice => {

                const input =
                    choice.querySelector(
                        'input[type="radio"]'
                    );


                choice.classList.toggle(
                    "selected",
                    Boolean(
                        input?.checked
                    )
                );

            });
    }


    document
        .querySelectorAll(
            'input[name="payment_method"]'
        )
        .forEach(input => {

            input.addEventListener(
                "change",
                updatePaymentChoice
            );

        });


    updatePaymentChoice();


    /* =====================================================
       BUILD ORDER ITEMS
    ===================================================== */

    function buildOrderItems() {

        const items = [];


        cart.forEach(
            (item, index) => {

                const productId =
                    getProductId(item);


                const qty =
                    quantity(item);


                if (!productId) {

                    throw new Error(
                        `Product ID missing for cart item ${index + 1}.`
                    );
                }


                if (!isValidUUID(productId)) {

                    throw new Error(
                        `Invalid Product ID for "${item?.name || "product"}".`
                    );
                }


                if (
                    !Number.isInteger(qty) ||
                    qty <= 0
                ) {

                    throw new Error(
                        `Invalid quantity for "${item?.name || "product"}".`
                    );
                }


                items.push({

                    product_id:
                        productId,

                    quantity:
                        qty

                });

            }
        );


        return items;
    }


    /* =====================================================
       PLACE ORDER
    ===================================================== */

    async function placeOrder() {

        if (!validateForm()) {

            document
                .querySelector(
                    ".invalid"
                )
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

            return;
        }


        if (!cart.length) {

            showToast(
                "Your cart is empty."
            );

            return;
        }


        /*
         * IMPORTANT:
         * Validate cart product UUIDs BEFORE
         * sending anything to Supabase.
         */

        if (!validateCartForOrder()) {
            return;
        }


        let orderItems;


        try {

            orderItems =
                buildOrderItems();

        } catch (error) {

            console.error(
                "Order item validation error:",
                error
            );


            showToast(
                error?.message ||
                "Invalid product information."
            );


            return;
        }


        const button =
            $("placeOrderBtn");


        if (!button) {
            return;
        }


        button.disabled = true;


        document
            .querySelector(
                ".btn-normal"
            )
            ?.classList.add("hidden");


        document
            .querySelector(
                ".btn-loading"
            )
            ?.classList.remove("hidden");


        /* =================================================
           ORDER PAYLOAD
        ================================================= */

        const payload = {

            customer_name:
                $("customerName")
                    ?.value
                    .trim() || "",


            customer_phone:
                $("customerPhone")
                    ?.value
                    .trim() || "",


            customer_email:
                $("customerEmail")
                    ?.value
                    .trim() || null,


            customer_address:
                $("address")
                    ?.value
                    .trim() || "",


            city:
                $("city")
                    ?.value
                    .trim() || null,


            district:
                $("district")
                    ?.value
                    .trim() || null,


            postal_code:
                $("postalCode")
                    ?.value
                    .trim() || null,


            payment_method:
                document.querySelector(
                    'input[name="payment_method"]:checked'
                )?.value ||
                "cash_on_delivery",


            coupon_code:
                appliedCoupon ||
                null,


            note:
                $("orderNote")
                    ?.value
                    .trim() || null,


            /*
             * IMPORTANT:
             * Never use String(item.id) directly.
             * Product UUID is resolved safely.
             */

            items:
                orderItems

        };


        console.log(
            "MIXNBUY.BD Order Payload:",
            payload
        );


        try {

            const response =
                await fetch(
                    CREATE_ORDER_URL,
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Accept":
                                "application/json"

                        },

                        body:
                            JSON.stringify(
                                payload
                            )

                    }
                );


            let result = null;


            try {

                result =
                    await response.json();

            } catch (jsonError) {

                console.warn(
                    "Unable to parse create-order response:",
                    jsonError
                );

                result = null;
            }


            console.log(
                "MIXNBUY.BD create-order response:",
                {
                    status:
                        response.status,

                    ok:
                        response.ok,

                    result
                }
            );


            if (
                !response.ok ||
                !result?.success
            ) {

                throw new Error(
                    result?.message ||
                    result?.error ||
                    `Unable to place your order. Server returned ${response.status}.`
                );
            }


            /* =================================================
               ORDER REFERENCE
            ================================================= */

            const orderId =
                result.order_id ||
                result.orderId ||
                result.data?.order_id ||
                result.data?.orderId ||
                result.order?.order_id ||
                result.order?.orderId ||
                result.order?.id ||
                "";


            const internalId =
                result.id ||
                result.data?.id ||
                result.order?.id ||
                "";


            if (
                !orderId &&
                !internalId
            ) {

                throw new Error(
                    "Order was created but the order reference was not returned."
                );
            }


            /* =================================================
               SAVE SMALL LOCAL RECEIPT
            ================================================= */

            sessionStorage.setItem(
                "mxb_last_order",

                JSON.stringify({

                    order_id:
                        orderId || "",

                    id:
                        internalId || "",

                    customer_name:
                        payload.customer_name,

                    total:
                        totals().total

                })
            );


            /* =================================================
               CLEAR CART
            ================================================= */

            localStorage.removeItem(
                CART_KEY
            );


            sessionStorage.removeItem(
                COUPON_KEY
            );


            cart = [];


            updateCartCount();


            /* =================================================
               REDIRECT
            ================================================= */

            let target;


            if (orderId) {

                target =
                    `order-success.html?order_id=${encodeURIComponent(
                        orderId
                    )}`;

            } else {

                target =
                    `order-success.html?id=${encodeURIComponent(
                        internalId
                    )}`;

            }


            window.location.href =
                target;


        } catch (error) {

            console.error(
                "Place order error:",
                error
            );


            showToast(
                error?.message ||
                "Unable to place order."
            );


            button.disabled =
                false;


            document
                .querySelector(
                    ".btn-loading"
                )
                ?.classList.add("hidden");


            document
                .querySelector(
                    ".btn-normal"
                )
                ?.classList.remove("hidden");

        }
    }


    /* =====================================================
       CHECKOUT FORM
    ===================================================== */

    $("checkoutForm")
        ?.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                placeOrder();

            }
        );


    /* =====================================================
       INPUT UX
    ===================================================== */

    document
        .querySelectorAll(
            "#checkoutForm input, #checkoutForm textarea"
        )
        .forEach(input => {

            input.addEventListener(
                "input",
                () => {

                    if (input.id) {

                        input.classList.remove(
                            "invalid"
                        );

                    }


                    const error =
                        document.querySelector(
                            `[data-error-for="${input.id}"]`
                        );


                    if (error) {

                        error.textContent =
                            "";

                    }


                    if (
                        input.id ===
                        "termsAccepted"
                    ) {

                        if ($("termsError")) {

                            $("termsError")
                                .textContent =
                                "";

                        }
                    }

                }
            );

        });


    /* =====================================================
       SEARCH
    ===================================================== */

    $("searchForm")
        ?.addEventListener(
            "submit",
            event => {

                event.preventDefault();


                const keyword =
                    $("globalSearch")
                        ?.value
                        .trim() || "";


                if (keyword) {

                    window.location.href =
                        `products.html?search=${encodeURIComponent(
                            keyword
                        )}`;

                }

            }
        );


    /* =====================================================
       MOBILE MENU
    ===================================================== */

    $("mobileMenuBtn")
        ?.addEventListener(
            "click",
            () => {

                const nav =
                    $("mainNav");


                if (!nav) {
                    return;
                }


                nav.classList.toggle(
                    "open"
                );


                $("mobileMenuBtn").innerHTML =
                    nav.classList.contains(
                        "open"
                    )

                        ? '<i class="bi bi-x-lg"></i>'

                        : '<i class="bi bi-list"></i>';

            }
        );


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(message) {

        if (window.MXB?.toast) {

            MXB.toast(message);

            return;
        }


        document
            .querySelector(
                ".checkout-toast"
            )
            ?.remove();


        const toast =
            document.createElement(
                "div"
            );


        toast.className =
            "checkout-toast";


        toast.textContent =
            message;


        Object.assign(
            toast.style,
            {

                position:
                    "fixed",

                left:
                    "50%",

                bottom:
                    "24px",

                transform:
                    "translateX(-50%)",

                zIndex:
                    "99999",

                maxWidth:
                    "calc(100% - 30px)",

                padding:
                    "12px 17px",

                borderRadius:
                    "10px",

                background:
                    "#172033",

                color:
                    "#fff",

                fontSize:
                    "11px",

                fontWeight:
                    "700",

                textAlign:
                    "center",

                boxShadow:
                    "0 12px 30px rgba(0,0,0,.18)"

            }
        );


        document.body.appendChild(
            toast
        );


        setTimeout(
            () => {

                toast.remove();

            },
            3500
        );
    }


    /* =====================================================
       INIT
    ===================================================== */

    async function init() {

        cart =
            readCart();


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
