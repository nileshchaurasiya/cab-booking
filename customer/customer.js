/* ==========================================================================
   Indian Cabs - Customer Booking & Simulation Dashboard Script
   ========================================================================== */

let currentCabClass = 'Car';
let currentRatePerKm = 50;
let currentDistance = 0; // Default to 0
let walletAmount = 2000.00;
let currentFare = 0; // Default to 0
let bookingProgressInterval = null;
let currentTrackerProgress = 10;

// Function to randomize distance
function randomizeDistance() {
    currentDistance = parseFloat((Math.random() * (22 - 3) + 3).toFixed(1)); // Random distance between 3.0 and 22.0 km
}

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
document.addEventListener('DOMContentLoaded', async () => {
    const user = Backend.getCurrentCustomer();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        walletAmount = user.wallet;

        // Display customer name, address and wallet balance
        document.getElementById('customer-name-display').textContent = user.name;
        document.getElementById('customer-address-display').textContent = user.address || 'Surat, Gujarat';
        document.getElementById('wallet-balance').textContent = walletAmount.toFixed(2);

        // Initial distance & fare estimate simulation (sets to 0 since inputs are empty)
        updateFareEstimate();

        // Listen for input changes to dynamically toggle zero state or randomize on focus-out
        const pickupField = document.getElementById('booking-pickup');
        const dropoffField = document.getElementById('booking-dropoff');
        if (pickupField && dropoffField) {
            const handleInputChange = () => {
                const pickupVal = pickupField.value.trim();
                const dropoffVal = dropoffField.value.trim();

                if (pickupVal && dropoffVal) {
                    if (currentDistance === 0) {
                        randomizeDistance();
                    }
                } else {
                    currentDistance = 0;
                }
                updateFareEstimate();
            };

            pickupField.addEventListener('input', handleInputChange);
            dropoffField.addEventListener('input', handleInputChange);

            const handleBlurChange = () => {
                if (pickupField.value.trim() && dropoffField.value.trim()) {
                    randomizeDistance();
                    updateFareEstimate();
                }
            };
            pickupField.addEventListener('blur', handleBlurChange);
            dropoffField.addEventListener('blur', handleBlurChange);
        }

        // Check for active booking
        const booking = await Backend.getActiveBooking();
        if (booking && booking.status !== 'completed' && booking.status !== 'cancelled') {
            try {
                // Restore active booking tracking
                document.getElementById('booking-form-card').style.display = 'none';
                document.getElementById('booking-tracking-card').style.display = 'block';

                currentDistance = booking.distance;
                currentFare = booking.fare;
                currentCabClass = booking.cabClass;

                // Restart polling/simulation
                if (booking.driverName || booking.status === 'accepted' || booking.status === 'started') {
                    // Driver is matched
                    document.getElementById('tracker-driver-name').textContent = booking.driverName || "Matching...";
                    document.getElementById('tracker-vehicle-name').textContent = booking.driverVehicle || "Matched Driver...";
                    document.getElementById('tracker-vehicle-number').textContent = booking.driverPlate || "...";
                    updateTrackerVehicleImage(booking);

                    if (booking.status === 'accepted') {
                        document.getElementById('tracker-ride-status').textContent = "Driver accepted! Arriving at pickup...";
                        document.getElementById('tracker-progress-bar').style.width = "40%";
                        document.getElementById('tracker-progress-percentage').textContent = "40%";
                    } else if (booking.status === 'started') {
                        document.getElementById('tracker-ride-status').textContent = "Ride started! En route to destination...";
                        document.getElementById('tracker-progress-bar').style.width = "50%";
                        document.getElementById('tracker-progress-percentage').textContent = "50%";
                    }
                } else {
                    // Still waiting
                    document.getElementById('tracker-driver-name').textContent = "Matching...";
                    document.getElementById('tracker-vehicle-name').textContent = "Searching for nearest driver...";
                    document.getElementById('tracker-vehicle-number').textContent = "...";
                    document.getElementById('tracker-ride-status').textContent = "Waiting for driver to accept...";
                    document.getElementById('tracker-progress-bar').style.width = "10%";
                    document.getElementById('tracker-progress-percentage').textContent = "10%";
                    updateTrackerVehicleImage(booking);
                }

                // Restart polling check
                startBookingPolling(booking.pickup, booking.dropoff);
            } catch (err) {
                console.error("Error recovering active booking", err);
                document.getElementById('booking-form-card').style.display = 'block';
            }
        } else {
            // No active booking, show the booking form
            document.getElementById('booking-form-card').style.display = 'block';
        }

        // Render updated trips history list & wallet history
        renderCustomerTripsHistory();
        renderWalletHistory();

    } catch (e) {
        console.error("Session load error", e);
        window.location.href = 'login.html';
    }
});

