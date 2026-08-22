# Cab Booking System - API Documentation

This document describes all available API endpoints, authentication mechanisms, request/response formats, and role restrictions for the Cab Booking System backend.

---

## Base URL
All API requests are prefixed with `/api`.
* Local development default: `http://localhost:8000/api`

---

## Authentication & Headers
Authentication is handled via **Laravel Sanctum** token-based access.

### Headers Required for Authenticated Routes
```http
Accept: application/json
Content-Type: application/json
Authorization: Bearer <your_access_token>
```

---

## 1. Authentication Endpoints

### Register User
* **Method**: `POST`
* **Endpoint**: `/register`
* **Access**: Public
* **Request Body (Customer)**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "password": "password123",
    "password_confirmation": "password123",
    "role": "customer"
  }
  ```
* **Request Body (Driver)**:
  ```json
  {
    "name": "Jane Driver",
    "email": "jane@example.com",
    "phone": "+1234567891",
    "password": "password123",
    "password_confirmation": "password123",
    "role": "driver",
    "license_number": "DL-987654321",
    "vehicle_model": "Toyota Prius",
    "vehicle_plate_number": "TX-777-YY",
    "vehicle_color": "White",
    "vehicle_type": "sedan" // sedan, suv, hatchback, bike
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "customer",
      "status": "active",
      "created_at": "2026-08-22T06:20:52.000000Z",
      "updated_at": "2026-08-22T06:20:52.000000Z",
      "driver_detail": null
    },
    "access_token": "1|abcdefghijklmnop...",
    "token_type": "Bearer"
  }
  ```

### Login
* **Method**: `POST`
* **Endpoint**: `/login`
* **Access**: Public
* **Request Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "customer",
      "status": "active"
    },
    "access_token": "2|qrstuvwxyz...",
    "token_type": "Bearer"
  }
  ```

### Get Authenticated User Profile
* **Method**: `GET`
* **Endpoint**: `/me`
* **Access**: Authenticated (Token required)
* **Response (200 OK)**:
  ```json
  {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "customer",
      "status": "active",
      "driver_detail": null
    }
  }
  ```

### Logout
* **Method**: `POST`
* **Endpoint**: `/logout`
* **Access**: Authenticated (Token required)
* **Response (200 OK)**:
  ```json
  {
    "message": "Logged out successfully."
  }
  ```

---

## 2. Customer Endpoints
All customer routes require the authorization token and the user's role to be `customer`.

### Search Nearby Drivers
Find available drivers near a specific coordinate.
* **Method**: `GET`
* **Endpoint**: `/customer/drivers/nearby`
* **Query Parameters**:
  * `latitude` (Required, numeric)
  * `longitude` (Required, numeric)
  * `radius` (Optional, numeric, defaults to 10)
* **Response (200 OK)**:
  ```json
  {
    "drivers": [
      {
        "id": 1,
        "user_id": 2,
        "license_number": "DL-987654321",
        "vehicle_model": "Toyota Prius",
        "vehicle_plate_number": "TX-777-YY",
        "vehicle_color": "White",
        "vehicle_type": "sedan",
        "is_available": true,
        "current_latitude": 12.9715978,
        "current_longitude": 77.5945627,
        "rating": 4.85,
        "distance": 0.05,
        "user": {
          "id": 2,
          "name": "Jane Driver",
          "phone": "+1234567891"
        }
      }
    ]
  }
  ```

### Book / Request a Ride
Calculate distance & fare estimates, create a pending booking request, and set up a pending payment entry.
* **Method**: `POST`
* **Endpoint**: `/customer/rides`
* **Request Body**:
  ```json
  {
    "pickup_address": "MG Road, Bangalore",
    "dropoff_address": "Indiranagar, Bangalore",
    "pickup_latitude": 12.9716000,
    "pickup_longitude": 77.5946000,
    "dropoff_latitude": 12.9784000,
    "dropoff_longitude": 77.6408000,
    "payment_method": "cash" // cash, card, wallet
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "message": "Ride requested successfully. Searching for nearby drivers...",
    "ride": {
      "id": 5,
      "customer_id": 1,
      "pickup_address": "MG Road, Bangalore",
      "dropoff_address": "Indiranagar, Bangalore",
      "pickup_latitude": 12.9716,
      "pickup_longitude": 77.5946,
      "dropoff_latitude": 12.9784,
      "dropoff_longitude": 77.6408,
      "status": "requested",
      "fare": 105.50,
      "distance": 5.03,
      "duration": 11,
      "created_at": "2026-08-22T06:40:00.000000Z",
      "updated_at": "2026-08-22T06:40:00.000000Z",
      "payment": {
        "id": 5,
        "ride_id": 5,
        "payment_method": "cash",
        "payment_status": "pending",
        "amount": 105.50
      }
    }
  }
  ```

