/* ==========================================================================
   Indian Cabs - Driver Dashboard & Booking Controller Script
   ========================================================================== */

let isOnline = false;
let pollingInterval = null;
let currentActiveBookingId = null;
let currentShownRequestId = null;  // tracks which pending request card is currently shown
let driverTrackerProgress = 10;

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

// Session validation on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const user = Backend.getCurrentDriver();
    if (!user) {
        window.location.href = 'driver_login.html';
        return;
    }

    try {
        // Display driver details
        document.getElementById('driver-name-display').textContent = user.name;

        let needsSetup = false;
        if (!user.vehicle || !user.vehicleModel || !user.vehiclePlate) {
            needsSetup = true;
            document.getElementById('driver-vehicle-number-header').textContent = 'Setup Required';
            document.getElementById('driver-vehicle-display').textContent = 'Setup Required';
        } else {
            document.getElementById('driver-vehicle-number-header').textContent = user.vehicle;
            document.getElementById('driver-vehicle-display').textContent = `${user.vehicleModel} (${window.getCabCategoryDisplayName ? window.getCabCategoryDisplayName(user.cabClass || 'Sedan') : (user.cabClass || 'Sedan')})`;
        }

        // Load stats from Backend
        const earnings = user.earnings || 0;
        const tripsCount = user.tripsCount || 0;

        document.getElementById('driver-wallet-display').textContent = `₹${parseFloat(earnings).toFixed(2)}`;
        document.getElementById('driver-trips-count-display').textContent = `${parseInt(tripsCount)} trips`;

        // Load completed trips history list
        renderTripsHistory();

        // Restore online shift status from Backend
        const savedOnlineState = user.online;

        // Restore progress tracker from active booking if there is one
        const activeBooking = Backend.getActiveBooking();
        if (activeBooking) {
            if (activeBooking.status === 'accepted') {
                driverTrackerProgress = 20; // restore to a mid-point for accepted
            } else if (activeBooking.status === 'started') {
                driverTrackerProgress = 50; // restore to a mid-point for started
            }
        }

        if (needsSetup) {
            toggleShiftStatus(false);
            if (user.justSignedUp) {
                openVehicleModal(false);
            }
        } else {
            if (savedOnlineState) {
                toggleShiftStatus(true);
            } else {
                toggleShiftStatus(false);
            }
        }

    } catch (e) {
        console.error("Session load error", e);
        // Do NOT redirect here — redirecting causes an infinite loop if localStorage session
        // still exists (driver_login.html would bounce right back to driver.html).
    }
});

// Toggle shift status between online and offline
function toggleShiftStatus(forceState = null) {
    let targetOnline = forceState !== null ? forceState : !isOnline;

    const user = Backend.getCurrentDriver();
    if (targetOnline && user) {
        if (!user.vehicle || !user.vehicleModel || !user.vehiclePlate) {
            showToast("Please configure your vehicle details first!");
            openVehicleModal(false);
            targetOnline = false;
        }
    }

    isOnline = targetOnline;

    const btnToggle = document.getElementById('shift-toggle-btn');
    const thumb = document.getElementById('shift-toggle-thumb');
    const statusText = document.getElementById('shift-status-badge');

    // Save online state
    if (user) {
        Backend.updateDriverOnlineStatus(user.email, isOnline);
    }

    if (isOnline) {
        // Online UI styles
        btnToggle.classList.replace('bg-neutral-800', 'bg-sky-600');
        thumb.classList.replace('translate-x-0', 'translate-x-5');
        thumb.classList.replace('bg-slate-400', 'bg-white');
        statusText.textContent = "Online";
        statusText.className = "text-xs font-bold text-sky-500";

        showToast("You are now ONLINE. Scanning for booking requests...", "success");

        // Start polling active bookings
        startPollingForBookings();
    } else {
        // Offline UI styles
        btnToggle.classList.replace('bg-sky-600', 'bg-neutral-800');
        thumb.classList.replace('translate-x-5', 'translate-x-0');
        thumb.classList.replace('bg-white', 'bg-slate-400');
        statusText.textContent = "Offline";
        statusText.className = "text-xs font-bold text-slate-400";

        showToast("You are now OFFLINE. Shifts ended.");

        // Stop polling active bookings
        stopPollingForBookings();
        showOfflineStateCard();
    }
}

