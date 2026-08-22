<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable([
    'user_id',
    'license_number',
    'vehicle_model',
    'vehicle_plate_number',
    'vehicle_color',
    'vehicle_type',
    'is_available',
    'current_latitude',
    'current_longitude',
    'rating'
])]
class DriverDetail extends Model
{
    use HasFactory;

    protected $casts = [
        'is_available' => 'boolean',
        'current_latitude' => 'float',
        'current_longitude' => 'float',
        'rating' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
