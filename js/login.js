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

        // Check global maintenance before presenting the login interface.
        // Only ADMIN credentials can proceed while maintenance is enabled.
        let maintenanceEnabled = false;
        let maintenanceMessage = "The system is temporarily unavailable while maintenance is being performed.";
        const loginContainer = document.querySelector(".login-container");

        function showMaintenanceScreen() {
            let screen = document.getElementById("loginMaintenanceScreen");
            if (!screen) {
                screen = document.createElement("div");
                screen.id = "loginMaintenanceScreen";
                screen.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;background:linear-gradient(135deg,#071a35,#102a56);color:#fff;font-family:Segoe UI,Arial,sans-serif;text-align:center;";
                screen.innerHTML = '<div style="max-width:520px;width:100%;padding:42px 30px;border:1px solid rgba(255,255,255,.18);border-radius:18px;background:rgba(255,255,255,.08);box-shadow:0 24px 70px rgba(0,0,0,.3)"><img src="assets/logo.png" alt="LOGIS-TECH" style="width:110px;max-height:90px;object-fit:contain;margin-bottom:24px"><h1 style="font-size:clamp(26px,5vw,38px);margin:0 0 14px">System Under Maintenance</h1><p id="loginMaintenanceMessage" style="font-size:15px;line-height:1.7;color:#dbeafe;margin:0 0 26px"></p><div style="font-size:11px;letter-spacing:2px;color:#9fb6d8;margin-bottom:24px">LOGIS-TECH SYSTEM · PLEASE CHECK BACK LATER</div><button type="button" id="maintenanceAdminAccess" style="border:1px solid rgba(255,255,255,.35);border-radius:8px;padding:11px 18px;background:transparent;color:#fff;font-weight:700;letter-spacing:1px;cursor:pointer">ADMINISTRATOR ACCESS</button></div>';
                document.body.appendChild(screen);
                screen.querySelector("#maintenanceAdminAccess").addEventListener("click", function () {
                    screen.remove();
                    if (loginContainer) loginContainer.style.display = "";
                    usernameInput.focus();
                });
            }
            const message = screen.querySelector("#loginMaintenanceMessage");
            if (message) message.textContent = maintenanceMessage;
            if (loginContainer) loginContainer.style.display = "none";
        }

        async function checkMaintenanceBeforeLogin() {
            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify({ action: "getSystemMaintenanceStatus", data: {} })
                });
                const result = await response.json();
                if (response.ok && result && result.success === true && result.enabled === true) {
                    maintenanceEnabled = true;
                    maintenanceMessage = result.message || maintenanceMessage;
                    showMaintenanceScreen();
                }
            } catch (error) {
                console.warn("Unable to pre-check system maintenance status:", error);
            }
        }

        checkMaintenanceBeforeLogin();


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

                    if (result && result.code === "MAINTENANCE_MODE") {
                        maintenanceEnabled = true;
                        maintenanceMessage = result.message || maintenanceMessage;
                        showMaintenanceScreen();
                    }

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
