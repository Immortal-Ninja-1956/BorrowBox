/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

export default function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Create particles
    const particlesCount = 45;
    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      color: string;
      speedY: number;
      speedX: number;
      alpha: number;
      alphaDir: number;
    }> = [];

    const colors = [
      'rgba(168, 85, 247, 0.4)', // Purple
      'rgba(45, 212, 191, 0.4)',  // Teal
      'rgba(59, 130, 246, 0.4)',  // Blue
    ];

    for (let i = 0; i < particlesCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedY: (Math.random() - 0.5) * 0.15,
        speedX: (Math.random() - 0.5) * 0.15,
        alpha: Math.random() * 0.5 + 0.1,
        alphaDir: Math.random() > 0.5 ? 0.005 : -0.005,
      });
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Deep Space background clear
      ctx.fillStyle = '#05060b';
      ctx.fillRect(0, 0, width, height);

      // Render floating stars
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        
        // Update alpha for glowing twinkle
        p.alpha += p.alphaDir;
        if (p.alpha >= 0.8 || p.alpha <= 0.1) {
          p.alphaDir = -p.alphaDir;
        }

        ctx.fillStyle = p.color.replace('0.4', p.alpha.toFixed(2));
        ctx.fill();

        // Update positions
        p.x += p.speedX;
        p.y += p.speedY;

        // Circular boundary warp
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-50 pointer-events-none select-none bg-[#05060b]">
      <canvas ref={canvasRef} className="block w-full h-full opacity-70" />
      
      {/* Upper halo glow matching the BorrowBox landing screen design */}
      <div className="absolute top-[10%] left-[20%] w-[45vw] h-[45vw] rounded-full bg-purple-600/10 blur-[140px] pointer-events-none translate-x-[-10%] translate-y-[-20%]" />
      <div className="absolute top-[15%] right-[20%] w-[45vw] h-[45vw] rounded-full bg-teal-500/10 blur-[140px] pointer-events-none translate-x-[10%] translate-y-[-20%]" />
      
      {/* Bottom ambient lighting */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[300px] rounded-t-full bg-gradient-to-t from-purple-500/[0.03] to-transparent blur-[80px]" />
    </div>
  );
}