// Handles vehicle class selection
function selectCabClass(className, ratePerKm) {
    currentCabClass = className;
    currentRatePerKm = ratePerKm;

    // Reset button designs
    const classes = ['Splendor', 'SUV', 'Defender'];
    classes.forEach(c => {
        const btn = document.getElementById(`cab-${c.toLowerCase()}`);
        if (btn) {
            let isMatched = false;
            if (c === 'Splendor' && className === 'Car') isMatched = true;
            else if (c === 'SUV' && className === 'Auto Rickshaw') isMatched = true;
            else if (c === 'Defender' && className === 'Bike') isMatched = true;
            else if (c === className) isMatched = true;

            if (isMatched) {
                btn.className = "flex flex-col items-center justify-center p-3 bg-blue-50/70 dark:bg-slate-900 border border-sky-500 rounded-2xl transition-all cursor-pointer text-center group ring-2 ring-sky-500/30";
            } else {
                btn.className = "flex flex-col items-center justify-center p-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-700 hover:border-sky-500 rounded-2xl transition-all cursor-pointer text-center group";
            }
        }
    });

    updateFareEstimate();
}

// Update calculated estimate output based on current selections
function updateFareEstimate() {
    const pickupField = document.getElementById('booking-pickup');
    const dropoffField = document.getElementById('booking-dropoff');

    const pickupVal = pickupField ? pickupField.value.trim() : '';
    const dropoffVal = dropoffField ? dropoffField.value.trim() : '';

    if (!pickupVal || !dropoffVal) {
        currentDistance = 0;
        currentFare = 0;
    } else {
        if (currentDistance === 0) {
            randomizeDistance();
        }
        currentFare = Math.round(currentDistance * currentRatePerKm);
    }

    document.getElementById('estimate-fare-display').textContent = `₹${currentFare.toFixed(2)}`;
    document.getElementById('estimate-dist-display').textContent = `${currentDistance.toFixed(1)} km`;
}

