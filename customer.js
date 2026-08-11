/* ==========================================================================
   Indian Cabs - Customer Booking & Simulation Dashboard Script
   ========================================================================== */

let currentCabClass = 'Splendor';
let currentRatePerKm = 8;
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
document.addEventListener('DOMContentLoaded', () => {
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
        const booking = Backend.getActiveBooking();
        if (booking) {
            try {
                if (booking.status !== 'completed' && booking.status !== 'cancelled') {
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
                }
            } catch (err) {
                console.error("Error recovering active booking", err);
            }
        }

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
            if (c === className) {
                btn.className = "flex flex-col items-center justify-center p-3 bg-slate-950 border border-sky-500 rounded-2xl transition-all cursor-pointer text-center group ring-2 ring-sky-500/20";
            } else {
                btn.className = "flex flex-col items-center justify-center p-3 bg-slate-950 border border-neutral-800 hover:border-sky-500 rounded-2xl transition-all cursor-pointer text-center group";
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
    setTimeout(() => {
        const customer = Backend.getCurrentCustomer();
        if (!customer) {
            showToast("Customer session not found!");
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `🚕 Book Cab Now`;
            return;
        }

        try {
            const booking = Backend.createBooking(customer.name, customer.email, pickupVal, dropoffVal, currentDistance, currentFare, currentCabClass);
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
        } catch(e) {
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

    bookingProgressInterval = setInterval(() => {
        let booking = Backend.getActiveBooking();

        if (!booking) {
            // Booking was removed, cancel everything
            cancelCurrentBookingLocally(true, "Booking request removed by system.");
            return;
        }

        try {
            updateTrackerVehicleImage(booking);

            if (booking.status === 'cancelled') {
                cancelCurrentBookingLocally(true, "Driver cancelled the booking request.");
                return;
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
            }

            if (booking.status === 'completed') {
                clearInterval(bookingProgressInterval);
                addRideToHistory(pickup, dropoff, booking.driverName, booking.fare);
                showToast("Trip completed! Thank you for riding.", "success");

                // Clear active booking status in Backend
                Backend.clearActiveBooking();

                // Sync wallet balance
                const customer = Backend.getCurrentCustomer();
                if (customer) {
                    walletAmount = customer.wallet;
                    document.getElementById('wallet-balance').textContent = walletAmount.toFixed(2);
                }

                // Return back to booking form
                resetDashboardToForm();
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
    showToast(toastMessage);
}



// Refers back to booking form when cancellation is called by user clicking "Cancel Ride"
function cancelCurrentBooking() {
    const booking = Backend.getActiveBooking();
    if (booking) {
        Backend.cancelActiveBooking(booking.id, 'customer');
    }
    cancelCurrentBookingLocally(true, "Booking cancelled successfully. Amount refunded.");
}

function shareTrackingStatus() {
    showToast("Tracking link copied to clipboard!", "success");
}

// Add row to ride history table dynamically
function addRideToHistory(pickup, dropoff, driver, fare) {
    const container = document.getElementById('ride-history-list');
    if (!container) return;

    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const row = document.createElement('div');
    row.className = "flex items-center justify-between bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4 hover:border-slate-300 dark:hover:border-neutral-800 transition-all";
    row.innerHTML = `
        <div class="flex items-center gap-3">
            <span class="text-xl">✅</span>
            <div>
                <h4 class="text-xs font-bold text-slate-800 dark:text-white">${pickup} to ${dropoff}</h4>
                <span class="text-[9px] text-slate-500 dark:text-slate-400">${today} • ${currentCabClass} Cab (Driver: ${driver})</span>
            </div>
        </div>
        <div class="text-right">
            <strong class="text-xs font-bold text-sky-400 block">₹${fare.toFixed(2)}</strong>
            <span class="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">Completed</span>
        </div>
    `;

    // Prepend to top of list
    container.insertBefore(row, container.firstChild);
}

function logoutUser() {
    Backend.logout('customer');
    window.location.href = 'login.html';
}

// Wallet Recharge Logic
function openRechargeModal() {
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

function submitRecharge(event) {
    event.preventDefault();

    const input = document.getElementById('recharge-amount-input');
    if (!input) return;

    const amount = parseFloat(input.value);
    if (isNaN(amount) || amount <= 0) {
        showToast("Please enter a valid amount to recharge.");
        return;
    }

    const customer = Backend.getCurrentCustomer();
    if (customer) {
        walletAmount = Backend.rechargeWallet(customer.email, amount);
        document.getElementById('wallet-balance').textContent = walletAmount.toFixed(2);
        showToast(`Successfully recharged ₹${amount.toFixed(2)} to your wallet!`, "success");
    }
    closeRechargeModal();
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
