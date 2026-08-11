/* ==========================================================================
   Indian Cabs - Centralized Mock Backend & Database Service
   ========================================================================== */

console.log("[Diagnostic] mock-backend.js loaded successfully!");

// --- MODEL CLASSES ---

class Customer {
    constructor({ name, email, address = 'Surat, Gujarat', wallet = 2000.00, justSignedUp = false }) {
        this.name = name;
        this.email = email;
        this.role = 'customer';
        this.address = address;
        this.wallet = parseFloat(wallet);
        this.justSignedUp = !!justSignedUp;
    }
}

class Driver {
    constructor({ 
        name, 
        email, 
        address = 'Surat, Gujarat', 
        vehicle = '', 
        vehicleModel = '', 
        vehiclePlate = '', 
        cabClass = 'Sedan', 
        online = false, 
        earnings = 0.00, 
        tripsCount = 0, 
        tripsHistory = [],
        justSignedUp = false 
    }) {
        this.name = name;
        this.email = email;
        this.role = 'driver';
        this.address = address;
        this.vehicle = vehicle;
        this.vehicleModel = vehicleModel;
        this.vehiclePlate = vehiclePlate;
        this.cabClass = cabClass;
        this.online = online === true || online === 'true';
        this.earnings = parseFloat(earnings);
        this.tripsCount = parseInt(tripsCount);
        this.tripsHistory = tripsHistory;
        this.justSignedUp = !!justSignedUp;
    }
}

class Booking {
    constructor({
        id = 'ride_' + Date.now(),
        customerName,
        customerEmail = '',
        pickup,
        dropoff,
        distance,
        fare,
        cabClass,
        status = 'pending',
        driverName = '',
        driverVehicle = '',
        driverPlate = '',
        timestamp = Date.now()
    }) {
        this.id = id;
        this.customerName = customerName;
        this.customerEmail = customerEmail;
        this.pickup = pickup;
        this.dropoff = dropoff;
        this.distance = parseFloat(distance);
        this.fare = parseFloat(fare);
        this.cabClass = cabClass;
        this.status = status; // 'pending' | 'accepted' | 'started' | 'completed' | 'cancelled'
        this.driverName = driverName;
        this.driverVehicle = driverVehicle;
        this.driverPlate = driverPlate;
        this.timestamp = parseInt(timestamp);
    }
}

class Admin {
    constructor({ name, email, address = 'Surat, Gujarat' }) {
        this.name = name;
        this.email = email;
        this.role = 'admin';
        this.address = address;
    }
}

// --- CENTRAL MOCK BACKEND SERVICE ---

class MockBackendService {
    constructor() {
        this.DB_KEY = 'indiancabs_db';
        this.init();
        this.cleanupLegacyKeys();
    }

    cleanupLegacyKeys() {
        const legacyKeys = [
            'indiancabs_wallet',
            'indiancabs_driver_online',
            'indiancabs_driver_earnings',
            'indiancabs_admin_earnings',
            'indiancabs_driver_trips_count',
            'indiancabs_driver_trips_history',
            'indiancabs_active_booking'
        ];
        legacyKeys.forEach(k => localStorage.removeItem(k));
    }