// Shows the Offline Card and hides others
function showOfflineStateCard() {
    document.getElementById('offline-state-card').style.display = 'block';
    document.getElementById('online-waiting-card').style.display = 'none';
    document.getElementById('new-request-card').style.display = 'none';
    document.getElementById('active-trip-card').style.display = 'none';
}

// Starts polling localStorage for customer bookings
function startPollingForBookings() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }

    // Run poll every 1.5 seconds
    pollingInterval = setInterval(checkActiveBookings, 1500);
    checkActiveBookings(); // Run once immediately
}

// Stops polling localStorage
function stopPollingForBookings() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
}

// Core polling loop checking localStorage bookings
function checkActiveBookings() {
    if (!isOnline) return;

    const booking = Backend.getActiveBooking();
    if (!booking) {
        // No active booking found, return to waiting radar screen
        currentActiveBookingId = null;
        showWaitingRadarCard();
        return;
    }

    try {
        if (booking.status === 'cancelled') {
            showToast("The active booking was cancelled by the customer.");
            currentActiveBookingId = null;
            renderTripsHistory();
            showWaitingRadarCard();
            return;
        }

        const user = Backend.getCurrentDriver();
        if (!user) return;

        // Driver category check
        if (booking.status === 'pending' && booking.cabClass !== user.cabClass) {
            currentActiveBookingId = null;
            showWaitingRadarCard();
            return;
        }

        // Sequential dispatch: only show to the assigned driver
        if (booking.status === 'pending') {
            if (booking.assignedDriverEmail && booking.assignedDriverEmail.toLowerCase() !== user.email.toLowerCase()) {
                // This booking is assigned to a different driver
                currentActiveBookingId = null;
                currentShownRequestId = null;
                showWaitingRadarCard();
                return;
            }
        }

        // Assignment check for active trips
        if ((booking.status === 'accepted' || booking.status === 'started') && booking.driverPlate !== user.vehiclePlate) {
            currentActiveBookingId = null;
            showWaitingRadarCard();
            return;
        }

        currentActiveBookingId = booking.id;

        if (booking.status === 'pending') {
            // Only show the request card once per booking (prevent re-render on every poll tick)
            if (currentShownRequestId !== booking.id) {
                currentShownRequestId = booking.id;

                document.getElementById('offline-state-card').style.display = 'none';
                document.getElementById('online-waiting-card').style.display = 'none';
                document.getElementById('active-trip-card').style.display = 'none';

                document.getElementById('new-request-card').style.display = 'block';

                // Populate request elements
                document.getElementById('request-customer-name').textContent = booking.customerName;
                document.getElementById('request-cab-class').textContent = window.getCabCategoryDisplayName ? window.getCabCategoryDisplayName(booking.cabClass) : booking.cabClass;
                document.getElementById('request-distance').textContent = `${booking.distance.toFixed(1)} km`;
                document.getElementById('request-pickup').textContent = booking.pickup;
                document.getElementById('request-dropoff').textContent = booking.dropoff;
                document.getElementById('request-fare').textContent = `₹${booking.fare.toFixed(2)}`;

                // Update vehicle image preview
                const requestImgContainer = document.getElementById('request-vehicle-img-container');
                const requestImg = document.getElementById('request-vehicle-img');
                if (requestImg && requestImgContainer) {
                    if (booking.cabClass === 'Car') {
                        requestImg.src = '../assets/car.png';
                        requestImgContainer.classList.remove('hidden');
                    } else if (booking.cabClass === 'Bike') {
                        requestImg.src = '../assets/splendor.png';
                        requestImgContainer.classList.remove('hidden');
                    } else {
                        requestImgContainer.classList.add('hidden');
                    }
                }
            }
        }

        if (booking.status === 'accepted' || booking.status === 'started') {
            currentShownRequestId = null; // clear so next pending booking shows properly
            // Driver already accepted or started trip, show the active dashboard
            document.getElementById('offline-state-card').style.display = 'none';
            document.getElementById('online-waiting-card').style.display = 'none';
            document.getElementById('new-request-card').style.display = 'none';

            document.getElementById('active-trip-card').style.display = 'block';

            // Populate active trip elements
            document.getElementById('active-customer-name').textContent = booking.customerName;
            document.getElementById('active-pickup').textContent = booking.pickup;
            document.getElementById('active-dropoff').textContent = booking.dropoff;
            document.getElementById('active-fare').textContent = `₹${booking.fare.toFixed(2)}`;

            const headerBorder = document.getElementById('active-trip-header-border');
            const buttonsGroup = document.getElementById('active-buttons-group');
            const activeTitle = document.getElementById('active-trip-title');
            const activeSubtitle = document.getElementById('active-trip-subtitle');
            const progressPercentage = document.getElementById('active-progress-percentage');
            const progressBar = document.getElementById('active-progress-bar');
            const progressText = document.getElementById('active-status-text');

            if (booking.status === 'accepted') {
                headerBorder.className = "absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-400 to-indigo-500";
                activeTitle.textContent = "On the way to Pickup";
                activeSubtitle.textContent = "Head to customer pickup location immediately.";

                // Restore progress from at least 10% when accepted
                if (driverTrackerProgress < 10) driverTrackerProgress = 10;
                if (driverTrackerProgress < 40) {
                    driverTrackerProgress += 1.5; // crawl
                }
                const floorProgress = Math.floor(driverTrackerProgress);
                progressText.textContent = driverTrackerProgress < 38 ? "Arriving at pickup location..." : "Arrived! Waiting to start ride...";
                progressPercentage.textContent = `${floorProgress}%`;
                progressBar.style.width = `${floorProgress}%`;

                buttonsGroup.innerHTML = `
                    <button onclick="startActiveTrip()" class="w-full py-3 px-4 rounded-xl font-bold bg-sky-500 hover:bg-sky-400 text-black hover:-translate-y-0.5 transition-all text-xs cursor-pointer shadow-lg shadow-sky-500/10">
                        🚀 Start Ride
                    </button>
                `;
            } else if (booking.status === 'started') {
                headerBorder.className = "absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-emerald-500";
                activeTitle.textContent = "En Route to Destination";
                activeSubtitle.textContent = "Driving customer safely to their destination.";

                if (driverTrackerProgress < 50) {
                    driverTrackerProgress = 50;
                }
                if (driverTrackerProgress < 95) {
                    driverTrackerProgress += 1.0; // crawl
                }
                const floorProgress = Math.floor(driverTrackerProgress);
                progressText.textContent = driverTrackerProgress < 90 ? "En route to destination..." : "Almost at destination...";
                progressPercentage.textContent = `${floorProgress}%`;
                progressBar.style.width = `${floorProgress}%`;

                buttonsGroup.innerHTML = `
                    <button onclick="completeActiveTrip()" class="col-span-2 py-3 px-4 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-black hover:-translate-y-0.5 transition-all text-xs cursor-pointer shadow-lg shadow-emerald-500/10">
                        🏁 Complete Ride
                    </button>
                `;
            }
        }

    } catch (e) {
        console.error("Error reading booking details in polling", e);
    }
}

