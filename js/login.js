document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginMessage = document.getElementById('loginMessage');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (username === "" || password === "") {
            loginMessage.style.color = "#d9534f";
            loginMessage.textContent = "Pakilagay ang username at password.";
            return;
        }

        loginMessage.style.color = "#28a745";
        loginMessage.textContent = "Naglo-login...";

        console.log("Logging in with:", { username, password });
    });
});
