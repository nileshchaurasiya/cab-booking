import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { Car, Lock, Mail, User as UserIcon, Phone, FileText, Palette, Layers, ChevronRight } from 'lucide-react';

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Role defaults to 'customer' unless specified as 'driver'
  const roleParam = searchParams.get('role') === 'driver' ? 'driver' : 'customer';

  const [step, setStep] = useState<'account' | 'vehicle'>('account');

  // Step 1 Form data
  const [accountForm, setAccountForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    role: roleParam,
  });

  // Step 2 Form data (Driver details)
  const [vehicleForm, setVehicleForm] = useState({
    license_number: '',
    vehicle_model: '',
    vehicle_plate_number: '',
    vehicle_color: '',
    vehicle_type: 'sedan',
  });

  useEffect(() => {
    setAccountForm((prev) => ({ ...prev, role: roleParam }));
  }, [roleParam]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAccountForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleVehicleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setVehicleForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (accountForm.password !== accountForm.password_confirmation) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest('/register', {
        method: 'POST',
        body: JSON.stringify(accountForm),
      });

      // Save token and initial user profile
      localStorage.setItem(`${data.user.role}_auth_token`, data.access_token);
      localStorage.setItem(`${data.user.role}_auth_user`, JSON.stringify(data.user));

      if (data.user.role === 'driver') {
        // Switch to Step 2 for drivers
        setStep('vehicle');
      } else {
        // Customers proceed immediately to their portal
        navigate('/customer');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Verify input details.');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiRequest('/driver/vehicle', {
        method: 'POST',
        body: JSON.stringify(vehicleForm),
      });

      // Refresh /me payload to ensure local profile cache is updated with driver detail
      const meRes = await apiRequest('/me');
      localStorage.setItem('driver_auth_user', JSON.stringify(meRes.user));

      navigate('/driver');
    } catch (err: any) {
      setError(err.message || 'Vehicle registration failed. Verify inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipVehicle = () => {
    navigate('/driver');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Orbs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-lg shadow-amber-500/5 mb-3">
            <Car className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Join Indian Cabs</h1>
          <p className="text-xs text-neutral-400 font-medium mt-1">Register a new account to get started</p>
        </div>

        {/* Card */}
        <div className="bg-[#0c0c0e] border border-neutral-900 rounded-[2rem] p-8 shadow-2xl transition-all duration-300">
          
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium">
              {error}
            </div>
          )}

          {step === 'account' ? (
            <>
              <h2 className="text-lg font-bold text-center text-white mb-6">
                Sign up as {accountForm.role.charAt(0).toUpperCase() + accountForm.role.slice(1)}
              </h2>

              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <UserIcon className="h-4 w-4 text-neutral-500" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      required
                      value={accountForm.name}
                      onChange={handleAccountChange}
                      placeholder="Full Name"
                      className="block w-full pl-11 pr-4 py-3 bg-black border border-neutral-800 rounded-2xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-neutral-500" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      required
                      value={accountForm.email}
                      onChange={handleAccountChange}
                      placeholder="Email Address"
                      className="block w-full pl-11 pr-4 py-3 bg-black border border-neutral-800 rounded-2xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>

                  <div className="relative md:col-span-2">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-neutral-500" />
                    </div>
                    <input
                      type="text"
                      name="phone"
                      required
                      value={accountForm.phone}
                      onChange={handleAccountChange}
                      placeholder="Phone Number (e.g. +1234567890)"
                      className="block w-full pl-11 pr-4 py-3 bg-black border border-neutral-800 rounded-2xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-neutral-500" />
                    </div>
                    <input
                      type="password"
                      name="password"
                      required
                      value={accountForm.password}
                      onChange={handleAccountChange}
                      placeholder="Password"
                      className="block w-full pl-11 pr-4 py-3 bg-black border border-neutral-800 rounded-2xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-neutral-500" />
                    </div>
                    <input
                      type="password"
                      name="password_confirmation"
                      required
                      value={accountForm.password_confirmation}
                      onChange={handleAccountChange}
                      placeholder="Confirm Password"
                      className="block w-full pl-11 pr-4 py-3 bg-black border border-neutral-800 rounded-2xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-2xl font-bold bg-white text-black shadow-lg transition-all duration-200 cursor-pointer hover:bg-neutral-200 mt-6 active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? 'Registering Account...' : 'Continue'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>

              <div className="text-center text-xs text-slate-400 mt-6 font-semibold">
                Already have an account?
                <Link to="/login" className="text-amber-550 hover:text-amber-400 font-bold ml-1 transition-all">
                  Login here
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-center text-white mb-2">
                Vehicle Registration
              </h2>
              <p className="text-xs text-neutral-400 text-center mb-6 font-medium">Please link a vehicle details to start accepting ride requests.</p>

              <form onSubmit={handleVehicleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FileText className="h-4 w-4 text-neutral-500" />
                    </div>
                    <input
                      type="text"
                      name="license_number"
                      required
                      value={vehicleForm.license_number}
                      onChange={handleVehicleChange}
                      placeholder="License Number"
                      className="block w-full pl-11 pr-4 py-3 bg-black border border-neutral-800 rounded-2xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Car className="h-4 w-4 text-neutral-500" />
                    </div>
                    <input
                      type="text"
                      name="vehicle_model"
                      required
                      value={vehicleForm.vehicle_model}
                      onChange={handleVehicleChange}
                      placeholder="Vehicle Model (e.g. Camry)"
                      className="block w-full pl-11 pr-4 py-3 bg-black border border-neutral-800 rounded-2xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FileText className="h-4 w-4 text-neutral-500" />
                    </div>
                    <input
                      type="text"
                      name="vehicle_plate_number"
                      required
                      value={vehicleForm.vehicle_plate_number}
                      onChange={handleVehicleChange}
                      placeholder="Plate Number"
                      className="block w-full pl-11 pr-4 py-3 bg-black border border-neutral-800 rounded-2xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all uppercase"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Palette className="h-4 w-4 text-neutral-500" />
                    </div>
                    <input
                      type="text"
                      name="vehicle_color"
                      required
                      value={vehicleForm.vehicle_color}
                      onChange={handleVehicleChange}
                      placeholder="Vehicle Color"
                      className="block w-full pl-11 pr-4 py-3 bg-black border border-neutral-800 rounded-2xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>

                  <div className="relative md:col-span-2">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Layers className="h-4 w-4 text-neutral-500" />
                    </div>
                    <select
                      name="vehicle_type"
                      value={vehicleForm.vehicle_type}
                      onChange={handleVehicleChange}
                      className="block w-full pl-11 pr-4 py-3 bg-black border border-neutral-800 rounded-2xl text-neutral-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none cursor-pointer"
                    >
                      <option value="sedan">Sedan</option>
                      <option value="suv">SUV</option>
                      <option value="hatchback">Hatchback</option>
                      <option value="bike">Bike / Motorcycle</option>
                      <option value="rickshaw">Rickshaw</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-2xl font-bold bg-white text-black shadow-lg transition-all duration-200 cursor-pointer hover:bg-neutral-200 mt-6 active:scale-95"
                >
                  {loading ? 'Saving Vehicle Details...' : 'Complete Registration'}
                </button>
              </form>

              <button
                onClick={handleSkipVehicle}
                className="w-full py-3 text-center text-xs text-neutral-500 hover:text-neutral-350 cursor-pointer font-bold mt-4 block"
              >
                Skip vehicle registration for now
              </button>
            </>
          )}
        </div>
      </div>

      <footer className="text-center py-6 text-neutral-600 text-xs mt-6">
        <p>Indian Cabs System v2.0 • React & Sanctum Edition</p>
      </footer>
    </div>
  );
}
