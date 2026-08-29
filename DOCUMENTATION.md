# Cab Booking Management System
### Project Documentation

---

## Table of Contents

| Sr. No. | Topic | Page |
|---------|-------|------|
| 1 | Introduction | 2 |
| 2 | Limitation of Existing System | 3 |
| 3 | Objectives | 4 |
| 4 | Scope | 5 |
| | 4.1 Functional Scope | 5 |
| | 4.2 Technical Scope | 6 |
| 5 | Technology Stack Detailed Analysis | 7 |
| 6 | Advantages | 9 |
| 7 | System Design | 10 |
| | 7.1 System Modules & Use Cases | 10 |
| | 7.2 Database Design | 13 |
| 8 | Screenshots | 16 |
| 9 | ER-Diagram | 17 |
| 10 | Software Testing | 18 |
| | 10.1 Detailed Test Cases | 19 |
| 11 | References | 23 |
| 12 | Bibliography | 24 |

---

## 1. Introduction

The **Cab Booking Management System** is a full-stack web application that provides an end-to-end solution for booking, managing, and tracking cab rides in real time. The system connects three types of users — **Customers**, **Drivers**, and **Administrators** — through a unified digital platform.

Customers can register, log in, select pickup and drop-off locations, choose a vehicle type, view an estimated fare, and confirm their booking. Drivers receive ride requests in real time, can accept or decline them, and update ride status through various stages (accepted → on the way → started → completed). Administrators have full control over users, rides, drivers, payments, and commissions.

The platform is built as a modern **Single Page Application (SPA)** using React (TypeScript) on the frontend, with support for **two interchangeable backends**:
- **Node.js + Express + MongoDB** (default)
- **Laravel (PHP) + MySQL** (optional)

This dual-backend architecture makes the system highly flexible and allows it to be deployed with either a NoSQL or a relational database without changing the frontend code.

---

## 2. Limitation of Existing System

Traditional cab booking methods and early-generation systems have the following major limitations:

| # | Limitation | Description |
|---|-----------|-------------|
| 1 | **Manual Booking** | Customers must call the cab company or physically visit a stand to book a ride. There is no self-service option. |
| 2 | **No Real-Time Tracking** | Existing paper-based or phone-based systems provide no live location or status tracking of the driver. |
| 3 | **No Fare Estimation** | Customers do not know the estimated cost before booking. Fare disputes are common. |
| 4 | **Cash Only Payments** | Traditional systems rely entirely on cash, offering no wallet or digital payment support. |
| 5 | **No Driver Management** | Admins cannot manage drivers digitally — vehicle registration, status, and availability are tracked manually. |
| 6 | **No Feedback Mechanism** | There is no formal system for customers to rate drivers or submit reviews after a trip. |
| 7 | **No Commission Tracking** | Admins cannot view or configure driver commissions automatically. All commission calculations are manual. |
| 8 | **No Cancellation Feature** | In many existing systems, customers and drivers cannot cancel rides digitally, causing confusion and miscommunication. |
| 9 | **Data Loss Risk** | Paper-based records are prone to loss, damage, and human error. |
| 10 | **No Role-Based Access** | All users access the same interface, creating security and usability issues. |

---

## 3. Objectives

The primary objectives of the Cab Booking Management System are:

1. **Automate the Booking Process** — Allow customers to book rides online without any manual intervention from the cab company.

2. **Real-Time Ride Status Updates** — Provide live status updates to customers (e.g., Driver Accepted → On the Way → Ride Started → Completed).

3. **Fare Estimation Before Booking** — Calculate and display an estimated fare based on distance, duration, and vehicle type before the customer confirms the booking.

4. **Digital Wallet System** — Implement an in-app wallet so customers can add funds and pay for rides without cash.

5. **Role-Based Access Control** — Ensure Customers, Drivers, and Admins have their own dedicated dashboards and permissions.

