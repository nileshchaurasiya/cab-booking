/* ==========================================================================
   Indian Cabs - Centralized Mock Backend & Database Service
   ========================================================================== */

console.log("[Diagnostic] mock-backend.js loaded successfully!");

// --- MODEL CLASSES ---

class Customer {
    constructor({ name, email, address = 'Surat, Gujarat', wallet = 2000.00, justSignedUp = false, tripsHistory = [], walletHistory = [] }) {
        this.name = name;
        this.email = email;
        this.role = 'customer';
        this.address = address;
        this.wallet = parseFloat(wallet);
        this.justSignedUp = !!justSignedUp;
        this.tripsHistory = tripsHistory || [];
        this.walletHistory = walletHistory || [];
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
        this.earnings = parseFloat(earnings || 0);
        this.tripsCount = parseInt(tripsCount || 0);
        this.tripsHistory = tripsHistory || [];
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
        let seedAdminEarnings = oldAdminEarnings ? parseFloat(oldAdminEarnings) : 0;
        let seedDriverEarnings = oldDriverEarnings ? parseFloat(oldDriverEarnings) : 0;
        let seedDriverTripsCount = oldDriverTripsCount ? parseInt(oldDriverTripsCount) : 0;

        let seedTripsHistory = [];
        if (oldTripsHistory) {
            try {
                seedTripsHistory = JSON.parse(oldTripsHistory);
            } catch (e) { }
        }

        let customerEmail = "rahul";
        if (oldCustomerSession) {
            try {
                customerEmail = JSON.parse(oldCustomerSession).email || "rahul";
            } catch (e) { }
        }

        let driverEmail = "rahul";
        let driverVehicle = "GJ05NW3945";
        let driverVehicleModel = "swift";
        let driverVehiclePlate = "GJ05NW3945";
        let driverCabClass = "Car";
        if (oldDriverSession) {
            try {
                const s = JSON.parse(oldDriverSession);
                driverEmail = s.email || "rahul";
                driverVehicle = s.vehicle || "GJ05NW3945";
                driverVehicleModel = s.vehicleModel || "swift";
                driverVehiclePlate = s.vehiclePlate || "GJ05NW3945";
                driverCabClass = s.cabClass || "Car";
                if (driverCabClass === 'Splendor') driverCabClass = 'Car';
                if (driverCabClass === 'SUV') driverCabClass = 'Auto Rickshaw';
                if (driverCabClass === 'Defender') driverCabClass = 'Bike';
            } catch (e) { }
        }

        const defaultCustomer = new Customer({
            name: "Rahul",
            email: customerEmail,
            address: "Surat, Gujarat",
            wallet: seedWallet,
            justSignedUp: false,
            tripsHistory: [],
            walletHistory: [
                {
                    id: 'tx_seed_1',
                    type: 'recharge',
                    amount: seedWallet,
                    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                    timestamp: Date.now(),
                    description: 'Initial Wallet Balance Seeding'
                }
            ]
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
            } catch (e) { }
        }

        const initialState = {
            customers: [defaultCustomer],
            drivers: [defaultDriver],
            admins: [defaultAdmin],
            bookings: [],
            adminEarnings: seedAdminEarnings,
            activeBookings: []
        };

        localStorage.setItem(this.DB_KEY, JSON.stringify(initialState));
    }