// Handles submitting the ride booking request
// Handles submitting the ride booking request
function handleCabRequest(event) {
    event.preventDefault();

    const pickupVal = document.getElementById('booking-pickup').value.trim();
    const dropoffVal = document.getElementById('booking-dropoff').value.trim();

    if (!pickupVal || !dropoffVal) {
        showToast("Please enter both Pickup and Drop-off locations!");
        return;
    }

    // Verify wallet balance
    if (walletAmount < currentFare) {
        showToast("Insufficient balance in your wallet! Please recharge.");
        return;
    }

    const btnSubmit = document.getElementById('btn-submit-booking');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-black inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg> Finding nearest driver...
    `;

    // Simulate search loading lag
    setTimeout(async () => {
        const customer = Backend.getCurrentCustomer();
        if (!customer) {
            showToast("Customer session not found!");
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `🚕 Book Cab Now`;
            return;
        }

        try {
            const booking = await Backend.createBooking(customer.name, customer.email, pickupVal, dropoffVal, currentDistance, currentFare, currentCabClass);
            walletAmount = customer.wallet - currentFare;
            document.getElementById('wallet-balance').textContent = walletAmount.toFixed(2);

            // Toggle view
            document.getElementById('booking-form-card').style.display = 'none';
            document.getElementById('booking-tracking-card').style.display = 'block';

            // Set initial searching UI
            document.getElementById('tracker-driver-name').textContent = "Matching...";
            document.getElementById('tracker-vehicle-name').textContent = "Searching for nearest driver...";
            document.getElementById('tracker-vehicle-number').textContent = "...";
            document.getElementById('tracker-ride-status').textContent = "Waiting for driver to accept...";
            document.getElementById('tracker-progress-bar').style.width = "10%";
            document.getElementById('tracker-progress-percentage').textContent = "10%";

            showToast("Ride request sent! Waiting for driver response.", "success");

            // Start polling localStorage for driver status updates
            startBookingPolling(pickupVal, dropoffVal);
        } catch (e) {
            showToast(e.message);
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `🚕 Book Cab Now`;
        }
    }, 2000);
}

// Polls Backend for status changes
function startBookingPolling(pickup, dropoff) {
    if (bookingProgressInterval) {
        clearInterval(bookingProgressInterval);
    }

    currentTrackerProgress = 10;

    let hasShownDriverUnavailable = false;

    bookingProgressInterval = setInterval(async () => {
        let booking = await Backend.getActiveBooking();

        if (!booking) {
            // Booking was removed, cancel everything
            cancelCurrentBookingLocally(true, "Booking request removed by system.");
            return;
        }

        try {
            updateTrackerVehicleImage(booking);

            if (booking.status === 'cancelled') {
                cancelCurrentBookingLocally(true, "Booking was cancelled.");
                return;
            }

            if (booking.declinedBy && booking.declinedBy.length > 0) {
                if (!hasShownDriverUnavailable) {
                    showToast("Driver is not available. Please wait 2 to 3 minutes, ride is getting ready...");
                    hasShownDriverUnavailable = true;
                }
                document.getElementById('tracker-ride-status').textContent = "Searching for another driver...";
            } else {
                hasShownDriverUnavailable = false;
            }

            let targetProgress = 10;
            let statusMessage = "Waiting for driver to accept...";

            if (booking.status === 'accepted') {
                document.getElementById('tracker-driver-name').textContent = booking.driverName;
                document.getElementById('tracker-vehicle-name').textContent = booking.driverVehicle;
                document.getElementById('tracker-vehicle-number').textContent = booking.driverPlate;

                targetProgress = 40;
                if (currentTrackerProgress < targetProgress) {
                    currentTrackerProgress += 1.5; // slow crawl (takes ~30s to reach 40%)
                }
                statusMessage = currentTrackerProgress < 38 ? "Driver accepted! Arriving at pickup..." : "Driver arrived! Waiting for driver to start ride...";
                // Prevent cancellation once ride is accepted/started
                const cancelBtn = document.getElementById('btn-cancel-ride');
                if (cancelBtn) {
                    cancelBtn.style.display = 'none';
                }
            }

            if (booking.status === 'pending') {
                // Booking was reset back to pending (driver cancelled after accepting)
                currentTrackerProgress = 10;
                document.getElementById('tracker-driver-name').textContent = 'Matching...';
                document.getElementById('tracker-vehicle-name').textContent = 'Searching for nearest driver...';
                document.getElementById('tracker-vehicle-number').textContent = '...';
                // Restore cancel button
                const cancelBtn = document.getElementById('btn-cancel-ride');
                if (cancelBtn) {
                    cancelBtn.style.display = 'block';
                    cancelBtn.disabled = false;
                }
                if (!hasShownDriverUnavailable && booking.declinedBy && booking.declinedBy.length > 0) {
                    showToast("Driver cancelled the accepted ride. Searching for another driver...");
                    hasShownDriverUnavailable = true;
                }
            }

            if (booking.status === 'started') {
                if (currentTrackerProgress < 50) {
                    currentTrackerProgress = 50;
                }
                targetProgress = 95;
                if (currentTrackerProgress < targetProgress) {
                    currentTrackerProgress += 1.0; // slow crawl (takes ~82s to reach 95%)
                }
                statusMessage = currentTrackerProgress < 90 ? "Ride started! En route to destination..." : "Almost there! Arriving soon...";

                // Prevent cancellation once ride is accepted/started
                const cancelBtn = document.getElementById('btn-cancel-ride');
                if (cancelBtn) {
                    cancelBtn.style.display = 'none';
                }
            }

            if (booking.status === 'completed') {
                clearInterval(bookingProgressInterval);
                showToast("Trip completed! Thank you for riding.", "success");

                // Sync wallet balance
                const customer = Backend.getCurrentCustomer();
                if (customer) {
                    walletAmount = customer.wallet;
                    document.getElementById('wallet-balance').textContent = walletAmount.toFixed(2);
                }

                // Render updated trips history list & wallet history
                renderCustomerTripsHistory();
                renderWalletHistory();

                // Open feedback modal with driver details
                openFeedbackModal(booking);
                return;
            }

            // Update UI with crawled progress
            const floorProgress = Math.floor(currentTrackerProgress);
            document.getElementById('tracker-ride-status').textContent = statusMessage;
            document.getElementById('tracker-progress-bar').style.width = `${floorProgress}%`;
            document.getElementById('tracker-progress-percentage').textContent = `${floorProgress}%`;

        } catch (e) {
            console.error("Polling error", e);
        }
    }, 1500);
}

// Reset Dashboard back to form
function resetDashboardToForm() {
    document.getElementById('booking-tracking-card').style.display = 'none';
    document.getElementById('booking-form-card').style.display = 'block';

    const btnSubmit = document.getElementById('btn-submit-booking');
    if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `🚕 Book Cab Now`;
    }

    const cancelBtn = document.getElementById('btn-cancel-ride');
    if (cancelBtn) {
        cancelBtn.style.display = 'block';
        cancelBtn.disabled = false;
        cancelBtn.innerHTML = "🚫 Cancel Ride";
    }
}

// Clean up booking details locally
function cancelCurrentBookingLocally(shouldRefund, toastMessage) {
    if (bookingProgressInterval) {
        clearInterval(bookingProgressInterval);
    }

    Backend.clearActiveBooking();

    const customer = Backend.getCurrentCustomer();
    if (customer) {
        walletAmount = customer.wallet;
        document.getElementById('wallet-balance').textContent = walletAmount.toFixed(2);
    }

    resetDashboardToForm();
    renderCustomerTripsHistory();
    renderWalletHistory();
    showToast(toastMessage);
}



// Refers back to booking form when cancellation is called by user clicking "Cancel Ride"
async function cancelCurrentBooking() {
    const booking = await Backend.getActiveBooking();
    if (booking) {
        if (booking.status === 'started' || booking.status === 'accepted') {
            showToast("Cannot cancel the ride as it has already been accepted.", "error");
            return;
        }
        await Backend.cancelActiveBooking(booking.id, 'customer');
    }
    cancelCurrentBookingLocally(true, "Booking cancelled successfully. Amount refunded.");
}

function shareTrackingStatus() {
    showToast("Tracking link copied to clipboard!", "success");
}

// Renders customer trips history list dynamically from database
let customerHistoryFilter = 'all';

function setCustomerHistoryFilter(filter) {
    customerHistoryFilter = filter;
    const filters = ['all', 'completed', 'cancelled'];
    filters.forEach(f => {
        const btn = document.getElementById(`cust-filter-${f}`);
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
    renderCustomerTripsHistory();
}

function renderCustomerTripsHistory() {
    const container = document.getElementById('ride-history-list');
    if (!container) return;

    const user = Backend.getCurrentCustomer();
    if (!user) return;

    try {
        const allHistory = user.tripsHistory || [];
        const historyList = customerHistoryFilter === 'all'
            ? allHistory
            : allHistory.filter(t => {
                const isCompleted = t.status === 'Completed' || !t.status;
                return customerHistoryFilter === 'completed' ? isCompleted : !isCompleted;
            });
        let html = '';

        historyList.forEach(trip => {
            const dateStr = trip.timestamp ? new Date(trip.timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recently';

            const isCompleted = trip.status === 'Completed' || !trip.status;
            const statusBadge = isCompleted
                ? `<span class="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">Completed</span>`
                : `<span class="text-[8px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase font-semibold">Cancelled</span>`;

            const icon = isCompleted ? '✅' : '❌';
            const textClass = isCompleted ? 'text-sky-400' : 'text-rose-400';

            html += `
                <div class="flex items-center justify-between bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4 hover:border-slate-300 dark:hover:border-neutral-800 transition-all">
                    <div class="flex items-center gap-3">
                        <span class="text-xl">${icon}</span>
                        <div>
                            <h4 class="text-xs font-bold text-slate-800 dark:text-white">${trip.pickup} to ${trip.dropoff}</h4>
                            <span class="text-[9px] text-slate-500 dark:text-slate-400">${dateStr} • Driver: ${trip.driver || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <strong class="text-xs font-bold ${textClass} block">₹${trip.fare.toFixed(2)}</strong>
                        ${statusBadge}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html || `<div class="text-center text-xs text-neutral-500 py-6">No rides booked yet.</div>`;
    } catch (e) {
        console.error("Trip history render error", e);
    }
}

