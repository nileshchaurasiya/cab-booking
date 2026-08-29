import React, { useState, useEffect } from 'react';
import { apiRequest, calculateFare } from '../services/api';
import { Share2, Settings } from 'lucide-react';

export default function CustomerDashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
  // Navigation tabs for Ride History List
  const [historyTab, setHistoryTab] = useState<'trips' | 'wallet'>('trips');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  // Modals state
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Recharge inputs
  const [rechargeAmount, setRechargeAmount] = useState('500');
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    const key = `customer_wallet_balance_${user?.id || 'guest'}`;
    return parseFloat(localStorage.getItem(key) || '0.00');
  });

  // Wallet transactions
  const [walletTransactions, setWalletTransactions] = useState<any[]>(() => {
    const key = `customer_wallet_transactions_${user?.id || 'guest'}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  });

  // Booking Form State
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [selectedCab, setSelectedCab] = useState({ name: 'Car', rate: 30 });
  const [bookingRide, setBookingRide] = useState(false);
  const [previewDistance, setPreviewDistance] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);

  // Active Ride tracking
  const [activeRide, setActiveRide] = useState<any>(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);

  // Slowly animate displayProgress toward progressPercentage (~1% per 500ms)
  useEffect(() => {
    if (displayProgress === progressPercentage) return;
    const step = displayProgress < progressPercentage ? 1 : -1;
    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        const next = prev + step;
        if ((step > 0 && next >= progressPercentage) || (step < 0 && next <= progressPercentage)) {
          clearInterval(interval);
          return progressPercentage;
        }
        return next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [progressPercentage]);

  // History list
  const [historyRides, setHistoryRides] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [waitingSeconds, setWaitingSeconds] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(0);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateVal: any) => {
    if (!dateVal) return '—';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';
    const formatted = d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return formatted.replace(/-/g, ' ').toUpperCase();
  };

  // Live waiting timer tick
  useEffect(() => {
    if (!activeRide || activeRide.status !== 'waiting_for_customer' || !activeRide.pickup_waiting_started_at) {
      setWaitingSeconds(0);
      return;
    }

    const calculateElapsed = () => {
      const start = new Date(activeRide.pickup_waiting_started_at).getTime();
      const now = new Date().getTime();
      const elapsed = Math.max(0, Math.floor((now - start) / 1000));
      setWaitingSeconds(elapsed);
    };

    calculateElapsed(); // run once immediately
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeRide]);

  // Live ETA countdown timer tick
  useEffect(() => {
    if (!activeRide || activeRide.status !== 'accepted' || !activeRide.estimated_pickup_at) {
      setEtaSeconds(0);
      return;
    }

    const calculateRemaining = () => {
      const end = new Date(activeRide.estimated_pickup_at).getTime();
      const now = new Date().getTime();
      const remaining = Math.max(0, Math.floor((end - now) / 1000));
      setEtaSeconds(remaining);
    };

    calculateRemaining(); // run once immediately
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [activeRide]);

  // Feedback states
  const [feedbackStars, setFeedbackStars] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Notifications
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Fetch isolated wallet from backend API
  const fetchWallet = async () => {
    if (!user?.id) return;
    try {
      const data = await apiRequest('/customer/wallet');
      if (data && typeof data.balance === 'number') {
        setWalletBalance(data.balance);
        setWalletTransactions(data.transactions || []);
        localStorage.setItem(`customer_wallet_balance_${user.id}`, data.balance.toFixed(2));
        localStorage.setItem(`customer_wallet_transactions_${user.id}`, JSON.stringify(data.transactions || []));
      }
    } catch (err) {
      console.error('Failed to load wallet from API', err);
    }
  };

  // Switch/sync state whenever active user changes
  useEffect(() => {
    if (user?.id) {
      const cachedBal = parseFloat(localStorage.getItem(`customer_wallet_balance_${user.id}`) || '0.00');
      const cachedTx = JSON.parse(localStorage.getItem(`customer_wallet_transactions_${user.id}`) || '[]');
      setWalletBalance(cachedBal);
      setWalletTransactions(cachedTx);
      fetchWallet();
      fetchHistory();
      fetchActiveRide();
    }
  }, [user?.id]);

  // Sync isolated wallet balance to localStorage
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`customer_wallet_balance_${user.id}`, walletBalance.toFixed(2));
    }
  }, [walletBalance, user?.id]);

  // Sync isolated transactions to localStorage
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`customer_wallet_transactions_${user.id}`, JSON.stringify(walletTransactions));
    }
  }, [walletTransactions, user?.id]);

  // Poll for ride status updates every 5 seconds when a ride is active
  useEffect(() => {
    if (!activeRide || activeRide.status === 'completed') return;
    const pollInterval = setInterval(() => {
      fetchActiveRide();
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [activeRide?.id, activeRide?.status]);

  // Recalculate distance whenever pickup or dropoff changes
  useEffect(() => {
    const p = pickup.trim();
    const d = dropoff.trim();
    if (!p || !d) {
      setPreviewDistance(0);
      setIsCalculating(false);
    } else {
      setIsCalculating(true);
      const timer = setTimeout(() => {
        // Generate a new random distance between 3.0 and 22.0 km
        const newDist = parseFloat((Math.random() * (22 - 3) + 3).toFixed(1));
        setPreviewDistance(newDist);
        setIsCalculating(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [pickup, dropoff]);

  const fetchActiveRide = async () => {
    try {
      const res = await apiRequest('/customer/rides');
      const rides = res.data || [];
      const active = rides.find((r: any) => {
        if (['requested', 'accepted', 'arrived', 'waiting_for_customer', 'in_progress'].includes(r.status)) {
          return true;
        }
        if (r.status === 'completed') {
          const hasReviewed = r.reviews && r.reviews.length > 0;
          return !hasReviewed;
        }
        return false;
      });
      if (active) {
        setActiveRide(active);
        // Simulate progress bar percentage depending on status
        if (active.status === 'requested') setProgressPercentage(15);
        if (active.status === 'accepted') setProgressPercentage(45);
        if (active.status === 'arrived') setProgressPercentage(70);
        if (active.status === 'waiting_for_customer') setProgressPercentage(75);
        if (active.status === 'in_progress') setProgressPercentage(90);
      } else {
        setActiveRide(null);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await apiRequest('/customer/rides');
      setHistoryRides(res.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !dropoff) {
      addToast('Please enter both pickup and drop-off points', 'error');
      return;
    }

    const estimatedFare = calculateFare(selectedCab.name, previewDistance, pickup, dropoff);
    if (walletBalance <= 0) {
      addToast('Your wallet balance is ₹0.00. Please recharge your wallet to book a ride.', 'error');
      return;
    }
    if (walletBalance < estimatedFare) {
      addToast(`Insufficient wallet balance (₹${walletBalance.toFixed(2)}). Estimated fare is ₹${estimatedFare.toFixed(2)}. Please recharge your wallet.`, 'error');
      return;
    }

    setBookingRide(true);
    try {
      // Mock coordinates near Bangalore for distance calculations
      const res = await apiRequest('/customer/rides', {
        method: 'POST',
        body: JSON.stringify({
          pickup_address: pickup,
          dropoff_address: dropoff,
          pickup_latitude: 12.9716,
          pickup_longitude: 77.5946,
          dropoff_latitude: 12.9784,
          dropoff_longitude: 77.6408,
          payment_method: 'wallet',
          vehicle_type: selectedCab.name,
          distance: previewDistance,
        }),
      });

      const ride = res.ride;
      setActiveRide(ride);
      setDisplayProgress(0); // Reset animation
      setProgressPercentage(15);
      addToast('Ride requested successfully! Searching for drivers.');

      // Refresh isolated wallet and transaction log
      fetchWallet();

      setPickup('');
      setDropoff('');
      fetchHistory();
    } catch (err: any) {
      addToast(err.message || 'Failed to request a cab.', 'error');
    } finally {
      setBookingRide(false);
    }
  };

  const handleCancelCurrentRide = async () => {
    if (!activeRide) return;
    try {
      await apiRequest(`/customer/rides/${activeRide.id}/cancel`, { method: 'POST' });
      addToast('Ride request cancelled.');

      // Refresh isolated wallet and transaction log
      fetchWallet();

      setActiveRide(null);
      fetchHistory();

      // Refresh page to clean state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      addToast(err.message || 'Failed to cancel ride.', 'error');
    }
  };

  const handleRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      addToast('Enter a valid amount', 'error');
      return;
    }

    const MAX_WALLET_BALANCE = 2000;
    if (walletBalance + amount > MAX_WALLET_BALANCE) {
      const maxAllowed = MAX_WALLET_BALANCE - walletBalance;
      if (maxAllowed <= 0) {
        addToast(`Wallet limit is ₹${MAX_WALLET_BALANCE}. Your wallet is already full!`, 'error');
      } else {
        addToast(`Wallet limit is ₹${MAX_WALLET_BALANCE}. You can add up to ₹${maxAllowed.toFixed(2)} more.`, 'error');
      }
      return;
    }

    try {
      const res = await apiRequest('/customer/wallet/recharge', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      if (typeof res.balance === 'number') {
        setWalletBalance(res.balance);
        setWalletTransactions(res.transactions || []);
      } else {
        fetchWallet();
      }
      addToast(res.message || `Successfully recharged ₹${amount.toFixed(2)} to your wallet!`);
      setShowRechargeModal(false);
    } catch (err: any) {
      addToast(err.message || 'Failed to recharge wallet.', 'error');
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!activeRide) return;
    try {
      await apiRequest(`/customer/rides/${activeRide.id}/rate`, {
        method: 'POST',
        body: JSON.stringify({
          rating: feedbackStars,
          comment: feedbackComment,
        }),
      });
      addToast('Review submitted successfully. Safe travels!');
      setReviewSubmitted(true);
      setShowFeedbackModal(false);
      fetchHistory();
    } catch (err: any) {
      addToast(err.message || 'Failed to submit review.', 'error');
    }
  };

  const filteredHistory = historyRides.filter((ride) => {
    if (historyFilter === 'all') return true;
    return ride.status === historyFilter;
  });

  return (
    <div className="bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-100 min-h-screen flex flex-col font-sans antialiased transition-colors duration-300">

      {/* Toast Notification Banner Container */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border transition-all duration-300 text-xs font-semibold flex items-center gap-2 min-w-[250px] animate-fade-in ${toast.type === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}
          >
            <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="border-b border-slate-200 dark:border-neutral-900 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 shadow-lg shadow-sky-500/5">
              <svg className="w-6 h-6 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3C13 6.8 11.5 6 9 6H5a3 3 0 0 0-3 3v7c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
              </svg>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">Indian Cabs</h1>
              <span className="text-[9px] sm:text-[10px] text-sky-400 font-semibold uppercase tracking-wider block mt-0.5">Customer Portal</span>
            </div>
          </div>

          {/* User & Wallet info */}
          <div className="flex items-center gap-1.5 sm:gap-6">
            {/* Wallet Recharge Display */}
            <button
              onClick={() => setShowRechargeModal(true)}
              className="xl:h-[40px] h-[32px] rounded-full bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center gap-1 transition-all hover:bg-slate-200 dark:hover:bg-neutral-800 hover:scale-105 active:scale-95 xl:ps-3 ps-[9px] xl:pe-[14px] pe-[11px] text-left cursor-pointer focus:outline-none"
            >
              <span className="text-base leading-none select-none">🪙</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white leading-none">
                {walletBalance.toFixed(2)}
              </span>
            </button>

            {/* Profile trigger */}
            <div className="flex items-center gap-2 sm:gap-3 border-l border-slate-200 dark:border-neutral-900 pl-3 sm:pl-6">
              <div className="text-right hidden md:block">
                <span className="text-xs font-bold text-slate-800 dark:text-white block">{user.name}</span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium block">Active customer</span>
              </div>
              <button
                onClick={() => setShowProfileModal(true)}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-center cursor-pointer transition-all hover:bg-slate-200 dark:hover:bg-neutral-800 hover:scale-105 active:scale-95 text-slate-600 dark:text-neutral-400 focus:outline-none"
              >
                <Settings className="w-5 h-5 transition-transform duration-500 hover:rotate-90" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8">

          {/* LEFT COLUMN: Booking / Tracker */}
          <div className="lg:col-span-6 space-y-6">

            {/* Booking Card */}
            {!activeRide ? (
              <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-900 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-sm dark:shadow-xl transition-all duration-300">
                <h2 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-1">Book Your Ride</h2>
                <p className="text-xs text-neutral-400 mb-6">Instantly compare and request a vehicle in your area</p>

                <form onSubmit={handleBookSubmit} className="space-y-4">
                  {/* Pickup Address */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Pickup Location</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"></span>
                      </div>
                      <input
                        type="text"
                        required
                        value={pickup}
                        onChange={(e) => setPickup(e.target.value)}
                        placeholder="Enter pickup address..."
                        className="block w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-2xl text-slate-800 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Dropoff Address */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Drop-off Destination</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20"></span>
                      </div>
                      <input
                        type="text"
                        required
                        value={dropoff}
                        onChange={(e) => setDropoff(e.target.value)}
                        placeholder="Enter drop-off destination..."
                        className="block w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-2xl text-slate-800 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Vehicle Type selector */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Select Vehicle Class</label>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-3">

                      {/* Car Class */}
                      <button
                        type="button"
                        onClick={() => setSelectedCab({ name: 'Car', rate: 30 })}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all cursor-pointer text-center group ${selectedCab.name === 'Car'
                          ? 'bg-blue-50/70 dark:bg-slate-900 border border-sky-500 ring-2 ring-sky-500/30'
                          : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-700 hover:border-sky-500'
                          }`}
                      >
                        <span className="text-lg mb-1 group-hover:scale-110 transition-transform">🚗</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-white block">Car</span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">₹30/km</span>
                      </button>

                      {/* Rickshaw Class */}
                      <button
                        type="button"
                        onClick={() => setSelectedCab({ name: 'Rickshaw', rate: 20 })}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all cursor-pointer text-center group ${selectedCab.name === 'Rickshaw'
                          ? 'bg-blue-50/70 dark:bg-slate-900 border border-sky-500 ring-2 ring-sky-500/30'
                          : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-700 hover:border-sky-500'
                          }`}
                      >
                        <span className="text-lg mb-1 group-hover:scale-110 transition-transform">🛺</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-white block">Rickshaw</span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">₹20/km</span>
                      </button>

                      {/* Bike Class */}
                      <button
                        type="button"
                        onClick={() => setSelectedCab({ name: 'Bike', rate: 10 })}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all cursor-pointer text-center group ${selectedCab.name === 'Bike'
                          ? 'bg-blue-50/70 dark:bg-slate-900 border border-sky-500 ring-2 ring-sky-500/30'
                          : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-700 hover:border-sky-500'
                          }`}
                      >
                        <span className="text-lg mb-1 group-hover:scale-110 transition-transform">🏍️</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-white block">Bike</span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">₹10/km</span>
                      </button>

                    </div>
                  </div>

                  {/* Estimation Panel */}
                  <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-3 sm:p-4 flex items-center justify-between text-xs mt-2 transition-colors duration-300 min-h-[58px]">
                    {isCalculating ? (
                      <div className="flex items-center gap-2.5 text-sky-500 font-semibold w-full justify-center py-1">
                        <span className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></span>
                        <span className="text-[10px] uppercase tracking-wider animate-pulse">Calculating optimal route...</span>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Estimated Fare</span>
                          <strong className="text-base text-sky-400 mt-0.5 block">₹{calculateFare(selectedCab.name, previewDistance, pickup, dropoff).toFixed(2)}</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Est. Distance</span>
                          <strong className="text-xs text-slate-800 dark:text-white mt-0.5 block">{previewDistance.toFixed(1)} km</strong>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Wallet Warning if insufficient balance */}
                  {walletBalance < calculateFare(selectedCab.name, previewDistance, pickup, dropoff) && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs mt-3">
                      <div className="flex items-center gap-1.5">
                        <span>⚠️</span>
                        <span>Insufficient balance (₹{walletBalance.toFixed(2)})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowRechargeModal(true)}
                        className="font-bold underline text-sky-400 hover:text-sky-300 cursor-pointer text-xs"
                      >
                        + Recharge
                      </button>
                    </div>
                  )}

                  {/* Book Button */}
                  <button
                    type="submit"
                    disabled={bookingRide}
                    className="w-full py-3.5 px-4 rounded-2xl font-bold bg-sky-600 hover:bg-sky-700 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer mt-4"
                  >
                    {bookingRide ? 'Requesting Ride...' : '🚕 Book Cab Now'}
                  </button>
                </form>
              </div>
            ) : activeRide.status === 'completed' ? (
              /* Customer Ride Completed Summary & Review Card */
              <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-900 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-sm dark:shadow-xl relative overflow-hidden transition-all duration-300 text-xs">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400"></div>

                <div className="text-center mb-6">
                  <span className="text-3xl block mb-2">🎉</span>
                  <h3 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">Ride Completed ✓</h3>
                  <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-1 uppercase font-bold tracking-wider">Ride Summary</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4 space-y-2.5">
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-slate-500">Pickup:</span>
                      <strong className="text-slate-800 dark:text-white text-right font-bold">{activeRide.pickup_address}</strong>
                    </div>
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-slate-500">Destination:</span>
                      <strong className="text-slate-800 dark:text-white text-right font-bold">{activeRide.dropoff_address}</strong>
                    </div>
                    <hr className="border-slate-200 dark:border-neutral-900" />
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Distance:</span>
                      <strong className="text-slate-800 dark:text-white font-mono font-bold">{activeRide.distance} km</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Fare:</span>
                      <strong className="text-slate-800 dark:text-white font-mono font-bold">₹{activeRide.fare}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Payment:</span>
                      <strong className="text-emerald-400 font-bold uppercase">Paid</strong>
                    </div>
                    <hr className="border-slate-200 dark:border-neutral-900" />
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Driver:</span>
                      <strong className="text-slate-800 dark:text-white font-bold">{activeRide.driver?.name || 'Driver'}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Vehicle:</span>
                      <strong className="text-slate-800 dark:text-white font-bold">
                        {activeRide.driver?.driver_detail?.vehicle_model || activeRide.vehicle_type} - {activeRide.driver?.driver_detail?.vehicle_plate_number || 'GJ05AB1234'}
                      </strong>
                    </div>
                  </div>

                  {!reviewSubmitted ? (
                    <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4 space-y-4">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white text-center">How was your ride?</h4>
                      <div className="flex items-center justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setFeedbackStars(star)}
                            className="text-2xl focus:outline-none transition-all hover:scale-110 cursor-pointer"
                          >
                            <span className={star <= feedbackStars ? 'text-amber-400' : 'text-neutral-700'}>★</span>
                          </button>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">How was your experience?</label>
                        <textarea
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          rows={2}
                          placeholder="Write your review..."
                          className="block w-full px-3 py-2 bg-slate-200 dark:bg-black border border-slate-350 dark:border-neutral-800 rounded-xl text-slate-800 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-600 text-xs focus:outline-none focus:border-sky-500 transition-all resize-none"
                        />
                      </div>
                      <button
                        onClick={handleFeedbackSubmit}
                        className="w-full py-2.5 px-4 rounded-xl font-bold bg-sky-600 hover:bg-sky-500 text-black hover:-translate-y-0.5 transition-all cursor-pointer text-xs"
                      >
                        Submit Review
                      </button>
                    </div>
                  ) : (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl p-5 text-center space-y-3">
                      <strong className="text-xs font-bold block">Review submitted successfully ✓</strong>
                      <div className="text-2xl tracking-widest text-amber-400">
                        {Array.from({ length: feedbackStars }).map((_, i) => '★').join('')}
                      </div>
                      <span className="text-[10px] text-neutral-400 block font-mono">Your rating: {feedbackStars}/5</span>
                      <button
                        onClick={() => {
                          setReviewSubmitted(false);
                          setActiveRide(null);
                          setFeedbackComment('');
                          window.location.reload();
                        }}
                        className="w-full py-2.5 px-4 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer text-xs"
                      >
                        Back to Booking
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Active Ride Status Tracker Card */
              <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-900 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-sm dark:shadow-xl relative overflow-hidden transition-all duration-300">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-400 via-indigo-500 to-emerald-400"></div>

                <h2 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-1">
                  {activeRide.status === 'requested'
                    ? 'Searching for Matches'
                    : activeRide.status === 'accepted'
                      ? '🚕 Please Wait'
                      : activeRide.status === 'arrived'
                        ? '🚕 Your rider has arrived!'
                        : activeRide.status === 'completed'
                          ? 'Ride Finished'
                          : activeRide.status === 'waiting_for_customer'
                            ? '🚕 Driver is waiting for you'
                            : 'Your Driver is Arriving'}
                </h2>
                <p className="text-xs text-neutral-400 mb-6">
                  {activeRide.status === 'accepted'
                    ? 'Your rider is on the way.'
                    : activeRide.status === 'arrived'
                      ? 'Please go to the pickup location.'
                      : activeRide.status === 'waiting_for_customer'
                        ? 'Your driver is waiting for you'
                        : 'Keep track of your current driver match status below'}
                </p>

                <div className="space-y-5">
                  {/* Driver Card */}
                  <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4">
                    <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-xl shrink-0 overflow-hidden">
                      <span>👨‍✈️</span>
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                          {activeRide.driver ? activeRide.driver.name : 'Searching for nearest driver...'}
                        </h3>
                        {activeRide.driver && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ★ {activeRide.driver.driver_detail?.rating ? Number(activeRide.driver.driver_detail.rating).toFixed(1) : '5.0'}/5
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>{activeRide.driver?.driver_detail?.vehicle_model || activeRide.vehicle_type || 'Searching...'}</span>
                        <span className="font-mono text-slate-800 dark:text-white font-bold">
                          {activeRide.driver?.driver_detail?.vehicle_plate_number || 'WAITING'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ETA countdown timer for Customer */}
                  {activeRide.status === 'accepted' && activeRide.estimated_pickup_at && (
                    <div className="bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-2xl p-4 text-center text-xs space-y-1">
                      <span className="text-[10px] text-sky-400/80 block uppercase font-bold tracking-wider font-bold">Estimated arrival time</span>
                      <div className="text-2xl font-mono font-bold tracking-widest">{formatTime(etaSeconds)}</div>
                    </div>
                  )}

                  {/* Waiting Timer display for Customer */}
                  {activeRide.status === 'waiting_for_customer' && (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl p-4 text-center text-xs space-y-1">
                      <span className="text-[10px] text-amber-400/80 block uppercase font-bold tracking-wider font-bold">Waiting time:</span>
                      <div className="text-2xl font-mono font-bold tracking-widest">{formatTime(waitingSeconds)}</div>
                    </div>
                  )}

                  {/* Progress status */}
                  <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        Status: <strong className="text-sky-400">{activeRide.status.toUpperCase()}</strong>
                      </span>
                      <span className="font-bold text-slate-800 dark:text-white">{Math.round(displayProgress)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-neutral-900 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-sky-400 to-indigo-500 h-full rounded-full transition-all duration-300 ease-linear"
                        style={{ width: `${displayProgress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500">
                      <span>Ride request</span>
                      <span>Trip end</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {['requested', 'accepted', 'waiting_for_customer'].includes(activeRide.status) ? (
                      <button
                        onClick={handleCancelCurrentRide}
                        className="w-full py-3 px-4 rounded-xl font-bold bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all cursor-pointer text-xs"
                      >
                        🚫 Cancel Ride
                      </button>
                    ) : (
                      <div className="text-xs text-neutral-500 text-center py-2 col-span-2">
                        Trip in progress. Safe travels!
                      </div>
                    )}
                    <button
                      onClick={() => addToast('Tracking link copied to clipboard!')}
                      className="w-full py-3 px-4 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 text-slate-800 dark:text-slate-200 transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share Status
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: History Log & Wallet Transactions */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-900 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-sm dark:shadow-xl transition-all duration-300">

              {/* Tab Selector */}
              <div className="flex border-b border-slate-100 dark:border-neutral-900 pb-3 mb-4 gap-4 text-xs font-bold">
                <button
                  onClick={() => setHistoryTab('trips')}
                  className={`pb-1.5 border-b-2 transition-all cursor-pointer ${historyTab === 'trips' ? 'border-sky-500 text-sky-500' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                  🚗 Trips Log
                </button>
                <button
                  onClick={() => setHistoryTab('wallet')}
                  className={`pb-1.5 border-b-2 transition-all cursor-pointer ${historyTab === 'wallet' ? 'border-sky-500 text-sky-500' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                  🪙 Wallet Transactions
                </button>
              </div>

              {/* Trips Log content */}
              {historyTab === 'trips' ? (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-white tracking-tight mb-1">Your Trip History</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">View past completed bookings and invoice details</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setHistoryFilter('all')}
                        className={`text-[10px] px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer ${historyFilter === 'all' ? 'bg-sky-500 border-sky-500 text-white' : 'bg-transparent border-slate-200 dark:border-neutral-700 text-slate-400'
                          }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setHistoryFilter('completed')}
                        className={`text-[10px] px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer ${historyFilter === 'completed' ? 'bg-sky-500 border-sky-500 text-white' : 'bg-transparent border-slate-200 dark:border-neutral-700 text-slate-400'
                          }`}
                      >
                        Completed
                      </button>
                      <button
                        onClick={() => setHistoryFilter('cancelled')}
                        className={`text-[10px] px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer ${historyFilter === 'cancelled' ? 'bg-sky-500 border-sky-500 text-white' : 'bg-transparent border-slate-200 dark:border-neutral-700 text-slate-400'
                          }`}
                      >
                        Cancelled
                      </button>
                    </div>
                  </div>

                  {/* Trips list */}
                  {loadingHistory ? (
                    <div className="text-center py-8 text-xs text-neutral-500">Loading trips...</div>
                  ) : filteredHistory.length > 0 ? (
                    <div className="space-y-3">
                      {filteredHistory.map((ride) => (
                        <div key={ride.id} className="flex items-center justify-between bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4 hover:border-slate-300 dark:hover:border-neutral-800 transition-all">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{ride.status === 'completed' ? '✅' : '❌'}</span>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                                {ride.pickup_address} → {ride.dropoff_address}
                              </h4>
                              <span className="text-[9px] text-slate-500 dark:text-slate-400">
                                {formatDateTime(ride.created_at || ride.createdAt)} • {ride.vehicle_type || 'Car'} (Driver: {ride.driver?.name || 'None'})
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <strong className="text-xs font-bold text-sky-400 block">₹{ride.fare}</strong>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded border uppercase font-semibold ${ride.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                              {ride.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-xs text-slate-500">No bookings matched this filter.</div>
                  )}
                </div>
              ) : (
                /* Wallet Transactions log */
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-white tracking-tight mb-1">Wallet Transactions</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">View your deposits, payments, and refunds</p>
                    </div>
                  </div>

                  {walletTransactions.length > 0 ? (
                    <div className="space-y-3">
                      {walletTransactions.map((tx) => {
                        const isCredit = (tx.type || '').toLowerCase() === 'deposit' || (tx.type || '').toLowerCase() === 'refund';
                        const displayDate = formatDateTime(tx.created_at || tx.createdAt || tx.date);
                        const amountVal = parseFloat(tx.amount || 0);

                        return (
                          <div key={tx.id} className="flex items-center justify-between bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4">
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 dark:text-white">{tx.description}</h4>
                              <span className="text-[9px] text-slate-500">{displayDate}</span>
                            </div>
                            <strong className={`text-xs font-bold ${isCredit ? 'text-emerald-400' : 'text-red-400'}`}>
                              {isCredit ? '+' : '-'}₹{amountVal.toFixed(2)}
                            </strong>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-xs text-slate-500">No wallet records found.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* WALLET RECHARGE MODAL */}
      {showRechargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-800 rounded-[2rem] max-w-md w-full p-8 shadow-2xl relative">
            <button
              onClick={() => setShowRechargeModal(false)}
              className="absolute top-6 right-6 text-neutral-500 hover:text-white cursor-pointer transition-colors text-lg"
            >
              ✕
            </button>
            <div className="text-center mb-6">
              <span className="text-3xl select-none leading-none block mb-2">🪙</span>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">Recharge Wallet</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">Add funds to your Indian Cabs wallet instantly.</p>
            </div>
            <form onSubmit={handleRechargeSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRechargeAmount('100')}
                  className="py-2.5 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs font-bold text-slate-800 dark:text-white rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer"
                >
                  ₹100
                </button>
                <button
                  type="button"
                  onClick={() => setRechargeAmount('500')}
                  className="py-2.5 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs font-bold text-slate-800 dark:text-white rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer"
                >
                  ₹500
                </button>
                <button
                  type="button"
                  onClick={() => setRechargeAmount('1000')}
                  className="py-2.5 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs font-bold text-slate-800 dark:text-white rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer"
                >
                  ₹1000
                </button>
              </div>
              <div>
                <input
                  type="number"
                  required
                  min="10"
                  max="5000"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="Custom Recharge Amount"
                  className="block w-full px-4 py-3 bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-800 dark:text-neutral-100 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer mt-6 text-xs"
              >
                ⚡ Complete Payment & Add Cash
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-800 rounded-[2rem] p-8 shadow-2xl">
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-6 right-6 text-neutral-500 hover:text-white cursor-pointer transition-colors text-lg"
            >
              ✕
            </button>
            <div className="text-center mb-6">
              <span className="text-2xl block mb-2">⚙️</span>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">Settings & Profile</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">View details or terminate active session.</p>
            </div>
            <div className="space-y-3">
              <div className="bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-900 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between border-b border-slate-200/50 dark:border-neutral-900/60 pb-2">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Full Name</span>
                  <strong className="text-slate-800 dark:text-white text-xs">{user.name}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 dark:border-neutral-900/60 pb-2">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Email Address</span>
                  <strong className="text-slate-800 dark:text-white text-xs">{user.email}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 dark:border-neutral-900/60 pb-2">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Phone number</span>
                  <strong className="text-slate-800 dark:text-white text-xs">{user.phone}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Registration Role</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => setShowProfileModal(false)}
                className="py-3 px-4 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-300 transition-all cursor-pointer text-xs border border-slate-200 dark:border-neutral-800"
              >
                Close
              </button>
              <button
                onClick={onLogout}
                className="py-3 px-4 rounded-xl font-bold bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all cursor-pointer text-xs"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK & RATING MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-800 rounded-[2rem] p-8 shadow-2xl">
            <div className="text-center">
              <span className="text-3xl block mb-2">🎉</span>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">Ride Completed!</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">We hope you had a pleasant trip. Please rate your driver.</p>
            </div>
            <div className="flex items-center gap-3 bg-slate-50/50 dark:bg-black/40 border border-slate-200/50 dark:border-neutral-900/60 rounded-xl p-3 my-4">
              <span>👨‍✈️</span>
              <div className="text-left">
                <h4 className="text-xs font-bold text-slate-800 dark:text-white">{activeRide?.driver?.name || 'Driver'}</h4>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                  {activeRide?.driver?.driver_detail?.vehicle_model || activeRide?.vehicle_type || 'Vehicle'} (
                  {activeRide?.driver?.driver_detail?.vehicle_plate_number || 'MH12AB1234'})
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 my-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setFeedbackStars(star)}
                  className="text-3xl focus:outline-none transition-all hover:scale-110 cursor-pointer"
                >
                  <span className={star <= feedbackStars ? 'text-amber-400' : 'text-neutral-700'}>★</span>
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Leave a Comment (Optional)</label>
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                rows={3}
                placeholder="How was your trip? Tell us more..."
                className="block w-full px-4 py-3 bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-800 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-600 text-xs focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all resize-none"
              />
            </div>
            <button
              onClick={handleFeedbackSubmit}
              className="w-full py-3.5 px-4 rounded-xl font-bold bg-sky-600 hover:bg-sky-700 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black hover:-translate-y-0.5 transition-all duration-200 cursor-pointer mt-6 text-xs shadow-lg"
            >
              Submit Review & Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
