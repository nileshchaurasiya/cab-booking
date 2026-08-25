<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Ride;
use App\Models\DriverDetail;
use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CabBookingApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_and_driver_registration_and_login()
    {
        // 1. Customer registration
        $customerResponse = $this->postJson('/api/register', [
            'name' => 'John Customer',
            'email' => 'john@customer.com',
            'phone' => '1234567890',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'customer'
        ]);

        $customerResponse->assertStatus(201)
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email', 'phone', 'role'],
                'access_token',
                'token_type'
            ]);

        // 2. Driver registration
        $driverResponse = $this->postJson('/api/register', [
            'name' => 'Bob Driver',
            'email' => 'bob@driver.com',
            'phone' => '0987654321',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'driver',
        ]);

        $driverResponse->assertStatus(201)
            ->assertJsonStructure([
                'user' => [
                    'id', 'name', 'email', 'phone', 'role',
                ],
                'access_token'
            ]);

        $driverToken = $driverResponse->json('access_token');

        // 2.5 Driver registers vehicle via separate API
        $vehicleResponse = $this->withHeaders([
            'Authorization' => "Bearer {$driverToken}"
        ])->postJson('/api/driver/vehicle', [
            'license_number' => 'DL-1234567',
            'vehicle_model' => 'Toyota Camry',
            'vehicle_plate_number' => 'AB-123-CD',
            'vehicle_color' => 'Silver',
            'vehicle_type' => 'sedan'
        ]);

        $vehicleResponse->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'driver_detail' => ['license_number', 'vehicle_model', 'vehicle_plate_number']
            ]);

        // 3. Login
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'john@customer.com',
            'password' => 'password123'
        ]);

        $loginResponse->assertStatus(200)
            ->assertJsonStructure(['access_token']);
    }

    public function test_role_based_middleware_restrictions()
    {
        $customer = User::create([
            'name' => 'Customer User',
            'email' => 'customer@test.com',
            'phone' => '111111',
            'password' => bcrypt('password'),
            'role' => 'customer'
        ]);

        // Try calling driver endpoint with customer credentials
        $response = $this->actingAs($customer)
            ->postJson('/api/driver/location', [
                'latitude' => 12.9716,
                'longitude' => 77.5946,
                'is_available' => true
            ]);

        $response->assertStatus(403)
            ->assertJsonFragment([
                'message' => 'Unauthorized access. Requires role: driver'
            ]);
    }

    public function test_complete_cab_booking_flow()
    {
        // 1. Create a customer, a driver, and an admin
        $customer = User::create([
            'name' => 'Alice Customer',
            'email' => 'alice@customer.com',
            'phone' => '222222',
            'password' => bcrypt('password'),
            'role' => 'customer'
        ]);

        $driver = User::create([
            'name' => 'Dave Driver',
            'email' => 'dave@driver.com',
            'phone' => '333333',
            'password' => bcrypt('password'),
            'role' => 'driver'
        ]);

        $driverDetail = DriverDetail::create([
            'user_id' => $driver->id,
            'license_number' => 'LIC-777',
            'vehicle_model' => 'Honda Civic',
            'vehicle_plate_number' => 'XYZ-999',
            'vehicle_color' => 'Black',
            'vehicle_type' => 'sedan',
            'is_available' => true,
            'current_latitude' => 12.9715978,
            'current_longitude' => 77.5945627
        ]);

        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@cab.com',
            'phone' => '444444',
            'password' => bcrypt('password'),
            'role' => 'admin'
        ]);

        // 2. Customer searches for nearby drivers
        $nearbyResponse = $this->actingAs($customer)
            ->getJson('/api/customer/drivers/nearby?latitude=12.9716&longitude=77.5946');

        $nearbyResponse->assertStatus(200);
        $this->assertCount(1, $nearbyResponse->json('drivers'));

        // 3. Customer requests a ride
        $rideResponse = $this->actingAs($customer)
            ->postJson('/api/customer/rides', [
                'pickup_address' => 'MG Road, Bangalore',
                'dropoff_address' => 'Indiranagar, Bangalore',
                'pickup_latitude' => 12.9716,
                'pickup_longitude' => 77.5946,
                'dropoff_latitude' => 12.9784,
                'dropoff_longitude' => 77.6408,
                'distance' => 12.5,
                'payment_method' => 'cash'
            ]);

        $rideResponse->assertStatus(201);
        $rideId = $rideResponse->json('ride.id');
        $this->assertEquals('requested', $rideResponse->json('ride.status'));

        // 4. Driver sees the request
        $requestsResponse = $this->actingAs($driver)
            ->getJson('/api/driver/rides/requests');

        $requestsResponse->assertStatus(200);
        $this->assertCount(1, $requestsResponse->json('requests'));

        // 5. Driver accepts the ride
        $acceptResponse = $this->actingAs($driver)
            ->postJson("/api/driver/rides/{$rideId}/accept");

        $acceptResponse->assertStatus(200);
        $this->assertEquals('accepted', $acceptResponse->json('ride.status'));

        // Driver details is_available should now be false
        $this->assertFalse(DriverDetail::where('user_id', $driver->id)->first()->is_available);

        // 6. Driver updates status: arrived -> waiting_for_customer -> in_progress -> completed
        $this->actingAs($driver)
            ->postJson("/api/driver/rides/{$rideId}/status", ['status' => 'arrived'])
            ->assertStatus(200);

        $this->actingAs($driver)
            ->postJson("/api/driver/rides/{$rideId}/status", ['status' => 'waiting_for_customer'])
            ->assertStatus(200);

        $this->actingAs($driver)
            ->postJson("/api/driver/rides/{$rideId}/status", ['status' => 'in_progress'])
            ->assertStatus(200);

        $this->actingAs($driver)
            ->postJson("/api/driver/rides/{$rideId}/status", ['status' => 'completed'])
            ->assertStatus(200);

        // Ride status should be completed, payment completed, driver available again
        $this->assertEquals('completed', Ride::find($rideId)->status);
        $this->assertEquals('completed', Payment::where('ride_id', $rideId)->first()->payment_status);
        $this->assertTrue(DriverDetail::where('user_id', $driver->id)->first()->is_available);

        // 7. Customer rates the driver
        $rateResponse = $this->actingAs($customer)
            ->postJson("/api/customer/rides/{$rideId}/rate", [
                'rating' => 5,
                'comment' => 'Excellent trip!'
            ]);

        $rateResponse->assertStatus(201);
        $this->assertEquals(5.0, DriverDetail::where('user_id', $driver->id)->first()->rating);

        // 8. Admin checks the dashboard
        $adminDashboardResponse = $this->actingAs($admin)
            ->getJson('/api/admin/dashboard');

        $adminDashboardResponse->assertStatus(200)
            ->assertJsonFragment([
                'total_completed_rides' => 1
            ]);
    }

    public function test_vehicle_type_driver_matching_restrictions()
    {
        // 1. Create a customer, a car driver, and a bike driver
        $customer = User::create([
            'name' => 'Alice Customer',
            'email' => 'alice@customer.com',
            'phone' => '222222',
            'password' => bcrypt('password'),
            'role' => 'customer'
        ]);

        $carDriver = User::create([
            'name' => 'Dave Car Driver',
            'email' => 'dave@driver.com',
            'phone' => '333333',
            'password' => bcrypt('password'),
            'role' => 'driver'
        ]);

        DriverDetail::create([
            'user_id' => $carDriver->id,
            'license_number' => 'LIC-777',
            'vehicle_model' => 'Honda Civic',
            'vehicle_plate_number' => 'XYZ-999',
            'vehicle_color' => 'Black',
            'vehicle_type' => 'sedan',
            'is_available' => true,
            'current_latitude' => 12.9715978,
            'current_longitude' => 77.5945627
        ]);

        $bikeDriver = User::create([
            'name' => 'Steve Bike Driver',
            'email' => 'steve@driver.com',
            'phone' => '444444',
            'password' => bcrypt('password'),
            'role' => 'driver'
        ]);

        DriverDetail::create([
            'user_id' => $bikeDriver->id,
            'license_number' => 'LIC-888',
            'vehicle_model' => 'Honda Splendor',
            'vehicle_plate_number' => 'XYZ-888',
            'vehicle_color' => 'Red',
            'vehicle_type' => 'bike',
            'is_available' => true,
            'current_latitude' => 12.9715978,
            'current_longitude' => 77.5945627
        ]);

        // 2. Customer requests a Car ride
        $rideResponse = $this->actingAs($customer)
            ->postJson('/api/customer/rides', [
                'pickup_address' => 'MG Road, Bangalore',
                'dropoff_address' => 'Indiranagar, Bangalore',
                'pickup_latitude' => 12.9716,
                'pickup_longitude' => 77.5946,
                'dropoff_latitude' => 12.9784,
                'dropoff_longitude' => 77.6408,
                'distance' => 12.5,
                'payment_method' => 'cash',
                'vehicle_type' => 'Car'
            ]);

        $rideResponse->assertStatus(201);
        $rideId = $rideResponse->json('ride.id');

        // 3. Bike driver searches for requests. Should see 0 requests (since they are a bike driver and this is a Car ride).
        $bikeRequestsResponse = $this->actingAs($bikeDriver)
            ->getJson('/api/driver/rides/requests');
        $bikeRequestsResponse->assertStatus(200);
        $this->assertCount(0, $bikeRequestsResponse->json('requests'));

        // 4. Car driver searches for requests. Should see 1 request (compatible).
        $carRequestsResponse = $this->actingAs($carDriver)
            ->getJson('/api/driver/rides/requests');
        $carRequestsResponse->assertStatus(200);
        $this->assertCount(1, $carRequestsResponse->json('requests'));

        // 5. Bike driver attempts to accept the ride (should fail with 422).
        $bikeAcceptResponse = $this->actingAs($bikeDriver)
            ->postJson("/api/driver/rides/{$rideId}/accept");
        $bikeAcceptResponse->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'This ride is for a different vehicle type.'
            ]);

        // 6. Car driver accepts the ride (should succeed with 200).
        $carAcceptResponse = $this->actingAs($carDriver)
            ->postJson("/api/driver/rides/{$rideId}/accept");
        $carAcceptResponse->assertStatus(200);
    }

    public function test_ride_pickup_waiting_and_start_validation()
    {
        $customer = User::create([
            'name' => 'Alice Customer',
            'email' => 'alice@customer.com',
            'phone' => '222222',
            'password' => bcrypt('password'),
            'role' => 'customer'
        ]);

        $driver = User::create([
            'name' => 'Dave Driver',
            'email' => 'dave@driver.com',
            'phone' => '333333',
            'password' => bcrypt('password'),
            'role' => 'driver'
        ]);

        DriverDetail::create([
            'user_id' => $driver->id,
            'license_number' => 'LIC-777',
            'vehicle_model' => 'Honda Civic',
            'vehicle_plate_number' => 'XYZ-999',
            'vehicle_color' => 'Black',
            'vehicle_type' => 'sedan',
            'is_available' => true,
            'current_latitude' => 12.9715978,
            'current_longitude' => 77.5945627
        ]);

        // Customer requests a ride
        $rideResponse = $this->actingAs($customer)
            ->postJson('/api/customer/rides', [
                'pickup_address' => 'MG Road, Bangalore',
                'dropoff_address' => 'Indiranagar, Bangalore',
                'pickup_latitude' => 12.9716,
                'pickup_longitude' => 77.5946,
                'dropoff_latitude' => 12.9784,
                'dropoff_longitude' => 77.6408,
                'distance' => 12.5,
                'payment_method' => 'cash'
            ]);

        $rideResponse->assertStatus(201);
        $rideId = $rideResponse->json('ride.id');

        // Accept
        $acceptRes = $this->actingAs($driver)->postJson("/api/driver/rides/{$rideId}/accept");
        $acceptRes->assertStatus(200);
        
        $dbRide = Ride::find($rideId);
        $this->assertNotNull($dbRide->driver_accepted_at);
        $this->assertNotNull($dbRide->estimated_pickup_at);

        // Try to update status directly to waiting_for_customer before arrived (should fail)
        $this->actingAs($driver)->postJson("/api/driver/rides/{$rideId}/status", ['status' => 'waiting_for_customer'])
            ->assertStatus(422);

        // Try to update status directly to in_progress before arrived/waiting (should fail)
        $this->actingAs($driver)->postJson("/api/driver/rides/{$rideId}/status", ['status' => 'in_progress'])
            ->assertStatus(422);

        // Arrive at pickup
        $this->actingAs($driver)->postJson("/api/driver/rides/{$rideId}/status", ['status' => 'arrived'])
            ->assertStatus(200);

        // Try to update status directly to in_progress without waiting_for_customer (should fail)
        $this->actingAs($driver)->postJson("/api/driver/rides/{$rideId}/status", ['status' => 'in_progress'])
            ->assertStatus(422);

        // Set to waiting_for_customer
        $waitingResponse = $this->actingAs($driver)->postJson("/api/driver/rides/{$rideId}/status", ['status' => 'waiting_for_customer']);
        $waitingResponse->assertStatus(200);
        
        $this->assertNotNull(Ride::find($rideId)->pickup_waiting_started_at);

        // Set to in_progress
        $this->actingAs($driver)->postJson("/api/driver/rides/{$rideId}/status", ['status' => 'in_progress'])
            ->assertStatus(200);
    }
}

