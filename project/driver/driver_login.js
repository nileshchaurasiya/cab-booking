/* ==========================================================================
   Indian Cabs - Driver Login & Session Script (Forces role: 'driver')
   ========================================================================== */

console.log("[Diagnostic] driver_login.js script loaded successfully!");

let authMode = 'login'; // 'login' or 'signup'
let selectedAuthRole = 'driver';

// Renders a premium custom floating toast notification
function showToast(message, type = 'error') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `flex items-center gap-3 bg-slate-900/95 backdrop-blur-xl border ${type === 'error' ? 'border-rose-500/30' : 'border-emerald-500/30'
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
    const groupVehicleModel = document.getElementById('group-vehicle-model');
    const groupVehiclePlate = document.getElementById('group-vehicle-plate');
    const groupVehicleClass = document.getElementById('group-vehicle-class');
    const btnSubmit = document.getElementById('btn-auth-submit');
    const switchDesc = document.getElementById('auth-switch-desc');
    const btnToggle = document.getElementById('btn-auth-toggle');

    if (mode === 'signup') {
        // Show all driver registration fields including required vehicle details
        if (groupName) groupName.style.display = 'block';
        if (groupNumber) groupNumber.style.display = 'block';
        if (groupVehicleModel) groupVehicleModel.style.display = 'block';
        if (groupVehiclePlate) groupVehiclePlate.style.display = 'block';
        if (groupVehicleClass) groupVehicleClass.style.display = 'block';

        btnSubmit.textContent = '✨ Register & Sign In';

        if (switchDesc) switchDesc.textContent = "Already have an account?";
        if (btnToggle) btnToggle.textContent = "Sign In";
    } else {
        // Hide registration fields
        if (groupName) groupName.style.display = 'none';
        if (groupNumber) groupNumber.style.display = 'none';
        if (groupVehicleModel) groupVehicleModel.style.display = 'none';
        if (groupVehiclePlate) groupVehiclePlate.style.display = 'none';
        if (groupVehicleClass) groupVehicleClass.style.display = 'none';
        btnSubmit.textContent = 'Sign In';

        // Clear values
        const fn = document.getElementById('auth-fullname'); if (fn) fn.value = '';
        const num = document.getElementById('auth-number'); if (num) num.value = '';
        const vm = document.getElementById('auth-vehicle-model'); if (vm) vm.value = '';
        const vp = document.getElementById('auth-vehicle-plate'); if (vp) vp.value = '';

        if (switchDesc) switchDesc.textContent = "Don't have an account?";
        if (btnToggle) btnToggle.textContent = "Register";
    }
}

// Handles form submission
async function handleLoginSubmit(event) {
    event.preventDefault();

    const emailInput = document.getElementById('auth-email').value.trim();
    const fullnameInput = document.getElementById('auth-fullname') ? document.getElementById('auth-fullname').value.trim() : '';
    const numberInput = document.getElementById('auth-number') ? document.getElementById('auth-number').value.trim() : '';
    const passwordInput = document.getElementById('auth-password').value.trim();
    const vehicleModelInput = document.getElementById('auth-vehicle-model') ? document.getElementById('auth-vehicle-model').value.trim() : '';
    const vehiclePlateInput = document.getElementById('auth-vehicle-plate') ? document.getElementById('auth-vehicle-plate').value.trim().toUpperCase() : '';
    const vehicleClassInput = document.getElementById('auth-vehicle-class') ? document.getElementById('auth-vehicle-class').value : 'Car';

    // 1. Email/Username Validation
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
        if (!fullnameInput) {
            showToast("Please enter your Full Name!");
            return;
        }
        if (!/[a-zA-Z]/.test(fullnameInput)) {
            showToast("Full Name must contain at least one letter!");
            return;
        }
        if (!numberInput) {
            showToast("Please enter your Phone Number!");
            return;
        }
        if (numberInput.length !== 10) {
            showToast("Please enter a valid 10-digit phone number!");
            return;
        }

        // Validate vehicle details
        if (!vehicleModelInput) {
            showToast("Please enter your Vehicle Model!");
            return;
        }
        if (!vehiclePlateInput) {
            showToast("Please enter your Vehicle Plate Number!");
            return;
        }

        const formattedPlate = vehiclePlateInput.replace(/[\s-]/g, '').toUpperCase();
        if (!/^[A-Z0-9]{6,12}$/.test(formattedPlate)) {
            showToast("Invalid Vehicle Plate Number! E.g. MH12AB1234");
            return;
        }

        finalVehicle = `${vehicleModelInput} - ${formattedPlate}`;
    }

    // 3. Password Validation
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

    // Save session and log in (forces role: 'driver')
    await loginSuccess(displayName, emailInput, selectedAuthRole, '', finalVehicle, vehicleModelInput, vehiclePlateInput, vehicleClassInput, authMode === 'signup');
}

async function loginSuccess(name, email, role, address = '', vehicle = '', vehicleModel = '', vehiclePlate = '', cabClass = 'Car', isSignup = false) {
    try {
        if (isSignup) {
            const db = Backend.getDb();
            const emailLower = email.trim().toLowerCase();
            if (db.drivers.some(d => d.email.toLowerCase() === emailLower)) {
                throw new Error("Driver account with this email already exists!");
            }
            const newDriver = new Driver({
                name,
                email: emailLower,
                address: address || 'Surat, Gujarat',
                vehicle,
                vehicleModel,
                vehiclePlate,
                cabClass,
                justSignedUp: false,
                online: false
            });
            db.drivers.push(newDriver);
            Backend.saveDb(db);
        }
        
        const user = await Backend.login(email, 'default_password', 'driver');

        // Check that driver has complete vehicle details
        if (!user.vehicle && !user.vehicleModel && !user.vehiclePlate) {
            Backend.logout('driver');
            throw new Error("Access denied. You cannot log in without registered vehicle details. Please register your vehicle first.");
        }

        window.location.href = 'driver.html';
    } catch (e) {
        showToast(e.message);
    }
}

// On page load, check for active session with vehicle details
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = Backend.getCurrentDriver();
    if (savedUser) {
        if (savedUser.vehicle || savedUser.vehicleModel || savedUser.vehiclePlate) {
            window.location.href = 'driver.html';
        } else {
            Backend.logout('driver');
        }
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
