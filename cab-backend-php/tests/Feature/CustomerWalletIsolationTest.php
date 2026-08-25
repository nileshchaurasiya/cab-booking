<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CustomerWalletIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_wallets_are_isolated_and_independent(): void
    {
        // 1. Create Customer A and Customer B
        $customerA = User::factory()->create([
            'name' => 'Customer A',
            'email' => 'customera_' . uniqid() . '@test.com',
            'phone' => '987654' . rand(1000, 9999),
            'role' => User::ROLE_CUSTOMER,
        ]);

        $customerB = User::factory()->create([
            'name' => 'Customer B',
            'email' => 'customerb_' . uniqid() . '@test.com',
            'phone' => '987654' . rand(1000, 9999),
            'role' => User::ROLE_CUSTOMER,
        ]);

        // TEST 1: Customer A adds ₹500
        Sanctum::actingAs($customerA);
        $resA1 = $this->postJson('/api/customer/wallet/recharge', ['amount' => 500]);
        $resA1->assertStatus(200)
              ->assertJson(['balance' => 500]);

        // Customer B checks balance -> MUST be ₹0.00
        Sanctum::actingAs($customerB);
        $resB1 = $this->getJson('/api/customer/wallet');
        $resB1->assertStatus(200)
              ->assertJson(['balance' => 0]);

        // TEST 2: Customer B adds ₹300
        $resB2 = $this->postJson('/api/customer/wallet/recharge', ['amount' => 300]);
        $resB2->assertStatus(200)
              ->assertJson(['balance' => 300]);

        // Customer A balance is still ₹500
        Sanctum::actingAs($customerA);
        $resA2 = $this->getJson('/api/customer/wallet');
        $resA2->assertStatus(200)
              ->assertJson(['balance' => 500]);

        // Customer B balance is still ₹300
        Sanctum::actingAs($customerB);
        $resB3 = $this->getJson('/api/customer/wallet');
        $resB3->assertStatus(200)
              ->assertJson(['balance' => 300]);

        // TEST 3: Customer A books a ride with wallet payment (fare = ₹200)
        Sanctum::actingAs($customerA);
        $rideRes = $this->postJson('/api/customer/rides', [
            'pickup_address' => 'Station Road',
            'dropoff_address' => 'City Center',
            'pickup_latitude' => 12.9716,
            'pickup_longitude' => 77.5946,
            'dropoff_latitude' => 12.9784,
            'dropoff_longitude' => 77.6408,
            'vehicle_type' => 'Bike', // rate 10 * 20 km = 200
            'distance' => 20.0,
            'payment_method' => 'wallet',
        ]);
        $rideRes->assertStatus(201);
        $rideId = $rideRes->json('ride.id');

        // Customer A balance becomes ₹300 (500 - 200)
        $resA3 = $this->getJson('/api/customer/wallet');
        $resA3->assertStatus(200)
              ->assertJson(['balance' => 300]);

        // Customer B balance is UNTOUCHED at ₹300
        Sanctum::actingAs($customerB);
        $resB4 = $this->getJson('/api/customer/wallet');
        $resB4->assertStatus(200)
              ->assertJson(['balance' => 300]);

        // TEST 4: Customer A cancels the ride -> refunded back to ₹500
        Sanctum::actingAs($customerA);
        $cancelRes = $this->postJson("/api/customer/rides/{$rideId}/cancel");
        $cancelRes->assertStatus(200);

        // Customer A balance is refunded to ₹500
        $resA4 = $this->getJson('/api/customer/wallet');
        $resA4->assertStatus(200)
              ->assertJson(['balance' => 500]);

        // TEST 5: Max limit validation (cannot exceed ₹2000)
        Sanctum::actingAs($customerA); // current balance: ₹500
        $overLimitRes = $this->postJson('/api/customer/wallet/recharge', ['amount' => 1600]);
        $overLimitRes->assertStatus(422);

        // TEST 6: Verify Transaction History Isolation
        Sanctum::actingAs($customerA);
        $txA = $this->getJson('/api/customer/wallet')->json('transactions');

        Sanctum::actingAs($customerB);
        $txB = $this->getJson('/api/customer/wallet')->json('transactions');

        $this->assertCount(3, $txA); // Deposit 500, Payment 200, Refund 200
        $this->assertCount(1, $txB); // Deposit 300
    }
}