// Shows Waiting Radar scanning state card
function showWaitingRadarCard() {
    document.getElementById('offline-state-card').style.display = 'none';
    document.getElementById('online-waiting-card').style.display = 'block';
    document.getElementById('new-request-card').style.display = 'none';
    document.getElementById('active-trip-card').style.display = 'none';
}

// Action: Accept Customer Request
function acceptRideRequest() {
    const booking = Backend.getActiveBooking();
    if (!booking) {
        showToast("Error: Booking request no longer active!");
        showWaitingRadarCard();
        return;
    }

    try {
        const user = Backend.getCurrentDriver();
        if (!user) {
            showToast("Session error: Driver profile not found.");
            return;
        }

        Backend.acceptBooking(booking.id, user.email);
        showToast("Booking request accepted! Head to pickup location.", "success");

        // Automatically start the ride after 2 seconds
        setTimeout(() => {
            const active = Backend.getActiveBooking();
            if (active && active.status === 'accepted') {
                startActiveTrip();
            }
        }, 2000);

        // Refresh view immediately
        checkActiveBookings();

    } catch (e) {
        console.error("Accept request error", e);
        showToast("Failed to accept booking.");
    }
}

// Action: Decline Request
function declineRideRequest() {
    const booking = Backend.getActiveBooking();
    if (booking) {
        Backend.cancelActiveBooking(booking.id, 'driver');
    }
    currentShownRequestId = null;
    showToast("Request declined.");
    showWaitingRadarCard();
}

