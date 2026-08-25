import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import CustomerDashboard from './CustomerDashboard';
import DriverDashboard from './DriverDashboard';
import { User as UserIcon, Shield, Car, Phone, Mail } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await apiRequest('/me');
        setUser(data.user);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      } catch (err) {
        // Clear token if invalid or unauthorized
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await apiRequest('/logout', { method: 'POST' });
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-slate-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
          <p className="text-xs text-neutral-500 font-medium">Verifying active session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 p-6 relative overflow-hidden font-sans">
      {/* Orbs */}
      {/* <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl -z-10"></div> */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-10"></div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        {/* <header className="flex items-center justify-between bg-[#0c0c0e] border border-neutral-900 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">GoCab Dashboard</h1>
              <p className="text-xs text-neutral-400">Authenticated Session Active</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </header> */}

        {/* Dynamic content rendering based on role */}
        {user.role === 'customer' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 bg-[#0c0c0e] border border-neutral-900 rounded-[2rem] p-8 space-y-6 text-center h-fit">
              <div className="w-20 h-20 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto shadow-inner">
                <UserIcon className="w-8 h-8 text-sky-400" />
              </div>

              <div>
                <h2 className="text-md font-bold text-white">{user.name}</h2>
                <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase mt-2 bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {user.role}
                </span>
              </div>

              <div className="text-left space-y-3 pt-4 border-t border-neutral-900 text-xs text-neutral-400">
                <div className="flex items-center gap-2 overflow-hidden text-ellipsis">
                  <Mail className="w-4 h-4 text-neutral-500 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-neutral-500 shrink-0" />
                  <span>{user.phone}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <CustomerDashboard user={user} onLogout={handleLogout} />
            </div>
          </div>
        ) : user.role === 'driver' ? (
          <DriverDashboard user={user} onLogout={handleLogout} />
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-[#0c0c0e] border border-neutral-900 rounded-[2rem] p-8 space-y-6 text-center">
              <div className="w-24 h-24 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto shadow-inner">
                {user.role === 'admin' ? (
                  <Shield className="w-10 h-10 text-purple-400" />
                ) : (
                  <Car className="w-10 h-10 text-amber-400" />
                )}
              </div>

              <div>
                <h2 className="text-lg font-bold text-white">{user.name}</h2>
                <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase mt-2 ${user.role === 'admin'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                  {user.role}
                </span>
              </div>

              <div className="text-left space-y-3 pt-4 border-t border-neutral-900 text-xs text-neutral-400">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-neutral-500" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-neutral-500" />
                  <span>{user.phone}</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 bg-[#0c0c0e] border border-neutral-900 rounded-[2rem] p-8 space-y-6">
              <h3 className="text-md font-bold text-white">Active Session Details ({user.role.toUpperCase()})</h3>
              <p className="text-xs text-neutral-400">
                Logged in successfully. Admin interactive control panel pages are being migrated next.
              </p>

              <pre className="bg-black border border-neutral-900 p-6 rounded-2xl text-[11px] text-green-400 font-mono overflow-auto max-h-64 leading-relaxed">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
