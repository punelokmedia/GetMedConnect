const toggleButton = document.querySelector('.toggle-password');
const passwordInput = document.querySelector('.password-input');

if (toggleButton && passwordInput) {
  toggleButton.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    toggleButton.textContent = isPassword ? 'Hide' : 'Show';
    toggleButton.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  });
}

const loginForm = document.querySelector('.login-form');
if (loginForm) {
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const button = loginForm.querySelector('.primary-button');
    if (!button) return;

    const originalText = button.textContent;
    button.textContent = 'Logging in...';
    button.disabled = true;

    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 1200);
  });
}
