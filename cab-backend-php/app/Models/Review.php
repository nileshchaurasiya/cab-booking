<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable([
    'ride_id',
    'reviewer_id',
    'reviewee_id',
    'rating',
    'comment'
])]
class Review extends Model
{
    use HasFactory;

    protected $casts = [
        'rating' => 'integer',
    ];

    public function ride()
    {
        return $this->belongsTo(Ride::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    public function reviewee()
    {
        return $this->belongsTo(User::class, 'reviewee_id');
    }
}
