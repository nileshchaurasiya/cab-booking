<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed Customer
        User::firstOrCreate(
            ['email' => 'customer@cab.com'],
            [
                'name' => 'John Customer',
                'phone' => '1234567890',
                'password' => bcrypt('password123'),
                'role' => 'customer',
                'status' => 'active',
            ]
        );

        // 2. Seed Driver
        $driver = User::firstOrCreate(
            ['email' => 'driver@cab.com'],
            [
                'name' => 'Dave Driver',
                'phone' => '0987654321',
                'password' => bcrypt('password123'),
                'role' => 'driver',
                'status' => 'active',
            ]
        );

        \App\Models\DriverDetail::firstOrCreate(
            ['user_id' => $driver->id],
            [
                'license_number' => 'DL-99999',
                'vehicle_model' => 'Toyota Camry',
                'vehicle_plate_number' => 'MH12AB1234',
                'vehicle_color' => 'White',
                'vehicle_type' => 'sedan',
                'is_available' => true,
                'current_latitude' => 12.9716,
                'current_longitude' => 77.5946,
                'rating' => 4.90,
            ]
        );

        // 3. Seed Admin
        User::firstOrCreate(
            ['email' => 'admin@cab.com'],
            [
                'name' => 'Super Admin',
                'phone' => '1111111111',
                'password' => bcrypt('password123'),
                'role' => 'admin',
                'status' => 'active',
            ]
        );
    }
}