// Action: Cancel Active Trip
function cancelActiveTrip() {
    const booking = Backend.getActiveBooking();
    if (booking) {
        Backend.cancelActiveBooking(booking.id, 'driver');
    }
    showToast("Ride cancelled successfully.");
    showWaitingRadarCard();
}

// Action: Start Active Trip (from pickup)
function startActiveTrip() {
    const booking = Backend.getActiveBooking();
    if (!booking) return;

    try {
        Backend.startBooking(booking.id);
        showToast("Ride started successfully!", "success");

        checkActiveBookings();
    } catch (e) {
        showToast(e.message);
    }
}

// Action: Complete Active Trip (arrived drop-off)
function completeActiveTrip() {
    const booking = Backend.getActiveBooking();
    if (!booking) return;

    try {
        const completedBooking = Backend.completeActiveBooking(booking.id);

        // Update displays from refreshed DB state
        const user = Backend.getCurrentDriver();
        if (user) {
            document.getElementById('driver-wallet-display').textContent = `₹${user.earnings.toFixed(2)}`;
            document.getElementById('driver-trips-count-display').textContent = `${user.tripsCount} trips`;
        }

        const driverShare = booking.fare * 0.90;
        alert(`Ride completed! Your account has been credited with ₹${driverShare.toFixed(2)}`);

        // Rerender trip list
        renderTripsHistory();

        showToast("Ride completed! Earnings updated.", "success");

        // Clean up locally
        currentActiveBookingId = null;
        driverTrackerProgress = 10;
        showWaitingRadarCard();

    } catch (e) {
        console.error("Complete ride error", e);
        showToast(e.message);
    }
}

// Renders the Driver Trip History list from localStorage
let driverHistoryFilter = 'all';

