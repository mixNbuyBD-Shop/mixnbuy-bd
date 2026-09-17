"use strict";

const MXB = {

    money(value) {

        const amount = Number(value || 0);

        return new Intl.NumberFormat("en-BD", {
            style: "currency",
            currency: "BDT",
            maximumFractionDigits: 0
        }).format(amount);

    },


    escape(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    },


    productImage(product) {

        if (
            product &&
            typeof product.image_url === "string" &&
            product.image_url.trim()
        ) {
            return product.image_url.trim();
        }


        if (
            product &&
            Array.isArray(product.gallery) &&
            product.gallery.length
        ) {

            const first =
                product.gallery[0];

            if (typeof first === "string") {
                return first;
            }

            if (
                first &&
                typeof first.url === "string"
            ) {
                return first.url;
            }

        }


        return "assets/images/product-placeholder.svg";

    },


    async getProducts() {

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
                    selling_price,
                    discount_price,
                    current_stock,
                    image_url,
                    gallery,
                    is_featured,
                    is_active
                `)
                .eq("is_active", true)
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            console.error(
                "Products:",
                error
            );

            throw error;

        }


        return data || [];

    },


    async getCategories() {

        if (!window.supabaseClient) {
            throw new Error(
                "Supabase client is not initialized."
            );
        }


        const { data, error } =
            await window.supabaseClient
                .from("categories")
                .select(`
                    id,
                    name,
                    slug,
                    description,
                    image_url,
                    sort_order,
                    status
                `)
                .eq(
                    "status",
                    "active"
                )
                .order(
                    "sort_order",
                    {
                        ascending: true
                    }
                );


        if (error) {

            console.error(
                "Categories:",
                error
            );

            throw error;

        }


        return data || [];

    },


    getCart() {

        try {

            const cart =
                JSON.parse(
                    localStorage.getItem(
                        "mxb_cart"
                    ) || "[]"
                );

            return Array.isArray(cart)
                ? cart
                : [];

        } catch {

            return [];

        }

    },


    saveCart(cart) {

        localStorage.setItem(
            "mxb_cart",
            JSON.stringify(cart)
        );

        this.updateCartCount();

    },


    addToCart(product, quantity = 1) {

        if (!product) {
            return;
        }


        const cart =
            this.getCart();


        const existing =
            cart.find(
                item =>
                    item.product_id ===
                    product.id
            );


        const price =
            Number(
                product.discount_price ??
                product.selling_price ??
                0
            );


        if (existing) {

            existing.quantity =
                Number(existing.quantity || 0) +
                Number(quantity);

        } else {

            cart.push({

                product_id: product.id,

                name: product.name,

                sku: product.sku || "",

                price,

                image_url:
                    this.productImage(product),

                quantity:
                    Number(quantity)

            });

        }


        this.saveCart(cart);


        this.toast(
            "Product added to cart"
        );

    },


    removeFromCart(productId) {

        const cart =
            this.getCart()
                .filter(
                    item =>
                        item.product_id !==
                        productId
                );

        this.saveCart(cart);

    },


    updateQuantity(productId, quantity) {

        const cart =
            this.getCart();


        const item =
            cart.find(
                product =>
                    product.product_id ===
                    productId
            );


        if (!item) {
            return;
        }


        const newQuantity =
            Number(quantity);


        if (newQuantity <= 0) {

            this.removeFromCart(
                productId
            );

            return;

        }


        item.quantity =
            Math.floor(newQuantity);


        this.saveCart(cart);

    },


    clearCart() {

        localStorage.removeItem(
            "mxb_cart"
        );

        this.updateCartCount();

    },


    cartCount() {

        return this.getCart()
            .reduce(
                (total, item) =>
                    total +
                    Number(
                        item.quantity || 0
                    ),
                0
            );

    },


    cartSubtotal() {

        return this.getCart()
            .reduce(
                (total, item) =>
                    total +
                    Number(item.price || 0) *
                    Number(item.quantity || 0),
                0
            );

    },


    updateCartCount() {

        const count =
            this.cartCount();


        document
            .querySelectorAll(
                "[data-cart-count]"
            )
            .forEach(element => {

                element.textContent =
                    count;

            });

    },


    toast(message, type = "success") {

        const old =
            document.querySelector(
                ".mxb-toast"
            );


        if (old) {
            old.remove();
        }


        const toast =
            document.createElement(
                "div"
            );


        toast.className =
            `mxb-toast mxb-toast-${type}`;


        toast.innerHTML = `

            <i class="bi bi-check-circle-fill"></i>

            <span>
                ${this.escape(message)}
            </span>

        `;


        document.body.appendChild(
            toast
        );


        requestAnimationFrame(() => {

            toast.classList.add(
                "show"
            );

        });


        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

            setTimeout(
                () => toast.remove(),
                300
            );

        }, 2500);

    }

};


document.addEventListener(
    "DOMContentLoaded",
    () => {

        MXB.updateCartCount();

    }
);
