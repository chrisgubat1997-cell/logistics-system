document.addEventListener("DOMContentLoaded", function () {

    const signupForm = document.getElementById("signupForm");

    if (!signupForm) {
        alert("ERROR: signupForm not found!");
        return;
    }

    signupForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const fullname = document.getElementById("fullname").value.trim();
        const username = document.getElementById("signupUsername").value.trim();
        const password = document.getElementById("signupPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const message = document.getElementById("signupMessage");

        if (password !== confirmPassword) {

            message.textContent = "Passwords do not match.";
            message.style.color = "red";

            return;
        }

        const user = {
            fullname: fullname,
            username: username,
            password: password
        };

        localStorage.setItem(
            "logitechUser",
            JSON.stringify(user)
        );

        // TEST
        alert("ACCOUNT SAVED!");

        message.textContent = "Account created successfully!";
        message.style.color = "green";

        setTimeout(function () {
            window.location.href = "login.html";
        }, 1000);

    });

});
