import { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { Users, IndianRupee, CheckCircle, RefreshCw, UserMinus, UserCheck, LogOut } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { getRideDurationDisplay, formatISTDateTime } from '../utils/timeUtils';

export default function AdminDashboard({ user, onLogout }: { user: any; onLogout: () => void }) {
  useEffect(() => { document.title = 'Admin - Indian Cabs'; }, []);
  // Statistics states
  const [stats, setStats] = useState({
    total_earnings: 0,
    total_completed_rides: 0,
    total_users: 0,
    active_drivers_online: 0,
  });

  // Roster lists
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);

  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  const [historyRides, setHistoryRides] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  // Toast messages
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    // Initial fetch
    fetchStats();
    fetchDrivers();
    fetchActiveBookings();
    fetchHistory();

    // Auto-refresh interval (every 2 seconds)
    const interval = setInterval(() => {
      fetchStats();
      fetchDrivers(false); // false = don't show loading spinner
      fetchActiveBookings(false);
      fetchHistory(false);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await apiRequest('/admin/dashboard');
      setStats(res.stats || {
        total_earnings: 0,
        total_completed_rides: 0,
        total_users: 0,
        active_drivers_online: 0,
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchDrivers = async (showLoader = true) => {
    if (showLoader) setLoadingDrivers(true);
    try {
      const res = await apiRequest('/admin/users?role=driver');
      setDrivers(res.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const fetchActiveBookings = async (showLoader = true) => {
    if (showLoader) setLoadingBookings(true);
    try {
      const res = await apiRequest('/admin/rides');
      // Show rides that are in progress (requested, accepted, arrived, in_progress)
      const list = res.data || [];
      const active = list.filter((r: any) => ['requested', 'accepted', 'arrived', 'in_progress'].includes(r.status));
      setActiveBookings(active);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchHistory = async (showLoader = true) => {
    if (showLoader) setLoadingHistory(true);
    try {
      const res = await apiRequest('/admin/rides');
      setHistoryRides(res.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await apiRequest(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      addToast(`User status changed to: ${nextStatus}.`);
      fetchDrivers();
      fetchStats();
    } catch (err: any) {
      addToast(err.message || 'Failed to update user status.', 'error');
    }
  };

  const handleRemoveDriver = async (driverId: number, driverName: string) => {
    if (!window.confirm(`Are you sure you want to permanently remove "${driverName}" from the system? This action cannot be undone.`)) {
      return;
    }
    try {
      await apiRequest(`/admin/users/${driverId}`, { method: 'DELETE' });
      addToast(`Driver "${driverName}" removed from system successfully.`);
      fetchDrivers();
      fetchStats();
    } catch (err: any) {
      addToast(err.message || 'Failed to remove driver from system.', 'error');
    }
  };

  const handleRefreshAll = () => {
    fetchStats();
    fetchDrivers();
    fetchActiveBookings();
    fetchHistory();
    addToast('Admin console synchronized.');
  };

  const filteredHistory = historyRides.filter((ride) => {
    if (historyFilter === 'all') return true;
    return ride.status === historyFilter;
  });

  return (
    <div className="bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-100 min-h-screen flex flex-col font-sans antialiased transition-colors duration-300">

      {/* Header / Navbar */}
      <header className="border-b border-slate-200 dark:border-neutral-900 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">

          {/* Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 shadow-lg shadow-purple-500/5 shrink-0">
              <svg className="w-6 h-6 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 2 12 22Z" />
                <path d="M12 2V22" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div className="whitespace-nowrap">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none whitespace-nowrap">
                Indian Cabs
              </h1>
              <span className="text-[9px] sm:text-[10px] text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider block mt-0.5 whitespace-nowrap">
                Admin Control Center
              </span>
            </div>
          </div>

          {/* Profile & Logout */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 border-l border-slate-200 dark:border-neutral-900 pl-6">
              <div className="text-right hidden md:block">
                <span className="text-xs font-bold text-slate-800 dark:text-white block">{user.name || 'System Admin'}</span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium block">Active Session</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400/10 to-indigo-500/10 border border-purple-500/20 shadow-lg flex items-center justify-center text-lg">
                👨‍💻
              </div>
              <ThemeToggle />
              <button
                onClick={onLogout}
                title="Logout"
                className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">

        {/* Toast Alert Banner */}
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none max-w-sm w-full items-center">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-xl shadow-lg border transition-all duration-300 text-xs font-semibold flex items-center gap-2 ${toast.type === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-400 font-bold'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold'
                }`}
            >
              <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
              <span>{toast.message}</span>
            </div>
          ))}
        </div>

        {/* Admin Title Block */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-neutral-900 rounded-[2rem] p-6 shadow-sm dark:shadow-xl transition-colors duration-300">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Admin Operations Panel</h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400">System analytics, driver moderation, and active booking oversight</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefreshAll}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-950 hover:bg-slate-200 dark:hover:bg-neutral-900 text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-white cursor-pointer transition-all"
              title="Refresh All Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Earnings */}
          <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-900 rounded-2xl sm:rounded-3xl p-6 flex items-center justify-between shadow-sm dark:shadow-xl">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Admin Income (10%)</span>
              <strong className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white mt-1 block">
                ₹{(stats.total_earnings).toFixed(2)}
              </strong>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-purple-400" />
            </div>
          </div>

          {/* Trips Completed */}
          <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-900 rounded-2xl sm:rounded-3xl p-6 flex items-center justify-between shadow-sm dark:shadow-xl">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Completed Journeys</span>
              <strong className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white mt-1 block">{stats.total_completed_rides}</strong>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          {/* Available drivers */}
          <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-900 rounded-2xl sm:rounded-3xl p-6 flex items-center justify-between shadow-sm dark:shadow-xl">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Active Drivers Online</span>
              <strong className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white mt-1 block">{stats.active_drivers_online}</strong>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center animate-pulse">
              <Users className="w-6 h-6 text-sky-400" />
            </div>
          </div>
        </div>

        {/* Roster & Active Bookings Roster Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Driver Roster */}
          <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-900 rounded-3xl p-6 shadow-sm dark:shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Driver Roster</h2>
            {loadingDrivers ? (
              <div className="text-center py-6 text-xs text-neutral-500">Loading roster...</div>
            ) : drivers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-neutral-900 text-slate-400 dark:text-slate-550 font-bold pb-2">
                      <th className="pb-3 pr-2">Driver</th>
                      <th className="pb-3 pr-2">Vehicle</th>
                      <th className="pb-3 pr-2">Shift Status</th>
                      <th className="pb-3 pr-2">Account</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-neutral-900/60">
                    {drivers.map((drv) => (
                      <tr key={drv.id} className="text-slate-600 dark:text-neutral-300">
                        <td className="py-3.5 pr-2">
                          <div>
                            <strong className="text-slate-850 dark:text-white block">{drv.name}</strong>
                            <span className="text-[10px] text-neutral-500">{drv.phone}</span>
                          </div>
                        </td>
                        <td className="py-3.5 pr-2">
                          {drv.driver_detail ? (
                            <div>
                              <span className="block font-medium">{drv.driver_detail.vehicle_model} ({drv.driver_detail.vehicle_type || 'car'})</span>
                              <span className="text-[10px] text-neutral-500 font-mono uppercase">{drv.driver_detail.vehicle_plate_number}</span>
                            </div>
                          ) : (
                            <span className="text-neutral-500 italic">No details set</span>
                          )}
                        </td>
                        <td className="py-3.5 pr-2">
                          {drv.active_trip || drv.shift_status === 'on_trip' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/25" title={`Active Ride #${drv.active_trip?.id || ''}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                              On Trip (In Ride)
                            </span>
                          ) : drv.driver_detail?.is_available || drv.shift_status === 'available' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-500/10 text-slate-400 border border-slate-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              Offline
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 pr-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${drv.status === 'suspended'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-green-500/10 text-green-400 border border-green-500/20'
                            }`}>
                            {drv.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleUserStatus(drv.id, drv.status)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${drv.status === 'suspended'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20'
                                }`}
                            >
                              {drv.status === 'suspended' ? <UserCheck className="w-3.5 h-3.5 inline mr-1" /> : <UserMinus className="w-3.5 h-3.5 inline mr-1" />}
                              {drv.status === 'suspended' ? 'Activate' : 'Suspend'}
                            </button>
                            {!drv.driver_detail && (
                              <button
                                onClick={() => handleRemoveDriver(drv.id, drv.name)}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                                title="No vehicle details — remove from system"
                              >
                                🗑️ Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-neutral-500">No registered drivers found.</div>
            )}
          </div>

          {/* Active Bookings */}
          <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-900 rounded-3xl p-6 shadow-sm dark:shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Active Bookings</h2>
            {loadingBookings ? (
              <div className="text-center py-6 text-xs text-neutral-500">Loading trips...</div>
            ) : activeBookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-neutral-900 text-slate-400 dark:text-slate-550 font-bold pb-2">
                      <th className="pb-3 pr-2">Customer</th>
                      <th className="pb-3 pr-2">Route</th>
                      <th className="pb-3 pr-2 text-right">Fare</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-neutral-900/60">
                    {activeBookings.map((ride) => (
                      <tr key={ride.id} className="text-slate-650 dark:text-neutral-350">
                        <td className="py-3.5 pr-2">
                          <strong className="text-slate-900 dark:text-white block">{ride.customer?.name}</strong>
                          <span className="text-[10px] text-neutral-500 block">{ride.customer?.phone}</span>
                        </td>
                        <td className="py-3.5 pr-2">
                          <div className="max-w-[150px] truncate" title={`${ride.pickup_address} → ${ride.dropoff_address}`}>
                            {ride.pickup_address} → {ride.dropoff_address}
                          </div>
                        </td>
                        <td className="py-3.5 pr-2 text-right font-bold text-slate-900 dark:text-white">₹{ride.fare}</td>
                        <td className="py-3.5 text-right">
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase text-[9px]">
                            {ride.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-neutral-500">No active rides in progress.</div>
            )}
          </div>
        </div>

        {/* Completed Rides and transactions list */}
        <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-900 rounded-3xl p-6 shadow-sm dark:shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-100 dark:border-neutral-900 pb-4 gap-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">Transactions & Ride History</h2>
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
            <div className="text-center py-6 text-xs text-neutral-500">Loading history logs...</div>
          ) : filteredHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-neutral-900 text-slate-500 dark:text-slate-400 font-bold pb-2">
                    <th className="pb-3 pr-2">ID / Customer</th>
                    <th className="pb-3 pr-2">Driver</th>
                    <th className="pb-3 pr-2">Route Details</th>
                    <th className="pb-3 pr-2 text-right">Fare</th>
                    <th className="pb-3 pr-2 text-right">Admin Income (10%)</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-900/60">
                  {filteredHistory.map((ride) => (
                    <tr key={ride.id} className="text-slate-600 dark:text-neutral-350">
                      <td className="py-3.5 pr-2">
                        <strong className="text-slate-800 dark:text-white block">#{ride.id} - {ride.customer?.name}</strong>
                      </td>
                      <td className="py-3.5 pr-2">
                        {ride.driver ? (
                          <div>
                            <span className="block font-medium">{ride.driver.name}</span>
                            <span className="text-[10px] text-neutral-500">{ride.driver.phone}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-500 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 pr-2">
                        <div>
                          <span>{ride.pickup_address} → {ride.dropoff_address}</span>
                          <span className="block text-[10px] text-neutral-500">
                            {formatISTDateTime(ride.startedAt || ride.created_at || ride.createdAt)} • Duration: {getRideDurationDisplay(ride)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-2 text-right font-bold text-slate-800 dark:text-white">₹{ride.fare}</td>
                      <td className="py-3.5 pr-2 text-right font-bold text-purple-400">₹{(parseFloat(ride.fare) * 0.1).toFixed(2)}</td>
                      <td className="py-3.5 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${ride.status === 'completed'
                          ? 'bg-green-500/10 dark:bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/20 dark:border-green-500/30'
                          : 'bg-red-500/10 dark:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20 dark:border-red-500/30'
                          }`}>
                          {ride.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-neutral-500">No shift log transactions found.</div>
          )}
        </div>

      </main>
    </div>
  );
}