let activeHistoryTab = 'trips'; // 'trips' | 'wallet'

function switchHistoryTab(tabName) {
    activeHistoryTab = tabName;
    const tabTrips = document.getElementById('tab-trips');
    const tabWallet = document.getElementById('tab-wallet');
    const tripsHeader = document.getElementById('trips-header-block');
    const walletHeader = document.getElementById('wallet-header-block');
    const tripsList = document.getElementById('ride-history-list');
    const walletList = document.getElementById('wallet-history-list');

    if (!tabTrips || !tabWallet || !tripsHeader || !walletHeader || !tripsList || !walletList) return;

    if (tabName === 'trips') {
        // Tab UI
        tabTrips.className = "pb-1.5 border-b-2 border-sky-500 text-sky-500 transition-all cursor-pointer";
        tabWallet.className = "pb-1.5 border-b-2 border-transparent text-slate-450 hover:text-slate-200 transition-all cursor-pointer";
        // Sections
        tripsHeader.style.display = 'flex';
        walletHeader.style.display = 'none';
        tripsList.style.display = 'block';
        walletList.style.display = 'none';
    } else {
        // Tab UI
        tabTrips.className = "pb-1.5 border-b-2 border-transparent text-slate-450 hover:text-slate-200 transition-all cursor-pointer";
        tabWallet.className = "pb-1.5 border-b-2 border-sky-500 text-sky-500 transition-all cursor-pointer";
        // Sections
        tripsHeader.style.display = 'none';
        walletHeader.style.display = 'flex';
        tripsList.style.display = 'none';
        walletList.style.display = 'block';
        
        // Render
        renderWalletHistory();
    }
}

