document.addEventListener("DOMContentLoaded", function () {

    const forgotForm =
        document.getElementById("forgotPasswordForm");

    const message =
        document.getElementById("forgotMessage");


    /* =========================================
       CHECK FORM
    ========================================= */

    if (!forgotForm) {

        console.error(
            "LOGIS-TECH ERROR: forgotPasswordForm not found."
        );

        return;
    }


    if (!message) {

        console.error(
            "LOGIS-TECH ERROR: forgotMessage not found."
        );

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

    forgotForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /* =====================================
               GET FORM VALUES
            ===================================== */

            const usernameInput =
                document.getElementById(
                    "resetUsername"
                );

            const newPasswordInput =
                document.getElementById(
                    "newPassword"
                );

            const confirmNewPasswordInput =
                document.getElementById(
                    "confirmNewPassword"
                );


            if (
                !usernameInput ||
                !newPasswordInput ||
                !confirmNewPasswordInput
            ) {

                console.error(
                    "LOGIS-TECH ERROR: Reset password fields are missing."
                );

                message.textContent =
                    "Reset password form is incomplete.";

                message.style.color =
                    "#dc2626";

                return;
            }


            /* =====================================
               VALUES
            ===================================== */

            const username =
                usernameInput.value.trim();

            const newPassword =
                newPasswordInput.value;

            const confirmNewPassword =
                confirmNewPasswordInput.value;


            console.log(
                "PASSWORD RESET VALUES:",
                {
                    username: username
                }
            );


            /* =====================================
               VALIDATION
            ===================================== */

            if (!username) {

                message.textContent =
                    "Please enter your username.";

                message.style.color =
                    "#dc2626";

                usernameInput.focus();

                return;
            }


            if (!newPassword) {

                message.textContent =
                    "Please enter your new password.";

                message.style.color =
                    "#dc2626";

                newPasswordInput.focus();

                return;
            }


            if (!confirmNewPassword) {

                message.textContent =
                    "Please confirm your new password.";

                message.style.color =
                    "#dc2626";

                confirmNewPasswordInput.focus();

                return;
            }


            if (
                newPassword !==
                confirmNewPassword
            ) {

                message.textContent =
                    "Passwords do not match.";

                message.style.color =
                    "#dc2626";

                confirmNewPasswordInput.focus();

                return;
            }


            if (newPassword.length < 6) {

                message.textContent =
                    "Password must be at least 6 characters.";

                message.style.color =
                    "#dc2626";

                newPasswordInput.focus();

                return;
            }


            /* =====================================
               LOADING
            ===================================== */

            message.textContent =
                "Resetting password...";

            message.style.color =
                "#2563eb";


            const submitButton =
                forgotForm.querySelector(
                    'button[type="submit"]'
                );


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.dataset.oldText =
                    submitButton.textContent;

                submitButton.textContent =
                    "RESETTING...";
            }


            /* =====================================
               API REQUEST
            ===================================== */

            try {

                const requestBody = {

                    action:
                        "resetPassword",

                    data: {

                        username:
                            username,

                        newPassword:
                            newPassword

                    }

                };


                console.log(
                    "LOGIS-TECH RESET REQUEST:",
                    requestBody
                );


                const response =
                    await fetch(
                        API_URL,
                        {

                            method:
                                "POST",

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
                    "RESET HTTP STATUS:",
                    response.status
                );

                console.log(
                    "RESET API RESPONSE:",
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
                    "LOGIS-TECH PASSWORD RESET RESULT:",
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
                        "Password reset successfully!";

                    message.style.color =
                        "#16a34a";


                    forgotForm.reset();


                    if (submitButton) {

                        submitButton.disabled =
                            true;

                        submitButton.textContent =
                            "PASSWORD RESET";
                    }


                    setTimeout(
                        function () {

                            window.location.href =
                                "login.html";

                        },
                        1500
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
                    "Unable to reset password.";

                message.style.color =
                    "#dc2626";


                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        submitButton.dataset.oldText ||
                        "RESET PASSWORD";
                }


            } catch (error) {

                console.error(
                    "===================================="
                );

                console.error(
                    "LOGIS-TECH PASSWORD RESET ERROR"
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
                        "RESET PASSWORD";
                }

            }

        }
    );

});
