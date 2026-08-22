import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { Car, Lock, Mail, Shield, User as UserIcon, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [role, setRole] = useState<'customer' | 'driver' | 'admin'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      // Verify role matches selection (or admin is permitted)
      const user = data.user;
      if (user.role !== role) {
        throw new Error(`Unauthorized. This account is registered as a ${user.role}.`);
      }

      localStorage.setItem(`${user.role}_auth_token`, data.access_token);
      localStorage.setItem(`${user.role}_auth_user`, JSON.stringify(user));
      navigate(`/${user.role}`);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Decorative Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 shadow-lg shadow-amber-500/5 mb-4">
            <Car className="w-9 h-9 text-amber-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Indian Cabs</h1>
          <p className="text-sm text-neutral-400 font-medium mt-1">Premium ride booking & dispatch portal</p>
        </div>

        {/* Auth Box */}
        <div className="bg-[#0c0c0e] border border-neutral-900 rounded-[2rem] p-8 shadow-2xl transition-all duration-300">
          {/* Role Tabs */}
          <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-1.5 rounded-2xl mb-6 border border-neutral-900">
            <button
              onClick={() => setRole('customer')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                role === 'customer'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              Customer
            </button>
            <button
              onClick={() => setRole('driver')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                role === 'driver'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              Driver
            </button>
            <button
              onClick={() => setRole('admin')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                role === 'admin'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>
          </div>

          <h2 className="text-xl font-bold text-center text-white mb-6">
            Log in as {role.charAt(0).toUpperCase() + role.slice(1)}
          </h2>

          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-neutral-500" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="block w-full pl-11 pr-4 py-3.5 bg-black border border-neutral-800 rounded-2xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-neutral-500" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="block w-full pl-11 pr-11 py-3.5 bg-black border border-neutral-800 rounded-2xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-500 hover:text-neutral-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 px-4 rounded-2xl font-bold bg-white text-black shadow-lg transition-all duration-200 cursor-pointer hover:bg-neutral-200 mt-4 active:scale-95 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Toggle Link */}
          {role !== 'admin' && (
            <div className="text-center text-xs text-slate-400 mt-6 font-semibold">
              Don't have an account?
              <Link
                to={`/register?role=${role}`}
                className="text-amber-500 hover:text-amber-400 font-bold ml-1 transition-all"
              >
                Register as {role.charAt(0).toUpperCase() + role.slice(1)}
              </Link>
            </div>
          )}
        </div>
      </div>

      <footer className="text-center py-6 text-neutral-600 text-xs mt-8">
        <p>Indian Cabs System v2.0 • React & Sanctum Edition</p>
      </footer>
    </div>
  );
}
