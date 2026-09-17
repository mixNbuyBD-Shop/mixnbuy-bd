(function () {
    "use strict";

    if (!window.supabase) {
        console.error("Supabase library was not loaded.");
        return;
    }

    if (!window.MXB_CONFIG) {
        console.error("MXB_CONFIG was not loaded.");
        return;
    }

    window.supabaseClient = window.supabase.createClient(
        window.MXB_CONFIG.SUPABASE_URL,
        window.MXB_CONFIG.SUPABASE_PUBLISHABLE_KEY
    );

    console.log("MIXNBUY.BD Supabase connected.");
})();
