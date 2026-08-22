<?php

namespace App\Http\Controllers;

use App\Models\Ride;
use App\Models\DriverDetail;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DriverController extends Controller
{
    /**
     * Update driver location and online/offline status.
     */
    public function updateLocation(Request $request)
    {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'is_available' => 'required|boolean',
        ]);

        $driverDetail = DriverDetail::where('user_id', $request->user()->id)->firstOrFail();
        $driverDetail->update([
            'current_latitude' => $request->latitude,
            'current_longitude' => $request->longitude,
            'is_available' => $request->is_available,
        ]);

        return response()->json([
            'message' => 'Location and availability updated successfully.',
            'driver_detail' => $driverDetail
        ]);
    }

    /**
     * Get active ride requests nearby (e.g. within 15 km of the driver's current location).
     */
    public function rideRequests(Request $request)
    {
        $driverDetail = DriverDetail::where('user_id', $request->user()->id)->firstOrFail();

        if (!$driverDetail->is_available) {
            return response()->json([
                'message' => 'You must set yourself as available to see ride requests.'
            ], 403);
        }

        $lat = $driverDetail->current_latitude;
        $lon = $driverDetail->current_longitude;

        if (is_null($lat) || is_null($lon)) {
            return response()->json([
                'message' => 'Update your current location before retrieving ride requests.'
            ], 422);
        }

        // Retrieve requested rides within a 15km radius of the driver
        $radius = 15;
        $latDelta = $radius / 111.0;
        $lonDelta = $radius / (111.0 * cos(deg2rad($lat)));

        $minLat = $lat - $latDelta;
        $maxLat = $lat + $latDelta;
        $minLon = $lon - $lonDelta;
        $maxLon = $lon + $lonDelta;

        $rides = Ride::where('status', Ride::STATUS_REQUESTED)
            ->whereBetween('pickup_latitude', [$minLat, $maxLat])
            ->whereBetween('pickup_longitude', [$minLon, $maxLon])
            ->with('customer:id,name,phone')
            ->get()
            ->map(function ($ride) use ($lat, $lon) {
                // Calculate distance in PHP
                $lat1 = $lat;
                $lon1 = $lon;
                $lat2 = $ride->pickup_latitude;
                $lon2 = $ride->pickup_longitude;
                
                $theta = $lon1 - $lon2;
                $dist = sin(deg2rad($lat1)) * sin(deg2rad($lat2)) +  cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * cos(deg2rad($theta));
                $dist = acos(min(max($dist, -1.0), 1.0));
                $dist = rad2deg($dist);
                $miles = $dist * 60 * 1.1515;
                $distKm = round($miles * 1.609344, 2);
                $ride->driver_distance_to_pickup = $distKm;
                return $ride;
            })
            ->filter(function ($ride) use ($radius) {
                return $ride->driver_distance_to_pickup <= $radius;
            })
            ->sortBy('distance')
            ->values();

        return response()->json([
            'requests' => $rides
        ]);
    }

    /**
     * Accept a ride request.
     */
    public function acceptRide(Request $request, $id)
    {
        $driverDetail = DriverDetail::where('user_id', $request->user()->id)->firstOrFail();

        if (!$driverDetail->is_available) {
            return response()->json([
                'message' => 'You cannot accept new rides while offline or on another trip.'
            ], 422);
        }

        $ride = Ride::findOrFail($id);

        if ($ride->status !== Ride::STATUS_REQUESTED) {
            return response()->json([
                'message' => 'This ride has already been accepted or cancelled.'
            ], 422);
        }

        return DB::transaction(function () use ($ride, $request, $driverDetail) {
            $ride->update([
                'driver_id' => $request->user()->id,
                'status' => Ride::STATUS_ACCEPTED
            ]);

            // Set driver status to occupied
            $driverDetail->update(['is_available' => false]);

            return response()->json([
                'message' => 'Ride request accepted successfully.',
                'ride' => $ride->load('customer', 'payment')
            ]);
        });
    }

    /**
     * Update the progress status of an active ride.
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|string|in:arrived,in_progress,completed'
        ]);

        $ride = Ride::where('driver_id', $request->user()->id)->findOrFail($id);

        if (in_array($ride->status, [Ride::STATUS_COMPLETED, Ride::STATUS_CANCELLED])) {
            return response()->json([
                'message' => 'Cannot update the status of a finished or cancelled ride.'
            ], 422);
        }

        $newStatus = $request->status;

        // Ensure status progression is logical
        if ($newStatus === 'in_progress' && $ride->status !== Ride::STATUS_ARRIVED && $ride->status !== Ride::STATUS_ACCEPTED) {
            return response()->json(['message' => 'Invalid status progression.'], 422);
        }
        if ($newStatus === 'completed' && $ride->status !== Ride::STATUS_IN_PROGRESS) {
            return response()->json(['message' => 'Cannot complete a ride that has not started.'], 422);
        }

        return DB::transaction(function () use ($ride, $newStatus, $request) {
            $ride->status = $newStatus;
            $ride->save();

            if ($newStatus === Ride::STATUS_COMPLETED) {
                // Free the driver
                $driverDetail = DriverDetail::where('user_id', $request->user()->id)->first();
                if ($driverDetail) {
                    $driverDetail->is_available = true;
                    $driverDetail->save();
                }

                // Complete the payment
                if ($ride->payment) {
                    $ride->payment->payment_status = 'completed';
                    $ride->payment->save();
                }
            }

            return response()->json([
                'message' => "Ride status updated to: {$newStatus}.",
                'ride' => $ride->load('customer', 'payment')
            ]);
        });
    }

    /**
     * List completed and historical trips for the driver.
     */
    public function rideHistory(Request $request)
    {
        $rides = Ride::where('driver_id', $request->user()->id)
            ->with(['customer:id,name,phone', 'payment', 'reviews'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json($rides);
    }

    /**
     * Register a new vehicle details for the driver.
     */
    public function registerVehicle(Request $request)
    {
        $validated = $request->validate([
            'license_number' => 'required|string|max:50|unique:driver_details,license_number',
            'vehicle_model' => 'required|string|max:255',
            'vehicle_plate_number' => 'required|string|max:50|unique:driver_details,vehicle_plate_number',
            'vehicle_color' => 'required|string|max:50',
            'vehicle_type' => 'required|string|in:sedan,suv,hatchback,bike',
        ]);

        $detail = DriverDetail::create([
            'user_id' => $request->user()->id,
            'license_number' => $validated['license_number'],
            'vehicle_model' => $validated['vehicle_model'],
            'vehicle_plate_number' => $validated['vehicle_plate_number'],
            'vehicle_color' => $validated['vehicle_color'],
            'vehicle_type' => $validated['vehicle_type'],
            'is_available' => false,
        ]);

        return response()->json([
            'message' => 'Vehicle registered successfully.',
            'driver_detail' => $detail,
        ], 201);
    }

    /**
     * Update/Edit existing vehicle details.
     */
    public function updateVehicle(Request $request)
    {
        $detail = DriverDetail::where('user_id', $request->user()->id)->firstOrFail();

        $validated = $request->validate([
            'license_number' => 'required|string|max:50|unique:driver_details,license_number,' . $detail->id,
            'vehicle_model' => 'required|string|max:255',
            'vehicle_plate_number' => 'required|string|max:50|unique:driver_details,vehicle_plate_number,' . $detail->id,
            'vehicle_color' => 'required|string|max:50',
            'vehicle_type' => 'required|string|in:sedan,suv,hatchback,bike',
        ]);

        $detail->update($validated);

        return response()->json([
            'message' => 'Vehicle details updated successfully.',
            'driver_detail' => $detail,
        ]);
    }

    /**
     * Remove/Delete vehicle details.
     */
    public function deleteVehicle(Request $request)
    {
        $detail = DriverDetail::where('user_id', $request->user()->id)->firstOrFail();
        $detail->delete();

        return response()->json([
            'message' => 'Vehicle details removed successfully.'
        ]);
    }
}
