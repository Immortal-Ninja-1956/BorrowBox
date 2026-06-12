/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Box, Home, Layers, User as UserIcon, Coins, RefreshCw, Star, 
  MapPin, LogOut, ArrowLeftRight, Check, Heart, Shield, Bell, HelpCircle
} from 'lucide-react';

import { Item, Booking, User } from './types';
import { INITIAL_ITEMS, INITIAL_BOOKINGS, MOCK_USERS } from './data';

import CosmicBackground from './components/CosmicBackground';
import LandingPage from './components/LandingPage';
import MarketplaceExplorer from './components/MarketplaceExplorer';
import ItemDetailModal from './components/ItemDetailModal';
import UserDashboard from './components/UserDashboard';

export default function App() {
  // Navigation: 'landing' | 'explore' | 'dashboard'
  const [view, setView] = useState<'landing' | 'explore' | 'dashboard'>('landing');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  // Data State
  const [items, setItems] = useState<Item[]>(() => {
    const saved = localStorage.getItem('bb_items');
    return saved ? JSON.parse(saved) : INITIAL_ITEMS;
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('bb_bookings');
    return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('bb_users');
    return saved ? JSON.parse(saved) : MOCK_USERS;
  });

  // Current session user - start as Alex Rivera
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const saved = localStorage.getItem('bb_current_user_id');
    return saved || 'user_alex';
  });

  // Derived current user
  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Floating Toast Notifications State
  const [toasts, setToasts] = useState<Array<{ id: string; text: string; type: 'success' | 'info' | 'error' }>>([]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('bb_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('bb_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('bb_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('bb_current_user_id', currentUserId);
  }, [currentUserId]);

  // Floating Toast trigger
  const addToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      if (prev.includes(id)) {
        addToast("Removed from your saved items", "info");
        return prev.filter((favId) => favId !== id);
      } else {
        addToast("Added to your saved items!", "success");
        return [...prev, id];
      }
    });
  };

  // Switch demo user
  const switchUser = (userId: string) => {
    setCurrentUserId(userId);
    setShowUserDropdown(false);
    addToast(`Switched account to ${users.find(u => u.id === userId)?.name}`, 'info');
  };

  // Add listing
  const handleListItem = (newItemData: Omit<Item, 'id' | 'ownerId' | 'ownerName' | 'ownerAvatar' | 'rating' | 'reviewsCount' | 'available'>) => {
    const newItem: Item = {
      ...newItemData,
      id: `item_${Math.floor(Math.random() * 100000)}`,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      ownerAvatar: currentUser.avatar,
      rating: 5.0,
      reviewsCount: 0,
      available: true,
    };

    setItems((prev) => [newItem, ...prev]);
    addToast(`"${newItem.title}" is now LIVE on the campus marketplace!`, 'success');
  };

  // Delete listing
  const handleDeleteListing = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    addToast("Listing deleted successfully", "info");
  };

  // Toggle item availability
  const handleToggleAvailability = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, available: !item.available } : item))
    );
    addToast("Listing availability status toggled", "info");
  };

  // Handle Checkout Escrow Deposit
  const handleConfirmBooking = (newBooking: Booking) => {
    // 1. Subtract price from borrower
    setUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? { ...u, balance: u.balance - newBooking.totalCost } : u))
    );

    // 2. Lock item from search/listing
    setItems((prev) =>
      prev.map((item) => (item.id === newBooking.itemId ? { ...item, available: false } : item))
    );

    // 3. Register transaction
    setBookings((prev) => [newBooking, ...prev]);
    setSelectedItem(null);
    setView('dashboard');
    addToast("Checkout secured! Escrow held pending delivery handoff.", "success");
  };

  // Host accepts booking
  const handleAcceptRequest = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'active' as const } : b))
    );
    addToast("Booking request approved! Initiate rendezvous on campus.", "success");
  };

  // Host declines request (refund borrower safely)
  const handleDeclineRequest = (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    // Refund borrower
    setUsers((prev) =>
      prev.map((u) => (u.id === booking.borrowerId ? { ...u, balance: u.balance + booking.totalCost } : u))
    );

    // Release item
    setItems((prev) =>
      prev.map((item) => (item.id === booking.itemId ? { ...item, available: true } : item))
    );

    // Update status to cancelled
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    addToast("Request declined. Funds refunded safely back to borrower.", "info");
  };

  // Borrower confirms delivery (Funds released to owner!)
  const handleConfirmDelivery = (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    // Release escrow funds to Owner account (excluding any safety deposit for borrow)
    const hostEarnAmount = booking.itemType === 'borrow' 
      ? booking.totalCost - 15.0 - (booking.totalCost * 0.02) // deduct deposit and fee
      : booking.totalCost - (booking.totalCost * 0.02); // deduct fee

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === booking.ownerId) {
          return { ...u, balance: u.balance + hostEarnAmount };
        }
        return u;
      })
    );

    // Switch booking to completed
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'completed' as const, paymentStatus: 'released' as const } : b))
    );

    addToast(`Delivery confirmed! Escrow released to ${booking.ownerName}.`, "success");
  };

  // Return handling for rented items (returns deposit back to borrower)
  const handleConfirmReturn = (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    // Refund safety deposit back to borrower
    if (booking.itemType === 'borrow') {
      setUsers((prev) =>
        prev.map((u) => (u.id === booking.borrowerId ? { ...u, balance: u.balance + 15.0 } : u))
      );
    }

    // Mark item active/available again for next student
    setItems((prev) =>
      prev.map((item) => (item.id === booking.itemId ? { ...item, available: true } : item))
    );

    // Mark booking returned
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'returned' as const } : b))
    );

    addToast("Return inspection clear. $15.00 Escrow Deposit refunded!", "success");
  };

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col font-sans selection:bg-purple-500/30 overflow-x-hidden">
      {/* Dynamic Starry field Background with upper halo rings */}
      <CosmicBackground />

      {/* Floating Dynamic Toasts */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ scale: 0.9, y: -20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: -10, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className={`px-4 py-3 rounded-xl shadow-xl flex items-center justify-between gap-3 text-xs font-medium border pointer-events-auto backdrop-blur-md ${
                toast.type === 'success' 
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/20 shadow-emerald-500/5'
                  : toast.type === 'error'
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500/20 shadow-rose-500/5'
                  : 'bg-indigo-950/90 text-indigo-300 border-indigo-500/20 shadow-indigo-500/5'
              }`}
            >
              <span>{toast.text}</span>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-slate-400 hover:text-white transition-colors p-0.5 cursor-pointer ml-auto"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Render Landing Page View */}
      {view === 'landing' ? (
        <LandingPage
          onExplore={() => setView('explore')}
          onSignIn={() => {
            setView('explore');
            addToast("Welcome in! Switched successfully to explorer mode.", "info");
          }}
        />
      ) : (
        /* Full app header and context navigator for marketplace & dashboard */
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 bg-[#05060b]/85 backdrop-blur-md border-b border-white/[0.04] z-40">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              {/* Logo */}
              <div 
                className="flex items-center gap-2.5 cursor-pointer" 
                onClick={() => setView('landing')}
              >
                <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-teal-400 p-[1px] shadow-lg shadow-purple-500/10">
                  <div className="relative w-full h-full bg-[#0a0b10] rounded-[11px] flex items-center justify-center">
                    <Box className="w-[15px] h-[15px] text-teal-300 stroke-[1.8]" />
                  </div>
                </div>
                <span className="font-display font-semibold text-base tracking-wide text-white select-none">
                  BorrowBox
                </span>
                <span className="text-[9px] font-bold text-slate-500 bg-[#161726]/60 border border-slate-800 rounded px-1 uppercase tracking-wider py-0.5 hidden sm:inline-block">CAMPUS</span>
              </div>

              {/* Navigation links */}
              <div className="flex items-center gap-3 sm:gap-6">
                <button
                  type="button"
                  onClick={() => setView('explore')}
                  className={`text-xs sm:text-sm font-medium tracking-wide transition-colors flex items-center gap-1.5 cursor-pointer ${
                    view === 'explore' ? 'text-purple-400' : 'text-slate-405 hover:text-white'
                  }`}
                >
                  <Home className="w-4 h-4 hidden sm:inline-block" />
                  Explore Marketplace
                </button>

                <button
                  id="nav-dashboard"
                  type="button"
                  onClick={() => setView('dashboard')}
                  className={`text-xs sm:text-sm font-medium tracking-wide transition-colors flex items-center gap-1.5 cursor-pointer ${
                    view === 'dashboard' ? 'text-purple-400' : 'text-slate-405 hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4 hidden sm:inline-block" />
                  My Room Dashboard
                </button>

                {/* Account Switcher controls (Highly immersive multi-user toggle) */}
                <div className="relative ml-2">
                  <button
                    type="button"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141525]/80 hover:bg-[#1a1c32]/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-md select-none"
                  >
                    <div className="relative">
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        referrerPolicy="no-referrer"
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-400 border border-slate-900 rounded-full" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200 hidden md:inline-block">Simulate: {currentUser.name.split(' ')[0]}</span>
                    <RefreshCw className="w-3 h-3 text-purple-400 animate-spin-slow rotate-45" />
                  </button>

                  <AnimatePresence>
                    {showUserDropdown && (
                      <>
                        <div 
                          className="fixed inset-0 z-40 cursor-pointer" 
                          onClick={() => setShowUserDropdown(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2.5 w-60 rounded-2xl bg-[#0f111a] border border-[#212338] shadow-2xl p-4 z-50 space-y-3"
                        >
                          <div className="space-y-1 pb-1 border-b border-slate-850">
                            <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider block">Multi-User Simulator</span>
                            <span className="text-[10px] text-slate-500 leading-relaxed block">
                              Select a classmate below to simulate peer-to-peer exchanges!
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {users.map((u) => {
                              const isActive = u.id === currentUser.id;
                              return (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => switchUser(u.id)}
                                  className={`w-full flex items-center justify-between text-left p-2 rounded-xl transition-all ${
                                    isActive 
                                      ? 'bg-purple-500/10 border border-purple-500/20 text-white' 
                                      : 'hover:bg-[#141624] text-slate-400 hover:text-slate-200 border border-transparent'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 truncate">
                                    <img
                                      src={u.avatar}
                                      alt={u.name}
                                      referrerPolicy="no-referrer"
                                      className="w-6 h-6 rounded-full object-cover"
                                    />
                                    <div className="truncate">
                                      <div className="text-xs font-semibold truncate">{u.name}</div>
                                      <div className="text-[9px] text-slate-500">Balance: ${u.balance.toFixed(2)}</div>
                                    </div>
                                  </div>
                                  {isActive && <Check className="w-3.5 h-3.5 text-purple-400" />}
                                </button>
                              );
                            })}
                          </div>

                          <div className="text-[9px] italic text-slate-600 border-t border-slate-850 pt-2 flex items-center gap-1 leading-snug">
                            <HelpCircle className="w-3 h-3 text-slate-500 flex-shrink-0" />
                            <span>Switch users to test lending and accept requests immediately!</span>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 relative z-10">
            <AnimatePresence mode="wait">
              {view === 'explore' && (
                <motion.div
                  key="explore"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  <MarketplaceExplorer
                    items={items}
                    activeCategory={activeCategory}
                    setActiveCategory={setActiveCategory}
                    onViewItem={(item) => setSelectedItem(item)}
                    onListNewClick={() => {
                      setView('dashboard');
                      // Add a small delay so components load then switch sub-tab
                      setTimeout(() => {
                        const tabEl = document.getElementById('tab-add');
                        if (tabEl) tabEl.click();
                      }, 50);
                    }}
                    favorites={favorites}
                    toggleFavorite={toggleFavorite}
                  />
                </motion.div>
              )}

              {view === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  <UserDashboard
                    currentUser={currentUser}
                    items={items}
                    bookings={bookings}
                    onListItem={handleListItem}
                    onDeleteListing={handleDeleteListing}
                    onToggleAvailability={handleToggleAvailability}
                    onAcceptRequest={handleAcceptRequest}
                    onDeclineRequest={handleDeclineRequest}
                    onConfirmDelivery={handleConfirmDelivery}
                    onConfirmReturn={handleConfirmReturn}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          <footer className="w-full border-t border-slate-800/40 bg-[#05060b] mt-auto">
            <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <p>Copyright &copy; {new Date().getFullYear()} - BorrowBox. All rights reserved.</p>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-teal-400" /> Trusted Escrow Lock System</span>
                <span>•</span>
                <span className="text-slate-400">Campus Marketplace</span>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* Item details popup */}
      <AnimatePresence>
        {selectedItem && (
          <ItemDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            currentUser={currentUser}
            onConfirmBooking={handleConfirmBooking}
            onBalanceError={() => {
              addToast("Insufficient wallet funds to create escrow box! Switch accounts to get more allowance.", "error");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
