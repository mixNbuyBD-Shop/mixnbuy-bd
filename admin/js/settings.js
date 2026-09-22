/* =========================================================
   MIXNBUY.BD
   SETTINGS
   ========================================================= */

"use strict";


/* =========================================================
   STATE
   ========================================================= */

const settingsState = {

    data: {},

    originalData: {},

    saving: false

};


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

function getSettingsClient() {

    if (typeof window.getClient === "function") {
        return window.getClient();
    }

    if (window.supabaseClient) {
        return window.supabaseClient;
    }

    if (window.sb) {
        return window.sb;
    }

    return null;
}


/* =========================================================
   DOM
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(
    message,
    type = "normal"
) {

    const box =
        $("settingsStatus");

    if (!box) {
        return;
    }

    const icon =
        type === "success"
            ? "bi-check-circle-fill"
            : type === "error"
                ? "bi-exclamation-triangle-fill"
                : "bi-info-circle-fill";


    box.className =
        "settings-status";


    if (
        type === "success"
    ) {

        box.classList.add(
            "success"
        );

    }


    if (
        type === "error"
    ) {

        box.classList.add(
            "error"
        );

    }


    box.innerHTML = `
        <i class="bi ${icon}"></i>
        <span>${escapeHtml(message)}</span>
    `;

}


/* =========================================================
   ESCAPE
   ========================================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   LOADING
   ========================================================= */

function setLoading(show) {

    const overlay =
        $("settingsLoading");

    if (!overlay) {
        return;
    }

    overlay.classList.toggle(
        "show",
        Boolean(show)
    );

}


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(
    title,
    text,
    type = "info"
) {

    const overlay =
        $("settingsMessage");

    if (!overlay) {
        return;
    }


    $("settingsMessageTitle")
        .textContent =
        title;


    $("settingsMessageText")
        .textContent =
        text;


    const icon =
        $("settingsMessageIcon");


    if (icon) {

        icon.className =
            type === "error"
                ? "bi bi-exclamation-triangle-fill"
                : type === "success"
                    ? "bi bi-check-circle-fill"
                    : "bi bi-info-circle-fill";

    }


    overlay.classList.add(
        "show"
    );

}


function hideMessage() {

    const overlay =
        $("settingsMessage");

    if (overlay) {

        overlay.classList.remove(
            "show"
        );

    }

}


/* =========================================================
   SETTINGS DEFAULTS
   ========================================================= */

const SETTINGS_DEFAULTS = {

    ShopName:
        "MIXNBUY.BD",

    ShopPhone:
        "01401637310",

    OrderEmail:
        "MIXNBUY.BD@GMAIL.COM",

    Address:
        "Jashore, Bangladesh",

    WhatsApp:
        "8801401637310",

    Facebook:
        "https://www.facebook.com/MixNbuy.BD",

    Messenger:
        "https://m.me/Mixnbuy.bd",

    Website:
        "",

    Currency:
        "BDT",

    DeliveryCharge:
        "120",

    FreeDelivery:
        "2000",

    OrderPrefix:
        "MXB",

    Timezone:
        "Asia/Dhaka",

    DateFormat:
        "DD/MM/YYYY",

    EmailNotification:
        "true",

    WhatsAppNotification:
        "true",

    LowStockAlert:
        "true"

};


/* =========================================================
   LOAD SETTINGS
   ========================================================= */

async function loadSettings() {

    const client =
        getSettingsClient();


    if (!client) {

        throw new Error(
            "Supabase client is not initialized."
        );

    }


    setStatus(
        "Loading settings..."
    );


    const result =
        await client
            .from("settings")
            .select("*")
            .order(
                "key",
                {
                    ascending: true
                }
            );


    if (result.error) {

        throw result.error;

    }


    const rows =
        Array.isArray(
            result.data
        )
            ? result.data
            : [];


    const settings = {};


    rows.forEach(
        row => {

            /*
             * Current MIXNBUY settings
             * table uses Key / Value.
             *
             * Supabase returns lowercase
             * column names by default.
             */

            const key =
                row.key ??
                row.Key ??
                row.name;


            if (!key) {
                return;
            }


            settings[key] =
                row.value ??
                row.Value ??
                "";

        }
    );


    settingsState.data = {
        ...SETTINGS_DEFAULTS,
        ...settings
    };


    settingsState.originalData = {
        ...settingsState.data
    };


    fillForm(
        settingsState.data
    );


    setStatus(
        "Settings loaded successfully.",
        "success"
    );

}


