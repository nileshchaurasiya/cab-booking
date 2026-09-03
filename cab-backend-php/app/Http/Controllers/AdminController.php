<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Ride;
use App\Models\Payment;
use App\Models\DriverDetail;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    /**
     * Dashboard overview statistics.
     */
    public function dashboard(Request $request)
    {
        $totalEarnings = Payment::where('payment_status', 'completed')->sum('admin_commission');
        $totalCompletedRides = Ride::where('status', Ride::STATUS_COMPLETED)->count();
        $totalUsers = User::count();
        $activeDrivers = DriverDetail::where('is_available', true)
            ->whereHas('user', function ($q) {
                $q->where('status', '!=', \App\Models\User::STATUS_SUSPENDED);
            })
            ->count();

        return response()->json([
            'stats' => [
                'total_earnings' => round($totalEarnings, 2),
                'total_completed_rides' => $totalCompletedRides,
                'total_users' => $totalUsers,
                'active_drivers_online' => $activeDrivers,
            ]
        ]);
    }

    /**
     * Manage and list users in the system.
     */
    public function users(Request $request)
    {
        $query = User::query();

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->with('driverDetail')
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json($users);
    }

    /**
     * Change a user status (e.g., active or suspended).
     */
    public function updateUserStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|string|in:' . User::STATUS_ACTIVE . ',' . User::STATUS_SUSPENDED
        ]);

        $user = User::findOrFail($id);

        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'You cannot update your own account status.'
            ], 422);
        }

        $user->status = $request->status;
        $user->save();

        return response()->json([
            'message' => "User account status updated to: {$request->status}.",
            'user' => $user
        ]);
    }

    /**
     * Delete a driver and all their associated data from the system.
     */
    public function deleteDriver(Request $request, $id)
    {
        $driver = User::with('driverDetail')->findOrFail($id);

        if ($driver->id === $request->user()->id) {
            return response()->json([
                'message' => 'You cannot delete your own account.'
            ], 422);
        }

        if ($driver->role !== 'driver') {
            return response()->json([
                'message' => 'Only driver accounts can be removed through this endpoint.'
            ], 422);
        }

        // Check if driver has active rides in progress
        $hasActiveRide = Ride::where('driver_id', $driver->id)
            ->whereIn('status', [Ride::STATUS_ACCEPTED, 'arrived', Ride::STATUS_WAITING_FOR_CUSTOMER, Ride::STATUS_IN_PROGRESS])
            ->exists();

        if ($hasActiveRide) {
            return response()->json([
                'message' => 'Cannot delete driver account with an active ride in progress.'
            ], 422);
        }

        // Delete associated driver_detail if exists
        if ($driver->driverDetail) {
            $driver->driverDetail->delete();
        }

        // Delete the user account
        $driver->delete();

        return response()->json([
            'message' => 'Driver account and all associated data removed successfully.'
        ]);
    }

    /**
     * Get a list of all rides with pagination.
     */
    public function rides(Request $request)
    {
        $query = Ride::query();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('driver_id')) {
            $query->where('driver_id', $request->driver_id);
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        $rides = $query->with(['customer:id,name,phone', 'driver:id,name,phone', 'payment'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json($rides);
    }
}
