/* =========================================================
   MIXNBUY.BD — ORDER SUCCESS
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const $ = id => document.getElementById(id);

    function money(value) {

        const amount = Number(value || 0);

        if (window.MXB?.money) {
            return MXB.money(amount);
        }

        return `BDT ${amount.toLocaleString("en-BD", {
            maximumFractionDigits: 2
        })}`;
    }


    function getParams() {
        return new URLSearchParams(window.location.search);
    }


    function getReceipt() {

        try {

            const raw =
                sessionStorage.getItem("mxb_last_order");

            if (!raw) return null;

            const data = JSON.parse(raw);

            return data && typeof data === "object"
                ? data
                : null;

        } catch {
            return null;
        }
    }


    function getOrderReference() {

        const params = getParams();

        const fromUrl =
            params.get("order_id") ||
            params.get("orderId") ||
            params.get("id");

        if (fromUrl) {
            return fromUrl;
        }

        const receipt = getReceipt();

        return receipt?.order_id ||
               receipt?.id ||
               "";
    }


    function updateCartCount() {

        let count = 0;

        try {

            const cart =
                JSON.parse(
                    localStorage.getItem("mxb_cart") || "[]"
                );

            if (Array.isArray(cart)) {

                count = cart.reduce(
                    (sum, item) =>
                        sum + Math.max(
                            0,
                            Number(item.quantity || 0)
                        ),
                    0
                );
            }

        } catch {}

        document
            .querySelectorAll("[data-cart-count]")
            .forEach(el => {
                el.textContent = count;
            });
    }


    function render() {

        const receipt = getReceipt();
        const orderReference = getOrderReference();

        $("orderId").textContent =
            orderReference || "Order confirmed";

        $("customerName").textContent =
            receipt?.customer_name || "Customer";

        if (
            receipt?.total !== undefined &&
            receipt?.total !== null
        ) {
            $("orderTotal").textContent =
                money(receipt.total);
        } else {
            $("orderTotal").textContent =
                "See order details";
        }


        if (orderReference) {

            $("trackOrderBtn").href =
                `track-order.html?order_id=${encodeURIComponent(orderReference)}`;

        } else {

            $("trackOrderBtn").href =
                "track-order.html";
        }
    }


    async function copyOrderId() {

        const id =
            $("orderId").textContent.trim();

        if (!id || id === "Loading...") return;

        try {

            await navigator.clipboard.writeText(id);

            $("copyMessage").textContent =
                "Order ID copied successfully.";

            $("copyMessage").className =
                "copied";

        } catch {

            const area =
                document.createElement("textarea");

            area.value = id;
            area.style.position = "fixed";
            area.style.opacity = "0";

            document.body.appendChild(area);
            area.select();

            try {
                document.execCommand("copy");
            } catch {}

            area.remove();

            $("copyMessage").textContent =
                "Order ID copied.";
        }

        setTimeout(() => {

            $("copyMessage").textContent =
                "Please keep this Order ID for tracking.";

            $("copyMessage").className = "";

        }, 2500);
    }


    $("copyOrderId")?.addEventListener(
        "click",
        copyOrderId
    );


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


    updateCartCount();
    render();

});
