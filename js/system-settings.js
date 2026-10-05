/* =========================================================
   LOGIS-TECH SYSTEM
   SYSTEM SETTINGS MODULE
   =========================================================
   VERSION: 20261005-02

   PURPOSE:
   - Save / load system settings
   - Theme control
   - Sidebar preference
   - Animation preference
   - Dashboard preference
   - Notification preferences
   - Date / time preferences
   - Security preferences
   - Local storage management
   - Restore defaults
   - Prevent duplicate initialization
   ========================================================= */


/* =========================================================
   STORAGE
   ========================================================= */

const SYSTEM_SETTINGS_KEY = "logitechSystemSettings";


/* =========================================================
   DEFAULT SETTINGS
   ========================================================= */

const DEFAULT_SYSTEM_SETTINGS = {

    /* Appearance */
    theme: "light",
    sidebar: "expanded",
    animations: true,

    /* Dashboard */
    defaultPage: "dashboard",
    recentTransactions: "10",
    autoRefresh: false,

    /* Notifications */
    notifications: true,
    deliveryAlerts: true,
    delayAlerts: true,
    sound: false,

    /* Date & Time */
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12",
    timezone: "Asia/Manila",

    /* Security */
    rememberLogin: true,
    autoLogout: false,
    sessionTimeout: "30"
};


/* =========================================================
   CURRENT SETTINGS
   ========================================================= */

let currentSystemSettings = {
    ...DEFAULT_SYSTEM_SETTINGS
};


/* =========================================================
   INITIALIZATION STATE
   ========================================================= */

let systemSettingsInitialized = false;
let autoLogoutTimer = null;
let autoLogoutListenersBound = false;
let systemThemeListenerBound = false;


/* =========================================================
   INITIALIZE
   ========================================================= */

function initializeSystemSettings() {

    /*
       IMPORTANT:
       This function is called by index.html AFTER
       pages/system-settings.html has been inserted.
    */

    if (systemSettingsInitialized) {

        console.log(
            "LOGIS-TECH SYSTEM SETTINGS: Already initialized."
        );

        /*
           Still refresh the form in case the HTML
           was recreated.
        */

        loadSavedSystemSettings();
        populateSystemSettingsForm();

        return;
    }


    console.log(
        "LOGIS-TECH SYSTEM SETTINGS: Initializing..."
    );


    loadSavedSystemSettings();

    populateSystemSettingsForm();

    bindSystemSettingsEvents();

    applySystemSettings();

    setupSystemThemeListener();

    setupAutoLogout();


    systemSettingsInitialized = true;


    console.log(
        "LOGIS-TECH SYSTEM SETTINGS: Ready",
        currentSystemSettings
    );
}


/* =========================================================
   LOAD SAVED SETTINGS
   ========================================================= */

function loadSavedSystemSettings() {

    try {

        const savedSettings =
            localStorage.getItem(
                SYSTEM_SETTINGS_KEY
            );


        if (!savedSettings) {

            currentSystemSettings = {
                ...DEFAULT_SYSTEM_SETTINGS
            };

            return;
        }


        const parsedSettings =
            JSON.parse(savedSettings);


        if (
            !parsedSettings ||
            typeof parsedSettings !== "object"
        ) {

            currentSystemSettings = {
                ...DEFAULT_SYSTEM_SETTINGS
            };

            return;
        }


        currentSystemSettings = {

            ...DEFAULT_SYSTEM_SETTINGS,

            ...parsedSettings
        };


    } catch (error) {

        console.error(
            "LOGIS-TECH SYSTEM SETTINGS: Failed to load settings:",
            error
        );


        currentSystemSettings = {
            ...DEFAULT_SYSTEM_SETTINGS
        };
    }
}


/* =========================================================
   SAVE SETTINGS TO LOCAL STORAGE
   ========================================================= */

