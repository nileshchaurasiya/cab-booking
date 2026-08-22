/* ==========================================================================
   Indian Cabs - Admin Login & Session Script (Forces role: 'admin')
   ========================================================================== */

let authMode = 'login'; // 'login' or 'signup'
let selectedAuthRole = 'admin';

// Renders a premium custom floating toast notification
function showToast(message, type = 'error') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `flex items-center gap-3 bg-slate-900/95 backdrop-blur-xl border ${
        type === 'error' ? 'border-rose-500/30' : 'border-emerald-500/30'
    } px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto transition-all duration-300 transform translate-x-20 opacity-0 max-w-sm`;

    const icon = type === 'error' 
        ? `<svg class="w-5 h-5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`
        : `<svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

    toast.innerHTML = `
        ${icon}
        <div class="text-xs font-semibold ${type === 'error' ? 'text-rose-200' : 'text-emerald-200'}">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-x-20', 'opacity-0');
    }, 50);

    setTimeout(() => {
        toast.classList.add('translate-x-20', 'opacity-0');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

// Handles form submission
async function handleLoginSubmit(event) {
    event.preventDefault();

    const emailInput = document.getElementById('auth-email').value.trim();
    const passwordInput = document.getElementById('auth-password').value.trim();

    // 1. Email/Username Validation
    if (!emailInput) {
        showToast("Please enter your Email or Username!");
        return;
    }
    if (!/[a-zA-Z]/.test(emailInput)) {
        showToast("Email or Username must contain at least one letter!");
        return;
    }
    // 2. Password Validation
    if (!passwordInput) {
        showToast("Please enter your Password!");
        return;
    }
    if (passwordInput.length < 8) {
        showToast("Password must be at least 8 characters long!");
        return;
    }

    // 3. Fixed Admin Credentials Verification
    if ((emailInput !== 'admin@cabs.com' && emailInput !== 'admin') || passwordInput !== 'admin1234') {
        showToast("Invalid admin credentials! Hint: admin / admin1234");
        return;
    }

    // Generate displayName
    const prefix = emailInput.split('@')[0];
    const displayName = prefix.charAt(0).toUpperCase() + prefix.slice(1);

    // Save session and log in (forces role: 'admin')
    await loginSuccess(displayName, emailInput, selectedAuthRole, '');
}

async function loginSuccess(name, email, role, address = '') {
    try {
        await Backend.login(email, 'admin1234', 'admin');
        window.location.href = 'admin.html';
    } catch (e) {
        showToast(e.message);
    }
}

// On page load, check for active session
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('indiancabs_user_admin');
    if (savedUser) {
        window.location.href = 'admin.html';
    }
});

// Toggles password field text/password visibility dynamically
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('auth-password');
    const eyeIcon = document.getElementById('eye-icon');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.innerHTML = `
            <defs>
                <mask id="eye-mask">
                    <rect width="24" height="24" fill="white" />
                    <line x1="2" x2="22" y1="2" y2="22" stroke="black" stroke-width="4" stroke-linecap="round" />
                </mask>
            </defs>
            <g mask="url(#eye-mask)">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </g>
            <line stroke-linecap="round" stroke-linejoin="round" x1="2" x2="22" y1="2" y2="22" />
        `;
    } else {
        passwordInput.type = 'password';
        eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        `;
    }
}
