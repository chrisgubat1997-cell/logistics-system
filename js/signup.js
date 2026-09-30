document.addEventListener("DOMContentLoaded", function () {

    const signupForm =
        document.getElementById("signupForm");

    const message =
        document.getElementById("signupMessage");

    if (!signupForm) {
        console.error("LOGIS-TECH ERROR: signupForm not found.");
        return;
    }

    if (!message) {
        console.error("LOGIS-TECH ERROR: signupMessage not found.");
        return;
    }


    /* =========================================
       API URL
    ========================================= */

    const API_URL =
        "https://script.google.com/macros/s/AKfycbwFZHUWgNSfSYiwEYkDncF1qja5A6RmNFyyZ4-Bm17gt_WuCYbtTYICEerGVhp9SYPedg/exec";


    /* =========================================
       FORM SUBMIT
    ========================================= */

    signupForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /* =====================================
               GET FORM ELEMENTS
            ===================================== */

            const fullNameInput =
                document.getElementById("fullname");

            const usernameInput =
                document.getElementById("signupUsername");

            const passwordInput =
                document.getElementById("signupPassword");

            const confirmPasswordInput =
                document.getElementById("confirmPassword");

            const accountTypeInput =
                document.getElementById("accountType");


            if (
                !fullNameInput ||
                !usernameInput ||
                !passwordInput ||
                !confirmPasswordInput ||
                !accountTypeInput
            ) {

                console.error(
                    "LOGIS-TECH ERROR: One or more signup fields are missing."
                );

                message.textContent =
                    "Signup form is incomplete.";

                message.style.color =
                    "#dc2626";

                return;
            }


            /* =====================================
               GET VALUES
            ===================================== */

            const fullName =
                fullNameInput.value.trim();

            const username =
                usernameInput.value.trim();

            const password =
                passwordInput.value;

            const confirmPassword =
                confirmPasswordInput.value;

            const accountType =
                accountTypeInput.value.trim();


            console.log(
                "SIGNUP VALUES:",
                {
                    fullName: fullName,
                    username: username,
                    accountType: accountType
                }
            );


            /* =====================================
               VALIDATION
            ===================================== */

            if (!fullName) {

                message.textContent =
                    "Please enter your full name.";

                message.style.color =
                    "#dc2626";

                fullNameInput.focus();

                return;
            }


            if (!username) {

                message.textContent =
                    "Please enter a username.";

                message.style.color =
                    "#dc2626";

                usernameInput.focus();

                return;
            }


            if (!password) {

                message.textContent =
                    "Please enter a password.";

                message.style.color =
                    "#dc2626";

                passwordInput.focus();

                return;
            }


            if (!confirmPassword) {

                message.textContent =
                    "Please confirm your password.";

                message.style.color =
                    "#dc2626";

                confirmPasswordInput.focus();

                return;
            }


            if (password !== confirmPassword) {

                message.textContent =
                    "Passwords do not match.";

                message.style.color =
                    "#dc2626";

                confirmPasswordInput.focus();

                return;
            }


            if (!accountType) {

                message.textContent =
                    "Please select an account type.";

                message.style.color =
                    "#dc2626";

                accountTypeInput.focus();

                return;
            }


            /* =====================================
               LOADING
            ===================================== */

            message.textContent =
                "Creating account...";

            message.style.color =
                "#2563eb";


            const submitButton =
                signupForm.querySelector(
                    'button[type="submit"]'
                );


            if (submitButton) {

                submitButton.disabled = true;

                submitButton.dataset.oldText =
                    submitButton.textContent;

                submitButton.textContent =
                    "CREATING ACCOUNT...";
            }


            /* =====================================
               API REQUEST
            ===================================== */

            try {

                const requestBody = {

                    action:
                        "createAccount",

                    data: {

                        fullName:
                            fullName,

                        username:
                            username,

                        password:
                            password,

                        accountType:
                            accountType
                    }
                };


                console.log(
                    "LOGIS-TECH SIGNUP REQUEST:",
                    requestBody
                );


                const response =
                    await fetch(
                        API_URL,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "text/plain;charset=utf-8"
                            },

                            body:
                                JSON.stringify(
                                    requestBody
                                )
                        }
                    );


                const responseText =
                    await response.text();


                console.log(
                    "SIGNUP HTTP STATUS:",
                    response.status
                );

                console.log(
                    "SIGNUP API RESPONSE:",
                    responseText
                );


                if (!response.ok) {

                    throw new Error(
                        "HTTP " +
                        response.status
                    );
                }


                if (!responseText) {

                    throw new Error(
                        "Empty response from API."
                    );
                }


                let result;

                try {

                    result =
                        JSON.parse(
                            responseText
                        );

                } catch (jsonError) {

                    console.error(
                        "INVALID JSON RESPONSE:",
                        responseText
                    );

                    throw new Error(
                        "Invalid JSON response from API."
                    );
                }


                console.log(
                    "LOGIS-TECH SIGNUP RESULT:",
                    result
                );


                /* =================================
                   SUCCESS
                ================================= */

                if (
                    result &&
                    result.success === true
                ) {

                    message.textContent =
                        "Account created successfully!";

                    message.style.color =
                        "#16a34a";


                    signupForm.reset();


                    if (submitButton) {

                        submitButton.disabled =
                            true;

                        submitButton.textContent =
                            "ACCOUNT CREATED";
                    }


                    setTimeout(
                        function () {

                            window.location.href =
                                "login.html";

                        },
                        1200
                    );


                    return;
                }


                /* =================================
                   API ERROR
                ================================= */

                message.textContent =
                    (
                        result &&
                        result.message
                    ) ||
                    "Account was not created.";

                message.style.color =
                    "#dc2626";


                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        submitButton.dataset.oldText ||
                        "SIGN UP";
                }


            } catch (error) {

                console.error(
                    "===================================="
                );

                console.error(
                    "LOGIS-TECH SIGNUP ERROR"
                );

                console.error(error);

                console.error(
                    "API URL:",
                    API_URL
                );

                console.error(
                    "===================================="
                );


                message.textContent =
                    "Unable to connect to LOGIS-TECH API. Please try again.";

                message.style.color =
                    "#dc2626";


                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        submitButton.dataset.oldText ||
                        "SIGN UP";
                }

            }

        }
    );

});