6. **Driver Management** — Allow drivers to register their vehicle, manage availability, accept/decline ride requests, and track their earnings.

7. **Admin Control Panel** — Give administrators full visibility into rides, users, payments, and driver commissions with the ability to manage all entities.

8. **Rating & Review System** — Allow customers to rate drivers after completed rides to maintain service quality.

9. **Ride Cancellation Support** — Allow both customers and drivers to cancel rides, with proper state management.

10. **Dual Backend Support** — Support both MongoDB (Node.js) and MySQL (Laravel/PHP) backends without changing frontend code.

---

## 4. Scope

### 4.1 Functional Scope

The system covers the following functional areas:

#### Customer Module
- User Registration and Login (with JWT token authentication)
- Browse and select Pickup and Drop-off locations (with coordinate support)
- Choose Vehicle Type: Car, Bike, or Rickshaw
- View Distance and Estimated Fare before booking
- Confirm and Submit Ride Booking
- Track Ride Status in real time
- Cancel an active booking
- Add funds to digital Wallet
- Pay for rides using Wallet balance
- View Ride History
- Submit Driver Rating and Review after trip completion

#### Driver Module
- Driver Registration and Login
- Register / Update / Delete Vehicle Details (license, model, plate, color, type)
- Toggle Online/Offline availability
- View incoming Ride Requests from nearby customers
- Accept or Decline Ride Requests
- Update Ride Status through stages:
  - `accepted` → `waiting_for_customer` → `in_progress` → `completed`
- Cancel an accepted ride
- View completed ride history and earnings
- Receive payment via customer's wallet

#### Admin Module
- Manage all Customers (view, suspend, delete)
- Manage all Drivers (view, suspend, delete)
- View and manage all Rides
- View all Payments and Transactions
- Set and manage Driver Commission rates
- View system-wide statistics (total rides, total revenue, active drivers, etc.)

### 4.2 Technical Scope

| Area | Details |
|------|---------|
| **Frontend** | React 18 (TypeScript), Vite, CSS Modules |
| **Backend Option 1** | Node.js, Express.js, MongoDB, Mongoose, JWT |
| **Backend Option 2** | Laravel 11 (PHP), MySQL, Eloquent ORM, Laravel Sanctum |
| **Authentication** | JWT Bearer Token (both backends) |
| **API Style** | RESTful API (JSON) |
| **Platform** | Web Application (Desktop and Mobile browsers) |
| **Deployment** | Local development with `sh start.sh` |
| **Version Control** | Git |

---

## 5. Technology Stack Detailed Analysis

### 5.1 Frontend — React (TypeScript) + Vite

| Property | Detail |
|----------|--------|
| **Framework** | React 18 |
| **Language** | TypeScript (TSX) |
| **Build Tool** | Vite |
| **Styling** | Vanilla CSS with custom design tokens |
| **State Management** | React Hooks (useState, useEffect) |
| **HTTP Client** | Fetch API (custom `apiRequest` wrapper) |
| **Dev Port** | http://localhost:5173 |

**Why React + TypeScript?**
React provides a component-based architecture that makes it easy to build and maintain complex UIs. TypeScript adds static typing, which reduces runtime errors and improves code maintainability. Vite is used as the build tool for its extremely fast Hot Module Replacement (HMR).

---

### 5.2 Backend Option 1 — Node.js + Express + MongoDB

| Property | Detail |
|----------|--------|
| **Runtime** | Node.js |
| **Framework** | Express.js |
| **Database** | MongoDB (NoSQL) |
| **ODM** | Mongoose |
| **Authentication** | JSON Web Token (JWT) + bcryptjs |
| **API Port** | http://localhost:8000 |

**Why Node.js + MongoDB?**
Node.js is fast, lightweight, and uses a non-blocking I/O model, making it ideal for real-time applications. MongoDB's document-based schema is flexible — perfect for rapidly evolving data like ride requests and driver locations. Mongoose provides schema validation and virtual populate features.

