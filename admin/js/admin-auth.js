/* =========================================================
   MIXNBUY.BD — MASTER ADMIN AUTH
   ========================================================= */

(function () {
  "use strict";

  window.MIXNBUY_AUTH =
    window.MIXNBUY_AUTH || {};

  /* =======================================================
     STORAGE KEY
     ======================================================= */

  const STORAGE_KEY =
    "mixnbuy_admin";

  /* =======================================================
     STORAGE HELPERS
     ======================================================= */

  function saveAdmin(admin) {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(admin)
      );
    } catch (error) {
      console.warn(
        "Unable to save admin session:",
        error
      );
    }
  }

  function getAdmin() {
    try {
      const raw =
        sessionStorage.getItem(STORAGE_KEY);

      if (!raw) return null;

      return JSON.parse(raw);
    } catch (error) {
      console.warn(
        "Unable to read admin session:",
        error
      );

      return null;
    }
  }

  function clearAdmin() {
    try {
      sessionStorage.removeItem(
        STORAGE_KEY
      );

      localStorage.removeItem(
        STORAGE_KEY
      );
    } catch (error) {
      console.warn(
        "Unable to clear admin session:",
        error
      );
    }
  }

  MIXNBUY_AUTH.saveAdmin = saveAdmin;
  MIXNBUY_AUTH.getAdmin = getAdmin;
  MIXNBUY_AUTH.clearAdmin = clearAdmin;

  /* =======================================================
     SUPABASE CLIENT
     ======================================================= */

  function getSupabaseClient() {
    if (
      window.supabaseClient &&
      window.supabaseClient.auth
    ) {
      return window.supabaseClient;
    }

    if (
      window.supabase &&
      typeof window.supabase.createClient ===
        "function"
    ) {
      return window.supabase;
    }

    return null;
  }

  /* =======================================================
     GET AUTH USER
     ======================================================= */

  async function getAuthUser() {
    const client =
      getSupabaseClient();

    if (!client) {
      return null;
    }

    try {
      const {
        data,
        error
      } = await client.auth.getUser();

      if (error) {
        console.warn(
          "Auth user error:",
          error.message
        );

        return null;
      }

      return data?.user || null;
    } catch (error) {
      console.warn(
        "Unable to get auth user:",
        error
      );

      return null;
    }
  }

  MIXNBUY_AUTH.getAuthUser =
    getAuthUser;

  /* =======================================================
     GET ADMIN PROFILE
     ======================================================= */

  async function getAdminProfile(userId) {
    const client =
      getSupabaseClient();

    if (!client || !userId) {
      return null;
    }

    try {
      const {
        data,
        error
      } = await client
        .from("admins")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn(
          "Admin profile error:",
          error.message
        );

        return null;
      }

      return data || null;
    } catch (error) {
      console.warn(
        "Unable to load admin profile:",
        error
      );

      return null;
    }
  }

  MIXNBUY_AUTH.getAdminProfile =
    getAdminProfile;

  /* =======================================================
     GET USER PROFILE
     ======================================================= */

  async function getUserProfile(userId) {
    const client =
      getSupabaseClient();

    if (!client || !userId) {
      return null;
    }

    try {
      const {
        data,
        error
      } = await client
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn(
          "Profile error:",
          error.message
        );

        return null;
      }

      return data || null;
    } catch (error) {
      console.warn(
        "Unable to load profile:",
        error
      );

      return null;
    }
  }

  MIXNBUY_AUTH.getUserProfile =
    getUserProfile;

  /* =======================================================
     CHECK ADMIN
     ======================================================= */

  async function checkAdmin() {
    const user =
      await getAuthUser();

    if (!user) {
      return {
        authenticated: false,
        user: null,
        admin: null,
        profile: null
      };
    }

    const admin =
      await getAdminProfile(
        user.id
      );

    if (!admin) {
      return {
        authenticated: true,
        authorized: false,
        user,
        admin: null,
        profile: null
      };
    }

    const profile =
      await getUserProfile(
        user.id
      );

    const result = {
      authenticated: true,
      authorized: true,
      user,
      admin,
      profile
    };

    saveAdmin({
      ...admin,
      ...profile,
      email: user.email,
      user_id: user.id
    });

    return result;
  }

  MIXNBUY_AUTH.checkAdmin =
    checkAdmin;

  /* =======================================================
     PERMISSION MAP
     ======================================================= */

  const permissionMap = {
    dashboard: null,

    purchases:
      "can_manage_purchases",

    stock:
      "can_manage_stock",

    sales:
      "can_manage_sales",

    orders:
      "can_manage_orders",

    customers:
      "can_manage_customers",

    coupons:
      "can_manage_coupons",

    products:
      "can_manage_products",

    suppliers:
      "can_manage_purchases",

    returns:
      "can_manage_returns",

    reports:
      "can_manage_reports",

    analysis:
      "can_manage_reports",

    profit_loss:
      "can_manage_reports",

    settings:
      "can_manage_settings",

    activity_logs:
      "can_manage_settings"
  };

  MIXNBUY_AUTH.permissionMap =
    permissionMap;

  /* =======================================================
     HAS PERMISSION
     ======================================================= */

  function hasPermission(
    admin,
    permission
  ) {
    if (!admin) return false;

    if (
      admin.role === "super_admin"
    ) {
      return true;
    }

    if (!permission) {
      return true;
    }

    return admin[permission] === true;
  }

  MIXNBUY_AUTH.hasPermission =
    hasPermission;

  /* =======================================================
     PAGE PERMISSION
     ======================================================= */

  function getPagePermission(
    pageName
  ) {
    return (
      permissionMap[
        String(pageName || "")
          .toLowerCase()
      ] ?? null
    );
  }

  MIXNBUY_AUTH.getPagePermission =
    getPagePermission;

  /* =======================================================
     PAGE ACCESS
     ======================================================= */

  async function requireAdmin(options = {}) {
    const {
      loginPage = "login.html",
      permission = null,
      redirectUnauthorized = "dashboard.html"
    } = options;

    const result =
      await checkAdmin();

    if (
      !result.authenticated
    ) {
      window.location.replace(
        loginPage
      );

      return false;
    }

    if (
      result.authorized === false
    ) {
      showUnauthorized(
        redirectUnauthorized
      );

      return false;
    }

    if (
      permission &&
      !hasPermission(
        result.admin,
        permission
      )
    ) {
      showUnauthorized(
        redirectUnauthorized
      );

      return false;
    }

    return true;
  }

  MIXNBUY_AUTH.requireAdmin =
    requireAdmin;

  /* =======================================================
     UNAUTHORIZED
     ======================================================= */

  function showUnauthorized(
    redirectPage = "dashboard.html"
  ) {
    if (
      window.MIXNBUY_ADMIN &&
      typeof window.MIXNBUY_ADMIN.toast ===
        "function"
    ) {
      window.MIXNBUY_ADMIN.toast(
        "You do not have permission to access this page.",
        "error"
      );

      setTimeout(() => {
        window.location.href =
          redirectPage;
      }, 800);
    } else {
      window.location.href =
        redirectPage;
    }
  }

  MIXNBUY_AUTH.showUnauthorized =
    showUnauthorized;

  /* =======================================================
     LOGOUT
     ======================================================= */

  async function logout() {
    const client =
      getSupabaseClient();

    try {
      if (
        client &&
        client.auth &&
        typeof client.auth.signOut ===
          "function"
      ) {
        const {
          error
        } =
          await client.auth.signOut();

        if (error) {
          console.warn(
            "Supabase signOut error:",
            error.message
          );
        }
      }
    } catch (error) {
      console.warn(
        "Logout error:",
        error
      );
    }

    clearAdmin();

    window.location.href =
      "login.html";
  }

  MIXNBUY_AUTH.logout =
    logout;

  /* =======================================================
     LOGIN
     ======================================================= */

  async function login(
    email,
    password
  ) {
    const client =
      getSupabaseClient();

    if (!client) {
      throw new Error(
        "Supabase client is not initialized."
      );
    }

    if (!email || !password) {
      throw new Error(
        "Email and password are required."
      );
    }

    const {
      data,
      error
    } =
      await client.auth.signInWithPassword({
        email: String(email)
          .trim()
          .toLowerCase(),
        password: String(password)
      });

    if (error) {
      throw new Error(
        error.message ||
          "Login failed."
      );
    }

    if (!data?.user) {
      throw new Error(
        "Unable to create authenticated session."
      );
    }

    const admin =
      await getAdminProfile(
        data.user.id
      );

    if (!admin) {
      await client.auth.signOut();

      throw new Error(
        "This account is not authorized as an administrator."
      );
    }

    const profile =
      await getUserProfile(
        data.user.id
      );

    saveAdmin({
      ...admin,
      ...profile,
      email: data.user.email,
      user_id: data.user.id
    });

    return {
      user: data.user,
      admin,
      profile
    };
  }

  MIXNBUY_AUTH.login =
    login;

  /* =======================================================
     AUTH STATE LISTENER
     ======================================================= */

  function watchAuthState(
    callback
  ) {
    const client =
      getSupabaseClient();

    if (
      !client ||
      !client.auth
    ) {
      return null;
    }

    return client.auth.onAuthStateChange(
      async (
        event,
        session
      ) => {
        if (
          typeof callback ===
          "function"
        ) {
          callback(
            event,
            session
          );
        }
      }
    );
  }

  MIXNBUY_AUTH.watchAuthState =
    watchAuthState;

  /* =======================================================
     AUTO AUTH CHECK
     ======================================================= */

  async function autoProtectPage() {
    const fileName =
      window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();

    if (
      !fileName ||
      fileName === "login.html" ||
      fileName === "index.html"
    ) {
      return;
    }

    const protectedPages = [
      "dashboard.html",
      "purchases.html",
      "sales.html",
      "sales-return.html",
      "orders.html",
      "order-status.html",
      "stock.html",
      "suppliers.html",
      "products.html",
      "customers.html",
      "coupons.html",
      "reports.html",
      "analysis.html",
      "profit-loss.html",
      "settings.html",
      "activity-logs.html"
    ];

    if (
      !protectedPages.includes(
        fileName
      )
    ) {
      return;
    }

    const permissionByPage = {
      "purchases.html":
        "can_manage_purchases",

      "sales.html":
        "can_manage_sales",

      "sales-return.html":
        "can_manage_returns",

      "orders.html":
        "can_manage_orders",

      "order-status.html":
        "can_manage_orders",

      "stock.html":
        "can_manage_stock",

      "suppliers.html":
        "can_manage_purchases",

      "products.html":
        "can_manage_products",

      "customers.html":
        "can_manage_customers",

      "coupons.html":
        "can_manage_coupons",

      "reports.html":
        "can_manage_reports",

      "analysis.html":
        "can_manage_reports",

      "profit-loss.html":
        "can_manage_reports",

      "settings.html":
        "can_manage_settings",

      "activity-logs.html":
        "can_manage_settings"
    };

    await requireAdmin({
      permission:
        permissionByPage[
          fileName
        ] || null
    });
  }

  /* =======================================================
     INITIALIZATION
     ======================================================= */

  async function init() {
    await autoProtectPage();
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