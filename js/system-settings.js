/* =========================================================
   LOGIS-TECH SYSTEM
   SYSTEM SETTINGS MODULE
   =========================================================
   VERSION: 20261005-01

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
   INITIALIZE
   ========================================================= */

function initializeSystemSettings() {

    console.log("LOGIS-TECH SYSTEM SETTINGS: Initializing...");

    loadSavedSystemSettings();
    populateSystemSettingsForm();
    bindSystemSettingsEvents();

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
            localStorage.getItem(SYSTEM_SETTINGS_KEY);

        if (!savedSettings) {

            currentSystemSettings = {
                ...DEFAULT_SYSTEM_SETTINGS
            };

            return;
        }

        const parsedSettings =
            JSON.parse(savedSettings);

        currentSystemSettings = {
            ...DEFAULT_SYSTEM_SETTINGS,
            ...parsedSettings
        };

    } catch (error) {

        console.error(
            "Failed to load system settings:",
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
            JSON.stringify(currentSystemSettings)
        );

        return true;

    } catch (error) {

        console.error(
            "Failed to save system settings:",
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

    /* Appearance */

    const themeSetting =
        getSettingElement("themeSetting");

    if (themeSetting) {
        themeSetting.value =
            currentSystemSettings.theme;
    }


    const sidebarSetting =
        getSettingElement("sidebarSetting");

    if (sidebarSetting) {
        sidebarSetting.value =
            currentSystemSettings.sidebar;
    }


    const animationSetting =
        getSettingElement("animationSetting");

    if (animationSetting) {
        animationSetting.checked =
            currentSystemSettings.animations;
    }


    /* Dashboard */

    const defaultPageSetting =
        getSettingElement("defaultPageSetting");

    if (defaultPageSetting) {
        defaultPageSetting.value =
            currentSystemSettings.defaultPage;
    }


    const recentTransactionsSetting =
        getSettingElement("recentTransactionsSetting");

    if (recentTransactionsSetting) {
        recentTransactionsSetting.value =
            currentSystemSettings.recentTransactions;
    }


    const autoRefreshSetting =
        getSettingElement("autoRefreshSetting");

    if (autoRefreshSetting) {
        autoRefreshSetting.checked =
            currentSystemSettings.autoRefresh;
    }


    /* Notifications */

    const notificationSetting =
        getSettingElement("notificationSetting");

    if (notificationSetting) {
        notificationSetting.checked =
            currentSystemSettings.notifications;
    }


    const deliveryAlertSetting =
        getSettingElement("deliveryAlertSetting");

    if (deliveryAlertSetting) {
        deliveryAlertSetting.checked =
            currentSystemSettings.deliveryAlerts;
    }


    const delayAlertSetting =
        getSettingElement("delayAlertSetting");

    if (delayAlertSetting) {
        delayAlertSetting.checked =
            currentSystemSettings.delayAlerts;
    }


    const soundSetting =
        getSettingElement("soundSetting");

    if (soundSetting) {
        soundSetting.checked =
            currentSystemSettings.sound;
    }


    /* Date & Time */

    const dateFormatSetting =
        getSettingElement("dateFormatSetting");

    if (dateFormatSetting) {
        dateFormatSetting.value =
            currentSystemSettings.dateFormat;
    }


    const timeFormatSetting =
        getSettingElement("timeFormatSetting");

    if (timeFormatSetting) {
        timeFormatSetting.value =
            currentSystemSettings.timeFormat;
    }


    const timezoneSetting =
        getSettingElement("timezoneSetting");

    if (timezoneSetting) {
        timezoneSetting.value =
            currentSystemSettings.timezone;
    }


    /* Security */

    const rememberLoginSetting =
        getSettingElement("rememberLoginSetting");

    if (rememberLoginSetting) {
        rememberLoginSetting.checked =
            currentSystemSettings.rememberLogin;
    }


    const autoLogoutSetting =
        getSettingElement("autoLogoutSetting");

    if (autoLogoutSetting) {
        autoLogoutSetting.checked =
            currentSystemSettings.autoLogout;
    }


    const sessionTimeoutSetting =
        getSettingElement("sessionTimeoutSetting");

    if (sessionTimeoutSetting) {
        sessionTimeoutSetting.value =
            currentSystemSettings.sessionTimeout;
    }
}


/* =========================================================
   READ FORM
   ========================================================= */

function readSystemSettingsForm() {

    const settings = {

        /* Appearance */

        theme:
            getSettingElement("themeSetting")?.value
            || DEFAULT_SYSTEM_SETTINGS.theme,

        sidebar:
            getSettingElement("sidebarSetting")?.value
            || DEFAULT_SYSTEM_SETTINGS.sidebar,

        animations:
            getSettingElement("animationSetting")?.checked
            ?? DEFAULT_SYSTEM_SETTINGS.animations,


        /* Dashboard */

        defaultPage:
            getSettingElement("defaultPageSetting")?.value
            || DEFAULT_SYSTEM_SETTINGS.defaultPage,

        recentTransactions:
            getSettingElement("recentTransactionsSetting")?.value
            || DEFAULT_SYSTEM_SETTINGS.recentTransactions,

        autoRefresh:
            getSettingElement("autoRefreshSetting")?.checked
            ?? DEFAULT_SYSTEM_SETTINGS.autoRefresh,


        /* Notifications */

        notifications:
            getSettingElement("notificationSetting")?.checked
            ?? DEFAULT_SYSTEM_SETTINGS.notifications,

        deliveryAlerts:
            getSettingElement("deliveryAlertSetting")?.checked
            ?? DEFAULT_SYSTEM_SETTINGS.deliveryAlerts,

        delayAlerts:
            getSettingElement("delayAlertSetting")?.checked
            ?? DEFAULT_SYSTEM_SETTINGS.delayAlerts,

        sound:
            getSettingElement("soundSetting")?.checked
            ?? DEFAULT_SYSTEM_SETTINGS.sound,


        /* Date & Time */

        dateFormat:
            getSettingElement("dateFormatSetting")?.value
            || DEFAULT_SYSTEM_SETTINGS.dateFormat,

        timeFormat:
            getSettingElement("timeFormatSetting")?.value
            || DEFAULT_SYSTEM_SETTINGS.timeFormat,

        timezone:
            getSettingElement("timezoneSetting")?.value
            || DEFAULT_SYSTEM_SETTINGS.timezone,


        /* Security */

        rememberLogin:
            getSettingElement("rememberLoginSetting")?.checked
            ?? DEFAULT_SYSTEM_SETTINGS.rememberLogin,

        autoLogout:
            getSettingElement("autoLogoutSetting")?.checked
            ?? DEFAULT_SYSTEM_SETTINGS.autoLogout,

        sessionTimeout:
            getSettingElement("sessionTimeoutSetting")?.value
            || DEFAULT_SYSTEM_SETTINGS.sessionTimeout
    };

    return settings;
}


/* =========================================================
   SAVE CHANGES
   ========================================================= */

function saveSystemSettings() {

    const newSettings =
        readSystemSettingsForm();

    currentSystemSettings = {
        ...DEFAULT_SYSTEM_SETTINGS,
        ...newSettings
    };

    const saved =
        saveSystemSettingsToStorage();

    if (!saved) {

        showSettingsMessage(
            "Unable to save settings.",
            "error"
        );

        return;
    }


    /* Apply settings immediately */

    applySystemSettings();


    showSettingsMessage(
        "System settings saved successfully.",
        "success"
    );

    console.log(
        "System settings saved:",
        currentSystemSettings
    );
}


/* =========================================================
   CANCEL CHANGES
   ========================================================= */

function cancelSystemSettings() {

    populateSystemSettingsForm();

    applySystemSettings();

    showSettingsMessage(
        "Changes cancelled.",
        "info"
    );
}


/* =========================================================
   RESTORE DEFAULT SETTINGS
   ========================================================= */

function restoreDefaultSystemSettings() {

    const confirmed =
        confirm(
            "Restore all System Settings to their default values?"
        );

    if (!confirmed) {
        return;
    }

    currentSystemSettings = {
        ...DEFAULT_SYSTEM_SETTINGS
    };

    saveSystemSettingsToStorage();

    populateSystemSettingsForm();

    applySystemSettings();

    showSettingsMessage(
        "Default settings restored.",
        "success"
    );
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

    const theme =
        currentSystemSettings.theme;

    const html =
        document.documentElement;

    if (!html) {
        return;
    }


    /* Remove previous theme attributes */

    html.removeAttribute("data-theme");


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


    if (theme === "light") {

        html.setAttribute(
            "data-theme",
            "light"
        );

        document.body?.classList.remove(
            "dark-mode"
        );

        return;
    }


    /* SYSTEM */

    if (theme === "system") {

        const prefersDark =
            window.matchMedia &&
            window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;

        html.setAttribute(
            "data-theme",
            prefersDark
                ? "dark"
                : "light"
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
        !currentSystemSettings.animations
    );
}


/* =========================================================
   SIDEBAR
   ========================================================= */

function applySidebarPreference() {

    const sidebar =
        document.querySelector(".sidebar");

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

function clearSystemCache() {

    const confirmed =
        confirm(
            "Clear cached LOGIS-TECH SYSTEM data?\n\n" +
            "Your saved System Settings and login session will not be removed."
        );

    if (!confirmed) {
        return;
    }


    const keysToRemove = [

        "logitechSOListCache",
        "logitechSODetailsCache",
        "logitechDeliveryCache",
        "logitechFleetCache",

        "logitechTempData",
        "logitechAppCache"
    ];


    keysToRemove.forEach(key => {

        localStorage.removeItem(key);

    });


    showSettingsMessage(
        "System cache cleared successfully.",
        "success"
    );
}


/* =========================================================
   CLEAR TEMPORARY DATA
   ========================================================= */

function clearTemporaryData() {

    const confirmed =
        confirm(
            "Clear temporary application data?"
        );

    if (!confirmed) {
        return;
    }


    const temporaryPrefixes = [

        "temp_",
        "logitechTemp_",
        "draft_"
    ];


    Object.keys(localStorage).forEach(key => {

        const shouldRemove =
            temporaryPrefixes.some(
                prefix =>
                    key.startsWith(prefix)
            );

        if (shouldRemove) {

            localStorage.removeItem(key);

        }
    });


    showSettingsMessage(
        "Temporary data cleared.",
        "success"
    );
}


/* =========================================================
   RESET LOCAL DATA
   ========================================================= */

function resetLocalData() {

    const confirmed =
        confirm(
            "WARNING\n\n" +
            "This will remove LOGIS-TECH SYSTEM local data " +
            "stored in this browser.\n\n" +
            "Google Apps Script / Google Sheets data will NOT be deleted.\n\n" +
            "Continue?"
        );

    if (!confirmed) {
        return;
    }


    const secondConfirm =
        confirm(
            "Are you absolutely sure?\n\n" +
            "This action cannot be undone."
        );

    if (!secondConfirm) {
        return;
    }


    /*
       IMPORTANT:
       Do not remove login/session data automatically
       because doing so would unexpectedly log the user out.
    */

    const protectedKeys = [

        "logitechUser",
        "logitechLoggedIn",
        "logitechLoginTime",
        SYSTEM_SETTINGS_KEY
    ];


    Object.keys(localStorage).forEach(key => {

        if (!protectedKeys.includes(key)) {

            localStorage.removeItem(key);

        }
    });


    showSettingsMessage(
        "Local application data has been reset.",
        "success"
    );


    setTimeout(() => {

        location.reload();

    }, 1200);
}


/* =========================================================
   EXPORT LOCAL DATA
   ========================================================= */

function exportLocalData() {

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


        Object.keys(localStorage).forEach(key => {

            /*
               Do not export login/session credentials.
            */

            if (
                key === "logitechUser" ||
                key === "logitechLoggedIn" ||
                key === "logitechLoginTime"
            ) {
                return;
            }


            const value =
                localStorage.getItem(key);

            try {

                exportData.data[key] =
                    JSON.parse(value);

            } catch {

                exportData.data[key] =
                    value;
            }
        });


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
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            "LOGIS-TECH-LOCAL-DATA-" +
            getDateForFilename() +
            ".json";


        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);


        showSettingsMessage(
            "Local data exported successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            "Export failed:",
            error
        );

        showSettingsMessage(
            "Unable to export local data.",
            "error"
        );
    }
}


/* =========================================================
   REFRESH APPLICATION
   ========================================================= */

function refreshApplication() {

    const confirmed =
        confirm(
            "Refresh LOGIS-TECH SYSTEM?"
        );

    if (!confirmed) {
        return;
    }


    location.reload();
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
        ).padStart(2, "0");

    const day =
        String(
            now.getDate()
        ).padStart(2, "0");

    const hour =
        String(
            now.getHours()
        ).padStart(2, "0");

    const minute =
        String(
            now.getMinutes()
        ).padStart(2, "0");

    const second =
        String(
            now.getSeconds()
        ).padStart(2, "0");


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
   MESSAGE
   ========================================================= */

function showSettingsMessage(
    message,
    type = "info"
) {

    /*
       Try existing notification system first.
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
       Create simple temporary notification.
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
        setTimeout(() => {

            notification.classList.remove(
                "show"
            );

        }, 3000);
}


/* =========================================================
   BUTTON EVENTS
   ========================================================= */

function bindSystemSettingsEvents() {

    const saveBtn =
        getSettingElement(
            "saveSettingsBtn"
        );

    if (saveBtn) {

        saveBtn.addEventListener(
            "click",
            saveSystemSettings
        );
    }


    const cancelBtn =
        getSettingElement(
            "cancelSettingsBtn"
        );

    if (cancelBtn) {

        cancelBtn.addEventListener(
            "click",
            cancelSystemSettings
        );
    }


    const restoreDefaultsBtn =
        getSettingElement(
            "restoreDefaultsBtn"
        );

    if (restoreDefaultsBtn) {

        restoreDefaultsBtn.addEventListener(
            "click",
            restoreDefaultSystemSettings
        );
    }


    const clearCacheBtn =
        getSettingElement(
            "clearCacheBtn"
        );

    if (clearCacheBtn) {

        clearCacheBtn.addEventListener(
            "click",
            clearSystemCache
        );
    }


    const exportDataBtn =
        getSettingElement(
            "exportDataBtn"
        );

    if (exportDataBtn) {

        exportDataBtn.addEventListener(
            "click",
            exportLocalData
        );
    }


    const resetLocalDataBtn =
        getSettingElement(
            "resetLocalDataBtn"
        );

    if (resetLocalDataBtn) {

        resetLocalDataBtn.addEventListener(
            "click",
            resetLocalData
        );
    }


    const refreshApplicationBtn =
        getSettingElement(
            "refreshApplicationBtn"
        );

    if (refreshApplicationBtn) {

        refreshApplicationBtn.addEventListener(
            "click",
            refreshApplication
        );
    }


    const clearTemporaryDataBtn =
        getSettingElement(
            "clearTemporaryDataBtn"
        );

    if (clearTemporaryDataBtn) {

        clearTemporaryDataBtn.addEventListener(
            "click",
            clearTemporaryData
        );
    }


    /* Theme preview */

    const themeSetting =
        getSettingElement(
            "themeSetting"
        );

    if (themeSetting) {

        themeSetting.addEventListener(
            "change",
            function () {

                const selectedTheme =
                    this.value;

                document.documentElement
                    .setAttribute(
                        "data-theme",
                        selectedTheme === "system"
                            ? (
                                window.matchMedia(
                                    "(prefers-color-scheme: dark)"
                                ).matches
                                    ? "dark"
                                    : "light"
                            )
                            : selectedTheme
                    );
            }
        );
    }
}


/* =========================================================
   AUTO LOGOUT
   ========================================================= */

let autoLogoutTimer = null;


function setupAutoLogout() {

    clearTimeout(
        autoLogoutTimer
    );


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


    const timeoutMilliseconds =
        timeoutMinutes *
        60 *
        1000;


    let lastActivity =
        Date.now();


    const activityEvents = [

        "mousemove",
        "mousedown",
        "keydown",
        "touchstart",
        "scroll"
    ];


    const updateActivity = () => {

        lastActivity =
            Date.now();
    };


    activityEvents.forEach(eventName => {

        document.addEventListener(
            eventName,
            updateActivity,
            {
                passive: true
            }
        );
    });


    autoLogoutTimer =
        setInterval(() => {

            const inactiveTime =
                Date.now() -
                lastActivity;


            if (
                inactiveTime >=
                timeoutMilliseconds
            ) {

                clearInterval(
                    autoLogoutTimer
                );


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

        }, 30000);
}


/* =========================================================
   SYSTEM THEME CHANGE LISTENER
   ========================================================= */

function setupSystemThemeListener() {

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

        currentSystemSettings = {

            ...DEFAULT_SYSTEM_SETTINGS,

            ...currentSystemSettings,

            ...settings
        };

        saveSystemSettingsToStorage();

        applySystemSettings();
    },

    reset: function () {

        currentSystemSettings = {
            ...DEFAULT_SYSTEM_SETTINGS
        };

        saveSystemSettingsToStorage();

        applySystemSettings();
    }
};


/* =========================================================
   INITIAL LOAD
   ========================================================= */

(function bootSystemSettings() {

    /*
       When loaded through index.html,
       the settings HTML may already exist.
    */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            function () {

                initializeSystemSettings();
                setupSystemThemeListener();
                setupAutoLogout();

            },
            {
                once: true
            }
        );

    } else {

        initializeSystemSettings();
        setupSystemThemeListener();
        setupAutoLogout();
    }

})();
