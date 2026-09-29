
/* =========================================
   LOGI-TECH LOGIN
========================================= */

document
    .getElementById("loginForm")
    .addEventListener("submit", function (event) {

        event.preventDefault();

        const username =
            document.getElementById("username").value.trim();

        const password =
            document.getElementById("password").value;

        const message =
            document.getElementById("loginMessage");


        /* =====================================
           DEMO LOGIN ACCOUNT
        ===================================== */

        const demoUsername = "admin";
        const demoPassword = "admin123";


        /* =====================================
           CHECK LOGIN
        ===================================== */

        if (
            username === demoUsername &&
            password === demoPassword
        ) {

            message.textContent =
                "Login successful...";

            message.style.color = "green";


            /* ================================
               GO TO EXISTING MAIN SYSTEM
            ================================= */

            setTimeout(function () {

                window.location.href =
                    "index.html";

            }, 500);

        } else {

            message.textContent =
                "Invalid username or password.";

            message.style.color = "red";

        }

    });
