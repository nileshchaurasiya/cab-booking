import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { Users, DollarSign, CheckCircle, RefreshCw, UserMinus, UserCheck, Plus, LogOut } from 'lucide-react';

export default function AdminDashboard({ user, onLogout }: { user: any; onLogout: () => void }) {
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

  // Modals state
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);

  // Form inputs for direct driver registration
  const [driverForm, setDriverForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    license_number: '',
    vehicle_model: '',
    vehicle_plate_number: '',
    vehicle_color: '',
    vehicle_type: 'sedan',
  });
  const [registeringDriver, setRegisteringDriver] = useState(false);

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
    fetchStats();
    fetchDrivers();
    fetchActiveBookings();
    fetchHistory();
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

  const fetchDrivers = async () => {
    setLoadingDrivers(true);
    try {
      const res = await apiRequest('/admin/users?role=driver');
      setDrivers(res.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const fetchActiveBookings = async () => {
    setLoadingBookings(true);
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

  const fetchHistory = async () => {
    setLoadingHistory(true);
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

  const handleAddDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisteringDriver(true);

    try {
      await apiRequest('/register', {
        method: 'POST',
        body: JSON.stringify({
          ...driverForm,
          role: 'driver',
        }),
      });

      addToast('Driver account registered successfully!');
      setShowAddDriverModal(false);
      // Reset inputs
      setDriverForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
        license_number: '',
        vehicle_model: '',
        vehicle_plate_number: '',
        vehicle_color: '',
        vehicle_type: 'sedan',
      });
      fetchDrivers();
      fetchStats();
    } catch (err: any) {
      addToast(err.message || 'Failed to register driver account.', 'error');
    } finally {
      setRegisteringDriver(false);
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
              <span className="text-[9px] sm:text-[10px] text-purple-450 text-purple-400 font-semibold uppercase tracking-wider block mt-0.5 whitespace-nowrap">
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
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
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
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-[#0c0c0e] border border-neutral-900 rounded-[2rem] p-6">
        <div>
          <h2 className="text-xl font-extrabold text-white">Admin Operations Panel</h2>
          <p className="text-xs text-neutral-400">System analytics, driver moderation, and active booking oversight</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefreshAll}
            className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-white cursor-pointer transition-all"
            title="Refresh All Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddDriverModal(true)}
            className="flex items-center gap-1 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-black text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-sky-550/10"
          >
            <Plus className="w-4 h-4" />
            Add Driver
          </button>
        </div>
      </div>

      {/* Stats Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Earnings */}
        <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-900 rounded-2xl sm:rounded-3xl p-6 flex items-center justify-between shadow-sm dark:shadow-xl">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Admin Commission (10%)</span>
            <strong className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white mt-1 block">
              ₹{(stats.total_earnings * 0.1).toFixed(2)}
            </strong>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-purple-400" />
          </div>
        </div>

        {/* Trips Completed */}
        <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-900 rounded-2xl sm:rounded-3xl p-6 flex items-center justify-between shadow-sm dark:shadow-xl">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Completed Journeys</span>
            <strong className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white mt-1 block">{stats.total_completed_rides}</strong>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-emerald-450 text-emerald-450" />
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
                    <th className="pb-3 pr-2">Status</th>
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
                            <span className="block font-medium">{drv.driver_detail.vehicle_model}</span>
                            <span className="text-[10px] text-neutral-500 font-mono uppercase">{drv.driver_detail.vehicle_plate_number}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-500 italic">No details set</span>
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
                        <button
                          onClick={() => handleToggleUserStatus(drv.id, drv.status)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${drv.status === 'suspended'
                              ? 'bg-emerald-500/10 border-emerald-550/20 text-emerald-450 hover:bg-emerald-500/20'
                              : 'bg-red-500/10 border-red-550/20 text-red-400 hover:bg-red-500/20'
                            }`}
                        >
                          {drv.status === 'suspended' ? <UserCheck className="w-3.5 h-3.5 inline mr-1" /> : <UserMinus className="w-3.5 h-3.5 inline mr-1" />}
                          {drv.status === 'suspended' ? 'Activate' : 'Suspend'}
                        </button>
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
                      <td className="py-3.5 pr-2 text-right font-bold text-slate-905 dark:text-white">₹{ride.fare}</td>
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
                <tr className="border-b border-slate-100 dark:border-neutral-900 text-slate-450 dark:text-slate-500 font-bold pb-2">
                  <th className="pb-3 pr-2">ID / Customer</th>
                  <th className="pb-3 pr-2">Driver</th>
                  <th className="pb-3 pr-2">Route Details</th>
                  <th className="pb-3 pr-2 text-right">Fare</th>
                  <th className="pb-3 pr-2 text-right">Commission (10%)</th>
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
                      </div>
                    </td>
                    <td className="py-3.5 pr-2 text-right font-bold text-slate-800 dark:text-white">₹{ride.fare}</td>
                    <td className="py-3.5 pr-2 text-right font-bold text-purple-400">₹{(parseFloat(ride.fare) * 0.1).toFixed(2)}</td>
                    <td className="py-3.5 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${ride.status === 'completed'
                          ? 'bg-green-500/10 text-green-450 border border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
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

      {/* ADD DRIVER MODAL */}
      {showAddDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-neutral-800 rounded-[2rem] max-w-md w-full p-8 shadow-2xl relative">
            <button
              onClick={() => setShowAddDriverModal(false)}
              className="absolute top-6 right-6 text-neutral-500 hover:text-white cursor-pointer transition-colors text-lg"
            >
              ✕
            </button>
            <div className="text-center mb-6">
              <span className="text-3xl block mb-2">🚗</span>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">Add New Driver</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">Create a driver account partner credentials instantly.</p>
            </div>
            <form onSubmit={handleAddDriverSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  value={driverForm.name}
                  onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                  placeholder="Full Name"
                  className="block w-full px-4 py-3 bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-850 dark:text-neutral-100 text-xs focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="email"
                  required
                  value={driverForm.email}
                  onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
                  placeholder="Email Address"
                  className="block w-full px-4 py-3 bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-850 dark:text-neutral-100 text-xs focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  required
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                  placeholder="Phone (e.g. 0987654321)"
                  className="block w-full px-4 py-3 bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-850 dark:text-neutral-100 text-xs focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  value={driverForm.password}
                  onChange={(e) => setDriverForm({ ...driverForm, password: e.target.value })}
                  placeholder="Set Password"
                  className="block w-full px-4 py-3 bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-850 dark:text-neutral-100 text-xs focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  value={driverForm.password_confirmation}
                  onChange={(e) => setDriverForm({ ...driverForm, password_confirmation: e.target.value })}
                  placeholder="Confirm Password"
                  className="block w-full px-4 py-3 bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-850 dark:text-neutral-100 text-xs focus:outline-none"
                />
              </div>

              <div className="border-t border-neutral-900 pt-4 space-y-3">
                <input
                  type="text"
                  required
                  value={driverForm.license_number}
                  onChange={(e) => setDriverForm({ ...driverForm, license_number: e.target.value })}
                  placeholder="License Number"
                  className="block w-full px-4 py-3 bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-850 dark:text-neutral-100 text-xs focus:outline-none"
                />
                <input
                  type="text"
                  required
                  value={driverForm.vehicle_model}
                  onChange={(e) => setDriverForm({ ...driverForm, vehicle_model: e.target.value })}
                  placeholder="Vehicle Model (e.g. Suzuki)"
                  className="block w-full px-4 py-3 bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-850 dark:text-neutral-100 text-xs focus:outline-none"
                />
                <input
                  type="text"
                  required
                  value={driverForm.vehicle_plate_number}
                  onChange={(e) => setDriverForm({ ...driverForm, vehicle_plate_number: e.target.value.toUpperCase() })}
                  placeholder="Plate Number (e.g. MH12AB1234)"
                  className="block w-full px-4 py-3 bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-850 dark:text-neutral-100 text-xs focus:outline-none uppercase"
                />
                <input
                  type="text"
                  required
                  value={driverForm.vehicle_color}
                  onChange={(e) => setDriverForm({ ...driverForm, vehicle_color: e.target.value })}
                  placeholder="Vehicle Color"
                  className="block w-full px-4 py-3 bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-850 dark:text-neutral-100 text-xs focus:outline-none"
                />
                <select
                  value={driverForm.vehicle_type}
                  onChange={(e) => setDriverForm({ ...driverForm, vehicle_type: e.target.value })}
                  className="block w-full px-4 py-3 bg-slate-100 dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-850 dark:text-neutral-100 text-xs focus:outline-none"
                >
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="hatchback">Hatchback</option>
                  <option value="bike">Bike</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={registeringDriver}
                className="w-full py-3.5 px-4 rounded-xl font-bold bg-sky-500 hover:bg-sky-400 text-black shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer mt-6 text-xs"
              >
                {registeringDriver ? 'Registering Driver...' : 'Register Driver Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      </main>
    </div>
  );
}
