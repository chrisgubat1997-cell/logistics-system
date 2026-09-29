document.addEventListener("DOMContentLoaded", function () {

```
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("loginMessage");

if (!loginForm) {
    console.error("loginForm not found!");
    return;
}

loginForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const username =
        document.getElementById("username").value.trim();

    const password =
        document.getElementById("password").value;

    const savedUser =
        localStorage.getItem("logitechUser");


    /* =========================================
       NO ACCOUNT
    ========================================= */

    if (!savedUser) {

        message.textContent =
            "No registered account found.";

        message.style.color = "red";

        return;
    }


    /* =========================================
       READ ACCOUNT
    ========================================= */

    let user;

    try {

        user = JSON.parse(savedUser);

    } catch (error) {

        console.error(
            "Invalid saved account:",
            error
        );

        message.textContent =
            "Invalid account data.";

        message.style.color = "red";

        return;
    }


    /* =========================================
       CHECK LOGIN
    ========================================= */

    if (
        username === user.username &&
        password === user.password
    ) {

        message.textContent =
            "Login successful!";

        message.style.color =
            "green";


        /* SAVE LOGIN SESSION */

        localStorage.setItem(
            "logitechLoggedIn",
            "true"
        );


        /* =====================================
           REDIRECT TO MAIN SYSTEM
        ===================================== */

        setTimeout(function () {

            window.location.replace(
                "./index.html"
            );

        }, 500);

    }

    else {

        message.textContent =
            "Invalid username or password.";

        message.style.color =
            "red";

    }

});
```

});
