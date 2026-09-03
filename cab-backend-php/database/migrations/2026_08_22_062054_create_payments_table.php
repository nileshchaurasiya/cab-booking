<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ride_id')->constrained('rides')->onDelete('cascade');
            $table->string('payment_method')->default('cash'); // cash, card, wallet
            $table->string('payment_status')->default('pending'); // pending, completed, failed
            $table->decimal('amount', 8, 2);
            $table->decimal('admin_commission', 8, 2)->default(0);
            $table->decimal('driver_earning', 8, 2)->default(0);
            $table->boolean('is_payout_distributed')->default(false);
            $table->string('transaction_reference')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
