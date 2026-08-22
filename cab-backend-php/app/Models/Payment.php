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
    'transaction_reference'
])]
class Payment extends Model
{
    use HasFactory;

    protected $casts = [
        'amount' => 'float',
    ];

    public function ride()
    {
        return $this->belongsTo(Ride::class);
    }
}
