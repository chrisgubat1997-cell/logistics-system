document.addEventListener("DOMContentLoaded", function () {

    const signupForm =
        document.getElementById("signupForm");

    const message =
        document.getElementById("signupMessage");


    if (!signupForm) {

        console.error("signupForm not found!");

        return;
    }


    signupForm.addEventListener("submit", function (event) {

        event.preventDefault();


        /* ================================
           GET FORM VALUES
        ================================= */

        const fullname =
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


        /* ================================
           VALIDATION
        ================================= */

        if (
            !fullname ||
            !username ||
            !password
        ) {

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
           API URL
        ================================= */

        const API_URL =
            "https://script.google.com/macros/s/AKfycbwFZHUWgNSfSYiwEYkDncF1qja5A6RmNFyyZ4-Bm17gt_WuCYbtTYICEerGVhp9SYPedg/exec";


        /* ================================
           LOADING
        ================================= */

        message.textContent =
            "Creating account...";

        message.style.color =
            "#2563eb";


        /* ================================
           CREATE HIDDEN IFRAME
        ================================= */

        let iframe =
            document.getElementById(
                "signupApiFrame"
            );


        if (!iframe) {

            iframe =
                document.createElement("iframe");

            iframe.id =
                "signupApiFrame";

            iframe.name =
                "signupApiFrame";

            iframe.style.display =
                "none";

            document.body.appendChild(
                iframe
            );

        }


        /* ================================
           CREATE FORM
        ================================= */

        const apiForm =
            document.createElement("form");

        apiForm.method =
            "POST";

        apiForm.action =
            API_URL;

        apiForm.target =
            "signupApiFrame";

        apiForm.style.display =
            "none";


        /* ================================
           FORM FIELD HELPER
        ================================= */

        function addField(name, value) {

            const input =
                document.createElement("input");

            input.type =
                "hidden";

            input.name =
                name;

            input.value =
                value;

            apiForm.appendChild(
                input
            );

        }


        /* ================================
           ADD DATA
        ================================= */

        addField(
            "fullName",
            fullname
        );

        addField(
            "username",
            username
        );

        addField(
            "password",
            password
        );

        addField(
            "accountType",
            accountType
        );


        document.body.appendChild(
            apiForm
        );


        /* ================================
           SUBMIT TO APPS SCRIPT
        ================================= */

        apiForm.submit();


        /* ================================
           SHOW SUCCESS
        ================================= */

        setTimeout(function () {

            message.textContent =
                "Account created successfully!";

            message.style.color =
                "green";

            signupForm.reset();


            setTimeout(function () {

                window.location.href =
                    "login.html";

            }, 1000);


        }, 1500);


    });

});
