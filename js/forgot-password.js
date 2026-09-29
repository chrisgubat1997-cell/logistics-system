/* =========================================
   LOGI-TECH FORGOT PASSWORD
========================================= */

document
    .getElementById("forgotForm")
    .addEventListener("submit", function (event) {

        event.preventDefault();


        const username =
            document
                .getElementById("forgotUsername")
                .value
                .trim();

        const message =
            document.getElementById("forgotMessage");


        if (username === "") {

            message.textContent =
                "Please enter your username.";

            message.style.color = "red";

            return;
        }


        message.textContent =
            "Password recovery request submitted.";

        message.style.color = "green";

    });