    // Loads state from localStorage or initializes with seed data
    init() {
        let dbStr = localStorage.getItem(this.DB_KEY);
        if (dbStr) {
            try {
                // Perform quick load to check format compatibility
                JSON.parse(dbStr);
                return;
            } catch (e) {
                console.error("Corrupted database format, re-initializing", e);
            }
        }

        // Migrate from old individual localStorage keys if they exist
        const oldWallet = localStorage.getItem('indiancabs_wallet');
        const oldCustomerSession = localStorage.getItem('indiancabs_user_customer');
        const oldDriverSession = localStorage.getItem('indiancabs_user_driver');
        const oldAdminEarnings = localStorage.getItem('indiancabs_admin_earnings');
        const oldDriverEarnings = localStorage.getItem('indiancabs_driver_earnings');
        const oldDriverTripsCount = localStorage.getItem('indiancabs_driver_trips_count');
        const oldTripsHistory = localStorage.getItem('indiancabs_driver_trips_history');
        const oldActiveBooking = localStorage.getItem('indiancabs_active_booking');

        let seedWallet = oldWallet ? parseFloat(oldWallet) : 2000.00;
        let seedAdminEarnings = oldAdminEarnings ? parseFloat(oldAdminEarnings) : 510.00;
        let seedDriverEarnings = oldDriverEarnings ? parseFloat(oldDriverEarnings) : 4590.00;
        let seedDriverTripsCount = oldDriverTripsCount ? parseInt(oldDriverTripsCount) : 8;
        
        let seedTripsHistory = [];
        if (oldTripsHistory) {
            try {
                seedTripsHistory = JSON.parse(oldTripsHistory);
            } catch(e) {}
        } else {
            seedTripsHistory = [
                { pickup: "Adajan to Railway Station", dropoff: "Railway Station", customer: "Rahul Dave", fare: 120.00, timestamp: Date.now() - 3600000 },
                { pickup: "Vesu to Surat Airport", dropoff: "Surat Airport", customer: "Priya Mehta", fare: 280.00, timestamp: Date.now() - 7200000 }
            ];
        }

        let customerEmail = "rahul";
        if (oldCustomerSession) {
            try {
                customerEmail = JSON.parse(oldCustomerSession).email || "rahul";
            } catch(e) {}
        }

        let driverEmail = "rahul";
        let driverVehicle = "GJ05NW3945";
        let driverVehicleModel = "swift";
        let driverVehiclePlate = "GJ05NW3945";
        let driverCabClass = "Splendor";
        if (oldDriverSession) {
            try {
                const s = JSON.parse(oldDriverSession);
                driverEmail = s.email || "rahul";
                driverVehicle = s.vehicle || "GJ05NW3945";
                driverVehicleModel = s.vehicleModel || "swift";
                driverVehiclePlate = s.vehiclePlate || "GJ05NW3945";
                driverCabClass = s.cabClass || "Splendor";
            } catch(e) {}
        }

        const defaultCustomer = new Customer({
            name: "Rahul",
            email: customerEmail,
            address: "Surat, Gujarat",
            wallet: seedWallet,
            justSignedUp: false
        });

        const defaultDriver = new Driver({
            name: "Rahul",
            email: driverEmail,
            address: "Surat, Gujarat",
            vehicle: driverVehicle,
            vehicleModel: driverVehicleModel,
            vehiclePlate: driverVehiclePlate,
            cabClass: driverCabClass,
            online: true,
            earnings: seedDriverEarnings,
            tripsCount: seedDriverTripsCount,
            tripsHistory: seedTripsHistory,
            justSignedUp: false
        });

        const defaultAdmin = new Admin({
            name: "Admin",
            email: "admin@cabs.com",
            address: "Surat, Gujarat"
        });

        let seedActiveBooking = null;
        if (oldActiveBooking) {
            try {
                seedActiveBooking = JSON.parse(oldActiveBooking);
            } catch(e) {}
        }

        const initialState = {
            customers: [defaultCustomer],
            drivers: [defaultDriver],
            admins: [defaultAdmin],
            bookings: [],
            adminEarnings: seedAdminEarnings,
            activeBooking: seedActiveBooking
        };

        localStorage.setItem(this.DB_KEY, JSON.stringify(initialState));
    }

    // Reads full DB and maps structures back to instantiated objects
    getDb() {
        this.init();
        const data = JSON.parse(localStorage.getItem(this.DB_KEY));
        
        // Map arrays to class instances
        data.customers = data.customers.map(c => new Customer(c));
        data.drivers = data.drivers.map(d => new Driver(d));
        data.admins = data.admins.map(a => new Admin(a));
        
        if (data.activeBooking) {
            data.activeBooking = new Booking(data.activeBooking);
        }
        
        return data;
    }

    saveDb(db) {
        localStorage.setItem(this.DB_KEY, JSON.stringify(db));
    }

    // --- AUTHENTICATION ACTIONS ---