---

### 5.3 Backend Option 2 — Laravel (PHP) + MySQL

| Property | Detail |
|----------|--------|
| **Framework** | Laravel 11 |
| **Language** | PHP 8.2+ |
| **Database** | MySQL (Relational) |
| **ORM** | Eloquent |
| **Authentication** | Laravel Sanctum (Bearer Token) |
| **API Port** | http://localhost:8000 |

**Why Laravel + MySQL?**
Laravel is a mature, full-featured PHP framework with built-in support for migrations, authentication, middleware, and validation. MySQL is the most widely deployed relational database and is supported by XAMPP, making it accessible for academic and production environments. Both backends expose the **same API endpoints**, making them completely interchangeable.

---

### 5.4 Start Scripts (Bash)

| Command | Backend | Database |
|---------|---------|----------|
| `sh start.sh` | Node.js | MongoDB |
| `sh start.sh node` | Node.js | MongoDB |
| `sh start.sh php` | Laravel | MySQL |

The `start.sh` script is written in **Bash** shell language. It:
1. Detects which backend to start from the argument (`$1`)
2. Automatically starts the required database service
3. Starts the backend API server
4. Starts the React frontend dev server

---

## 6. Advantages

| # | Advantage | Description |
|---|-----------|-------------|
| 1 | **Dual Backend** | Supports both Node.js + MongoDB and Laravel + MySQL — no other booking system in academic projects offers this flexibility. |
| 2 | **Single Command Start** | The entire system (database + backend + frontend) starts with one command: `sh start.sh`. |
| 3 | **Role-Based Security** | Separate dashboards and API middleware for Customer, Driver, and Admin roles prevent unauthorized access. |
| 4 | **Digital Wallet** | Customers can pre-load their wallet and pay instantly — no cash handling required. |
| 5 | **Fare Estimation** | Distance and estimated fare are calculated before booking, giving full transparency to the customer. |
| 6 | **Real-Time Status** | Ride status updates in real time without page refresh (polling-based). |
| 7 | **Vehicle Diversity** | Supports Car (Sedan, SUV, Hatchback), Bike, and Rickshaw vehicle types. |
| 8 | **Commission Management** | Admin can configure driver commission rates through the dashboard. |
| 9 | **Review System** | Post-trip rating and review ensures driver quality control. |
| 10 | **Password Security** | All passwords are hashed using bcrypt before storage — plain text passwords are never saved. |
| 11 | **XAMPP Compatible** | The Laravel backend can be used with XAMPP MySQL — no additional tools required. |
| 12 | **TypeScript Frontend** | TypeScript provides compile-time type checking, reducing bugs in the frontend. |

---

## 7. System Design

### 7.1 System Modules & Use Cases

#### System Architecture

```
┌─────────────────────────────────────────────────────┐
│                  React Frontend                      │
│              http://localhost:5173                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Customer │  │  Driver  │  │      Admin       │  │
│  │Dashboard │  │Dashboard │  │    Dashboard     │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
└───────┼─────────────┼─────────────────┼────────────┘
        │             │                 │
        │    Bearer Token (JWT)         │
        │             │                 │
┌───────▼─────────────▼─────────────────▼────────────┐
│              REST API  http://localhost:8000          │
│  ┌──────────────────────┐  ┌───────────────────────┐│
│  │  Node.js + Express   │  │   Laravel (PHP)        ││
│  │  (default backend)   │  │   (optional backend)   ││
│  └──────────┬───────────┘  └──────────┬────────────┘│
└─────────────┼────────────────────────┼─────────────┘
              │                        │
    ┌─────────▼───────┐    ┌──────────▼──────────┐
    │    MongoDB       │    │       MySQL          │
    │  (NoSQL)         │    │   (Relational)       │
    └──────────────────┘    └─────────────────────┘
```

---

