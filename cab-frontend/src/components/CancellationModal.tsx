import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

export interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
  role: 'customer' | 'driver';
  isLoading?: boolean;
}

const CUSTOMER_REASONS = [
  'Booked by mistake',
  'Driver is taking too long',
  'Changed my plans',
  'Wrong pickup or drop location',
  'Fare is too high',
  'Found another ride',
  'Other',
];

const DRIVER_REASONS = [
  'Customer is not responding',
  'Customer is not at pickup location',
  'Vehicle problem',
  'Emergency or personal reason',
  'Wrong pickup or drop location',
  'Other',
];

export const CancellationModal: React.FC<CancellationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  role,
  isLoading = false,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState<string>('');
  const otherInputRef = useRef<HTMLInputElement>(null);

  const reasons = role === 'customer' ? CUSTOMER_REASONS : DRIVER_REASONS;

  // Reset state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setSelectedReason('');
      setOtherReason('');
    }
  }, [isOpen]);

  // Focus input when "Other" is selected
  useEffect(() => {
    if (selectedReason === 'Other' && otherInputRef.current) {
      otherInputRef.current.focus();
    }
  }, [selectedReason]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen || isLoading) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isOther = selectedReason === 'Other';
  const isConfirmDisabled =
    !selectedReason ||
    (isOther && otherReason.trim().length === 0) ||
    isLoading;

  const handleConfirm = async () => {
    if (isConfirmDisabled) return;
    const finalReason = isOther ? otherReason.trim() : selectedReason;
    await onConfirm(finalReason);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancellation-modal-title"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="pr-6">
            <h3
              id="cancellation-modal-title"
              className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-white leading-tight"
            >
              Why are you cancelling this ride?
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              Please choose a reason to cancel. This helps us ensure better service.
            </p>
          </div>
        </div>

        {/* Reasons List */}
        <div className="space-y-2 overflow-y-auto pr-1 py-1 flex-1">
          {reasons.map((reason) => {
            const isSelected = selectedReason === reason;
            return (
              <label
                key={reason}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-sm ring-1 ring-rose-500/30'
                    : 'border-slate-200 dark:border-neutral-800/80 bg-slate-50/60 dark:bg-neutral-900/40 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800/60 hover:border-slate-300 dark:hover:border-neutral-700'
                }`}
              >
                <input
                  type="radio"
                  name="cancellation_reason"
                  value={reason}
                  checked={isSelected}
                  onChange={() => setSelectedReason(reason)}
                  disabled={isLoading}
                  className="sr-only"
                />
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? 'border-rose-500 bg-rose-500'
                      : 'border-slate-400 dark:border-neutral-600 bg-transparent'
                  }`}
                >
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                <span className="flex-1 select-none">{reason}</span>
              </label>
            );
          })}

          {/* Other reason custom text input */}
          {isOther && (
            <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 animate-in fade-in slide-in-from-top-2 duration-150">
              <label
                htmlFor="other-cancellation-reason"
                className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5"
              >
                Please enter your reason
              </label>
              <input
                ref={otherInputRef}
                id="other-cancellation-reason"
                type="text"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Please enter your reason"
                maxLength={200}
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-black text-slate-800 dark:text-neutral-100 text-xs sm:text-sm focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all"
              />
              <div className="flex justify-end mt-1 text-[10px] text-slate-400 dark:text-neutral-500">
                {otherReason.length}/200
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-neutral-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-50"
          >
            Back / Close
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              isConfirmDisabled
                ? 'bg-rose-500/30 text-white/50 cursor-not-allowed border border-rose-500/10'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/25 active:scale-[0.99] cursor-pointer'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <span>Confirm Cancellation</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
