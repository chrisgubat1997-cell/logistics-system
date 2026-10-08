/* =========================================================
   LOGIS-TECH SYSTEM
   SYNC MANAGER
   sync-manager.js
   VERSION: 20261008-01

   PURPOSE:
   - Check Google Sheets data version
   - Sync changed data to IndexedDB
   - Keep local cache updated
   - Allow multiple laptops to stay synchronized
   - Does NOT replace existing modules yet
========================================================= */

(function () {

    "use strict";

    console.log("=================================");
    console.log("LOGIS-TECH SYNC MANAGER LOADED");
    console.log("=================================");


    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const API_URL =
        "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";

    const SYNC_INTERVAL = 60000; // 60 seconds

    let syncTimer = null;
    let syncRunning = false;


    /* =====================================================
       API REQUEST
    ===================================================== */

    async function syncAPI(action, data = {}) {

        const response = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type":
                    "text/plain;charset=utf-8"
            },

            body: JSON.stringify({
                action: action,
                data: data
            })

        });

        if (!response.ok) {

            throw new Error(
                "API request failed: " +
                response.status
            );

        }

        const result =
            await response.json();

        if (
            result &&
            result.success === false
        ) {

            throw new Error(
                result.message ||
                "API returned an error."
            );

        }

        return result;

    }


    /* =====================================================
       EVENT HELPER
    ===================================================== */

    function dispatchEvent(name, detail = {}) {

        window.dispatchEvent(
            new CustomEvent(
                name,
                {
                    detail: detail
                }
            )
        );

    }


    /* =====================================================
       GET SERVER SYNC STATUS
    ===================================================== */

    async function getServerSyncStatus() {

        return await syncAPI(
            "getSyncStatus"
        );

    }


    /* =====================================================
       GET INITIAL SYNC DATA
    ===================================================== */

    async function getInitialSyncData() {

        return await syncAPI(
            "getInitialSyncData"
        );

    }


    /* =====================================================
       SAVE INITIAL DATA TO CACHE
    ===================================================== */

    async function saveInitialData(result) {

        if (!result) {
            return;
        }


        /*
         * SUPPORT DIFFERENT RESPONSE STRUCTURES
         */

        const data =
            result.data || result;


        const customers =
            data.customers ||
            data.CUSTOMERS ||
            [];


        const salesOrders =
            data.salesOrders ||
            data.salesorders ||
            data.SALES_ORDERS ||
            [];


        const version =
            data.version ||
            data.syncVersion ||
            data.dataVersion ||
            null;


        const timestamp =
            data.timestamp ||
            data.syncedAt ||
            new Date().toISOString();


        console.log(
            "SYNC DATA RECEIVED:",
            {
                customers:
                    customers.length,

                salesOrders:
                    salesOrders.length,

                version:
                    version
            }
        );


        /* =================================================
           SAVE CUSTOMERS
        ================================================= */

        if (
            window.LogisTechCache &&
            customers.length > 0
        ) {

            await window.LogisTechCache.replaceAll(
                "customers",
                customers
            );

        }


        /* =================================================
           SAVE SALES ORDERS
        ================================================= */

        if (
            window.LogisTechCache &&
            salesOrders.length > 0
        ) {

            await window.LogisTechCache.replaceAll(
                "salesOrders",
                salesOrders
            );

        }


        /* =================================================
           SAVE SYNC META
        ================================================= */

        if (
            window.LogisTechCache
        ) {

            if (version !== null) {

                await window.LogisTechCache.setMeta(
                    "syncVersion",
                    version
                );

            }

            await window.LogisTechCache.setMeta(
                "lastSyncAt",
                timestamp
            );

        }


        return {

            customers:
                customers.length,

            salesOrders:
                salesOrders.length,

            version:
                version,

            timestamp:
                timestamp

        };

    }


    /* =====================================================
       INITIAL SYNC
    ===================================================== */

    async function initialSync() {

        if (!navigator.onLine) {

            console.warn(
                "LOGIS-TECH is offline. Using local cache."
            );

            dispatchEvent(
                "logistech:sync-complete",
                {
                    source: "cache",
                    offline: true
                }
            );

            return;

        }


        if (!window.LogisTechCache) {

            console.warn(
                "LogisTechCache not available."
            );

            return;

        }


        try {

            dispatchEvent(
                "logistech:sync-start",
                {
                    type: "initial"
                }
            );


            /*
             * CHECK EXISTING CACHE
             */

            const cachedVersion =
                await window.LogisTechCache.getMeta(
                    "syncVersion"
                );


            const cachedCustomers =
                await window.LogisTechCache.count(
                    "customers"
                );


            const cachedSalesOrders =
                await window.LogisTechCache.count(
                    "salesOrders"
                );


            console.log(
                "LOCAL CACHE:",
                {
                    version:
                        cachedVersion,

                    customers:
                        cachedCustomers,

                    salesOrders:
                        cachedSalesOrders
                }
            );


            /*
             * IF CACHE IS EMPTY
             * DOWNLOAD INITIAL DATA
             */

            if (
                cachedCustomers === 0 &&
                cachedSalesOrders === 0
            ) {

                console.log(
                    "No local data found."
                );

                console.log(
                    "Downloading initial data..."
                );


                const result =
                    await getInitialSyncData();


                const saved =
                    await saveInitialData(
                        result
                    );


                dispatchEvent(
                    "logistech:data-updated",
                    {
                        source: "initial-sync",
                        data: saved
                    }
                );


                dispatchEvent(
                    "logistech:sync-complete",
                    {
                        type: "initial",
                        changed: true,
                        data: saved
                    }
                );


                return;

            }


            /*
             * CACHE EXISTS
             * CHECK SERVER VERSION
             */

            const status =
                await getServerSyncStatus();


            const serverVersion =
                status.version ||
                status.syncVersion ||
                status.dataVersion ||
                status.data?.version ||
                null;


            console.log(
                "SERVER VERSION:",
                serverVersion
            );

            console.log(
                "LOCAL VERSION:",
                cachedVersion
            );


            /*
             * NO VERSION
             */

            if (
                serverVersion === null
            ) {

                console.warn(
                    "Server sync version unavailable."
                );

                dispatchEvent(
                    "logistech:sync-complete",
                    {
                        type: "initial",
                        changed: false
                    }
                );

                return;

            }


            /*
             * VERSION MATCH
             */

            if (
                String(serverVersion) ===
                String(cachedVersion)
            ) {

                console.log(
                    "CACHE IS UP TO DATE."
                );


                await window.LogisTechCache.setMeta(
                    "lastSyncCheck",
                    new Date().toISOString()
                );


                dispatchEvent(
                    "logistech:sync-complete",
                    {
                        type: "initial",
                        changed: false,
                        version:
                            serverVersion
                    }
                );


                return;

            }


            /*
             * VERSION DIFFERENT
             */

            console.log(
                "DATA CHANGED."
            );

            console.log(
                "Updating local cache..."
            );


            const result =
                await getInitialSyncData();


            const saved =
                await saveInitialData(
                    result
                );


            dispatchEvent(
                "logistech:data-updated",
                {
                    source: "version-change",
                    data: saved
                }
            );


            dispatchEvent(
                "logistech:sync-complete",
                {
                    type: "version-change",
                    changed: true,
                    data: saved
                }
            );


        }
        catch (error) {

            console.error(
                "INITIAL SYNC ERROR:",
                error
            );


            dispatchEvent(
                "logistech:sync-error",
                {
                    type: "initial",
                    error:
                        error.message
                }
            );

        }

    }


    /* =====================================================
       BACKGROUND SYNC
    ===================================================== */

    async function backgroundSync() {

        if (syncRunning) {
            return;
        }


        if (!navigator.onLine) {

            console.log(
                "Background sync skipped: offline."
            );

            return;

        }


        if (!window.LogisTechCache) {
            return;
        }


        syncRunning = true;


        try {

            dispatchEvent(
                "logistech:sync-start",
                {
                    type: "background"
                }
            );


            const localVersion =
                await window.LogisTechCache.getMeta(
                    "syncVersion"
                );


            const status =
                await getServerSyncStatus();


            const serverVersion =
                status.version ||
                status.syncVersion ||
                status.dataVersion ||
                status.data?.version ||
                null;


            if (
                serverVersion === null
            ) {

                return;

            }


            /*
             * NOTHING CHANGED
             */

            if (
                String(serverVersion) ===
                String(localVersion)
            ) {

                await window.LogisTechCache.setMeta(
                    "lastSyncCheck",
                    new Date().toISOString()
                );


                dispatchEvent(
                    "logistech:sync-complete",
                    {
                        type: "background",
                        changed: false,
                        version:
                            serverVersion
                    }
                );


                return;

            }


            /*
             * SERVER DATA CHANGED
             */

            console.log(
                "BACKGROUND SYNC:"
            );

            console.log(
                "Server version changed."
            );


            const result =
                await getInitialSyncData();


            const saved =
                await saveInitialData(
                    result
                );


            dispatchEvent(
                "logistech:data-updated",
                {
                    source: "background-sync",
                    data: saved
                }
            );


            dispatchEvent(
                "logistech:sync-complete",
                {
                    type: "background",
                    changed: true,
                    data: saved
                }
            );


        }
        catch (error) {

            console.error(
                "BACKGROUND SYNC ERROR:",
                error
            );


            dispatchEvent(
                "logistech:sync-error",
                {
                    type: "background",
                    error:
                        error.message
                }
            );

        }
        finally {

            syncRunning = false;

        }

    }


    /* =====================================================
       START BACKGROUND TIMER
    ===================================================== */

    function startBackgroundSync() {

        if (syncTimer) {

            clearInterval(
                syncTimer
            );

        }


        syncTimer =
            setInterval(
                backgroundSync,
                SYNC_INTERVAL
            );


        console.log(
            "Background sync started."
        );

        console.log(
            "Interval:",
            SYNC_INTERVAL / 1000,
            "seconds"
        );

    }


    /* =====================================================
       STOP BACKGROUND TIMER
    ===================================================== */

    function stopBackgroundSync() {

        if (syncTimer) {

            clearInterval(
                syncTimer
            );

            syncTimer = null;

        }


        console.log(
            "Background sync stopped."
        );

    }


    /* =====================================================
       ONLINE EVENT
    ===================================================== */

    window.addEventListener(
        "online",
        function () {

            console.log(
                "Internet connection restored."
            );


            setTimeout(
                function () {

                    backgroundSync();

                },
                1500
            );

        }
    );


    /* =====================================================
       VISIBILITY EVENT
    ===================================================== */

    document.addEventListener(
        "visibilitychange",
        function () {

            if (
                document.visibilityState ===
                "visible"
            ) {

                backgroundSync();

            }

        }
    );


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.LogisTechSync = {

        initialSync:
            initialSync,

        backgroundSync:
            backgroundSync,

        getServerSyncStatus:
            getServerSyncStatus,

        getInitialSyncData:
            getInitialSyncData,

        start:
            startBackgroundSync,

        stop:
            stopBackgroundSync,

        isSyncRunning:
            function () {

                return syncRunning;

            }

    };


    /* =====================================================
       START SYSTEM
    ===================================================== */

    async function startSyncManager() {

        console.log(
            "Starting LOGIS-TECH Sync Manager..."
        );


        /*
         * WAIT FOR CACHE MANAGER
         */

        if (
            !window.LogisTechCache
        ) {

            console.warn(
                "Waiting for Cache Manager..."
            );


            let attempts = 0;


            while (
                !window.LogisTechCache &&
                attempts < 50
            ) {

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            100
                        )
                );

                attempts++;

            }

        }


        if (
            !window.LogisTechCache
        ) {

            console.error(
                "Cache Manager could not be loaded."
            );

            return;

        }


        /*
         * OPEN DATABASE
         */

        try {

            await window.LogisTechCache.open();

        }
        catch (error) {

            console.error(
                "Cache database error:",
                error
            );

            return;

        }


        /*
         * INITIAL SYNC
         */

        await initialSync();


        /*
         * START BACKGROUND SYNC
         */

        startBackgroundSync();


        console.log(
            "LOGIS-TECH Sync Manager READY."
        );

    }


    /* =====================================================
       DOM READY
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            startSyncManager
        );

    }
    else {

        startSyncManager();

    }


})();