function saveSystemSettingsToStorage() {

    try {

        localStorage.setItem(
            SYSTEM_SETTINGS_KEY,
            JSON.stringify(
                currentSystemSettings
            )
        );

        return true;

    } catch (error) {

        console.error(
            "LOGIS-TECH SYSTEM SETTINGS: Failed to save:",
            error
        );

        return false;
    }
}


/* =========================================================
   GET ELEMENT HELPER
   ========================================================= */

function getSettingElement(id) {

    return document.getElementById(id);
}


/* =========================================================
   POPULATE FORM
   ========================================================= */

function populateSystemSettingsForm() {

    /* =====================================================
       APPEARANCE
       ===================================================== */

    const themeSetting =
        getSettingElement(
            "themeSetting"
        );

    if (themeSetting) {

        themeSetting.value =
            currentSystemSettings.theme;
    }


    const sidebarSetting =
        getSettingElement(
            "sidebarSetting"
        );

    if (sidebarSetting) {

        sidebarSetting.value =
            currentSystemSettings.sidebar;
    }


    const animationSetting =
        getSettingElement(
            "animationSetting"
        );

    if (animationSetting) {

        animationSetting.checked =
            Boolean(
                currentSystemSettings.animations
            );
    }


    /* =====================================================
       DASHBOARD
       ===================================================== */

    const defaultPageSetting =
        getSettingElement(
            "defaultPageSetting"
        );

    if (defaultPageSetting) {

        defaultPageSetting.value =
            currentSystemSettings.defaultPage;
    }


    const recentTransactionsSetting =
        getSettingElement(
            "recentTransactionsSetting"
        );

    if (recentTransactionsSetting) {

        recentTransactionsSetting.value =
            currentSystemSettings.recentTransactions;
    }


    const autoRefreshSetting =
        getSettingElement(
            "autoRefreshSetting"
        );

    if (autoRefreshSetting) {

        autoRefreshSetting.checked =
            Boolean(
                currentSystemSettings.autoRefresh
            );
    }


    /* =====================================================
       NOTIFICATIONS
       ===================================================== */

    const notificationSetting =
        getSettingElement(
            "notificationSetting"
        );

    if (notificationSetting) {

        notificationSetting.checked =
            Boolean(
                currentSystemSettings.notifications
            );
    }


    const deliveryAlertSetting =
        getSettingElement(
            "deliveryAlertSetting"
        );

    if (deliveryAlertSetting) {

        deliveryAlertSetting.checked =
            Boolean(
                currentSystemSettings.deliveryAlerts
            );
    }


    const delayAlertSetting =
        getSettingElement(
            "delayAlertSetting"
        );

    if (delayAlertSetting) {

        delayAlertSetting.checked =
            Boolean(
                currentSystemSettings.delayAlerts
            );
    }


    const soundSetting =
        getSettingElement(
            "soundSetting"
        );

    if (soundSetting) {

        soundSetting.checked =
            Boolean(
                currentSystemSettings.sound
            );
    }


    /* =====================================================
       DATE & TIME
       ===================================================== */

    const dateFormatSetting =
        getSettingElement(
            "dateFormatSetting"
        );

    if (dateFormatSetting) {

        dateFormatSetting.value =
            currentSystemSettings.dateFormat;
    }


    const timeFormatSetting =
        getSettingElement(
            "timeFormatSetting"
        );

    if (timeFormatSetting) {

        timeFormatSetting.value =
            currentSystemSettings.timeFormat;
    }


    const timezoneSetting =
        getSettingElement(
            "timezoneSetting"
        );

    if (timezoneSetting) {

        timezoneSetting.value =
            currentSystemSettings.timezone;
    }


    /* =====================================================
       SECURITY
       ===================================================== */

    const rememberLoginSetting =
        getSettingElement(
            "rememberLoginSetting"
        );

    if (rememberLoginSetting) {

        rememberLoginSetting.checked =
            Boolean(
                currentSystemSettings.rememberLogin
            );
    }


    const autoLogoutSetting =
        getSettingElement(
            "autoLogoutSetting"
        );

    if (autoLogoutSetting) {

        autoLogoutSetting.checked =
            Boolean(
                currentSystemSettings.autoLogout
            );
    }


    const sessionTimeoutSetting =
        getSettingElement(
            "sessionTimeoutSetting"
        );

    if (sessionTimeoutSetting) {

        sessionTimeoutSetting.value =
            currentSystemSettings.sessionTimeout;
    }
}


