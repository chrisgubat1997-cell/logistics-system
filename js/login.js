document.addEventListener("DOMContentLoaded", function () {

    const loginForm =
        document.getElementById("loginForm");

    const loginMessage =
        document.getElementById("loginMessage");

    const loginButton =
        loginForm
            ? loginForm.querySelector(
                'button[type="submit"]'
            )
            : null;


    const API_URL =
        "https://script.google.com/macros/s/AKfycbwFZHUWgNSfSYiwEYkDncF1qja5A6RmNFyyZ4-Bm17gt_WuCYbtTYICEerGVhp9SYPedg/exec";


    let loginInProgress = false;


    if (!loginForm) {

        console.error(
            "loginForm not found!"
        );

        return;

    }


    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /* =========================================
               PREVENT DOUBLE LOGIN
            ========================================= */

            if (loginInProgress) {

                return;

            }


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
                    "Username or password input not found."
                );

                return;

            }


            const username =
                usernameInput.value.trim();

            const password =
                passwordInput.value;


            /* =========================================
               VALIDATION
            ========================================= */

            if (!username || !password) {

                loginMessage.textContent =
                    "Please enter username and password.";

                loginMessage.style.color =
                    "#dc2626";

                return;

            }


            /* =========================================
               START LOGIN
            ========================================= */

            loginInProgress = true;


            if (loginButton) {

                loginButton.disabled = true;

                loginButton.dataset.oldText =
                    loginButton.textContent;

                loginButton.textContent =
                    "LOGGING IN...";

            }


            loginMessage.textContent =
                "Connecting to LOGIS-TECH...";

            loginMessage.style.color =
                "#2563eb";


            /* =========================================
               LOGIN REQUEST
            ========================================= */

            async function sendLoginRequest() {

                const response =
                    await fetch(
                        API_URL,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "text/plain;charset=utf-8"
                            },

                            body: JSON.stringify({

                                action: "login",

                                data: {

                                    username:
                                        username,

                                    password:
                                        password

                                }

                            })

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


                if (!response.ok) {

                    throw new Error(
                        "HTTP " +
                        response.status
                    );

                }


                let result;


                try {

                    result =
                        JSON.parse(
                            responseText
                        );

                }

                catch (error) {

                    throw new Error(
                        "Invalid JSON response from API."
                    );

                }


                return result;

            }


            try {

                let result;


                /* =====================================
                   FIRST ATTEMPT
                ===================================== */

                try {

                    result =
                        await sendLoginRequest();

                }

                catch (firstError) {

                    console.warn(
                        "First login attempt failed. Retrying..."
                    );

                    /*
                     * Wait 1 second then retry.
                     */

                    await new Promise(
                        function(resolve) {

                            setTimeout(
                                resolve,
                                1000
                            );

                        }
                    );


                    /* ================================
                       SECOND ATTEMPT
                    ================================ */

                    result =
                        await sendLoginRequest();

                }


                console.log(
                    "LOGIS-TECH LOGIN RESULT:",
                    result
                );


                /* =====================================
                   LOGIN SUCCESS
                ===================================== */

                if (
                    result &&
                    result.success === true
                ) {

                    loginMessage.textContent =
                        "Login successful!";

                    loginMessage.style.color =
                        "#16a34a";


                    /* ==============================
                       SAVE LOGIN SESSION
                    ============================== */

                    localStorage.setItem(
                        "logitechLoggedIn",
                        "true"
                    );


                    /* ==============================
                       SAVE USER
                    ============================== */

                    localStorage.setItem(
                        "logitechUser",
                        JSON.stringify(
                            result.user || {}
                        )
                    );


                    /* ==============================
                       GO TO MAIN SYSTEM
                    ============================== */

                    window.location.replace(
                        "./index.html"
                    );

                    return;

                }


                /* =====================================
                   INVALID LOGIN
                ===================================== */

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
                        loginButton.dataset.oldText ||
                        "LOGIN";

                }

            }

            catch (error) {

                console.error(
                    "LOGIS-TECH LOGIN ERROR:",
                    error
                );


                loginMessage.textContent =
                    "Unable to connect to LOGIS-TECH API. Please try again.";

                loginMessage.style.color =
                    "#dc2626";


                loginInProgress =
                    false;


                if (loginButton) {

                    loginButton.disabled =
                        false;

                    loginButton.textContent =
                        loginButton.dataset.oldText ||
                        "LOGIN";

                }

            }

        }
    );

});
