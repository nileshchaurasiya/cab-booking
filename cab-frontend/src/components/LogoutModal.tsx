import React from 'react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  role: 'customer' | 'driver' | 'admin';
}

export const LogoutModal: React.FC<LogoutModalProps> = ({ isOpen, onClose, onConfirm, userName, role }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
      <div className="bg-white dark:bg-[#0c0c0e] rounded-2xl shadow-xl p-6 w-96 max-w-full">
        <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Confirm Logout</h2>
        <p className="text-sm text-slate-600 dark:text-neutral-400 mb-6">
          {userName ? `${userName} (${role})` : `Your ${role} account`} will be logged out. Are you sure?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 hover:bg-slate-300 dark:hover:bg-neutral-700 transition">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition">Logout</button>
        </div>
      </div>
    </div>
  );
};
