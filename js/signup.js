document.addEventListener("DOMContentLoaded", function () {

    const signupForm =
        document.getElementById("signupForm");

    const message =
        document.getElementById("signupMessage");


    if (!signupForm) {

        console.error("signupForm not found!");

        return;
    }


    signupForm.addEventListener("submit", async function (event) {

        event.preventDefault();


        /* ================================
           GET FORM VALUES
        ================================= */

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

        if (!fullname || !username || !password) {

            message.textContent =
                "Please complete all fields.";

            message.style.color = "red";

            return;
        }


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
           LOADING
        ================================= */

        message.textContent =
            "Creating account...";

        message.style.color =
            "#2563eb";


        /* ================================
           LOGIS-TECH API
        ================================= */

        const API_URL =
            "https://script.google.com/macros/s/AKfycbwFZHUWgNSfSYiwEYkDncF1qja5A6RmNFyyZ4-Bm17gt_WuCYbtTYICEerGVhp9SYPedg/exec";


        /* ================================
           SEND TO GOOGLE APPS SCRIPT
        ================================= */

        try {

            await fetch(API_URL, {

                method: "POST",

                mode: "no-cors",

                headers: {
                    "Content-Type":
                        "text/plain;charset=utf-8"
                },

                body: JSON.stringify({

                    action: "createAccount",

                    fullName: fullname,

                    username: username,

                    password: password,

                    accountType: accountType

                })

            });


            /* ================================
               SUCCESS
            ================================= */

            message.textContent =
                "Account created successfully!";

            message.style.color =
                "green";


            signupForm.reset();


            setTimeout(function () {

                window.location.href =
                    "login.html";

            }, 1500);


        } catch (error) {

            console.error(
                "SIGNUP ERROR:",
                error
            );

            message.textContent =
                "Unable to connect to LOGIS-TECH API.";

            message.style.color =
                "red";

        }

    });

});
