<?php

namespace App\Http\Controllers;

use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WalletController extends Controller
{
    /**
     * Get the authenticated customer's wallet balance and transactions.
     */
    public function getWallet(Request $request)
    {
        $userId = $request->user()->id;

        $wallet = Wallet::firstOrCreate(
            ['user_id' => $userId],
            ['balance' => 0.00]
        );

        $transactions = WalletTransaction::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->take(50)
            ->get();

        return response()->json([
            'balance' => (float) $wallet->balance,
            'transactions' => $transactions,
        ]);
    }

    /**
     * Recharge customer's wallet.
     */
    public function recharge(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1',
        ]);

        $amount = (float) $request->amount;
        $maxBalance = 2000.00;
        $userId = $request->user()->id;

        return DB::transaction(function () use ($userId, $amount, $maxBalance) {
            $wallet = Wallet::lockForUpdate()->firstOrCreate(
                ['user_id' => $userId],
                ['balance' => 0.00]
            );

            if ($wallet->balance + $amount > $maxBalance) {
                $maxAllowed = max(0, $maxBalance - $wallet->balance);
                return response()->json([
                    'message' => "Wallet limit is ₹{$maxBalance}. You can add up to ₹" . number_format($maxAllowed, 2) . " more."
                ], 422);
            }

            $wallet->balance += $amount;
            $wallet->save();

            $transaction = WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'user_id' => $userId,
                'type' => 'deposit',
                'amount' => $amount,
                'description' => 'Wallet Recharge Deposit',
            ]);

            $transactions = WalletTransaction::where('user_id', $userId)
                ->orderBy('created_at', 'desc')
                ->take(50)
                ->get();

            return response()->json([
                'message' => 'Successfully recharged ₹' . number_format($amount, 2) . ' to your wallet!',
                'balance' => (float) $wallet->balance,
                'transaction' => $transaction,
                'transactions' => $transactions,
            ]);
        });
    }
}
