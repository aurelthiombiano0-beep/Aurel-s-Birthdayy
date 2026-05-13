/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { Calendar, Clock, MapPin, QrCode, ArrowRight, Map } from "lucide-react";
import { useEffect, useState, useMemo } from "react";

const Particle = ({ delay }: { delay: number, key?: any }) => {
  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        x: Math.random() * 100 + "%", 
        y: "110%" 
      }}
      animate={{ 
        opacity: [0, 0.4, 0], 
        y: "-10%" 
      }}
      transition={{ 
        duration: 15 + Math.random() * 10, 
        repeat: Infinity, 
        delay, 
        ease: "linear" 
      }}
      className="absolute w-1 h-1 bg-white rounded-full blur-[1px] pointer-events-none"
    />
  );
};

const Countdown = () => {
  const targetDate = useMemo(() => new Date('2026-05-16T19:00:00').getTime(), []);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex gap-4 md:gap-8 justify-center text-center mt-12 mb-8">
      {Object.entries(timeLeft).map(([label, value], i) => (
        <motion.div 
          key={label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 + i * 0.1 }}
          className="flex flex-col items-center"
        >
          <span className="text-3xl md:text-4xl font-extralight tracking-tight text-white glow-text tabular-nums">
            {value.toString().padStart(2, '0')}
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 mt-1">{label}</span>
        </motion.div>
      ))}
    </div>
  );
};

export default function App() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-black flex flex-col items-center justify-start py-12 px-6 md:px-12 font-sans selection:bg-white/20">
      {/* Background Cinematic Light */}
      <div className="fixed inset-0 radial-gradient-bg pointer-events-none" />
      
      {/* Large Blurred Ambient Lights */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-white opacity-[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed -top-20 -left-20 w-96 h-96 bg-white opacity-[0.02] rounded-full blur-[100px] pointer-events-none" />

      {/* Animated Light Beam */}
      <motion.div 
        animate={{
          opacity: [0.05, 0.1, 0.05],
          rotate: [0, 5, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="fixed -top-1/2 left-1/2 -translate-x-1/2 w-[200vw] h-[200vh] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_50%)] pointer-events-none"
      />

      {/* Particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {mounted && Array.from({ length: 30 }).map((_, i) => (
          <Particle key={i} delay={i * 0.8} />
        ))}
      </div>

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="z-10 flex flex-col items-center space-y-4 mb-16"
      >
        <div className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center bg-white/5 backdrop-blur-md">
          <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
        </div>
        <span className="tracking-[0.6em] text-[10px] uppercase font-light opacity-60">Aurel Event</span>
      </motion.header>

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 1.8, 
          ease: [0.16, 1, 0.3, 1],
          delay: 0.2
        }}
        className="relative z-10 w-full max-w-[540px]"
      >
        <div className="glass-card rounded-[48px] p-10 md:p-14 flex flex-col items-center text-center relative overflow-hidden">
          {/* Subtle Inner Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="text-sm font-light tracking-[0.2em] uppercase text-white/50 mb-10"
          >
            One night. One vibe.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, filter: "blur(12px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 2, delay: 1.2 }}
            className="mb-6"
          >
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight mb-2">
              You’re invited to celebrate<br/>
              <span className="text-white glow-text-heavy">Aurel’s Birthday</span>
            </h1>
          </motion.div>

          <Countdown />

          <motion.div 
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 1.5, delay: 1 }}
            className="w-16 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent my-10"
          />

          {/* Event Details Grid */}
          <div className="grid grid-cols-2 gap-y-8 gap-x-12 w-full max-w-sm mb-12">
            <DetailItemLabel label="Date" value="16 May 2026" delay={2.4} />
            <DetailItemLabel label="Time" value="19:00 — Late" delay={2.6} />
            <DetailItemLabel label="Location" value="Secret location" delay={2.8} className="col-span-2" />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 3.2 }}
            className="text-white/20 font-light italic mb-10 text-[15px]"
          >
            “An elegant night. Music. Lights. Energy.”
          </motion.div>

          {/* Dress Code Pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 3.5 }}
            className="bg-white/5 rounded-full px-8 py-4 flex items-center space-x-8 border border-white/5 backdrop-blur-sm shadow-inner mb-12"
          >
            <div className="flex items-center space-x-3">
              <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_white]"></div>
              <span className="text-[11px] uppercase tracking-wider font-medium text-white/90">Girls in White</span>
            </div>
            <div className="w-[1px] h-3 bg-white/20"></div>
            <div className="flex items-center space-x-3">
              <div className="w-2.5 h-2.5 rounded-full bg-black border border-white/30"></div>
              <span className="text-[11px] uppercase tracking-wider font-medium text-white/60">Boys in Black</span>
            </div>
          </motion.div>

          {/* RSVP Section */}
          <div className="flex flex-col items-center gap-6">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 3.6 }}
              className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-medium"
            >
              RSVP Required
            </motion.p>
            <motion.a
              href="https://docs.google.com/forms/d/e/1FAIpQLSc-QvHCcaUZTEop98qreh-Wp1juGautg2mRGVRjMmK5zj267A/viewform?usp=header"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 3.8 }}
              className="group relative px-10 py-5 bg-white text-black rounded-full font-medium tracking-[0.3em] uppercase text-xs overflow-hidden transition-all duration-500 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] flex items-center gap-2"
            >
              <span className="relative z-10">Confirm my presence ✨</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            </motion.a>
          </div>
        </div>
      </motion.main>

      {/* Location Section */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, delay: 0.4 }}
        className="relative z-10 w-full max-w-[540px] mt-16"
      >
        <div className="glass-card rounded-[40px] p-10 flex flex-col items-center text-center overflow-hidden">
          <div className="absolute inset-0 location-glow pointer-events-none" />
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <Map className="w-6 h-6 text-white/60" />
          </div>
          <h2 className="text-[10px] uppercase font-light tracking-[0.6em] text-white/40 mb-3">Location</h2>
          <div className="space-y-2 mb-2">
            <p className="text-xl font-light text-white tracking-wide animate-glow-pulse">📍 Secret location.</p>
            <p className="text-sm font-light text-white/50 tracking-widest uppercase">Revealed tomorrow morning.</p>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 4.2 }}
        className="z-10 py-16"
      >
        <p className="text-sm font-light tracking-[0.4em] uppercase text-white/40 italic">See you soon.</p>
      </motion.footer>

    </div>
  );
}

function DetailItemLabel({ label, value, delay, className = "" }: { label: string, value: string, delay: number, className?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay }}
      className={`flex flex-col items-start ${className}`}
    >
      <span className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{label}</span>
      <span className="text-lg font-light text-white/90 tracking-wide">{value}</span>
    </motion.div>
  );
}
