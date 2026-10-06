/* =========================================================
   LOGIS-TECH SYSTEM
   CUSTOMER MANAGEMENT
   create-customer.js
   VERSION: 20261006-01

   PURPOSE:
   - Create Customer
   - Edit Customer
   - Get Customer
   - Customer Master API
   - Reusable by:
       Sales Order
       Delivery
       Invoice
       Payment
       Reports
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
                result.error
                    ? result.error
                    : "Unknown API error."
            );

        }


        return result;

    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initializeCustomerForm() {

        console.log(
            "================================="
        );

        console.log(
            "LOGIS-TECH CUSTOMER FORM LOADED"
        );

        console.log(
            "================================="
        );


        setupFormEvents();

        setupAddressEvents();

        resetCustomerForm();

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

            isSavingCustomer = true;

            setSavingState(true);


            let result;


            /* =================================================
               CREATE
            ================================================= */

            if (
                customerMode === "CREATE"
            ) {

                result =
                    await customerAPI(
                        "createCustomer",
                        data
                    );

            }


            /* =================================================
               UPDATE
            ================================================= */

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


            /* =================================================
               SUCCESS
            ================================================= */

            handleCustomerSaveSuccess(
                result
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

            isSavingCustomer = false;

            setSavingState(false);

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

        if (
            !data.clientName
        ) {

            return {

                valid: false,

                message:
                    "Client Name is required."

            };

        }


        if (
            data.clientName.length < 2
        ) {

            return {

                valid: false,

                message:
                    "Client Name is too short."

            };

        }


        if (
            data.email
        ) {

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (
                !emailPattern.test(
                    data.email
                )
            ) {

                return {

                    valid: false,

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

                valid: false,

                message:
                    "Please enter a valid contact number."

            };

        }


        return {

            valid: true

        };

    }


    /* =====================================================
       HANDLE SUCCESS
    ===================================================== */

    function handleCustomerSaveSuccess(
        result
    ) {

        const customer =
            result.customer ||
            {};


        const generatedId =
            result.customerId ||
            customer.CUSTOMER_ID ||
            getValue(
                "customerId"
            );


        const createdAt =
            customer.CREATED_AT ||
            "";


        const updatedAt =
            customer.UPDATED_AT ||
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


        showSuccessPanel();


        showMessage(
            result.message ||
            "Customer saved successfully.",
            "success"
        );


        /* =================================================
           GLOBAL EVENT
           Other modules can listen to this.
        ================================================= */

        try {

            window.dispatchEvent(
                new CustomEvent(
                    "customerSaved",
                    {

                        detail: {

                            customer:
                                customer,

                            customerId:
                                generatedId,

                            mode:
                                customerMode

                        }

                    }
                )
            );

        } catch (eventError) {

            console.warn(
                "Unable to dispatch customerSaved event:",
                eventError
            );

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


            const result =
                await customerAPI(
                    "getCustomer",
                    {

                        customerId:
                            customerId

                    }
                );


            const customer =
                result.customer;


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
            ""
        );


        setValue(
            "updatedAt",
            customer.UPDATED_AT ||
            ""
        );

    }


    /* =====================================================
       OPEN NEW CUSTOMER
    ===================================================== */

    function newCustomer() {

        resetCustomerForm();

    }


    /* =====================================================
       CANCEL
    ===================================================== */

    function handleCancel() {

        /*
         * If this component is inside a modal,
         * the parent module can override this function.
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
         * If opened as a standalone page,
         * go back to previous page.
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

    function getValue(id) {

        const element =
            getElement(id);


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
            getElement(id);


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
            getElement(id);


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
       Other LOGIS-TECH modules can use these.
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


    /* =====================================================
       AUTO INITIALIZE
       Works when HTML is loaded directly.
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeCustomerForm
        );

    } else {

        initializeCustomerForm();

    }


})();
