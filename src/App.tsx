/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { Calendar, Clock, MapPin, QrCode, ArrowRight, Map, Camera, Play, Loader2, Maximize2, Trash2, X as CloseIcon } from "lucide-react";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { db, storage } from "./lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

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

interface Memory {
  id: string;
  url: string;
  type: 'image' | 'video';
  createdAt?: Timestamp;
  firstName?: string;
  lastName?: string;
  authorSecret?: string;
}

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Memory | null>(null);
  
  // Anonymous Identity
  const [firstName, setFirstName] = useState(localStorage.getItem('firstName') || "");
  const [lastName, setLastName] = useState(localStorage.getItem('lastName') || "");
  const [authorSecret] = useState(() => {
    let secret = localStorage.getItem('authorSecret');
    if (!secret) {
      secret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('authorSecret', secret);
    }
    return secret;
  });

  useEffect(() => {
    setMounted(true);

    // Firestore Listener
    const q = query(collection(db, "memories"), orderBy("createdAt", "desc"));
    const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      const fetchedMemories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Memory[];
      setMemories(fetchedMemories);
    });

    return () => {
      unsubscribeFirestore();
    };
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!firstName.trim() || !lastName.trim()) {
      alert("Please enter your name before sharing.");
      return;
    }

    // Persist names
    localStorage.setItem('firstName', firstName.trim());
    localStorage.setItem('lastName', lastName.trim());

    setUploading(true);
    
    try {
      const fileList = Array.from(files) as File[];
      for (const file of fileList) {
        const fileType = file.type.startsWith('video') ? 'video' : 'image';
        const fileRef = ref(storage, `memories/${Date.now()}_${file.name}`);
        
        const snapshot = await uploadBytes(fileRef, file);
        const url = await getDownloadURL(snapshot.ref);
        
        await addDoc(collection(db, "memories"), {
          url,
          type: fileType,
          createdAt: serverTimestamp(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          authorSecret: authorSecret
        });
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert("Something went wrong with the upload. Check your connection.");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDelete = async (e: React.MouseEvent, memory: Memory) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this memory?")) return;

    try {
      // 1. Delete from storage if possible (or just Firestore record)
      // Usually storage delete needs the full path. If we don't store it, we just delete the doc.
      // For this app, deleting the Firestore doc is enough to remove it from the album.
      await deleteDoc(doc(db, "memories", memory.id));
    } catch (error) {
      console.error("Delete failed", error);
      alert("Failed to delete memory.");
    }
  };

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
        className="z-10 flex flex-col items-center space-y-4 mb-16 w-full max-w-[540px]"
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
            <DetailItemLabel label="Location" value="Azalaï Salle SEGTAABA" delay={2.8} className="col-span-2" />
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
          <div className="space-y-4 mb-8">
            <p className="text-xl font-light text-white tracking-wide">📍 Azalaï Hôtel — Salle SEGTAABA</p>
          </div>
          
          <motion.a
            href="https://www.google.com/maps/search/?api=1&query=Azalaï+Hôtel+Ouagadougou"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-3 px-8 py-3.5 bg-white/5 border border-white/10 rounded-full text-xs font-medium tracking-widest uppercase hover:bg-white/10 transition-all hover:border-white/30"
          >
            Open in Maps
            <ArrowRight className="w-4 h-4 opacity-50" />
          </motion.a>
        </div>
      </motion.section>

      {/* Memories Album Section */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, delay: 0.2 }}
        className="relative z-10 w-full max-w-[800px] mt-16 px-4"
      >
        <div className="glass-card rounded-[48px] p-8 md:p-16 flex flex-col items-center overflow-hidden">
          <div className="text-center mb-12">
            <p className="text-white/40 font-light italic text-sm tracking-widest mb-4">“Share the memories of the night ✨”</p>
            <motion.h2 
              initial={{ opacity: 0, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, filter: "blur(0px)" }}
              className="text-3xl md:text-4xl font-extralight tracking-tight text-white mb-4 glow-text"
            >
              Memories Album
            </motion.h2>
            <p className="text-white/30 font-light text-xs tracking-[0.3em] uppercase">Every moment. One shared album.</p>
          </div>

          {/* Name Selection Form */}
          <div className="w-full max-w-sm mb-12 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[8px] uppercase tracking-widest text-white/30 ml-2">First Name</label>
              <input 
                type="text" 
                placeholder="Ex: John" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-white/30 transition-all font-light"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[8px] uppercase tracking-widest text-white/30 ml-2">Last Name</label>
              <input 
                type="text" 
                placeholder="Ex: Doe" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-white/30 transition-all font-light"
              />
            </div>
          </div>

          {/* Upload Area */}
          <div className="w-full max-w-lg mb-16">
            <label className={`group relative block ${uploading ? 'cursor-wait' : 'cursor-pointer'}`}>
              <input 
                type="file" 
                accept="image/*,video/*" 
                multiple 
                className="hidden" 
                disabled={uploading}
                onChange={handleUpload}
              />
              <div className={`border border-dashed border-white/20 rounded-[32px] p-10 md:p-14 text-center transition-all duration-500 ${uploading ? 'opacity-50' : 'group-hover:border-white/40 group-hover:bg-white/5'} backdrop-blur-sm`}>
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
                  ) : (
                    <Camera className="w-8 h-8 text-white/40 group-hover:text-white/60" />
                  )}
                </div>
                <p className="text-white/80 font-light text-sm mb-2 tracking-wide">
                  {uploading ? "Uploading your moment..." : "Add to Album"}
                </p>
                <p className="text-white/30 text-[10px] font-light uppercase tracking-widest">
                  {(!firstName.trim() || !lastName.trim()) ? "Enter names above to share" : "Photo or short video"}
                </p>
              </div>
            </label>
          </div>

          {/* Gallery Grid */}
          <AnimatePresence mode="popLayout">
            {memories.length > 0 ? (
              <motion.div 
                layout
                className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 w-full"
              >
                {memories.map((memory, index) => (
                  <motion.div
                    key={memory.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    onClick={() => setSelectedMedia(memory)}
                    className="relative aspect-square rounded-[24px] overflow-hidden glass-card group cursor-pointer border border-white/10"
                  >
                    {memory.type === 'image' ? (
                      <img 
                        src={memory.url} 
                        alt="Event Memory" 
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                      />
                    ) : (
                      <div className="relative w-full h-full">
                        <video 
                          src={memory.url} 
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                          <Play className="w-8 h-8 text-white/60 group-hover:scale-110 transition-transform" />
                        </div>
                      </div>
                    )}
                    
                    {/* Delete Button overlay */}
                    {memory.authorSecret === authorSecret && (
                      <button 
                        onClick={(e) => handleDelete(e, memory)}
                        className="absolute top-3 right-3 z-20 p-2 bg-black/40 backdrop-blur-md rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/40"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-4">
                       <span className="text-[10px] font-light text-white tracking-wide truncate mb-1">
                         {memory.firstName} {memory.lastName}
                       </span>
                       <div className="flex justify-between items-center w-full">
                         <span className="text-[7px] uppercase tracking-[0.4em] text-white/40">Moment #{memories.length - index}</span>
                         <Maximize2 className="w-2 h-2 text-white/40" />
                       </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="py-20 text-center">
                <p className="text-white/20 font-light text-sm tracking-widest uppercase">The album is waiting for its first memory.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4"
          >
            <button 
              onClick={() => setSelectedMedia(null)}
              className="absolute top-8 right-8 z-[110] text-white/40 hover:text-white transition-colors p-2"
            >
              <CloseIcon className="w-8 h-8 md:w-10 md:h-10" />
            </button>
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-5xl max-h-[85vh] flex items-center justify-center"
            >
              {selectedMedia.type === 'image' ? (
                <img 
                  src={selectedMedia.url} 
                  className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
                  alt="Fullscreen view"
                />
              ) : (
                <video 
                  src={selectedMedia.url} 
                  className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
                  controls
                  autoPlay
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
