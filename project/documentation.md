# Indian Cabs - Project Documentation

Welcome to the documentation for **Indian Cabs**! This document explains how the project works, what files are in it, and how to use the different panels (Customer, Driver, and Admin) in simple, human-readable language.

---

## 🌟 What is this project?
Indian Cabs is a simulated cab-booking dashboard. It allows you to simulate the entire lifecycle of booking a cab—from a customer requesting a ride, to a driver accepting/completing the ride, and an admin tracking it—all running locally in your web browser.

---

## 🚀 How to open and run the project
Since the project runs entirely on frontend technologies (HTML + CSS + JavaScript), you do not need a complex server to run it. 

1. Simply open **`index.html`** in any web browser.
2. From the landing page, you can choose to enter as a **Customer**, a **Driver**, or the **Admin**.
3. **Tip:** To test the booking flow, open the **Customer Portal** in one browser window/tab and the **Driver Portal** in another window/tab (or an Incognito window) so you can see them side-by-side.

---

## 📁 Project File Structure

Here is a simple explanation of what each file in the project does:

*   **`mock-backend.js`**: The brain of the project. Since we don't have a real database server, this file acts as a database and backend. It stores everything (users, drivers, active bookings, history) directly in your browser's local storage (`localStorage`).
*   **`index.html`**: The main page that lets you choose which portal you want to open.
*   **Customer Files:**
    *   `login.html` & `login.js`: The signup and login page for customers.
    *   `customer.html` & `customer.js`: The booking screen where customers can add money to their wallet, select a vehicle (Car, Auto Rickshaw, or Bike), enter locations, and book rides.
*   **Driver Files:**
    *   `driver_login.html` & `driver_login.js`: The signup and login page for drivers.
    *   `driver.html` & `driver.js`: The dashboard for drivers. Here, they can toggle their status (Online/Offline), set up their vehicle model/license plate, accept new ride requests, start rides, and complete them to earn money.
*   **Admin Files:**
    *   `admin_login.html` & `admin_login.js`: The login page for the administrator.
    *   `admin.html` & `admin.js`: The Control Center where the admin can see total online drivers, current active bookings, total earnings, delete drivers, or reset the entire system.

---

## ⚙️ How the System Rules Work

Here are the important rules that govern how the application behaves:

### 1. Wallet Limitations (₹2000 Cap)
*   A customer's wallet balance cannot exceed **₹2000**.
*   If a customer tries to add money that would exceed this cap (for example, if they have ₹1900 and try to add ₹200), the system will block them and display a friendly message: *"You can only add 100 rupees."*

### 2. Multi-Booking Concurrent Rides
*   Multiple customers can request rides at the same time.
*   The backend automatically tracks all active bookings concurrently.
*   Customers can see their specific ride's progress, and drivers will only see ride requests assigned to them.

### 3. Driver Matching & Shift Status
*   **Shift status:** A driver must toggle their shift to **Online** to receive ride requests.
*   **Category matching:** Customers can select **Car**, **Auto Rickshaw**, or **Bike**. The system will only assign the booking to an online driver who matches that vehicle category.
*   **Decline pause:** If a driver declines a ride, the system will pause for 10 seconds before offering it to them again, giving other online drivers a chance to receive it.
*   **Logout offline:** When a driver logs out of the device, they are automatically set to offline so they disappear from the Admin page and stop receiving ride requests.

### 4. Admin Commission
*   For every completed ride, the driver receives **90%** of the fare, and the system admin receives a **10% commission**. These calculations are updated instantly on the dashboards.

### 5. Wallet Transaction History
*   Customers have access to a **Wallet Transactions** log right inside their dashboard (under the History tab).
*   It keeps a real-time record of all monetary movements:
    *   **Deposits (+):** Logged when the customer recharges their wallet.
    *   **Payments (-):** Logged when the customer books a ride.
    *   **Refunds (+):** Logged when a ride is cancelled before start.

