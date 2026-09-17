/* =====================================================
   MIXNBUY.BD — CART PAGE
===================================================== */

(function () {

  "use strict";


  /* ===================================================
     CONFIG
  =================================================== */

  const $ = id => document.getElementById(id);

  const CART_KEY = "mxb_cart";


  /* ===================================================
     HELPERS
  =================================================== */

  function money(value) {

    const number = Number(value || 0);

    return "BDT " +
      number.toLocaleString("en-BD", {
        maximumFractionDigits: 2
      });

  }


  function escapeHtml(value) {

    return String(value ?? "").replace(
      /[&<>"']/g,
      char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char])
    );

  }


  /* ===================================================
     CART STORAGE
  =================================================== */

  function getCart() {

    try {

      const raw =
        JSON.parse(
          localStorage.getItem(CART_KEY) || "[]"
        );

      return Array.isArray(raw) ? raw : [];

    } catch (error) {

      return [];

    }

  }


  function saveCart(cart) {

    localStorage.setItem(
      CART_KEY,
      JSON.stringify(cart)
    );


    updateHeaderCount(cart);


    window.dispatchEvent(
      new CustomEvent(
        "mxb:cart-updated",
        {
          detail: {
            cart: cart
          }
        }
      )
    );

  }


  /* ===================================================
     PRODUCT HELPERS
  =================================================== */

  function getProductId(item) {

    return String(
      item.id ||
      item.product_id ||
      item.productId ||
      item.product_code ||
      item.sku ||
      ""
    );

  }


  function getProductName(item) {

    return (
      item.name ||
      item.product_name ||
      "Product"
    );

  }


  function getUnitPrice(item) {

    const discountPrice =
      Number(item.discount_price ?? 0);

    const sellingPrice =
      Number(
        item.selling_price ??
        item.price ??
        0
      );


    if (
      discountPrice > 0 &&
      discountPrice < sellingPrice
    ) {

      return discountPrice;

    }


    return sellingPrice;

  }


  function getStock(item) {

    const value =
      Number(
        item.current_stock ??
        item.stock ??
        item.quantity_available
      );


    if (Number.isFinite(value)) {

      return Math.max(0, value);

    }


    /*
      If stock information is not stored
      inside local cart data, do not
      artificially restrict the quantity.
    */

    return 999999;

  }


  function getImage(item) {

    if (item.image_url) {

      return item.image_url;

    }


    if (
      Array.isArray(item.gallery) &&
      item.gallery.length
    ) {

      const first = item.gallery[0];


      if (typeof first === "string") {

        return first;

      }


      return (
        first?.url ||
        first?.image_url ||
        ""
      );

    }


    return "";

  }


  /* ===================================================
     HEADER CART COUNT
  =================================================== */

  function updateHeaderCount(cart = getCart()) {

    const count =
      cart.reduce(
        (sum, item) =>
          sum +
          Math.max(
            1,
            Number(item.quantity || 1)
          ),
        0
      );


    if ($("headerCartCount")) {

      $("headerCartCount").textContent =
        count;

    }

  }


  /* ===================================================
     TOAST
  =================================================== */

  let toastTimer;


  function toast(message) {

    const element = $("toast");

    if (!element) return;


    element.textContent = message;

    element.classList.add("show");


    clearTimeout(toastTimer);


    toastTimer =
      setTimeout(
        () => {

          element.classList.remove("show");

        },
        2200
      );

  }


  /* ===================================================
     RENDER CART
  =================================================== */

  function renderCart() {

    const cart = getCart();


    updateHeaderCount(cart);


    const isEmpty =
      cart.length === 0;


    $("emptyCart").hidden =
      !isEmpty;


    $("cartContent").hidden =
      isEmpty;


    if (isEmpty) {

      $("cartHeadingText").textContent =
        "Your shopping bag is waiting for some great products.";

      return;

    }


    /* Total quantity */

    const totalQuantity =
      cart.reduce(
        (sum, item) =>
          sum +
          Math.max(
            1,
            Number(item.quantity || 1)
          ),
        0
      );


    $("cartHeadingText").textContent =
      `You have ${totalQuantity} item${
        totalQuantity === 1 ? "" : "s"
      } in your shopping bag.`;


    $("summaryItemCount").textContent =
      `${totalQuantity} item${
        totalQuantity === 1 ? "" : "s"
      }`;


    /* Subtotal */

    let subtotal = 0;


    $("cartItems").innerHTML =
      cart.map(
        (item, index) => {

          const quantity =
            Math.max(
              1,
              Number(item.quantity || 1)
            );


          const unitPrice =
            getUnitPrice(item);


          const lineTotal =
            unitPrice * quantity;


          subtotal += lineTotal;


          const image =
            getImage(item);


          const productName =
            escapeHtml(
              getProductName(item)
            );


          const productCode =
            escapeHtml(
              item.product_code ||
              item.sku ||
              ""
            );


          const brand =
            escapeHtml(
              item.brand || ""
            );


          const stock =
            getStock(item);


          const productId =
            encodeURIComponent(
              getProductId(item)
            );


          return `

            <article
              class="cart-row"
            >


              <!-- Image -->
              <div class="cart-product-image">

                ${
                  image
                    ? `
                      <img
                        src="${escapeHtml(image)}"
                        alt="${productName}"
                        onerror="
                          this.style.display='none';
                          this.nextElementSibling.style.display='flex';
                        "
                      >
                    `
                    : ""
                }

                <i
                  class="bi bi-image"
                  ${
                    image
                      ? 'style="display:none"'
                      : ""
                  }
                ></i>

              </div>


              <!-- Product Info -->
              <div class="cart-product-info">

                <a
                  href="product.html?id=${productId}"
                >
                  ${productName}
                </a>


                <div
                  class="cart-product-meta"
                >

                  ${
                    productCode
                      ? `
                        <span class="code">
                          ${productCode}
                        </span>
                      `
                      : ""
                  }


                  ${
                    brand
                      ? `
                        <span>
                          ${brand}
                        </span>
                      `
                      : ""
                  }


                  ${
                    stock < 999999
                      ? `
                        <span>
                          ${stock} in stock
                        </span>
                      `
                      : ""
                  }

                </div>


                <div class="cart-price">

                  Unit price:

                  <strong>
                    ${money(unitPrice)}
                  </strong>

                </div>

              </div>


              <!-- Quantity -->
              <div
                class="cart-qty"
                aria-label="Quantity"
              >

                <button
                  type="button"
                  data-action="minus"
                  data-index="${index}"
                  ${
                    quantity <= 1
                      ? "disabled"
                      : ""
                  }
                >
                  −
                </button>


                <input
                  type="text"
                  value="${quantity}"
                  readonly
                  aria-label="Quantity"
                >


                <button
                  type="button"
                  data-action="plus"
                  data-index="${index}"
                  ${
                    quantity >= stock
                      ? "disabled"
                      : ""
                  }
                >
                  +
                </button>

              </div>


              <!-- Line Total -->
              <div class="cart-row-total">

                ${money(lineTotal)}

              </div>


              <!-- Remove -->
              <button
                class="remove-item"
                type="button"
                data-action="remove"
                data-index="${index}"
                title="Remove item"
                aria-label="Remove item"
              >

                <i class="bi bi-trash3"></i>

              </button>

            </article>

          `;

        }
      ).join("");


    $("cartSubtotal").textContent =
      money(subtotal);


    /*
      Delivery is deliberately calculated
      at Checkout because the final delivery
      amount depends on the checkout/order
      rules.
    */

    $("cartTotal").textContent =
      money(subtotal);

  }


  /* ===================================================
     QUANTITY
  =================================================== */

  function changeQuantity(
    index,
    amount
  ) {

    const cart = getCart();


    if (!cart[index]) return;


    const current =
      Math.max(
        1,
        Number(
          cart[index].quantity || 1
        )
      );


    const maximum =
      getStock(cart[index]);


    const next =
      Math.max(
        1,
        Math.min(
          maximum,
          current + amount
        )
      );


    if (
      next === current &&
      amount > 0
    ) {

      toast(
        "Maximum available stock reached."
      );

      return;

    }


    cart[index].quantity =
      next;


    saveCart(cart);

    renderCart();

  }


  /* ===================================================
     REMOVE ITEM
  =================================================== */

  function removeItem(index) {

    const cart = getCart();


    if (!cart[index]) return;


    const productName =
      getProductName(
        cart[index]
      );


    cart.splice(
      index,
      1
    );


    saveCart(cart);

    renderCart();


    toast(
      `${productName} removed from cart.`
    );

  }


  /* ===================================================
     CLEAR CART
  =================================================== */

  function clearCart() {

    const cart =
      getCart();


    if (!cart.length) {

      return;

    }


    const confirmed =
      window.confirm(
        "Remove all products from your cart?"
      );


    if (!confirmed) {

      return;

    }


    saveCart([]);

    renderCart();


    toast(
      "Cart cleared."
    );

  }


  /* ===================================================
     CHECKOUT
  =================================================== */

  function goToCheckout() {

    const cart =
      getCart();


    if (!cart.length) {

      toast(
        "Your cart is empty."
      );

      return;

    }


    window.location.href =
      "checkout.html";

  }


  /* ===================================================
     EVENT BINDINGS
  =================================================== */

  function bindEvents() {


    /* Quantity / Remove */

    $("cartItems")
      .addEventListener(
        "click",
        function (event) {

          const button =
            event.target.closest(
              "[data-action]"
            );


          if (!button) return;


          const index =
            Number(
              button.dataset.index
            );


          const action =
            button.dataset.action;


          if (
            action === "minus"
          ) {

            changeQuantity(
              index,
              -1
            );

          }


          if (
            action === "plus"
          ) {

            changeQuantity(
              index,
              1
            );

          }


          if (
            action === "remove"
          ) {

            removeItem(
              index
            );

          }

        }
      );


    /* Clear */

    $("clearCartBtn")
      .addEventListener(
        "click",
        clearCart
      );


    /* Checkout */

    $("checkoutBtn")
      .addEventListener(
        "click",
        goToCheckout
      );


    /* Header Search */

    $("headerSearchForm")
      ?.addEventListener(
        "submit",
        function (event) {

          event.preventDefault();


          const query =
            $("headerSearchInput")
              .value
              .trim();


          if (query) {

            window.location.href =
              "products.html?search=" +
              encodeURIComponent(
                query
              );

          } else {

            window.location.href =
              "products.html";

          }

        }
      );


    /* Mobile menu */

    $("mobileMenuBtn")
      ?.addEventListener(
        "click",
        function () {

          $("mainNav")
            ?.classList
            .toggle("open");

        }
      );


    /* Other browser tabs */

    window.addEventListener(
      "storage",
      function (event) {

        if (
          event.key === CART_KEY
        ) {

          renderCart();

        }

      }
    );


    /* Same-page cart updates */

    window.addEventListener(
      "mxb:cart-updated",
      function () {

        renderCart();

      }
    );

  }


  /* ===================================================
     INIT
  =================================================== */

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      bindEvents();

      renderCart();

    }
  );

})();
