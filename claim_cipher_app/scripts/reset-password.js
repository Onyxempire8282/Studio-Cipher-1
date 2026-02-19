document.addEventListener('DOMContentLoaded', async function() {
    const statusEl = document.getElementById('reset-status');
    const form = document.getElementById('reset-password-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    function setStatus(message, type = 'info') {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.classList.toggle('is-error', type === 'error');
        statusEl.classList.toggle('is-success', type === 'success');
    }

    function validatePassword(password) {
        if (!password || password.length < 8) {
            return 'Password must be at least 8 characters.';
        }
        if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            return 'Password must include a letter and a number.';
        }
        return '';
    }

    const client = window.SupabaseAuth?.init?.();
    if (!client) {
        setStatus('Password reset is unavailable. Please contact support.', 'error');
        document.body.style.visibility = 'visible';
        if (form) {
            form.style.display = 'none';
        }
        return;
    }

    let hasRecoverySession = false;
    const { data: sessionData } = await client.auth.getSession();
    if (sessionData?.session) {
        hasRecoverySession = true;
    }

    if (!hasRecoverySession) {
        setStatus('Reset link is invalid or expired.', 'error');
        if (form) {
            form.style.display = 'none';
        }
    }

    document.body.style.visibility = 'visible';

    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const newPassword = newPasswordInput?.value || '';
            const confirmPassword = confirmPasswordInput?.value || '';
            const validationError = validatePassword(newPassword);

            if (validationError) {
                setStatus(validationError, 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                setStatus('Passwords do not match.', 'error');
                return;
            }

            const { error } = await client.auth.updateUser({ password: newPassword });

            if (error) {
                console.warn('Reset password error:', error.message);
                setStatus('Reset link is invalid or expired.', 'error');
                return;
            }

            setStatus('Password updated. Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = 'claim_cipher_app/login-cypher.html';
            }, 1500);
        });
    }
});
