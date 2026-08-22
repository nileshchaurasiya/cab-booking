<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CustomerRideController;
use App\Http\Controllers\DriverController;
use App\Http\Controllers\AdminController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Customer-only routes
    Route::middleware('role:customer')->group(function () {
        Route::get('/customer/drivers/nearby', [CustomerRideController::class, 'nearbyDrivers']);
        Route::post('/customer/rides', [CustomerRideController::class, 'store']);
        Route::get('/customer/rides', [CustomerRideController::class, 'index']);
        Route::get('/customer/rides/{id}', [CustomerRideController::class, 'show']);
        Route::post('/customer/rides/{id}/cancel', [CustomerRideController::class, 'cancel']);
        Route::post('/customer/rides/{id}/rate', [CustomerRideController::class, 'rate']);
    });

    // Driver-only routes
    Route::middleware('role:driver')->group(function () {
        Route::post('/driver/location', [DriverController::class, 'updateLocation']);
        Route::get('/driver/rides/requests', [DriverController::class, 'rideRequests']);
        Route::post('/driver/rides/{id}/accept', [DriverController::class, 'acceptRide']);
        Route::post('/driver/rides/{id}/status', [DriverController::class, 'updateStatus']);
        Route::get('/driver/rides', [DriverController::class, 'rideHistory']);
        Route::post('/driver/vehicle', [DriverController::class, 'registerVehicle']);
        Route::put('/driver/vehicle', [DriverController::class, 'updateVehicle']);
        Route::delete('/driver/vehicle', [DriverController::class, 'deleteVehicle']);
    });

    // Admin-only routes
    Route::middleware('role:admin')->group(function () {
        Route::get('/admin/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/admin/users', [AdminController::class, 'users']);
        Route::patch('/admin/users/{id}/status', [AdminController::class, 'updateUserStatus']);
        Route::get('/admin/rides', [AdminController::class, 'rides']);
    });
});