/* =========================================================
   READ FORM
   ========================================================= */

function readSystemSettingsForm() {

    return {

        /* Appearance */

        theme:
            getSettingElement(
                "themeSetting"
            )?.value ||
            DEFAULT_SYSTEM_SETTINGS.theme,


        sidebar:
            getSettingElement(
                "sidebarSetting"
            )?.value ||
            DEFAULT_SYSTEM_SETTINGS.sidebar,


        animations:
            getSettingElement(
                "animationSetting"
            )?.checked ??
            DEFAULT_SYSTEM_SETTINGS.animations,


        /* Dashboard */

        defaultPage:
            getSettingElement(
                "defaultPageSetting"
            )?.value ||
            DEFAULT_SYSTEM_SETTINGS.defaultPage,


        recentTransactions:
            getSettingElement(
                "recentTransactionsSetting"
            )?.value ||
            DEFAULT_SYSTEM_SETTINGS.recentTransactions,


        autoRefresh:
            getSettingElement(
                "autoRefreshSetting"
            )?.checked ??
            DEFAULT_SYSTEM_SETTINGS.autoRefresh,


        /* Notifications */

        notifications:
            getSettingElement(
                "notificationSetting"
            )?.checked ??
            DEFAULT_SYSTEM_SETTINGS.notifications,


        deliveryAlerts:
            getSettingElement(
                "deliveryAlertSetting"
            )?.checked ??
            DEFAULT_SYSTEM_SETTINGS.deliveryAlerts,


        delayAlerts:
            getSettingElement(
                "delayAlertSetting"
            )?.checked ??
            DEFAULT_SYSTEM_SETTINGS.delayAlerts,


        sound:
            getSettingElement(
                "soundSetting"
            )?.checked ??
            DEFAULT_SYSTEM_SETTINGS.sound,


        /* Date & Time */

        dateFormat:
            getSettingElement(
                "dateFormatSetting"
            )?.value ||
            DEFAULT_SYSTEM_SETTINGS.dateFormat,


        timeFormat:
            getSettingElement(
                "timeFormatSetting"
            )?.value ||
            DEFAULT_SYSTEM_SETTINGS.timeFormat,


        timezone:
            getSettingElement(
                "timezoneSetting"
            )?.value ||
            DEFAULT_SYSTEM_SETTINGS.timezone,


        /* Security */

        rememberLogin:
            getSettingElement(
                "rememberLoginSetting"
            )?.checked ??
            DEFAULT_SYSTEM_SETTINGS.rememberLogin,


        autoLogout:
            getSettingElement(
                "autoLogoutSetting"
            )?.checked ??
            DEFAULT_SYSTEM_SETTINGS.autoLogout,


        sessionTimeout:
            getSettingElement(
                "sessionTimeoutSetting"
            )?.value ||
            DEFAULT_SYSTEM_SETTINGS.sessionTimeout
    };
}


/* =========================================================
   SAVE CHANGES
   ========================================================= */

