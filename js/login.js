document.addEventListener("DOMContentLoaded", function () {

```
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

if (!loginForm) {
    console.error("loginForm not found!");
    return;
}

loginForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const username = document
        .getElementById("username")
        .value
        .trim();

    const password = document
        .getElementById("password")
        .value;


    /* GET SAVED ACCOUNT */

    const savedUser =
        localStorage.getItem("logitechUser");


    if (!savedUser) {

        loginMessage.textContent =
            "No registered account found.";

        loginMessage.style.color = "red";

        return;
    }


    /* READ ACCOUNT */

    let user;

    try {

        user = JSON.parse(savedUser);

    } catch (error) {

        console.error(error);

        loginMessage.textContent =
            "Account data error.";

        loginMessage.style.color = "red";

        return;
    }


    /* CHECK USERNAME AND PASSWORD */

    if (
        username === user.username &&
        password === user.password
    ) {

        /* SAVE LOGIN SESSION */

        localStorage.setItem(
            "logitechLoggedIn",
            "true"
        );


        /* SUCCESS */

        loginMessage.textContent =
            "Login successful!";

        loginMessage.style.color =
            "green";


        /* REDIRECT */

        setTimeout(function () {

            window.location.replace(
                "index.html"
            );

        }, 500);


        return;

    }


    /* INVALID LOGIN */

    loginMessage.textContent =
        "Invalid username or password.";

    loginMessage.style.color =
        "red";

});
```

});
