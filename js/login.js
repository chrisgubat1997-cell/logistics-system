
/* =====================================================
   LOGIS-TECH SYSTEM
   LOGIN JAVASCRIPT
===================================================== */


/* =====================================================
   CONFIGURATION
===================================================== */

const LOGIN_API_URL =
    "https://script.google.com/macros/s/AKfycbwFZHUWUNGSfSYiwEYkDncF1qja5A6RmNFyyZ4-Bm17gt_WuCYbtTYICEerGVhp9SYPedg/exec";


/*
 * IMPORTANT:
 * Use the exact deployed Google Apps Script URL.
 */


/* =====================================================
   SETTINGS
===================================================== */

const LOGIN_MAX_RETRIES = 2;
const LOGIN_TIMEOUT = 15000;


/* =====================================================
   LOGIN STATE
===================================================== */

let loginInProgress = false;


/* =====================================================
   DELAY FUNCTION
===================================================== */

function loginDelay(milliseconds) {

    return new Promise(function(resolve) {

        setTimeout(
            resolve,
            milliseconds
        );

    });

}


/* =====================================================
   LOGIN API REQUEST
===================================================== */

async function loginAPI(username, password) {

    let lastError = null;


    for (
        let attempt = 0;
        attempt <= LOGIN_MAX_RETRIES;
        attempt++
    ) {

        let controller = null;
        let timeoutId = null;


        try {

            /*
             * AbortController
             * Prevents endless waiting.
             */

            controller =
                new AbortController();


            timeoutId =
                setTimeout(
                    function() {

                        controller.abort();

                    },
                    LOGIN_TIMEOUT
                );


            const response =
                await fetch(
                    LOGIN_API_URL,
                    {

                        method: "POST",

                        cache: "no-store",

                        headers: {

                            "Content-Type":
                                "text/plain;charset=utf-8"

                        },

                        body:
                            JSON.stringify({

                                action:
                                    "login",

                                data: {

                                    username:
                                        username,

                                    password:
                                        password

                                }

                            }),

                        signal:
                            controller.signal

                    }
                );


            clearTimeout(timeoutId);


            /*
             * HTTP ERROR
             */

            if (!response.ok) {

                throw new Error(
                    "HTTP " +
                    response.status
                );

            }


            /*
             * Read response as text first.
             * This prevents JSON parsing errors
             * from immediately breaking login.
             */

            const responseText =
                await response.text();


            if (!responseText) {

                throw new Error(
                    "Empty API response."
                );

            }


            let result;


            try {

                result =
                    JSON.parse(
                        responseText
                    );

            }

            catch (jsonError) {

                console.error(
                    "LOGIN INVALID JSON:",
                    responseText
                );

                throw new Error(
                    "Invalid API response."
                );

            }


            console.log(
                "LOGIS-TECH LOGIN RESPONSE:",
                result
            );


            /*
             * API RESPONSE RECEIVED
             */

            return result;


        }

        catch (error) {

            if (timeoutId) {

                clearTimeout(
                    timeoutId
                );

            }


            lastError =
                error;


            console.warn(
                "LOGIS-TECH LOGIN ATTEMPT " +
                (attempt + 1) +
                " FAILED:",
                error.message
            );


            /*
             * Retry only if attempts remain.
             */

            if (
                attempt <
                LOGIN_MAX_RETRIES
            ) {

                /*
                 * Small delay before retry.
                 */

                await loginDelay(
                    700 +
                    (attempt * 500)
                );

            }

        }

    }


    /*
     * All attempts failed.
     */

    throw lastError ||
        new Error(
            "Unable to connect to API."
        );

}