### List Ride History
* **Method**: `GET`
* **Endpoint**: `/customer/rides`
* **Response (200 OK - Paginated)**:
  ```json
  {
    "current_page": 1,
    "data": [
      {
        "id": 5,
        "status": "requested",
        "pickup_address": "MG Road, Bangalore",
        "dropoff_address": "Indiranagar, Bangalore",
        "fare": 105.50,
        "payment": { ... },
        "driver": null
      }
    ],
    "total": 1
  }
  ```

### Cancel Requested Ride
Cancel a trip that is in `'requested'` or `'accepted'` status.
* **Method**: `POST`
* **Endpoint**: `/customer/rides/{id}/cancel`
* **Response (200 OK)**:
  ```json
  {
    "message": "Ride cancelled successfully.",
    "ride": {
      "id": 5,
      "status": "cancelled"
    }
  }
  ```

### Rate Driver / Trip
Submit a rating for a driver once a trip status becomes `'completed'`.
* **Method**: `POST`
* **Endpoint**: `/customer/rides/{id}/rate`
* **Request Body**:
  ```json
  {
    "rating": 5, // 1 to 5
    "comment": "Safe driving and arrived early!" // Optional
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "message": "Review submitted successfully.",
    "review": {
      "id": 1,
      "ride_id": 5,
      "reviewer_id": 1,
      "reviewee_id": 2,
      "rating": 5,
      "comment": "Safe driving and arrived early!"
    }
  }
  ```

---

## 3. Driver Endpoints
All driver routes require the authorization token and the user's role to be `driver`.

### Update Location & Availability
Broadcast location updates and toggle availability status.
* **Method**: `POST`
* **Endpoint**: `/driver/location`
* **Request Body**:
  ```json
  {
    "latitude": 12.9716,
    "longitude": 77.5946,
    "is_available": true
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "message": "Location and availability updated successfully.",
    "driver_detail": {
      "user_id": 2,
      "is_available": true,
      "current_latitude": 12.9716,
      "current_longitude": 77.5946
    }
  }
  ```

### View Nearby Ride Requests
* **Method**: `GET`
* **Endpoint**: `/driver/rides/requests`
* **Response (200 OK)**:
  ```json
  {
    "requests": [
      {
        "id": 5,
        "pickup_address": "MG Road, Bangalore",
        "dropoff_address": "Indiranagar, Bangalore",
        "distance": 0.05,
        "customer": {
          "id": 1,
          "name": "John Doe",
          "phone": "+1234567890"
        }
      }
    ]
  }
  ```

### Accept a Ride Booking
* **Method**: `POST`
* **Endpoint**: `/driver/rides/{id}/accept`
* **Response (200 OK)**:
  ```json
  {
    "message": "Ride request accepted successfully.",
    "ride": {
      "id": 5,
      "driver_id": 2,
      "status": "accepted"
    }
  }
  ```

### Update Trip Progress Status
Advance a trip status (logical cycle: `accepted` -> `arrived` -> `in_progress` -> `completed`).
* **Method**: `POST`
* **Endpoint**: `/driver/rides/{id}/status`
* **Request Body**:
  ```json
  {
    "status": "in_progress" // arrived, in_progress, completed
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "message": "Ride status updated to: in_progress.",
    "ride": {
      "id": 5,
      "status": "in_progress"
    }
  }
  ```

---

## 4. Admin Endpoints
All admin routes require the authorization token and the user's role to be `admin`.

### Dashboard Stats
* **Method**: `GET`
* **Endpoint**: `/admin/dashboard`
* **Response (200 OK)**:
  ```json
  {
    "stats": {
      "total_earnings": 15000.50,
      "total_completed_rides": 124,
      "total_users": 350,
      "active_drivers_online": 18
    }
  }
  ```

### List and Filter Users
* **Method**: `GET`
* **Endpoint**: `/admin/users`
* **Query Parameters (Optional)**:
  * `role` (customer/driver/admin)
  * `status` (active/suspended)
  * `search` (Search by Name, Email, or Phone)
* **Response (200 OK - Paginated)**:
  ```json
  {
    "current_page": 1,
    "data": [
      {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "role": "customer",
        "status": "active"
      }
    ]
  }
  ```

### Suspend / Activate User Account
* **Method**: `PATCH`
* **Endpoint**: `/admin/users/{id}/status`
* **Request Body**:
  ```json
  {
    "status": "suspended" // active, suspended
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "message": "User account status updated to: suspended.",
    "user": {
      "id": 1,
      "status": "suspended"
    }
  }
  ```
