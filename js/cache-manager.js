/* =========================================================
   LOGIS-TECH SYSTEM
   LOCAL CACHE MANAGER
   cache-manager.js
   VERSION: 20261008-01

   PURPOSE:
   - IndexedDB local cache
   - Fast local data access
   - Customer cache
   - Sales Order cache
   - Persistent across browser restart
   - Google Sheets remains the source of truth
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const DB_NAME =
        "LOGIS_TECH_LOCAL_CACHE";

    const DB_VERSION =
        1;


    const STORES = {

        CUSTOMERS:
            "customers",

        SALES_ORDERS:
            "salesOrders",

        SYNC_META:
            "syncMeta"

    };


    /* =====================================================
       OPEN DATABASE
    ===================================================== */

    function openDatabase() {

        return new Promise(
            function (resolve, reject) {

                const request =
                    indexedDB.open(
                        DB_NAME,
                        DB_VERSION
                    );


                request.onupgradeneeded =
                    function (event) {

                        const db =
                            event.target.result;


                        /*
                         * CUSTOMERS
                         */

                        if (
                            !db.objectStoreNames.contains(
                                STORES.CUSTOMERS
                            )
                        ) {

                            db.createObjectStore(
                                STORES.CUSTOMERS,
                                {
                                    keyPath:
                                        "CUSTOMER_ID"
                                }
                            );

                        }


                        /*
                         * SALES ORDERS
                         */

                        if (
                            !db.objectStoreNames.contains(
                                STORES.SALES_ORDERS
                            )
                        ) {

                            db.createObjectStore(
                                STORES.SALES_ORDERS,
                                {
                                    keyPath:
                                        "SO_NUMBER"
                                }
                            );

                        }


                        /*
                         * SYNC META
                         */

                        if (
                            !db.objectStoreNames.contains(
                                STORES.SYNC_META
                            )
                        ) {

                            db.createObjectStore(
                                STORES.SYNC_META,
                                {
                                    keyPath:
                                        "key"
                                }
                            );

                        }

                    };


                request.onsuccess =
                    function () {

                        resolve(
                            request.result
                        );

                    };


                request.onerror =
                    function () {

                        console.error(
                            "IndexedDB error:",
                            request.error
                        );


                        reject(
                            request.error
                        );

                    };

            }
        );

    }


    /* =====================================================
       GENERIC PUT
    ===================================================== */

    async function put(
        storeName,
        record
    ) {

        if (!record) {

            return false;

        }


        const db =
            await openDatabase();


        return new Promise(
            function (resolve, reject) {

                const transaction =
                    db.transaction(
                        storeName,
                        "readwrite"
                    );


                const store =
                    transaction.objectStore(
                        storeName
                    );


                const request =
                    store.put(
                        record
                    );


                request.onsuccess =
                    function () {

                        resolve(
                            true
                        );

                    };


                request.onerror =
                    function () {

                        reject(
                            request.error
                        );

                    };

            }
        );

    }


    /* =====================================================
       GENERIC GET
    ===================================================== */

    async function get(
        storeName,
        key
    ) {

        const db =
            await openDatabase();


        return new Promise(
            function (resolve, reject) {

                const transaction =
                    db.transaction(
                        storeName,
                        "readonly"
                    );


                const store =
                    transaction.objectStore(
                        storeName
                    );


                const request =
                    store.get(
                        key
                    );


                request.onsuccess =
                    function () {

                        resolve(
                            request.result ||
                            null
                        );

                    };


                request.onerror =
                    function () {

                        reject(
                            request.error
                        );

                    };

            }
        );

    }


    /* =====================================================
       GET ALL
    ===================================================== */

    async function getAll(
        storeName
    ) {

        const db =
            await openDatabase();


        return new Promise(
            function (resolve, reject) {

                const transaction =
                    db.transaction(
                        storeName,
                        "readonly"
                    );


                const store =
                    transaction.objectStore(
                        storeName
                    );


                const request =
                    store.getAll();


                request.onsuccess =
                    function () {

                        resolve(
                            request.result ||
                            []
                        );

                    };


                request.onerror =
                    function () {

                        reject(
                            request.error
                        );

                    };

            }
        );

    }


    /* =====================================================
       CLEAR STORE
    ===================================================== */

    async function clear(
        storeName
    ) {

        const db =
            await openDatabase();


        return new Promise(
            function (resolve, reject) {

                const transaction =
                    db.transaction(
                        storeName,
                        "readwrite"
                    );


                const store =
                    transaction.objectStore(
                        storeName
                    );


                const request =
                    store.clear();


                request.onsuccess =
                    function () {

                        resolve(
                            true
                        );

                    };


                request.onerror =
                    function () {

                        reject(
                            request.error
                        );

                    };

            }
        );

    }


    /* =====================================================
       CUSTOMERS
    ===================================================== */

    async function saveCustomers(
        customers
    ) {

        if (!Array.isArray(customers)) {

            return;

        }


        const db =
            await openDatabase();


        return new Promise(
            function (resolve, reject) {

                const transaction =
                    db.transaction(
                        STORES.CUSTOMERS,
                        "readwrite"
                    );


                const store =
                    transaction.objectStore(
                        STORES.CUSTOMERS
                    );


                customers.forEach(
                    function (customer) {

                        if (!customer) {
                            return;
                        }


                        const customerId =
                            customer.CUSTOMER_ID ||
                            customer.customerId;


                        if (!customerId) {
                            return;
                        }


                        store.put(
                            {
                                ...customer,

                                CUSTOMER_ID:
                                    customerId
                            }
                        );

                    }
                );


                transaction.oncomplete =
                    function () {

                        resolve(
                            true
                        );

                    };


                transaction.onerror =
                    function () {

                        reject(
                            transaction.error
                        );

                    };

            }
        );

    }


    async function getCustomers() {

        return getAll(
            STORES.CUSTOMERS
        );

    }


    async function getCustomer(
        customerId
    ) {

        if (!customerId) {

            return null;

        }


        return get(
            STORES.CUSTOMERS,
            customerId
        );

    }


    /* =====================================================
       SALES ORDERS
    ===================================================== */

    async function saveSalesOrders(
        salesOrders
    ) {

        if (!Array.isArray(salesOrders)) {

            return;

        }


        const db =
            await openDatabase();


        return new Promise(
            function (resolve, reject) {

                const transaction =
                    db.transaction(
                        STORES.SALES_ORDERS,
                        "readwrite"
                    );


                const store =
                    transaction.objectStore(
                        STORES.SALES_ORDERS
                    );


                salesOrders.forEach(
                    function (salesOrder) {

                        if (!salesOrder) {
                            return;
                        }


                        const soNumber =
                            salesOrder.SO_NUMBER ||
                            salesOrder.soNumber;


                        if (!soNumber) {
                            return;
                        }


                        store.put(
                            {
                                ...salesOrder,

                                SO_NUMBER:
                                    soNumber
                            }
                        );

                    }
                );


                transaction.oncomplete =
                    function () {

                        resolve(
                            true
                        );

                    };


                transaction.onerror =
                    function () {

                        reject(
                            transaction.error
                        );

                    };

            }
        );

    }


    async function getSalesOrders() {

        return getAll(
            STORES.SALES_ORDERS
        );

    }


    async function getSalesOrder(
        soNumber
    ) {

        if (!soNumber) {

            return null;

        }


        return get(
            STORES.SALES_ORDERS,
            soNumber
        );

    }


    /* =====================================================
       SYNC META
    ===================================================== */

    async function setSyncMeta(
        key,
        value
    ) {

        return put(
            STORES.SYNC_META,
            {
                key:
                    key,

                value:
                    value
            }
        );

    }


    async function getSyncMeta(
        key
    ) {

        const result =
            await get(
                STORES.SYNC_META,
                key
            );


        return result
            ? result.value
            : null;

    }


    /* =====================================================
       CLEAR ALL CACHE
    ===================================================== */

    async function clearAllCache() {

        await clear(
            STORES.CUSTOMERS
        );


        await clear(
            STORES.SALES_ORDERS
        );


        await clear(
            STORES.SYNC_META
        );


        console.log(
            "LOGIS-TECH local cache cleared."
        );

    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.LOGISTECH_CACHE = {

        openDatabase:

            openDatabase,

        put:

            put,

        get:

            get,

        getAll:

            getAll,

        clear:

            clear,

        clearAllCache:

            clearAllCache,


        saveCustomers:

            saveCustomers,

        getCustomers:

            getCustomers,

        getCustomer:

            getCustomer,


        saveSalesOrders:

            saveSalesOrders,

        getSalesOrders:

            getSalesOrders,

        getSalesOrder:

            getSalesOrder,


        setSyncMeta:

            setSyncMeta,

        getSyncMeta:

            getSyncMeta

    };


    /* =====================================================
       READY
    ===================================================== */

    console.log(
        "================================="
    );

    console.log(
        "LOGIS-TECH CACHE MANAGER READY"
    );

    console.log(
        "IndexedDB:",
        DB_NAME
    );

    console.log(
        "================================="
    );


})();