    register(name, email, role, password, address = '', vehicle = '') {
        const db = this.getDb();
        const emailLower = email.trim().toLowerCase();

        if (role === 'driver' || emailLower.includes('driver')) {
            // Check driver exist
            if (db.drivers.some(d => d.email.toLowerCase() === emailLower)) {
                throw new Error("Driver account with this email already exists!");
            }
            let vehicleModel = '';
            let vehiclePlate = '';
            let cabClass = 'Splendor';
            if (vehicle) {
                const parts = vehicle.split('-');
                vehicleModel = parts[0].trim();
                vehiclePlate = parts.length > 1 ? parts[1].trim() : vehicle;
            }

            const driver = new Driver({
                name,
                email: emailLower,
                address: address || 'Surat, Gujarat',
                vehicle,
                vehicleModel,
                vehiclePlate,
                cabClass,
                justSignedUp: true
            });
            db.drivers.push(driver);
            this.saveDb(db);
            return driver;
        } else if (role === 'admin' || emailLower.includes('admin')) {
            if (db.admins.some(a => a.email.toLowerCase() === emailLower)) {
                throw new Error("Admin account with this email already exists!");
            }
            const admin = new Admin({
                name,
                email: emailLower,
                address: address || 'Surat, Gujarat'
            });
            db.admins.push(admin);
            this.saveDb(db);
            return admin;
        } else {
            // Default: Customer
            if (db.customers.some(c => c.email.toLowerCase() === emailLower)) {
                throw new Error("Customer account with this email already exists!");
            }
            const customer = new Customer({
                name,
                email: emailLower,
                address: address || 'Surat, Gujarat',
                wallet: 2000.00,
                justSignedUp: true
            });
            db.customers.push(customer);
            this.saveDb(db);
            return customer;
        }
    }