#### Use Case 1 — Customer Books a Ride

```
Customer
   │
   ├─→ Register / Login
   │        └─→ Receive JWT Token
   │
   ├─→ Enter Pickup Location
   │
   ├─→ Enter Drop-off Location
   │        └─→ System calculates Distance and Duration
   │
   ├─→ Select Vehicle Type (Car / Bike / Rickshaw)
   │        └─→ System calculates Estimated Fare
   │
   ├─→ Confirm Booking
   │        └─→ Ride created with status: "requested"
   │
   ├─→ Wait for Driver to Accept
   │        └─→ Status updates: "accepted" → "in_progress" → "completed"
   │
   ├─→ Wallet Payment deducted on completion
   │
   └─→ Submit Rating and Review
```

---

#### Use Case 2 — Driver Accepts a Ride

```
Driver
   │
   ├─→ Register / Login
   │
   ├─→ Register Vehicle (license, model, plate, type)
   │
   ├─→ Go Online (set is_available = true)
   │
   ├─→ View Ride Requests
   │
   ├─→ Accept Request
   │        └─→ Ride status: "accepted"
   │
   ├─→ Arrive at Pickup → status: "waiting_for_customer"
   │
   ├─→ Start Ride → status: "in_progress"
   │
   └─→ Complete Ride → status: "completed"
              └─→ Wallet payment received (minus commission)
```

---

#### Use Case 3 — Admin Manages the System

```
Admin
   │
   ├─→ Login with Admin credentials
   │
   ├─→ View Dashboard Statistics
   │        ├─→ Total Rides
   │        ├─→ Total Revenue
   │        ├─→ Active Drivers
   │        └─→ Active Customers
   │
   ├─→ Manage Users
   │        ├─→ View all Customers
   │        ├─→ View all Drivers
   │        └─→ Suspend / Delete Users
   │
   ├─→ Manage Rides
   │        └─→ View all rides and their statuses
   │
   └─→ Manage Commissions
            └─→ Set driver commission percentage
```

---

#### Ride Status Flow

```
  [requested]
      │
      ▼  Driver Accepts
  [accepted]
      │
      ▼  Driver Arrives at Pickup
  [waiting_for_customer]
      │
      ▼  Customer Boards Vehicle
  [in_progress]
      │
      ▼  Trip Ends
  [completed]

  At any stage before completed:
      └─→ [cancelled]  (by Customer or Driver)
```

---

### 7.2 Database Design

#### MongoDB Collections (Node.js Backend)

---

**Collection: users**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary Key |
| `name` | String | Full name of user |
| `email` | String | Unique email address |
| `phone` | String | Unique phone number |
| `password` | String | Bcrypt hashed password |
| `role` | Enum | customer, driver, admin |
| `status` | Enum | active, suspended |
| `createdAt` | Date | Auto timestamp |
| `updatedAt` | Date | Auto timestamp |

---

**Collection: driverdetails**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary Key |
| `user_id` | ObjectId | Foreign Key to users |
| `license_number` | String | Unique driving license |
| `vehicle_model` | String | e.g., Honda City |
| `vehicle_plate_number` | String | Unique plate number |
| `vehicle_color` | String | e.g., White |
| `vehicle_type` | Enum | sedan, suv, hatchback, bike, rickshaw |
| `is_available` | Boolean | Online/Offline status |
| `current_latitude` | Number | GPS latitude |
| `current_longitude` | Number | GPS longitude |
| `rating` | Number | Average rating (default 5.0) |

---

