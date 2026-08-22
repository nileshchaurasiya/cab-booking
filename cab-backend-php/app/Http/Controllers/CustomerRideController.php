<?php

namespace App\Http\Controllers;

use App\Models\Ride;
use App\Models\User;
use App\Models\DriverDetail;
use App\Models\Payment;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerRideController extends Controller
{
    /**
     * Find nearby available drivers using Haversine formula.
     */
    public function nearbyDrivers(Request $request)
    {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'radius' => 'nullable|numeric|min:1', // search radius in km
        ]);

        $lat = $request->latitude;
        $lon = $request->longitude;
        $radius = $request->radius ?? 10; // Default 10km radius

        // Bounding box limits for optimization (1 degree latitude is approx 111km)
        $latDelta = $radius / 111.0;
        $lonDelta = $radius / (111.0 * cos(deg2rad($lat)));

        $minLat = $lat - $latDelta;
        $maxLat = $lat + $latDelta;
        $minLon = $lon - $lonDelta;
        $maxLon = $lon + $lonDelta;

        $drivers = DriverDetail::where('is_available', true)
            ->whereBetween('current_latitude', [$minLat, $maxLat])
            ->whereBetween('current_longitude', [$minLon, $maxLon])
            ->with('user:id,name,phone')
            ->get()
            ->map(function ($driver) use ($lat, $lon) {
                // Calculate distance in PHP
                $lat1 = $lat;
                $lon1 = $lon;
                $lat2 = $driver->current_latitude;
                $lon2 = $driver->current_longitude;
                
                $theta = $lon1 - $lon2;
                $dist = sin(deg2rad($lat1)) * sin(deg2rad($lat2)) +  cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * cos(deg2rad($theta));
                $dist = acos(min(max($dist, -1.0), 1.0));
                $dist = rad2deg($dist);
                $miles = $dist * 60 * 1.1515;
                $driver->distance = round($miles * 1.609344, 2);
                return $driver;
            })
            ->filter(function ($driver) use ($radius) {
                return $driver->distance <= $radius;
            })
            ->sortBy('distance')
            ->values();

        return response()->json([
            'drivers' => $drivers
        ]);
    }

    /**
     * Request a new ride booking.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'pickup_address' => 'required|string|max:255',
            'dropoff_address' => 'required|string|max:255',
            'pickup_latitude' => 'required|numeric|between:-90,90',
            'pickup_longitude' => 'required|numeric|between:-180,180',
            'dropoff_latitude' => 'required|numeric|between:-90,90',
            'dropoff_longitude' => 'required|numeric|between:-180,180',
            'payment_method' => 'nullable|string|in:cash,card,wallet',
            'scheduled_at' => 'nullable|date|after:now',
            'vehicle_type' => 'nullable|string',
            'distance' => 'required|numeric|min:0',
        ]);

        // Use the distance calculated by the frontend
        $distanceKm = (float) $validated['distance'];

        // Normalize vehicle rate
        $vehicleInput = strtolower($request->input('vehicle_type', 'car'));
        $rate = 30; // Car
        $vehicleType = 'Car';

        if ($vehicleInput === 'bike') {
            $rate = 10;
            $vehicleType = 'Bike';
        } elseif ($vehicleInput === 'rickshaw' || $vehicleInput === 'auto rickshaw' || $vehicleInput === 'auto') {
            $rate = 20;
            $vehicleType = 'Rickshaw';
        }

        // Formula: Total Fare = Distance * Vehicle Rate (no base fare)
        $estimatedFare = round($distanceKm * $rate, 2);
        
        // Estimated duration: average speed 30km/h
        $estimatedDuration = ceil(($distanceKm / 30) * 60);

        return DB::transaction(function () use ($request, $validated, $vehicleType, $distanceKm, $estimatedFare, $estimatedDuration) {
            $ride = Ride::create([
                'customer_id' => $request->user()->id,
                'pickup_address' => $validated['pickup_address'],
                'dropoff_address' => $validated['dropoff_address'],
                'pickup_latitude' => $validated['pickup_latitude'],
                'pickup_longitude' => $validated['pickup_longitude'],
                'dropoff_latitude' => $validated['dropoff_latitude'],
                'dropoff_longitude' => $validated['dropoff_longitude'],
                'status' => 'requested',
                'vehicle_type' => $vehicleType,
                'fare' => $estimatedFare,
                'distance' => $distanceKm,
                'duration' => $estimatedDuration,
                'scheduled_at' => $validated['scheduled_at'] ?? null,
            ]);

            Payment::create([
                'ride_id' => $ride->id,
                'payment_method' => $validated['payment_method'] ?? 'cash',
                'payment_status' => 'pending',
                'amount' => $estimatedFare,
                'admin_commission' => round($estimatedFare * 0.10, 2),
                'driver_earning' => round($estimatedFare * 0.90, 2),
            ]);

            return response()->json([
                'message' => 'Ride requested successfully. Searching for nearby drivers...',
                'ride' => $ride->load('payment')
            ], 201);
        });
    }

    /**
     * List user's booking history.
     */
    public function index(Request $request)
    {
        $rides = Ride::where('customer_id', $request->user()->id)
            ->with(['driver:id,name,phone', 'driver.driverDetail', 'payment', 'reviews'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json($rides);
    }

    /**
     * Show details of a specific ride.
     */
    public function show(Request $request, $id)
    {
        $ride = Ride::where('customer_id', $request->user()->id)
            ->with(['driver:id,name,phone', 'driver.driverDetail', 'payment', 'reviews'])
            ->findOrFail($id);

        return response()->json($ride);
    }

    /**
     * Cancel a ride.
     */
    public function cancel(Request $request, $id)
    {
        $ride = Ride::where('customer_id', $request->user()->id)->findOrFail($id);

        if (!in_array($ride->status, ['requested', 'accepted'])) {
            return response()->json([
                'message' => 'Cannot cancel a ride that is already in progress, completed, or cancelled.'
            ], 422);
        }

        $ride->status = 'cancelled';
        $ride->save();

        if ($ride->payment) {
            $ride->payment->payment_status = 'failed';
            $ride->payment->save();
        }

        // If driver was assigned, set driver availability back to true
        if ($ride->driver_id) {
            $driverDetail = DriverDetail::where('user_id', $ride->driver_id)->first();
            if ($driverDetail) {
                $driverDetail->is_available = true;
                $driverDetail->save();
            }
        }

        return response()->json([
            'message' => 'Ride cancelled successfully.',
            'ride' => $ride
        ]);
    }

    /**
     * Rate and review the ride/driver.
     */
    public function rate(Request $request, $id)
    {
        $ride = Ride::where('customer_id', $request->user()->id)->findOrFail($id);

        if ($ride->status !== 'completed') {
            return response()->json([
                'message' => 'You can only review completed rides.'
            ], 422);
        }

        if (!$ride->driver_id) {
            return response()->json([
                'message' => 'Cannot rate a ride with no driver assigned.'
            ], 422);
        }

        $request->validate([
            'rating' => 'required|integer|between:1,5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $review = Review::create([
            'ride_id' => $ride->id,
            'reviewer_id' => $request->user()->id,
            'reviewee_id' => $ride->driver_id,
            'rating' => $request->rating,
            'comment' => $request->comment,
        ]);

        // Recalculate average driver rating
        $avgRating = Review::where('reviewee_id', $ride->driver_id)->avg('rating');
        $driverDetail = DriverDetail::where('user_id', $ride->driver_id)->first();
        if ($driverDetail) {
            $driverDetail->rating = round($avgRating, 2);
            $driverDetail->save();
        }

        return response()->json([
            'message' => 'Review submitted successfully.',
            'review' => $review
        ], 201);
    }
}
