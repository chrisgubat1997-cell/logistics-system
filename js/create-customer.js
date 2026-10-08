/* =========================================================
   LOGIS-TECH SYSTEM
   CUSTOMER MANAGEMENT
   create-customer.js
   VERSION: 20261008-02

   PURPOSE:
   - Create Customer
   - Edit Customer
   - Get Customer
   - Customer Master API
   - Reusable Customer Module
   - Works standalone OR embedded inside Sales Order
   - IndexedDB Cache
   - Background Sync Compatible
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const CUSTOMER_API_URL =
        "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";


    /* =====================================================
       STATE
    ===================================================== */

    let customerMode = "CREATE";

    let editingCustomerId = "";

    let isSavingCustomer = false;

    let customerFormInitialized = false;

    /*
     * Keep reference to the actual form that was initialized.
     *
     * Sales Order removes/reinjects create-customer.html.
     * Therefore a new form element is a NEW DOM object.
     */
    let initializedCustomerForm = null;


    /* =====================================================
       DOM HELPER
    ===================================================== */

    function getElement(id) {

        return document.getElementById(id);

    }


    /* =====================================================
       API REQUEST
    ===================================================== */

    async function customerAPI(
        action,
        data = {}
    ) {

        const response =
            await fetch(
                CUSTOMER_API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "text/plain;charset=utf-8"
                    },

                    body:
                        JSON.stringify({

                            action:
                                action,

                            data:
                                data

                        })
                }
            );


        if (!response.ok) {

            throw new Error(
                "API request failed: HTTP " +
                response.status
            );

        }


        const result =
            await response.json();


        if (
            !result ||
            result.success === false
        ) {

            throw new Error(
                result &&
                (
                    result.error ||
                    result.message
                )
                    ? (
                        result.error ||
                        result.message
                    )
                    : "Unknown API error."
            );

        }


        return result;

    }


    /* =====================================================
       CUSTOMER CACHE HELPERS
    ===================================================== */

    async function getCachedCustomers() {

        if (
            !window.LogisTechCache
        ) {

            return [];

        }


        try {

            const customers =
                await window.LogisTechCache.getAll(
                    "customers"
                );


            if (
                !Array.isArray(customers)
            ) {

                return [];

            }


            return customers;

        } catch (error) {

            console.warn(
                "Unable to read Customer cache:",
                error
            );


            return [];

        }

    }


    async function getCachedCustomer(
        customerId
    ) {

        if (
            !customerId ||
            !window.LogisTechCache
        ) {

            return null;

        }


        try {

            const customer =
                await window.LogisTechCache.get(
                    "customers",
                    customerId
                );


            return customer || null;

        } catch (error) {

            console.warn(
                "Unable to read Customer from cache:",
                error
            );


            return null;

        }

    }


    async function saveCustomerToCache(
        customer
    ) {

        if (
            !customer ||
            !window.LogisTechCache
        ) {

            return;

        }


        const customerId =
            customer.CUSTOMER_ID ||
            customer.customerId ||
            customer.customer_id;


        if (!customerId) {

            console.warn(
                "Customer cache skipped: Customer ID not found."
            );

            return;

        }


        try {

            /*
             * The Cache Manager uses CUSTOMER_ID
             * as the IndexedDB key.
             */

            const cacheRecord = {

                ...customer,

                CUSTOMER_ID:
                    customerId,

                customerId:
                    customerId

            };


            await window.LogisTechCache.put(
                "customers",
                cacheRecord
            );


            console.log(
                "LOGIS-TECH: Customer saved to local cache:",
                customerId
            );

        } catch (error) {

            console.warn(
                "Unable to save Customer to cache:",
                error
            );

        }

    }


    async function refreshCustomerCacheFromAPI() {

        if (
            !window.LogisTechCache
        ) {

            return;

        }


        try {

            const result =
                await customerAPI(
                    "getCustomers",
                    {}
                );


            const customers =
                normalizeCustomers(
                    result
                );


            if (
                customers.length > 0
            ) {

                await window.LogisTechCache.replaceAll(
                    "customers",
                    customers
                );


                console.log(
                    "LOGIS-TECH: Customer cache synchronized:",
                    customers.length
                );

            }

        } catch (error) {

            console.warn(
                "Unable to refresh Customer cache:",
                error
            );

        }

    }


    function normalizeCustomers(
        result
    ) {

        if (
            Array.isArray(result)
        ) {

            return result;

        }


        if (
            result &&
            Array.isArray(
                result.records
            )
        ) {

            return result.records;

        }


        if (
            result &&
            Array.isArray(
                result.customers
            )
        ) {

            return result.customers;

        }


        if (
            result &&
            result.data
        ) {

            if (
                Array.isArray(
                    result.data
                )
            ) {

                return result.data;

            }


            if (
                Array.isArray(
                    result.data.records
                )
            ) {

                return result.data.records;

            }


            if (
                Array.isArray(
                    result.data.customers
                )
            ) {

                return result.data.customers;

            }

        }


        return [];

    }


    /* =====================================================
       INITIALIZE CUSTOMER FORM
    ===================================================== */

    function initializeCustomerForm() {

        console.log(
            "================================="
        );

        console.log(
            "LOGIS-TECH CUSTOMER FORM INITIALIZE"
        );

        console.log(
            "VERSION: 20261008-02"
        );

        console.log(
            "================================="
        );


        const form =
            getElement(
                "customerForm"
            );


        /*
         * If HTML has not yet been injected,
         * do not mark the module initialized.
         */

        if (!form) {

            console.warn(
                "Customer form element not found."
            );

            return false;

        }


        /*
         * If the same form is already initialized,
         * do not duplicate event listeners.
         */

        if (
            customerFormInitialized &&
            initializedCustomerForm === form
        ) {

            console.log(
                "Customer form already initialized."
            );

            return true;

        }


        /*
         * New DOM form detected.
         */

        customerFormInitialized =
            false;

        initializedCustomerForm =
            form;


        setupFormEvents();

        setupAddressEvents();


        customerFormInitialized =
            true;


        resetCustomerForm();


        console.log(
            "Customer form initialized successfully."
        );


        return true;

    }


    /* =====================================================
       FORM EVENTS
    ===================================================== */

    function setupFormEvents() {

        const form =
            getElement(
                "customerForm"
            );


        if (form) {

            form.addEventListener(
                "submit",
                handleCustomerSubmit
            );

        }


        const resetButton =
            getElement(
                "customerResetButton"
            );


        if (resetButton) {

            resetButton.addEventListener(
                "click",
                function () {

                    resetCustomerForm();

                }
            );

        }


        const cancelButton =
            getElement(
                "customerCancelButton"
            );


        if (cancelButton) {

            cancelButton.addEventListener(
                "click",
                handleCancel
            );

        }


        const successNewButton =
            getElement(
                "successNewCustomerButton"
            );


        if (successNewButton) {

            successNewButton.addEventListener(
                "click",
                function () {

                    showCustomerForm();

                    resetCustomerForm();

                }
            );

        }


        const successCloseButton =
            getElement(
                "successCloseButton"
            );


        if (successCloseButton) {

            successCloseButton.addEventListener(
                "click",
                handleCancel
            );

        }

    }


    /* =====================================================
       ADDRESS EVENTS
    ===================================================== */

    function setupAddressEvents() {

        const copyButton =
            getElement(
                "copyBillingAddress"
            );


        if (!copyButton) {

            return;

        }


        copyButton.addEventListener(
            "click",
            function () {

                const billing =
                    getElement(
                        "billingAddress"
                    );

                const delivery =
                    getElement(
                        "deliveryAddress"
                    );


                if (
                    billing &&
                    delivery
                ) {

                    delivery.value =
                        billing.value;

                    showMessage(
                        "Delivery address copied from billing address.",
                        "info"
                    );

                }

            }
        );

    }


    /* =====================================================
       HANDLE SUBMIT
    ===================================================== */

    async function handleCustomerSubmit(
        event
    ) {

        event.preventDefault();


        if (isSavingCustomer) {

            return;

        }


        clearMessage();


        const data =
            collectCustomerFormData();


        const validation =
            validateCustomerData(
                data
            );


        if (!validation.valid) {

            showMessage(
                validation.message,
                "error"
            );

            return;

        }


        try {

            isSavingCustomer =
                true;

            setSavingState(
                true
            );


            let result;


            if (
                customerMode === "CREATE"
            ) {

                result =
                    await customerAPI(
                        "createCustomer",
                        data
                    );

            }
            else if (
                customerMode === "EDIT"
            ) {

                result =
                    await customerAPI(
                        "updateCustomer",
                        data
                    );

            }
            else {

                throw new Error(
                    "Invalid customer form mode."
                );

            }


            await handleCustomerSaveSuccess(
                result,
                data
            );


        } catch (error) {

            console.error(
                "Customer save error:",
                error
            );


            showMessage(
                error.message ||
                "Unable to save customer.",
                "error"
            );


        } finally {

            isSavingCustomer =
                false;

            setSavingState(
                false
            );

        }

    }


    /* =====================================================
       COLLECT FORM DATA
    ===================================================== */

    function collectCustomerFormData() {

        const customerId =
            getValue(
                "customerId"
            );


        const clientName =
            getValue(
                "clientName"
            );


        const attention =
            getValue(
                "attention"
            );


        const tin =
            getValue(
                "tin"
            );


        const billingAddress =
            getValue(
                "billingAddress"
            );


        const deliveryAddress =
            getValue(
                "deliveryAddress"
            );


        const contactNumber =
            getValue(
                "contactNumber"
            );


        const email =
            getValue(
                "email"
            );


        const status =
            getValue(
                "customerStatus"
            ) ||
            "ACTIVE";


        return {

            customerId:
                customerId,

            CUSTOMER_ID:
                customerId,


            clientName:
                clientName,

            CLIENT_NAME:
                clientName,


            attention:
                attention,

            ATTENTION:
                attention,


            tin:
                tin,

            TIN:
                tin,


            billingAddress:
                billingAddress,

            BILLING_ADDRESS:
                billingAddress,


            deliveryAddress:
                deliveryAddress,

            DELIVERY_ADDRESS:
                deliveryAddress,


            contactNumber:
                contactNumber,

            CONTACT_NUMBER:
                contactNumber,


            email:
                email,

            EMAIL:
                email,


            status:
                status,

            STATUS:
                status

        };

    }


    /* =====================================================
       VALIDATION
    ===================================================== */

    function validateCustomerData(
        data
    ) {

        if (!data.clientName) {

            return {

                valid:
                    false,

                message:
                    "Client Name is required."

            };

        }


        if (
            data.clientName.length < 2
        ) {

            return {

                valid:
                    false,

                message:
                    "Client Name is too short."

            };

        }


        if (data.email) {

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (
                !emailPattern.test(
                    data.email
                )
            ) {

                return {

                    valid:
                        false,

                    message:
                        "Please enter a valid email address."

                };

            }

        }


        if (
            data.contactNumber &&
            data.contactNumber.length < 7
        ) {

            return {

                valid:
                    false,

                message:
                    "Please enter a valid contact number."

            };

        }


        return {

            valid:
                true

        };

    }


    /* =====================================================
       HANDLE SUCCESS
    ===================================================== */

    async function handleCustomerSaveSuccess(
        result,
        submittedData = {}
    ) {

        const customer =
            result.customer ||
            {};


        const generatedId =
            result.customerId ||
            customer.CUSTOMER_ID ||
            customer.customerId ||
            submittedData.CUSTOMER_ID ||
            submittedData.customerId ||
            getValue(
                "customerId"
            );


        const createdAt =
            customer.CREATED_AT ||
            customer.createdAt ||
            submittedData.CREATED_AT ||
            submittedData.createdAt ||
            "";


        const updatedAt =
            customer.UPDATED_AT ||
            customer.updatedAt ||
            submittedData.UPDATED_AT ||
            submittedData.updatedAt ||
            "";


        setValue(
            "customerId",
            generatedId
        );


        setValue(
            "createdAt",
            createdAt
        );


        setValue(
            "updatedAt",
            updatedAt
        );


        const generatedCustomerId =
            getElement(
                "generatedCustomerId"
            );


        if (
            generatedCustomerId
        ) {

            generatedCustomerId.textContent =
                generatedId ||
                "—";

        }


        /* =================================================
           UPDATE LOCAL CUSTOMER CACHE
        ================================================= */

        const cacheCustomer = {

            ...submittedData,

            ...customer,

            CUSTOMER_ID:
                generatedId,

            customerId:
                generatedId,

            CREATED_AT:
                createdAt ||
                customer.CREATED_AT ||
                "",

            createdAt:
                createdAt ||
                customer.createdAt ||
                "",

            UPDATED_AT:
                updatedAt ||
                customer.UPDATED_AT ||
                "",

            updatedAt:
                updatedAt ||
                customer.updatedAt ||
                ""

        };


        if (
            generatedId
        ) {

            await saveCustomerToCache(
                cacheCustomer
            );

        }


        /* =================================================
           SHOW SUCCESS
        ================================================= */

        showSuccessPanel();


        showMessage(
            result.message ||
            "Customer saved successfully.",
            "success"
        );


        /* =================================================
           NOTIFY PARENT MODULE
        ================================================= */

        try {

            window.dispatchEvent(
                new CustomEvent(
                    "customerSaved",
                    {

                        detail: {

                            customer:
                                cacheCustomer,

                            customerId:
                                generatedId,

                            mode:
                                customerMode

                        }

                    }
                )
            );

        } catch (error) {

            console.warn(
                "customerSaved event failed:",
                error
            );

        }


        /* =================================================
           BACKGROUND SYNC
        ================================================= */

        if (
            window.LogisTechSync
        ) {

            try {

                await window.LogisTechSync.backgroundSync();

            } catch (syncError) {

                console.warn(
                    "Customer background sync failed:",
                    syncError
                );

            }

        }

    }


    /* =====================================================
       RESET FORM
    ===================================================== */

    function resetCustomerForm() {

        customerMode =
            "CREATE";

        editingCustomerId =
            "";


        const form =
            getElement(
                "customerForm"
            );


        if (form) {

            form.reset();

        }


        setValue(
            "customerId",
            ""
        );


        setValue(
            "customerStatus",
            "ACTIVE"
        );


        setValue(
            "createdAt",
            ""
        );


        setValue(
            "updatedAt",
            ""
        );


        setText(
            "customerFormMode",
            "NEW CUSTOMER"
        );


        setText(
            "customerSaveButtonText",
            "SAVE CUSTOMER"
        );


        clearMessage();

        hideSuccessPanel();

        showCustomerForm();

        setSavingState(
            false
        );

    }


    /* =====================================================
       EDIT CUSTOMER
    ===================================================== */

    async function editCustomer(
        customerId
    ) {

        if (!customerId) {

            showMessage(
                "Customer ID is required.",
                "error"
            );

            return;

        }


        try {

            showMessage(
                "Loading customer information...",
                "info"
            );


            let customer = null;


            /* =================================================
               1. TRY CACHE FIRST
            ================================================= */

            customer =
                await getCachedCustomer(
                    customerId
                );


            if (customer) {

                console.log(
                    "LOGIS-TECH: Customer loaded from cache:",
                    customerId
                );

            }


            /* =================================================
               2. FALLBACK TO API
            ================================================= */

            if (!customer) {

                console.log(
                    "LOGIS-TECH: Customer not found in cache. Loading from API..."
                );


                const result =
                    await customerAPI(
                        "getCustomer",
                        {
                            customerId:
                                customerId
                        }
                    );


                customer =
                    result.customer;


                if (
                    customer
                ) {

                    await saveCustomerToCache(
                        customer
                    );

                }

            }


            if (!customer) {

                throw new Error(
                    "Customer information not found."
                );

            }


            customerMode =
                "EDIT";


            editingCustomerId =
                customerId;


            fillCustomerForm(
                customer
            );


            setText(
                "customerFormMode",
                "EDIT CUSTOMER"
            );


            setText(
                "customerSaveButtonText",
                "UPDATE CUSTOMER"
            );


            showCustomerForm();


            showMessage(
                "Customer information loaded for editing.",
                "info"
            );


        } catch (error) {

            console.error(
                "Load customer error:",
                error
            );


            showMessage(
                error.message ||
                "Unable to load customer.",
                "error"
            );

        }

    }


    /* =====================================================
       FILL FORM
    ===================================================== */

    function fillCustomerForm(
        customer
    ) {

        setValue(
            "customerId",
            customer.CUSTOMER_ID ||
            customer.customerId ||
            ""
        );


        setValue(
            "clientName",
            customer.CLIENT_NAME ||
            customer.clientName ||
            ""
        );


        setValue(
            "attention",
            customer.ATTENTION ||
            customer.attention ||
            ""
        );


        setValue(
            "tin",
            customer.TIN ||
            customer.tin ||
            ""
        );


        setValue(
            "billingAddress",
            customer.BILLING_ADDRESS ||
            customer.billingAddress ||
            ""
        );


        setValue(
            "deliveryAddress",
            customer.DELIVERY_ADDRESS ||
            customer.deliveryAddress ||
            ""
        );


        setValue(
            "contactNumber",
            customer.CONTACT_NUMBER ||
            customer.contactNumber ||
            ""
        );


        setValue(
            "email",
            customer.EMAIL ||
            customer.email ||
            ""
        );


        setValue(
            "customerStatus",
            customer.STATUS ||
            customer.status ||
            "ACTIVE"
        );


        setValue(
            "createdAt",
            customer.CREATED_AT ||
            customer.createdAt ||
            ""
        );


        setValue(
            "updatedAt",
            customer.UPDATED_AT ||
            customer.updatedAt ||
            ""
        );

    }


    /* =====================================================
       NEW CUSTOMER
    ===================================================== */

    function newCustomer() {

        resetCustomerForm();

    }


    /* =====================================================
       CANCEL
    ===================================================== */

    function handleCancel() {

        /*
         * Notify parent module.
         */

        try {

            window.dispatchEvent(
                new CustomEvent(
                    "customerFormCancel"
                )
            );

        } catch (error) {

            console.warn(
                "customerFormCancel event failed:",
                error
            );

        }


        /*
         * Embedded inside Sales Order.
         */

        const salesOrderCustomerArea =
            document.getElementById(
                "customerArea"
            );


        if (
            salesOrderCustomerArea
        ) {

            if (
                typeof window.closeCustomerFromSalesOrder ===
                "function"
            ) {

                window.closeCustomerFromSalesOrder();

            }

            return;

        }


        /*
         * Standalone fallback.
         */

        if (
            window.history.length > 1
        ) {

            window.history.back();

        }

    }


    /* =====================================================
       FORM DISPLAY
    ===================================================== */

    function showCustomerForm() {

        const form =
            getElement(
                "customerForm"
            );


        const successPanel =
            getElement(
                "customerSuccessPanel"
            );


        if (form) {

            form.hidden =
                false;

        }


        if (successPanel) {

            successPanel.hidden =
                true;

        }

    }


    function hideSuccessPanel() {

        const panel =
            getElement(
                "customerSuccessPanel"
            );


        if (panel) {

            panel.hidden =
                true;

        }

    }


    function showSuccessPanel() {

        const form =
            getElement(
                "customerForm"
            );


        const panel =
            getElement(
                "customerSuccessPanel"
            );


        if (form) {

            form.hidden =
                true;

        }


        if (panel) {

            panel.hidden =
                false;

        }

    }


    /* =====================================================
       SAVING STATE
    ===================================================== */

    function setSavingState(
        saving
    ) {

        const button =
            getElement(
                "customerSaveButton"
            );


        if (!button) {

            return;

        }


        button.disabled =
            saving;


        if (saving) {

            setText(
                "customerSaveButtonText",
                customerMode === "EDIT"
                    ? "UPDATING..."
                    : "SAVING..."
            );

        } else {

            setText(
                "customerSaveButtonText",
                customerMode === "EDIT"
                    ? "UPDATE CUSTOMER"
                    : "SAVE CUSTOMER"
            );

        }

    }


    /* =====================================================
       MESSAGE
    ===================================================== */

    function showMessage(
        message,
        type = "info"
    ) {

        const element =
            getElement(
                "customerFormMessage"
            );


        if (!element) {

            return;

        }


        element.textContent =
            message || "";


        element.className =
            "customer-form-message show " +
            type;

    }


    function clearMessage() {

        const element =
            getElement(
                "customerFormMessage"
            );


        if (!element) {

            return;

        }


        element.textContent =
            "";


        element.className =
            "customer-form-message";

    }


    /* =====================================================
       DOM VALUE HELPERS
    ===================================================== */

    function getValue(
        id
    ) {

        const element =
            getElement(
                id
            );


        if (!element) {

            return "";

        }


        return String(
            element.value || ""
        ).trim();

    }


    function setValue(
        id,
        value
    ) {

        const element =
            getElement(
                id
            );


        if (!element) {

            return;

        }


        element.value =
            value == null
                ? ""
                : value;

    }


    function setText(
        id,
        value
    ) {

        const element =
            getElement(
                id
            );


        if (!element) {

            return;

        }


        element.textContent =
            value == null
                ? ""
                : value;

    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.initializeCustomerForm =
        initializeCustomerForm;


    window.editCustomer =
        editCustomer;


    window.newCustomer =
        newCustomer;


    window.getCustomerFormData =
        collectCustomerFormData;


    window.resetCustomerForm =
        resetCustomerForm;


    window.showCustomerForm =
        showCustomerForm;


    window.customerAPI =
        customerAPI;


    /*
     * IMPORTANT:
     *
     * No automatic DOMContentLoaded initialization.
     *
     * Sales Order loader initializes the module
     * AFTER create-customer.html has been injected.
     */

})();
