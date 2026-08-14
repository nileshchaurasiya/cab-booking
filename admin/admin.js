/* ==========================================================================
   Indian Cabs - Admin Control Center Controller Script
   ========================================================================== */

let historyFilter = 'all';

function setHistoryFilter(filter) {
    historyFilter = filter;

    // Update active button styles
    const filters = ['all', 'completed', 'cancelled'];
    filters.forEach(f => {
        const btn = document.getElementById(`filter-${f}`);
        if (!btn) return;
        if (f === filter) {
            btn.className = `text-[10px] px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                f === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' :
                f === 'cancelled' ? 'bg-rose-500 border-rose-500 text-white' :
                'bg-sky-500 border-sky-500 text-white'
            }`;
        } else {
            btn.className = 'text-[10px] px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer bg-transparent border-slate-200 dark:border-neutral-700 text-slate-500 dark:text-slate-400';
        }
    });

    syncDashboardData();
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Authenticate Admin Session
    const savedUser = localStorage.getItem('indiancabs_user_admin');
    if (!savedUser) {
        window.location.href = 'admin_login.html';
        return;
    }

    try {
        const user = JSON.parse(savedUser);
        if (user.role !== 'admin') {
            window.location.href = 'admin_login.html';
            return;
        }
        // Display admin's name
        document.getElementById('admin-name-display').textContent = user.name;
    } catch (e) {
        console.error("Session restore error", e);
        window.location.href = 'admin_login.html';
        return;
    }

    // 2. Start Real-time Data Sync Loop
    syncDashboardData();
    setInterval(syncDashboardData, 2000);
});

// Logs out admin user
function logoutUser() {
    Backend.logout('admin');
    window.location.href = 'admin_login.html';
}

