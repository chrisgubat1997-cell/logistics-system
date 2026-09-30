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


        /* =========================================
           GET FORM VALUES
        ========================================= */

        const fullName =
            document
                .getElementById("fullname")
                .value
                .trim();

        const username =
            document
                .getElementById("signupUsername")
                .value
                .trim();

        const password =
            document
                .getElementById("signupPassword")
                .value;

        const confirmPassword =
            document
                .getElementById("confirmPassword")
                .value;

        const accountType =
            document
                .getElementById("accountType")
                .value;


        /* =========================================
           VALIDATION
        ========================================= */

        if (!fullName || !username || !password) {

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


        /* =========================================
           API URL
        ========================================= */

        const API_URL =
            "https://script.google.com/macros/s/AKfycbwFZHUWgNSfSYiwEYkDncF1qja5A6RmNFyyZ4-Bm17gt_WuCYbtTYICEerGVhp9SYPedg/exec";


        /* =========================================
           LOADING
        ========================================= */

        message.textContent =
            "Creating account...";

        message.style.color =
            "#2563eb";


        /* =========================================
           SEND TO APPS SCRIPT
        ========================================= */

        try {

            const response =
                await fetch(API_URL, {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "text/plain;charset=utf-8"
                    },

                    body: JSON.stringify({

                        action:
                            "createAccount",

                        fullName:
                            fullName,

                        username:
                            username,

                        password:
                            password,

                        accountType:
                            accountType

                    })

                });


            /* =====================================
               READ API RESPONSE
            ===================================== */

            const result =
                await response.json();


            console.log(
                "LOGIS-TECH API:",
                result
            );


            /* =====================================
               SUCCESS
            ===================================== */

            if (result.success === true) {

                message.textContent =
                    "Account created successfully!";

                message.style.color =
                    "green";


                signupForm.reset();


                setTimeout(function () {

                    window.location.href =
                        "login.html";

                }, 1200);


                return;
            }


            /* =====================================
               API ERROR
            ===================================== */

            message.textContent =
                result.message ||
                "Account was not created.";

            message.style.color =
                "red";


        } catch (error) {

            console.error(
                "LOGIS-TECH SIGNUP ERROR:",
                error
            );


            message.textContent =
                "Unable to connect to LOGIS-TECH API.";

            message.style.color =
                "red";

        }

    });

});
