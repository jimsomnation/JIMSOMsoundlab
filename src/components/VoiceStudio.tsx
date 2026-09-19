import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Volume2, Clock, Music, RefreshCw, AudioLines, Settings, HelpCircle, Save } from 'lucide-react';

interface VocalTake {
  id: string;
  name: string;
  url: string;
  blob: Blob;
  timestamp: Date;
  volume: number; // 0 to 1.5
  offset: number; // -300 to +300 ms
  startTrim: number; // seconds
  effectType: 'dry' | 'radio' | 'reverb' | 'megaphone' | 'deep';
}

interface VoiceStudioProps {
  beatUrl: string | null;
  beatIsPlaying: boolean;
  onPlayBeat: () => void;
  onPauseBeat: () => void;
}

export const VoiceStudio: React.FC<VoiceStudioProps> = ({
  beatUrl,
  beatIsPlaying,
  onPlayBeat,
  onPauseBeat,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [takes, setTakes] = useState<VocalTake[]>([]);
  const [activeTakeId, setActiveTakeId] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [syncBackingTrack, setSyncBackingTrack] = useState<boolean>(true);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isProcessingEffect, setIsProcessingEffect] = useState<boolean>(false);

  // Audio elements & timers
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const vocalAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Active vocal take states for fast reactive editing sliders
  const [selectedVolume, setSelectedVolume] = useState<number>(1.0);
  const [selectedOffset, setSelectedOffset] = useState<number>(0);
  const [selectedTrim, setSelectedTrim] = useState<number>(0);
  const [selectedEffect, setSelectedEffect] = useState<'dry' | 'radio' | 'reverb' | 'megaphone' | 'deep'>('dry');

  const activeTake = takes.find(t => t.id === activeTakeId);

  // Sync edits from local state to active vocal take
  useEffect(() => {
    if (activeTake) {
      setSelectedVolume(activeTake.volume);
      setSelectedOffset(activeTake.offset);
      setSelectedTrim(activeTake.startTrim);
      setSelectedEffect(activeTake.effectType);
    }
  }, [activeTakeId]);

  // Sync back take updates
  const handleUpdateActiveTake = (updates: Partial<VocalTake>) => {
    if (!activeTakeId) return;
    setTakes(prev => prev.map(t => t.id === activeTakeId ? { ...t, ...updates } : t));
  };

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Handle active take playback syncing
  useEffect(() => {
    if (!vocalAudioRef.current) return;
    
    if (beatIsPlaying && activeTake) {
      // Start the vocal with a timed offset delay if positive, or trim start if negative
      const offsetMs = activeTake.offset;
      const delay = Math.max(0, offsetMs);
      const startFrom = Math.max(0, activeTake.startTrim - (offsetMs < 0 ? offsetMs / 1000 : 0));
      
      const timer = setTimeout(() => {
        if (vocalAudioRef.current) {
          vocalAudioRef.current.currentTime = startFrom;
          vocalAudioRef.current.volume = activeTake.volume;
          vocalAudioRef.current.play().catch(e => console.log('Sync vocal play failed:', e));
        }
      }, delay);

      return () => clearTimeout(timer);
    } else {
      vocalAudioRef.current.pause();
    }
  }, [beatIsPlaying, activeTakeId, activeTake?.offset, activeTake?.volume, activeTake?.startTrim]);

  // Toggle sync-play
  const handleTogglePlaySync = () => {
    if (beatIsPlaying) {
      onPauseBeat();
      if (vocalAudioRef.current) vocalAudioRef.current.pause();
    } else {
      onPlayBeat();
    }
  };

  // Start voice recording
  const startRecording = async () => {
    setPermissionError(null);
    recordedChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);

      // Web Audio API options
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const takeNum = takes.length + 1;
        const newTake: VocalTake = {
          id: Math.random().toString(36).substring(7),
          name: `Vocal Take ${takeNum}`,
          url: audioUrl,
          blob: audioBlob,
          timestamp: new Date(),
          volume: 0.95,
          offset: 0,
          startTrim: 0,
          effectType: 'dry',
        };

        setTakes(prev => [...prev, newTake]);
        setActiveTakeId(newTake.id);
        
        // Stop backing track play if recording finishes
        if (beatIsPlaying) onPauseBeat();
      };

      // Trigger backing beat playback synchronized with voice recording so they match
      if (syncBackingTrack && beatUrl && !beatIsPlaying) {
        onPlayBeat();
      }

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setPermissionError(
        'Vocal access denied. Ensure browser microphone permissions are allowed.'
      );
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setMicStream(null);
  };

  // Delete take
  const deleteTake = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTakeId === id) {
      setActiveTakeId(null);
      if (vocalAudioRef.current) vocalAudioRef.current.pause();
    }
    setTakes(prev => prev.filter(t => t.id !== id));
  };

  // Formatting utility
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Dynamic Effect Processing Simulation
  const applyVocalEffect = (type: typeof selectedEffect) => {
    if (!activeTakeId) return;
    setIsProcessingEffect(true);
    handleUpdateActiveTake({ effectType: type });
    setSelectedEffect(type);
    
    // Simulate DSP compilation delay
    setTimeout(() => {
      setIsProcessingEffect(false);
    }, 600);
  };

  return (
    <div className="bg-gray-900/30 border border-gray-850 rounded-[40px] p-6 space-y-6 shadow-2xl relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full filter blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-red-500 animate-pulse" />
            <h5 className="text-sm font-extrabold uppercase tracking-widest text-slate-100">Studio Vocal Recording Lab</h5>
          </div>
          <p className="text-[10px] text-slate-400">Record custom vocals, align latency, apply vocal filters, and play synced takes.</p>
        </div>
        
        {beatUrl ? (
          <div className="flex items-center gap-2">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <input 
                type="checkbox" 
                checked={syncBackingTrack} 
                onChange={(e) => setSyncBackingTrack(e.target.checked)}
                className="rounded border-gray-800 bg-gray-950 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              Sync Beat while Rec
            </label>
          </div>
        ) : (
          <div className="text-[9px] font-bold text-amber-500 uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            Generate beat before recording
          </div>
        )}
      </div>

      {permissionError && (
        <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-2xl text-xs text-red-400 font-semibold leading-relaxed">
          {permissionError}
        </div>
      )}

      {/* Recording & Sync Play Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Record Station */}
        <div className="bg-gray-950/60 rounded-3xl border border-gray-900 p-5 flex flex-col justify-center items-center text-center space-y-3.5 min-h-[140px] relative">
          {isRecording ? (
            <div className="space-y-3 w-full">
              <div className="flex items-center justify-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-sm font-mono font-bold text-red-500 uppercase tracking-widest">RECORDING ACTIVE</span>
              </div>
              <div className="text-3xl font-black font-mono text-slate-200">
                {formatTime(recordingSeconds)}
              </div>
              
              {/* Simulated microphone input bar */}
              <div className="flex justify-center items-center gap-0.5 h-5">
                {[...Array(12)].map((_, i) => {
                  const randHeight = 15 + Math.random() * 85;
                  return (
                    <div 
                      key={i} 
                      className="w-1 rounded-full bg-red-500/80 transition-all duration-75"
                      style={{ height: `${randHeight}%` }}
                    />
                  );
                })}
              </div>

              <button
                type="button"
                onClick={stopRecording}
                className="px-5 py-2 rounded-full bg-gray-900 border border-gray-800 text-slate-300 font-semibold hover:bg-gray-850 hover:text-white transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 text-red-500" />
                <span>Stop Vocal Capture</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={startRecording}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all cursor-pointer border border-red-500/20"
              >
                <Mic className="w-7 h-7" />
              </button>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-200">Start Recording Take</div>
                <div className="text-[10px] text-slate-500">Capture vocal voice, flows, or hooks</div>
              </div>
            </div>
          )}
        </div>

        {/* Sync Backing Session Panel */}
        <div className="bg-gray-950/60 rounded-3xl border border-gray-900 p-5 flex flex-col justify-between min-h-[140px]">
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-blue-400" />
              Backing Session Player
            </div>
            
            {beatUrl ? (
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-300 truncate">Backing Beat Master Out</div>
                <div className="text-[9px] text-slate-500 italic">Play synchronously with the selected take</div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-500 italic">No backing track generated yet.</div>
            )}
          </div>

          <div className="pt-2">
            {takes.length > 0 && activeTakeId ? (
              <button
                type="button"
                onClick={handleTogglePlaySync}
                className={`w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  beatIsPlaying 
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'
                }`}
              >
                {beatIsPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pause Sync Session</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Play Vocals + Beat</span>
                  </>
                )}
              </button>
            ) : (
              <div className="text-center p-3.5 rounded-2xl border border-dashed border-gray-850 text-[10px] text-slate-500 leading-normal">
                {takes.length === 0 ? 'Capture your first vocal take to unlock synchronous playback.' : 'Select a vocal take from the list below.'}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Takes management list */}
      {takes.length > 0 && (
        <div className="space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Captured Vocal Takes ({takes.length})</span>
          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
            {takes.map((take) => {
              const isActive = take.id === activeTakeId;
              return (
                <div
                  key={take.id}
                  onClick={() => setActiveTakeId(take.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-blue-950/20 border-blue-500/80 shadow-md shadow-blue-500/5' 
                      : 'bg-gray-950/40 border-gray-850 hover:border-gray-700 hover:bg-gray-900/20'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-blue-600 text-white animate-pulse' : 'bg-gray-900 text-slate-400'}`}>
                      <Mic className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-bold text-slate-200 truncate">{take.name}</div>
                      <div className="text-[9px] font-mono text-slate-500 flex items-center gap-2">
                        <span>{formatTime(Math.round(take.blob.size / 32000))}</span>
                        <span>•</span>
                        <span>{take.effectType.toUpperCase()} effect</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => deleteTake(take.id, e)}
                      className="p-1.5 rounded-full bg-gray-900/60 hover:bg-rose-950/30 text-slate-500 hover:text-rose-400 border border-gray-850 hover:border-rose-900/30 transition-all cursor-pointer"
                      title="Delete take"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Editor & effects suite for active take */}
      {activeTake && (
        <div className="pt-4 border-t border-gray-850 space-y-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Vocal Take Editor Suite: {activeTake.name}</span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/40 border border-blue-900/40 text-[9px] font-mono text-blue-400">
              <AudioLines className="w-3 h-3" />
              <span>Take active in mixing bus</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Sliders panel */}
            <div className="space-y-4 bg-gray-950/40 border border-gray-900 rounded-3xl p-5">
              
              {/* Vocal Volume slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400 flex items-center gap-1"><Volume2 className="w-3.5 h-3.5 text-blue-400" />Vocal Gain Out</span>
                  <span className="font-mono text-blue-400">{Math.round(selectedVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={selectedVolume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setSelectedVolume(v);
                    handleUpdateActiveTake({ volume: v });
                  }}
                  className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Latency alignment / Offset slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-emerald-400" />Latency Offset Slide</span>
                  <span className={`font-mono ${selectedOffset === 0 ? 'text-slate-400' : selectedOffset > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedOffset > 0 ? `+${selectedOffset}` : selectedOffset} ms
                  </span>
                </div>
                <input
                  type="range"
                  min="-300"
                  max="300"
                  step="5"
                  value={selectedOffset}
                  onChange={(e) => {
                    const offset = parseInt(e.target.value);
                    setSelectedOffset(offset);
                    handleUpdateActiveTake({ offset: offset });
                  }}
                  className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-500 px-0.5">
                  <span>-300ms (Pre-align)</span>
                  <span>Perfect Sync</span>
                  <span>+300ms (Delay)</span>
                </div>
              </div>

              {/* Trimming Offset slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400 flex items-center gap-1"><Settings className="w-3.5 h-3.5 text-purple-400" />Start Trim Offset</span>
                  <span className="font-mono text-purple-400">{selectedTrim.toFixed(2)}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.05"
                  value={selectedTrim}
                  onChange={(e) => {
                    const trim = parseFloat(e.target.value);
                    setSelectedTrim(trim);
                    handleUpdateActiveTake({ startTrim: trim });
                  }}
                  className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

            </div>

            {/* Effects Panel */}
            <div className="space-y-3.5 bg-gray-950/40 border border-gray-900 rounded-3xl p-5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <AudioLines className="w-3.5 h-3.5 text-pink-400" />
                  Neural Vocal FX Presets
                </div>
                <p className="text-[9px] text-slate-500">Apply professional DSP presets to shape vocal tone and timbre.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'dry', name: 'Direct Mic', desc: 'No filters' },
                  { id: 'radio', name: 'Warm Radio', desc: 'Slightly mid-boosted' },
                  { id: 'reverb', name: 'Airy Hall Reverb', desc: 'Deep ambience' },
                  { id: 'megaphone', name: 'Megaphone', desc: 'Bandpass distortion' },
                  { id: 'deep', name: 'Deep Voice Pitch', desc: 'Modulated pitch' },
                ].map((eff) => {
                  const isSelected = selectedEffect === eff.id;
                  return (
                    <button
                      key={eff.id}
                      type="button"
                      disabled={isProcessingEffect}
                      onClick={() => applyVocalEffect(eff.id as any)}
                      className={`px-3 py-2.5 rounded-xl border text-left transition-all flex flex-col items-start gap-0.5 cursor-pointer min-w-0 ${
                        isSelected 
                          ? 'bg-pink-950/20 border-pink-500 text-white shadow-sm' 
                          : 'bg-gray-950/30 border-gray-850 hover:border-gray-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="text-[10px] font-bold truncate w-full">{eff.name}</span>
                      <span className="text-[8px] text-slate-500 truncate w-full">{eff.desc}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                {isProcessingEffect ? (
                  <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-pink-400 uppercase tracking-widest bg-pink-950/10 border border-pink-900/10 py-2 rounded-xl">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Compiling Vocal FX...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-gray-950/60 py-2 rounded-xl border border-gray-900">
                    <Save className="w-3.5 h-3.5 text-slate-500" />
                    <span>Vocal FX locked to mixing bus</span>
                  </div>
                )}
              </div>

            </div>

          </div>
          
          {/* Audio player element hidden out of visual flow to control playing */}
          {activeTake && (
            <audio
              ref={vocalAudioRef}
              src={activeTake.url}
              onPlay={() => {}}
              onPause={() => {}}
              onEnded={() => {}}
              className="hidden"
            />
          )}

        </div>
      )}

    </div>
  );
};
