document.addEventListener("DOMContentLoaded", function () {

    const forgotForm =
        document.getElementById("forgotPasswordForm");

    const message =
        document.getElementById("forgotMessage");

    if (!forgotForm) {

        console.error(
            "forgotPasswordForm not found!"
        );

        return;

    }

    forgotForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const username =
                document
                    .getElementById("resetUsername")
                    .value
                    .trim();

            const newPassword =
                document
                    .getElementById("newPassword")
                    .value;

            const confirmNewPassword =
                document
                    .getElementById("confirmNewPassword")
                    .value;

            if (
                !username ||
                !newPassword ||
                !confirmNewPassword
            ) {

                message.textContent =
                    "Please complete all fields.";

                message.style.color =
                    "red";

                return;

            }

            if (
                newPassword !==
                confirmNewPassword
            ) {

                message.textContent =
                    "Passwords do not match.";

                message.style.color =
                    "red";

                return;

            }

            if (newPassword.length < 6) {

                message.textContent =
                    "Password must be at least 6 characters.";

                message.style.color =
                    "red";

                return;

            }

            const API_URL =
                "ILAGAY ANG ACTUAL WEB APP URL MO";

            message.textContent =
                "Resetting password...";

            message.style.color =
                "#2563eb";

            try {

                const response =
                    await fetch(API_URL, {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "text/plain;charset=utf-8"

                        },

                        body:
                            JSON.stringify({

                                action:
                                    "resetPassword",

                                username:
                                    username,

                                newPassword:
                                    newPassword

                            })

                    });

                const result =
                    await response.json();

                console.log(
                    "LOGIS-TECH PASSWORD RESET:",
                    result
                );

                if (
                    result.success === true
                ) {

                    message.textContent =
                        "Password reset successfully!";

                    message.style.color =
                        "green";

                    forgotForm.reset();

                    setTimeout(
                        function () {

                            window.location.href =
                                "login.html";

                        },
                        1500
                    );

                    return;

                }

                message.textContent =
                    result.message ||
                    "Unable to reset password.";

                message.style.color =
                    "red";

            }

            catch (error) {

                console.error(
                    "LOGIS-TECH RESET ERROR:",
                    error
                );

                message.textContent =
                    "Unable to connect to LOGIS-TECH API.";

                message.style.color =
                    "red";

            }

        }
    );

});
