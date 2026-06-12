/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Zap, ShieldCheck, Users, Box } from 'lucide-react';

interface LandingPageProps {
  onExplore: () => void;
  onSignIn: () => void;
}

export default function LandingPage({ onExplore, onSignIn }: LandingPageProps) {
  return (
    <div className="min-h-screen text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* 1. Header Navigation */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={onExplore}>
          {/* Logo container representing BorrowBox branding */}
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-teal-400 p-[1.5px] shadow-lg shadow-purple-500/10">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-purple-600 to-teal-400 opacity-40 blur-[4px] animate-pulse" />
            <div className="relative w-full h-full bg-[#0a0b10] rounded-[10px] flex items-center justify-center">
              <Box className="w-[18px] h-[18px] text-teal-300 stroke-[1.8]" />
            </div>
          </div>
          <span className="font-display font-semibold text-lg tracking-wide text-white bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
            BorrowBox
          </span>
        </div>

        <div className="flex items-center gap-6">
          <button 
            type="button" 
            onClick={onSignIn} 
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200"
          >
            Login
          </button>
          
          <button 
            type="button" 
            onClick={onExplore} 
            className="relative group overflow-hidden rounded-full p-[1px] transition-transform active:scale-95 duration-200 cursor-pointer"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-purple-500 via-[#8ba3ff] to-teal-400 rounded-full group-hover:scale-105 transition-transform" />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-teal-400 rounded-full blur-[6px] opacity-60 group-hover:opacity-90 transition-opacity" />
            <span className="relative block px-5 py-2 rounded-full bg-[#0d0e15] text-xs font-semibold text-white tracking-wide transition-colors group-hover:bg-[#0a0b10]/90">
              Sign Up
            </span>
          </button>
        </div>
      </header>

      {/* 2. Hero Content */}
      <main className="flex-1 max-w-4xl mx-auto px-6 flex flex-col items-center justify-center text-center z-10 pt-10 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="space-y-6"
        >
          {/* Main Hero Slogan */}
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight">
            <span className="bg-gradient-to-r from-[#b276ff] via-[#8ba3ff] to-[#4de4cc] bg-clip-text text-transparent drop-shadow-sm select-none">
              Borrow. Share. Repeat.
            </span>
          </h1>

          {/* Subheading pitch */}
          <p className="max-w-2xl mx-auto text-base md:text-lg text-slate-300/90 leading-relaxed font-light">
            The ultimate peer-to-peer marketplace for college students. Buy and sell items
            securely with trusted payment verification after delivery confirmation.
          </p>

          {/* Action buttons with glow effects */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              id="btn-explore-landing"
              type="button"
              onClick={onExplore}
              className="relative group px-8 py-3.5 rounded-full overflow-hidden font-medium text-sm text-white shadow-xl shadow-purple-500/10 active:scale-95 transition-transform cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-teal-400 rounded-full transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-teal-400 blur-[8px] opacity-60 group-hover:opacity-100 transition-opacity rounded-full" />
              <span className="relative z-10 flex items-center gap-2">
                Explore Marketplace
              </span>
            </button>

            <button
              type="button"
              onClick={onSignIn}
              className="px-8 py-3.5 rounded-full bg-[#141522]/60 hover:bg-[#1c1d30]/60 text-sm font-medium text-slate-200 hover:text-white border border-slate-700/60 transition-all active:scale-95 hover:border-slate-500 hover:shadow-lg hover:shadow-cyan-500/5 cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </motion.div>

        {/* 3. Benefit Cards Grid */}
        <section className="w-full max-w-5xl mt-24 space-y-12">
          <motion.h2 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-white select-none"
          >
            Why Choose BorrowBox?
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Instant Connections */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="relative p-[1px] rounded-2xl bg-gradient-to-b from-purple-500/20 to-transparent group"
            >
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-purple-500/30 to-transparent opacity-0 group-hover:opacity-100 blur-[8px] transition-opacity duration-300" />
              <div className="relative h-full bg-[#0d0e15]/95 backdrop-blur-xl rounded-[15px] p-8 flex flex-col items-center justify-center space-y-4 border border-white/[0.04]">
                {/* Glowing Icon */}
                <div className="relative w-16 h-16 rounded-full bg-purple-500/5 flex items-center justify-center text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                  <Zap className="w-6 h-6 stroke-[1.8] fill-purple-400/10 animate-pulse" />
                  <div className="absolute inset-0 rounded-full bg-purple-500/10 blur-[8px]" />
                </div>
                <h3 className="font-display font-medium text-lg text-slate-100 tracking-wide pt-2">
                  Instant Connections
                </h3>
              </div>
            </motion.div>

            {/* Card 2: Secure Payments */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="relative p-[1px] rounded-2xl bg-gradient-to-b from-teal-500/20 to-transparent group"
            >
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-teal-500/30 to-transparent opacity-0 group-hover:opacity-100 blur-[8px] transition-opacity duration-300" />
              <div className="relative h-full bg-[#0d0e15]/95 backdrop-blur-xl rounded-[15px] p-8 flex flex-col items-center justify-center space-y-4 border border-white/[0.04]">
                {/* Glowing Icon */}
                <div className="relative w-16 h-16 rounded-full bg-teal-500/5 flex items-center justify-center text-teal-400 border border-teal-500/20 shadow-[0_0_15px_rgba(45,212,191,0.15)]">
                  <ShieldCheck className="w-6 h-6 stroke-[1.8] fill-teal-400/10" />
                  <div className="absolute inset-0 rounded-full bg-teal-500/10 blur-[8px]" />
                </div>
                <h3 className="font-display font-medium text-lg text-slate-100 tracking-wide pt-2">
                  Secure Payments
                </h3>
              </div>
            </motion.div>

            {/* Card 3: Student Community */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="relative p-[1px] rounded-2xl bg-gradient-to-b from-blue-500/20 to-transparent group"
            >
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-blue-500/30 to-transparent opacity-0 group-hover:opacity-100 blur-[8px] transition-opacity duration-300" />
              <div className="relative h-full bg-[#0d0e15]/95 backdrop-blur-xl rounded-[15px] p-8 flex flex-col items-center justify-center space-y-4 border border-white/[0.04]">
                {/* Glowing Icon */}
                <div className="relative w-16 h-16 rounded-full bg-blue-500/5 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                  <Users className="w-6 h-6 stroke-[1.8] fill-blue-400/10" />
                  <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-[8px]" />
                </div>
                <h3 className="font-display font-medium text-lg text-slate-100 tracking-wide pt-2">
                  Student Community
                </h3>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* 4. Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-slate-800/60 text-center z-10">
        <p className="text-xs text-slate-500 tracking-wide">
          Copyright &copy; {new Date().getFullYear()} - BorrowBox. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
