/* =========================================================
   MIXNBUY.BD
   ADMIN LOGIN
   admin/js/login.js
   ========================================================= */

(function () {
    "use strict";


    /* =====================================================
       CONFIG
       ===================================================== */

    const DASHBOARD_URL = "dashboard.html";


    /* =====================================================
       STATE
       ===================================================== */

    const loginState = {
        loading: false
    };


    /* =====================================================
       DOM
       ===================================================== */

    function $(id) {
        return document.getElementById(id);
    }


    /* =====================================================
       SUPABASE CLIENT
       ===================================================== */

    function getClient() {

        if (
            window.getClient &&
            typeof window.getClient === "function"
        ) {
            return window.getClient();
        }

        if (window.supabaseClient) {
            return window.supabaseClient;
        }

        if (window.sb) {
            return window.sb;
        }

        throw new Error(
            "Supabase client is not available."
        );
    }


    /* =====================================================
       AUTH STORAGE
       ===================================================== */

    function getRememberMe() {

        const checkbox =
            $("rememberMe");

        return checkbox
            ? checkbox.checked
            : true;
    }


    function saveLoginPreference(identifier) {

        try {

            if (getRememberMe()) {

                localStorage.setItem(
                    "mixnbuy_admin_login",
                    identifier
                );

                localStorage.setItem(
                    "mixnbuy_remember_me",
                    "true"
                );

            } else {

                localStorage.removeItem(
                    "mixnbuy_admin_login"
                );

                localStorage.removeItem(
                    "mixnbuy_remember_me"
                );
            }

        } catch (error) {

            console.warn(
                "Could not save login preference:",
                error
            );
        }
    }


    function loadLoginPreference() {

        try {

            const remember =
                localStorage.getItem(
                    "mixnbuy_remember_me"
                );

            const identifier =
                localStorage.getItem(
                    "mixnbuy_admin_login"
                );

            const checkbox =
                $("rememberMe");

            const input =
                $("loginIdentifier");

            if (checkbox) {
                checkbox.checked =
                    remember === "true";
            }

            if (
                input &&
                remember === "true" &&
                identifier
            ) {
                input.value = identifier;
            }

        } catch (error) {

            console.warn(
                "Could not load login preference:",
                error
            );
        }
    }


    /* =====================================================
       MESSAGE
       ===================================================== */

    function showMessage(
        message,
        type = "error"
    ) {

        const box =
            $("loginMessage");

        if (!box) {
            console[type === "error"
                ? "error"
                : "log"](message);

            return;
        }


        const icon =
            box.querySelector("i");


        box.className =
            "login-message show " +
            type;


        if (icon) {

            icon.className =
                type === "success"
                    ? "bi bi-check-circle-fill"
                    : type === "warning"
                        ? "bi bi-exclamation-triangle-fill"
                        : type === "info"
                            ? "bi bi-info-circle-fill"
                            : "bi bi-exclamation-circle-fill";
        }


        const text =
            box.querySelector(
                ".login-message-text"
            );


        if (text) {

            text.textContent =
                message;

        } else {

            const iconHtml =
                icon
                    ? icon.outerHTML
                    : "";

            box.innerHTML = `
                ${iconHtml}
                <span class="login-message-text">
                    ${escapeHtml(message)}
                </span>
            `;
        }
    }


    function hideMessage() {

        const box =
            $("loginMessage");

        if (!box) {
            return;
        }

        box.classList.remove("show");
    }


    /* =====================================================
       ESCAPE HTML
       ===================================================== */

    function escapeHtml(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =====================================================
       FIELD ERROR
       ===================================================== */

    function clearFieldErrors() {

        document
            .querySelectorAll(
                ".form-control.is-invalid"
            )
            .forEach(function (element) {

                element.classList.remove(
                    "is-invalid"
                );
            });


        document
            .querySelectorAll(
                ".field-error.show"
            )
            .forEach(function (element) {

                element.classList.remove(
                    "show"
                );
            });
    }


    function fieldError(
        input,
        message
    ) {

        if (!input) {
            return false;
        }

        input.classList.add(
            "is-invalid"
        );


        const errorId =
            input.id +
            "Error";


        const error =
            $(errorId);


        if (error) {

            error.textContent =
                message;

            error.classList.add(
                "show"
            );
        }

        return false;
    }


    /* =====================================================
       VALIDATION
       ===================================================== */

    function validateForm() {

        clearFieldErrors();
        hideMessage();


        const identifier =
            $("loginIdentifier");

        const password =
            $("loginPassword");


        if (!identifier) {

            showMessage(
                "Login field is missing.",
                "error"
            );

            return false;
        }


        if (!password) {

            showMessage(
                "Password field is missing.",
                "error"
            );

            return false;
        }


        const identifierValue =
            identifier.value.trim();

        const passwordValue =
            password.value;


        if (!identifierValue) {

            fieldError(
                identifier,
                "Enter your username or email."
            );

            identifier.focus();

            return false;
        }


        if (!passwordValue) {

            fieldError(
                password,
                "Enter your password."
            );

            password.focus();

            return false;
        }


        if (passwordValue.length < 6) {

            fieldError(
                password,
                "Password must be at least 6 characters."
            );

            password.focus();

            return false;
        }


        return true;
    }


    /* =====================================================
       BUTTON LOADING
       ===================================================== */

    function setButtonLoading(
        loading
    ) {

        loginState.loading =
            loading;


        const button =
            $("loginBtn");

        if (!button) {
            return;
        }


        button.disabled =
            loading;


        if (loading) {

            button.classList.add(
                "loading"
            );


            button.innerHTML = `
                <span class="spinner"></span>
                <span>Signing In...</span>
            `;

        } else {

            button.classList.remove(
                "loading"
            );


            button.innerHTML = `
                <i class="bi bi-box-arrow-in-right"></i>
                <span>Sign In</span>
            `;
        }
    }


    /* =====================================================
       PAGE LOADER
       ===================================================== */

    function showPageLoader(
        message = "Checking session..."
    ) {

        const loader =
            $("loginLoader");

        if (!loader) {
            return;
        }


        const text =
            loader.querySelector(
                ".login-loader-text"
            );


        if (text) {
            text.textContent =
                message;
        }


        loader.classList.add(
            "show"
        );
    }


    function hidePageLoader() {

        const loader =
            $("loginLoader");

        if (!loader) {
            return;
        }

        loader.classList.remove(
            "show"
        );
    }


    /* =====================================================
       GET CURRENT USER
       ===================================================== */

    async function getCurrentUser(
        client
    ) {

        const result =
            await client.auth.getUser();


        if (result.error) {
            return null;
        }


        return result.data &&
            result.data.user
            ? result.data.user
            : null;
    }


    /* =====================================================
       FIND ADMIN
       ===================================================== */

    async function getAdminRecord(
        client,
        userId
    ) {

        if (!userId) {
            return null;
        }


        const result =
            await client
                .from("admins")
                .select("*")
                .eq("user_id", userId)
                .limit(1)
                .maybeSingle();


        if (result.error) {

            console.error(
                "Admin query error:",
                result.error
            );

            return null;
        }


        return result.data || null;
    }


    /* =====================================================
       CHECK ADMIN
       ===================================================== */

    async function checkAdminAccess(
        client,
        user
    ) {

        if (!user) {

            return {
                allowed: false,
                admin: null,
                reason: "No authenticated user."
            };
        }


        const admin =
            await getAdminRecord(
                client,
                user.id
            );


        if (!admin) {

            return {
                allowed: false,
                admin: null,
                reason:
                    "This account does not have administrator access."
            };
        }


        const status =
            String(
                admin.status || ""
            ).toLowerCase();


        if (
            status &&
            status !== "active"
        ) {

            return {
                allowed: false,
                admin: admin,
                reason:
                    "Your administrator account is inactive."
            };
        }


        return {
            allowed: true,
            admin: admin,
            reason: ""
        };
    }


    /* =====================================================
       SAVE ADMIN SESSION DATA
       ===================================================== */

    function saveAdminSession(
        user,
        admin
    ) {

        try {

            const sessionData = {

                userId:
                    user.id,

                email:
                    user.email || "",

                adminId:
                    admin.id || "",

                role:
                    admin.role || "admin",

                status:
                    admin.status || "active",

                permissions: {

                    products:
                        !!admin.can_manage_products,

                    purchases:
                        !!admin.can_manage_purchases,

                    stock:
                        !!admin.can_manage_stock,

                    sales:
                        !!admin.can_manage_sales,

                    orders:
                        !!admin.can_manage_orders,

                    customers:
                        !!admin.can_manage_customers,

                    coupons:
                        !!admin.can_manage_coupons,

                    returns:
                        !!admin.can_manage_returns,

                    reports:
                        !!admin.can_manage_reports,

                    settings:
                        !!admin.can_manage_settings
                },

                loginAt:
                    new Date().toISOString()
            };


            sessionStorage.setItem(
                "mixnbuy_admin_session",
                JSON.stringify(
                    sessionData
                )
            );


            /*
             * Compatibility keys
             */

            sessionStorage.setItem(
                "adminUser",
                JSON.stringify(
                    sessionData
                )
            );


            sessionStorage.setItem(
                "admin_id",
                admin.id || ""
            );


            sessionStorage.setItem(
                "admin_role",
                admin.role || "admin"
            );

        } catch (error) {

            console.warn(
                "Could not save admin session:",
                error
            );
        }
    }


    /* =====================================================
       LOGIN
       ===================================================== */

    async function login() {

        if (loginState.loading) {
            return;
        }


        if (!validateForm()) {
            return;
        }


        const client =
            getClient();


        const identifier =
            $("loginIdentifier")
                .value
                .trim();


        const password =
            $("loginPassword")
                .value;


        setButtonLoading(true);


        try {

            let email =
                identifier;


            /*
             * -------------------------------------------------
             * STEP 1
             * If identifier is not an email, try to find
             * the user's email from profiles.
             * -------------------------------------------------
             */

            if (
                !identifier.includes("@")
            ) {

                const profileResult =
                    await client
                        .from("profiles")
                        .select(
                            "id,email,username"
                        )
                        .or(
                            `username.eq.${identifier},email.eq.${identifier}`
                        )
                        .limit(1)
                        .maybeSingle();


                if (
                    profileResult.data &&
                    profileResult.data.email
                ) {

                    email =
                        profileResult
                            .data
                            .email;

                } else {

                    /*
                     * Some projects use admins.email.
                     * Try that as a fallback.
                     */

                    const adminResult =
                        await client
                            .from("admins")
                            .select(
                                "email,username"
                            )
                            .or(
                                `username.eq.${identifier},email.eq.${identifier}`
                            )
                            .limit(1)
                            .maybeSingle();


                    if (
                        adminResult.data &&
                        adminResult.data.email
                    ) {

                        email =
                            adminResult
                                .data
                                .email;

                    } else {

                        throw new Error(
                            "Username could not be matched to an email address."
                        );
                    }
                }
            }


            /*
             * -------------------------------------------------
             * STEP 2
             * Supabase Authentication
             * -------------------------------------------------
             */

            const authResult =
                await client.auth.signInWithPassword({

                    email:
                        email,

                    password:
                        password
                });


            if (authResult.error) {
                throw authResult.error;
            }


            const user =
                authResult.data &&
                authResult.data.user
                    ? authResult.data.user
                    : null;


            if (!user) {

                throw new Error(
                    "Login succeeded but user information was not returned."
                );
            }


            /*
             * -------------------------------------------------
             * STEP 3
             * Verify admin
             * -------------------------------------------------
             */

            const adminCheck =
                await checkAdminAccess(
                    client,
                    user
                );


            if (!adminCheck.allowed) {

                await client.auth.signOut();

                throw new Error(
                    adminCheck.reason
                );
            }


            /*
             * -------------------------------------------------
             * STEP 4
             * Save session
             * -------------------------------------------------
             */

            saveAdminSession(
                user,
                adminCheck.admin
            );


            saveLoginPreference(
                identifier
            );


            /*
             * -------------------------------------------------
             * STEP 5
             * Success
             * -------------------------------------------------
             */

            showMessage(
                "Login successful. Redirecting...",
                "success"
            );


            setButtonLoading(
                false
            );


            showPageLoader(
                "Opening dashboard..."
            );


            setTimeout(
                function () {

                    window.location.href =
                        DASHBOARD_URL;

                },
                500
            );


        } catch (error) {

            console.error(
                "Admin login error:",
                error
            );


            let message =
                "Unable to sign in. Please check your credentials.";


            if (error) {

                const errorMessage =
                    String(
                        error.message ||
                        error.error_description ||
                        ""
                    );


                if (
                    errorMessage
                        .toLowerCase()
                        .includes(
                            "invalid login credentials"
                        )
                ) {

                    message =
                        "Invalid email/username or password.";

                } else if (
                    errorMessage
                        .toLowerCase()
                        .includes(
                            "email not confirmed"
                        )
                ) {

                    message =
                        "Your email address has not been confirmed.";

                } else if (
                    errorMessage
                        .toLowerCase()
                        .includes(
                            "too many requests"
                        )
                ) {

                    message =
                        "Too many login attempts. Please try again later.";

                } else if (
                    errorMessage
                ) {

                    message =
                        errorMessage;
                }
            }


            showMessage(
                message,
                "error"
            );


            setButtonLoading(
                false
            );
        }
    }


    /* =====================================================
       CHECK EXISTING SESSION
       ===================================================== */

    async function checkExistingSession() {

        try {

            const client =
                getClient();


            const user =
                await getCurrentUser(
                    client
                );


            if (!user) {

                hidePageLoader();

                return;
            }


            const adminCheck =
                await checkAdminAccess(
                    client,
                    user
                );


            if (
                adminCheck.allowed
            ) {

                saveAdminSession(
                    user,
                    adminCheck.admin
                );


                showPageLoader(
                    "Already signed in. Opening dashboard..."
                );


                window.location.href =
                    DASHBOARD_URL;

                return;
            }


            /*
             * Authenticated but not admin.
             */

            await client.auth.signOut();

            hidePageLoader();

            showMessage(
                adminCheck.reason ||
                "This account does not have admin access.",
                "error"
            );


        } catch (error) {

            console.error(
                "Session check error:",
                error
            );

            hidePageLoader();
        }
    }


    /* =====================================================
       PASSWORD TOGGLE
       ===================================================== */

    function setupPasswordToggle() {

        const button =
            $("passwordToggle");

        const input =
            $("loginPassword");


        if (
            !button ||
            !input
        ) {
            return;
        }


        button.addEventListener(
            "click",
            function () {

                const isPassword =
                    input.type === "password";


                input.type =
                    isPassword
                        ? "text"
                        : "password";


                const icon =
                    button.querySelector(
                        "i"
                    );


                if (icon) {

                    icon.className =
                        isPassword
                            ? "bi bi-eye-slash"
                            : "bi bi-eye";
                }


                button.setAttribute(
                    "aria-label",
                    isPassword
                        ? "Hide password"
                        : "Show password"
                );
            }
        );
    }


    /* =====================================================
       INPUT VALIDATION EVENTS
       ===================================================== */

    function setupInputEvents() {

        const identifier =
            $("loginIdentifier");

        const password =
            $("loginPassword");


        if (identifier) {

            identifier.addEventListener(
                "input",
                function () {

                    identifier.classList.remove(
                        "is-invalid"
                    );

                    hideMessage();
                }
            );
        }


        if (password) {

            password.addEventListener(
                "input",
                function () {

                    password.classList.remove(
                        "is-invalid"
                    );

                    hideMessage();
                }
            );
        }
    }


    /* =====================================================
       FORM SUBMIT
       ===================================================== */

    function setupForm() {

        const form =
            $("loginForm");


        if (!form) {

            console.error(
                "loginForm not found."
            );

            return;
        }


        form.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();

                login();
            }
        );
    }


    /* =====================================================
       ENTER KEY
       ===================================================== */

    function setupKeyboard() {

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key !== "Enter"
                ) {
                    return;
                }


                const target =
                    event.target;


                if (
                    target &&
                    target.tagName === "TEXTAREA"
                ) {
                    return;
                }


                const form =
                    $("loginForm");


                if (
                    form &&
                    !loginState.loading
                ) {

                    event.preventDefault();

                    login();
                }
            }
        );
    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    async function initLogin() {

        loadLoginPreference();

        setupPasswordToggle();

        setupInputEvents();

        setupForm();

        setupKeyboard();


        /*
         * Give Supabase/config.js a moment
         * to initialize before checking session.
         */

        setTimeout(
            function () {

                checkExistingSession();

            },
            100
        );
    }


    /* =====================================================
       GLOBAL API
       ===================================================== */

    window.MIXNBUY_LOGIN = {

        login: login,

        logout: async function () {

            try {

                const client =
                    getClient();

                await client.auth.signOut();

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );
            }


            try {

                sessionStorage.removeItem(
                    "mixnbuy_admin_session"
                );

                sessionStorage.removeItem(
                    "adminUser"
                );

                sessionStorage.removeItem(
                    "admin_id"
                );

                sessionStorage.removeItem(
                    "admin_role"
                );

            } catch (error) {

                console.warn(
                    "Session cleanup error:",
                    error
                );
            }


            window.location.href =
                "login.html";
        }
    };


    /* =====================================================
       START
       ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initLogin
        );

    } else {

        initLogin();
    }

})();