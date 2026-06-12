/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FolderPlus, Clock, ArrowLeftRight, Check, Ban, Sparkles, RefreshCw, AlertCircle, 
  MapPin, Coins, BookOpen, Layers, Info, Trash, ToggleLeft, ToggleRight, CalendarCheck, ShieldCheck
} from 'lucide-react';
import { Item, Booking, User } from '../types';
import { PRESET_ITEMS_FOR_LISTING } from '../data';
import { motion, AnimatePresence } from 'motion/react';

interface UserDashboardProps {
  currentUser: User;
  items: Item[];
  bookings: Booking[];
  onListItem: (item: Omit<Item, 'id' | 'ownerId' | 'ownerName' | 'ownerAvatar' | 'rating' | 'reviewsCount' | 'available'>) => void;
  onDeleteListing: (id: string) => void;
  onToggleAvailability: (id: string) => void;
  onAcceptRequest: (bookingId: string) => void;
  onDeclineRequest: (bookingId: string) => void;
  onConfirmDelivery: (bookingId: string) => void;
  onConfirmReturn: (bookingId: string) => void;
}

export default function UserDashboard({
  currentUser,
  items,
  bookings,
  onListItem,
  onDeleteListing,
  onToggleAvailability,
  onAcceptRequest,
  onDeclineRequest,
  onConfirmDelivery,
  onConfirmReturn,
}: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'bookings' | 'listings' | 'add'>('bookings');
  
  // Custom Form state for adding items
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('textbooks');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'borrow' | 'buy'>('borrow');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'New' | 'Like New' | 'Good' | 'Fair'>('Good');
  const [location, setLocation] = useState('Campus Quad Dorms');
  const [imageUrl, setImageUrl] = useState('');

  // Built-in presets for random images depending on category
  const categoryImages: Record<string, string> = {
    textbooks: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600',
    electronics: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600',
    transport: 'https://images.unsplash.com/photo-1608613426749-ce12b98f2441?auto=format&fit=crop&q=80&w=600',
    appliances: 'https://images.unsplash.com/photo-1585238202521-fc5ebf600490?auto=format&fit=crop&q=80&w=600',
    sports: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=600',
  };

  const handlePresetSelect = (preset: any) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setDescription(preset.description);
    setPrice(preset.price.toString());
    setType(preset.type);
    setCondition(preset.condition);
    setImageUrl(preset.imageUrl);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !description) return;

    const img = imageUrl || categoryImages[category] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600';

    onListItem({
      title,
      category,
      description,
      type,
      price: parseFloat(price),
      condition,
      imageUrl: img,
      location,
    });

    // Reset Form
    setTitle('');
    setDescription('');
    setPrice('');
    setImageUrl('');
    setActiveTab('listings');
  };

  // Filter lists based on the current user
  const userListings = items.filter((item) => item.ownerId === currentUser.id);
  const myBookings = bookings.filter((b) => b.borrowerId === currentUser.id);
  const incomingRequests = bookings.filter((b) => b.ownerId === currentUser.id && b.status === 'requested');

  return (
    <div className="space-y-8 font-sans">
      {/* 1. Header Profile Highlights */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/10 via-[#101323]/80 to-teal-900/10 border border-[#212338]/60 p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-full border-2 border-purple-500/30 object-cover"
          />
          <div className="space-y-1">
            <h2 className="font-display font-medium text-lg text-white">{currentUser.name}</h2>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-slate-400">{currentUser.email}</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-semibold border border-amber-500/20">
                ⭐ {currentUser.reputation.toFixed(1)} Reputation
              </span>
            </div>
          </div>
        </div>

        {/* Balance metrics */}
        <div className="relative z-10 flex gap-4">
          <div className="bg-black/30 border border-slate-800/80 px-5 py-3 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Wallet Balance</div>
              <div className="text-base font-bold text-teal-300">${currentUser.balance.toFixed(2)}</div>
            </div>
          </div>

          <div className="bg-black/30 border border-slate-800/80 px-5 py-3 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Active Listings</div>
              <div className="text-base font-bold text-white">{userListings.length} items</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Host Request Alerts (Notifications panel) */}
      <AnimatePresence>
        {incomingRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-450 flex items-center gap-1.5 pl-1">
              <AlertCircle className="w-4 h-4 text-rose-400 animate-pulse" />
              Incoming Campus Borrow Requests ({incomingRequests.length})
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {incomingRequests.map((req) => (
                <motion.div
                  key={req.id}
                  layout
                  className="bg-gradient-to-r from-purple-950/20 to-teal-950/20 border border-purple-500/20 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={req.imageUrl}
                      alt={req.itemTitle}
                      className="w-12 h-12 rounded-lg object-cover border border-purple-500/15"
                    />
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        {req.borrowerName} <span className="text-slate-400 font-light">wants to borrow your</span> {req.itemTitle}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {req.itemType === 'borrow' ? `Rental: ${req.startDate} to ${req.endDate}` : 'Direct Purchase request'}
                      </p>
                      <p className="text-xs font-medium text-emerald-400">
                        Payout awaiting approval: ${req.totalCost.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onDeclineRequest(req.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-black/40 hover:bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      id="accept-booking-btn"
                      type="button"
                      onClick={() => onAcceptRequest(req.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0d9488]/30 hover:bg-[#0d9488] text-white border border-teal-500/30 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Accept Booking
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Sub-tabs Selector */}
      <div className="flex border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('bookings')}
          className={`px-5 py-3 text-xs md:text-sm font-medium tracking-wide transition-all border-b-2 relative cursor-pointer ${
            activeTab === 'bookings'
              ? 'border-purple-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          My Rentals & Purchase Orders ({myBookings.length})
        </button>
        <button
          type="button"
          id="tab-listings"
          onClick={() => setActiveTab('listings')}
          className={`px-5 py-3 text-xs md:text-sm font-medium tracking-wide transition-all border-b-2 relative cursor-pointer ${
            activeTab === 'listings'
              ? 'border-purple-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          My Listed Items & Catalog ({userListings.length})
        </button>
        <button
          type="button"
          id="tab-add"
          onClick={() => setActiveTab('add')}
          className={`px-5 py-3 text-xs md:text-sm font-medium tracking-wide transition-all border-b-2 relative cursor-pointer ${
            activeTab === 'add'
              ? 'border-purple-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          + List Another Item
        </button>
      </div>

      {/* 4. Tab Contents */}
      <div>
        <AnimatePresence mode="wait">
          {/* Active Bookings Tab */}
          {activeTab === 'bookings' && (
            <motion.div
              key="bookings_tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {myBookings.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {myBookings.map((b) => (
                    <div
                      key={b.id}
                      className="bg-[#0f111a]/80 border border-[#21233a]/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-transform"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={b.imageUrl}
                          alt={b.itemTitle}
                          className="w-16 h-16 rounded-xl object-cover border border-white/5 shadow-md"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">{b.itemTitle}</h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                              b.status === 'active' ? 'bg-indigo-500/20 text-indigo-300' :
                              b.status === 'requested' ? 'bg-amber-500/20 text-amber-300 animate-pulse' :
                              b.status === 'returned' ? 'bg-slate-800 text-slate-400' :
                              'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {b.status}
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-400 flex items-center gap-1.5">
                            <span>Owner: {b.ownerName}</span>
                            {b.startDate && <span>• ({b.startDate} to {b.endDate})</span>}
                          </p>

                          <div className="flex items-center gap-1 text-[11px] text-teal-400 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Held safely in Escrow Box: <b>${b.totalCost.toFixed(2)}</b></span>
                          </div>
                        </div>
                      </div>

                      {/* Interactive States (Confirm delivery, etc) */}
                      <div className="w-full md:w-auto">
                        {b.status === 'requested' && (
                          <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-[#1b1c2e] p-2.5 rounded-xl border border-slate-800">
                            <Clock className="w-4 h-4 text-amber-400" />
                            <span>Awaiting host confirmation before meetup.</span>
                          </div>
                        )}

                        {b.status === 'active' && (
                          <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="text-[10px] text-slate-500 italic max-w-xs text-left sm:text-right">
                              Ready to pick up? Meet on campus and request handoff confirmation.
                            </div>
                            <button
                              id={`confirm-delivery-${b.id}`}
                              type="button"
                              onClick={() => onConfirmDelivery(b.id)}
                              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-teal-500/20 hover:from-purple-500 hover:to-teal-500 text-white border border-purple-500/40 text-xs font-semibold cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-4 h-4" />
                              Confirm Delivery Handoff
                            </button>
                          </div>
                        )}

                        {b.status === 'completed' && (
                          <div className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/20">
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Delivered & Verified. Payment successfully released to {b.ownerName}!</span>
                          </div>
                        )}

                        {b.status === 'returned' && (
                          <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                            <Check className="w-4 h-4 text-slate-400" />
                            <span>Return Complete. Security deposit refund processed successfully.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center border border-dashed border-slate-800 bg-[#0f111a]/40 rounded-2xl">
                  <BookOpen className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <h4 className="font-display font-medium text-slate-300">No active bookings found</h4>
                  <p className="text-xs text-slate-550 max-w-sm mx-auto mt-1">
                    Ready to borrow what you need? Switch to the Marketplace tab, select study textbooks, or electric scooters and fund an escrow!
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Catalog Listings Tab */}
          {activeTab === 'listings' && (
            <motion.div
              key="listings_tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {userListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {userListings.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#0f111a]/80 border border-[#21233a]/85 rounded-2xl p-4 flex gap-4 items-center justify-between"
                    >
                      <div className="flex items-center gap-4 truncate">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-14 h-14 rounded-xl object-cover border border-white/5"
                        />
                        <div className="truncate space-y-0.5">
                          <h4 className="text-xs md:text-sm font-semibold text-white truncate">{item.title}</h4>
                          <span className="text-[10px] text-slate-400 block truncate">{item.location}</span>
                          <span className="text-xs font-bold text-teal-300">${item.price.toFixed(2)} /day</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Toggle Availability */}
                        <button
                          type="button"
                          onClick={() => onToggleAvailability(item.id)}
                          className="text-slate-450 hover:text-white transition-colors cursor-pointer"
                          title={item.available ? "Currently listed on campus" : "Hidden from search"}
                        >
                          {item.available ? (
                            <ToggleRight className="w-8 h-8 text-purple-400" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-slate-600" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteListing(item.id)}
                          className="p-2 rounded-lg bg-red-950/20 border border-red-500/10 text-red-400 hover:bg-red-900 hover:text-white transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center border border-dashed border-slate-800 bg-[#0f111a]/40 rounded-2xl">
                  <FolderPlus className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <h4 className="font-display font-medium text-slate-300">You haven't listed anything yet</h4>
                  <p className="text-xs text-slate-550 max-w-sm mx-auto mt-1">
                    Have spare calculators, textbooks, chemistry logs, or appliances? Earn extra spending money on campus safely!
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Add Listing Tab */}
          {activeTab === 'add' && (
            <motion.div
              key="add_tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Presets Grid */}
              <div className="space-y-2.5">
                <span className="text-[10px] text-purple-400 tracking-wider uppercase font-semibold flex items-center gap-1.5 pl-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Fast Auto-Fill presets
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PRESET_ITEMS_FOR_LISTING.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePresetSelect(p)}
                      className="bg-[#121422]/60 hover:bg-[#1a1c32]/60 border border-slate-800 hover:border-purple-500/30 rounded-xl p-3 flex items-start gap-3 transition-all cursor-pointer text-left"
                    >
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-200 truncate">{p.title}</div>
                        <div className="text-[10px] text-slate-500 capitalize">{p.category} • {p.type === 'borrow' ? `$${p.price}/day` : `$${p.price} flat`}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Listing Form */}
              <form onSubmit={handleSubmit} className="bg-[#0e1019] border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label htmlFor="listing-title" className="block text-xs font-medium text-slate-300">Listing Name</label>
                    <input
                      id="listing-title"
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. TI-84 Plus Color Calculator"
                      className="w-full bg-[#121320] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="listing-category" className="block text-xs font-medium text-slate-300">Campus Category</label>
                    <select
                      id="listing-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#121320] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="textbooks">Textbooks & Academic Guides</option>
                      <option value="electronics">Electronics & Tech Accessory</option>
                      <option value="transport">Scooters & Transit Wheels</option>
                      <option value="appliances">Dorm Cooking & Small Appliances</option>
                      <option value="sports">Sports Gear & Grass Games</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label htmlFor="listing-deal" className="block text-xs font-medium text-slate-300">Deal Framework</label>
                    <div className="flex bg-[#121320] border border-slate-800 rounded-xl p-[2px]">
                      <button
                        type="button"
                        onClick={() => setType('borrow')}
                        className={`flex-1 py-2 text-center rounded-lg text-xs font-medium cursor-pointer transition-all ${
                          type === 'borrow' ? 'bg-[#1a1c32] text-purple-300' : 'text-slate-500 hover:text-slate-355'
                        }`}
                      >
                        Borrow (Daily Fee)
                      </button>
                      <button
                        type="button"
                        onClick={() => setType('buy')}
                        className={`flex-1 py-2 text-center rounded-lg text-xs font-medium cursor-pointer transition-all ${
                          type === 'buy' ? 'bg-[#1a1c32] text-teal-300' : 'text-slate-500 hover:text-slate-355'
                        }`}
                      >
                        Buy (Flat Sell)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="listing-price" className="block text-xs font-medium text-slate-300">
                      {type === 'borrow' ? 'Daily Price ($)' : 'Purchase Price ($)'}
                    </label>
                    <input
                      id="listing-price"
                      type="number"
                      step="0.1"
                      required
                      value={price}
                      min="1"
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 5.50"
                      className="w-full bg-[#121320] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="listing-condition" className="block text-xs font-medium text-slate-300">Condition</label>
                    <select
                      id="listing-condition"
                      value={condition}
                      onChange={(e: any) => setCondition(e.target.value)}
                      className="w-full bg-[#121320] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="New">Brand New</option>
                      <option value="Like New">Like New (Mint)</option>
                      <option value="Good">Good (Working fine)</option>
                      <option value="Fair">Fair (Has slight wear)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label htmlFor="listing-location" className="block text-xs font-medium text-slate-300">Rendezvous Meetup Spot</label>
                    <input
                      id="listing-location"
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. West Quad Dorm lobby or Campus Library"
                      className="w-full bg-[#121320] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="listing-image" className="block text-xs font-medium text-slate-300">Optional Unsplash Image URL</label>
                    <input
                      id="listing-image"
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Leave empty to use clean default stock photos based on category"
                      className="w-full bg-[#121320] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 font-sans">
                  <label htmlFor="listing-desc" className="block text-xs font-medium text-slate-300">Item Details & Study/Handoff Rules</label>
                  <textarea
                    id="listing-desc"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe specific features (e.g., includes model kit, has batteries, where / when you can meet on campus)."
                    className="w-full bg-[#121320] border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-purple-500 leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/50">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-teal-500 text-white text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95 transition-transform"
                  >
                    Publish Listing Live
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
