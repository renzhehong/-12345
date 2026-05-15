/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useMemo, ChangeEvent } from 'react';
import { 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  FolderPlus, 
  ChevronRight, 
  ChevronDown, 
  Clock, 
  FileVideo, 
  Link as LinkIcon,
  Search,
  Settings,
  MoreVertical,
  ChevronLeft,
  X,
  PlusCircle,
  Save,
  Info,
  Minus,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Keyframe, Group, VideoEntry } from './types.ts';

// --- Utilities ---
const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const generateId = () => Math.random().toString(36).substring(2, 9);

const COLORS = [
  '#D4AF37', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6'
];

export default function App() {
  const [videos, setVideos] = useState<VideoEntry[]>(() => {
    const saved = localStorage.getItem('keytrack_videos');
    return saved ? JSON.parse(saved) : [];
  });

  const [keyframes, setKeyframes] = useState<Keyframe[]>(() => {
    const saved = localStorage.getItem('keytrack_keyframes');
    return saved ? JSON.parse(saved) : [];
  });

  const [libraries, setLibraries] = useState<Group[]>(() => {
    const saved = localStorage.getItem('keytrack_libraries');
    return saved ? JSON.parse(saved) : [{ id: 'default', name: 'General Archive', color: '#D4AF37' }];
  });
  
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(() => {
    const last = localStorage.getItem('keytrack_last_video');
    return last || null;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [videoZoom, setVideoZoom] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeLibraryId, setActiveLibraryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingLibraryId, setEditingLibraryId] = useState<string | null>(null);
  const [videoToDeleteId, setVideoToDeleteId] = useState<string | null>(null);
  const [libraryToDeleteId, setLibraryToDeleteId] = useState<string | null>(null);
  const [keyframeToDeleteId, setKeyframeToDeleteId] = useState<string | null>(null);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('keytrack_videos', JSON.stringify(videos));
    localStorage.setItem('keytrack_keyframes', JSON.stringify(keyframes));
    localStorage.setItem('keytrack_libraries', JSON.stringify(libraries));
  }, [videos, keyframes, libraries]);

  useEffect(() => {
    if (currentVideoId) {
      localStorage.setItem('keytrack_last_video', currentVideoId);
      setVideoError(null);
    }
  }, [currentVideoId]);

  const currentVideo = useMemo(() => 
    videos.find(v => v.id === currentVideoId) || null,
  [videos, currentVideoId]);

  // --- Handlers ---
  const handleAddVideo = (url: string, title: string, type: 'file' | 'url') => {
    const newVideo: VideoEntry = {
      id: generateId(),
      title,
      url,
      type,
      lastAccessed: Date.now()
    };
    setVideos([newVideo, ...videos]);
    setCurrentVideoId(newVideo.id);
  };

  const handleRenameVideo = (id: string, newTitle: string) => {
    setVideos(videos.map(v => v.id === id ? { ...v, title: newTitle } : v));
    setEditingVideoId(null);
  };

  const handleDeleteVideo = (id: string) => {
    setVideos(videos.filter(v => v.id !== id));
    setKeyframes(keyframes.filter(kf => kf.videoId !== id));
    if (currentVideoId === id) {
      setCurrentVideoId(null);
    }
    setVideoToDeleteId(null);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      handleAddVideo(url, file.name, 'file');
    }
  };

  const handleAddUrl = () => {
    const url = prompt('Enter Video URL:');
    if (url) {
      handleAddVideo(url, 'Remote Video', 'url');
    }
  };

  const handleAddKeyframe = () => {
    if (!currentVideo || !videoRef.current) return;
    
    const time = videoRef.current.currentTime;
    const newKeyframe: Keyframe = {
      id: generateId(),
      videoId: currentVideo.id,
      time,
      note: '',
      groupId: activeLibraryId === 'all' ? (libraries[0]?.id || 'default') : activeLibraryId,
      createdAt: Date.now()
    };

    setKeyframes([...keyframes, newKeyframe].sort((a, b) => a.time - b.time));
  };

  const handleUpdateKeyframeNote = (kfId: string, note: string) => {
    setKeyframes(keyframes.map(kf => kf.id === kfId ? { ...kf, note } : kf));
  };

  const handleDeleteKeyframe = (kfId: string) => {
    setKeyframes(keyframes.filter(kf => kf.id !== kfId));
  };

  const [isAddingLibrary, setIsAddingLibrary] = useState(false);
  const [newLibName, setNewLibName] = useState('');

  const SPEED_OPTIONS = [0.5, 1, 1.5, 2];

  const handleCycleSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    const nextSpeed = SPEED_OPTIONS[nextIndex];
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const handleAddLibrary = () => {
    if (!newLibName.trim()) {
      setIsAddingLibrary(false);
      return;
    }

    const newLibrary: Group = {
      id: generateId(),
      name: newLibName.trim(),
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    };

    setLibraries([...libraries, newLibrary]);
    setActiveLibraryId(newLibrary.id);
    setNewLibName('');
    setIsAddingLibrary(false);
  };

  const handleRenameLibrary = (id: string, newName: string) => {
    if (!newName.trim()) {
      setEditingLibraryId(null);
      return;
    }
    setLibraries(libraries.map(l => l.id === id ? { ...l, name: newName.trim() } : l));
    setEditingLibraryId(null);
  };

  const handleDeleteLibrary = (libId: string) => {
    if (libId === 'default') return;
    setLibraries(libraries.filter(l => l.id !== libId));
    setKeyframes(keyframes.map(kf => kf.groupId === libId ? { ...kf, groupId: libraries[0]?.id || 'default' } : kf));
    if (activeLibraryId === libId) setActiveLibraryId('all');
  };

  const seekTo = (videoId: string, time: number) => {
    if (videoId !== currentVideoId) {
      setCurrentVideoId(videoId);
      // We need to wait for the video to load before seeking
      // For simplicity in this demo, the effect will handle the load
      // But we need a small hint to seek after load
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
          videoRef.current.play();
          setIsPlaying(true);
        }
      }, 500);
    } else if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // --- Filtered Content ---
  const filteredKeyframes = useMemo(() => {
    return keyframes.filter(kf => {
      const matchesLibrary = activeLibraryId === 'all' || kf.groupId === activeLibraryId;
      const matchesSearch = kf.note.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLibrary && matchesSearch;
    });
  }, [keyframes, activeLibraryId, searchQuery]);

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-gray-200 overflow-hidden font-sans">
      {/* --- Left Sidebar: Video Library --- */}
      {!isTheaterMode && (
        <div className="w-64 border-r border-white/10 bg-[#0c0c0c] flex flex-col shadow-2xl">
          <div className="p-8 border-b border-white/10 flex items-center justify-between bg-[#0f0f0f]">
          <h1 className="text-xl font-serif tracking-[0.2em] uppercase italic text-white flex items-center gap-3">
            <span className="bg-[#D4AF37] p-2 rounded transform rotate-12">
              <PlusCircle className="w-5 h-5 text-black" />
            </span>
            Vellum
          </h1>
        </div>

        <div className="p-6 space-y-4">
          <label className="flex flex-col gap-3">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-600 px-1">Archive</span>
            <div className="flex gap-2">
              <button 
                onClick={() => document.getElementById('file-upload')?.click()}
                className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 transition-all py-3 rounded text-[10px] uppercase tracking-widest font-bold text-gray-300"
                title="Support MP4, WebM, OGG, MOV, MKV"
              >
                <FileVideo className="w-3.5 h-3.5 text-[#D4AF37]" />
                Video
              </button>
              <button 
                onClick={handleAddUrl}
                className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 transition-all py-3 rounded text-[10px] uppercase tracking-widest font-bold text-gray-300"
              >
                <LinkIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
                URL
              </button>
            </div>
            <input id="file-upload" type="file" accept="video/*,.mp4,.webm,.ogg,.mov,.mkv" className="hidden" onChange={handleFileUpload} />
            <p className="text-[9px] text-gray-700 italic px-1">Supports MP4, WebM, OGG, MOV...</p>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2 py-6">
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-600 px-2 pb-4 block">Collection</span>
          {videos.length === 0 && (
            <div className="px-3 py-12 text-center text-gray-700 space-y-3">
              <Info className="w-10 h-10 mx-auto opacity-10" />
              <p className="text-[10px] uppercase tracking-widest leading-loose">The vault is currently empty.</p>
            </div>
          )}
          {videos.map(v => (
            <div key={v.id} className="relative group/video">
              <button
                onClick={() => setCurrentVideoId(v.id)}
                className={`w-full text-left px-4 py-3.5 rounded transition-all flex items-center gap-4 ${
                  currentVideoId === v.id 
                    ? 'bg-white/5 text-[#D4AF37] border-l-2 border-[#D4AF37]' 
                    : 'hover:bg-white/5 text-gray-500 border-l-2 border-transparent'
                }`}
              >
                <FileVideo className={`w-4 h-4 shrink-0 ${currentVideoId === v.id ? 'text-[#D4AF37]' : 'text-gray-700'}`} />
                {editingVideoId === v.id ? (
                  <input
                    autoFocus
                    className="bg-transparent border-none p-0 text-[11px] font-bold uppercase tracking-wider text-white focus:ring-0 w-full"
                    defaultValue={v.title}
                    onBlur={(e) => handleRenameVideo(v.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameVideo(v.id, e.currentTarget.value);
                      if (e.key === 'Escape') setEditingVideoId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="truncate text-[11px] font-bold uppercase tracking-wider">{v.title}</span>
                )}
              </button>
              
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/video:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingVideoId(v.id);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-[#D4AF37] transition-all"
                  title="Rename"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideoToDeleteId(v.id);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-red-500 transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* --- Main Content: Player --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a]">
        {currentVideo ? (
          <>
            {/* Header Area */}
            {!isTheaterMode && (
              <div className="px-8 py-4 flex items-center justify-between border-b border-white/10 bg-[#0f0f0f]">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 hover:bg-white/5 rounded-md transition-colors text-[#D4AF37]"
                  >
                    <ChevronLeft className={`w-5 h-5 transition-transform ${!isSidebarOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className="space-y-0.5">
                    <h2 className="text-sm font-serif italic text-white truncate max-w-md">{currentVideo.title}</h2>
                    <p className="text-[10px] text-gray-500 font-mono tracking-[0.1em] uppercase">
                      {formatTime(currentTime)} <span className="text-[#D4AF37]/40 px-1">/</span> {formatTime(duration)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleAddKeyframe}
                    className="flex items-center gap-2 px-5 py-2 bg-white text-black hover:bg-[#D4AF37] rounded font-bold text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Mark Moment
                  </button>
                  <button 
                    onClick={() => setVideoToDeleteId(currentVideo.id)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Video Canvas */}
            <div className={`flex-1 relative group flex items-center justify-center ${isTheaterMode ? 'p-2 md:p-4' : 'p-6 md:p-10'} bg-[#050505] transition-all duration-500 overflow-hidden`}>
              <div 
                className={`relative w-full transition-all duration-500 bg-black rounded-xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/5 ${
                  isTheaterMode ? 'max-w-full h-full' : 'max-w-[1400px] aspect-video'
                }`}
              >
                {videoError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-[#0a0a0a] z-50">
                    <Info className="w-12 h-12 text-[#D4AF37] mb-4 opacity-20" />
                    <h3 className="text-white font-serif italic text-lg mb-2">Resource Expired or Missing</h3>
                    <p className="text-[10px] text-gray-500 max-w-xs mb-8 uppercase tracking-widest leading-loose">
                      {videoError}
                    </p>
                    {currentVideo?.type === 'file' && (
                      <button 
                        onClick={() => document.getElementById('relink-upload')?.click()}
                        className="px-8 py-3 bg-white text-black font-bold text-[10px] uppercase tracking-[0.2em] rounded hover:bg-[#D4AF37] transition-all hover:scale-105"
                      >
                        Re-link Local File
                      </button>
                    )}
                    <input 
                      id="relink-upload" 
                      type="file" 
                      accept="video/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && currentVideo) {
                          const url = URL.createObjectURL(file);
                          setVideos(videos.map(v => v.id === currentVideo.id ? { ...v, url } : v));
                          setVideoError(null);
                        }
                      }} 
                    />
                  </div>
                ) : (
                  <div className="w-full h-full relative cursor-crosshair overflow-hidden">
                    <video
                      ref={videoRef}
                      src={currentVideo.url}
                      style={{ transform: `scale(${videoZoom})`, transformOrigin: 'center' }}
                      className="w-full h-full object-contain transition-transform duration-300"
                      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                      onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onError={() => {
                        if (currentVideo.type === 'file') {
                          setVideoError('Browser session for this local file has expired. Please re-select the file from your computer.');
                        } else {
                          setVideoError('The remote video source could not be reached or is in an unsupported format.');
                        }
                      }}
                      onClick={() => isPlaying ? videoRef.current?.pause() : videoRef.current?.play()}
                    />
                    
                    {/* Zoom Indicator */}
                    {videoZoom > 1 && (
                      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest z-20">
                        Zoom: {videoZoom.toFixed(1)}x
                      </div>
                    )}
                  </div>
                )}
                
                {/* Custom Overlay Controls */}
                <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-5 z-30">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          const v = videoRef.current;
                          if (v) v.currentTime -= 5;
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => isPlaying ? videoRef.current?.pause() : videoRef.current?.play()}
                        className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:bg-[#D4AF37] transition-all hover:scale-110 shadow-xl"
                      >
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                      </button>
                      <button 
                        onClick={() => {
                          const v = videoRef.current;
                          if (v) v.currentTime += 5;
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex-1 group/progress relative py-3 cursor-pointer" onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pos = (e.clientX - rect.left) / rect.width;
                      if (videoRef.current) videoRef.current.currentTime = pos * duration;
                    }}>
                      <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#D4AF37] to-yellow-200 transition-all duration-100" 
                          style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-[10px] font-mono font-bold text-gray-400 tracking-tighter">
                        <span className="text-white">{formatTime(currentTime)}</span>
                        <span className="mx-1.5 opacity-30">/</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                      
                      <div className="flex items-center bg-black/40 backdrop-blur-sm rounded-lg border border-white/5 p-1 gap-1">
                        <button 
                          onClick={handleCycleSpeed}
                          className="px-2.5 py-1.5 hover:bg-white/10 rounded-md text-[10px] font-bold text-white transition-all flex items-center gap-1.5 min-w-[54px] justify-center"
                          title="Playback Speed"
                        >
                          <span className="text-[#D4AF37]">{playbackSpeed}x</span>
                        </button>
                        <div className="w-[1px] h-3 bg-white/10 mx-0.5" />
                        <button 
                          onClick={() => setVideoZoom(prev => Math.max(1, prev - 0.5))}
                          className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
                          title="Zoom Out"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setVideoZoom(1)}
                          className="px-2 text-[9px] font-bold uppercase text-[#D4AF37] hover:text-white transition-colors"
                        >
                          1:1
                        </button>
                        <button 
                          onClick={() => setVideoZoom(prev => Math.min(4, prev + 0.5))}
                          className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
                          title="Zoom In"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button 
                        onClick={() => setIsTheaterMode(!isTheaterMode)}
                        className={`p-2 rounded-md transition-all ${isTheaterMode ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                        title={isTheaterMode ? 'Normal View' : 'Theater View'}
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      
                      {isTheaterMode && (
                        <button 
                          onClick={handleAddKeyframe}
                          className="flex items-center gap-2 px-3 py-2 bg-[#D4AF37] text-black rounded font-bold text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ml-2"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Mark
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-6">
            <div className="w-24 h-24 bg-[#121212] rounded-full flex items-center justify-center border border-[#222]">
              <FileVideo className="w-10 h-10 opacity-30" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium text-white">No Video Selected</h3>
              <p className="text-sm max-w-xs mx-auto">Select a video from your library or import a new one to start annotating.</p>
            </div>
          </div>
        )}
      </div>

      {/* --- Right Sidebar: Libraries & Keyframes --- */}
      <AnimatePresence>
        {isSidebarOpen && !isTheaterMode && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-white/10 bg-[#0c0c0c] flex flex-col h-full shadow-2xl z-10"
          >
            {/* Library Selection (Category Bar) */}
            <div className="p-6 space-y-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Library Vault</h3>
                <button 
                  onClick={() => setIsAddingLibrary(true)}
                  className="text-[#D4AF37] hover:scale-110 transition-transform p-1 hover:bg-white/5 rounded"
                  title="New Library"
                >
                  <FolderPlus className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {isAddingLibrary && (
                  <div className="px-1 py-2 animate-in slide-in-from-top-1 duration-200">
                    <input 
                      autoFocus
                      placeholder="Library name..."
                      className="w-full bg-white/5 border border-[#D4AF37]/50 rounded px-3 py-2 text-[10px] text-white focus:outline-none uppercase tracking-widest font-bold"
                      value={newLibName}
                      onChange={(e) => setNewLibName(e.target.value)}
                      onBlur={handleAddLibrary}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddLibrary();
                        if (e.key === 'Escape') setIsAddingLibrary(false);
                      }}
                    />
                  </div>
                )}

                <button 
                  onClick={() => setActiveLibraryId('all')}
                  className={`w-full text-left px-4 py-3 rounded text-[10px] uppercase font-bold tracking-widest transition-all border flex items-center justify-between group/lib ${
                    activeLibraryId === 'all' 
                      ? 'bg-white text-black border-white shadow-lg' 
                      : 'bg-white/5 text-gray-500 border-white/5 hover:border-[#D4AF37]/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-1 h-4 rounded-full ${activeLibraryId === 'all' ? 'bg-black' : 'bg-gray-800'}`} />
                    All Archive
                  </div>
                  <span className={`${activeLibraryId === 'all' ? 'text-black/50' : 'text-gray-700'}`}>{keyframes.length}</span>
                </button>
                {libraries.map(lib => (
                  <div key={lib.id} className="relative group/lib">
                    <button 
                      onClick={() => setActiveLibraryId(lib.id)}
                      className={`w-full text-left px-4 py-3 rounded text-[10px] uppercase font-bold tracking-widest transition-all border flex items-center justify-between ${
                        activeLibraryId === lib.id 
                          ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30 ring-1 ring-[#D4AF37]/20 shadow-[0_0_20px_rgba(212,175,55,0.05)]' 
                          : 'bg-white/5 text-gray-500 border-white/5 hover:border-[#D4AF37]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: lib.color }} />
                        {editingLibraryId === lib.id ? (
                          <input
                            autoFocus
                            className="bg-transparent border-none p-0 text-[10px] font-bold uppercase tracking-widest text-white focus:ring-0 w-32"
                            defaultValue={lib.name}
                            onBlur={(e) => handleRenameLibrary(lib.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameLibrary(lib.id, e.currentTarget.value);
                              if (e.key === 'Escape') setEditingLibraryId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="truncate max-w-[140px]">{lib.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`opacity-30 group-hover/lib:opacity-0 transition-opacity ${editingLibraryId === lib.id ? 'hidden' : ''}`}>
                          {keyframes.filter(k => k.groupId === lib.id).length}
                        </span>
                      </div>
                    </button>
                    
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/lib:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLibraryId(lib.id);
                        }}
                        className="p-1 hover:bg-white/10 rounded text-gray-600 hover:text-[#D4AF37] transition-all"
                        title="Rename Library"
                      >
                        <Settings className="w-3 h-3" />
                      </button>
                      {lib.id !== 'default' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLibraryToDeleteId(lib.id);
                          }}
                          className="p-1 hover:bg-white/10 rounded text-gray-600 hover:text-red-500 transition-all"
                          title="Delete Library"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input 
                  type="text" 
                  placeholder="Filter vault..."
                  className="w-full bg-black/50 border border-white/10 rounded py-3 pl-10 pr-4 text-xs focus:outline-none focus:border-[#D4AF37]/50 transition-colors placeholder:text-gray-700"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Keyframes List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {filteredKeyframes.length === 0 ? (
                <div className="text-center py-24 opacity-10 space-y-4">
                  <Clock className="w-12 h-12 mx-auto" />
                  <p className="text-[10px] uppercase tracking-[0.3em]">Vault section empty</p>
                </div>
              ) : (
                filteredKeyframes.map((kf, idx) => {
                  const kfVideo = videos.find(v => v.id === kf.videoId);
                  return (
                    <div 
                      key={kf.id}
                      className="group-kf bg-white/[0.03] rounded border border-white/5 hover:border-[#D4AF37]/40 p-4 space-y-4 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <button 
                          onClick={() => seekTo(kf.videoId, kf.time)}
                          className="flex items-center gap-3 group/time"
                        >
                          <span className="text-[10px] font-mono font-bold text-[#D4AF37] tracking-tight">{formatTime(kf.time)}</span>
                          <Play className="w-2.5 h-2.5 fill-[#D4AF37] text-[#D4AF37] opacity-0 group-hover/time:opacity-100 transition-opacity" />
                        </button>
                        <div className="flex items-center gap-1">
                          {keyframeToDeleteId === kf.id ? (
                            <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-1 duration-200">
                              <button 
                                onClick={() => {
                                  handleDeleteKeyframe(kf.id);
                                  setKeyframeToDeleteId(null);
                                }}
                                className="px-2 py-0.5 bg-red-600 text-[8px] font-bold uppercase tracking-widest text-white rounded hover:bg-red-500 transition-colors"
                              >
                                Delete entry
                              </button>
                              <button 
                                onClick={() => setKeyframeToDeleteId(null)}
                                className="p-1 text-gray-500 hover:text-white transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setKeyframeToDeleteId(kf.id)}
                              className="opacity-0 group-hover-kf:opacity-100 p-1.5 hover:bg-red-400/10 rounded transition-opacity text-gray-700 hover:text-red-400"
                              title="Delete Observation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <textarea 
                          className="w-full bg-transparent border-none text-xs text-gray-400 focus:ring-0 p-0 resize-none placeholder:text-gray-700 min-h-[40px] leading-relaxed"
                          placeholder="Write observations..."
                          value={kf.note}
                          onChange={(e) => handleUpdateKeyframeNote(kf.id, e.target.value)}
                        />
                      </div>

                      <div className="pt-3 flex flex-col gap-2 border-t border-white/5">
                        {kfVideo && (
                          <div className="flex items-center gap-2 text-[9px] text-gray-600 truncate mb-1">
                            <FileVideo className="w-2.5 h-2.5" />
                            {kfVideo.title}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <select 
                            className="bg-transparent border-none text-[9px] uppercase tracking-wider text-gray-600 focus:ring-0 p-0 cursor-pointer hover:text-gray-300"
                            value={kf.groupId}
                            onChange={(e) => {
                              const newLibId = e.target.value;
                              setKeyframes(keyframes.map(k => k.id === kf.id ? { ...k, groupId: newLibId } : k));
                            }}
                          >
                            {libraries.map(lib => (
                              <option key={lib.id} value={lib.id} className="bg-[#0c0c0c]">{lib.name}</option>
                            ))}
                          </select>
                          <span className="text-[9px] text-[#D4AF37]/30 uppercase font-bold tracking-widest">
                            VELV-{idx + 1}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-6 border-t border-white/10 bg-[#0a0a0a]">
              <button className="w-full py-4 bg-white text-black font-bold text-[10px] uppercase tracking-[0.2em] rounded hover:bg-[#D4AF37] transition-all shadow-xl shadow-black/40">
                Export Analysis
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Delete Confirmation Modal --- */}
      <AnimatePresence>
        {videoToDeleteId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-[#0f0f0f] border border-white/10 rounded-xl p-8 max-w-sm w-full shadow-2xl space-y-6"
            >
              <div className="space-y-2 text-center">
                <Trash2 className="w-12 h-12 text-red-500 mx-auto opacity-50" />
                <h3 className="text-xl font-serif italic text-white">Permanently Delete?</h3>
                <p className="text-xs text-gray-500 font-medium leading-relaxed uppercase tracking-widest">
                  This action will remove the video "{videos.find(v => v.id === videoToDeleteId)?.title}" and all its associated keyframes from your vault.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleDeleteVideo(videoToDeleteId)}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-[0.2em] rounded transition-all"
                >
                  Confirm Deletion
                </button>
                <button 
                  onClick={() => setVideoToDeleteId(null)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-xs uppercase tracking-[0.2em] rounded border border-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Library Deletion Confirmation Modal --- */}
      <AnimatePresence>
        {libraryToDeleteId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-[#0f0f0f] border border-white/10 rounded-xl p-8 max-w-sm w-full shadow-2xl space-y-6"
            >
              <div className="space-y-3 text-center">
                <FolderPlus className="w-12 h-12 text-[#D4AF37] mx-auto opacity-50" />
                <h3 className="text-xl font-serif italic text-white">Dissolve Library?</h3>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed uppercase tracking-[0.2em]">
                  Dissolving "{libraries.find(l => l.id === libraryToDeleteId)?.name}" will move its entries back to the General Archive.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    handleDeleteLibrary(libraryToDeleteId);
                    setLibraryToDeleteId(null);
                  }}
                  className="w-full py-4 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 font-bold text-xs uppercase tracking-[0.2em] rounded hover:bg-[#D4AF37]/20 transition-all"
                >
                  Dissolve
                </button>
                <button 
                  onClick={() => setLibraryToDeleteId(null)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-xs uppercase tracking-[0.2em] rounded border border-white/10 transition-all"
                >
                  Keep Library
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .group-kf:hover .group-hover-kf\\:opacity-100 { opacity: 1; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #333; }
        input[type=range]::-webkit-slider-runnable-track { -webkit-appearance: none; background: transparent; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 0; height: 0; }
      `}</style>
    </div>
  );
}