// Toast notification for admin
function showToast(message, type = 'error') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `flex items-center gap-3 bg-slate-900/95 backdrop-blur-xl border ${type === 'error' ? 'border-rose-500/30' : 'border-emerald-500/30'} px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto transition-all duration-300 transform translate-x-20 opacity-0 max-w-sm text-xs font-semibold ${type === 'error' ? 'text-rose-200' : 'text-emerald-200'}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-x-20', 'opacity-0'), 50);
    setTimeout(() => {
        toast.classList.add('translate-x-20', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Open / Close Add Driver Modal
function openAddDriverModal() {
    document.getElementById('add-driver-name').value = '';
    document.getElementById('add-driver-email').value = '';
    document.getElementById('add-driver-password').value = '';
    document.getElementById('add-driver-vehicle').value = '';
    document.getElementById('add-driver-cabclass').value = 'Car';
    document.getElementById('add-driver-modal').style.display = 'flex';
}

function closeAddDriverModal() {
    document.getElementById('add-driver-modal').style.display = 'none';
}

function submitAddDriver(event) {
    event.preventDefault();
    const name     = document.getElementById('add-driver-name').value.trim();
    const email    = document.getElementById('add-driver-email').value.trim();
    const password = document.getElementById('add-driver-password').value;
    const vehicle  = document.getElementById('add-driver-vehicle').value.trim();
    const cabClass = document.getElementById('add-driver-cabclass').value;

    try {
        Backend.register(name, email, 'driver', password, 'Surat, Gujarat', vehicle);

        // Set cab class after registration
        const db = Backend.getDb();
        const driver = db.drivers.find(d => d.email.toLowerCase() === email.toLowerCase());
        if (driver) {
            driver.cabClass = cabClass;
            const parts = vehicle.split('-');
            driver.vehicleModel = parts[0].trim();
            driver.vehiclePlate = parts.length > 1 ? parts[1].trim() : vehicle;
            Backend.saveDb(db);
        }

        showToast(`Driver "${name}" registered successfully!`, 'success');
        closeAddDriverModal();
        syncDashboardData();
    } catch (e) {
        showToast(e.message);
    }
}

// Polls localStorage/Backend to dynamically sync metrics and roster states
function syncDashboardData() {
    const allDrivers = Backend.getAllDrivers().filter(d => d.online);
    const onlineDrivers = allDrivers;

    const activeBookings = Backend.getActiveBookings();
    const activeBookingsCount = activeBookings.length;

    // B. Render Stats Counters
    document.getElementById('driver-count-display').textContent = onlineDrivers.length;
    document.getElementById('customer-count-display').textContent = activeBookingsCount;

    const adminEarnings = Backend.getAdminEarnings();
    document.getElementById('admin-earnings-display').textContent = `₹${adminEarnings.toFixed(2)}`;

    // C. Render Driver Roster Table
    const driverRosterBody = document.getElementById('driver-roster-body');
    if (allDrivers.length > 0) {
        let html = '';
        allDrivers.forEach(driver => {
            let driverStatus = 'Offline';
            if (driver.online) {
                const matchingActiveBooking = activeBookings.find(b => 
                    (b.driverName === driver.name || b.driverPlate === driver.vehiclePlate) && 
                    (b.status === 'accepted' || b.status === 'started')
                );
                if (matchingActiveBooking) {
                    driverStatus = 'On Trip';
                } else {
                    driverStatus = 'Online (Idle)';
                }
            }

            let statusBadge = '';
            if (driverStatus === 'Online (Idle)') {
                statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Online</span>`;
            } else if (driverStatus === 'On Trip') {
                statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">On Trip</span>`;
            } else {
                statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-neutral-500 border border-neutral-800">Offline</span>`;
            }

            html += `
                <tr class="hover:bg-slate-50 dark:hover:bg-neutral-900/40 transition-colors">
                    <td class="py-3 pr-2">
                        <span class="font-bold text-slate-800 dark:text-white block text-xs">${driver.name}</span>
                        <span class="text-[9px] text-slate-500 dark:text-slate-400 block">${driver.email}</span>
                    </td>
                    <td class="py-3 pr-2 text-xs">
                        <span class="text-slate-600 dark:text-slate-300 block">${driver.vehicle || 'Not setup'}</span>
                    </td>
                    <td class="py-3 pr-2">${statusBadge}</td>
                    <td class="py-3 text-right">
                        <button onclick="handleDeleteDriver('${driver.email}', '${driver.name}')"
                            class="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 transition-all text-[10px] font-bold cursor-pointer">
                            🗑️ Delete
                        </button>
                    </td>
                </tr>
            `;
        });
        driverRosterBody.innerHTML = html;
    } else {
        driverRosterBody.innerHTML = `
            <tr>
                <td colspan="4" class="py-6 text-center text-slate-600">No active drivers online at the moment.</td>
            </tr>
        `;
    }

    // D. Render Active Bookings Table
    const bookingsRosterBody = document.getElementById('bookings-roster-body');
    if (activeBookings.length > 0) {
        let html = '';
        activeBookings.forEach(booking => {
            let bookingStatusBadge = '';
            if (booking.status === 'started') {
                bookingStatusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">In Route</span>`;
            } else if (booking.status === 'accepted') {
                bookingStatusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Accepted</span>`;
            } else {
                bookingStatusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">Requested</span>`;
            }

            html += `
                <tr class="hover:bg-slate-50 dark:hover:bg-neutral-900/40 transition-colors">
                    <td class="py-3 pr-2">
                        <span class="font-bold text-slate-800 dark:text-white block text-xs">${booking.customerName || 'Customer'}</span>
                        <span class="text-[9px] text-slate-500 dark:text-slate-400 block">Category: ${window.getCabCategoryDisplayName ? window.getCabCategoryDisplayName(booking.cabClass) : booking.cabClass}</span>
                    </td>
                    <td class="py-3 pr-2 text-xs">
                        <span class="text-slate-700 dark:text-slate-300 font-medium block">Pickup: ${booking.pickup}</span>
                        <span class="text-slate-500 dark:text-slate-400 block mt-0.5">Dropoff: ${booking.dropoff}</span>
                    </td>
                    <td class="py-3 pr-2 text-right font-bold text-indigo-600 dark:text-sky-400">🪙 ${booking.fare.toFixed(2)}</td>
                    <td class="py-3 pr-2 text-right">${bookingStatusBadge}</td>
                    <td class="py-3 text-right">
                        <button onclick="handleCancelActiveBooking('${booking.id}')"
                            class="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 transition-all text-[10px] font-bold cursor-pointer">
                            ❌ Cancel
                        </button>
                    </td>
                </tr>
            `;
        });
        bookingsRosterBody.innerHTML = html;
    } else {
        bookingsRosterBody.innerHTML = `
            <tr>
                <td colspan="5" class="py-6 text-center text-slate-600">No active ride requests or customer bookings.</td>
            </tr>
        `;
    }

    // E. Render Transaction & Ride History Table
    const historyRosterBody = document.getElementById('history-roster-body');
    const allBookings = Backend.getAllBookings();
    const allPastBookings = allBookings.filter(b => b.status === 'completed' || b.status === 'cancelled');
    const pastBookings = historyFilter === 'all'
        ? allPastBookings
        : allPastBookings.filter(b => b.status === historyFilter);

    if (pastBookings.length > 0 && historyRosterBody) {
        let html = '';
        pastBookings.forEach(booking => {
            let statusBadge = '';
            if (booking.status === 'completed') {
                statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Completed</span>`;
            } else {
                statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Cancelled</span>`;
            }

            const adminComm = booking.status === 'completed' ? `₹${(booking.fare * 0.10).toFixed(2)}` : '₹0.00';

            html += `
                <tr class="hover:bg-slate-50 dark:hover:bg-neutral-900/40 transition-colors border-b border-slate-100 dark:border-neutral-900 last:border-0">
                    <td class="py-3 pr-2">
                        <span class="font-bold text-slate-800 dark:text-white block text-xs">${booking.id}</span>
                        <span class="text-[9px] text-slate-500 dark:text-slate-400 block">Customer: ${booking.customerName}</span>
                    </td>
                    <td class="py-3 pr-2 text-xs">
                        <span class="text-slate-600 dark:text-slate-300 block font-medium">${booking.driverName || 'N/A'}</span>
                        <span class="text-[9px] text-slate-500 dark:text-slate-400 block">${booking.driverPlate || ''}</span>
                    </td>
                    <td class="py-3 pr-2 text-xs">
                        <span class="text-slate-700 dark:text-slate-300 font-medium block">Pickup: ${booking.pickup}</span>
                        <span class="text-slate-500 dark:text-slate-400 block mt-0.5">Dropoff: ${booking.dropoff}</span>
                    </td>
                    <td class="py-3 pr-2 text-right font-bold text-slate-700 dark:text-slate-300">₹${booking.fare.toFixed(2)}</td>
                    <td class="py-3 pr-2 text-right font-bold text-emerald-600 dark:text-emerald-400">${adminComm}</td>
                    <td class="py-3 text-right">${statusBadge}</td>
                </tr>
            `;
        });
        historyRosterBody.innerHTML = html;
    } else if (historyRosterBody) {
        historyRosterBody.innerHTML = `
            <tr>
                <td colspan="6" class="py-6 text-center text-slate-600">No past transactions or completed rides on this system.</td>
            </tr>
        `;
    }
}

// Action: Delete Driver
function handleDeleteDriver(email, name) {
    if (confirm(`Are you sure you want to delete driver "${name}"?`)) {
        const success = Backend.deleteDriver(email);
        if (success) {
            showToast(`Driver "${name}" has been deleted.`, 'success');
            syncDashboardData();
        } else {
            showToast("Failed to delete driver.");
        }
    }
}

// Action: Cancel Active Booking (by Admin)
function handleCancelActiveBooking(bookingId) {
    if (confirm("Are you sure you want to cancel this active booking/ride request?")) {
        try {
            Backend.cancelActiveBooking(bookingId, 'customer');
            showToast("Booking cancelled successfully.", "success");
            syncDashboardData();
        } catch (e) {
            showToast(e.message);
        }
    }
}

// Action: Reset Database System
function handleResetDatabase() {
    if (confirm("Are you sure you want to reset the system? This will delete all registered drivers, active/past bookings, and restore default settings.")) {
        localStorage.clear();
        window.location.reload();
    }
}
