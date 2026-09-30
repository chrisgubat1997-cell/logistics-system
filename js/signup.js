document.addEventListener("DOMContentLoaded", function () {

    const signupForm = document.getElementById("signupForm");
    const message = document.getElementById("signupMessage");

    if (!signupForm) {
        console.error("signupForm not found!");
        return;
    }

    signupForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const fullname =
            document.getElementById("fullname").value.trim();

        const username =
            document.getElementById("signupUsername").value.trim();

        const password =
            document.getElementById("signupPassword").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;

        const accountType =
            document.getElementById("accountType").value;


        /* ================================
           VALIDATION
        ================================= */

        if (password !== confirmPassword) {

            message.textContent =
                "Passwords do not match.";

            message.style.color = "red";

            return;
        }


        if (!accountType) {

            message.textContent =
                "Please select an account type.";

            message.style.color = "red";

            return;
        }


        /* ================================
           SHOW LOADING
        ================================= */

        message.textContent =
            "Creating account...";

        message.style.color = "#2563eb";


        /* ================================
           GOOGLE APPS SCRIPT URL
        ================================= */

        const API_URL =
            "PASTE_YOUR_WEB_APP_URL_HERE";


        /* ================================
           SEND DATA
        ================================= */

        try {

            const response =
                await fetch(API_URL, {

                    method: "POST",

                    body: JSON.stringify({

                        action: "createAccount",

                        fullName: fullname,

                        username: username,

                        password: password,

                        accountType: accountType

                    })

                });


            const result =
                await response.json();


            /* ================================
               SUCCESS
            ================================= */

            if (result.success) {

                message.textContent =
                    "Account created successfully!";

                message.style.color = "green";


                signupForm.reset();


                setTimeout(function () {

                    window.location.href =
                        "login.html";

                }, 1000);


            } else {

                message.textContent =
                    result.message ||
                    "Unable to create account.";

                message.style.color = "red";

            }


        } catch (error) {

            console.error(
                "SIGNUP ERROR:",
                error
            );

            message.textContent =
                "Connection error. Please try again.";

            message.style.color = "red";

        }

    });

});
