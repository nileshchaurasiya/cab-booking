/* ==========================================================================
   Indian Cabs - Admin Control Center Controller Script
   ========================================================================== */

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

// Polls localStorage/Backend to dynamically sync metrics and roster states
function syncDashboardData() {
    const allDrivers = Backend.getAllDrivers();
    const onlineDrivers = allDrivers.filter(d => d.online);
    
    const activeBooking = Backend.getActiveBooking();
    const activeBookingsCount = activeBooking ? 1 : 0;

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
                if (activeBooking && (activeBooking.driverName === driver.name || activeBooking.driverPlate === driver.vehiclePlate) && (activeBooking.status === 'accepted' || activeBooking.status === 'started')) {
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
                <tr class="hover:bg-neutral-950/40 transition-colors">
                    <td class="py-3 pr-2">
                        <span class="font-bold text-white block text-xs">${driver.name}</span>
                        <span class="text-[9px] text-slate-500 block">${driver.email}</span>
                    </td>
                    <td class="py-3 pr-2 text-xs">
                        <span class="text-slate-200 block">${driver.vehicle || 'Not setup'}</span>
                    </td>
                    <td class="py-3">${statusBadge}</td>
                </tr>
            `;
        });
        driverRosterBody.innerHTML = html;
    } else {
        driverRosterBody.innerHTML = `
            <tr>
                <td colspan="3" class="py-6 text-center text-slate-600">No driver profiles registered on this system.</td>
            </tr>
        `;
    }

    // D. Render Active Bookings Table
    const bookingsRosterBody = document.getElementById('bookings-roster-body');
    if (activeBooking) {
        let bookingStatusBadge = '';
        if (activeBooking.status === 'started') {
            bookingStatusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">In Route</span>`;
        } else if (activeBooking.status === 'accepted') {
            bookingStatusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Accepted</span>`;
        } else {
            bookingStatusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">Requested</span>`;
        }

        bookingsRosterBody.innerHTML = `
            <tr class="hover:bg-neutral-950/40 transition-colors">
                <td class="py-3 pr-2">
                    <span class="font-bold text-white block text-xs">${activeBooking.customerName || 'Customer'}</span>
                    <span class="text-[9px] text-slate-500 block">Class: ${activeBooking.cabClass}</span>
                </td>
                <td class="py-3 pr-2 text-xs">
                    <span class="text-slate-300 font-medium block">Pickup: ${activeBooking.pickup}</span>
                    <span class="text-slate-400 block mt-0.5">Dropoff: ${activeBooking.dropoff}</span>
                </td>
                <td class="py-3 pr-2 text-right font-bold text-sky-400">🪙 ${activeBooking.fare.toFixed(2)}</td>
                <td class="py-3 text-right">${bookingStatusBadge}</td>
            </tr>
        `;
    } else {
        bookingsRosterBody.innerHTML = `
            <tr>
                <td colspan="4" class="py-6 text-center text-slate-600">No active ride requests or customer bookings.</td>
            </tr>
        `;
    }

    // E. Render Transaction & Ride History Table
    const historyRosterBody = document.getElementById('history-roster-body');
    const allBookings = Backend.getAllBookings();
    const pastBookings = allBookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

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
                <tr class="hover:bg-neutral-950/40 transition-colors border-b border-neutral-900 last:border-0">
                    <td class="py-3 pr-2">
                        <span class="font-bold text-white block text-xs">${booking.id}</span>
                        <span class="text-[9px] text-slate-500 block">Customer: ${booking.customerName}</span>
                    </td>
                    <td class="py-3 pr-2 text-xs">
                        <span class="text-slate-300 block font-medium">${booking.driverName || 'N/A'}</span>
                        <span class="text-[9px] text-slate-500 block">${booking.driverPlate || ''}</span>
                    </td>
                    <td class="py-3 pr-2 text-xs">
                        <span class="text-slate-300 font-medium block">Pickup: ${booking.pickup}</span>
                        <span class="text-slate-400 block mt-0.5">Dropoff: ${booking.dropoff}</span>
                    </td>
                    <td class="py-3 pr-2 text-right font-bold text-slate-300">₹${booking.fare.toFixed(2)}</td>
                    <td class="py-3 pr-2 text-right font-bold text-emerald-400">${adminComm}</td>
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
