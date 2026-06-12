/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search, MapPin, Grid, Layers, ArrowLeftRight, CreditCard, Filter, Plus, Heart, Star, ShoppingBag, Eye } from 'lucide-react';
import { Item } from '../types';
import { CATEGORIES } from '../data';
import { motion, AnimatePresence } from 'motion/react';

interface MarketplaceExplorerProps {
  items: Item[];
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  onViewItem: (item: Item) => void;
  onListNewClick: () => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
}

export default function MarketplaceExplorer({
  items,
  activeCategory,
  setActiveCategory,
  onViewItem,
  onListNewClick,
  favorites,
  toggleFavorite,
}: MarketplaceExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'borrow' | 'buy'>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'priceAsc' | 'priceDesc'>('rating');

  // Filter items dynamically
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesType = filterType === 'all' || item.type === filterType;
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesType && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'priceAsc') return a.price - b.price;
      if (sortBy === 'priceDesc') return b.price - a.price;
      return 0;
    });
  }, [items, activeCategory, filterType, searchQuery, sortBy]);

  return (
    <div className="space-y-8 pb-16 font-sans">
      {/* Search and Filters Hub */}
      <div className="bg-[#0f111a]/80 backdrop-blur-xl border border-white/[0.04] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.02] to-teal-500/[0.02] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Main search bar */}
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <Search className="w-[18px] h-[18px]" />
            </span>
            <input
              type="text"
              id="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search textbooks, calculators, electric scooters, mini-fridges..."
              className="w-full pl-10 pr-4 py-3 bg-[#131522]/80 border border-slate-700/50 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200 text-xs font-medium"
              >
                Clear
              </button>
            )}
          </div>

          {/* Inline Filter Selectors */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Filter buttons for type (All, Borrow, Buy) */}
            <div className="flex bg-[#131522] border border-slate-700/60 rounded-xl p-[3px]">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  filterType === 'all'
                    ? 'bg-[#1e1f2f] text-teal-300 shadow-md shadow-black/10'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                All Listings
              </button>
              <button
                type="button"
                id="filter-borrow"
                onClick={() => setFilterType('borrow')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  filterType === 'borrow'
                    ? 'bg-purple-950/40 text-purple-300 border border-purple-500/10 shadow-md'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                <ArrowLeftRight className="w-3 h-3" />
                Borrow
              </button>
              <button
                type="button"
                onClick={() => setFilterType('buy')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  filterType === 'buy'
                    ? 'bg-teal-950/40 text-teal-300 border border-teal-500/10 shadow-md'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                <ShoppingBag className="w-3 h-3" />
                Buy
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 bg-[#131522] border border-slate-700/60 rounded-xl px-3 py-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent border-none text-slate-300 text-xs focus:ring-0 cursor-pointer outline-none"
              >
                <option value="rating">Top Rated</option>
                <option value="priceAsc">Price: Low to High</option>
                <option value="priceDesc">Price: High to Low</option>
              </select>
            </div>

            {/* List an item direct-action */}
            <button
              id="btn-list-direct"
              type="button"
              onClick={onListNewClick}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-teal-500/15 border border-purple-500/20 hover:border-purple-500/40 hover:bg-[#1f2038] text-white text-xs font-medium flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 ml-auto md:ml-0"
            >
              <Plus className="w-3.5 h-3.5 text-purple-300 stroke-[2.5]" />
              List an Item
            </button>
          </div>
        </div>

        {/* Categories Carousel */}
        <div className="mt-6 pt-4 border-t border-slate-800/40 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
          {CATEGORIES.map((cat) => {
            const isCatActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`relative px-4 py-2 rounded-xl text-xs font-medium tracking-wide whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  isCatActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200 bg-[#141523]/50 border border-slate-800/60'
                }`}
              >
                {isCatActive && (
                  <motion.div
                    layoutId="activeCategoryBg"
                    className="absolute inset-0 bg-gradient-to-r from-[#8b5cf6]/20 to-[#0d9488]/20 border border-purple-500/35 rounded-xl -z-10"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <span>{cat.name}</span>
                {cat.id !== 'all' && (
                  <span className={`px-1.5 py-0.25 rounded-md text-[10px] ${
                    isCatActive ? 'bg-purple-500/20 text-purple-300' : 'bg-[#1a1c2d] text-slate-500'
                  }`}>
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of items */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-lg font-medium text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Found {filteredItems.length} listed {filteredItems.length === 1 ? 'item' : 'items'}</span>
          </h2>
          <div className="flex gap-1.5 p-1 bg-[#12131f] border border-slate-800 rounded-lg">
            <div className="p-1.5 bg-[#171828] rounded-md text-slate-300">
              <Grid className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {filteredItems.length > 0 ? (
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredItems.map((item) => {
                const isFavorite = favorites.includes(item.id);
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="relative rounded-2xl bg-[#0f111a]/80 border border-[#212330]/60 overflow-hidden shadow-lg group hover:border-purple-500/30 transition-all flex flex-col justify-between"
                  >
                    {/* Top edge glow matching categories */}
                    <div className={`absolute top-0 inset-x-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r ${
                      item.type === 'borrow' ? 'from-purple-500 to-indigo-500' : 'from-teal-500 to-cyan-500'
                    }`} />

                    {/* Image space */}
                    <div>
                      <div className="relative aspect-video w-full overflow-hidden bg-slate-900 flex items-center justify-center">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                        {/* Top tag for buy/borrow */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          {item.type === 'borrow' ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wider uppercase bg-purple-500/90 text-white backdrop-blur-md shadow-md shadow-purple-500/10">
                              Borrow
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wider uppercase bg-teal-500/90 text-white backdrop-blur-md shadow-md shadow-teal-500/10">
                              Buy
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-md text-[10px] font-medium backdrop-blur-md ${
                            item.condition === 'New' || item.condition === 'Like New'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/20'
                          }`}>
                            {item.condition}
                          </span>
                        </div>

                        {/* Favorite button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item.id);
                          }}
                          className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/40 backdrop-blur-md hover:bg-black/60 border border-white/5 transition-colors cursor-pointer text-slate-300 hover:text-rose-500"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                        </button>
                        
                        {/* Rating Star overlay */}
                        <div className="absolute bottom-2 right-3 flex items-center gap-1 text-[11px] font-medium text-slate-200 bg-black/55 px-2 py-0.5 rounded-md backdrop-blur-sm border border-white/5">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span>{item.rating.toFixed(1)}</span>
                          <span className="text-slate-500">({item.reviewsCount})</span>
                        </div>
                      </div>

                      {/* Info & Description */}
                      <div className="p-5 space-y-3">
                        <div className="space-y-1">
                          <h3 className="font-display font-medium text-slate-100 text-sm md:text-base group-hover:text-white transition-colors line-clamp-1">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <MapPin className="w-3 h-3 text-purple-400 flex-shrink-0" />
                            <span className="truncate">{item.location}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Bottom owner details & button */}
                    <div className="px-5 pb-5 pt-3 border-t border-slate-800/40 flex items-center justify-between bg-[#121422]/20">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                          {item.type === 'borrow' ? 'Borrow Price' : 'Sells For'}
                        </div>
                        <div className="flex items-baseline gap-0.5 mt-0.5">
                          <span className="text-lg font-bold text-white">${item.price.toFixed(2)}</span>
                          {item.type === 'borrow' && <span className="text-[10px] text-slate-500">/day</span>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onViewItem(item)}
                        className="px-4 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500 text-purple-300 hover:text-white border border-purple-500/15 hover:border-purple-500 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 text-center border border-dashed border-slate-800 bg-[#0f111a]/40 rounded-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-500">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-display font-medium text-slate-300 mb-1">No listings found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No items match your search query or selected active type state. Try adjusting your fields or search categories!
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('all');
                  setActiveCategory('all');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-[#1d1f30] hover:bg-[#25283f] text-slate-300 text-xs font-medium cursor-pointer transition-colors"
              >
                Reset All Filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