    login(email, password, preferredRole = 'customer') {
        const db = this.getDb();
        const emailLower = email.trim().toLowerCase();

        // Admin override check
        if (emailLower === 'admin@cabs.com' || emailLower === 'admin') {
            if (password !== 'admin1234') {
                throw new Error("Invalid admin credentials!");
            }
            const admin = db.admins.find(a => a.email.toLowerCase() === 'admin@cabs.com') || db.admins[0];
            localStorage.setItem('indiancabs_user_admin', JSON.stringify(admin));
            return admin;
        }

        // Auto-resolve role based on email keyword or preferences
        let resolvedRole = preferredRole;
        if (emailLower.includes('driver')) {
            resolvedRole = 'driver';
        } else if (emailLower.includes('admin')) {
            resolvedRole = 'admin';
        }

        if (resolvedRole === 'driver') {
            let driver = db.drivers.find(d => d.email.toLowerCase() === emailLower);
            if (!driver) {
                // If not exists, auto-register for testing convenience
                driver = this.register(
                    emailLower.split('@')[0].charAt(0).toUpperCase() + emailLower.split('@')[0].slice(1),
                    emailLower,
                    'driver',
                    password
                );
            }
            localStorage.setItem('indiancabs_user_driver', JSON.stringify(driver));
            return driver;
        } else if (resolvedRole === 'admin') {
            let admin = db.admins.find(a => a.email.toLowerCase() === emailLower);
            if (!admin) {
                admin = this.register(
                    emailLower.split('@')[0].charAt(0).toUpperCase() + emailLower.split('@')[0].slice(1),
                    emailLower,
                    'admin',
                    password
                );
            }
            localStorage.setItem('indiancabs_user_admin', JSON.stringify(admin));
            return admin;
        } else {
            let customer = db.customers.find(c => c.email.toLowerCase() === emailLower);
            if (!customer) {
                customer = this.register(
                    emailLower.split('@')[0].charAt(0).toUpperCase() + emailLower.split('@')[0].slice(1),
                    emailLower,
                    'customer',
                    password
                );
            }
            localStorage.setItem('indiancabs_user_customer', JSON.stringify(customer));
            return customer;
        }
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

    // --- CUSTOMER & WALLET ACTIONS ---

    getCustomerByEmail(email) {
        const db = this.getDb();
        return db.customers.find(c => c.email.toLowerCase() === email.toLowerCase()) || null;
    }

    getCurrentCustomer() {
        const sessionStr = localStorage.getItem('indiancabs_user_customer');
        if (!sessionStr) return null;
        try {
            const session = JSON.parse(sessionStr);
            // Refresh customer data from database
            const customer = this.getCustomerByEmail(session.email);
            if (customer) {
                // Keep justSignedUp state from session
                customer.justSignedUp = session.justSignedUp;
                return customer;
            }
            return new Customer(session);
        } catch(e) {
            return null;
        }
    }

    rechargeWallet(email, amount) {
        const db = this.getDb();
        const customer = db.customers.find(c => c.email.toLowerCase() === email.toLowerCase());
        if (!customer) throw new Error("Customer not found!");
        
        customer.wallet += parseFloat(amount);
        this.saveDb(db);
        return customer.wallet;
    }

    // --- DRIVER ACTIONS ---

    getDriverByEmail(email) {
        const db = this.getDb();
        return db.drivers.find(d => d.email.toLowerCase() === email.toLowerCase()) || null;
    }

    getCurrentDriver() {
        const sessionStr = localStorage.getItem('indiancabs_user_driver');
        if (!sessionStr) return null;
        try {
            const session = JSON.parse(sessionStr);
            const driver = this.getDriverByEmail(session.email);
            if (driver) {
                driver.justSignedUp = session.justSignedUp;
                return driver;
            }
            return new Driver(session);
        } catch(e) {
            return null;
        }
    }

    updateDriverVehicle(email, model, plate, cabClass) {
        const db = this.getDb();
        const driver = db.drivers.find(d => d.email.toLowerCase() === email.toLowerCase());
        if (!driver) throw new Error("Driver not found!");

        driver.vehicleModel = model;
        driver.vehiclePlate = plate;
        driver.cabClass = cabClass;
        driver.vehicle = `${model} - ${plate}`;
        driver.justSignedUp = false; // completed setup
        
        this.saveDb(db);

        // Update driver session storage as well
        const session = this.getCurrentDriver();
        if (session && session.email.toLowerCase() === email.toLowerCase()) {
            localStorage.setItem('indiancabs_user_driver', JSON.stringify(driver));
        }
        return driver;
    }

    updateDriverOnlineStatus(email, online) {
        const db = this.getDb();
        const driver = db.drivers.find(d => d.email.toLowerCase() === email.toLowerCase());
        if (!driver) throw new Error("Driver not found!");

        driver.online = online === true || online === 'true';
        this.saveDb(db);
        
        // Sync session
        const session = this.getCurrentDriver();
        if (session && session.email.toLowerCase() === email.toLowerCase()) {
            session.online = driver.online;
            localStorage.setItem('indiancabs_user_driver', JSON.stringify(session));
        }
    }

    getAllDrivers() {
        const db = this.getDb();
        return db.drivers;
    }

    // --- BOOKING WORKFLOW ACTIONS ---

    createBooking(customerName, customerEmail, pickup, dropoff, distance, fare, cabClass) {
        const db = this.getDb();
        
        // Deduct fare from customer wallet
        const customer = db.customers.find(c => c.email.toLowerCase() === customerEmail.toLowerCase());
        if (!customer) throw new Error("Customer not found!");
        if (customer.wallet < fare) throw new Error("Insufficient wallet balance!");

        customer.wallet -= parseFloat(fare);

        const booking = new Booking({
            customerName,
            customerEmail,
            pickup,
            dropoff,
            distance,
            fare,
            cabClass,
            status: 'pending'
        });

        db.activeBooking = booking;
        this.saveDb(db);
        return booking;
    }

    getActiveBooking() {
        const db = this.getDb();
        return db.activeBooking;
    }

    acceptBooking(bookingId, driverEmail) {
        const db = this.getDb();
        if (!db.activeBooking || db.activeBooking.id !== bookingId) {
            throw new Error("Ride request is no longer active!");
        }

        const driver = db.drivers.find(d => d.email.toLowerCase() === driverEmail.toLowerCase());
        if (!driver) throw new Error("Driver profile not found!");

        db.activeBooking.status = 'accepted';
        db.activeBooking.driverName = driver.name;
        db.activeBooking.driverVehicle = driver.vehicleModel;
        db.activeBooking.driverPlate = driver.vehiclePlate;

        this.saveDb(db);
        return db.activeBooking;
    }

    startBooking(bookingId) {
        const db = this.getDb();
        if (!db.activeBooking || db.activeBooking.id !== bookingId) {
            throw new Error("Active booking not found!");
        }

        db.activeBooking.status = 'started';
        this.saveDb(db);
        return db.activeBooking;
    }

    cancelActiveBooking(bookingId, triggeredByRole = 'customer') {
        const db = this.getDb();
        if (!db.activeBooking || db.activeBooking.id !== bookingId) {
            return;
        }

        db.activeBooking.status = 'cancelled';
        
        // Refund customer if trip was cancelled before start
        const refundAmount = db.activeBooking.fare;
        const customer = db.customers.find(c => c.email.toLowerCase() === db.activeBooking.customerEmail.toLowerCase());
        if (customer) {
            customer.wallet += refundAmount;
        }

        // Add to historical archive
        db.bookings.unshift(db.activeBooking);

        this.saveDb(db);
    }

    completeActiveBooking(bookingId) {
        const db = this.getDb();
        if (!db.activeBooking || db.activeBooking.id !== bookingId) {
            throw new Error("Booking not found!");
        }

        const booking = db.activeBooking;
        booking.status = 'completed';

        // Calculate shares
        const totalFare = booking.fare;
        const driverShare = totalFare * 0.90;
        const adminShare = totalFare * 0.10;

        // Find driver
        const matchedDriver = db.drivers.find(d => d.name === booking.driverName || d.vehiclePlate === booking.driverPlate);
        if (matchedDriver) {
            matchedDriver.earnings += driverShare;
            matchedDriver.tripsCount += 1;
            
            // Add to driver trips history
            const tripRecord = {
                pickup: booking.pickup,
                dropoff: booking.dropoff,
                customer: booking.customerName,
                fare: driverShare,
                timestamp: Date.now()
            };
            matchedDriver.tripsHistory.unshift(tripRecord);
            
            // Sync current active driver session if it's this driver
            const currentDriver = this.getCurrentDriver();
            if (currentDriver && currentDriver.email.toLowerCase() === matchedDriver.email.toLowerCase()) {
                currentDriver.earnings = matchedDriver.earnings;
                currentDriver.tripsCount = matchedDriver.tripsCount;
                currentDriver.tripsHistory = matchedDriver.tripsHistory;
                localStorage.setItem('indiancabs_user_driver', JSON.stringify(currentDriver));
            }
        }

        // Admin share
        db.adminEarnings += adminShare;

        // Add to global bookings history
        db.bookings.unshift(booking);

        this.saveDb(db);
        return booking;
    }

    clearActiveBooking() {
        const db = this.getDb();
        db.activeBooking = null;
        this.saveDb(db);
    }

    getAllBookings() {
        const db = this.getDb();
        let all = [...db.bookings];
        if (db.activeBooking) {
            all.unshift(db.activeBooking);
        }
        return all;
    }

    getAdminEarnings() {
        const db = this.getDb();
        return db.adminEarnings;
    }
}

// Global Singleton Backend Instance
window.Backend = new MockBackendService();

// --- THEME MANAGEMENT SYSTEM (Tailwind Class Strategy) ---
window.initTheme = function() {
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
    // Set class on body just in case
    if (document.readyState !== 'loading') {
        updateThemeToggleUI(savedTheme);
    } else {
        document.addEventListener("DOMContentLoaded", () => {
            updateThemeToggleUI(savedTheme);
        });
    }
};

window.toggleTheme = function() {
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
    if (theme === 'dark') {
        toggleBtn.innerHTML = `
            <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m2.828 9.9a5 5 0 117.072-7.072 5 5 0 01-7.072 7.072z" />
            </svg>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Light Mode</span>
        `;
    } else {
        toggleBtn.innerHTML = `
            <svg class="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <span class="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Dark Mode</span>
        `;
    }
}

// Initialize theme immediately
window.initTheme();
