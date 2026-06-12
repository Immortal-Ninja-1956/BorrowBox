/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { X, Calendar, MapPin, Shield, Check, Info, ArrowLeftRight, CreditCard, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { Item, Booking, User } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ItemDetailModalProps {
  item: Item | null;
  onClose: () => void;
  currentUser: User;
  onConfirmBooking: (booking: Booking) => void;
  onBalanceError: () => void;
}

export default function ItemDetailModal({
  item,
  onClose,
  currentUser,
  onConfirmBooking,
  onBalanceError,
}: ItemDetailModalProps) {
  if (!item) return null;

  // State for renting/borrowing
  const today = '2026-06-12';
  const tomorrow = '2026-06-13';
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(tomorrow);
  const [loadingStep, setLoadingStep] = useState<'idle' | 'escrowing' | 'verifying' | 'success'>('idle');
  const [bookingCode, setBookingCode] = useState('');

  // Calculate rental cost details
  const calculation = useMemo(() => {
    if (item.type !== 'borrow') {
      const subtotal = item.price;
      const verificationFee = subtotal * 0.02; // 2% fee
      const total = subtotal + verificationFee;
      return { days: 1, subtotal, verificationFee, deposit: 0, total };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    const subtotal = item.price * diffDays;
    const verificationFee = subtotal * 0.02; // 2% safe verification fee
    const deposit = 15.0; // Flat safe deposit fully refundable
    const total = subtotal + verificationFee + deposit;

    return {
      days: diffDays,
      subtotal,
      verificationFee,
      deposit,
      total,
    };
  }, [item, startDate, endDate]);

  const handleAction = () => {
    // Check if user has sufficient funds
    if (currentUser.balance < calculation.total) {
      onBalanceError();
      return;
    }

    // Run multi-step high fidelity transaction animation
    setLoadingStep('escrowing');

    setTimeout(() => {
      setLoadingStep('verifying');
      
      setTimeout(() => {
        setLoadingStep('success');
        
        // Generate a random confirmation booking code
        const code = `BOX-${Math.floor(Math.random() * 900000 + 100000)}`;
        setBookingCode(code);

        // Build Booking state
        const newBooking: Booking = {
          id: `booking_${Math.floor(Math.random() * 100000)}`,
          itemId: item.id,
          itemTitle: item.title,
          itemType: item.type,
          itemPrice: item.price,
          imageUrl: item.imageUrl,
          ownerId: item.ownerId,
          ownerName: item.ownerName,
          borrowerId: currentUser.id,
          borrowerName: currentUser.name,
          startDate: item.type === 'borrow' ? startDate : undefined,
          endDate: item.type === 'borrow' ? endDate : undefined,
          totalCost: calculation.total,
          status: 'requested', // starts as requested, host accepts it
          paymentStatus: 'held_in_escrow',
          createdAt: new Date().toISOString(),
        };

        setTimeout(() => {
          onConfirmBooking(newBooking);
        }, 2200);

      }, 1500);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={loadingStep === 'idle' ? onClose : undefined}
        className="absolute inset-0 bg-[#05060b]/80 backdrop-blur-md cursor-pointer"
      />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="relative w-full max-w-3xl bg-[#0e1019] border border-[#212338]/80 rounded-3xl overflow-hidden shadow-2xl z-20 max-h-[90vh] flex flex-col md:flex-row"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loadingStep !== 'idle'}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/70 border border-white/5 text-slate-300 hover:text-white transition-colors cursor-pointer z-30"
        >
          <X className="w-4 h-4" />
        </button>

        {loadingStep === 'idle' ? (
          <>
            {/* Left Column: Visual Space */}
            <div className="w-full md:w-1/2 relative bg-slate-950 flex flex-col justify-between overflow-hidden aspect-video md:aspect-auto">
              <img
                src={item.imageUrl}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e1019] via-[#0e1019]/20 to-black/30 pointer-events-none" />

              {/* Badges on left column */}
              <div className="relative p-6 flex flex-col justify-between h-full min-h-[220px] md:min-h-[400px]">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    item.type === 'borrow' ? 'bg-purple-600 text-white' : 'bg-teal-500 text-black'
                  }`}>
                    {item.type === 'borrow' ? 'Borrow Deal' : 'Buy Deal'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/40 text-slate-300 border border-white/5 backdrop-blur-sm">
                    {item.condition} Condition
                  </span>
                </div>

                <div className="space-y-2">
                  <h2 className="font-display text-lg md:text-xl font-semibold text-white drop-shadow-md">
                    {item.title}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-slate-200 bg-black/50 px-3 py-1.5 rounded-xl border border-white/5 backdrop-blur-sm self-start inline-flex">
                    <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    <span>Location: {item.location}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Checkout & dates */}
            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between overflow-y-auto max-h-[75vh] md:max-h-[90vh]">
              <div className="space-y-6">
                {/* Description and category */}
                <div className="space-y-2">
                  <span className="text-[10px] text-purple-400 font-semibold tracking-wider uppercase">Item Description</span>
                  <p className="text-xs text-slate-300 leading-relaxed max-h-[120px] overflow-y-auto pr-2">
                    {item.description}
                  </p>
                </div>

                {/* Owner details */}
                <div className="border-t border-slate-850 pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.ownerAvatar}
                      alt={item.ownerName}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full border border-purple-500/10 object-cover"
                    />
                    <div>
                      <div className="text-[10px] text-slate-400">Listed by campus peer</div>
                      <div className="text-xs font-semibold text-white">{item.ownerName}</div>
                    </div>
                  </div>
                  <div className="bg-[#171828] border border-slate-800 rounded-xl px-3 py-1 text-center">
                    <div className="text-[10px] text-slate-400">Reputation</div>
                    <div className="text-xs font-bold text-amber-400">★ {item.rating.toFixed(1)}</div>
                  </div>
                </div>

                {/* Dates Selection (Only if borrow) */}
                {item.type === 'borrow' ? (
                  <div className="space-y-3.5 border-t border-slate-850 pt-4">
                    <span className="text-[10px] text-purple-400 font-semibold tracking-wider uppercase flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Rent Dates Selector
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="start-date" className="block text-[10px] text-slate-500 mb-1.5 font-medium">Start Date</label>
                        <input
                          id="start-date"
                          type="date"
                          value={startDate}
                          min={today}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-[#121320] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="end-date" className="block text-[10px] text-slate-500 mb-1.5 font-medium">End Date</label>
                        <input
                          id="end-date"
                          type="date"
                          value={endDate}
                          min={startDate || today}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full bg-[#121320] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 italic bg-[#151724]/40 p-2.5 rounded-xl border border-slate-850/50 flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <span>Host Alex requires at least 1 day reservation. Returns are verified together directly on campus.</span>
                    </div>
                  </div>
                ) : null}

                {/* Billing Summary */}
                <div className="space-y-2 border-t border-slate-850 pt-4">
                  <span className="text-[10px] text-purple-400 font-semibold tracking-wider uppercase">Billing & Escrow Summary</span>
                  <div className="bg-[#121422]/60 rounded-xl p-4 border border-white/[0.02] space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>
                        {item.type === 'borrow' ? `${calculation.days} Days Borrow Rate ($${item.price.toFixed(2)}/day)` : 'Purchase price'}
                      </span>
                      <span className="text-slate-200">${calculation.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        Trusted verification fee (2%)
                        <span className="p-0.5 group relative hover:text-slate-200 cursor-help">
                          <Info className="w-3 h-3 text-slate-500" />
                          <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 p-2 rounded text-[10px] text-slate-300 w-48 hidden group-hover:block z-50">
                            Holds the funds safely in an escrow box until you confirm delivery.
                          </span>
                        </span>
                      </span>
                      <span className="text-slate-200">${calculation.verificationFee.toFixed(2)}</span>
                    </div>
                    {item.type === 'borrow' && (
                      <div className="flex justify-between text-slate-400">
                        <span className="text-purple-300">Refundable Host Deposit</span>
                        <span className="text-purple-300">${calculation.deposit.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-800/60 pt-2.5 mt-2 flex justify-between font-semibold">
                      <span className="text-white">Required Escrow Balance</span>
                      <span className="text-teal-400">${calculation.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-6 space-y-3">
                <button
                  id="checkout-confirm"
                  type="button"
                  onClick={handleAction}
                  className="w-full relative group py-3 rounded-xl overflow-hidden font-semibold text-xs text-white tracking-widest uppercase shadow-xl hover:shadow-purple-500/5 active:scale-98 transition-transform cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-teal-400 rounded-xl" />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Secure Checkout with Escrow
                  </span>
                </button>
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
                  <Shield className="w-3.5 h-3.5 text-teal-400" />
                  <span>Payments released ONLY after mutual handoff verification.</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Multi-step Escrow Loading Screen */
          <div className="w-full min-h-[400px] p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-6">
            <AnimatePresence mode="wait">
              {loadingStep === 'escrowing' && (
                <motion.div
                  key="escrowing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-4 flex flex-col items-center max-w-sm"
                >
                  <div className="relative w-16 h-16 rounded-full flex items-center justify-center border-2 border-dashed border-purple-500 animate-spin">
                    <RefreshCw className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="font-display font-medium text-lg text-slate-100">Setting up Escrow Box Contract</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Withdrawing <span className="text-teal-400 font-bold">${calculation.total.toFixed(2)}</span> from your balance and securing it inside BorrowBox Escrow. Funds are locked temporarily.
                  </p>
                </motion.div>
              )}

              {loadingStep === 'verifying' && (
                <motion.div
                  key="verifying"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-4 flex flex-col items-center max-w-sm"
                >
                  <div className="relative w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20">
                    <Sparkles className="w-6 h-6 text-teal-400 animate-pulse" />
                    <div className="absolute inset-0 bg-teal-500/5 blur-md rounded-full" />
                  </div>
                  <h3 className="font-display font-medium text-lg text-slate-100">Generating Safe Handshake Keys</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Preparing verification protocols. Informing host <b>{item.ownerName}</b> of your secure rental booking. You will coordinate rendezvous locations directly.
                  </p>
                </motion.div>
              )}

              {loadingStep === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-4 flex flex-col items-center max-w-sm"
                >
                  <div className="relative w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <Check className="w-8 h-8 text-emerald-400 stroke-[3]" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Escrow Contract Active</span>
                    <h3 className="font-display font-semibold text-xl text-white">Escrow Secured!</h3>
                  </div>
                  <div className="bg-[#151724] border border-slate-800 rounded-xl px-4 py-2 text-center select-all">
                    <span className="text-[10px] text-slate-500 uppercase block tracking-wider font-semibold">Verification Key</span>
                    <span className="text-sm font-mono font-bold text-teal-300">{bookingCode}</span>
                  </div>
                  <p className="text-xs text-slate-405 leading-relaxed">
                    Handoff registered. Funds are held in escrow. Check your <b>Dashboard</b> under <b>My Bookings</b> to coordinate handoff and complete verification once delivered.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
