/* ==========================================================================
   Indian Cabs - Login & Session Script (Tab Toggled Login / Sign Up with Custom UI Toasts)
   ========================================================================== */

console.log("[Diagnostic] login.js script loaded successfully!");

let authMode = 'login'; // 'login' or 'signup'
let selectedAuthRole = 'customer';

// Renders a premium custom floating toast notification instead of browser alerts
function showToast(message, type = 'error') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Create Toast Element
    const toast = document.createElement('div');
    toast.className = `flex items-center gap-3 bg-slate-900/95 backdrop-blur-xl border ${type === 'error' ? 'border-rose-500/30' : 'border-emerald-500/30'
        } px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto transition-all duration-300 transform translate-x-20 opacity-0 max-w-sm`;

    // Premium glowing vector icons
    const icon = type === 'error'
        ? `<svg class="w-5 h-5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`
        : `<svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

    toast.innerHTML = `
        ${icon}
        <div class="text-xs font-semibold ${type === 'error' ? 'text-rose-200' : 'text-emerald-200'}">${message}</div>
    `;

    container.appendChild(toast);

    // Slide in
    setTimeout(() => {
        toast.classList.remove('translate-x-20', 'opacity-0');
    }, 50);

    // Slide out and remove
    setTimeout(() => {
        toast.classList.add('translate-x-20', 'opacity-0');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

// Handles clicking the dynamic switch link below the submit button
function handleAuthToggleClick() {
    if (authMode === 'login') {
        toggleAuthMode('signup');
    } else {
        toggleAuthMode('login');
    }
}

// Switches between Sign In and Login Page views dynamically
function toggleAuthMode(mode) {
    authMode = mode;

    const groupName = document.getElementById('group-fullname');
    const groupNumber = document.getElementById('group-number');
    const groupAddress = document.getElementById('group-address');
    const btnSubmit = document.getElementById('btn-auth-submit');
    const switchDesc = document.getElementById('auth-switch-desc');
    const btnToggle = document.getElementById('btn-auth-toggle');

    if (mode === 'signup') {
        // Show registration fields
        groupName.style.display = 'block';
        groupNumber.style.display = 'block';
        groupAddress.style.display = 'block';

        btnSubmit.textContent = '✨ Register & Sign In';

        if (switchDesc) switchDesc.textContent = "Already have an account?";
        if (btnToggle) btnToggle.textContent = "Sign Up";
    } else {
        // Hide registration fields
        groupName.style.display = 'none';
        groupNumber.style.display = 'none';
        groupAddress.style.display = 'none';
        btnSubmit.textContent = 'Sign In';

        // Clear values
        document.getElementById('auth-fullname').value = '';
        document.getElementById('auth-number').value = '';
        document.getElementById('auth-address').value = '';

        if (switchDesc) switchDesc.textContent = "Don't have an account?";
        if (btnToggle) btnToggle.textContent = "Register";
    }
}

// Handles form submission
function handleLoginSubmit(event) {
    event.preventDefault();

    const emailInput = document.getElementById('auth-email').value.trim();
    const fullnameInput = document.getElementById('auth-fullname').value.trim();
    const numberInput = document.getElementById('auth-number').value.trim();
    const addressInput = document.getElementById('auth-address').value.trim();
    const passwordInput = document.getElementById('auth-password').value.trim();

    // 1. Email/Username Validation (Required for both)
    if (!emailInput) {
        showToast("Please enter your Email or Username!");
        return;
    }
    if (!/[a-zA-Z]/.test(emailInput)) {
        showToast("Email or Username must contain at least one letter!");
        return;
    }

    let finalVehicle = "";

    // 2. Signup Mode Specific Validation
    if (authMode === 'signup') {
        const isDriver = emailInput.toLowerCase().includes('driver');
        if (isDriver) {
            console.log("[Driver Signup via Main Page] Starting validation with values:", {
                email: emailInput,
                fullname: fullnameInput,
                phone: numberInput,
                address: addressInput
            });
        }

        if (!fullnameInput) {
            if (isDriver) console.warn("[Driver Signup via Main Page] Missing Full Name");
            showToast("Please enter your Full Name!");
            return;
        }
        if (!/[a-zA-Z]/.test(fullnameInput)) {
            if (isDriver) console.warn("[Driver Signup via Main Page] Full Name must contain at least one letter");
            showToast("Full Name must contain at least one letter!");
            return;
        }
        if (!numberInput) {
            if (isDriver) console.warn("[Driver Signup via Main Page] Missing Phone Number");
            showToast("Please enter your Phone Number!");
            return;
        }
        if (numberInput.length !== 10) {
            if (isDriver) console.warn("[Driver Signup via Main Page] Phone Number is not 10 digits");
            showToast("Please enter a valid 10-digit number!");
            return;
        }
        if (!addressInput) {
            if (isDriver) console.warn("[Driver Signup via Main Page] Missing Address");
            showToast("Please enter your Address!");
            return;
        }
    }

    // 3. Password Validation (Required for both)
    if (!passwordInput) {
        showToast("Please enter your Password!");
        return;
    }
    if (passwordInput.length < 8) {
        showToast("Password must be at least 8 characters long!");
        return;
    }

    // Generate displayName
    let displayName = "";
    if (authMode === 'signup' && fullnameInput) {
        displayName = fullnameInput;
    } else {
        const prefix = emailInput.split('@')[0];
        displayName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }

    if (authMode === 'signup' && emailInput.toLowerCase().includes('driver')) {
        console.log("[Driver Signup via Main Page] Signup inputs successfully validated. Display name:", displayName);
    }

    // Save session and log in (redirects automatically)
    loginSuccess(displayName, emailInput, selectedAuthRole, addressInput, '', authMode === 'signup');
}

function loginSuccess(name, email, role, address = '', vehicle = '', isSignup = false) {
    // Check if roles are encoded in the email/username to support testing other panels
    let resolvedRole = role;
    if (email.toLowerCase().includes('driver')) {
        resolvedRole = 'driver';
    } else if (email.toLowerCase().includes('admin')) {
        resolvedRole = 'admin';
    }

    try {
        if (isSignup) {
            Backend.register(name, email, resolvedRole, 'default_password', address, vehicle);
        }
        
        const user = Backend.login(email, 'default_password', resolvedRole);

        if (resolvedRole === 'customer') {
            window.location.href = 'customer.html';
        } else if (resolvedRole === 'driver') {
            window.location.href = '../driver/driver.html';
        } else if (resolvedRole === 'admin') {
            window.location.href = '../admin/admin.html';
        }
    } catch (e) {
        showToast(e.message);
    }
}

// On page load, check for active session & add email input listener
document.addEventListener('DOMContentLoaded', () => {
    const savedCustomer = Backend.getCurrentCustomer();
    if (savedCustomer) {
        window.location.href = 'customer.html';
        return;
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
