/* =========================================================
   MIXNBUY.BD
   MASTER ADMIN JS
   ========================================================= */

(function () {

  "use strict";


  /* =======================================================
     GLOBAL OBJECT
     ======================================================= */

  window.MIXNBUY_ADMIN =
    window.MIXNBUY_ADMIN || {};


  /* =======================================================
     DOM HELPERS
     ======================================================= */

  const $ = (
    selector,
    parent = document
  ) => parent.querySelector(selector);


  const $$ = (
    selector,
    parent = document
  ) => [...parent.querySelectorAll(selector)];


  MIXNBUY_ADMIN.$ = $;
  MIXNBUY_ADMIN.$$ = $$;


  /* =======================================================
     SIDEBAR
     ======================================================= */

  function openSidebar() {

    const sidebar =
      $("#adminSidebar");

    const overlay =
      $("#sidebarOverlay");

    if (sidebar) {
      sidebar.classList.add("open");
    }

    if (overlay) {
      overlay.classList.add("active");
    }

    document.body.classList.add(
      "sidebar-open"
    );
  }


  function closeSidebar() {

    const sidebar =
      $("#adminSidebar");

    const overlay =
      $("#sidebarOverlay");

    if (sidebar) {
      sidebar.classList.remove("open");
    }

    if (overlay) {
      overlay.classList.remove("active");
    }

    document.body.classList.remove(
      "sidebar-open"
    );
  }


  function toggleSidebar() {

    const sidebar =
      $("#adminSidebar");

    if (!sidebar) return;

    if (
      sidebar.classList.contains("open")
    ) {

      closeSidebar();

    } else {

      openSidebar();

    }
  }


  function initSidebar() {

    const button =
      $("#mobileSidebarBtn");

    if (button) {

      button.addEventListener(
        "click",
        toggleSidebar
      );

    }


    const overlay =
      $("#sidebarOverlay");

    if (overlay) {

      overlay.addEventListener(
        "click",
        closeSidebar
      );

    }


    $$(".sidebar-link").forEach(
      (link) => {

        link.addEventListener(
          "click",
          () => {

            if (
              window.innerWidth <= 900
            ) {

              closeSidebar();

            }

          }
        );

      }
    );


    window.addEventListener(
      "resize",
      () => {

        if (
          window.innerWidth > 900
        ) {

          closeSidebar();

        }

      }
    );
  }


  MIXNBUY_ADMIN.openSidebar =
    openSidebar;

  MIXNBUY_ADMIN.closeSidebar =
    closeSidebar;


  /* =======================================================
     ACTIVE MENU
     ======================================================= */

  function setActiveMenu() {

    let currentPage =
      window.location.pathname
        .split("/")
        .pop();


    if (!currentPage) {

      currentPage =
        "dashboard.html";

    }


    $$(".sidebar-link").forEach(
      (link) => {

        const href =
          link.getAttribute("href");

        if (
          !href ||
          href === "#" ||
          href.startsWith("http")
        ) {

          return;

        }


        const page =
          href.split("/").pop();


        link.classList.toggle(
          "active",
          page === currentPage
        );

      }
    );
  }


  MIXNBUY_ADMIN.setActiveMenu =
    setActiveMenu;


  /* =======================================================
     PAGE TITLE
     ======================================================= */

  function setPageTitle(
    title,
    subtitle = ""
  ) {

    const titleEl =
      $("#pageTitle");

    const subtitleEl =
      $("#pageSubtitle");


    if (
      titleEl &&
      title
    ) {

      titleEl.textContent =
        title;

    }


    if (subtitleEl) {

      subtitleEl.textContent =
        subtitle;

    }


    if (title) {

      document.title =
        `${title} | MIXNBUY.BD Admin`;

    }
  }


  MIXNBUY_ADMIN.setPageTitle =
    setPageTitle;


  /* =======================================================
     ADMIN PROFILE
     ======================================================= */

  function getStoredAdmin() {

    try {

      const raw =
        sessionStorage.getItem(
          "mixnbuy_admin"
        );


      if (!raw) {

        return null;

      }


      return JSON.parse(raw);

    } catch (error) {

      console.warn(
        "Admin session read error:",
        error
      );

      return null;

    }
  }


  function renderAdminProfile() {

    const admin =
      getStoredAdmin();

    if (!admin) return;


    const name =
      admin.full_name ||
      admin.name ||
      admin.email ||
      "Admin";


    const role =
      admin.role ||
      "Administrator";


    const nameEl =
      $("#adminName");

    const roleEl =
      $("#adminRole");

    const avatarEl =
      $("#adminAvatar");


    if (nameEl) {

      nameEl.textContent =
        name;

    }


    if (roleEl) {

      roleEl.textContent =
        String(role)
          .replaceAll("_", " ");

    }


    if (avatarEl) {

      const initials =
        name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map(
            part =>
              part.charAt(0)
          )
          .join("")
          .toUpperCase();


      avatarEl.textContent =
        initials || "AD";

    }
  }


  MIXNBUY_ADMIN.getStoredAdmin =
    getStoredAdmin;

  MIXNBUY_ADMIN.renderAdminProfile =
    renderAdminProfile;


  /* =======================================================
     TOAST
     ======================================================= */

  function getToastContainer() {

    let container =
      $(".toast-container");


    if (!container) {

      container =
        document.createElement("div");

      container.className =
        "toast-container";

      document.body.appendChild(
        container
      );

    }


    return container;
  }


  function toast(
    message,
    type = "success",
    duration = 3500
  ) {

    const container =
      getToastContainer();


    const item =
      document.createElement("div");


    item.className =
      `toast ${type}`;


    let icon =
      "bi-info-circle";


    if (
      type === "success"
    ) {

      icon =
        "bi-check-circle";

    }


    if (
      type === "error"
    ) {

      icon =
        "bi-x-circle";

    }


    if (
      type === "warning"
    ) {

      icon =
        "bi-exclamation-triangle";

    }


    item.innerHTML = `

      <i class="bi ${icon} toast-icon"></i>

      <div class="toast-message"></div>

      <button
        type="button"
        class="toast-close"
        aria-label="Close"
      >
        <i class="bi bi-x"></i>
      </button>

    `;


    const messageEl =
      $(".toast-message", item);


    if (messageEl) {

      messageEl.textContent =
        message || "Done.";

    }


    const close =
      $(".toast-close", item);


    if (close) {

      close.addEventListener(
        "click",
        () => item.remove()
      );

    }


    container.appendChild(item);


    setTimeout(
      () => {

        if (
          item &&
          item.parentNode
        ) {

          item.remove();

        }

      },
      duration
    );
  }


  MIXNBUY_ADMIN.toast =
    toast;


  /* =======================================================
     CONFIRM
     ======================================================= */

  function confirmAction(
    message,
    callback
  ) {

    const result =
      window.confirm(
        message ||
        "Are you sure?"
      );


    if (
      result &&
      typeof callback ===
        "function"
    ) {

      callback();

    }


    return result;
  }


  MIXNBUY_ADMIN.confirm =
    confirmAction;


  /* =======================================================
     LOADING BUTTON
     ======================================================= */

  function setLoading(
    button,
    loading,
    loadingText = "Loading..."
  ) {

    if (!button) return;


    if (loading) {

      if (
        !button.dataset.originalHtml
      ) {

        button.dataset.originalHtml =
          button.innerHTML;

      }


      button.disabled = true;


      button.innerHTML = `

        <i class="bi bi-arrow-repeat"></i>
        ${loadingText}

      `;

    } else {

      if (
        button.dataset.originalHtml
      ) {

        button.innerHTML =
          button.dataset.originalHtml;

      }


      button.disabled = false;

    }
  }


  MIXNBUY_ADMIN.setLoading =
    setLoading;


  /* =======================================================
     FORMAT MONEY
     ======================================================= */

  function formatMoney(
    value,
    currency = "BDT"
  ) {

    const number =
      Number(value || 0);


    if (
      currency === "BDT"
    ) {

      return (
        "BDT " +
        new Intl.NumberFormat(
          "en-BD",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }
        ).format(number)
      );

    }


    try {

      return new Intl.NumberFormat(
        "en-US",
        {
          style: "currency",
          currency
        }
      ).format(number);

    } catch {

      return `${currency} ${number.toFixed(2)}`;

    }
  }


  MIXNBUY_ADMIN.formatMoney =
    formatMoney;


  /* =======================================================
     NUMBER
     ======================================================= */

  function formatNumber(
    value,
    decimals = 0
  ) {

    return new Intl.NumberFormat(
      "en-BD",
      {
        minimumFractionDigits:
          decimals,

        maximumFractionDigits:
          decimals
      }
    ).format(
      Number(value || 0)
    );
  }


  MIXNBUY_ADMIN.formatNumber =
    formatNumber;


  /* =======================================================
     DATE
     ======================================================= */

  function formatDate(value) {

    if (!value) return "-";


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return String(value);

    }


    return new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    ).format(date);
  }


  MIXNBUY_ADMIN.formatDate =
    formatDate;


  /* =======================================================
     DATETIME
     ======================================================= */

  function formatDateTime(value) {

    if (!value) return "-";


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return String(value);

    }


    return new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",

        hour: "2-digit",
        minute: "2-digit"
      }
    ).format(date);
  }


  MIXNBUY_ADMIN.formatDateTime =
    formatDateTime;


  /* =======================================================
     ESCAPE HTML
     ======================================================= */

  function escapeHtml(value) {

    if (
      value === null ||
      value === undefined
    ) {

      return "";

    }


    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  MIXNBUY_ADMIN.escapeHtml =
    escapeHtml;


  /* =======================================================
     STATUS BADGE
     ======================================================= */

  function statusBadge(status) {

    const value =
      String(
        status || "unknown"
      )
      .trim()
      .toLowerCase();


    let type =
      "gray";


    if (
      [
        "active",
        "completed",
        "delivered",
        "paid",
        "confirmed",
        "success"
      ].includes(value)
    ) {

      type =
        "success";

    }


    if (
      [
        "pending",
        "processing",
        "draft",
        "partial",
        "shipped"
      ].includes(value)
    ) {

      type =
        "warning";

    }


    if (
      [
        "cancelled",
        "canceled",
        "returned",
        "inactive",
        "failed",
        "overdue"
      ].includes(value)
    ) {

      type =
        "danger";

    }


    const label =
      value
        .replaceAll("_", " ")
        .replace(
          /\b\w/g,
          char =>
            char.toUpperCase()
        );


    return `
      <span class="badge badge-${type}">
        ${escapeHtml(label)}
      </span>
    `;
  }


  MIXNBUY_ADMIN.statusBadge =
    statusBadge;


  /* =======================================================
     QUERY PARAM
     ======================================================= */

  function getQueryParam(name) {

    const params =
      new URLSearchParams(
        window.location.search
      );


    return params.get(name);
  }


  MIXNBUY_ADMIN.getQueryParam =
    getQueryParam;


  /* =======================================================
     EMPTY TABLE
     ======================================================= */

  function tableEmpty(
    colspan,
    message = "No data found."
  ) {

    return `
      <tr>

        <td colspan="${colspan}">

          <div class="empty-state">

            <i class="bi bi-inbox"></i>

            <div>
              ${escapeHtml(message)}
            </div>

          </div>

        </td>

      </tr>
    `;
  }


  MIXNBUY_ADMIN.tableEmpty =
    tableEmpty;


  /* =======================================================
     ERROR
     ======================================================= */

  function showError(
    container,
    message = "Unable to load data."
  ) {

    if (!container) return;


    container.innerHTML = `

      <div class="error-state">

        <i class="bi bi-exclamation-circle"></i>

        <div>
          ${escapeHtml(message)}
        </div>

      </div>

    `;
  }


  MIXNBUY_ADMIN.showError =
    showError;


  /* =======================================================
     LOADING
     ======================================================= */

  function showLoading(
    container,
    message = "Loading..."
  ) {

    if (!container) return;


    container.innerHTML = `

      <div class="loading-state">

        <i class="bi bi-arrow-repeat"></i>

        <div>
          ${escapeHtml(message)}
        </div>

      </div>

    `;
  }


  MIXNBUY_ADMIN.showLoading =
    showLoading;


  /* =======================================================
     LOGOUT
     ======================================================= */

  function bindLogout() {

    $$(
      ".admin-logout, [data-admin-logout]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          async event => {

            event.preventDefault();


            const confirm =
              window.confirm(
                "Are you sure you want to logout?"
              );


            if (!confirm) return;


            try {

              if (
                window.MIXNBUY_AUTH &&
                typeof
                  window.MIXNBUY_AUTH.logout ===
                    "function"
              ) {

                await
                  window.MIXNBUY_AUTH.logout();

                return;

              }


              if (
                window.supabaseClient &&
                window.supabaseClient.auth
              ) {

                await
                  window.supabaseClient.auth
                    .signOut();

              }

            } catch (error) {

              console.warn(
                "Logout error:",
                error
              );

            }


            try {

              sessionStorage.removeItem(
                "mixnbuy_admin"
              );

              localStorage.removeItem(
                "mixnbuy_admin"
              );

            } catch {}


            window.location.href =
              "login.html";

          }
        );

      }
    );
  }


  /* =======================================================
     ESCAPE KEY
     ======================================================= */

  function bindEscapeKey() {

    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Escape"
        ) {

          closeSidebar();

        }

      }
    );
  }


  /* =======================================================
     INIT
     ======================================================= */

  function init() {

    initSidebar();

    setActiveMenu();

    renderAdminProfile();

    bindLogout();

    bindEscapeKey();

    document.documentElement.classList.add(
      "admin-ready"
    );
  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  } else {

    init();

  }

})();