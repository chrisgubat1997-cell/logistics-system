/* =========================================================
   LOGIS-TECH SYSTEM
   SIGN UP
   signup.js
   VERSION: 20261007-01
========================================================= */


document.addEventListener(
    "DOMContentLoaded",
    function () {


        /* =================================================
           ELEMENTS
        ================================================= */

        const signupForm =
            document.getElementById(
                "signupForm"
            );


        const message =
            document.getElementById(
                "signupMessage"
            );


        const signupButton =
            document.getElementById(
                "signupButton"
            );


        /* =================================================
           VALIDATE FORM
        ================================================= */

        if (!signupForm) {

            console.error(
                "LOGIS-TECH ERROR: signupForm not found."
            );

            return;

        }


        if (!message) {

            console.error(
                "LOGIS-TECH ERROR: signupMessage not found."
            );

            return;

        }


        /* =================================================
           MAIN API
        ================================================= */

        const API_URL =
            "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";


        console.log(
            "========================================"
        );

        console.log(
            "LOGIS-TECH SIGN UP"
        );

        console.log(
            "MAIN API:",
            API_URL
        );

        console.log(
            "========================================"
        );


        /* =================================================
           FORM SUBMIT
        ================================================= */

        signupForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                /* =========================================
                   INPUTS
                ========================================= */

                const fullNameInput =
                    document.getElementById(
                        "fullname"
                    );


                const emailInput =
                    document.getElementById(
                        "signupEmail"
                    );


                const usernameInput =
                    document.getElementById(
                        "signupUsername"
                    );


                const passwordInput =
                    document.getElementById(
                        "signupPassword"
                    );


                const confirmPasswordInput =
                    document.getElementById(
                        "confirmPassword"
                    );


                const accountTypeInput =
                    document.getElementById(
                        "accountType"
                    );


                /* =========================================
                   CHECK INPUTS
                ========================================= */

                if (
                    !fullNameInput ||
                    !emailInput ||
                    !usernameInput ||
                    !passwordInput ||
                    !confirmPasswordInput ||
                    !accountTypeInput
                ) {

                    console.error(
                        "LOGIS-TECH ERROR: Signup field missing."
                    );


                    showMessage(
                        "Signup form is incomplete.",
                        "error"
                    );


                    return;

                }


                /* =========================================
                   GET VALUES
                ========================================= */

                const fullName =
                    fullNameInput.value.trim();


                const email =
                    emailInput.value.trim();


                const username =
                    usernameInput.value.trim();


                const password =
                    passwordInput.value;


                const confirmPassword =
                    confirmPasswordInput.value;


                const accountType =
                    accountTypeInput.value
                        .trim()
                        .toUpperCase();


                /* =========================================
                   VALIDATION
                ========================================= */

                if (!fullName) {

                    showMessage(
                        "Please enter your full name.",
                        "error"
                    );


                    fullNameInput.focus();


                    return;

                }


                if (!email) {

                    showMessage(
                        "Please enter your email.",
                        "error"
                    );


                    emailInput.focus();


                    return;

                }


                if (!emailInput.checkValidity()) {

                    showMessage(
                        "Please enter a valid email address.",
                        "error"
                    );


                    emailInput.focus();


                    return;

                }


                if (!username) {

                    showMessage(
                        "Please enter a username.",
                        "error"
                    );


                    usernameInput.focus();


                    return;

                }


                if (!password) {

                    showMessage(
                        "Please enter a password.",
                        "error"
                    );


                    passwordInput.focus();


                    return;

                }


                if (password.length < 6) {

                    showMessage(
                        "Password must be at least 6 characters.",
                        "error"
                    );


                    passwordInput.focus();


                    return;

                }


                if (!confirmPassword) {

                    showMessage(
                        "Please confirm your password.",
                        "error"
                    );


                    confirmPasswordInput.focus();


                    return;

                }


                if (
                    password !==
                    confirmPassword
                ) {

                    showMessage(
                        "Passwords do not match.",
                        "error"
                    );


                    confirmPasswordInput.focus();


                    return;

                }


                if (!accountType) {

                    showMessage(
                        "Please select an account type.",
                        "error"
                    );


                    accountTypeInput.focus();


                    return;

                }


                const allowedRoles = [

                    "SALES",
                    "LOGISTICS",
                    "FINANCE"

                ];


                if (
                    !allowedRoles.includes(
                        accountType
                    )
                ) {

                    showMessage(
                        "Invalid account type.",
                        "error"
                    );


                    accountTypeInput.focus();


                    return;

                }


                /* =========================================
                   LOADING
                ========================================= */

                showMessage(
                    "Creating account...",
                    "loading"
                );


                if (signupButton) {

                    signupButton.disabled =
                        true;


                    signupButton.dataset.oldText =
                        signupButton.textContent;


                    signupButton.textContent =
                        "CREATING ACCOUNT...";

                }


                /* =========================================
                   REQUEST
                ========================================= */

                const requestBody = {

                    action:
                        "createAccount",

                    data: {

                        fullName:
                            fullName,

                        email:
                            email,

                        username:
                            username,

                        password:
                            password,

                        accountType:
                            accountType

                    }

                };


                /* =========================================
                   DEBUG REQUEST
                ========================================= */

                console.log(
                    "LOGIS-TECH SIGNUP REQUEST:",
                    {
                        action:
                            requestBody.action,

                        data: {

                            fullName:
                                fullName,

                            email:
                                email,

                            username:
                                username,

                            accountType:
                                accountType

                        }

                    }
                );


                /* =========================================
                   API CALL
                ========================================= */

                try {

                    const response =
                        await fetch(
                            API_URL,
                            {

                                method:
                                    "POST",

                                headers: {

                                    "Content-Type":
                                        "text/plain;charset=utf-8"

                                },

                                body:
                                    JSON.stringify(
                                        requestBody
                                    )

                            }
                        );


                    const responseText =
                        await response.text();


                    console.log(
                        "SIGNUP HTTP STATUS:",
                        response.status
                    );


                    console.log(
                        "SIGNUP API RESPONSE:",
                        responseText
                    );


                    /* =====================================
                       HTTP ERROR
                    ===================================== */

                    if (!response.ok) {

                        throw new Error(
                            "HTTP " +
                            response.status
                        );

                    }


                    if (!responseText) {

                        throw new Error(
                            "Empty response from API."
                        );

                    }


                    /* =====================================
                       PARSE JSON
                    ===================================== */

                    let result;


                    try {

                        result =
                            JSON.parse(
                                responseText
                            );

                    } catch (jsonError) {

                        console.error(
                            "INVALID JSON RESPONSE:",
                            responseText
                        );


                        throw new Error(
                            "Invalid JSON response from API."
                        );

                    }


                    console.log(
                        "LOGIS-TECH SIGNUP RESULT:",
                        result
                    );


                    /* =====================================
                       SUCCESS
                    ===================================== */

                    if (
                        result &&
                        result.success === true
                    ) {

                        showMessage(
                            "Account created successfully!",
                            "success"
                        );


                        signupForm.reset();


                        if (signupButton) {

                            signupButton.disabled =
                                true;


                            signupButton.textContent =
                                "ACCOUNT CREATED";

                        }


                        /* =================================
                           REDIRECT LOGIN
                        ================================= */

                        setTimeout(
                            function () {

                                window.location.href =
                                    "login.html";

                            },
                            1500
                        );


                        return;

                    }


                    /* =====================================
                       API ERROR
                    ===================================== */

                    const apiMessage =
                        (
                            result &&
                            (
                                result.message ||
                                result.error
                            )
                        ) ||
                        "Account was not created.";


                    showMessage(
                        apiMessage,
                        "error"
                    );


                    enableButton();

                } catch (error) {


                    /* =====================================
                       ERROR
                    ===================================== */

                    console.error(
                        "========================================"
                    );


                    console.error(
                        "LOGIS-TECH SIGNUP ERROR"
                    );


                    console.error(
                        error
                    );


                    console.error(
                        "API URL:",
                        API_URL
                    );


                    console.error(
                        "========================================"
                    );


                    showMessage(
                        "Unable to connect to LOGIS-TECH API. Please try again.",
                        "error"
                    );


                    enableButton();

                }

            }
        );


        /* =================================================
           MESSAGE FUNCTION
        ================================================= */

        function showMessage(
            text,
            type
        ) {

            message.textContent =
                text;


            if (type === "success") {

                message.style.color =
                    "#16a34a";

            } else if (type === "error") {

                message.style.color =
                    "#dc2626";

            } else {

                message.style.color =
                    "#2563eb";

            }

        }


        /* =================================================
           ENABLE BUTTON
        ================================================= */

        function enableButton() {

            if (!signupButton) {

                return;

            }


            signupButton.disabled =
                false;


            signupButton.textContent =
                signupButton.dataset.oldText ||
                "CREATE ACCOUNT";

        }


    }
);
