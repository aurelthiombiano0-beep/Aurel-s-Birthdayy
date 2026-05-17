/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { Camera, Play, Loader2, Maximize2, Trash2, X as CloseIcon } from "lucide-react";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { auth, db, storage } from "./lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { onAuthStateChanged, User } from "firebase/auth";

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

interface Memory {
  id: string;
  url: string;
  type: 'image' | 'video';
  createdAt?: Timestamp;
  firstName?: string;
  lastName?: string;
  authorId?: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We can also show a user-friendly message
  alert(`Error: ${error instanceof Error ? error.message : 'Permission denied'}`);
}

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Memory | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  // Anonymous Identity
  const [firstName, setFirstName] = useState(localStorage.getItem('firstName') || "");
  const [lastName, setLastName] = useState(localStorage.getItem('lastName') || "");

  useEffect(() => {
    setMounted(true);

    // Silent Anonymous Login
    const initAuth = async () => {
      onAuthStateChanged(auth, async (currentUser) => {
        if (!currentUser) {
          try {
            const { signInAnonymously } = await import("firebase/auth");
            await signInAnonymously(auth);
          } catch (error: any) {
            console.error("Anonymous auth failed", error);
            if (error.code === 'auth/admin-restricted-operation') {
              console.warn("CRITICAL: Anonymous authentication is disabled in your Firebase console. Please enable it under Build > Authentication > Settings > Sign-in method.");
            }
          }
        } else {
          setUser(currentUser);
        }
      });
    };
    initAuth();

    // Firestore Listener
    const q = query(collection(db, "memories"), orderBy("createdAt", "desc"));
    const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      const fetchedMemories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Memory[];
      setMemories(fetchedMemories);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "memories");
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

    if (!user) {
      alert("Establishing secure connection... Please try again in a second.");
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
        // Unique path for storage
        const fileRef = ref(storage, `memories/${user.uid}/${Date.now()}_${file.name}`);
        
        const snapshot = await uploadBytes(fileRef, file);
        const url = await getDownloadURL(snapshot.ref);
        
        const memoriesPath = "memories";
        try {
          await addDoc(collection(db, memoriesPath), {
            url,
            type: fileType,
            createdAt: serverTimestamp(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            authorId: user.uid
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, memoriesPath);
          throw error;
        }
      }
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDelete = async (e: React.MouseEvent, memory: Memory) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this memory?")) return;

    const memoryPath = `memories/${memory.id}`;
    try {
      await deleteDoc(doc(db, "memories", memory.id));
      // Optionally delete from storage too if path is known
      // For now, removing the reference is sufficient for the "Album"
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, memoryPath);
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
            transition={{ duration: 1, delay: 0.8 }}
            className="text-[10px] uppercase tracking-[0.6em] text-white/30 mb-12 font-light"
          >
            One night. One vibe.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, filter: "blur(20px)", scale: 0.9 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1], delay: 1 }}
            className="mb-8"
          >
            <h1 className="text-5xl md:text-7xl font-extralight tracking-tighter leading-tight text-white glow-text-heavy">
              Merci d’être venu ✨
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, delay: 2 }}
            className="flex flex-col items-center space-y-4"
          >
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent mb-4" />
            <p className="text-lg md:text-xl font-light text-white/60 tracking-[0.2em]">
              Aurel Event — 16 Mai 2026
            </p>
          </motion.div>

          {/* Emotional Light Effect */}
          <motion.div 
            animate={{
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle,rgba(255,255,255,0.05)_0%,transparent_60%)] pointer-events-none"
          />
        </div>
      </motion.main>

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
            <p className="text-white/40 font-light italic text-sm tracking-widest mb-4">“Tonight lives forever ✨”</p>
            <motion.h2 
              initial={{ opacity: 0, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, filter: "blur(0px)" }}
              className="text-3xl md:text-4xl font-extralight tracking-tight text-white mb-4 glow-text"
            >
              Aurel Event Memories ✨
            </motion.h2>
            <p className="text-white/30 font-light text-xs tracking-[0.3em] uppercase">One shared album. Every moment.</p>
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
                    {memory.authorId === user?.uid && (
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