function saveSystemSettings(event) {

    /*
       IMPORTANT:
       Prevent form submission / page reload.
    */

    if (event) {

        event.preventDefault();

        event.stopPropagation();
    }


    console.log(
        "LOGIS-TECH SYSTEM SETTINGS: Save button clicked."
    );


    const newSettings =
        readSystemSettingsForm();


    console.log(
        "LOGIS-TECH SYSTEM SETTINGS: Form values:",
        newSettings
    );


    /*
       Build new settings.
    */

    const previousSettings = {
        ...currentSystemSettings
    };


    currentSystemSettings = {

        ...DEFAULT_SYSTEM_SETTINGS,

        ...previousSettings,

        ...newSettings
    };


    /*
       Save to localStorage.
    */

    const saved =
        saveSystemSettingsToStorage();


    if (!saved) {

        /*
           Restore previous state if localStorage failed.
        */

        currentSystemSettings = {
            ...previousSettings
        };


        showSettingsMessage(
            "Unable to save settings.",
            "error"
        );


        return false;
    }


    /*
       Apply immediately.
    */

    applySystemSettings();


    /*
       Rebuild auto logout if changed.
    */

    setupAutoLogout();


    /*
       Make sure form reflects the saved values.
    */

    populateSystemSettingsForm();


    showSettingsMessage(
        "System settings saved successfully.",
        "success"
    );


    console.log(
        "LOGIS-TECH SYSTEM SETTINGS: Settings saved successfully:",
        currentSystemSettings
    );


    return false;
}


/* =========================================================
   CANCEL CHANGES
   ========================================================= */

function cancelSystemSettings(event) {

    if (event) {

        event.preventDefault();

        event.stopPropagation();
    }


    /*
       Reload saved values from localStorage.
    */

    loadSavedSystemSettings();

    populateSystemSettingsForm();

    applySystemSettings();

    setupAutoLogout();


    showSettingsMessage(
        "Changes cancelled.",
        "info"
    );


    return false;
}


/* =========================================================
   RESTORE DEFAULT SETTINGS
   ========================================================= */

function restoreDefaultSystemSettings(event) {

    if (event) {

        event.preventDefault();

        event.stopPropagation();
    }


    const confirmed =
        confirm(
            "Restore all System Settings to their default values?"
        );


    if (!confirmed) {

        return false;
    }


    currentSystemSettings = {

        ...DEFAULT_SYSTEM_SETTINGS
    };


    const saved =
        saveSystemSettingsToStorage();


    if (!saved) {

        showSettingsMessage(
            "Unable to restore default settings.",
            "error"
        );

        return false;
    }


    populateSystemSettingsForm();

    applySystemSettings();

    setupAutoLogout();


    showSettingsMessage(
        "Default settings restored.",
        "success"
    );


    return false;
}


/* =========================================================
   APPLY SYSTEM SETTINGS
   ========================================================= */

function applySystemSettings() {

    applyTheme();

    applyAnimations();

    applySidebarPreference();
}


/* =========================================================
   THEME
   ========================================================= */

function applyTheme() {

    const html =
        document.documentElement;


    if (!html) {

        return;
    }


    const theme =
        currentSystemSettings.theme;


    html.removeAttribute(
        "data-theme"
    );


    document.body?.classList.remove(
        "dark-mode"
    );


    /* =====================================================
       DARK
       ===================================================== */

    if (theme === "dark") {

        html.setAttribute(
            "data-theme",
            "dark"
        );


        document.body?.classList.add(
            "dark-mode"
        );


        return;
    }


    /* =====================================================
       LIGHT
       ===================================================== */

    if (theme === "light") {

        html.setAttribute(
            "data-theme",
            "light"
        );


        return;
    }


    /* =====================================================
       SYSTEM
       ===================================================== */

    if (theme === "system") {

        const prefersDark =
            window.matchMedia &&
            window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;


        const selectedTheme =
            prefersDark
                ? "dark"
                : "light";


        html.setAttribute(
            "data-theme",
            selectedTheme
        );


        document.body?.classList.toggle(
            "dark-mode",
            prefersDark
        );
    }
}


/* =========================================================
   ANIMATIONS
   ========================================================= */

function applyAnimations() {

    document.documentElement.classList.toggle(
        "disable-animations",
        !Boolean(
            currentSystemSettings.animations
        )
    );
}


/* =========================================================
   SIDEBAR
   ========================================================= */

