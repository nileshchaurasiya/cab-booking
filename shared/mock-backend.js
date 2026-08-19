const API_URL = 'http://localhost:5050/api';

class MockBackendService {
    constructor() {
        // No local initialization needed since DB is remote
    }

    async register(name, email, role, password, address = '', vehicle = '', cabClass = '') {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, role, password, address, vehicle, cabClass })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Registration failed');
        return data;
    }

    async login(email, password, preferredRole = 'customer') {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, preferredRole })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Login failed');

        // Save session locally
        if (data.role === 'customer') {
            localStorage.setItem('indiancabs_user_customer', JSON.stringify(data));
        } else if (data.role === 'driver') {
            localStorage.setItem('indiancabs_user_driver', JSON.stringify(data));
        } else if (data.role === 'admin') {
            localStorage.setItem('indiancabs_user_admin', JSON.stringify(data));
        }
        return data;
    }

    logout(role) {
        if (role === 'customer') {
            localStorage.removeItem('indiancabs_user_customer');
        } else if (role === 'driver') {
            localStorage.removeItem('indiancabs_user_driver');
            localStorage.removeItem('indiancabs_driver_online');
        } else if (role === 'admin') {
            localStorage.removeItem('indiancabs_user_admin');
        }
    }

    getCurrentCustomer() {
        const sessionStr = localStorage.getItem('indiancabs_user_customer');
        if (!sessionStr) return null;
        try {
            return JSON.parse(sessionStr);
        } catch (e) {
            return null;
        }
    }

    getCurrentDriver() {
        const sessionStr = localStorage.getItem('indiancabs_user_driver');
        if (!sessionStr) return null;
        try {
            return JSON.parse(sessionStr);
        } catch (e) {
            return null;
        }
    }

    async rechargeWallet(email, amount) {
        const response = await fetch(`${API_URL}/wallet/recharge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, amount })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Recharge failed');

        // Update local session
        const currentCustomer = this.getCurrentCustomer();
        if (currentCustomer && currentCustomer.email.toLowerCase() === email.toLowerCase()) {
            currentCustomer.wallet = data.wallet;
            currentCustomer.walletHistory = data.walletHistory;
            localStorage.setItem('indiancabs_user_customer', JSON.stringify(currentCustomer));
        }
        return data.wallet;
    }

    async deleteDriver(email) {
        const response = await fetch(`${API_URL}/driver/${email}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Deletion failed');
        return true;
    }

    async updateDriverVehicle(email, model, plate, cabClass) {
        const response = await fetch(`${API_URL}/driver/vehicle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, model, plate, cabClass })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Vehicle update failed');

        // Update driver session
        const session = this.getCurrentDriver();
        if (session && session.email.toLowerCase() === email.toLowerCase()) {
            localStorage.setItem('indiancabs_user_driver', JSON.stringify(data));
        }
        return data;
    }

    async updateDriverOnlineStatus(email, online) {
        const response = await fetch(`${API_URL}/driver/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, online })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Status update failed');

        const session = this.getCurrentDriver();
        if (session && session.email.toLowerCase() === email.toLowerCase()) {
            session.online = data.online;
            localStorage.setItem('indiancabs_user_driver', JSON.stringify(session));
        }
    }

    async getAllDrivers() {
        const response = await fetch(`${API_URL}/driver`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch drivers');
        return data;
    }

    async createBooking(customerName, customerEmail, pickup, dropoff, distance, fare, cabClass) {
        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerName, customerEmail, pickup, dropoff, distance, fare, cabClass })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Booking creation failed');

        // Update customer wallet balance in local storage session
        const customer = this.getCurrentCustomer();
        if (customer) {
            customer.wallet -= parseFloat(fare);
            localStorage.setItem('indiancabs_user_customer', JSON.stringify(customer));
        }

        return data;
    }

    async getActiveBooking() {
        const customer = this.getCurrentCustomer();
        const driver = this.getCurrentDriver();
        let email = '';
        let role = '';

        if (customer) {
            email = customer.email;
            role = 'customer';
        } else if (driver) {
            email = driver.email;
            role = 'driver';
        }

        const response = await fetch(`${API_URL}/bookings/active?email=${email}&role=${role}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data || null;
    }

    async getActiveBookings() {
        const response = await fetch(`${API_URL}/bookings`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch active bookings');
        return data.filter(b => b.status === 'pending' || b.status === 'accepted' || b.status === 'started');
    }

    async acceptBooking(bookingId, driverEmail) {
        const response = await fetch(`${API_URL}/bookings/${bookingId}/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ driverEmail })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Accept booking failed');
        return data;
    }

    async startBooking(bookingId) {
        const response = await fetch(`${API_URL}/bookings/${bookingId}/start`, {
            method: 'POST'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Start booking failed');
        return data;
    }

    async cancelActiveBooking(bookingId, triggeredByRole = 'customer') {
        const driver = this.getCurrentDriver();
        const driverEmail = driver ? driver.email : '';
        const response = await fetch(`${API_URL}/bookings/${bookingId}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ triggeredByRole, driverEmail })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Cancel booking failed');

        // Sync local storage sessions after cancellation
        if (triggeredByRole === 'customer') {
            const customer = this.getCurrentCustomer();
            if (customer) {
                customer.wallet += data.fare;
                localStorage.setItem('indiancabs_user_customer', JSON.stringify(customer));
            }
        }
        return data;
    }

    async completeActiveBooking(bookingId) {
        const response = await fetch(`${API_URL}/bookings/${bookingId}/complete`, {
            method: 'POST'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Complete booking failed');

        // Sync driver earnings in local session
        const driver = this.getCurrentDriver();
        if (driver && data.assignedDriverEmail.toLowerCase() === driver.email.toLowerCase()) {
            driver.earnings += data.fare * 0.90;
            driver.tripsCount += 1;
            localStorage.setItem('indiancabs_user_driver', JSON.stringify(driver));
        }

        return data;
    }

    clearActiveBooking(bookingId) {
        // Handled completely by server side active booking filters
    }

    async getAllBookings() {
        const response = await fetch(`${API_URL}/bookings`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch bookings');
        return data;
    }

    async getAdminEarnings() {
        const response = await fetch(`${API_URL}/admin/earnings`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch admin earnings');
        return data.earnings;
    }

    async resetDatabase() {
        const response = await fetch(`${API_URL}/admin/reset`, { method: 'POST' });
        if (!response.ok) throw new Error('Database reset failed');
        localStorage.clear();
        window.location.reload();
    }
}

// Global Singleton Backend Instance
window.Backend = new MockBackendService();

// Theme management system remains frontend local storage based
window.initTheme = function () {
    if (typeof document === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const themeParam = urlParams.get('theme');
    if (themeParam === 'light' || themeParam === 'dark') {
        localStorage.setItem('indiancabs_theme', themeParam);
    }
    const savedTheme = localStorage.getItem('indiancabs_theme') || 'dark'; // default to dark
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    if (document.readyState !== 'loading') {
        updateThemeToggleUI(savedTheme);
    } else {
        document.addEventListener("DOMContentLoaded", () => {
            updateThemeToggleUI(savedTheme);
        });
    }
};

window.toggleTheme = function () {
    if (typeof document === 'undefined') return;
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('indiancabs_theme', newTheme);
    updateThemeToggleUI(newTheme);
};

function updateThemeToggleUI(theme) {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (!toggleBtn) return;

    toggleBtn.className = "xl:h-[40px] h-[32px] rounded-full bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center gap-1.5 transition-all duration-300 hover:bg-slate-200 dark:hover:bg-neutral-800 px-3.5 focus:outline-none cursor-pointer hover:scale-105 active:scale-95 shrink-0 shadow-sm";

    if (theme === 'dark') {
        toggleBtn.innerHTML = `
            <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m2.828 9.9a5 5 0 117.072-7.072 5 5 0 01-7.072 7.072z" />
            </svg>
            <span class="text-xs sm:text-sm font-bold text-white tracking-wide leading-none select-none">Light Mode</span>
        `;
    } else {
        toggleBtn.innerHTML = `
            <svg class="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <span class="text-xs sm:text-sm font-bold text-slate-800 tracking-wide leading-none select-none">Dark Mode</span>
        `;
    }
}

window.initTheme();

window.getCabCategoryDisplayName = function (cabClass) {
    if (cabClass === 'car') return 'Car';
    if (cabClass === 'Auto Rickshow ') return 'Auto Rickshow';
    if (cabClass === 'bike ') return 'Bike';
    return cabClass;
};
