document.addEventListener("DOMContentLoaded", function () {

    const loginForm = document.getElementById("loginForm");
    const loginMessage = document.getElementById("loginMessage");

    if (!loginForm) {
        console.error("loginForm not found");
        return;
    }

    loginForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const username =
            document.getElementById("username").value.trim();

        const password =
            document.getElementById("password").value;

        loginMessage.textContent = "Naglo-login...";
        loginMessage.style.color = "#2563eb";

        const savedUser =
            localStorage.getItem("logitechUser");

        console.log("Saved User:", savedUser);

        if (!savedUser) {

            loginMessage.textContent =
                "Walang registered account. Mag-Sign Up muna.";

            loginMessage.style.color = "red";

            return;
        }

        let user;

        try {

            user = JSON.parse(savedUser);

        } catch (error) {

            console.error("JSON ERROR:", error);

            loginMessage.textContent =
                "May error sa account data.";

            loginMessage.style.color = "red";

            return;
        }

        console.log("Username entered:", username);
        console.log("Saved username:", user.username);

        if (
            username === user.username &&
            password === user.password
        ) {

            loginMessage.textContent =
                "Login successful!";

            loginMessage.style.color = "green";

            localStorage.setItem(
                "logitechLoggedIn",
                "true"
            );

            console.log("LOGIN SUCCESS");

            setTimeout(function () {

                window.location.replace("./index.html");

            }, 500);

        } else {

            loginMessage.textContent =
                "Invalid username or password.";

            loginMessage.style.color = "red";

            console.log("LOGIN FAILED");

        }

    });

});