/* =========================================================
   FORM FIELDS
   ========================================================= */

function fillForm(data) {

    $("shopName").value =
        data.ShopName ?? "";

    $("shopPhone").value =
        data.ShopPhone ?? "";

    $("orderEmail").value =
        data.OrderEmail ?? "";

    $("shopAddress").value =
        data.Address ?? "";


    $("whatsapp").value =
        data.WhatsApp ?? "";

    $("facebook").value =
        data.Facebook ?? "";

    $("messenger").value =
        data.Messenger ?? "";

    $("websiteUrl").value =
        data.Website ?? "";


    $("deliveryCharge").value =
        data.DeliveryCharge ?? "";

    $("freeDelivery").value =
        data.FreeDelivery ?? "";


    $("currency").value =
        data.Currency ?? "BDT";

    $("orderPrefix").value =
        data.OrderPrefix ?? "MXB";

    $("timezone").value =
        data.Timezone ?? "Asia/Dhaka";

    $("dateFormat").value =
        data.DateFormat ?? "DD/MM/YYYY";


    $("emailNotification").checked =
        toBoolean(
            data.EmailNotification
        );


    $("whatsappNotification").checked =
        toBoolean(
            data.WhatsAppNotification
        );


    $("lowStockAlert").checked =
        toBoolean(
            data.LowStockAlert
        );

}


/* =========================================================
   BOOLEAN
   ========================================================= */

function toBoolean(value) {

    if (
        value === true ||
        value === 1
    ) {
        return true;
    }


    const text =
        String(
            value ?? ""
        ).toLowerCase();


    return (
        text === "true" ||
        text === "1" ||
        text === "yes" ||
        text === "on"
    );

}


/* =========================================================
   FORM DATA
   ========================================================= */

function getFormData() {

    return {

        ShopName:
            $("shopName").value.trim(),

        ShopPhone:
            $("shopPhone").value.trim(),

        OrderEmail:
            $("orderEmail").value.trim(),

        Address:
            $("shopAddress").value.trim(),


        WhatsApp:
            $("whatsapp").value.trim(),

        Facebook:
            $("facebook").value.trim(),

        Messenger:
            $("messenger").value.trim(),

        Website:
            $("websiteUrl").value.trim(),


        DeliveryCharge:
            $("deliveryCharge").value.trim(),

        FreeDelivery:
            $("freeDelivery").value.trim(),


        Currency:
            $("currency").value,

        OrderPrefix:
            $("orderPrefix").value
                .trim()
                .toUpperCase(),

        Timezone:
            $("timezone").value,

        DateFormat:
            $("dateFormat").value,


        EmailNotification:
            $("emailNotification").checked
                ? "true"
                : "false",

        WhatsAppNotification:
            $("whatsappNotification").checked
                ? "true"
                : "false",

        LowStockAlert:
            $("lowStockAlert").checked
                ? "true"
                : "false"

    };

}


/* =========================================================
   VALIDATE
   ========================================================= */

function validateSettings(data) {

    if (!data.ShopName) {

        throw new Error(
            "Shop Name is required."
        );

    }


    if (!data.ShopPhone) {

        throw new Error(
            "Shop Phone is required."
        );

    }


    if (
        data.OrderEmail &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(
                data.OrderEmail
            )
    ) {

        throw new Error(
            "Please enter a valid order email."
        );

    }


    const delivery =
        Number(
            data.DeliveryCharge
        );


    const freeDelivery =
        Number(
            data.FreeDelivery
        );


    if (
        !Number.isFinite(delivery) ||
        delivery < 0
    ) {

        throw new Error(
            "Delivery Charge must be a valid amount."
        );

    }


    if (
        !Number.isFinite(freeDelivery) ||
        freeDelivery < 0
    ) {

        throw new Error(
            "Free Delivery amount must be a valid amount."
        );

    }


    if (!data.Currency) {

        throw new Error(
            "Currency is required."
        );

    }


    if (!data.OrderPrefix) {

        throw new Error(
            "Order Prefix is required."
        );

    }


    if (
        data.OrderPrefix.length >
        10
    ) {

        throw new Error(
            "Order Prefix cannot exceed 10 characters."
        );

    }


    if (
        data.Facebook &&
        !isValidUrl(
            data.Facebook
        )
    ) {

        throw new Error(
            "Facebook URL is invalid."
        );

    }


    if (
        data.Messenger &&
        !isValidUrl(
            data.Messenger
        )
    ) {

        throw new Error(
            "Messenger URL is invalid."
        );

    }


    if (
        data.Website &&
        !isValidUrl(
            data.Website
        )
    ) {

        throw new Error(
            "Website URL is invalid."
        );

    }


    return true;

}