function setDriverHistoryFilter(filter) {
    driverHistoryFilter = filter;
    const filters = ['all', 'completed', 'cancelled'];
    filters.forEach(f => {
        const btn = document.getElementById(`drv-filter-${f}`);
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
    renderTripsHistory();
}

function renderTripsHistory() {
    const container = document.getElementById('driver-history-list');
    if (!container) return;

    const user = Backend.getCurrentDriver();
    if (!user) return;

    try {
        const allHistory = user.tripsHistory || [];
        const historyList = driverHistoryFilter === 'all'
            ? allHistory
            : allHistory.filter(t => {
                const isCompleted = t.status === 'Completed' || !t.status;
                return driverHistoryFilter === 'completed' ? isCompleted : !isCompleted;
            });
        let html = '';
        historyList.forEach(trip => {
            const displayName = trip.pickup.includes(' to ') ? trip.pickup : `${trip.pickup} to ${trip.dropoff}`;
            const isCompleted = trip.status === 'Completed' || !trip.status;
            
            const icon = isCompleted ? '✅' : '❌';
            const textClass = isCompleted ? 'text-emerald-400' : 'text-rose-400';
            const statusBadge = isCompleted 
                ? `<span class="text-[7px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">Completed</span>`
                : `<span class="text-[7px] px-1 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase font-semibold">Cancelled</span>`;

            html += `
                <div class="flex items-center justify-between bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4 hover:border-slate-300 dark:hover:border-neutral-800 transition-colors duration-300">
                    <div class="flex items-center gap-3">
                        <span class="text-xl">${icon}</span>
                        <div>
                            <h4 class="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[180px]">${displayName}</h4>
                            <span class="text-[9px] text-slate-500 dark:text-slate-400">Today • Customer: ${trip.customer}</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <strong class="text-xs font-bold ${textClass} block">₹${trip.fare.toFixed(2)}</strong>
                        ${statusBadge}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html || `<div class="text-center text-xs text-neutral-500 py-6">No trips completed in this shift yet.</div>`;
    } catch (e) {
        console.error("Trip history render error", e);
    }
}

// Log out user
function logoutUser() {
    Backend.logout('driver');
    window.location.href = "driver_login.html";
}

// Function to show/open the vehicle modal
function openVehicleModal(isCancelable = true) {
    const modal = document.getElementById('vehicle-modal');
    if (!modal) return;
    const closeBtn = document.getElementById('close-vehicle-modal-btn');
    const title = document.getElementById('vehicle-modal-title');
    const desc = document.getElementById('vehicle-modal-desc');

    if (isCancelable) {
        if (closeBtn) closeBtn.style.display = 'block';
        if (title) title.textContent = "Edit Vehicle Details";
        if (desc) desc.textContent = "Update your vehicle and cab category information.";
    } else {
        if (closeBtn) closeBtn.style.display = 'none';
        if (title) title.textContent = "Vehicle Setup Required";
        if (desc) desc.textContent = "Please add your vehicle details to start your shift.";
    }

    // Pre-fill fields if they exist in Backend
    const user = Backend.getCurrentDriver();
    if (user) {
        document.getElementById('modal-vehicle-model').value = user.vehicleModel || '';
        document.getElementById('modal-vehicle-plate').value = user.vehiclePlate || '';
        document.getElementById('modal-vehicle-class').value = user.cabClass || 'Car';
    }

    modal.style.display = 'flex';
}

function closeVehicleModal() {
    const modal = document.getElementById('vehicle-modal');
    if (modal) modal.style.display = 'none';
}

function saveVehicleDetails(event) {
    event.preventDefault();

    const brandModel = document.getElementById('modal-vehicle-model').value.trim();
    const plateNumber = document.getElementById('modal-vehicle-plate').value.trim().toUpperCase();
    const cabClass = document.getElementById('modal-vehicle-class').value;

    if (!brandModel || !plateNumber) {
        showToast("Please fill in all vehicle details!");
        return;
    }

    const formattedPlate = plateNumber.replace(/[\s-]/g, '').toUpperCase();
    if (!/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/.test(formattedPlate)) {
        showToast("Invalid Vehicle Number! Format must be like MH12AB1234 (2 letters, 2 digits, 2 letters, 4 digits).");
        return;
    }

    const user = Backend.getCurrentDriver();
    if (!user) {
        showToast("Session expired. Please log in again.");
        setTimeout(() => { window.location.href = 'driver_login.html'; }, 1500);
        return;
    }

    try {
        Backend.updateDriverVehicle(user.email, brandModel, formattedPlate, cabClass);

        // Update displays
        document.getElementById('driver-vehicle-number-header').textContent = formattedPlate;
        document.getElementById('driver-vehicle-display').textContent = `${brandModel} (${cabClass})`;

        showToast("Vehicle details updated successfully!", "success");
        closeVehicleModal();
    } catch (e) {
        console.error("Error saving vehicle details", e);
        showToast("Failed to save vehicle details.");
    }
}

// Opens profile details modal
function openProfileModal() {
    const user = Backend.getCurrentDriver();
    if (user) {
        try {
            document.getElementById('profile-name').textContent = user.name || '--';
            document.getElementById('profile-email').textContent = user.email || '--';
            document.getElementById('profile-vehicle').textContent = user.vehicle || 'Not setup';
            document.getElementById('profile-cabclass').textContent = window.getCabCategoryDisplayName ? window.getCabCategoryDisplayName(user.cabClass || '--') : (user.cabClass || '--');

            // Show vehicle preview image
            const imageContainer = document.getElementById('profile-vehicle-image-container');
            const imageEl = document.getElementById('profile-vehicle-image');
            if (imageEl && imageContainer) {
                if (user.cabClass === 'Car') {
                    imageEl.src = '../assets/car.png';
                    imageContainer.classList.remove('hidden');
                } else if (user.cabClass === 'Bike') {
                    imageEl.src = '../assets/splendor.png';
                    imageContainer.classList.remove('hidden');
                } else {
                    imageContainer.classList.add('hidden');
                }
            }
        } catch (e) {
            console.error("Profile load error", e);
        }
    }
    const modal = document.getElementById('profile-modal');
    if (modal) modal.style.display = 'flex';
}

// Closes profile details modal
function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.style.display = 'none';
}
