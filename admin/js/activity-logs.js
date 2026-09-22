/* =========================================================
   MIXNBUY.BD
   ACTIVITY LOGS
   admin/js/activity-logs.js
   ========================================================= */

(function () {
    "use strict";

    /* =====================================================
       STATE
       ===================================================== */

    const activityLogsState = {
        allLogs: [],
        filteredLogs: [],
        currentPage: 1,
        pageSize: 25,
        search: "",
        action: "",
        source: "",
        startDate: "",
        endDate: "",
        loading: false
    };

    window.activityLogsState = activityLogsState;


    /* =====================================================
       SUPABASE CLIENT
       ===================================================== */

    function getSupabaseClient() {

        if (window.getClient && typeof window.getClient === "function") {
            return window.getClient();
        }

        if (window.supabaseClient) {
            return window.supabaseClient;
        }

        if (window.sb) {
            return window.sb;
        }

        if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
            return window.supabase.createClient(
                window.SUPABASE_URL,
                window.SUPABASE_ANON_KEY
            );
        }

        throw new Error("Supabase client not found.");
    }


    /* =====================================================
       DOM HELPERS
       ===================================================== */

    function $(id) {
        return document.getElementById(id);
    }

    function showElement(element) {
        if (!element) return;
        element.classList.remove("d-none");
        element.style.display = "";
    }

    function hideElement(element) {
        if (!element) return;
        element.classList.add("d-none");
        element.style.display = "none";
    }


    /* =====================================================
       MESSAGE
       ===================================================== */

    function showMessage(message, type = "info") {

        const box = $("activityLogsMessage");

        if (!box) {
            console.log(message);
            return;
        }

        box.textContent = message;

        box.className = "activity-message";

        if (type === "success") {
            box.classList.add("success");
        } else if (type === "error") {
            box.classList.add("error");
        } else if (type === "warning") {
            box.classList.add("warning");
        } else {
            box.classList.add("info");
        }

        showElement(box);

        setTimeout(function () {
            hideElement(box);
        }, 4000);
    }


    /* =====================================================
       LOADING
       ===================================================== */

    function setLoading(isLoading) {

        activityLogsState.loading = isLoading;

        const overlay = $("activityLogsLoading");

        if (overlay) {
            if (isLoading) {
                showElement(overlay);
            } else {
                hideElement(overlay);
            }
        }

        const refreshBtn = $("refreshLogsBtn");

        if (refreshBtn) {
            refreshBtn.disabled = isLoading;

            const icon = refreshBtn.querySelector("i");

            if (icon) {
                if (isLoading) {
                    icon.classList.add("spin");
                } else {
                    icon.classList.remove("spin");
                }
            }
        }
    }


    /* =====================================================
       DATE FORMAT
       ===================================================== */

    function formatDate(value) {

        if (!value) {
            return "-";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString("en-GB", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        });
    }


    /* =====================================================
       DATE ONLY
       ===================================================== */

    function getDateOnly(value) {

        if (!value) {
            return "";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    /* =====================================================
       ESCAPE HTML
       ===================================================== */

    function escapeHtml(value) {

        if (value === null || value === undefined) {
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
       NORMALIZE LOG
       ===================================================== */

    function normalizeLog(row) {

        row = row || {};

        return {
            id: row.id || "",

            user_id:
                row.user_id ||
                "",

            user_name:
                row.user_name ||
                "System",

            action:
                row.action ||
                "",

            description:
                row.description ||
                "",

            target:
                row.target ||
                "",

            source:
                row.source ||
                "",

            created_at:
                row.created_at ||
                null
        };
    }


    /* =====================================================
       ACTION CLASS
       ===================================================== */

    function getActionClass(action) {

        const value = String(action || "").toLowerCase();

        if (
            value.includes("delete") ||
            value.includes("remove") ||
            value.includes("cancel")
        ) {
            return "danger";
        }

        if (
            value.includes("update") ||
            value.includes("edit") ||
            value.includes("change")
        ) {
            return "warning";
        }

        if (
            value.includes("add") ||
            value.includes("create") ||
            value.includes("new")
        ) {
            return "success";
        }

        if (
            value.includes("login") ||
            value.includes("logout")
        ) {
            return "info";
        }

        if (
            value.includes("return") ||
            value.includes("refund")
        ) {
            return "secondary";
        }

        return "primary";
    }


    /* =====================================================
       ACTION BADGE
       ===================================================== */

    function actionBadge(action) {

        const className = getActionClass(action);

        return `
            <span class="activity-action-badge ${className}">
                ${escapeHtml(action || "-")}
            </span>
        `;
    }


    /* =====================================================
       LOAD LOGS
       ===================================================== */

    async function loadLogs() {

        const client = getSupabaseClient();

        setLoading(true);

        try {

            const result = await client
                .from("activity_logs")
                .select("*")
                .order("created_at", {
                    ascending: false
                })
                .limit(2000);

            if (result.error) {
                throw result.error;
            }

            const rows = Array.isArray(result.data)
                ? result.data
                : [];

            activityLogsState.allLogs =
                rows.map(normalizeLog);

            activityLogsState.currentPage = 1;

            populateFilters();

            applyFilters();

            updateStats();

        } catch (error) {

            console.error(
                "Activity logs load error:",
                error
            );

            activityLogsState.allLogs = [];
            activityLogsState.filteredLogs = [];

            renderLogs();

            showMessage(
                error.message ||
                "Failed to load activity logs.",
                "error"
            );

        } finally {

            setLoading(false);
        }
    }


    /* =====================================================
       POPULATE FILTERS
       ===================================================== */

    function populateFilters() {

        populateActionFilter();
        populateSourceFilter();
    }


    function populateActionFilter() {

        const select = $("actionFilter");

        if (!select) {
            return;
        }

        const currentValue =
            activityLogsState.action ||
            select.value ||
            "";

        const actions = [
            ...new Set(
                activityLogsState.allLogs
                    .map(log => log.action)
                    .filter(Boolean)
            )
        ].sort(
            (a, b) =>
                String(a).localeCompare(String(b))
        );

        select.innerHTML = `
            <option value="">All Actions</option>
        `;

        actions.forEach(function (action) {

            const option =
                document.createElement("option");

            option.value = action;
            option.textContent = action;

            select.appendChild(option);
        });

        select.value = currentValue;
    }


    function populateSourceFilter() {

        const select = $("sourceFilter");

        if (!select) {
            return;
        }

        const currentValue =
            activityLogsState.source ||
            select.value ||
            "";

        const sources = [
            ...new Set(
                activityLogsState.allLogs
                    .map(log => log.source)
                    .filter(Boolean)
            )
        ].sort(
            (a, b) =>
                String(a).localeCompare(String(b))
        );

        select.innerHTML = `
            <option value="">All Sources</option>
        `;

        sources.forEach(function (source) {

            const option =
                document.createElement("option");

            option.value = source;
            option.textContent = source;

            select.appendChild(option);
        });

        select.value = currentValue;
    }


    /* =====================================================
       APPLY FILTERS
       ===================================================== */

    function applyFilters() {

        const search =
            String(activityLogsState.search || "")
                .trim()
                .toLowerCase();

        const action =
            String(activityLogsState.action || "")
                .trim()
                .toLowerCase();

        const source =
            String(activityLogsState.source || "")
                .trim()
                .toLowerCase();

        const startDate =
            activityLogsState.startDate || "";

        const endDate =
            activityLogsState.endDate || "";

        activityLogsState.filteredLogs =
            activityLogsState.allLogs.filter(function (log) {

                /* SEARCH */

                if (search) {

                    const searchableText = [
                        log.user_name,
                        log.action,
                        log.description,
                        log.target,
                        log.source,
                        log.user_id
                    ]
                        .join(" ")
                        .toLowerCase();

                    if (
                        !searchableText.includes(search)
                    ) {
                        return false;
                    }
                }


                /* ACTION */

                if (action) {

                    if (
                        String(log.action || "")
                            .toLowerCase() !== action
                    ) {
                        return false;
                    }
                }


                /* SOURCE */

                if (source) {

                    if (
                        String(log.source || "")
                            .toLowerCase() !== source
                    ) {
                        return false;
                    }
                }


                /* DATE */

                const logDate =
                    getDateOnly(log.created_at);

                if (
                    startDate &&
                    logDate &&
                    logDate < startDate
                ) {
                    return false;
                }

                if (
                    endDate &&
                    logDate &&
                    logDate > endDate
                ) {
                    return false;
                }

                return true;
            });

        activityLogsState.currentPage = 1;

        renderLogs();
        updateStats();
    }


    /* =====================================================
       RENDER TABLE
       ===================================================== */

    function renderLogs() {

        const tbody =
            $("logsTableBody");

        if (!tbody) {
            return;
        }

        const logs =
            activityLogsState.filteredLogs;

        if (!logs.length) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="text-center py-5"
                    >
                        <div class="empty-state">
                            <i class="bi bi-journal-x"></i>
                            <h4>No Activity Found</h4>
                            <p>
                                No activity logs match
                                your current filters.
                            </p>
                        </div>
                    </td>
                </tr>
            `;

            renderPagination();

            return;
        }


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    logs.length /
                    activityLogsState.pageSize
                )
            );


        if (
            activityLogsState.currentPage >
            totalPages
        ) {
            activityLogsState.currentPage =
                totalPages;
        }


        const start =
            (
                activityLogsState.currentPage - 1
            ) *
            activityLogsState.pageSize;


        const end =
            start +
            activityLogsState.pageSize;


        const pageLogs =
            logs.slice(start, end);


        tbody.innerHTML =
            pageLogs
                .map(function (log, index) {

                    return `
                        <tr>
                            <td>
                                ${
                                    start +
                                    index +
                                    1
                                }
                            </td>

                            <td>
                                <div class="log-user">
                                    <div class="log-user-icon">
                                        <i class="bi bi-person"></i>
                                    </div>

                                    <div>
                                        <strong>
                                            ${escapeHtml(
                                                log.user_name ||
                                                "System"
                                            )}
                                        </strong>

                                        ${
                                            log.user_id
                                                ? `
                                                    <small>
                                                        ${escapeHtml(
                                                            log.user_id
                                                        )}
                                                    </small>
                                                  `
                                                : ""
                                        }
                                    </div>
                                </div>
                            </td>

                            <td>
                                ${actionBadge(
                                    log.action
                                )}
                            </td>

                            <td>
                                <div class="log-description">
                                    ${
                                        escapeHtml(
                                            log.description ||
                                            "-"
                                        )
                                    }
                                </div>
                            </td>

                            <td>
                                ${
                                    log.target
                                        ? `
                                            <span class="log-target">
                                                ${escapeHtml(
                                                    log.target
                                                )}
                                            </span>
                                          `
                                        : "-"
                                }
                            </td>

                            <td>
                                ${
                                    log.source
                                        ? `
                                            <span class="log-source">
                                                ${escapeHtml(
                                                    log.source
                                                )}
                                            </span>
                                          `
                                        : "-"
                                }
                            </td>

                            <td>
                                <div class="log-date">
                                    ${formatDate(
                                        log.created_at
                                    )}
                                </div>
                            </td>

                            <td>
                                <button
                                    type="button"
                                    class="btn btn-light btn-sm view-log-btn"
                                    data-log-id="${escapeHtml(
                                        log.id
                                    )}"
                                    title="View Details"
                                >
                                    <i class="bi bi-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                })
                .join("");


        renderPagination();
    }


    /* =====================================================
       PAGINATION
       ===================================================== */

    function renderPagination() {

        const container =
            $("logsPagination");

        if (!container) {
            return;
        }

        const total =
            activityLogsState.filteredLogs.length;

        const pageSize =
            activityLogsState.pageSize;

        const totalPages =
            Math.max(
                1,
                Math.ceil(total / pageSize)
            );

        const current =
            activityLogsState.currentPage;


        if (total === 0) {

            container.innerHTML = "";

            return;
        }


        const start =
            (current - 1) *
            pageSize +
            1;

        const end =
            Math.min(
                current * pageSize,
                total
            );


        let html = `
            <div class="pagination-info">
                Showing
                <strong>${start}</strong>
                -
                <strong>${end}</strong>
                of
                <strong>${total}</strong>
            </div>

            <div class="pagination-buttons">
        `;


        html += `
            <button
                type="button"
                class="pagination-btn"
                data-page="${current - 1}"
                ${
                    current <= 1
                        ? "disabled"
                        : ""
                }
            >
                <i class="bi bi-chevron-left"></i>
            </button>
        `;


        const maxButtons = 7;

        let pageStart =
            Math.max(
                1,
                current -
                Math.floor(maxButtons / 2)
            );

        let pageEnd =
            Math.min(
                totalPages,
                pageStart + maxButtons - 1
            );

        if (
            pageEnd - pageStart + 1 <
            maxButtons
        ) {
            pageStart =
                Math.max(
                    1,
                    pageEnd -
                    maxButtons +
                    1
                );
        }


        for (
            let page = pageStart;
            page <= pageEnd;
            page++
        ) {

            html += `
                <button
                    type="button"
                    class="
                        pagination-btn
                        ${
                            page === current
                                ? "active"
                                : ""
                        }
                    "
                    data-page="${page}"
                >
                    ${page}
                </button>
            `;
        }


        html += `
            <button
                type="button"
                class="pagination-btn"
                data-page="${current + 1}"
                ${
                    current >= totalPages
                        ? "disabled"
                        : ""
                }
            >
                <i class="bi bi-chevron-right"></i>
            </button>
        `;


        html += `
            </div>
        `;


        container.innerHTML = html;
    }


    /* =====================================================
       STATS
       ===================================================== */

    function updateStats() {

        const logs =
            activityLogsState.filteredLogs;


        const total =
            activityLogsState.allLogs.length;


        const filtered =
            logs.length;


        const today =
            getDateOnly(new Date());


        const todayCount =
            activityLogsState.allLogs
                .filter(
                    log =>
                        getDateOnly(
                            log.created_at
                        ) === today
                )
                .length;


        const users = new Set(
            activityLogsState.allLogs
                .map(
                    log =>
                        log.user_id ||
                        log.user_name
                )
                .filter(Boolean)
        );


        const actions = new Set(
            activityLogsState.allLogs
                .map(log => log.action)
                .filter(Boolean)
        );


        setText(
            "totalLogs",
            total
        );

        setText(
            "filteredLogs",
            filtered
        );

        setText(
            "todayLogs",
            todayCount
        );

        setText(
            "activeUsers",
            users.size
        );

        setText(
            "totalActions",
            actions.size
        );
    }


    function setText(id, value) {

        const element = $(id);

        if (element) {
            element.textContent =
                String(value);
        }
    }


    /* =====================================================
       VIEW LOG DETAILS
       ===================================================== */

    function viewLog(logId) {

        const log =
            activityLogsState.allLogs.find(
                item =>
                    String(item.id) ===
                    String(logId)
            );

        if (!log) {
            showMessage(
                "Activity log not found.",
                "error"
            );
            return;
        }


        const modal =
            $("logDetailsModal");

        if (!modal) {
            return;
        }


        setText(
            "detailLogId",
            log.id || "-"
        );

        setText(
            "detailUser",
            log.user_name || "System"
        );

        setText(
            "detailUserId",
            log.user_id || "-"
        );

        setText(
            "detailAction",
            log.action || "-"
        );

        setText(
            "detailDescription",
            log.description || "-"
        );

        setText(
            "detailTarget",
            log.target || "-"
        );

        setText(
            "detailSource",
            log.source || "-"
        );

        setText(
            "detailCreatedAt",
            formatDate(
                log.created_at
            )
        );


        modal.classList.add("show");
        modal.style.display = "flex";

        document.body.classList.add(
            "modal-open"
        );
    }


    /* =====================================================
       CLOSE MODAL
       ===================================================== */

    function closeLogModal() {

        const modal =
            $("logDetailsModal");

        if (!modal) {
            return;
        }

        modal.classList.remove("show");
        modal.style.display = "none";

        document.body.classList.remove(
            "modal-open"
        );
    }


    /* =====================================================
       CSV EXPORT
       ===================================================== */

    function exportLogs() {

        const logs =
            activityLogsState.filteredLogs;

        if (!logs.length) {

            showMessage(
                "No activity logs to export.",
                "warning"
            );

            return;
        }


        const headers = [
            "ID",
            "User ID",
            "User Name",
            "Action",
            "Description",
            "Target",
            "Source",
            "Created At"
        ];


        const rows =
            logs.map(function (log) {

                return [
                    log.id,
                    log.user_id,
                    log.user_name,
                    log.action,
                    log.description,
                    log.target,
                    log.source,
                    formatDate(
                        log.created_at
                    )
                ];
            });


        const csvData = [
            headers,
            ...rows
        ];


        const csv =
            csvData
                .map(function (row) {

                    return row
                        .map(function (value) {

                            const text =
                                value === null ||
                                value === undefined
                                    ? ""
                                    : String(value);

                            return `"${text
                                .replace(
                                    /"/g,
                                    '""'
                                )}"`;
                        })
                        .join(",");
                })
                .join("\n");


        const blob =
            new Blob(
                [
                    "\ufeff",
                    csv
                ],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );


        const url =
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            `activity-logs-${getDateOnly(
                new Date()
            )}.csv`;

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);


        showMessage(
            "Activity logs exported successfully.",
            "success"
        );
    }


    /* =====================================================
       CLEAR FILTERS
       ===================================================== */

    function clearFilters() {

        activityLogsState.search = "";
        activityLogsState.action = "";
        activityLogsState.source = "";
        activityLogsState.startDate = "";
        activityLogsState.endDate = "";
        activityLogsState.currentPage = 1;


        const search =
            $("logsSearch");

        if (search) {
            search.value = "";
        }


        const action =
            $("actionFilter");

        if (action) {
            action.value = "";
        }


        const source =
            $("sourceFilter");

        if (source) {
            source.value = "";
        }


        const startDate =
            $("startDate");

        if (startDate) {
            startDate.value = "";
        }


        const endDate =
            $("endDate");

        if (endDate) {
            endDate.value = "";
        }


        applyFilters();
    }


    /* =====================================================
       EVENT LISTENERS
       ===================================================== */

    function bindEvents() {


        /* SEARCH */

        const search =
            $("logsSearch");

        if (search) {

            search.addEventListener(
                "input",
                function () {

                    activityLogsState.search =
                        search.value;

                    applyFilters();
                }
            );
        }


        /* ACTION FILTER */

        const action =
            $("actionFilter");

        if (action) {

            action.addEventListener(
                "change",
                function () {

                    activityLogsState.action =
                        action.value;

                    applyFilters();
                }
            );
        }


        /* SOURCE FILTER */

        const source =
            $("sourceFilter");

        if (source) {

            source.addEventListener(
                "change",
                function () {

                    activityLogsState.source =
                        source.value;

                    applyFilters();
                }
            );
        }


        /* START DATE */

        const startDate =
            $("startDate");

        if (startDate) {

            startDate.addEventListener(
                "change",
                function () {

                    activityLogsState.startDate =
                        startDate.value;

                    applyFilters();
                }
            );
        }


        /* END DATE */

        const endDate =
            $("endDate");

        if (endDate) {

            endDate.addEventListener(
                "change",
                function () {

                    activityLogsState.endDate =
                        endDate.value;

                    applyFilters();
                }
            );
        }


        /* REFRESH */

        const refresh =
            $("refreshLogsBtn");

        if (refresh) {

            refresh.addEventListener(
                "click",
                function () {
                    loadLogs();
                }
            );
        }


        /* CLEAR */

        const clear =
            $("clearLogsFilterBtn");

        if (clear) {

            clear.addEventListener(
                "click",
                function () {
                    clearFilters();
                }
            );
        }


        /* EXPORT */

        const exportBtn =
            $("exportLogsBtn");

        if (exportBtn) {

            exportBtn.addEventListener(
                "click",
                function () {
                    exportLogs();
                }
            );
        }


        /* TABLE VIEW BUTTON */

        document.addEventListener(
            "click",
            function (event) {

                const button =
                    event.target.closest(
                        ".view-log-btn"
                    );

                if (!button) {
                    return;
                }

                const logId =
                    button.dataset.logId;

                viewLog(logId);
            }
        );


        /* PAGINATION */

        document.addEventListener(
            "click",
            function (event) {

                const button =
                    event.target.closest(
                        ".pagination-btn"
                    );

                if (!button) {
                    return;
                }

                if (button.disabled) {
                    return;
                }

                const page =
                    Number(
                        button.dataset.page
                    );

                if (!page || page < 1) {
                    return;
                }

                activityLogsState.currentPage =
                    page;

                renderLogs();

                const table =
                    $("logsTable");

                if (table) {
                    table.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }
            }
        );


        /* CLOSE MODAL */

        const closeBtn =
            $("closeLogDetails");

        if (closeBtn) {

            closeBtn.addEventListener(
                "click",
                closeLogModal
            );
        }


        const closeBtn2 =
            $("closeLogModal");

        if (closeBtn2) {

            closeBtn2.addEventListener(
                "click",
                closeLogModal
            );
        }


        /* MODAL BACKDROP */

        const modal =
            $("logDetailsModal");

        if (modal) {

            modal.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target === modal
                    ) {
                        closeLogModal();
                    }
                }
            );
        }


        /* ESCAPE */

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape"
                ) {
                    closeLogModal();
                }
            }
        );
    }


    /* =====================================================
       INIT
       ===================================================== */

    async function initActivityLogs() {

        bindEvents();

        await loadLogs();
    }


    /* =====================================================
       GLOBAL API
       ===================================================== */

    window.MIXNBUY_ACTIVITY_LOGS = {

        load: loadLogs,

        refresh: loadLogs,

        clearFilters: clearFilters,

        export: exportLogs,

        view: viewLog,

        state: activityLogsState
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
            initActivityLogs
        );

    } else {

        initActivityLogs();
    }

})();
