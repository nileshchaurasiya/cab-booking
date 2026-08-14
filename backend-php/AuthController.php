<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Customer;
use App\Models\Driver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new user.
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => ['required', Rule::in(['customer', 'driver'])],
            'address' => 'nullable|string',
            'vehicle_model' => 'nullable|string|required_if:role,driver',
            'vehicle_plate' => 'nullable|string|required_if:role,driver|unique:drivers,vehicle_plate',
            'cab_class' => ['nullable', Rule::in(['Car', 'Auto Rickshaw', 'Bike']), 'required_if:role,driver'],
        ]);

        // Use a database transaction to ensure data integrity
        return DB::transaction(function () use ($validated) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => $validated['role'],
            ]);

            if ($validated['role'] === 'customer') {
                $user->customer()->create([
                    'address' => $validated['address'] ?? null,
                    'wallet_balance' => 2000.00, // Default from mock
                ]);
            } elseif ($validated['role'] === 'driver') {
                $user->driver()->create([
                    'address' => $validated['address'] ?? null,
                    'vehicle_model' => $validated['vehicle_model'],
                    'vehicle_plate' => $validated['vehicle_plate'],
                    'cab_class' => $validated['cab_class'],
                ]);
            }

            return response()->json([
                'message' => 'Registration successful!',
                'user' => $user->fresh($validated['role']), // Reload with profile
            ], 201);
        });
    }

    /**
     * Authenticate a user and return a token.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'role' => ['required', Rule::in(['customer', 'driver', 'admin'])],
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        // Check if the user's role matches the one they are trying to log in with
        if ($user->role !== $request->role) {
            throw ValidationException::withMessages([
                'role' => ["This account is not registered as a {$request->role}."],
            ]);
        }

        // Create a token for the user
        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Log the user out (Invalidate the token).
     */
    public function logout(Request $request)
    {
        // Revoke the token that was used to authenticate the current request...
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }
}
