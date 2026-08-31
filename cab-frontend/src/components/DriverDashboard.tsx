import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { Settings } from 'lucide-react';

export default function DriverDashboard({ user, onLogout }: { user: any; onLogout: () => void }) {
  // Offline / Waiting / Request / Active Trip states
  const [isOnline, setIsOnline] = useState(false);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [tripProgress, setTripProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [requestTimer, setRequestTimer] = useState(5);

  // 5-second countdown timer for incoming request
  useEffect(() => {
    if (!activeRequest) return;
    setRequestTimer(8);
    const timer = setInterval(() => {
      setRequestTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setActiveRequest(null);
          addToast('Ride request expired.', 'error');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeRequest?.id]);

  // Slowly animate displayProgress toward tripProgress (~1% per second)
  useEffect(() => {
    if (displayProgress === tripProgress) return;
    const step = displayProgress < tripProgress ? 1 : -1;
    const interval = setInterval(() => {
      setDisplayProgress(prev => {
        const next = prev + step;
        if ((step > 0 && next >= tripProgress) || (step < 0 && next <= tripProgress)) {
          clearInterval(interval);
          return tripProgress;
        }
        return next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [tripProgress]);

  // Stats
  const [earnings, setEarnings] = useState(0);
  const [tripsCount, setTripsCount] = useState(0);
  const [driverRating, setDriverRating] = useState<any>(5.00);
  const [reviewsCount, setReviewsCount] = useState<number>(0);
  const [completedSummary, setCompletedSummary] = useState<any>(null);
  const [waitingSeconds, setWaitingSeconds] = useState(0);

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

  const calculateRideDuration = (ride: any) => {
    if (!ride) return '0 minutes';
    const startStr = ride.pickup_waiting_started_at || ride.driver_accepted_at || ride.created_at || ride.createdAt;
    const endStr = ride.updated_at || ride.updatedAt || new Date().toISOString();

    if (!startStr || !endStr) return `${ride.duration || 1} minutes`;

    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();

    if (isNaN(start) || isNaN(end) || end < start) {
      return `${ride.duration || 1} minutes`;
    }

    const diffMs = end - start;
    const minutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  };

  // Live waiting timer tick
  useEffect(() => {
    if (!activeTrip || activeTrip.status !== 'waiting_for_customer' || !activeTrip.pickup_waiting_started_at) {
      setWaitingSeconds(0);
      return;
    }

    const calculateElapsed = () => {
      const start = new Date(activeTrip.pickup_waiting_started_at).getTime();
      const now = new Date().getTime();
      const elapsed = Math.max(0, Math.floor((now - start) / 1000));
      setWaitingSeconds(elapsed);
    };

    calculateElapsed(); // run once immediately
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeTrip]);

  // History Filter
  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [historyRides, setHistoryRides] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modals state
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Vehicle states
  const [vehicle, setVehicle] = useState({
    license_number: user.driver_detail?.license_number || '',
    vehicle_model: user.driver_detail?.vehicle_model || '',
    vehicle_plate_number: user.driver_detail?.vehicle_plate_number || '',
    vehicle_color: user.driver_detail?.vehicle_color || '',
    vehicle_type: user.driver_detail?.vehicle_type || 'sedan',
  });

  // Toasts
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    if (user.driver_detail) {
      setDriverRating(parseFloat(user.driver_detail.rating || '5.00'));
      setReviewsCount(user.driver_detail.reviews_count || 0);
      setVehicle({
        license_number: user.driver_detail.license_number || '',
        vehicle_model: user.driver_detail.vehicle_model || '',
        vehicle_plate_number: user.driver_detail.vehicle_plate_number || '',
        vehicle_color: user.driver_detail.vehicle_color || '',
        vehicle_type: user.driver_detail.vehicle_type || 'sedan',
      });
    }
    fetchHistory();
    fetchActiveTrip();
  }, []);

  // Poll for incoming ride requests when online and waiting
  useEffect(() => {
    if (!isOnline || activeTrip || activeRequest) return;

    const interval = setInterval(async () => {
      try {
        // Send heartbeat/update location and fetch requests
        await apiRequest('/driver/location', {
          method: 'POST',
          body: JSON.stringify({
            latitude: 12.9716,
            longitude: 77.5946,
            is_available: true,
          }),
        });

        const res = await apiRequest('/driver/rides/requests');
        const requests = res.requests || [];
        if (requests.length > 0) {
          setActiveRequest(requests[0]); // grab first request found nearby
          addToast('New ride request matched in your area!', 'success');
        }
      } catch (err) {
        console.error(err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isOnline, activeTrip, activeRequest]);

  const fetchActiveTrip = async () => {
    try {
      const res = await apiRequest('/driver/rides');
      const rides = res.data || [];
      const active = rides.find((r: any) => ['accepted', 'arrived', 'waiting_for_customer', 'in_progress'].includes(r.status));
      if (active) {
        setActiveTrip(active);
        setIsOnline(true);
        if (active.status === 'accepted') setTripProgress(30);
        if (active.status === 'arrived') setTripProgress(60);
        if (active.status === 'waiting_for_customer') setTripProgress(70);
        if (active.status === 'in_progress') setTripProgress(90);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await apiRequest('/driver/rides');
      const rides = res.data || [];
      setHistoryRides(rides);

      // Summarize stats
      const completed = rides.filter((r: any) => r.status === 'completed');
      setTripsCount(completed.length);
      const totalEarned = completed.reduce((sum: number, r: any) => sum + parseFloat(r.fare), 0);
      setEarnings(totalEarned * 0.9);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleToggleShift = async (forceOnline?: boolean) => {
    const nextState = forceOnline !== undefined ? forceOnline : !isOnline;
    try {
      await apiRequest('/driver/location', {
        method: 'POST',
        body: JSON.stringify({
          latitude: 12.9716,
          longitude: 77.5946,
          is_available: nextState,
        }),
      });

      setIsOnline(nextState);
      if (nextState) {
        addToast('You are now Online. Scanning for customer booking requests.');
      } else {
        addToast('Shift ended. You are now offline.');
        setActiveRequest(null);
      }
    } catch (err: any) {
      addToast(err.message || 'Location sync failed.', 'error');
    }
  };

  const handleAcceptRequest = async () => {
    if (!activeRequest) return;
    try {
      const res = await apiRequest(`/driver/rides/${activeRequest.id}/accept`, {
        method: 'POST',
      });
      setActiveTrip(res.ride);
      setActiveRequest(null);
      setDisplayProgress(0); // Reset animation to 0% for new ride
      setTripProgress(30);
      addToast('Ride accepted! Arriving at pickup location...');
      fetchHistory();
    } catch (err: any) {
      addToast(err.message || 'Could not accept ride.', 'error');
      setActiveRequest(null);
    }
  };

  const handleUpdateStatus = async (status: 'arrived' | 'waiting_for_customer' | 'in_progress' | 'completed') => {
    if (!activeTrip) return;
    try {
      const res = await apiRequest(`/driver/rides/${activeTrip.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });

      const updatedRide = res.ride;
      setActiveTrip(updatedRide);

      if (status === 'arrived') {
        setTripProgress(50);
        addToast('Arrived at customer pickup point.');
      } else if (status === 'waiting_for_customer') {
        setTripProgress(70);
        addToast('Waiting for customer...');
      } else if (status === 'in_progress') {
        setTripProgress(90);
        addToast('Ride started. Heading to destination.');
      } else if (status === 'completed') {
        setTripProgress(100);
        addToast('Journey completed successfully! Earnings added.');
        setCompletedSummary(updatedRide);
        setActiveTrip(null);
        fetchHistory();
      }
    } catch (err: any) {
      addToast(err.message || 'Status transition failed.', 'error');
    }
  };

  const handleCancelTrip = async () => {
    if (!activeTrip) return;
    try {
      await apiRequest(`/driver/rides/${activeTrip.id}/cancel`, { method: 'POST' });
      addToast('Trip cancelled successfully.', 'success');
      setActiveTrip(null);
      fetchHistory();
    } catch (err: any) {
      addToast(err.message || 'Cancellation failed.', 'error');
    }
  };

  const handleDeclineRequest = () => {
    setActiveRequest(null);
    addToast('Request declined.');
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = '/driver/vehicle';
      const method = user.driver_detail ? 'PUT' : 'POST';

      await apiRequest(endpoint, {
        method: method,
        body: JSON.stringify(vehicle),
      });

      addToast(method === 'POST' ? 'Vehicle registered successfully.' : 'Vehicle details updated successfully.');

      const meRes = await apiRequest('/me');
      localStorage.setItem('driver_auth_user', JSON.stringify(meRes.user));

      if (meRes.user.driver_detail) {
        setVehicle({
          license_number: meRes.user.driver_detail.license_number || '',
          vehicle_model: meRes.user.driver_detail.vehicle_model || '',
          vehicle_plate_number: meRes.user.driver_detail.vehicle_plate_number || '',
          vehicle_color: meRes.user.driver_detail.vehicle_color || '',
          vehicle_type: meRes.user.driver_detail.vehicle_type || 'sedan',
        });
      }

      setShowVehicleModal(false);
      // Refresh page to sync all views
      window.location.reload();
    } catch (err: any) {
      addToast(err.message || 'Operation failed.', 'error');
    }
  };

  const handleRemoveVehicle = async () => {
    if (!window.confirm("Are you sure you want to remove your vehicle details? This will prevent you from receiving ride requests.")) {
      return;
    }
    try {
      await apiRequest('/driver/vehicle', { method: 'DELETE' });
      addToast('Vehicle removed successfully.');

      setVehicle({
        license_number: '',
        vehicle_model: '',
        vehicle_plate_number: '',
        vehicle_color: '',
        vehicle_type: 'sedan',
      });

      const meRes = await apiRequest('/me');
      localStorage.setItem('driver_auth_user', JSON.stringify(meRes.user));
      setShowProfileModal(false);
      // Refresh page to sync all views
      window.location.reload();
    } catch (err: any) {
      addToast(err.message || 'Failed to remove vehicle.', 'error');
    }
  };

  const filteredHistory = historyRides.filter((ride) => {
    if (historyFilter === 'all') return true;
    return ride.status === historyFilter;
  });

  return (
    <div className="bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-100 min-h-screen flex flex-col font-sans antialiased transition-colors duration-300">

      {/* Toast Notification Container */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full items-center">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border transition-all duration-300 text-xs font-semibold flex items-center gap-2 ${toast.type === 'error'
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
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-600/10 border border-sky-600/20 shadow-lg shadow-sky-600/5">
              <svg className="w-6 h-6 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3C13 6.8 11.5 6 9 6H5a3 3 0 0 0-3 3v7c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
              </svg>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">Indian Cabs</h1>
              <span className="text-[9px] sm:text-[10px] text-sky-505 text-sky-500 font-semibold uppercase tracking-wider block mt-0.5">Driver Partner Portal</span>
            </div>
          </div>

          {/* Shift status switch */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-neutral-900 rounded-xl px-4 py-1.5 transition-all">
              <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider block leading-none">Shift:</span>
              <button
                onClick={() => handleToggleShift()}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ring-2 ring-sky-600/20 ${isOnline ? 'bg-sky-500' : 'bg-neutral-800'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-100 shadow transition duration-200 ease-in-out ${isOnline ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
              <span className="text-xs font-bold text-slate-800 dark:text-white">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Profile trigger */}
            <div className="flex items-center gap-3 border-l border-slate-200 dark:border-neutral-900 pl-6">
              <div className="text-right hidden md:block">
                <span className="text-xs font-bold text-slate-800 dark:text-white block">{user.name}</span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium block">
                  {vehicle.vehicle_plate_number || 'VEHICLE UNREGISTERED'}
                </span>
              </div>
              <button
                onClick={() => setShowProfileModal(true)}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-center cursor-pointer transition-all hover:bg-slate-200 dark:hover:bg-neutral-800 hover:scale-105 active:scale-95 text-slate-650 dark:text-neutral-400 focus:outline-none"
              >
                <Settings className="w-5 h-5 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8">

          {/* LEFT COLUMN: Shift and Booking Radar Operations */}
          <div className="lg:col-span-7 space-y-4">

            {/* OFFLINE STATE CARD */}
            {!isOnline && !completedSummary && (
              <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-900 rounded-[2rem] p-8 text-center shadow-sm dark:shadow-xl transition-all">
                <span className="text-6xl block mb-4">💤</span>
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">You are currently Offline</h2>
                <p className="text-xs text-slate-550 dark:text-neutral-400 mt-2 max-w-md mx-auto">
                  To receive booking requests from nearby customers, toggle your shift status to online.
                </p>
                <button
                  onClick={() => handleToggleShift(true)}
                  className="mt-6 px-6 py-3 bg-sky-600 hover:bg-sky-500 text-black font-extrabold rounded-2xl shadow-lg shadow-sky-600/10 hover:-translate-y-0.5 transition-all cursor-pointer text-sm"
                >
                  ⚡ Go Online & Start Shifts
                </button>
              </div>
            )}

            {/* ONLINE & WAITING SCANNING RADAR */}
            {isOnline && !activeTrip && !activeRequest && !completedSummary && (
              <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-900 rounded-[2rem] p-8 text-center shadow-sm dark:shadow-xl relative overflow-hidden transition-all">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-600 via-yellow-400 to-sky-600"></div>
                <h2 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">Active Radar Search</h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">Waiting for customer booking requests in Bangalore...</p>

                <div className="relative flex items-center justify-center h-48 my-4">
                  <div className="absolute w-36 h-36 bg-sky-600/5 border border-sky-600/15 rounded-full animate-ping"></div>
                  <div className="absolute w-24 h-24 bg-sky-600/10 border border-sky-600/20 rounded-full animate-pulse"></div>
                  <div className="absolute w-14 h-14 bg-sky-600/20 border border-sky-600/35 rounded-full"></div>
                  <span className="text-4xl relative z-10 animate-bounce">🚘</span>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-sky-600/10 text-sky-500 border border-sky-600/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                  Radar scanning active
                </span>
              </div>
            )}

            {/* NEW RIDE REQUEST CARD */}
            {isOnline && activeRequest && !activeTrip && !completedSummary && (
              <div className="bg-white dark:bg-[#050505] border-2 border-sky-600/50 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden transition-all">
                <div className="absolute top-0 inset-x-0 h-1 bg-sky-600"></div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">🚨 NEW RIDE REQUEST FOUND!</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-600/10 border border-sky-600/20 text-orange-400 animate-pulse">
                    ⏱️ {requestTimer}s left
                  </span>
                </div>

                {/* Customer card details */}
                <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-600/10 border border-sky-600/20 flex items-center justify-center text-xl shrink-0">
                      👤
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white">{activeRequest.customer?.name || 'Customer'}</h3>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium block">Rating: 4.8 ★</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase font-semibold block mb-1 text-center">
                      {vehicle.vehicle_type}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-white">{activeRequest.distance} km</span>
                  </div>
                </div>

                {/* Route itinerary timeline */}
                <div className="space-y-4 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4 mb-5 text-xs">
                  <div className="flex gap-3 relative">
                    <div className="absolute top-3 left-[9px] bottom-3 w-0.5 bg-slate-300 dark:bg-neutral-800"></div>
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-[10px] shrink-0 font-bold relative z-10">A</span>
                    <div className="flex-grow">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider">Pickup Location</span>
                      <p className="text-slate-700 dark:text-slate-200 mt-0.5 font-medium">{activeRequest.pickup_address}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center text-[10px] shrink-0 font-bold relative z-10">B</span>
                    <div className="flex-grow">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider">Drop-off Destination</span>
                      <p className="text-slate-700 dark:text-slate-200 mt-0.5 font-medium">{activeRequest.dropoff_address}</p>
                    </div>
                  </div>
                </div>

                {/* Earnings estimation */}
                <div className="bg-gradient-to-r from-sky-600/5 to-sky-600/5 border border-sky-600/10 rounded-2xl p-4 flex items-center justify-between text-xs mb-6">
                  <div>
                    <span className="text-[9px] text-slate-500 dark:text-neutral-400 uppercase tracking-wider block">Estimated Earnings</span>
                    <strong className="text-xl text-orange-400 mt-0.5 block">₹{activeRequest.fare}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-555 dark:text-neutral-400 uppercase tracking-wider block">Estimated Duration</span>
                    <strong className="text-xs text-slate-800 dark:text-white mt-0.5 block">{activeRequest.duration} mins</strong>
                  </div>
                </div>

                {/* Confirm accept/decline buttons */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={handleDeclineRequest}
                    className="col-span-1 py-3 px-4 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 dark:bg-neutral-900 dark:border-neutral-800 text-slate-500 dark:text-slate-400 hover:text-red-400 transition-all cursor-pointer text-xs"
                  >
                    Decline
                  </button>
                  <button
                    onClick={handleAcceptRequest}
                    className="col-span-2 py-3 px-4 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-black hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-xs shadow-lg"
                  >
                    ✅ Accept & Confirm
                  </button>
                </div>
              </div>
            )}

            {/* DRIVER - COMPLETED RIDE SUMMARY */}
            {completedSummary && (
              <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-900 rounded-[2rem] p-6 shadow-sm dark:shadow-xl relative overflow-hidden transition-all text-xs">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400"></div>

                <div className="text-center mb-6">
                  <span className="text-4xl block mb-2">🎉</span>
                  <h3 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">Ride Completed ✓</h3>
                  <p className="text-[10px] text-neutral-400 mt-1 uppercase font-bold tracking-wider">Ride Summary</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-slate-500">Pickup:</span>
                      <strong className="text-slate-800 dark:text-white text-right font-bold">{completedSummary.pickup_address}</strong>
                    </div>
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-slate-500">Destination:</span>
                      <strong className="text-slate-800 dark:text-white text-right font-bold">{completedSummary.dropoff_address}</strong>
                    </div>
                    <hr className="border-slate-200 dark:border-neutral-900" />
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Distance:</span>
                      <strong className="text-slate-800 dark:text-white font-mono font-bold">{completedSummary.distance} km</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Ride Fare:</span>
                      <strong className="text-slate-800 dark:text-white font-mono font-bold">₹{completedSummary.fare}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Payment:</span>
                      <strong className="text-slate-800 dark:text-white uppercase font-bold">{completedSummary.payment?.payment_method || 'Online'}</strong>
                    </div>
                    <hr className="border-slate-200 dark:border-neutral-900" />
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Driver Earning:</span>
                      <strong className="text-emerald-400 text-sm font-mono font-bold">₹{completedSummary.payment?.driver_earning || (completedSummary.fare * 0.9).toFixed(2)}</strong>
                    </div>
                    <hr className="border-slate-200 dark:border-neutral-900" />
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Ride Started:</span>
                      <strong className="text-slate-850 dark:text-slate-300 font-bold">{formatDateTime(completedSummary.pickup_waiting_started_at || completedSummary.created_at)}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Ride Completed:</span>
                      <strong className="text-slate-850 dark:text-slate-300 font-bold">{formatDateTime(completedSummary.updated_at || completedSummary.updatedAt || new Date())}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Total Ride Time:</span>
                      <strong className="text-slate-805 dark:text-white font-bold">{calculateRideDuration(completedSummary)}</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => setCompletedSummary(null)}
                    className="w-full py-3 px-4 rounded-xl font-bold bg-sky-500 hover:bg-sky-400 text-black shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer mt-4 text-xs"
                  >
                    [ Back to Dashboard ]
                  </button>
                </div>
              </div>
            )}

            {/* ACTIVE TRIP CONTROL */}
            {activeTrip && (
              <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-900 rounded-[2rem] p-6 shadow-sm dark:shadow-xl relative overflow-hidden transition-all">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-400 to-indigo-500"></div>

                <h2 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-1">
                  {activeTrip.status === 'accepted'
                    ? 'On the way to Pickup'
                    : activeTrip.status === 'arrived'
                      ? 'Arrived at Pickup Location'
                      : activeTrip.status === 'waiting_for_customer'
                        ? 'Waiting for Customer'
                        : 'Trip in Progress'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mb-6">Follow instructions below to coordinate the ride</p>

                {/* Customer card */}
                <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4 mb-4 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-xl shrink-0">🙋‍♂️</span>
                    <div>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase font-bold tracking-wider">Customer</span>
                      <h3 className="text-xs font-bold text-slate-800 dark:text-white">{activeTrip.customer?.name}</h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Fare</span>
                    <span className="font-bold text-sky-400">₹{activeTrip.fare}</span>
                  </div>
                </div>

                {/* Pickup and dropoff itinerary timeline */}
                <div className="space-y-4 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4 mb-5 text-xs">
                  <div className="flex gap-3 relative">
                    <div className="absolute top-3 left-[9px] bottom-3 w-0.5 bg-slate-300 dark:bg-neutral-800"></div>
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-[10px] shrink-0 font-bold relative z-10">A</span>
                    <div className="flex-grow">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider">Pickup Point</span>
                      <p className="text-slate-700 dark:text-slate-300 font-medium">{activeTrip.pickup_address}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center text-[10px] shrink-0 font-bold relative z-10">B</span>
                    <div className="flex-grow">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider">Drop-off Destination</span>
                      <p className="text-slate-700 dark:text-slate-300 font-medium">{activeTrip.dropoff_address}</p>
                    </div>
                  </div>
                </div>

                {/* Waiting time display */}
                {activeTrip.status === 'waiting_for_customer' && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl p-4 mb-5 text-center text-xs space-y-1">
                    <span className="text-[10px] text-amber-400/80 block uppercase font-bold tracking-wider">Waiting for Customer</span>
                    <div className="text-2xl font-mono font-bold tracking-widest">{formatTime(waitingSeconds)}</div>
                  </div>
                )}

                {/* Progress bar status */}
                <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4 mb-6 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Status: <strong className="text-sky-400">{activeTrip.status.toUpperCase()}</strong>
                    </span>
                    <span className="font-bold text-slate-800 dark:text-white">{displayProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-neutral-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-sky-400 to-indigo-500 h-full rounded-full transition-all duration-300 ease-linear"
                      style={{ width: `${displayProgress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Interactive Status advancement button controls */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleCancelTrip}
                    className="py-3 px-4 rounded-xl font-bold bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:-translate-y-0.5 transition-all text-xs cursor-pointer"
                  >
                    🚫 Cancel Ride
                  </button>

                  {activeTrip.status === 'accepted' && (
                    <button
                      onClick={() => handleUpdateStatus('waiting_for_customer')}
                      className="py-3 px-4 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-black hover:-translate-y-0.5 transition-all text-xs cursor-pointer"
                    >
                      🙋‍♂️ Pick Up Customer
                    </button>
                  )}

                  {activeTrip.status === 'waiting_for_customer' && (
                    <button
                      onClick={() => handleUpdateStatus('in_progress')}
                      className="py-3 px-4 rounded-xl font-bold bg-sky-500 hover:bg-sky-400 text-black hover:-translate-y-0.5 transition-all text-xs cursor-pointer"
                    >
                      🚀 Start Ride
                    </button>
                  )}

                  {activeTrip.status === 'in_progress' && (
                    <button
                      onClick={() => handleUpdateStatus('completed')}
                      className="py-3 px-4 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-black hover:-translate-y-0.5 transition-all text-xs cursor-pointer"
                    >
                      🏁 Complete Ride
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Statistics Profile details & logs */}
          <div className="lg:col-span-5 space-y-4">

            {/* Profile Stats */}
            <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-900 rounded-[2rem] p-6 shadow-xl space-y-4">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-white tracking-tight">Driver Partner Details</h2>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4 text-center">
                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider mb-1">Rating Partner</span>
                  <strong className="text-sky-500 text-[10px] sm:text-xs block font-bold mt-0.5">
                    {reviewsCount > 0 ? `★ ${driverRating.toFixed(2)} (${reviewsCount} Reviews)` : 'No ratings yet'}
                  </strong>
                </div>
                <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4 text-center relative group">
                  <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider mb-1">Vehicle Cab</span>
                  <strong className="text-emerald-400 text-xs block font-bold truncate mt-0.5">{vehicle.vehicle_model || 'UNSET'}</strong>
                  <button
                    onClick={() => setShowVehicleModal(true)}
                    className="absolute top-2 right-2 text-slate-500 hover:text-white cursor-pointer transition-colors text-[10px] bg-slate-200 dark:bg-slate-900 p-1 rounded-md"
                  >
                    ✏️
                  </button>
                </div>
              </div>

              {/* Earnings summary details */}
              <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider block">Shift Earnings</span>
                  <strong className="text-xl text-emerald-400 mt-0.5 block">₹{earnings.toFixed(2)}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider block">Trips Completed</span>
                  <strong className="text-xs text-slate-800 dark:text-white mt-1.5 block">{tripsCount} trips</strong>
                </div>
              </div>
            </div>

            {/* Trip Logs */}
            <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-900 rounded-[2rem] p-6 shadow-sm dark:shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-white tracking-tight mb-1">Shift Trip History</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Rides completed during shift</p>
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

              {loadingHistory ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-neutral-800 animate-pulse shrink-0" />
                        <div className="space-y-1.5">
                          <div className="h-2.5 w-40 bg-slate-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                          <div className="h-2 w-24 bg-slate-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                        </div>
                      </div>
                      <div className="text-right space-y-1.5">
                        <div className="h-2.5 w-10 bg-slate-200 dark:bg-neutral-800 rounded-full animate-pulse ml-auto" />
                        <div className="h-2 w-14 bg-slate-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredHistory.length > 0 ? (
                <div className="space-y-3">
                  {filteredHistory.map((ride) => (
                    <div key={ride.id} className="flex items-center justify-between bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-neutral-900 rounded-2xl p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{ride.status === 'completed' ? '✅' : '❌'}</span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                            {ride.pickup_address} → {ride.dropoff_address}
                          </h4>
                          <span className="text-[9px] text-slate-500">Customer: {ride.customer?.name || 'User'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <strong className="text-xs font-bold text-emerald-400 block">₹{ride.fare}</strong>
                        <span className="text-[7px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
                          {ride.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-xs text-neutral-500">No shift trip records match.</div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* VEHICLE SETUP/EDIT MODAL */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-800 rounded-[2rem] max-w-md w-full p-8 shadow-2xl relative">
            <button
              onClick={() => setShowVehicleModal(false)}
              className="absolute top-6 right-6 text-neutral-500 hover:text-white cursor-pointer transition-colors text-lg"
            >
              ✕
            </button>
            <div className="text-center mb-6">
              <span className="text-2xl block mb-2">🚗</span>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">Vehicle Details</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">Configure vehicle parameters to map requests.</p>
            </div>
            <form onSubmit={handleVehicleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">License Number</label>
                <input
                  type="text"
                  required
                  value={vehicle.license_number}
                  onChange={(e) => setVehicle({ ...vehicle, license_number: e.target.value })}
                  placeholder="e.g. DL-99999"
                  className="block w-full px-4 py-3 bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-800 dark:text-neutral-100 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vehicle Model</label>
                <input
                  type="text"
                  required
                  value={vehicle.vehicle_model}
                  onChange={(e) => setVehicle({ ...vehicle, vehicle_model: e.target.value })}
                  placeholder="e.g. Toyota Camry"
                  className="block w-full px-4 py-3 bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-800 dark:text-neutral-100 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">License Plate Number</label>
                <input
                  type="text"
                  required
                  value={vehicle.vehicle_plate_number}
                  onChange={(e) => setVehicle({ ...vehicle, vehicle_plate_number: e.target.value.toUpperCase() })}
                  placeholder="e.g. MH12AB1234"
                  className="block w-full px-4 py-3 bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-800 dark:text-neutral-100 text-xs focus:outline-none uppercase"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vehicle Color</label>
                <input
                  type="text"
                  required
                  value={vehicle.vehicle_color}
                  onChange={(e) => setVehicle({ ...vehicle, vehicle_color: e.target.value })}
                  placeholder="e.g. White"
                  className="block w-full px-4 py-3 bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-800 dark:text-neutral-100 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cab Category</label>
                <select
                  value={vehicle.vehicle_type}
                  onChange={(e) => setVehicle({ ...vehicle, vehicle_type: e.target.value })}
                  className="block w-full px-4 py-3 bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-800 dark:text-neutral-100 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="hatchback">Hatchback</option>
                  <option value="bike">Bike</option>
                  <option value="rickshaw">Rickshaw</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl font-bold bg-sky-600 hover:bg-sky-500 text-black shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer mt-6 text-xs"
              >
                Save Vehicle Details
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PROFILE DETAILS MODAL */}
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
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">Manage preferences and view partner details.</p>
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
                <div className="flex flex-col gap-2 border-b border-slate-200/50 dark:border-neutral-900/60 pb-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400 text-xs">Vehicle Registered</span>
                    {vehicle.vehicle_plate_number ? (
                      <strong className="text-slate-800 dark:text-white text-xs">
                        {vehicle.vehicle_model} ({vehicle.vehicle_plate_number})
                      </strong>
                    ) : (
                      <strong className="text-red-400 text-xs italic">No vehicle linked yet</strong>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 mt-1">
                    {vehicle.vehicle_plate_number ? (
                      <>
                        <button
                          onClick={() => {
                            setShowVehicleModal(true);
                            setShowProfileModal(false);
                          }}
                          className="px-2.5 py-1 text-[10px] bg-sky-600/10 hover:bg-sky-600/20 text-sky-400 border border-sky-600/20 rounded-md font-bold cursor-pointer"
                        >
                          ✏️ Edit Vehicle
                        </button>
                        <button
                          onClick={handleRemoveVehicle}
                          className="px-2.5 py-1 text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-md font-bold cursor-pointer"
                        >
                          🗑️ Remove
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setShowVehicleModal(true);
                          setShowProfileModal(false);
                        }}
                        className="px-2.5 py-1 text-[10px] bg-emerald-500/10 hover:bg-emerald-550/20 text-emerald-455 text-emerald-400 border border-emerald-500/20 rounded-md font-bold cursor-pointer"
                      >
                        ➕ Link Vehicle
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Registration Role</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-600/10 text-sky-505 text-sky-500 border border-sky-600/20 uppercase">
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

    </div>
  );
}