/* =========================================================
   URL VALIDATION
   ========================================================= */

function isValidUrl(value) {

    try {

        const url =
            new URL(value);

        return (
            url.protocol === "http:" ||
            url.protocol === "https:"
        );

    } catch {

        return false;

    }

}


/* =========================================================
   SAVE SETTINGS
   ========================================================= */

async function saveSettings() {

    if (
        settingsState.saving
    ) {
        return;
    }


    try {

        settingsState.saving =
            true;


        const data =
            getFormData();


        validateSettings(
            data
        );


        const client =
            getSettingsClient();


        if (!client) {

            throw new Error(
                "Supabase client is not initialized."
            );

        }


        setLoading(true);

        setStatus(
            "Saving settings..."
        );


        /*
         * Save one row per Key.
         *
         * We use upsert based on
         * the Key field.
         */

        const rows =
            Object.entries(data)
                .map(
                    (
                        [
                            key,
                            value
                        ]
                    ) => ({

                        key,

                        value:
                            String(
                                value ?? ""
                            )

                    })
                );


        const result =
            await client
                .from("settings")
                .upsert(
                    rows,
                    {
                        onConflict: "key"
                    }
                );


        if (result.error) {

            throw result.error;

        }


        settingsState.data =
            {
                ...data
            };


        settingsState.originalData =
            {
                ...data
            };


        setStatus(
            "Settings saved successfully.",
            "success"
        );


        showMessage(
            "Settings Saved",
            "All store settings have been saved successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Settings save error:",
            error
        );


        setStatus(
            error?.message ||
            "Failed to save settings.",
            "error"
        );


        showMessage(
            "Save Failed",
            error?.message ||
            "Unable to save settings.",
            "error"
        );


    } finally {

        settingsState.saving =
            false;

        setLoading(false);

    }

}


/* =========================================================
   RELOAD
   ========================================================= */

async function reloadSettings() {

    try {

        setLoading(true);

        await loadSettings();

    } catch (error) {

        console.error(
            "Settings load error:",
            error
        );


        setStatus(
            error?.message ||
            "Failed to load settings.",
            "error"
        );


        showMessage(
            "Settings Load Error",
            error?.message ||
            "Unable to load settings.",
            "error"
        );

    } finally {

        setLoading(false);

    }

}


/* =========================================================
   EVENTS
   ========================================================= */

function bindSettingsEvents() {


    $("saveSettingsBtn")
        ?.addEventListener(
            "click",
            saveSettings
        );


    $("reloadSettingsBtn")
        ?.addEventListener(
            "click",
            reloadSettings
        );


    $("closeSettingsMessage")
        ?.addEventListener(
            "click",
            hideMessage
        );


    $("settingsMessageOk")
        ?.addEventListener(
            "click",
            hideMessage
        );


    $("settingsMessage")
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    $("settingsMessage")
                ) {

                    hideMessage();

                }

            }
        );


    /*
     * Order prefix
     */

    $("orderPrefix")
        ?.addEventListener(
            "input",
            event => {

                event.target.value =
                    event.target.value
                        .replace(
                            /[^a-zA-Z0-9-_]/g,
                            ""
                        )
                        .toUpperCase();

            }
        );


    /*
     * Escape
     */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                hideMessage();

            }

        }
    );

}


/* =========================================================
   INIT
   ========================================================= */

async function initSettings() {

    bindSettingsEvents();


    try {

        setLoading(true);

        await loadSettings();

    } catch (error) {

        console.error(
            "Settings initialization error:",
            error
        );


        /*
         * If the table is temporarily unavailable,
         * still show the default configuration so
         * the admin can see the complete UI.
         */

        settingsState.data =
            {
                ...SETTINGS_DEFAULTS
            };


        settingsState.originalData =
            {
                ...SETTINGS_DEFAULTS
            };


        fillForm(
            settingsState.data
        );


        setStatus(
            "Could not load saved settings. Default values are shown.",
            "error"
        );

    } finally {

        setLoading(false);

    }

}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initSettings
);


/* =========================================================
   PUBLIC API
   ========================================================= */

window.MIXNBUY_SETTINGS = {

    reload:
        reloadSettings,

    save:
        saveSettings,

    getState:
        () => settingsState

};