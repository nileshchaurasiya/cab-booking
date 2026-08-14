# Indian Cabs - Project Architecture & Planning

This document outlines the detailed system design, separating the **Frontend (User Interface & Client Interactions)** from the **Backend (Business Logic & Centralized State)**.

---

## 🎨 FRONTEND PLAN (User Interface & Portals)

The frontend is divided into three client portals that communicate directly with the mock backend service. All interfaces use modern HTML structure styled with Tailwind CSS, supporting both light and dark modes.

### 1. Customer Portal (`customer.html`, `customer.js`)
*   **Booking Panel:** Inputs for pickup and drop-off locations. Calculates distance dynamically. Shows live fare estimates based on selected vehicle categories.
*   **Vehicle Class Selector:** Allows toggling between **Car** (₹50/km), **Auto Rickshaw** (₹30/km), and **Bike** (₹15/km). Displays selected state visually.
*   **Wallet Interface:** Shows current balance and provides a modal to recharge the wallet (restricted to a ₹2000 total balance). Includes a Tabbed panel to view **Wallet Transactions history** (deposits, ride payments, cancellations).
*   **Live Booking Status:** Shows booking tracking stages (Finding Driver → Driver Arrived → Trip Started → Completed). Includes a "Cancel Ride" option.
*   **Trip History:** List of past completed and cancelled bookings with invoice summaries.

### 2. Driver Portal (`driver.html`, `driver.js`)
*   **Shift Controls:** A prominent "Go Online" / "Go Offline" toggle switch. When turned offline, the driver stops receiving rides.
*   **Vehicle Profile Setup:** A mandatory startup settings modal to enter vehicle make/model and license plate number.
*   **Incoming Requests Card:** Displays live matching requests assigned to the driver, including customer name, pickup, drop-off, and fare. Offers "Accept" and "Decline" actions.
*   **Active Trip Panel:** Shows active trip details once accepted. Toggles between "Start Trip" and "End Trip".
*   **Earnings & Statistics:** Real-time counters showing total shift earnings and number of trips completed.

### 3. Admin Control Center (`admin.html`, `admin.js`)
*   **Metrics Row:** Global counters displaying number of online drivers, active bookings, and total admin commission earnings (10%).
*   **Driver Roster:** A detailed table listing all registered drivers, their online/offline state, and vehicle details. Includes a "Delete Driver" action.
*   **Add Driver Modal:** Admin form to register new drivers directly into the roster.
*   **Global History Table:** Lists every past transaction, fare calculation, and cancelled ride status across all users.
*   **Reset System:** A "Reset System" button to clear database cache and restore default configurations.

---

## ⚙️ BACKEND PLAN (State, Matching & Rules)

The mock backend (`mock-backend.js`) serves as the single source of truth for the application. It acts as a client-side database, mimicking real database collections and API responses.

### 1. Centralized Data Storage (`localStorage`)
*   Persisted inside a single local storage key (`indiancabs_db`).
*   **Collections:**
    *   `customers`: Array of registered customer accounts, their wallets, and trip logs.
    *   `drivers`: Array of registered drivers, vehicle details, online states, and earnings.
    *   `activeBookings`: List of currently active (non-completed/non-cancelled) bookings.
    *   `bookings`: Archive of past completed and cancelled bookings.
    *   `adminEarnings`: Total accumulated commission value.

### 2. Core Business Logic & Engines
*   **Booking Creation Engine:** 
    *   Verifies if an online driver matches the requested class.
    *   Validates customer wallet balance and deducts fare.
    *   Instantiates a new `Booking` object and adds it to the active list.
*   **Driver Dispatching (Sequential Matching):**
    *   Finds the next matching online driver for a ride.
    *   Ensures that busy drivers (already on an active trip) are skipped.
    *   Applies a 10-second matching timeout cooldown to drivers who decline a ride.
*   **Wallet Guard Rule:**
    *   Validates and rejects recharges exceeding a total balance of ₹2000.
    *   Provides exact delta messaging (e.g. *"You can only add 50 rupees"*).
*   **Transaction Processing:**
    *   Processes 90% payout to driver wallet and 10% commission to admin on trip completion.
    *   Handles full automatic wallet refunds when customer cancels a ride before it starts.
*   **Session Management:**
    *   Verifies active credentials, logs out, and changes driver status to offline in the database.

---

## 🔮 FUTURE ROADMAP (Proposed Features & Scalability)

Here is a list of features we can introduce in the future to expand the project:

### 1. Live Map Integration
*   **Interactive Maps:** Replace the static UI layout with a live map using **Leaflet.js** or the **Google Maps API**.
*   **Real-time Tracking:** Show the driver's vehicle marker moving along the route in real-time as the ride progresses.

### 2. Live WebSockets & Real-time Server
*   **Transition to Backend Server:** Migrating business logic to a real server (Node.js/Express) with a persistent database (MongoDB/PostgreSQL).
*   **WebSockets (Socket.io):** Replace the current 1.5-second client polling loops with direct WebSocket event triggers for instant matching notifications.

### 3. Pricing Engine Upgrades
*   **Surge Pricing:** Automatically increase rates by a multiplier (e.g. 1.5x) during high-demand hours or rainy conditions.
*   **Dynamic Toll & Traffic:** Calculate estimated trip durations adjusting dynamically based on simulated traffic congestion levels.

### 4. Reviews & Driver Ratings
*   **Customer Feedback:** Add a rating screen (1-5 stars) and comment input for customers after trip completion.
*   **Quality Metrics:** Display average ratings on driver profile cards, and use ratings as factors in matching (e.g., matching higher-rated customers with top-rated drivers).

### 5. Shared Rides (Pooling)
*   **Shared Bookings:** Allow two different customers heading in the same general direction to split a ride and share the cost.
*   **Co-passenger Routing:** Dynamically adjust the driver's route to include sequential pick-up and drop-off points.

### 6. Actual Payment Gateways
*   **Sandbox Payments:** Integrate mock payment gateways like **Razorpay** or **Stripe** (Sandbox Mode) to replace the static recharge wallet modal with simulated card/UPI transactions.