function applySidebarPreference() {

    const sidebar =
        document.querySelector(
            ".sidebar"
        );


    if (!sidebar) {

        return;
    }


    if (
        currentSystemSettings.sidebar ===
        "collapsed"
    ) {

        sidebar.classList.add(
            "collapsed"
        );

    } else {

        sidebar.classList.remove(
            "collapsed"
        );
    }
}


/* =========================================================
   CLEAR CACHE
   ========================================================= */

function clearSystemCache(event) {

    if (event) {

        event.preventDefault();

        event.stopPropagation();
    }


    const confirmed =
        confirm(
            "Clear cached LOGIS-TECH SYSTEM data?\n\n" +
            "Your saved System Settings and login session will not be removed."
        );


    if (!confirmed) {

        return false;
    }


    const keysToRemove = [

        "logitechSOListCache",
        "logitechSODetailsCache",
        "logitechDeliveryCache",
        "logitechFleetCache",

        "logitechTempData",
        "logitechAppCache"
    ];


    keysToRemove.forEach(
        key => {

            localStorage.removeItem(
                key
            );
        }
    );


    showSettingsMessage(
        "System cache cleared successfully.",
        "success"
    );


    return false;
}


/* =========================================================
   CLEAR TEMPORARY DATA
   ========================================================= */

function clearTemporaryData(event) {

    if (event) {

        event.preventDefault();

        event.stopPropagation();
    }


    const confirmed =
        confirm(
            "Clear temporary application data?"
        );


    if (!confirmed) {

        return false;
    }


    const temporaryPrefixes = [

        "temp_",
        "logitechTemp_",
        "draft_"
    ];


    Object.keys(
        localStorage
    ).forEach(
        key => {

            const shouldRemove =
                temporaryPrefixes.some(
                    prefix =>
                        key.startsWith(
                            prefix
                        )
                );


            if (shouldRemove) {

                localStorage.removeItem(
                    key
                );
            }
        }
    );


    showSettingsMessage(
        "Temporary data cleared.",
        "success"
    );


    return false;
}


/* =========================================================
   RESET LOCAL DATA
   ========================================================= */

function resetLocalData(event) {

    if (event) {

        event.preventDefault();

        event.stopPropagation();
    }


    const confirmed =
        confirm(
            "WARNING\n\n" +
            "This will remove LOGIS-TECH SYSTEM local data " +
            "stored in this browser.\n\n" +
            "Google Apps Script / Google Sheets data will NOT be deleted.\n\n" +
            "Continue?"
        );


    if (!confirmed) {

        return false;
    }


    const secondConfirm =
        confirm(
            "Are you absolutely sure?\n\n" +
            "This action cannot be undone."
        );


    if (!secondConfirm) {

        return false;
    }


    /*
       Protected login/session/settings.
    */

    const protectedKeys = [

        "logitechUser",
        "logitechLoggedIn",
        "logitechLoginTime",

        SYSTEM_SETTINGS_KEY
    ];


    Object.keys(
        localStorage
    ).forEach(
        key => {

            if (
                !protectedKeys.includes(
                    key
                )
            ) {

                localStorage.removeItem(
                    key
                );
            }
        }
    );


    showSettingsMessage(
        "Local application data has been reset.",
        "success"
    );


    setTimeout(
        () => {

            location.reload();

        },
        1200
    );


    return false;
}


/* =========================================================
   EXPORT LOCAL DATA
   ========================================================= */