**Collection: rides**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary Key |
| `customer_id` | ObjectId | Foreign Key to users |
| `driver_id` | ObjectId | Foreign Key to users |
| `pickup_address` | String | Pickup location name |
| `dropoff_address` | String | Drop-off location name |
| `pickup_latitude` | Number | GPS latitude |
| `pickup_longitude` | Number | GPS longitude |
| `dropoff_latitude` | Number | GPS latitude |
| `dropoff_longitude` | Number | GPS longitude |
| `status` | Enum | requested, accepted, waiting_for_customer, in_progress, completed, cancelled |
| `vehicle_type` | String | e.g., Car, Bike, Rickshaw |
| `fare` | Number | Estimated fare (Rs.) |
| `distance` | Number | Distance in km |
| `duration` | Number | Duration in minutes |
| `scheduled_at` | Date | Scheduled time (optional) |
| `createdAt` | Date | Auto timestamp |

---

**Collection: payments**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary Key |
| `ride_id` | ObjectId | Foreign Key to rides |
| `customer_id` | ObjectId | Foreign Key to users |
| `driver_id` | ObjectId | Foreign Key to users |
| `amount` | Number | Total fare paid |
| `commission` | Number | Admin commission deducted |
| `driver_earnings` | Number | Net driver payment |
| `payment_method` | Enum | wallet, cash |
| `status` | Enum | pending, completed, refunded |

---

**Collection: wallets**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary Key |
| `user_id` | ObjectId | Foreign Key to users |
| `balance` | Number | Current wallet balance (Rs.) |

---

**Collection: wallettransactions**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary Key |
| `wallet_id` | ObjectId | Foreign Key to wallets |
| `type` | Enum | credit, debit |
| `amount` | Number | Transaction amount |
| `description` | String | e.g., "Ride Payment", "Top-up" |
| `createdAt` | Date | Auto timestamp |

---

**Collection: reviews**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary Key |
| `ride_id` | ObjectId | Foreign Key to rides |
| `reviewer_id` | ObjectId | Foreign Key to users (customer) |
| `reviewee_id` | ObjectId | Foreign Key to users (driver) |
| `rating` | Number | 1 to 5 star rating |
| `comment` | String | Review text |
| `createdAt` | Date | Auto timestamp |

---

## 8. Screenshots

> The following screens are available in the running application at http://localhost:5173

| Screen | URL | Description |
|--------|-----|-------------|
| Login / Register | `/login` | Role-based login for Customer, Driver, Admin |
| Customer Dashboard | `/customer` | Booking form, active ride, wallet, history |
| Driver Dashboard | `/driver` | Ride requests, trip controls, earnings |
| Admin Dashboard | `/admin` | User management, rides, commissions |

---

## 9. ER-Diagram

```
┌─────────────┐        ┌──────────────────┐
│    USERS    │        │  DRIVER_DETAILS  │
├─────────────┤        ├──────────────────┤
│ _id (PK)    │1──────1│ _id (PK)         │
│ name        │        │ user_id (FK)     │
│ email       │        │ license_number   │
│ phone       │        │ vehicle_model    │
│ password    │        │ vehicle_plate    │
│ role        │        │ vehicle_color    │
│ status      │        │ vehicle_type     │
└──────┬──────┘        │ is_available     │
       │               │ latitude         │
       │               │ longitude        │
       │               │ rating           │
       │               └──────────────────┘
       │
       ├──────────────────────────────────────────────┐
       │ 1                                            │ 1
       ▼ N                                            ▼ N
┌─────────────┐                           ┌──────────────────────────┐
│    RIDES    │                           │         WALLETS          │
├─────────────┤                           ├──────────────────────────┤
│ _id (PK)    │                           │ _id (PK)                 │
│ customer_id │                           │ user_id (FK)             │
│ driver_id   │                           │ balance                  │
│ pickup_addr │                           └────────────┬─────────────┘
│ dropoff_addr│                                        │ 1
│ fare        │                                        ▼ N
│ distance    │                           ┌──────────────────────────┐
│ duration    │                           │   WALLET_TRANSACTIONS    │
│ status      │                           ├──────────────────────────┤
│ vehicle_type│                           │ _id (PK)                 │
└──────┬──────┘                           │ wallet_id (FK)           │
       │                                  │ type (credit/debit)      │
       │ 1                                │ amount                   │
       ├──────────────────────────────────│ description              │
       │                                  └──────────────────────────┘
       │ 1
       ▼
┌─────────────┐        ┌──────────────────────────┐
│  PAYMENTS   │        │         REVIEWS          │
├─────────────┤        ├──────────────────────────┤
│ _id (PK)    │        │ _id (PK)                 │
│ ride_id(FK) │1──────1│ ride_id (FK)             │
│ customer_id │        │ reviewer_id (FK)         │
│ driver_id   │        │ reviewee_id (FK)         │
│ amount      │        │ rating (1-5)             │
│ commission  │        │ comment                  │
│ driver_earn │        └──────────────────────────┘
│ method      │
│ status      │
└─────────────┘
```

