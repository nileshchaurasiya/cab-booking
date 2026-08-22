<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\DriverDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $rules = [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone' => 'required|string|max:20|unique:users',
            'password' => 'required|string|min:6|confirmed',
            'role' => 'required|string|in:customer,driver',
        ];

        if ($request->filled('license_number')) {
            $rules['license_number'] = 'required|string|max:50|unique:driver_details,license_number';
            $rules['vehicle_model'] = 'required|string|max:255';
            $rules['vehicle_plate_number'] = 'required|string|max:50|unique:driver_details,vehicle_plate_number';
            $rules['vehicle_color'] = 'required|string|max:50';
            $rules['vehicle_type'] = 'required|string|in:sedan,suv,hatchback,bike';
        }

        $validatedData = $request->validate($rules);

        return DB::transaction(function () use ($validatedData) {
            $user = User::create([
                'name' => $validatedData['name'],
                'email' => $validatedData['email'],
                'phone' => $validatedData['phone'],
                'password' => Hash::make($validatedData['password']),
                'role' => $validatedData['role'],
                'status' => 'active',
            ]);

            if ($user->role === 'driver' && isset($validatedData['license_number'])) {
                DriverDetail::create([
                    'user_id' => $user->id,
                    'license_number' => $validatedData['license_number'],
                    'vehicle_model' => $validatedData['vehicle_model'],
                    'vehicle_plate_number' => $validatedData['vehicle_plate_number'],
                    'vehicle_color' => $validatedData['vehicle_color'],
                    'vehicle_type' => $validatedData['vehicle_type'],
                    'is_available' => false,
                    'current_latitude' => 12.9716, // Default coordinate near Bangalore
                    'current_longitude' => 77.5946,
                    'rating' => 5.0,
                ]);
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'user' => $user->load('driverDetail'),
                'access_token' => $token,
                'token_type' => 'Bearer',
            ], 201);
        });
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid login credentials.'],
            ]);
        }

        if ($user->status === 'suspended') {
            return response()->json([
                'message' => 'Your account has been suspended by an administrator.'
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user->load('driverDetail'),
            'access_token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.'
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user()->load('driverDetail')
        ]);
    }
}
