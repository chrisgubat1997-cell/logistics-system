/* =========================================================
   LOGIS-TECH SYSTEM
   LOGIN
   login.js
   VERSION: 20261007-01
========================================================= */


document.addEventListener(
    "DOMContentLoaded",
    function () {


        /* =================================================
           ELEMENTS
        ================================================= */

        const loginForm =
            document.getElementById(
                "loginForm"
            );


        const usernameInput =
            document.getElementById(
                "username"
            );


        const passwordInput =
            document.getElementById(
                "password"
            );


        const loginButton =
            document.getElementById(
                "loginButton"
            );


        const loginMessage =
            document.getElementById(
                "loginMessage"
            );


        /* =================================================
           CHECK ELEMENTS
        ================================================= */

        if (!loginForm) {

            console.error(
                "LOGIS-TECH ERROR: loginForm not found."
            );

            return;

        }


        /* =================================================
           MAIN API
        ================================================= */

        const API_URL =
            "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";


        /* =================================================
           FORM SUBMIT
        ================================================= */

        loginForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                /* =========================================
                   GET VALUES
                ========================================= */

                const username =
                    usernameInput.value.trim();


                const password =
                    passwordInput.value;


                /* =========================================
                   VALIDATION
                ========================================= */

                if (!username) {

                    showMessage(
                        "Please enter your username.",
                        "error"
                    );


                    usernameInput.focus();


                    return;

                }


                if (!password) {

                    showMessage(
                        "Please enter your password.",
                        "error"
                    );


                    passwordInput.focus();


                    return;

                }


                /* =========================================
                   LOADING
                ========================================= */

                showMessage(
                    "Logging in...",
                    "loading"
                );


                if (loginButton) {

                    loginButton.disabled =
                        true;


                    loginButton.dataset.oldText =
                        loginButton.textContent;


                    loginButton.textContent =
                        "LOGGING IN...";

                }


                /* =========================================
                   REQUEST
                ========================================= */

                const requestBody = {

                    action:
                        "login",

                    data: {

                        username:
                            username,

                        password:
                            password

                    }

                };


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
                        "LOGIN HTTP STATUS:",
                        response.status
                    );


                    console.log(
                        "LOGIN API RESPONSE:",
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
                       PARSE RESPONSE
                    ===================================== */

                    let result;


                    try {

                        result =
                            JSON.parse(
                                responseText
                            );

                    } catch (error) {

                        console.error(
                            "INVALID JSON:",
                            responseText
                        );


                        throw new Error(
                            "Invalid JSON response from API."
                        );

                    }


                    /* =====================================
                       LOGIN SUCCESS
                    ===================================== */

                    if (
                        result &&
                        result.success === true &&
                        result.account
                    ) {


                        const account =
                            result.account;


                        /* =================================
                           CLEAR OLD SESSION
                        ================================= */

                        localStorage.removeItem(
                            "logitechLoggedIn"
                        );


                        localStorage.removeItem(
                            "logitechUser"
                        );


                        localStorage.removeItem(
                            "logitechLoginTime"
                        );


                        /* =================================
                           SAVE SESSION
                        ================================= */

                        localStorage.setItem(
                            "logitechLoggedIn",
                            "true"
                        );


                        localStorage.setItem(
                            "logitechUser",
                            JSON.stringify(
                                account
                            )
                        );


                        localStorage.setItem(
                            "logitechLoginTime",
                            new Date().toISOString()
                        );


                        /* =================================
                           SUCCESS MESSAGE
                        ================================= */

                        showMessage(
                            "Login successful!",
                            "success"
                        );


                        /* =================================
                           REDIRECT
                        ================================= */

                        setTimeout(
                            function () {

                                window.location.href =
                                    "./index.html";

                            },
                            500
                        );


                        return;

                    }


                    /* =====================================
                       LOGIN FAILED
                    ===================================== */

                    const errorMessage =
                        (
                            result &&
                            (
                                result.message ||
                                result.error
                            )
                        ) ||
                        "Invalid username or password.";


                    showMessage(
                        errorMessage,
                        "error"
                    );


                    enableLoginButton();


                } catch (error) {


                    /* =====================================
                       CONNECTION ERROR
                    ===================================== */

                    console.error(
                        "========================================"
                    );


                    console.error(
                        "LOGIS-TECH LOGIN ERROR"
                    );


                    console.error(
                        error
                    );


                    console.error(
                        "========================================"
                    );


                    showMessage(
                        "Unable to connect to LOGIS-TECH API. Please try again.",
                        "error"
                    );


                    enableLoginButton();

                }

            }
        );


        /* =================================================
           SHOW MESSAGE
        ================================================= */

        function showMessage(
            text,
            type
        ) {

            if (!loginMessage) {

                return;

            }


            loginMessage.textContent =
                text;


            if (type === "success") {

                loginMessage.style.color =
                    "#16a34a";

            }

            else if (type === "error") {

                loginMessage.style.color =
                    "#dc2626";

            }

            else {

                loginMessage.style.color =
                    "#2563eb";

            }

        }


        /* =================================================
           ENABLE LOGIN BUTTON
        ================================================= */

        function enableLoginButton() {

            if (!loginButton) {

                return;

            }


            loginButton.disabled =
                false;


            loginButton.textContent =
                loginButton.dataset.oldText ||
                "LOGIN";

        }


    }
);