function exportLocalData(event) {

    if (event) {

        event.preventDefault();

        event.stopPropagation();
    }


    try {

        const exportData = {

            exportedAt:
                new Date().toISOString(),

            application:
                "LOGIS-TECH SYSTEM",

            version:
                "2026.10",

            data: {}
        };


        Object.keys(
            localStorage
        ).forEach(
            key => {

                /*
                   Never export login/session credentials.
                */

                if (

                    key ===
                    "logitechUser" ||

                    key ===
                    "logitechLoggedIn" ||

                    key ===
                    "logitechLoginTime"

                ) {

                    return;
                }


                const value =
                    localStorage.getItem(
                        key
                    );


                try {

                    exportData.data[key] =
                        JSON.parse(
                            value
                        );

                } catch {

                    exportData.data[key] =
                        value;
                }
            }
        );


        const json =
            JSON.stringify(
                exportData,
                null,
                2
            );


        const blob =
            new Blob(
                [json],
                {
                    type:
                        "application/json"
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            url;


        link.download =
            "LOGIS-TECH-LOCAL-DATA-" +
            getDateForFilename() +
            ".json";


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        URL.revokeObjectURL(
            url
        );


        showSettingsMessage(
            "Local data exported successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "LOGIS-TECH SYSTEM SETTINGS: Export failed:",
            error
        );


        showSettingsMessage(
            "Unable to export local data.",
            "error"
        );
    }


    return false;
}


/* =========================================================
   REFRESH APPLICATION
   ========================================================= */

function refreshApplication(event) {

    if (event) {

        event.preventDefault();

        event.stopPropagation();
    }


    const confirmed =
        confirm(
            "Refresh LOGIS-TECH SYSTEM?"
        );


    if (!confirmed) {

        return false;
    }


    location.reload();


    return false;
}


/* =========================================================
   DATE FOR FILE NAME
   ========================================================= */

function getDateForFilename() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );


    const hour =
        String(
            now.getHours()
        ).padStart(
            2,
            "0"
        );


    const minute =
        String(
            now.getMinutes()
        ).padStart(
            2,
            "0"
        );


    const second =
        String(
            now.getSeconds()
        ).padStart(
            2,
            "0"
        );


    return (
        year +
        month +
        day +
        "-" +
        hour +
        minute +
        second
    );
}


/* =========================================================
   MESSAGE / TOAST
   ========================================================= */

function showSettingsMessage(
    message,
    type = "info"
) {

    /*
       Use existing system toast if available.
    */

    if (
        typeof window.showToast ===
        "function"
    ) {

        window.showToast(
            message,
            type
        );

        return;
    }


    /*
       Otherwise create our own notification.
    */

    let notification =
        document.getElementById(
            "systemSettingsMessage"
        );


    if (!notification) {

        notification =
            document.createElement(
                "div"
            );


        notification.id =
            "systemSettingsMessage";


        notification.className =
            "system-settings-message";


        document.body.appendChild(
            notification
        );
    }


    notification.textContent =
        message;


    notification.classList.remove(
        "success",
        "error",
        "info"
    );


    notification.classList.add(
        type
    );


    notification.classList.add(
        "show"
    );


    clearTimeout(
        notification._hideTimer
    );


    notification._hideTimer =
        setTimeout(
            () => {

                notification.classList.remove(
                    "show"
                );

            },
            3000
        );
}


/* =========================================================
   BUTTON EVENTS
   ========================================================= */

