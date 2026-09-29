document.addEventListener("DOMContentLoaded", function () {

    const loginForm = document.getElementById("loginForm");

    loginForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const username =
            document.getElementById("username").value.trim();

        const password =
            document.getElementById("password").value;

        const message =
            document.getElementById("loginMessage");

        // Get saved account
        const savedUser =
            JSON.parse(localStorage.getItem("logitechUser"));

        // Check saved account
        if (
            savedUser &&
            username === savedUser.username &&
            password === savedUser.password
        ) {

            message.textContent =
                "Login successful...";

            message.style.color = "green";

            setTimeout(function () {

                window.location.href = "index.html";

            }, 500);

            return;
        }

        // Demo admin account
        if (
            username === "admin" &&
            password === "admin123"
        ) {

            message.textContent =
                "Login successful...";

            message.style.color = "green";

            setTimeout(function () {

                window.location.href = "index.html";

            }, 500);

            return;
        }

        message.textContent =
            "Invalid username or password.";

        message.style.color = "red";

    });

});