/* =====================================================
   DOM READY
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function() {


        /* ---------------------------------------------
           GET ELEMENTS
        --------------------------------------------- */

        const loginForm =
            document.getElementById(
                "loginForm"
            );


        const loginMessage =
            document.getElementById(
                "loginMessage"
            );


        const loginButton =
            loginForm
                ? loginForm.querySelector(
                    'button[type="submit"]'
                )
                : null;


        if (!loginForm) {

            console.error(
                "loginForm not found!"
            );

            return;

        }


        /* =================================================
           LOGIN FORM SUBMIT
        ================================================= */

        loginForm.addEventListener(
            "submit",
            async function(event) {

                event.preventDefault();


                /*
                 * Prevent duplicate login requests.
                 */

                if (loginInProgress) {

                    return;

                }


                /* -----------------------------------------
                   GET INPUTS
                ----------------------------------------- */

                const usernameInput =
                    document.getElementById(
                        "username"
                    );


                const passwordInput =
                    document.getElementById(
                        "password"
                    );


                if (
                    !usernameInput ||
                    !passwordInput
                ) {

                    console.error(
                        "Login inputs not found."
                    );

                    return;

                }


                const username =
                    usernameInput.value.trim();


                const password =
                    passwordInput.value;


                /* -----------------------------------------
                   VALIDATION
                ----------------------------------------- */

                if (!username || !password) {

                    loginMessage.textContent =
                        "Please enter username and password.";

                    loginMessage.style.color =
                        "#dc2626";

                    return;

                }


                /* -----------------------------------------
                   START LOGIN
                ----------------------------------------- */

                loginInProgress =
                    true;


                /*
                 * Disable login button
                 */

                if (loginButton) {

                    loginButton.disabled =
                        true;

                    loginButton.dataset.originalText =
                        loginButton.textContent;

                    loginButton.textContent =
                        "LOGGING IN...";

                }


                loginMessage.textContent =
                    "Connecting to LOGIS-TECH...";

                loginMessage.style.color =
                    "#2563eb";


                try {


                    /* -------------------------------------
                       API LOGIN
                    ------------------------------------- */

                    const result =
                        await loginAPI(
                            username,
                            password
                        );


                    /* -------------------------------------
                       SUCCESS
                    ------------------------------------- */

                    if (
                        result &&
                        result.success === true
                    ) {

                        loginMessage.textContent =
                            "Login successful!";

                        loginMessage.style.color =
                            "#16a34a";


                        /*
                         * SAVE LOGIN SESSION
                         */

                        localStorage.setItem(
                            "logitechLoggedIn",
                            "true"
                        );


                        /*
                         * SAVE USER INFORMATION
                         */

                        localStorage.setItem(
                            "logitechUser",
                            JSON.stringify(
                                result.user || {}
                            )
                        );


                        /*
                         * Go directly to main system.
                         *
                         * No unnecessary 500ms delay.
                         */

                        window.location.replace(
                            "./index.html"
                        );


                        return;

                    }


                    /* -------------------------------------
                       INVALID LOGIN
                    ------------------------------------- */

                    loginMessage.textContent =
                        (
                            result &&
                            result.message
                        )
                        ||
                        "Invalid username or password.";

                    loginMessage.style.color =
                        "#dc2626";


                    loginInProgress =
                        false;


                    if (loginButton) {

                        loginButton.disabled =
                            false;

                        loginButton.textContent =
                            loginButton.dataset.originalText ||
                            "LOGIN";

                    }

                }

                catch (error) {

                    console.error(
                        "LOGIS-TECH LOGIN ERROR:",
                        error
                    );


                    /*
                     * Better error message
                     */

                    if (
                        error &&
                        error.name ===
                        "AbortError"
                    ) {

                        loginMessage.textContent =
                            "The server is taking too long to respond. Please try again.";

                    }

                    else {

                        loginMessage.textContent =
                            "Unable to connect to LOGIS-TECH API. Please try again.";

                    }


                    loginMessage.style.color =
                        "#dc2626";


                    loginInProgress =
                        false;


                    /*
                     * Re-enable button
                     */

                    if (loginButton) {

                        loginButton.disabled =
                            false;

                        loginButton.textContent =
                            loginButton.dataset.originalText ||
                            "LOGIN";

                    }

                }

            }
        );

    }
);

