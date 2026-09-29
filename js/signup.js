/* =========================================
   LOGI-TECH SIGN UP
========================================= */

document
    .getElementById("signupForm")
    .addEventListener("submit", function (event) {

        event.preventDefault();


        const fullname =
            document.getElementById("fullname").value.trim();

        const username =
            document.getElementById("signupUsername").value.trim();

        const password =
            document.getElementById("signupPassword").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;

        const message =
            document.getElementById("signupMessage");


        /* CHECK PASSWORD */

        if (password !== confirmPassword) {

            message.textContent =
                "Passwords do not match.";

            message.style.color = "red";

            return;
        }


        /* DEMO SUCCESS */

        message.textContent =
            "Account created successfully!";

        message.style.color = "green";


        /* RETURN TO LOGIN */

        setTimeout(function () {

            window.location.href =
                "login.html";

        }, 1000);

    });
