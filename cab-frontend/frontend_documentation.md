# Cab Booking System - Frontend Documentation & Guide

This frontend is a React single-page application (SPA) scaffolded with Vite, TypeScript, and TailwindCSS v4. It features a complete role-based authentication flow, a functional Customer Portal, a Driver Portal, and an Admin Portal.

---

## Workspace Structure
- **`src/services/api.ts`**: Axios-like wrapper around raw fetch requests. Attaches Sanctum Bearer tokens from localStorage to every API call.
- **`src/components/Login.tsx`**: Unified interface containing tab selection for **Customer**, **Driver**, and **Admin** login screens.
- **`src/components/Register.tsx`**: Full registration forms supporting both Customers and Drivers (with additional fields like license details, vehicle color, model, plate numbers, and vehicle types).
- **`src/components/Dashboard.tsx`**: Dynamic dashboard switcher that detects roles and mounts appropriate workspace views.
- **`src/components/CustomerDashboard.tsx`**: Customer portal workspace (bookings, nearby driver search, status trackers, history logs, and rating dialogs).
- **`src/components/DriverDashboard.tsx`**: Driver portal workspace (shift status, scanning radar, request cards, trip control, vehicle configurator, and history logs).
- **`src/components/AdminDashboard.tsx`**: Admin portal workspace (statistics overview, driver roster, active bookings, history transactions log, and add driver action triggers).

---

## Authentication Flow Details
1. **Sanctum CSRF & Bearer Tokens**:
   - Credentials are submitted via `POST /api/login`.
   - On success, the plain text token returned is saved in `localStorage.setItem('auth_token', ...)`.
   - The user profile payload is cached locally: `localStorage.setItem('auth_user', ...)`.
2. **Route Guarding**:
   - A `<ProtectedRoute>` component restricts access to the `/dashboard` route.
   - If no token is detected, users are redirected back to the `/login` route.

---

## Customer Flow Features

### 1. Booking a Journey
- **Component**: `CustomerDashboard.tsx` (Tab: "Book a Ride")
- **Action**: Submits pickup/dropoff text addresses and coordinates (`latitude` / `longitude`).
- **Endpoint**: `POST /api/customer/rides`
- **Result**: Backend estimates route distance, calculates fares (Base ₹30.00 + ₹15.00/km), creates a `requested` booking, and displays the state tracker.

### 2. Active Trip Tracking
- **Component**: `CustomerDashboard.tsx` (Panel: "Active Trip Status")
- **Flow**: Polls or manual-refreshes the latest booking status. Displays assigned driver info and status badges (`requested`, `accepted`, `arrived`, `in_progress`, `completed`).
- **Cancellation**: Customers can cancel requested/accepted trips before they begin via `POST /api/customer/rides/{id}/cancel`.

### 3. Finding Nearby Cabs
- **Component**: `CustomerDashboard.tsx` (Tab: "Search Nearby Drivers")
- **Flow**: Resolves list of available drivers within a specified distance using bounding boxes and precise GPS coordinates.
- **Endpoint**: `GET /api/customer/drivers/nearby`

### 4. History & Review Submissions
- **Component**: `CustomerDashboard.tsx` (Tab: "Ride History" & Review Dialog)
- **Flow**: Displays all historical user rides. Completed trips present a **Rate Trip** button opening an interactive star-rating modal to submit feedback.
- **Endpoint**: `POST /api/customer/rides/{id}/rate`

---

## Driver Flow Features

### 1. Shift Toggles & Scanning Radar
- **Component**: `DriverDashboard.tsx` (Toggle: "Shift" & Waiting State)
- **Flow**: Toggling online updates driver availability (`POST /api/driver/location` with `is_available: true`). Displays an active pulse radar searching for nearby requested rides.

### 2. Accept Incoming Requests
- **Component**: `DriverDashboard.tsx` (Panel: "🚨 NEW RIDE REQUEST FOUND!")
- **Flow**: When online, the client periodically checks `GET /api/driver/rides/requests`. If a nearby customer requests a ride, a pop-up showing locations, estimates, and decline/accept button actions is presented.
- **Acceptance**: Drivers accept trips via `POST /api/driver/rides/{id}/accept`.

### 3. Trip Control Panel
- **Component**: `DriverDashboard.tsx` (Panel: "On the way to Pickup")
- **Flow**: Advanced step buttons to update status (`arrived` -> `in_progress` -> `completed`) calling the `POST /api/driver/rides/{id}/status` endpoint.
- **Status Completed**: The payment status changes to `completed` and the driver shift state becomes available (`is_available: true`) once again.

### 4. Vehicle Details Configuration
- **Component**: `DriverDashboard.tsx` (Modal: "Vehicle Details")
- **Flow**: Edit and save the active vehicle models and plate numbers.

---

## Admin Flow Features

### 1. Statistics Cards Overview
- **Component**: `AdminDashboard.tsx` (Grid: "Earnings", "Completed", "Online Drivers")
- **Endpoint**: `GET /api/admin/dashboard`
- **Result**: Renders total system earnings (calculating the 10% admin cut), count of completed rides, and total online drivers in real-time.

### 2. Driver Roster & Accounts Moderation
- **Component**: `AdminDashboard.tsx` (Table: "Driver Roster")
- **Endpoints**:
  - `GET /api/admin/users?role=driver` to populate the roster.
  - `PATCH /api/admin/users/{id}/status` with body `status: active` or `status: suspended` to instantly suspend/block account access.

### 3. Active Bookings Roster
- **Component**: `AdminDashboard.tsx` (Table: "Active Bookings")
- **Endpoint**: `GET /api/admin/rides`
- **Result**: Displays all rides in intermediate states (`requested`, `accepted`, `arrived`, `in_progress`).

### 4. Direct Driver Registration
- **Component**: `AdminDashboard.tsx` (Modal: "Add New Driver")
- **Flow**: Admins can directly register new driver partner accounts from the control center.
- **Endpoint**: `POST /api/register`

---

## Development commands

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```
