document.addEventListener("DOMContentLoaded", function () {

    const loginForm = document.getElementById("loginForm");

    loginForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const message = document.getElementById("loginMessage");

        const savedUser = localStorage.getItem("logitechUser");

        console.log("Saved User:", savedUser);
        console.log("Entered Username:", username);
        console.log("Entered Password:", password);

        if (!savedUser) {
            message.textContent = "No account found.";
            message.style.color = "red";
            return;
        }

        const user = JSON.parse(savedUser);

        console.log("Saved Username:", user.username);
        console.log("Saved Password:", user.password);

        if (
            username === user.username &&
            password === user.password
        ) {

            message.textContent = "LOGIN SUCCESSFUL!";
            message.style.color = "green";

            localStorage.setItem("logitechLoggedIn", "true");

            setTimeout(function () {
                window.location.href = "index.html";
            }, 1000);

        } else {

            message.textContent = "Username or password is incorrect.";
            message.style.color = "red";

        }

    });

});