function bindSystemSettingsEvents() {

    /*
       IMPORTANT:
       Remove previously attached handlers first.
       This prevents duplicate save events.
    */


    /* =====================================================
       SAVE
       ===================================================== */

    const saveBtn =
        getSettingElement(
            "saveSettingsBtn"
        );


    if (saveBtn) {

        saveBtn.type = "button";


        saveBtn.removeEventListener(
            "click",
            saveSystemSettings
        );


        saveBtn.addEventListener(
            "click",
            saveSystemSettings
        );
    }


    /* =====================================================
       CANCEL
       ===================================================== */

    const cancelBtn =
        getSettingElement(
            "cancelSettingsBtn"
        );


    if (cancelBtn) {

        cancelBtn.type = "button";


        cancelBtn.removeEventListener(
            "click",
            cancelSystemSettings
        );


        cancelBtn.addEventListener(
            "click",
            cancelSystemSettings
        );
    }


    /* =====================================================
       RESTORE DEFAULTS
       ===================================================== */

    const restoreDefaultsBtn =
        getSettingElement(
            "restoreDefaultsBtn"
        );


    if (restoreDefaultsBtn) {

        restoreDefaultsBtn.type =
            "button";


        restoreDefaultsBtn.removeEventListener(
            "click",
            restoreDefaultSystemSettings
        );


        restoreDefaultsBtn.addEventListener(
            "click",
            restoreDefaultSystemSettings
        );
    }


    /* =====================================================
       CLEAR CACHE
       ===================================================== */

    const clearCacheBtn =
        getSettingElement(
            "clearCacheBtn"
        );


    if (clearCacheBtn) {

        clearCacheBtn.type =
            "button";


        clearCacheBtn.removeEventListener(
            "click",
            clearSystemCache
        );


        clearCacheBtn.addEventListener(
            "click",
            clearSystemCache
        );
    }


    /* =====================================================
       EXPORT DATA
       ===================================================== */

    const exportDataBtn =
        getSettingElement(
            "exportDataBtn"
        );


    if (exportDataBtn) {

        exportDataBtn.type =
            "button";


        exportDataBtn.removeEventListener(
            "click",
            exportLocalData
        );


        exportDataBtn.addEventListener(
            "click",
            exportLocalData
        );
    }


    /* =====================================================
       RESET LOCAL DATA
       ===================================================== */

    const resetLocalDataBtn =
        getSettingElement(
            "resetLocalDataBtn"
        );


    if (resetLocalDataBtn) {

        resetLocalDataBtn.type =
            "button";


        resetLocalDataBtn.removeEventListener(
            "click",
            resetLocalData
        );


        resetLocalDataBtn.addEventListener(
            "click",
            resetLocalData
        );
    }


    /* =====================================================
       REFRESH APPLICATION
       ===================================================== */

    const refreshApplicationBtn =
        getSettingElement(
            "refreshApplicationBtn"
        );


    if (refreshApplicationBtn) {

        refreshApplicationBtn.type =
            "button";


        refreshApplicationBtn.removeEventListener(
            "click",
            refreshApplication
        );


        refreshApplicationBtn.addEventListener(
            "click",
            refreshApplication
        );
    }


    /* =====================================================
       CLEAR TEMPORARY DATA
       ===================================================== */

    const clearTemporaryDataBtn =
        getSettingElement(
            "clearTemporaryDataBtn"
        );


    if (clearTemporaryDataBtn) {

        clearTemporaryDataBtn.type =
            "button";


        clearTemporaryDataBtn.removeEventListener(
            "click",
            clearTemporaryData
        );


        clearTemporaryDataBtn.addEventListener(
            "click",
            clearTemporaryData
        );
    }


    /* =====================================================
       THEME PREVIEW
       ===================================================== */

    const themeSetting =
        getSettingElement(
            "themeSetting"
        );


    if (themeSetting) {

        themeSetting.removeEventListener(
            "change",
            handleThemePreview
        );


        themeSetting.addEventListener(
            "change",
            handleThemePreview
        );
    }
}


/* =========================================================
   THEME PREVIEW HANDLER
   ========================================================= */

function handleThemePreview() {

    const selectedTheme =
        this.value;


    let appliedTheme =
        selectedTheme;


    if (
        selectedTheme ===
        "system"
    ) {

        const prefersDark =
            window.matchMedia &&
            window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;


        appliedTheme =
            prefersDark
                ? "dark"
                : "light";
    }


    document.documentElement.setAttribute(
        "data-theme",
        appliedTheme
    );


    document.body?.classList.toggle(
        "dark-mode",
        appliedTheme === "dark"
    );
}


/* =========================================================
   AUTO LOGOUT
   ========================================================= */