---

## 10. Software Testing

The system has been tested across three levels:

- **Unit Testing** — Individual functions and API endpoints tested in isolation
- **Integration Testing** — Frontend to backend API calls tested end-to-end
- **System Testing** — Full user flows tested from registration to ride completion

### 10.1 Detailed Test Cases

#### Module: Authentication

| TC# | Test Case | Input | Expected Output | Status |
|-----|-----------|-------|----------------|--------|
| TC01 | Customer Registration | Valid name, email, phone, password | Account created, JWT token returned | Pass |
| TC02 | Customer Login | Valid email + password | JWT token returned, redirect to dashboard | Pass |
| TC03 | Login with wrong password | Wrong password | 401 Unauthorized | Pass |
| TC04 | Register with existing email | Duplicate email | 422 Validation Error | Pass |
| TC05 | Password and Confirm Password mismatch | Different passwords | Error shown before API call | Pass |
| TC06 | Driver Login | Driver email + password | JWT token, redirect to driver dashboard | Pass |
| TC07 | Admin Login | Admin email + password | JWT token, redirect to admin dashboard | Pass |

---

#### Module: Booking Flow

| TC# | Test Case | Input | Expected Output | Status |
|-----|-----------|-------|----------------|--------|
| TC08 | Estimated fare with no location | Empty pickup/drop | Fare = Rs.0 | Pass |
| TC09 | Estimated fare after selecting locations | Valid pickup + drop + vehicle | Correct fare calculated | Pass |
| TC10 | Submit booking with all fields | All required fields | Ride created, status = "requested" | Pass |
| TC11 | Submit booking without vehicle type | No vehicle selected | Validation error shown | Pass |
| TC12 | Submit booking with low wallet balance | Balance less than fare | Booking rejected with error | Pass |
| TC13 | Booking with Car type | Vehicle = Car | Fare calculated at Car rate | Pass |
| TC14 | Booking with Bike type | Vehicle = Bike | Fare calculated at Bike rate | Pass |
| TC15 | Booking with Rickshaw type | Vehicle = Rickshaw | Fare calculated at Rickshaw rate | Pass |

---

#### Module: Driver Operations

| TC# | Test Case | Input | Expected Output | Status |
|-----|-----------|-------|----------------|--------|
| TC16 | Driver registers vehicle | All vehicle fields | Vehicle saved to DB | Pass |
| TC17 | Driver registers with duplicate license | Existing license number | 422 Validation Error | Pass |
| TC18 | Driver goes online | is_available = true | Status updated, appears in ride requests | Pass |
| TC19 | Driver accepts a ride | Ride ID + accept | Ride status = "accepted" | Pass |
| TC20 | Driver updates status to in_progress | status = "in_progress" | Ride status updated | Pass |
| TC21 | Driver completes a ride | status = "completed" | Payment created, wallet deducted | Pass |
| TC22 | Driver cancels a ride | POST /driver/rides/:id/cancel | Ride cancelled, driver marked available | Pass |
| TC23 | Driver cancels already completed ride | Cancel after completion | 422 Error returned | Pass |

---