    // Reads full DB and maps structures back to instantiated objects
    getDb() {
        this.init();
        const data = JSON.parse(localStorage.getItem(this.DB_KEY));

        // Track if any migration happened so we can persist it
        let migrated = false;

        // Map arrays to class instances
        data.customers = data.customers.map(c => new Customer(c));
        data.drivers = data.drivers.map(d => {
            if (d.cabClass === 'Splendor') { d.cabClass = 'Car'; migrated = true; }
            if (d.cabClass === 'SUV') { d.cabClass = 'Auto Rickshaw'; migrated = true; }
            if (d.cabClass === 'Defender') { d.cabClass = 'Bike'; migrated = true; }
            return new Driver(d);
        });
        data.admins = data.admins.map(a => new Admin(a));

        // Migrate single activeBooking to activeBookings array
        if (data.activeBooking) {
            data.activeBookings = [data.activeBooking];
            delete data.activeBooking;
            migrated = true;
        }

        if (!data.activeBookings) {
            data.activeBookings = [];
            migrated = true;
        }

        data.activeBookings = data.activeBookings.map(b => {
            if (b.cabClass === 'Splendor') { b.cabClass = 'Car'; migrated = true; }
            if (b.cabClass === 'SUV') { b.cabClass = 'Auto Rickshaw'; migrated = true; }
            if (b.cabClass === 'Defender') { b.cabClass = 'Bike'; migrated = true; }
            return new Booking(b);
        });

        // Persist migrated cab class names so old values don't keep coming back
        if (migrated) {
            localStorage.setItem(this.DB_KEY, JSON.stringify(data));
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
            let cabClass = 'Car';
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
            const currentDriver = this.getCurrentDriver();
            if (currentDriver) {
                const db = this.getDb();
                const driver = db.drivers.find(d => d.email.toLowerCase() === currentDriver.email.toLowerCase());
                if (driver) {
                    driver.online = false;
                    
                    // Re-assign/reset active bookings if they were assigned to or accepted by this logging-out driver
                    if (db.activeBookings) {
                        db.activeBookings.forEach(active => {
                            const isAssigned = active.assignedDriverEmail && active.assignedDriverEmail.toLowerCase() === driver.email.toLowerCase();
                            const isAccepted = active.driverPlate && driver.vehiclePlate && 
                                active.driverPlate.toLowerCase() === driver.vehiclePlate.toLowerCase();
                            
                            if (isAssigned || isAccepted) {
                                active.assignedDriverEmail = null;
                                if (active.status === 'accepted' || active.status === 'started') {
                                    active.status = 'pending';
                                    active.driverName = null;
                                    active.driverVehicle = null;
                                    active.driverPlate = null;
                                }
                                this.assignNextDriver(db, active);
                            }
                        });
                    }
                    this.saveDb(db);
                }
            }
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
        } catch (e) {
            return null;
        }
    }

    rechargeWallet(email, amount) {
        const db = this.getDb();
        const customer = db.customers.find(c => c.email.toLowerCase() === email.toLowerCase());
        if (!customer) throw new Error("Customer not found!");

        const WALLET_MAX = 2000;
        const newBalance = customer.wallet + parseFloat(amount);
        if (newBalance > WALLET_MAX) {
            const maxAllowed = WALLET_MAX - customer.wallet;
            const formattedMax = maxAllowed % 1 === 0 ? maxAllowed : maxAllowed.toFixed(2);
            throw new Error(`You can only add ${formattedMax} rupees.`);
        }

        customer.wallet = newBalance;

        if (!customer.walletHistory) customer.walletHistory = [];
        customer.walletHistory.unshift({
            id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            type: 'recharge',
            amount: parseFloat(amount),
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            timestamp: Date.now(),
            description: 'Recharged Wallet'
        });

        // Sync current active customer session if it's this customer
        const currentCustomer = this.getCurrentCustomer();
        if (currentCustomer && currentCustomer.email.toLowerCase() === customer.email.toLowerCase()) {
            currentCustomer.wallet = customer.wallet;
            currentCustomer.walletHistory = customer.walletHistory;
            localStorage.setItem('indiancabs_user_customer', JSON.stringify(currentCustomer));
        }

        this.saveDb(db);
        return customer.wallet;
    }