function setupAutoLogout() {

    /*
       Clear old interval.
    */

    if (autoLogoutTimer) {

        clearInterval(
            autoLogoutTimer
        );

        autoLogoutTimer = null;
    }


    /*
       Do not create duplicate activity listeners.
    */

    if (!autoLogoutListenersBound) {

        const activityEvents = [

            "mousemove",
            "mousedown",
            "keydown",
            "touchstart",
            "scroll"
        ];


        activityEvents.forEach(
            eventName => {

                document.addEventListener(
                    eventName,
                    updateAutoLogoutActivity,
                    {
                        passive: true
                    }
                );
            }
        );


        autoLogoutListenersBound =
            true;
    }


    /*
       Auto logout disabled.
    */

    if (
        !currentSystemSettings.autoLogout
    ) {

        return;
    }


    const timeoutMinutes =
        Number(
            currentSystemSettings.sessionTimeout
        );


    if (
        !Number.isFinite(
            timeoutMinutes
        ) ||
        timeoutMinutes <= 0
    ) {

        return;
    }


    /*
       Reset activity timestamp.
    */

    autoLogoutLastActivity =
        Date.now();


    const timeoutMilliseconds =
        timeoutMinutes *
        60 *
        1000;


    /*
       Check every 30 seconds.
    */

    autoLogoutTimer =
        setInterval(
            () => {

                const inactiveTime =
                    Date.now() -
                    autoLogoutLastActivity;


                if (
                    inactiveTime >=
                    timeoutMilliseconds
                ) {

                    clearInterval(
                        autoLogoutTimer
                    );


                    autoLogoutTimer =
                        null;


                    /*
                       Remove login state only.
                    */

                    localStorage.removeItem(
                        "logitechLoggedIn"
                    );


                    localStorage.removeItem(
                        "logitechLoginTime"
                    );


                    alert(
                        "Your LOGIS-TECH SYSTEM session has expired due to inactivity."
                    );


                    window.location.href =
                        "login.html";
                }

            },
            30000
        );
}


/* =========================================================
   AUTO LOGOUT ACTIVITY
   ========================================================= */

let autoLogoutLastActivity =
    Date.now();


function updateAutoLogoutActivity() {

    autoLogoutLastActivity =
        Date.now();
}


/* =========================================================
   SYSTEM THEME CHANGE LISTENER
   ========================================================= */

function setupSystemThemeListener() {

    if (
        systemThemeListenerBound
    ) {

        return;
    }


    if (
        !window.matchMedia
    ) {

        return;
    }


    const mediaQuery =
        window.matchMedia(
            "(prefers-color-scheme: dark)"
        );


    const handler = () => {

        if (
            currentSystemSettings.theme ===
            "system"
        ) {

            applyTheme();
        }
    };


    if (
        mediaQuery.addEventListener
    ) {

        mediaQuery.addEventListener(
            "change",
            handler
        );

    } else if (
        mediaQuery.addListener
    ) {

        mediaQuery.addListener(
            handler
        );
    }


    systemThemeListenerBound =
        true;
}


/* =========================================================
   PUBLIC API
   ========================================================= */

window.LOGISTECH_SYSTEM_SETTINGS = {

    get: function () {

        return {
            ...currentSystemSettings
        };
    },


    save: function (settings) {

        if (
            !settings ||
            typeof settings !== "object"
        ) {

            return false;
        }


        currentSystemSettings = {

            ...DEFAULT_SYSTEM_SETTINGS,

            ...currentSystemSettings,

            ...settings
        };


        const saved =
            saveSystemSettingsToStorage();


        if (!saved) {

            return false;
        }


        applySystemSettings();

        setupAutoLogout();

        populateSystemSettingsForm();


        return true;
    },


    reset: function () {

        currentSystemSettings = {

            ...DEFAULT_SYSTEM_SETTINGS
        };


        const saved =
            saveSystemSettingsToStorage();


        if (!saved) {

            return false;
        }


        applySystemSettings();

        setupAutoLogout();

        populateSystemSettingsForm();


        return true;
    }
};


/* =========================================================
   IMPORTANT
   =========================================================

   DO NOT AUTO-BOOT HERE.

   index.html is responsible for:

   1. Loading pages/system-settings.html
   2. Loading this JS
   3. Calling initializeSystemSettings()

   This prevents the JS from initializing before the
   Settings HTML exists and prevents duplicate event
   listeners.
   ========================================================= */
