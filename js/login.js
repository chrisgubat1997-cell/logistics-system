document.addEventListener("DOMContentLoaded", function () {

```
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

if (!loginForm) {
    console.error("loginForm not found");
    return;
}

loginForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const username =
        document.getElementById("username").value.trim();

    const password =
        document.getElementById("password").value;

    loginMessage.textContent = "Naglo-login...";
    loginMessage.style.color = "#2563eb";


    /* =========================================
       GET SAVED ACCOUNT
    ========================================= */

    const savedUser =
        localStorage.getItem("logitechUser");


    if (!savedUser) {

        loginMessage.textContent =
            "No registered account found.";

        loginMessage.style.color = "red";

        return;
    }


    /* =========================================
       READ ACCOUNT
    ========================================= */

    let user;

    try {

        user = JSON.parse(savedUser);

    } catch (error) {

        loginMessage.textContent =
            "Account data error.";

        loginMessage.style.color = "red";

        console.error(error);

        return;
    }


    /* =========================================
       CHECK USERNAME AND PASSWORD
    ========================================= */

    if (
        username === user.username &&
        password === user.password
    ) {

        loginMessage.textContent =
            "Login successful!";

        loginMessage.style.color = "green";


        /* SAVE LOGIN STATUS */

        localStorage.setItem(
            "logitechLoggedIn",
            "true"
        );


        /* =====================================
           GO TO MAIN SYSTEM
        ===================================== */

        setTimeout(function () {

            window.location.href =
                "index.html";

        }, 500);

    }

    else {

        loginMessage.textContent =
            "Invalid username or password.";

        loginMessage.style.color = "red";

    }

});
```

});
