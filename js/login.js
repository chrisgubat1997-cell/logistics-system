document.addEventListener("DOMContentLoaded", function () {

    const loginForm =
        document.getElementById("loginForm");

    const loginMessage =
        document.getElementById("loginMessage");

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

            const username =
                document
                    .getElementById("username")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("password")
                    .value;

            if (!username || !password) {

                loginMessage.textContent =
                    "Please enter username and password.";

                loginMessage.style.color =
                    "red";

                return;

            }

            const API_URL =
                "https://script.google.com/macros/s/AKfycbwFZHUWgNSfSYiwEYkDncF1qja5A6RmNFyyZ4-Bm17gt_WuCYbtTYICEerGVhp9SYPedg/exec";

            loginMessage.textContent =
                "Logging in...";

            loginMessage.style.color =
                "#2563eb";

            try {

                const response =
                    await fetch(API_URL, {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "text/plain;charset=utf-8"

                        },

                        body:
                            JSON.stringify({

                                action:
                                    "login",

                                username:
                                    username,

                                password:
                                    password

                            })

                    });

                const result =
                    await response.json();

                console.log(
                    "LOGIS-TECH LOGIN:",
                    result
                );

                if (
                    result.success === true
                ) {

                    loginMessage.textContent =
                        "Login successful!";

                    loginMessage.style.color =
                        "green";

                    /*
                     * Save login session
                     */

                    localStorage.setItem(
                        "logitechLoggedIn",
                        "true"
                    );

                    /*
                     * Save user information
                     */

                    localStorage.setItem(
                        "logitechUser",
                        JSON.stringify(
                            result.user
                        )
                    );

                    /*
                     * Go to main system
                     */

                    setTimeout(
                        function () {

                            window.location.replace(
                                "./index.html"
                            );

                        },
                        500
                    );

                    return;

                }

                loginMessage.textContent =
                    result.message ||
                    "Invalid username or password.";

                loginMessage.style.color =
                    "red";

            }

            catch (error) {

                console.error(
                    "LOGIS-TECH LOGIN ERROR:",
                    error
                );

                loginMessage.textContent =
                    "Unable to connect to LOGIS-TECH API.";

                loginMessage.style.color =
                    "red";

            }

        }
    );

});