    deleteDriver(email) {
        const db = this.getDb();
        const index = db.drivers.findIndex(d => d.email.toLowerCase() === email.toLowerCase());
        if (index !== -1) {
            const driverToDelete = db.drivers[index];
            db.drivers.splice(index, 1);
            
            // Re-assign/reset active bookings if they were assigned to or accepted by this deleted driver
            if (db.activeBookings) {
                db.activeBookings.forEach(active => {
                    const isAssigned = active.assignedDriverEmail && active.assignedDriverEmail.toLowerCase() === email.toLowerCase();
                    const isAccepted = active.driverPlate && driverToDelete.vehiclePlate && 
                        active.driverPlate.toLowerCase() === driverToDelete.vehiclePlate.toLowerCase();
                    
                    if (isAssigned || isAccepted) {
                        active.assignedDriverEmail = null;
                        if (active.status === 'accepted' || active.status === 'started') {
                            active.status = 'pending';
                            active.driverName = null;
                            active.driverVehicle = null;
                            active.driverPlate = null;
                        }
                        this.assignNextDriver(db, active);
                    }
                });
            }
            this.saveDb(db);
            return true;
        }
        return false;
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
            // If driver was deleted from DB, clear session and log out
            localStorage.removeItem('indiancabs_user_driver');
            return null;
        } catch (e) {
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

    // Helper: assigns the booking to the next eligible online driver (not in declinedBy)
    assignNextDriver(db, booking) {
        if (!booking) return;

        const declinedList = booking.declinedBy || [];

        // Find the next eligible online driver who hasn't declined and is not currently on an active booking (accepted or started)
        let eligibleDriver = db.drivers.find(d =>
            d.online === true &&
            d.cabClass === booking.cabClass &&
            !declinedList.includes(d.email) &&
            !db.activeBookings.some(b => 
                b.id !== booking.id && 
                (b.status === 'accepted' || b.status === 'started') &&
                (b.assignedDriverEmail === d.email || (b.driverPlate && d.vehiclePlate && b.driverPlate.toLowerCase() === d.vehiclePlate.toLowerCase()))
            )
        );

        if (!eligibleDriver && declinedList.length > 0) {
            // No new driver is available, all online drivers of this category have declined!
            // Wait 10 seconds since the last decline before clearing declinedBy and retrying
            const timeSinceDecline = Date.now() - (booking.declinedAt || 0);
            if (timeSinceDecline >= 10000) {
                // 10 seconds passed! Clear the decline list and retry finding eligible drivers
                booking.declinedBy = [];
                eligibleDriver = db.drivers.find(d =>
                    d.online === true &&
                    d.cabClass === booking.cabClass &&
                    !db.activeBookings.some(b => 
                        b.id !== booking.id && 
                        (b.status === 'accepted' || b.status === 'started') &&
                        (b.assignedDriverEmail === d.email || (b.driverPlate && d.vehiclePlate && b.driverPlate.toLowerCase() === d.vehiclePlate.toLowerCase()))
                    )
                );
            }
        }

        if (eligibleDriver) {
            booking.assignedDriverEmail = eligibleDriver.email;
        } else {
            // Keep assignedDriverEmail null until 10 seconds pass to enforce the 10-second pause!
            booking.assignedDriverEmail = null;
        }
    }

    createBooking(customerName, customerEmail, pickup, dropoff, distance, fare, cabClass) {
        const db = this.getDb();

        // Check if there is at least one online driver for the selected cabClass
        const hasOnlineDriver = db.drivers.some(d => d.online === true && d.cabClass === cabClass);
        if (!hasOnlineDriver) {
            throw new Error("Driver is not available. Please change vehicle.");
        }

        // Deduct fare from customer wallet
        const customer = db.customers.find(c => c.email.toLowerCase() === customerEmail.toLowerCase());
        if (!customer) throw new Error("Customer not found!");
        if (customer.wallet < fare) throw new Error("Insufficient wallet balance!");

        customer.wallet -= parseFloat(fare);

        if (!customer.walletHistory) customer.walletHistory = [];
        customer.walletHistory.unshift({
            id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            type: 'ride_payment',
            amount: -parseFloat(fare),
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            timestamp: Date.now(),
            description: `Paid for Ride to ${dropoff}`
        });

        // Sync current active customer session if it's this customer
        const currentCustomer = this.getCurrentCustomer();
        if (currentCustomer && currentCustomer.email.toLowerCase() === customer.email.toLowerCase()) {
            currentCustomer.wallet = customer.wallet;
            currentCustomer.walletHistory = customer.walletHistory;
            localStorage.setItem('indiancabs_user_customer', JSON.stringify(currentCustomer));
        }

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

        db.activeBookings.push(booking);

        // Assign to the first available driver
        this.assignNextDriver(db, booking);

        this.saveDb(db);
        return booking;
    }

    getActiveBooking() {
        const db = this.getDb();
        
        // Return booking depending on who's asking
        const customer = this.getCurrentCustomer();
        const driver = this.getCurrentDriver();

        if (customer) {
            const booking = db.activeBookings.find(b => b.customerEmail.toLowerCase() === customer.email.toLowerCase());
            if (booking && booking.status === 'pending') {
                this.assignNextDriver(db, booking);
                this.saveDb(db);
            }
            return booking || null;
        }

        if (driver) {
            const booking = db.activeBookings.find(b => 
                b.assignedDriverEmail && b.assignedDriverEmail.toLowerCase() === driver.email.toLowerCase()
            );
            if (booking && booking.status === 'pending') {
                this.assignNextDriver(db, booking);
                this.saveDb(db);
            }
            return booking || null;
        }

        return db.activeBookings[0] || null;
    }

    getActiveBookings() {
        const db = this.getDb();
        return db.activeBookings || [];
    }

    acceptBooking(bookingId, driverEmail) {
        const db = this.getDb();
        const active = db.activeBookings.find(b => b.id === bookingId);
        if (!active) {
            throw new Error("Ride request is no longer active!");
        }

        const driver = db.drivers.find(d => d.email.toLowerCase() === driverEmail.toLowerCase());
        if (!driver) throw new Error("Driver profile not found!");

        active.status = 'accepted';
        active.driverName = driver.name;
        active.driverVehicle = driver.vehicleModel;
        active.driverPlate = driver.vehiclePlate;

        this.saveDb(db);
        return active;
    }

    startBooking(bookingId) {
        const db = this.getDb();
        const active = db.activeBookings.find(b => b.id === bookingId);
        if (!active) {
            throw new Error("Active booking not found!");
        }

        active.status = 'started';
        this.saveDb(db);
        return active;
    }

    cancelActiveBooking(bookingId, triggeredByRole = 'customer') {
        const db = this.getDb();
        const activeIndex = db.activeBookings.findIndex(b => b.id === bookingId);
        if (activeIndex === -1) {
            return;
        }
        const active = db.activeBookings[activeIndex];

        if (triggeredByRole === 'driver') {
            const driver = this.getCurrentDriver();
            const currentStatus = active.status;

            if (!active.declinedBy) active.declinedBy = [];
            if (driver) active.declinedBy.push(driver.email);
            active.declinedAt = Date.now();

            if (currentStatus === 'accepted') {
                // Driver accepted but is now cancelling — reset to pending
                active.status = 'pending';
                active.driverName = null;
                active.driverVehicle = null;
                active.driverPlate = null;
            }

            // Route to the next available driver
            this.assignNextDriver(db, active);
            this.saveDb(db);
            return;
        }

        active.status = 'cancelled';

        // Refund customer if trip was cancelled before start
        const refundAmount = active.fare;
        const customer = db.customers.find(c => c.email.toLowerCase() === active.customerEmail.toLowerCase());
        if (customer) {
            customer.wallet += refundAmount;
            if (!customer.tripsHistory) customer.tripsHistory = [];
            customer.tripsHistory.unshift({
                pickup: active.pickup,
                dropoff: active.dropoff,
                driver: active.driverName || "N/A",
                fare: active.fare,
                status: "Cancelled",
                timestamp: Date.now()
            });

            if (!customer.walletHistory) customer.walletHistory = [];
            customer.walletHistory.unshift({
                id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                type: 'refund',
                amount: parseFloat(refundAmount),
                date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                timestamp: Date.now(),
                description: `Refund for Cancelled Ride`
            });

            // Sync current active customer session if it's this customer
            const currentCustomer = this.getCurrentCustomer();
            if (currentCustomer && currentCustomer.email.toLowerCase() === customer.email.toLowerCase()) {
                currentCustomer.wallet = customer.wallet;
                currentCustomer.tripsHistory = customer.tripsHistory;
                currentCustomer.walletHistory = customer.walletHistory;
                localStorage.setItem('indiancabs_user_customer', JSON.stringify(currentCustomer));
            }
        }

        // Add to driver trips history if driver accepted the ride
        if (active.driverName || active.driverPlate) {
            const driver = db.drivers.find(d => d.name === active.driverName || (active.driverPlate && d.vehiclePlate === active.driverPlate));
            if (driver) {
                if (!driver.tripsHistory) driver.tripsHistory = [];
                driver.tripsHistory.unshift({
                    pickup: active.pickup,
                    dropoff: active.dropoff,
                    customer: active.customerName,
                    fare: 0.00,
                    status: "Cancelled",
                    timestamp: Date.now()
                });

                // Sync current active driver session if it's this driver
                const currentDriver = this.getCurrentDriver();
                if (currentDriver && currentDriver.email.toLowerCase() === driver.email.toLowerCase()) {
                    currentDriver.tripsHistory = driver.tripsHistory;
                    localStorage.setItem('indiancabs_user_driver', JSON.stringify(currentDriver));
                }
            }
        }

        // Add to historical archive
        db.bookings.unshift(active);

        // Remove from active bookings list
        db.activeBookings.splice(activeIndex, 1);

        this.saveDb(db);
    }

    completeActiveBooking(bookingId) {
        const db = this.getDb();
        const activeIndex = db.activeBookings.findIndex(b => b.id === bookingId);
        if (activeIndex === -1) {
            throw new Error("Booking not found!");
        }

        const booking = db.activeBookings[activeIndex];
        booking.status = 'completed';

        // Calculate shares
        const totalFare = booking.fare;
        const driverShare = totalFare * 0.90;
        const adminShare = totalFare * 0.10;

        // Find driver (look up by current session email first for accuracy, then fallback)
        const currentDriverSession = this.getCurrentDriver();
        let matchedDriver = null;
        if (currentDriverSession) {
            matchedDriver = db.drivers.find(d => d.email.toLowerCase() === currentDriverSession.email.toLowerCase());
        }
        if (!matchedDriver) {
            matchedDriver = db.drivers.find(d => d.name === booking.driverName || (booking.driverPlate && d.vehiclePlate === booking.driverPlate));
        }

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

        // Add to customer trips history
        const matchedCustomer = db.customers.find(c => c.email.toLowerCase() === booking.customerEmail.toLowerCase());
        if (matchedCustomer) {
            if (!matchedCustomer.tripsHistory) matchedCustomer.tripsHistory = [];
            matchedCustomer.tripsHistory.unshift({
                pickup: booking.pickup,
                dropoff: booking.dropoff,
                driver: booking.driverName || "N/A",
                fare: booking.fare,
                status: "Completed",
                timestamp: Date.now()
            });

            // Sync current active customer session if it's this customer
            const currentCustomer = this.getCurrentCustomer();
            if (currentCustomer && currentCustomer.email.toLowerCase() === matchedCustomer.email.toLowerCase()) {
                currentCustomer.tripsHistory = matchedCustomer.tripsHistory;
                localStorage.setItem('indiancabs_user_customer', JSON.stringify(currentCustomer));
            }
        }

        // Admin share
        db.adminEarnings += adminShare;

        // Add to global bookings history
        db.bookings.unshift(booking);

        // Remove from active bookings list
        db.activeBookings.splice(activeIndex, 1);

        this.saveDb(db);
        return booking;
    }

    clearActiveBooking(bookingId) {
        const db = this.getDb();
        if (bookingId) {
            db.activeBookings = db.activeBookings.filter(b => b.id !== bookingId);
        } else {
            const customer = this.getCurrentCustomer();
            if (customer) {
                db.activeBookings = db.activeBookings.filter(b => b.customerEmail.toLowerCase() !== customer.email.toLowerCase());
            }
        }
        this.saveDb(db);
    }

    getAllBookings() {
        const db = this.getDb();
        let all = [...db.bookings];
        if (db.activeBookings && db.activeBookings.length > 0) {
            all = [...db.activeBookings, ...all];
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
    // Set class on body just in case
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

    // Unified sizing, padding, transition and shape to match other header action buttons (e.g. Wallet button)
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

// Initialize theme immediately
window.initTheme();

// Helper to get display names for cab classes
window.getCabCategoryDisplayName = function (cabClass) {
    if (cabClass === 'Splendor') return 'Car';
    if (cabClass === 'SUV') return 'SUV';
    if (cabClass === 'Defender') return 'Defender';
    return cabClass;
};