#### Module: Customer Cancellation

| TC# | Test Case | Input | Expected Output | Status |
|-----|-----------|-------|----------------|--------|
| TC24 | Customer cancels pending ride | Cancel before driver accepts | Ride cancelled, page reloads | Pass |
| TC25 | Customer cancels accepted ride | Cancel after driver accepts | Ride cancelled | Pass |
| TC26 | Customer cancels completed ride | Cancel after completion | 422 Error | Pass |

---

#### Module: Wallet

| TC# | Test Case | Input | Expected Output | Status |
|-----|-----------|-------|----------------|--------|
| TC27 | Add funds to wallet | Amount = Rs.500 | Wallet balance increases | Pass |
| TC28 | Wallet deducted after ride | Completed ride | Balance decreases by fare | Pass |
| TC29 | View wallet transaction history | Click Transactions | List of credits and debits shown | Pass |

---

#### Module: Admin

| TC# | Test Case | Input | Expected Output | Status |
|-----|-----------|-------|----------------|--------|
| TC30 | Admin views all users | Open Users tab | All customers and drivers listed | Pass |
| TC31 | Admin suspends a driver | Click Suspend | Driver status = "suspended" | Pass |
| TC32 | Admin adds new driver | Fill driver form | Driver account created | Pass |
| TC33 | Admin views all rides | Open Rides tab | All rides with status shown | Pass |
| TC34 | Admin sets commission | Enter commission % | Commission saved | Pass |

---

#### Module: Backend Switching

| TC# | Test Case | Input | Expected Output | Status |
|-----|-----------|-------|----------------|--------|
| TC35 | Start with Node.js | `sh start.sh` | Node + MongoDB backend running | Pass |
| TC36 | Start with PHP | `sh start.sh php` | Laravel + MySQL backend running | Pass |
| TC37 | API endpoints same on both backends | Same request | Same JSON response format | Pass |

---

## 11. References

1. React Documentation — https://react.dev/
2. TypeScript Documentation — https://www.typescriptlang.org/docs/
3. Vite Documentation — https://vitejs.dev/guide/
4. Node.js Documentation — https://nodejs.org/en/docs/
5. Express.js Documentation — https://expressjs.com/en/4x/api.html
6. MongoDB Documentation — https://www.mongodb.com/docs/
7. Mongoose Documentation — https://mongoosejs.com/docs/guide.html
8. Laravel 11 Documentation — https://laravel.com/docs/11.x
9. Laravel Sanctum — https://laravel.com/docs/11.x/sanctum
10. MySQL Documentation — https://dev.mysql.com/doc/
11. JSON Web Token (JWT) — https://jwt.io/introduction
12. bcryptjs npm package — https://www.npmjs.com/package/bcryptjs
13. Bash Scripting Guide — https://tldp.org/LDP/Bash-Beginners-Guide/html/

---

## 12. Bibliography

1. Flanagan, D. (2020). *JavaScript: The Definitive Guide* (7th ed.). O'Reilly Media.
2. Frisbie, M. (2022). *Professional JavaScript for Web Developers* (5th ed.). Wiley.
3. Lockhart, J. (2015). *Modern PHP: New Features and Good Practices*. O'Reilly Media.
4. Banks, A., and Porcello, E. (2017). *Learning React*. O'Reilly Media.
5. Chodorow, K. (2013). *MongoDB: The Definitive Guide*. O'Reilly Media.
6. DuBois, P. (2013). *MySQL* (5th ed.). Addison-Wesley Professional.
7. Wieruch, R. (2022). *The Road to React*. Self-published — https://www.roadtoreact.com/
8. PHP Manual — Zend Technologies. Retrieved from https://www.php.net/manual/en/
9. MDN Web Docs — Mozilla Foundation. Retrieved from https://developer.mozilla.org/

---

*Document prepared for the Cab Booking Management System project.*  
*Last Updated: August 2026*
