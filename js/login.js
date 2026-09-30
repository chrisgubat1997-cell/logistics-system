/* =========================================================
   LOGIS-TECH SYSTEM
   LOGIN JAVASCRIPT
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {


        /* =====================================================
           ELEMENTS
        ===================================================== */

        const loginForm =
            document.getElementById(
                "loginForm"
            );


        const loginMessage =
            document.getElementById(
                "loginMessage"
            );


        const loginButton =
            document.getElementById(
                "loginButton"
            );


        const usernameInput =
            document.getElementById(
                "username"
            );


        const passwordInput =
            document.getElementById(
                "password"
            );


        /* =====================================================
           API URL
        ===================================================== */

        const API_URL =
            "https://script.google.com/macros/s/AKfycbwFZHUWgNSfSYiwEYkDncF1qja5A6RmNFyyZ4-Bm17gt_WuCYbtTYICEerGVhp9SYPedg/exec";


        /* =====================================================
           LOGIN STATE
        ===================================================== */

        let loginInProgress =
            false;


        /* =====================================================
           CHECK LOGIN FORM
        ===================================================== */

        if (!loginForm) {

            console.error(
                "LOGIS-TECH ERROR: loginForm not found."
            );

            return;

        }


        /* =====================================================
           CHECK REQUIRED ELEMENTS
        ===================================================== */

        if (
            !loginMessage ||
            !loginButton ||
            !usernameInput ||
            !passwordInput
        ) {

            console.error(
                "LOGIS-TECH ERROR: Required login elements are missing."
            );

            return;

        }


        /* =====================================================
           SHOW MESSAGE
        ===================================================== */

        function showMessage(
            message,
            color
        ) {

            loginMessage.textContent =
                message;

            loginMessage.style.color =
                color;

        }


        /* =====================================================
           RESET LOGIN BUTTON
        ===================================================== */

        function resetLoginButton() {

            loginInProgress =
                false;

            loginButton.disabled =
                false;

            loginButton.textContent =
                "LOGIN";

        }


        /* =====================================================
           SEND LOGIN REQUEST
        ===================================================== */

        async function sendLoginRequest(
            username,
            password
        ) {


            /* =================================================
               REQUEST TIMEOUT
            ================================================= */

            const controller =
                new AbortController();


            const timeoutId =
                setTimeout(
                    function () {

                        controller.abort();

                    },
                    15000
                );


            try {


                console.log(
                    "===================================="
                );

                console.log(
                    "LOGIS-TECH LOGIN REQUEST"
                );

                console.log(
                    "Username:",
                    username
                );

                console.log(
                    "API URL:",
                    API_URL
                );

                console.log(
                    "===================================="
                );


                /* =================================================
                   FETCH API
                ================================================= */

                const response =
                    await fetch(
                        API_URL,
                        {

                            method:
                                "POST",

                            headers:
                                {
                                    "Content-Type":
                                        "text/plain;charset=utf-8"
                                },

                            body:
                                JSON.stringify(
                                    {

                                        action:
                                            "login",

                                        data:
                                            {

                                                username:
                                                    username,

                                                password:
                                                    password

                                            }

                                    }
                                ),

                            signal:
                                controller.signal

                        }
                    );


                /* =================================================
                   GET RESPONSE AS TEXT
                ================================================= */

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


                /* =================================================
                   HTTP ERROR
                ================================================= */

                if (
                    !response.ok
                ) {

                    throw new Error(
                        "HTTP " +
                        response.status
                    );

                }


                /* =================================================
                   EMPTY RESPONSE
                ================================================= */

                if (
                    !responseText
                ) {

                    throw new Error(
                        "Empty response from LOGIS-TECH API."
                    );

                }


                /* =================================================
                   PARSE JSON
                ================================================= */

                let result;


                try {

                    result =
                        JSON.parse(
                            responseText
                        );

                }

                catch (
                    jsonError
                ) {

                    console.error(
                        "INVALID JSON RESPONSE:",
                        responseText
                    );

                    throw new Error(
                        "Invalid JSON response from API."
                    );

                }


                console.log(
                    "PARSED LOGIN RESULT:",
                    result
                );


                return result;


            }

            catch (
                error
            ) {


                /* =================================================
                   TIMEOUT ERROR
                ================================================= */

                if (
                    error.name ===
                    "AbortError"
                ) {

                    throw new Error(
                        "API request timed out."
                    );

                }


                throw error;


            }

            finally {

                clearTimeout(
                    timeoutId
                );

            }

        }


        /* =====================================================
           LOGIN SUBMIT
        ===================================================== */

        loginForm.addEventListener(
            "submit",
            async function (event) {


                event.preventDefault();


                /* =================================================
                   PREVENT DOUBLE LOGIN
                ================================================= */

                if (
                    loginInProgress
                ) {

                    return;

                }


                /* =================================================
                   GET USERNAME
                ================================================= */

                const username =
                    usernameInput.value
                        .trim();


                /* =================================================
                   GET PASSWORD
                ================================================= */

                const password =
                    passwordInput.value;


                /* =================================================
                   VALIDATE USERNAME
                ================================================= */

                if (
                    !username
                ) {

                    showMessage(
                        "Please enter your username.",
                        "#dc2626"
                    );

                    usernameInput.focus();

                    return;

                }


                /* =================================================
                   VALIDATE PASSWORD
                ================================================= */

                if (
                    !password
                ) {

                    showMessage(
                        "Please enter your password.",
                        "#dc2626"
                    );

                    passwordInput.focus();

                    return;

                }


                /* =================================================
                   START LOGIN
                ================================================= */

                loginInProgress =
                    true;


                loginButton.disabled =
                    true;


                loginButton.textContent =
                    "LOGGING IN...";


                showMessage(
                    "Connecting to LOGIS-TECH...",
                    "#2563eb"
                );


                /* =================================================
                   LOGIN ATTEMPTS
                ================================================= */

                let result =
                    null;


                let lastError =
                    null;


                try {


                    /* =================================================
                       TRY UP TO 3 TIMES
                    ================================================= */

                    for (
                        let attempt = 1;
                        attempt <= 3;
                        attempt++
                    ) {


                        console.log(
                            "LOGIN ATTEMPT:",
                            attempt
                        );


                        try {


                            result =
                                await sendLoginRequest(
                                    username,
                                    password
                                );


                            /* =========================================
                               REQUEST COMPLETED
                            ========================================== */

                            break;


                        }

                        catch (
                            error
                        ) {


                            lastError =
                                error;


                            console.warn(
                                "LOGIN ATTEMPT " +
                                attempt +
                                " FAILED:",
                                error
                            );


                            /* =========================================
                               RETRY
                            ========================================== */

                            if (
                                attempt < 3
                            ) {

                                showMessage(
                                    "Connection issue. Retrying...",
                                    "#2563eb"
                                );


                                await new Promise(
                                    function (
                                        resolve
                                    ) {

                                        setTimeout(
                                            resolve,
                                            1000
                                        );

                                    }
                                );

                            }

                        }

                    }


                    /* =================================================
                       ALL ATTEMPTS FAILED
                    ================================================= */

                    if (
                        !result
                    ) {

                        throw (
                            lastError ||
                            new Error(
                                "Unable to connect to API."
                            )
                        );

                    }


                    console.log(
                        "===================================="
                    );

                    console.log(
                        "LOGIS-TECH LOGIN RESULT"
                    );

                    console.log(
                        result
                    );

                    console.log(
                        "===================================="
                    );


                    /* =================================================
                       LOGIN SUCCESS
                    ================================================= */

                    if (
                        result.success ===
                        true
                    ) {


                        showMessage(
                            "Login successful!",
                            "#16a34a"
                        );


                        /* =============================================
                           CLEAR OLD LOGIN DATA
                        ============================================== */

                        localStorage.removeItem(
                            "logitechLoggedIn"
                        );

                        localStorage.removeItem(
                            "logitechUser"
                        );

                        localStorage.removeItem(
                            "logitechLoginTime"
                        );


                        /* =============================================
                           SAVE LOGIN STATUS
                        ============================================== */

                        localStorage.setItem(
                            "logitechLoggedIn",
                            "true"
                        );


                        /* =============================================
                           SAVE ACCOUNT DATA
                           
                           IMPORTANT:
                           BACKEND RETURNS "account"
                           NOT "user"
                        ============================================== */

                        localStorage.setItem(
                            "logitechUser",
                            JSON.stringify(
                                result.account || {}
                            )
                        );


                        /* =============================================
                           SAVE LOGIN TIME
                        ============================================== */

                        localStorage.setItem(
                            "logitechLoginTime",
                            new Date().toISOString()
                        );


                        console.log(
                            "LOGIN SESSION SAVED:"
                        );

                        console.log(
                            result.account
                        );


                        /* =============================================
                           REDIRECT TO MAIN SYSTEM
                        ============================================== */

                        setTimeout(
                            function () {

                                window.location.replace(
                                    "./index.html"
                                );

                            },
                            300
                        );


                        return;

                    }


                    /* =================================================
                       LOGIN FAILED
                    ================================================= */

                    showMessage(
                        result.message ||
                        "Invalid username or password.",
                        "#dc2626"
                    );


                    resetLoginButton();


                }

                catch (
                    error
                ) {


                    /* =================================================
                       LOG ERROR
                    ================================================= */

                    console.error(
                        "===================================="
                    );

                    console.error(
                        "LOGIS-TECH LOGIN ERROR"
                    );

                    console.error(
                        error
                    );

                    console.error(
                        "API URL:",
                        API_URL
                    );

                    console.error(
                        "===================================="
                    );


                    /* =================================================
                       SHOW ERROR
                    ================================================= */

                    showMessage(
                        "Unable to connect to LOGIS-TECH API. Please try again.",
                        "#dc2626"
                    );


                    resetLoginButton();

                }

            });


    }
);
