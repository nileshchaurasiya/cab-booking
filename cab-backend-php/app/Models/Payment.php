<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable([
    'ride_id',
    'payment_method',
    'payment_status',
    'amount',
    'admin_commission',
    'driver_earning',
    'is_payout_distributed',
    'transaction_reference'
])]
class Payment extends Model
{
    use HasFactory;

    protected $casts = [
        'amount' => 'float',
        'admin_commission' => 'float',
        'driver_earning' => 'float',
        'is_payout_distributed' => 'boolean',
    ];

    public function ride()
    {
        return $this->belongsTo(Ride::class);
    }
}
