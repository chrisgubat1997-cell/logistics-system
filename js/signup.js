document.addEventListener("DOMContentLoaded", function () {

    const signupForm = document.getElementById("signupForm");

    signupForm.addEventListener("submit", function (event) {

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

        // Check password
        if (password !== confirmPassword) {

            message.textContent = "Passwords do not match.";
            message.style.color = "red";

            return;
        }

        // Check existing account
        const existingUser =
            JSON.parse(localStorage.getItem("logitechUser"));

        if (existingUser && existingUser.username === username) {

            message.textContent = "Username already exists.";
            message.style.color = "red";

            return;
        }

        // Save account
        const user = {
            fullname: fullname,
            username: username,
            password: password
        };

        localStorage.setItem(
            "logitechUser",
            JSON.stringify(user)
        );

        message.textContent =
            "Account created successfully!";

        message.style.color = "green";

        // Go back to login
        setTimeout(function () {

            window.location.href = "login.html";

        }, 1000);

    });

});
