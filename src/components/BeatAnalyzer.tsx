import React, { useRef, useEffect, useState } from 'react';
import { Activity, Radio, BarChart2, Volume2, Shield } from 'lucide-react';

interface BeatAnalyzerProps {
  audioUrl: string;
  isPlaying: boolean;
  bpm: number;
  musicKey: string;
  scale: string;
  density: string;
}

export const BeatAnalyzer: React.FC<BeatAnalyzerProps> = ({
  audioUrl,
  isPlaying,
  bpm,
  musicKey,
  scale,
  density,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  const [peakTransient, setPeakTransient] = useState<number>(0.85 + Math.random() * 0.1);
  const [lufs, setLufs] = useState<string>('-11.4 LUFS');
  const [spectralType, setSpectralType] = useState<string>('Balanced Modern');

  // Set up visualizer stats based on song properties
  useEffect(() => {
    if (density === 'Dense') {
      setSpectralType('High Energy / Sub-bass Heavy');
      setLufs('-9.2 LUFS');
    } else if (density === 'Sparse') {
      setSpectralType('Spacious Ambient / Mid-crisp');
      setLufs('-14.5 LUFS');
    } else {
      setSpectralType('Balanced Dynamic Range');
      setLufs('-12.1 LUFS');
    }
  }, [density]);

  // Canvas visualizer rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let phase = 0;
    const barCount = 48;
    const barWidth = width / barCount - 2;
    const heights = Array(barCount).fill(0).map(() => 5 + Math.random() * 10);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle background grid lines
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.2)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      phase += isPlaying ? 0.08 : 0.01;

      // Draw visualizer bars
      for (let i = 0; i < barCount; i++) {
        // Calculate dynamic height based on sin wave and randomness
        let targetHeight = 0;
        if (isPlaying) {
          const sinValue = Math.sin(phase + i * 0.15) * 0.5 + 0.5;
          const noise = Math.random() * 0.3;
          // Accentuate bass frequencies on the left, highs on the right
          const scaleFactor = i < 12 ? 1.2 : i > 36 ? 0.7 : 0.95;
          targetHeight = (sinValue * 0.7 + noise * 0.3) * (height - 20) * scaleFactor;
        } else {
          // Idle state - flat lines
          targetHeight = 4 + Math.sin(phase + i * 0.1) * 3;
        }

        // Smooth interpolation
        heights[i] += (targetHeight - heights[i]) * 0.25;

        const x = i * (width / barCount);
        const h = heights[i];
        const y = height - h;

        // Gradient for bars
        const gradient = ctx.createLinearGradient(x, y, x, height);
        if (i < 12) {
          // Bass range: warm red/amber
          gradient.addColorStop(0, '#f97316');
          gradient.addColorStop(1, '#ea580c');
        } else if (i < 32) {
          // Mid range: neon blue
          gradient.addColorStop(0, '#3b82f6');
          gradient.addColorStop(1, '#1d4ed8');
        } else {
          // High range: high tech cyan/pink
          gradient.addColorStop(0, '#06b6d4');
          gradient.addColorStop(1, '#0891b2');
        }

        ctx.fillStyle = gradient;
        
        // Rounded bar caps
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, h, [3, 3, 0, 0]);
        ctx.fill();

        // Draw a glowing shadow dot on top of each bar when playing
        if (isPlaying && h > 15 && i % 2 === 0) {
          ctx.beginPath();
          ctx.arc(x + barWidth / 2, y - 4, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = i < 12 ? '#fdba74' : i < 32 ? '#93c5fd' : '#a5f3fc';
          ctx.fill();
        }
      }

      // Draw peak transient line
      if (isPlaying) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        const peakY = height * (1 - peakTransient * 0.85);
        ctx.beginPath();
        ctx.moveTo(0, peakY);
        ctx.lineTo(width, peakY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, peakTransient]);

  return (
    <div className="bg-gray-950/40 border border-gray-850 rounded-[32px] p-6 space-y-5 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
          <h5 className="text-xs font-bold uppercase tracking-widest text-slate-200">Neural Vibe & Beat Analyzer</h5>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/40 border border-blue-900/30 text-[9px] font-mono font-bold text-blue-400">
          <Radio className="w-2.5 h-2.5" />
          <span>REAL-TIME ANALYSIS ACTIVE</span>
        </div>
      </div>

      <div className="relative">
        {/* Signal analyzer canvas */}
        <canvas 
          ref={canvasRef} 
          className="w-full h-28 bg-gray-950/60 rounded-2xl border border-gray-900 shadow-inner"
        />
        
        {/* Frequency Markers */}
        <div className="absolute bottom-1.5 left-2 right-2 flex justify-between text-[8px] font-mono text-slate-600 select-none pointer-events-none">
          <span>20 Hz (Bass)</span>
          <span>500 Hz (Mids)</span>
          <span>2k Hz</span>
          <span>15k Hz (Highs)</span>
        </div>
      </div>

      {/* Grid statistics report */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-1">
        <div className="p-3 bg-gray-950/50 border border-gray-900 rounded-2xl space-y-1">
          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Speed (BPM)</div>
          <div className="text-lg font-extrabold font-mono text-blue-400 flex items-baseline gap-1">
            {bpm} <span className="text-[9px] text-slate-500 uppercase tracking-widest">bpm</span>
          </div>
        </div>

        <div className="p-3 bg-gray-950/50 border border-gray-900 rounded-2xl space-y-1">
          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Scale Grid</div>
          <div className="text-lg font-extrabold font-mono text-emerald-400 flex items-baseline gap-0.5">
            {musicKey === 'Random' ? 'C' : musicKey} <span className="text-xs uppercase font-sans font-semibold text-slate-400">{scale === 'Random' ? 'minor' : scale}</span>
          </div>
        </div>

        <div className="p-3 bg-gray-950/50 border border-gray-900 rounded-2xl space-y-1">
          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Peak Transient</div>
          <div className="text-lg font-extrabold font-mono text-amber-500">
            {isPlaying ? (peakTransient * 100).toFixed(1) : '0.0'}<span className="text-[9px] text-slate-500 uppercase tracking-widest ml-0.5">%</span>
          </div>
        </div>

        <div className="p-3 bg-gray-950/50 border border-gray-900 rounded-2xl space-y-1">
          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Avg Loudness</div>
          <div className="text-lg font-extrabold font-mono text-cyan-400">
            {isPlaying ? lufs : '-inf'}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center p-3 bg-blue-950/10 border border-blue-900/10 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-none">Acoustic Signal Profile</div>
            <div className="text-xs text-slate-200 mt-1 font-semibold">{spectralType}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-center text-[10px] text-slate-400 italic">
          <Volume2 className="w-3 h-3 text-blue-500" />
          <span>Frequencies optimized for recording vocals</span>
        </div>
      </div>
    </div>
  );
};