function renderWalletHistory() {
    const container = document.getElementById('wallet-history-list');
    if (!container) return;

    const user = Backend.getCurrentCustomer();
    if (!user) return;

    try {
        const historyList = user.walletHistory || [];
        let html = '';

        historyList.forEach(tx => {
            const dateStr = tx.date || (tx.timestamp ? new Date(tx.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently');
            
            let statusBadge = '';
            let icon = '🪙';
            let textClass = 'text-slate-800 dark:text-white';
            let prefix = '';

            if (tx.type === 'recharge') {
                statusBadge = `<span class="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">Deposit</span>`;
                icon = '📥';
                textClass = 'text-emerald-400';
                prefix = '+ ';
            } else if (tx.type === 'ride_payment') {
                statusBadge = `<span class="text-[8px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase font-semibold">Payment</span>`;
                icon = '📤';
                textClass = 'text-rose-400';
                prefix = '- ';
            } else if (tx.type === 'refund') {
                statusBadge = `<span class="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">Refund</span>`;
                icon = '🔄';
                textClass = 'text-emerald-400';
                prefix = '+ ';
            }

            html += `
                <div class="flex items-center justify-between bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4 hover:border-slate-300 dark:hover:border-neutral-800 transition-all">
                    <div class="flex items-center gap-3">
                        <span class="text-xl">${icon}</span>
                        <div>
                            <h4 class="text-xs font-bold text-slate-800 dark:text-white">${tx.description || 'Wallet Transaction'}</h4>
                            <span class="text-[9px] text-slate-500 dark:text-slate-400">${dateStr}</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <strong class="text-xs font-bold ${textClass} block">${prefix}₹${Math.abs(tx.amount).toFixed(2)}</strong>
                        ${statusBadge}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html || `<div class="text-center text-xs text-neutral-500 py-6">No wallet transactions found.</div>`;
    } catch (e) {
        console.error("Wallet history render error", e);
    }
}

function logoutUser() {
    if (confirm("Are you sure you want to log out from this account?")) {
        Backend.logout('customer');
        window.location.href = 'login.html';
    }
}

// Wallet Recharge Logic
function openRechargeModal() {
    const customer = Backend.getCurrentCustomer();
    if (customer && customer.wallet >= 2000) {
        showToast("₹2000 is maximum capacity. You cannot add more money on it.");
        return;
    }
    const modal = document.getElementById('recharge-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('recharge-amount-input').value = '';
    }
}

function closeRechargeModal() {
    const modal = document.getElementById('recharge-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function selectRechargeAmount(amount) {
    const input = document.getElementById('recharge-amount-input');
    if (input) {
        input.value = amount;
    }
}

async function submitRecharge(event) {
    event.preventDefault();

    const input = document.getElementById('recharge-amount-input');
    if (!input) return;

    const amount = parseFloat(input.value);
    if (isNaN(amount) || amount < 10) {
        showToast("Minimum recharge amount is ₹10.");
        return;
    }

    if (amount > 5000) {
        showToast("Maximum recharge amount is ₹5000.");
        return;
    }

    const customer = Backend.getCurrentCustomer();
    if (customer) {
        const maxAllowed = 2000 - customer.wallet;
        if (customer.wallet + amount > 2000) {
            const formattedMax = maxAllowed % 1 === 0 ? maxAllowed : maxAllowed.toFixed(2);
            showToast(`You can only add ${formattedMax} rupees.`);
            return;
        }
        try {
            walletAmount = await Backend.rechargeWallet(customer.email, amount);
            document.getElementById('wallet-balance').textContent = walletAmount.toFixed(2);
            showToast(`Successfully recharged ₹${amount.toFixed(2)} to your wallet!`, "success");
            renderWalletHistory();
            closeRechargeModal();
        } catch (e) {
            showToast(e.message);
        }
    }
}

// Opens profile details modal
function openProfileModal() {
    const user = Backend.getCurrentCustomer();
    if (user) {
        document.getElementById('profile-name').textContent = user.name || '--';
        document.getElementById('profile-email').textContent = user.email || '--';
        document.getElementById('profile-address').textContent = user.address || 'Surat, Gujarat';
    }
    const modal = document.getElementById('profile-modal');
    if (modal) modal.style.display = 'flex';
}

// Closes profile details modal
function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.style.display = 'none';
}

// Dynamically toggles and sets the driver's vehicle image in the tracker
function updateTrackerVehicleImage(booking) {
    const vehicleImageEl = document.getElementById('tracker-vehicle-image');
    const avatarEl = document.getElementById('tracker-driver-avatar');
    if (!vehicleImageEl || !avatarEl) return;

    if (booking.cabClass === 'Splendor') {
        vehicleImageEl.src = 'splendor.png';
        vehicleImageEl.classList.remove('hidden');
        avatarEl.classList.add('hidden');
    } else if (booking.cabClass === 'Defender') {
        vehicleImageEl.src = 'defender.png';
        vehicleImageEl.classList.remove('hidden');
        avatarEl.classList.add('hidden');
    } else {
        vehicleImageEl.classList.add('hidden');
        avatarEl.classList.remove('hidden');
    }
}

let selectedFeedbackStarsValue = 5;
let currentFeedbackBookingId = null;

function openFeedbackModal(booking) {
    // Prevent duplicate modal opening if feedback has already been submitted for this booking ID
    const submittedFeedbacks = JSON.parse(localStorage.getItem('indiancabs_submitted_feedbacks') || '[]');
    if (submittedFeedbacks.includes(booking.id)) {
        resetDashboardToForm();
        return;
    }

    currentFeedbackBookingId = booking.id;

    document.getElementById('feedback-driver-name').textContent = booking.driverName || 'Driver';
    document.getElementById('feedback-vehicle-info').textContent = `${booking.driverVehicle || 'Cab'} (${booking.driverPlate || ''})`;
    document.getElementById('feedback-comment').value = '';
    
    // Reset star colors
    selectFeedbackStars(5);
    
    const feedbackModal = document.getElementById('feedback-modal');
    if (feedbackModal) {
        feedbackModal.style.display = 'flex';
    }
}

function selectFeedbackStars(stars) {
    selectedFeedbackStarsValue = stars;
    const starButtons = document.querySelectorAll('#feedback-modal .star-btn');
    starButtons.forEach((btn, idx) => {
        if (idx < stars) {
            btn.className = "star-btn text-3xl text-amber-400 hover:scale-110 active:scale-95 transition-all focus:outline-none";
        } else {
            btn.className = "star-btn text-3xl text-slate-350 dark:text-neutral-700 hover:scale-110 active:scale-95 transition-all focus:outline-none";
        }
    });
}

function submitRideFeedback() {
    const comment = document.getElementById('feedback-comment').value.trim();
    const feedbackModal = document.getElementById('feedback-modal');
    
    // Clear active booking from backend session cache
    Backend.clearActiveBooking();
    
    // Record this booking ID as rated in localStorage to prevent duplicate modal popups on refresh
    if (currentFeedbackBookingId) {
        const submittedFeedbacks = JSON.parse(localStorage.getItem('indiancabs_submitted_feedbacks') || '[]');
        submittedFeedbacks.push(currentFeedbackBookingId);
        localStorage.setItem('indiancabs_submitted_feedbacks', JSON.stringify(submittedFeedbacks));
    }

    if (feedbackModal) {
        feedbackModal.style.display = 'none';
    }
    
    showToast("Thank you for your rating & feedback!", "success");
    
    // Return back to booking form
    resetDashboardToForm();
}

// Bind to window for HTML onclick actions
window.openFeedbackModal = openFeedbackModal;
window.selectFeedbackStars = selectFeedbackStars;
window.submitRideFeedback = submitRideFeedback;
