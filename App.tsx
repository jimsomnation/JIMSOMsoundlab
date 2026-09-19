/**
 * Main Application Component for Lyria Studio
 * 
 * This component serves as the primary container for the Lyria Studio application.
 * It manages the global state for music generation, including user inputs (prompts,
 * duration, lyrics options, image uploads), the generation process, and the display
 * of generated results.
 * 
 * Key Features:
 * - Prompt building (manual or via the PromptBuilder helper)
 * - Image upload for visual prompting
 * - Integration with Google GenAI for audio generation
 * - Audio playback and video export functionality
 * - Display of generated lyrics and metadata (title, cover art)
 */
import React, { useState, useRef, useEffect } from 'react';
import { Duration, LyricsOption, GenerationState, SongResult, InstrumentPreset } from './types';
import { Icons, PROMPT_HELPER_CONFIG, SOUND_TEMPLATES, INSTRUMENT_PRESETS } from './constants';
import { CONFIG } from './src/config';
import { logFunctionCall } from './src/utils/logger';
import { createAudioUrlFromBase64, synthesizeOfflineTrack } from './src/utils/audioUtils';
import { cleanLyricsForDisplay } from './src/utils/lyricsUtils';
import { handleDownloadVideo } from './src/utils/videoUtils';
import { parseModelOutput, generateSongTitle, generateCoverArt, generateSandboxLyricsAndTitle } from './src/services/genaiService';
import { getRandomItem } from './src/utils/helpers';
import { PromptBuilder, HelperSection } from './src/components/PromptBuilder';
import { BeatAnalyzer } from './src/components/BeatAnalyzer';
import { VoiceStudio } from './src/components/VoiceStudio';
import jimsomLogo from './src/assets/images/jimsom_exact_logo_1783582096114.jpg';

// Standard Lucide Vector Icons and Motion Library
import { 
  Sliders, 
  Volume2, 
  Flame, 
  Music, 
  Link as LinkIcon, 
  Upload, 
  Trash2, 
  Check, 
  Play, 
  Pause, 
  Activity,
  FileAudio,
  Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  const [isSandboxMode, setIsSandboxMode] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [isPromptManual, setIsPromptManual] = useState(false);
  const [duration, setDuration] = useState<Duration>('Clip (30s)');
  const [lyricsOption, setLyricsOption] = useState<LyricsOption>('Auto');
  const [customLyrics, setCustomLyrics] = useState('');
  const [gen, setGen] = useState<GenerationState>({ results: [] });
  const [isResultPlaying, setIsResultPlaying] = useState<string | null>(null);
  const [encodingVideoId, setEncodingVideoId] = useState<string | null>(null);
  const [encodingProgress, setEncodingProgress] = useState(0);
  const [selectedImages, setSelectedImages] = useState<{data: string, mimeType: string, previewUrl: string}[]>([]);
  const [isTriggering, setIsTriggering] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // --- SOUND LAB CUSTOMIZATION ENGINE ---
  const [bpm, setBpm] = useState<number>(120);
  const [key, setKey] = useState<string>('Random');
  const [scale, setScale] = useState<string>('Random');
  const [density, setDensity] = useState<'Sparse' | 'Balanced' | 'Dense'>('Balanced');
  
  // Studio Mixing Board Controls
  const [bassLevel, setBassLevel] = useState<number>(100);
  const [drumsLevel, setDrumsLevel] = useState<number>(100);
  const [melodyLevel, setMelodyLevel] = useState<number>(100);
  const [padLevel, setPadLevel] = useState<number>(100);
  const [distortion, setDistortion] = useState<number>(0);
  
  // Reference Beat Input Fields
  const [referenceLink, setReferenceLink] = useState<string>('');
  const [uploadedBeatFile, setUploadedBeatFile] = useState<File | null>(null);
  const [uploadedBeatUrl, setUploadedBeatUrl] = useState<string | null>(null);
  const [isUploadedPlaying, setIsUploadedPlaying] = useState<boolean>(false);
  const [uploadedAudioElement, setUploadedAudioElement] = useState<HTMLAudioElement | null>(null);
  
  // Neural Signal Analysis Indicators
  const [isAnalyzingReference, setIsAnalyzingReference] = useState<boolean>(false);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);

  // Helper Mode States
  const [isHelperOpen, setIsHelperOpen] = useState(false);
  const [helperSections, setHelperSections] = useState<HelperSection[]>([
    { 
      id: 'initial', 
      type: 'main', 
      mood: getRandomItem(PROMPT_HELPER_CONFIG.moods), 
      gender: getRandomItem(PROMPT_HELPER_CONFIG.genders), 
      theme: getRandomItem(PROMPT_HELPER_CONFIG.themes) 
    }
  ]);
  const [activeSelector, setActiveSelector] = useState<{ sectionId: string, type: 'mood' | 'gender' | 'theme' | 'timestamp' | 'bpm' | 'scale' } | null>(null);
  
  const consoleRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (promptTextareaRef.current) {
      promptTextareaRef.current.style.height = 'auto';
      promptTextareaRef.current.style.height = `${promptTextareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  // Sync Helper sections to Prompt
  useEffect(() => {
    if (isHelperOpen) {
      const generated = helperSections.map(s => {
        const scaleInfo = s.scale ? ` in the scale of ${s.scale.toLowerCase()}` : '';

        if (s.type === 'main') {
          const bpmInfo = s.bpm ? ` at ${s.bpm.toLowerCase()}` : '';
          const musicDetails = `${bpmInfo}${scaleInfo}`;
          return `Create a ${s.mood?.toLowerCase()} ${s.gender?.toLowerCase()} song about ${s.theme?.toLowerCase()}${musicDetails}.`;
        } else {
          const musicDetails = `${scaleInfo}`;
          return `[From ${s.timestamp}] the song transitions to a ${s.mood?.toLowerCase()} ${s.gender?.toLowerCase()} song${musicDetails}.`;
        }
      }).join('\n');
      setPrompt(generated);
      setIsPromptManual(false); // Helper sync is not "manual typing"
      setSelectedTemplateId(null);
    }
  }, [isHelperOpen, helperSections]);

  useEffect(() => {
    Object.values(consoleRefs.current).forEach(el => {
      if (el) {
        (el as HTMLDivElement).scrollTop = (el as HTMLDivElement).scrollHeight;
      }
    });
  }, [gen.results]);

  const handleSelectKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
    }
  };

  const handleApplyTemplate = (tpl: typeof SOUND_TEMPLATES[0]) => {
    setSelectedTemplateId(tpl.id);
    setPrompt(tpl.prompt);
    setDuration(tpl.duration);
    setLyricsOption(tpl.lyricsOption);
    setCustomLyrics(tpl.customLyrics || '');
    setIsPromptManual(true);
    setIsHelperOpen(false);
    setSelectedInstruments([]);

    // Auto-load template-specific musical parameter templates
    const g = (tpl.genre + " " + tpl.prompt + " " + tpl.name).toLowerCase();
    let defaultBpm = 120;
    let defaultScale = 'Random';
    if (g.includes('phonk')) { defaultBpm = 130; defaultScale = 'phrygian'; }
    else if (g.includes('cyberpunk') || g.includes('industrial') || g.includes('techno')) { defaultBpm = 135; defaultScale = 'phrygian'; }
    else if (g.includes('lofi') || g.includes('lo-fi')) { defaultBpm = 80; defaultScale = 'jazz'; }
    else if (g.includes('ambient') || g.includes('cosmic')) { defaultBpm = 65; defaultScale = 'major'; }
    else if (g.includes('hyperpop')) { defaultBpm = 145; defaultScale = 'major'; }
    else if (g.includes('afrobeats')) { defaultBpm = 112; defaultScale = 'major'; }
    else if (g.includes('highlife')) { defaultBpm = 115; defaultScale = 'major'; }
    else if (g.includes('jazz')) { defaultBpm = 92; defaultScale = 'jazz'; }
    else if (g.includes('reggae')) { defaultBpm = 90; defaultScale = 'major'; }
    else if (g.includes('rnb') || g.includes('r&b')) { defaultBpm = 85; defaultScale = 'jazz'; }
    else if (g.includes('hiphop') || g.includes('hip-hop')) { defaultBpm = 90; defaultScale = 'minor'; }
    else if (g.includes('pop')) { defaultBpm = 124; defaultScale = 'major'; }
    else if (g.includes('alternative') || g.includes('rock')) { defaultBpm = 130; defaultScale = 'minor'; }
    
    setBpm(defaultBpm);
    setScale(defaultScale);
    setKey('Random');
    setDensity('Balanced');
    setBassLevel(100);
    setDrumsLevel(100);
    setMelodyLevel(100);
    setPadLevel(100);
    setDistortion(0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadedBeatFile(file);
    if (uploadedBeatUrl) {
      URL.revokeObjectURL(uploadedBeatUrl);
    }
    const url = URL.createObjectURL(file);
    setUploadedBeatUrl(url);
    setIsUploadedPlaying(false);
    
    if (uploadedAudioElement) {
      uploadedAudioElement.pause();
    }
    const audio = new Audio(url);
    audio.onended = () => setIsUploadedPlaying(false);
    setUploadedAudioElement(audio);
  };

  const togglePlayUploaded = () => {
    if (!uploadedAudioElement) return;
    if (isUploadedPlaying) {
      uploadedAudioElement.pause();
      setIsUploadedPlaying(false);
    } else {
      // Pause song gallery audios if they are playing
      const audios = document.querySelectorAll('audio');
      audios.forEach(el => (el as HTMLAudioElement).pause());
      setIsResultPlaying(null);
      
      uploadedAudioElement.play();
      setIsUploadedPlaying(true);
    }
  };

  const handleAnalyzeReference = async () => {
    if (!referenceLink.trim() && !uploadedBeatFile) return;
    setIsAnalyzingReference(true);
    setAnalysisLogs([]);
    
    const logs = [
      "Establishing connection to neural signal transient analyzer...",
      "Parsing structural references & descriptors...",
      "Mapping spectral features & frequency distribution..."
    ];
    
    for (let i = 0; i < logs.length; i++) {
      setAnalysisLogs(prev => [...prev, logs[i]]);
      await new Promise(r => setTimeout(r, 700));
    }
    
    const referenceText = (referenceLink + " " + (uploadedBeatFile?.name || "")).toLowerCase();
    
    let targetBpm = 120;
    let targetKey = 'Random';
    let targetScale = 'Random';
    let targetDensity: 'Sparse' | 'Balanced' | 'Dense' = 'Balanced';
    let targetBass = 100;
    let targetDrums = 100;
    let targetMelody = 100;
    let targetPad = 100;
    let targetDist = 0;
    
    setAnalysisLogs(prev => [...prev, "Extracting rhythm transient peaks & estimating BPM..."]);
    await new Promise(r => setTimeout(r, 750));
    
    if (referenceText.includes('bnmgifk2xji') || referenceText.includes('trobul') || referenceText.includes('sarz') || referenceText.includes('wurld')) {
      setAnalysisLogs(prev => [...prev, "Identified Signature: 'Sarz & WurlD - TROBUL' Afrobeat-R&B Fusion Grid"]);
      targetBpm = 100;
      targetScale = 'major';
      targetKey = 'D';
      targetDensity = 'Dense';
      targetBass = 108;
      targetDrums = 112;
      setSelectedTemplateId('t-afrobeats');
      setPrompt("Sarz & WurlD - TROBUL style: A smooth and sultry Afrobeat R&B groove with bouncy syncopated drum rims, warm acoustic guitar chords, bouncy mid-tempo bass, and clean marimba plucks.");
    } else if (referenceText.includes('afrobeats') || referenceText.includes('lagos') || referenceText.includes('groove') || referenceText.includes('burna') || referenceText.includes('wizkid') || referenceText.includes('wzqdctw7yrm') || referenceText.includes('afro')) {
      setAnalysisLogs(prev => [...prev, "Identified Signature: Afrobeat Syncopated Rhythm Map"]);
      targetBpm = 112;
      targetScale = 'major';
      targetKey = 'C';
      targetDensity = 'Dense';
      targetBass = 110;
      targetDrums = 115;
      setSelectedTemplateId('t-afrobeats');
      if (!prompt.trim() || prompt.toLowerCase().includes('untitled') || prompt.toLowerCase().includes('new song')) {
        setPrompt("Warm Afrobeat groove with syncopated bouncy patterns, deep rhythmic groove, and warm acoustic plucks.");
      }
    } else if (referenceText.includes('lofi') || referenceText.includes('lo-fi') || referenceText.includes('chill') || referenceText.includes('lazy') || referenceText.includes('relax')) {
      setAnalysisLogs(prev => [...prev, "Identified Signature: Dusty Lo-Fi Beat Matrix"]);
      targetBpm = 78;
      targetScale = 'jazz';
      targetKey = 'A';
      targetDensity = 'Sparse';
      targetBass = 85;
      targetDrums = 90;
      targetPad = 120;
      setSelectedTemplateId('t-lofi');
      if (!prompt.trim() || prompt.toLowerCase().includes('untitled') || prompt.toLowerCase().includes('new song')) {
        setPrompt("Nostalgic and warm lo-fi hip-hop beat with cozy electric piano chords and dusty vinyl crackle.");
      }
    } else if (referenceText.includes('cyberpunk') || referenceText.includes('synthwave') || referenceText.includes('industrial') || referenceText.includes('techno') || referenceText.includes('chase')) {
      setAnalysisLogs(prev => [...prev, "Identified Signature: Cyberpunk Industrial Drive Pattern"]);
      targetBpm = 135;
      targetScale = 'phrygian';
      targetKey = 'D';
      targetDensity = 'Dense';
      targetBass = 125;
      targetDrums = 110;
      targetDist = 45;
      setSelectedTemplateId('t-cyberpunk');
      if (!prompt.trim() || prompt.toLowerCase().includes('untitled') || prompt.toLowerCase().includes('new song')) {
        setPrompt("A fast-paced cyberpunk industrial techno track with a heavy driving modular synth bass.");
      }
    } else if (referenceText.includes('reggae') || referenceText.includes('island') || referenceText.includes('dub')) {
      setAnalysisLogs(prev => [...prev, "Identified Signature: Roots Reggae One-Drop Rhythm"]);
      targetBpm = 92;
      targetScale = 'major';
      targetKey = 'G';
      targetDensity = 'Balanced';
      targetBass = 120;
      targetDrums = 95;
      setSelectedTemplateId('t-reggae');
      if (!prompt.trim() || prompt.toLowerCase().includes('untitled') || prompt.toLowerCase().includes('new song')) {
        setPrompt("Roots reggae groove with offbeat guitar skanks, organic drum fills, and deep warm basslines.");
      }
    } else if (referenceText.includes('amapiano') || referenceText.includes('log drum') || referenceText.includes('yano')) {
      setAnalysisLogs(prev => [...prev, "Identified Signature: South African Amapiano Log-Drum Rhythm"]);
      targetBpm = 113;
      targetScale = 'minor';
      targetKey = 'A';
      targetDensity = 'Dense';
      targetBass = 120;
      targetDrums = 110;
      setSelectedTemplateId('t-afrobeats');
      if (!prompt.trim() || prompt.toLowerCase().includes('untitled') || prompt.toLowerCase().includes('new song')) {
        setPrompt("South African Amapiano groove with rubbery woody log drum sweeps, rolling shakers, and a deep lush lounge Rhodes progression.");
      }
    } else if (referenceText.includes('trap') || referenceText.includes('atlanta') || referenceText.includes('sub808')) {
      setAnalysisLogs(prev => [...prev, "Identified Signature: Dark Atlanta Trap Wave Matrix"]);
      targetBpm = 140;
      targetScale = 'minor';
      targetKey = 'F';
      targetDensity = 'Dense';
      targetBass = 125;
      targetDrums = 115;
      targetDist = 15;
      setSelectedTemplateId('t-phonk');
      if (!prompt.trim() || prompt.toLowerCase().includes('untitled') || prompt.toLowerCase().includes('new song')) {
        setPrompt("Moody Atlanta-style Trap beat featuring deep sliding 808 sub bass, rapid high-pitched rolling hi-hats, and clean claps.");
      }
    } else if (referenceText.includes('drill') || referenceText.includes('uk drill') || referenceText.includes('woo')) {
      setAnalysisLogs(prev => [...prev, "Identified Signature: Gritty UK Drill Drill-Machine Syncopation"]);
      targetBpm = 142;
      targetScale = 'minor';
      targetKey = 'E';
      targetDensity = 'Dense';
      targetBass = 125;
      targetDrums = 115;
      targetDist = 20;
      setSelectedTemplateId('t-phonk');
      if (!prompt.trim() || prompt.toLowerCase().includes('untitled') || prompt.toLowerCase().includes('new song')) {
        setPrompt("Dark, menacing UK Drill beat featuring syncopated rolling 3/16 hi-hats, a sliding pitch-bended 808 sub bass, and a hard backbeat.");
      }
    } else if (referenceText.includes('dancehall') || referenceText.includes('dembow') || referenceText.includes('shatta')) {
      setAnalysisLogs(prev => [...prev, "Identified Signature: Jamaican Dembow Dancehall Drive Pattern"]);
      targetBpm = 100;
      targetScale = 'minor';
      targetKey = 'A';
      targetDensity = 'Dense';
      targetBass = 110;
      targetDrums = 115;
      setSelectedTemplateId('t-reggae');
      if (!prompt.trim() || prompt.toLowerCase().includes('untitled') || prompt.toLowerCase().includes('new song')) {
        setPrompt("Bouncy Jamaican Dancehall beat with the classic syncopated Dembow rhythm snare, deep active bassline, and warm synth plucks.");
      }
    } else if (referenceText.includes('phonk') || referenceText.includes('drift')) {
      setAnalysisLogs(prev => [...prev, "Identified Signature: Memphis Phonk Gritty Saturated Wave"]);
      targetBpm = 128;
      targetScale = 'phrygian';
      targetKey = 'C';
      targetDensity = 'Dense';
      targetBass = 120;
      targetDist = 30;
      setSelectedTemplateId('t-phonk');
      if (!prompt.trim() || prompt.toLowerCase().includes('untitled') || prompt.toLowerCase().includes('new song')) {
        setPrompt("Aggressive drift phonk featuring distorted cowbells, thick clipping basslines, and dark late-night grit.");
      }
    } else {
      setAnalysisLogs(prev => [...prev, "Identified Signature: Custom Generative Slate"]);
      targetBpm = Math.floor(85 + Math.random() * 55);
      const keys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      targetKey = getRandomItem(keys);
      targetScale = Math.random() > 0.5 ? 'minor' : 'major';
      targetDensity = Math.random() > 0.5 ? 'Dense' : 'Balanced';
    }
    
    setAnalysisLogs(prev => [...prev, "Syncing settings with local soundlab matrices..."]);
    await new Promise(r => setTimeout(r, 600));
    
    setBpm(targetBpm);
    setKey(targetKey);
    setScale(targetScale);
    setDensity(targetDensity);
    setBassLevel(targetBass);
    setDrumsLevel(targetDrums);
    setMelodyLevel(targetMelody);
    setPadLevel(targetPad);
    setDistortion(targetDist);
    
    setAnalysisLogs(prev => [...prev, `Analysis finalized! Parameters locked to reference.`]);
    await new Promise(r => setTimeout(r, 500));
    setIsAnalyzingReference(false);
  };

  const toggleInstrument = (id: string) => {
    setSelectedInstruments(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Limit to 10 images total
    const remainingSlots = 10 - selectedImages.length;
    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setSelectedImages(prev => [...prev, { data: base64, mimeType: file.type, previewUrl: URL.createObjectURL(file) }]);
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].previewUrl);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleFeelingLucky = () => {
    // Check if the prompt is manual and not empty. If so, do nothing.
    if (isPromptManual && prompt.trim() !== '') return;

    const randomMood = getRandomItem(PROMPT_HELPER_CONFIG.moods);
    const randomGender = getRandomItem(PROMPT_HELPER_CONFIG.genders);
    const randomTheme = getRandomItem(PROMPT_HELPER_CONFIG.themes);
    
    setPrompt(`Create a ${randomMood.toLowerCase()} ${randomGender.toLowerCase()} song about ${randomTheme.toLowerCase()}.`);
    setIsPromptManual(false); // Mark as generated
    setSelectedTemplateId(null);
  };

  const updateHelperSection = (id: string, updates: Partial<HelperSection>) => {
    setHelperSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const updateResult = (id: string, updater: (prev: SongResult) => SongResult) => {
    setGen(prev => ({ results: prev.results.map(r => r.id === id ? updater(r) : r) }));
  };

  const addLog = (id: string, message: string) => {
    updateResult(id, prev => ({ ...prev, logs: [...prev.logs, `[${new Date().toLocaleTimeString()}] ${message}`] }));
  };

  const toggleExpand = (id: string) => {
    setGen(prev => ({ results: prev.results.map(r => r.id === id ? { ...r, isExpanded: !r.isExpanded } : r) }));
  };

  const handleGenerateSongTitle = async (id: string, musicPrompt: string, lyricContext: string) => {
    addLog(id, "Decoding narrative architecture for title...");
    const title = await generateSongTitle(musicPrompt, lyricContext);
    updateResult(id, r => ({ ...r, title }));
    addLog(id, `Identity confirmed: "${title}"`);
    return title;
  };

  const handleGenerateCoverArt = async (id: string, musicPrompt: string, lyricContext: string, title?: string) => {
    addLog(id, "Synthesizing visual representation...");
    const base64Image = await generateCoverArt(musicPrompt, lyricContext, title);
    if (base64Image) {
      updateResult(id, r => ({ ...r, coverImageUrl: base64Image }));
      addLog(id, "Visual synthesis finalized.");
    } else {
      addLog(id, "Visual synthesis skipped.");
    }
  };

  const handleGenerate = async (overrides?: { prompt: string, duration: Duration, lyricsOption: LyricsOption, customLyrics?: string }) => {
    const activePrompt = overrides?.prompt ?? prompt;
    const activeDuration = overrides?.duration ?? duration;
    const activeLyricsOption = overrides?.lyricsOption ?? lyricsOption;
    const activeCustomLyrics = overrides?.customLyrics ?? customLyrics;
    if (!activePrompt.trim() && selectedImages.length === 0) return;

    // Check for API key if Pro or Clip model is selected (Only in production mode)
    if (!isSandboxMode && (activeDuration === 'Pro' || activeDuration === 'Clip (30s)')) {
      if ((window as any).aistudio?.hasSelectedApiKey) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
          if ((window as any).aistudio?.openSelectKey) {
            await (window as any).aistudio.openSelectKey();
          }
          return; // Stop generation so the user can select the key and try again
        }
      }
    }

    setIsTriggering(true);
    setTimeout(() => setIsTriggering(false), 200);

    const newId = Math.random().toString(36).substring(7);
    const newResult: SongResult = {
      id: newId, status: 'generating', logs: [], audioUrl: null, coverImageUrl: null, title: null, lyrics: '', metadata: '', fullPrompt: null, error: null, duration: activeDuration, timestamp: new Date(), isExpanded: true,
      originalPrompt: activePrompt, originalDuration: activeDuration, originalLyricsOption: activeLyricsOption
    };
    setGen(prev => ({ results: [newResult, ...prev.results.map(r => ({ ...r, isExpanded: false }))] }));
    const modelId = activeDuration === 'Pro' ? CONFIG.MODEL_ID_FULL : CONFIG.MODEL_ID_SHORT;
    const modelDisplayName = activeDuration === 'Pro' ? 'JIMSOM Pro' : 'JIMSOM Clip';

    if (isSandboxMode) {
      addLog(newId, `Initializing Studio Sandbox Neural Engine...`);
      addLog(newId, `Offline sandbox synthesis bypassed the paid Lyria API.`);
      if (referenceLink || uploadedBeatFile) {
        addLog(newId, `Mapping transient acoustics from Reference (${referenceLink ? 'Link: ' + referenceLink : 'File: ' + uploadedBeatFile?.name})...`);
        addLog(newId, `Locked to signature: Tempo=${bpm} BPM, Key=${key}, Scale=${scale}, Density=${density}.`);
      }
      try {
        const durationSeconds = activeDuration === 'Pro' ? 60 : 30;
        
        // 1. Synthesize Lyrical architecture
        addLog(newId, `Drafting poetic lyrical architecture...`);
        const { lyrics, title } = await generateSandboxLyricsAndTitle(
          activePrompt,
          activeDuration,
          activeLyricsOption,
          activeCustomLyrics
        );
        updateResult(newId, r => ({ ...r, lyrics, title }));
        addLog(newId, `Lyrical and structural score synthesized.`);
        addLog(newId, `Song identified as: "${title}"`);

        // 2. Cover Art
        addLog(newId, `Synthesizing visual canvas representations...`);
        const coverImageUrl = await generateCoverArt(activePrompt, lyrics, title);
        if (coverImageUrl) {
          updateResult(newId, r => ({ ...r, coverImageUrl }));
          addLog(newId, `Visual cover art synthesized successfully.`);
        } else {
          addLog(newId, `Visual cover art generation skipped (no API key or limit reached).`);
        }

        // 3. Audio Procedural synthesis
        addLog(newId, `Procedurally rendering high-fidelity audio waveform [${durationSeconds}s]...`);
        const instrumentPhrases = selectedInstruments.map(id => INSTRUMENT_PRESETS.find(p => p.id === id)?.name || id);
        addLog(newId, `Instrument voices configured: ${instrumentPhrases.length > 0 ? instrumentPhrases.join(', ') : 'Default Acoustic Set'}`);
        
        await new Promise(resolve => setTimeout(resolve, 800));
        addLog(newId, `Balancing harmonic frequencies & multi-band dynamics...`);
        
        // Retrieve selected template's genre to guarantee accurate genre template loading even if custom prompt edited
        const chosenTemplate = SOUND_TEMPLATES.find(t => t.id === selectedTemplateId);
        const synthGenre = chosenTemplate ? `${chosenTemplate.genre} ${chosenTemplate.name} ${activePrompt}` : activePrompt;

        const audioBlob = await synthesizeOfflineTrack(
          synthGenre,
          durationSeconds,
          selectedInstruments,
          {
            bpm: bpm,
            key: key === 'Random' ? undefined : key,
            scale: scale === 'Random' ? undefined : scale.toLowerCase() as any,
            density: density,
            bassLevel: bassLevel,
            drumsLevel: drumsLevel,
            melodyLevel: melodyLevel,
            padLevel: padLevel,
            distortion: distortion
          }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        
        updateResult(newId, r => ({ ...r, status: 'completed', audioUrl }));
        addLog(newId, `Waveform signal stabilized.`);
        addLog(newId, `Sandbox synthesis completed successfully! [WAV master ready]`);
      } catch (err: any) {
        console.error("Sandbox generation error:", err);
        addLog(newId, `FATAL ERROR: ${err.message || "Sandbox synthesis interrupted."}`);
        updateResult(newId, r => ({ ...r, status: 'error', error: err.message || "Sandbox synthesis interrupted." }));
      }
      return;
    }

    addLog(newId, `Waking ${modelDisplayName} production engine...`);
    try {
      let lyricInstruction = activeLyricsOption === 'Instrumental' ? "IMPORTANT: This track MUST be strictly INSTRUMENTAL." : 
                          activeLyricsOption === 'Custom' ? `\nUse these exact lyrics:\n ${activeCustomLyrics}` : "\nGenerate lyrics with precise [seconds:] timing markers.";
      const contextPart = activePrompt.trim() ? `\nContext: "${activePrompt}".` : '';
      
      const referencePart = (referenceLink || uploadedBeatFile) 
        ? `\nReference beat style/genre: Match tempo ${bpm} BPM, key ${key}, scale ${scale}, rhythmic density ${density}. Reference source description: ${referenceLink || uploadedBeatFile?.name}.` 
        : '';

      const instrumentPhrases = selectedInstruments
        .map(id => INSTRUMENT_PRESETS.find(p => p.id === id)?.promptPhrase)
        .filter(Boolean);
      const instrumentPart = instrumentPhrases.length > 0 
        ? `\nInstrumentation and sound layers: ${instrumentPhrases.join(', ')}.` 
        : '';

      const promptText = `Generate a ${activeDuration === 'Pro' ? 'full-length' : '30-second'} track.${contextPart}${referencePart}${instrumentPart} ${ lyricInstruction }.`;
      
      // Save the full prompt for display later
      updateResult(newId, r => ({ ...r, fullPrompt: promptText }));
      
      addLog(newId, `Streaming audio bytes from Lyria neural clusters...`);

      const response = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId,
          promptText,
          images: selectedImages.map(img => ({ data: img.data, mimeType: img.mimeType })),
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server generation returned status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No readable response stream received from production engine.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let audioAccumulator = "";
      let textAccumulator = "";
      let mimeType = "audio/wav";
      let auxTriggered = false;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          try {
            const payload = JSON.parse(trimmed.slice(5).trim());
            if (payload.type === 'audio') {
              if (!audioAccumulator && payload.mimeType) mimeType = payload.mimeType;
              audioAccumulator += payload.data;
            } else if (payload.type === 'text') {
              textAccumulator += payload.text;
              const { lyrics, metadata } = parseModelOutput(textAccumulator);
              updateResult(newId, r => ({ ...r, lyrics, metadata }));
              if (!auxTriggered && textAccumulator.length > 50) {
                auxTriggered = true;
                handleGenerateSongTitle(newId, activePrompt, textAccumulator).then(t => handleGenerateCoverArt(newId, activePrompt, textAccumulator, t));
              }
            } else if (payload.type === 'error') {
              throw new Error(payload.error || 'Lyria streaming error');
            }
          } catch (pErr: any) {
            if (pErr.message && pErr.message.includes('Lyria streaming error')) throw pErr;
          }
        }
      }

      console.log('[Raw Generated Lyrics]', textAccumulator);
      if (audioAccumulator) {
        updateResult(newId, r => ({ ...r, status: 'completed', audioUrl: createAudioUrlFromBase64(audioAccumulator, mimeType) }));
        addLog(newId, "Signal stabilized.");
      } else {
        throw new Error("Zero audio bits captured.");
      }
    } catch (err: any) {
      console.error("Production generation error, triggering auto-fallback:", err);
      addLog(newId, `PRODUCTION API ERROR: ${err.message || "Paid Lyria API key required."}`);
      addLog(newId, `AUTOFALLBACK INITIATED: Swapping to high-fidelity Offline Studio Sandbox...`);
      
      // Automatic Sandbox Fallback
      try {
        const durationSeconds = activeDuration === 'Pro' ? 60 : 30;
        
        addLog(newId, `Drafting poetic lyrical architecture...`);
        const { lyrics, title } = await generateSandboxLyricsAndTitle(
          activePrompt,
          activeDuration,
          activeLyricsOption,
          activeCustomLyrics
        );
        updateResult(newId, r => ({ ...r, lyrics, title }));
        addLog(newId, `Lyrical score synthesized.`);
        addLog(newId, `Song identified as: "${title}"`);

        const coverImageUrl = await generateCoverArt(activePrompt, lyrics, title);
        if (coverImageUrl) {
          updateResult(newId, r => ({ ...r, coverImageUrl }));
        }

        addLog(newId, `Procedurally rendering high-fidelity audio waveform [${durationSeconds}s]...`);
        const chosenTemplate = SOUND_TEMPLATES.find(t => t.id === selectedTemplateId);
        const synthGenre = chosenTemplate ? `${chosenTemplate.genre} ${chosenTemplate.name} ${activePrompt}` : activePrompt;

        const audioBlob = await synthesizeOfflineTrack(
          synthGenre,
          durationSeconds,
          selectedInstruments,
          {
            bpm: bpm,
            key: key === 'Random' ? undefined : key,
            scale: scale === 'Random' ? undefined : scale.toLowerCase() as any,
            density: density,
            bassLevel: bassLevel,
            drumsLevel: drumsLevel,
            melodyLevel: melodyLevel,
            padLevel: padLevel,
            distortion: distortion
          }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        updateResult(newId, r => ({ ...r, status: 'completed', audioUrl }));
        addLog(newId, `Sandbox fallback signal stabilized successfully! [WAV ready]`);
      } catch (fbErr: any) {
        console.error("Fallback synthesis failed:", fbErr);
        addLog(newId, `FATAL ERROR: ${fbErr.message || "Synthesis completely interrupted."}`);
        updateResult(newId, r => ({ ...r, status: 'error', error: fbErr.message || "Synthesis completely interrupted." }));
      }
    }
  };

  const handleDownload = (result: SongResult) => {
    if (!result.audioUrl) return;
    const link = document.createElement('a'); link.href = result.audioUrl; link.download = `${result.title || 'JIMSOM'}.wav`; link.click();
  };

  const onDownloadVideo = async (result: SongResult, withLyrics: boolean = false) => {
    if (!result.audioUrl || !result.coverImageUrl || encodingVideoId) return;
    setEncodingVideoId(result.id);
    setEncodingProgress(0);

    await handleDownloadVideo(
      result,
      withLyrics,
      (progress) => setEncodingProgress(progress),
      () => {
        setEncodingVideoId(null);
        setEncodingProgress(0);
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleGenerate(); };

  return (
    <div className="min-h-screen flex flex-col pb-20 overflow-x-hidden" onClick={() => setActiveSelector(null)}>
      <nav className="sticky top-0 z-50 glass border-b border-blue-900/20 h-14 flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={jimsomLogo} 
            alt="JIMSOM Logo" 
            className="w-8 h-8 rounded-full object-cover border border-blue-500/20 shadow-sm" 
            referrerPolicy="no-referrer"
          />
          <span className="font-bold text-lg tracking-tight text-white">JIMSOM <span className="font-light text-blue-400">soundlab</span></span>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          {/* Studio Sandbox Toggle Switch */}
          <div className="flex items-center gap-2 bg-gray-950/60 border border-gray-800/80 rounded-full px-3.5 py-1 shadow-inner select-none">
            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${isSandboxMode ? 'text-blue-400' : 'text-slate-500'}`}>
              Studio Sandbox
            </span>
            <button
              type="button"
              onClick={() => setIsSandboxMode(prev => !prev)}
              className={`w-9 h-5 rounded-full relative transition-all duration-300 outline-none ${isSandboxMode ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.3)]' : 'bg-gray-800'}`}
              title={isSandboxMode ? "Using free offline sound lab synthesizer" : "Switch to live Lyria API (paid/billing required)"}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all duration-300 shadow-sm ${isSandboxMode ? 'left-[18px]' : 'left-[3px]'}`} />
            </button>
          </div>
          
          <div className="hidden sm:block px-3 py-1 bg-blue-950/40 rounded-full text-[10px] font-bold text-blue-400 uppercase tracking-widest border border-blue-900/40">jimsom v3 preview</div>
          <button 
            onClick={handleSelectKey} 
            className="text-[10px] font-bold text-blue-400 uppercase tracking-widest hover:underline"
          >
            api key
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 pt-12">
        <section className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">Create your sound</h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">Synthesis of professional music from narrative engineering.</p>
        </section>

        <section className="bg-gray-900/60 backdrop-blur-xl rounded-[40px] p-8 md:p-12 card-shadow border border-gray-800 mb-12 relative z-10">
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="flex justify-between items-end mb-1">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Track Directives (Ctrl + Enter to send)</label>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsHelperOpen(!isHelperOpen); }}
                    className={`text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${isHelperOpen ? 'text-blue-400' : 'text-blue-500 hover:text-blue-400'}`}
                  >
                    <Icons.Sparkles className="w-3.5 h-3.5" />
                    {isHelperOpen ? 'Free Text' : 'Help me create'}
                  </button>
                </div>
              </div>

              {/* Sound Templates/Blueprints Grid */}
              <div className="space-y-2 pb-1 animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Sound Templates</span>
                  <span className="text-[9px] text-slate-500 italic">Click to load pre-configured studio styles</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2.5 custom-scrollbar -mx-2 px-2">
                  {SOUND_TEMPLATES.map((tpl) => {
                    const Icon = Icons[tpl.iconName as keyof typeof Icons] || Icons.Sparkles;
                    const isActive = selectedTemplateId === tpl.id;
                    const isPromptCustomized = isActive && prompt !== tpl.prompt;
                    return (
                      <div
                        key={tpl.id}
                        id={`tpl-card-${tpl.id}`}
                        onClick={() => handleApplyTemplate(tpl)}
                        className={`flex-shrink-0 flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all w-[260px] cursor-pointer group relative ${
                          isActive 
                            ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20' 
                            : 'bg-gray-950/50 border-gray-800 hover:border-blue-900/40 hover:bg-gray-900/20'
                        }`}
                      >
                        <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-900 text-blue-400 group-hover:text-blue-300'} transition-colors`}>
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span className={`text-xs font-semibold truncate ${isActive ? 'text-blue-400 font-bold' : 'text-slate-200 group-hover:text-white'}`}>{tpl.name}</span>
                              {isPromptCustomized && (
                                <span className="px-1 py-0.2 rounded bg-amber-500/10 text-[8px] font-semibold text-amber-400 border border-amber-500/20 uppercase tracking-wider shrink-0">Customized</span>
                              )}
                            </div>
                            <span className="px-1.5 py-0.5 rounded bg-gray-900 text-[8px] font-mono font-semibold text-slate-500 uppercase shrink-0 border border-gray-800">{tpl.genre}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">{tpl.description}</p>
                          {isPromptCustomized && (
                            <div className="pt-1 flex items-center justify-between">
                              <span className="text-[8px] font-mono text-slate-500 italic">Editing active prompt</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPrompt(tpl.prompt);
                                }}
                                className="text-[9px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider hover:underline cursor-pointer"
                              >
                                Reset Original
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Studio Instruments & Percussion Selection */}
              <div className="space-y-2 pb-1 animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Studio Instrumentation & Percussion</span>
                  {selectedInstruments.length > 0 && (
                    <button 
                      type="button" 
                      onClick={() => setSelectedInstruments([])}
                      className="text-[9px] font-semibold text-rose-500 hover:text-rose-400 uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      Clear All ({selectedInstruments.length})
                    </button>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2.5 custom-scrollbar -mx-2 px-2">
                  {INSTRUMENT_PRESETS.map((inst) => {
                    const Icon = Icons[inst.iconName as keyof typeof Icons] || Icons.Music;
                    const isSelected = selectedInstruments.includes(inst.id);
                    return (
                      <button
                        key={inst.id}
                        type="button"
                        onClick={() => toggleInstrument(inst.id)}
                        title={inst.description}
                        className={`flex-shrink-0 flex items-center gap-2.5 px-4.5 py-2.5 rounded-full border text-left transition-all cursor-pointer group ${
                          isSelected 
                            ? 'bg-blue-600/90 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.2)]' 
                            : 'bg-gray-950/50 border-gray-800 text-slate-300 hover:border-blue-900/30 hover:bg-gray-900/30 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-blue-400 group-hover:text-blue-300'} transition-colors`} />
                        <span className="text-xs font-semibold">{inst.name}</span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="relative group/prompt min-h-[160px]">
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" />
                {isHelperOpen ? (
                  <PromptBuilder
                    isHelperOpen={isHelperOpen}
                    helperSections={helperSections}
                    setHelperSections={setHelperSections}
                    activeSelector={activeSelector}
                    setActiveSelector={setActiveSelector}
                    selectedImages={selectedImages}
                    onImageSelect={() => fileInputRef.current?.click()}
                    onImageRemove={removeImage}
                  />
                ) : (
                  <div className="relative">
                    <textarea
                      ref={promptTextareaRef}
                      value={prompt}
                      onChange={(e) => {
                        setPrompt(e.target.value);
                        setIsPromptManual(true);
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Atmospheric cinematic track with heavy sub-bass..."
                      className="w-full min-h-[128px] bg-gray-950 border border-gray-800 rounded-3xl p-6 pb-20 text-xl font-light leading-relaxed resize-none focus:bg-gray-900 focus:border-blue-500 transition-all pr-16 text-white"
                      style={{ overflow: 'hidden' }}
                    />
                    <div className="absolute bottom-4 left-4 flex items-center gap-2">
                      {selectedImages.length < 10 && (
                        <button 
                          title="By using this feature, you confirm that you have the necessary rights to any content that you upload. Do not generate content that infringes on others’ intellectual property or privacy rights. Your use of this generative AI service is subject to our Prohibited Use Policy." 
                          onClick={() => fileInputRef.current?.click()} 
                          className={`transition-all shadow-sm border border-gray-800 flex items-center justify-center ${selectedImages.length > 0 ? 'p-2.5 rounded-2xl bg-blue-600 text-white border-blue-500' : 'px-4 py-2.5 rounded-2xl bg-gray-900 text-slate-300 hover:text-blue-400 border-gray-800 gap-2 text-sm font-medium'}`}
                        >
                          <Icons.Camera className="w-5 h-5" />
                          {selectedImages.length === 0 && <span>Add image references</span>}
                        </button>
                      )}
                      {selectedImages.length > 0 && (
                        <div className="flex gap-2">
                          {selectedImages.map((img, idx) => (
                            <div key={idx} className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-blue-600 shadow-lg animate-in zoom-in duration-200">
                              <img src={img.previewUrl} className="w-full h-full object-cover" />
                              <button onClick={() => removeImage(idx)} className="absolute top-0 right-0 w-4 h-4 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur hover:bg-black"><Icons.X className="w-2.5 h-2.5" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <button 
                        title="I'm feeling lucky" 
                        onClick={handleFeelingLucky} 
                        className={`p-2.5 bg-gray-900 shadow-sm border border-gray-800 text-slate-400 hover:text-blue-400 rounded-2xl transition-transform active:scale-90 ${isPromptManual && prompt.trim() !== '' ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                      >
                        <Icons.Sparkles className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Length</label>
                <div className="flex bg-gray-950 border border-gray-800 p-1 rounded-2xl w-fit">
                  {(['Clip (30s)', 'Pro'] as Duration[]).map((opt) => (
                    <button key={opt} onClick={() => setDuration(opt)} className={`px-8 py-2.5 rounded-xl text-sm font-semibold transition-all ${duration === opt ? 'bg-blue-600 shadow-sm text-white' : 'text-slate-400 hover:text-slate-200'}`}>{opt}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Lyrics</label>
                <div className="flex bg-gray-950 border border-gray-800 p-1 rounded-2xl w-fit">
                  {(['Auto', 'Custom', 'Instrumental'] as LyricsOption[]).map((opt) => (
                    <button key={opt} onClick={() => setLyricsOption(opt)} className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${lyricsOption === opt ? 'bg-blue-600 shadow-sm text-white' : 'text-slate-400 hover:text-slate-200'}`}>{opt}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* SOUND SCULPTING & REFERENCE TRACKS PANEL */}
            <div className="bg-gray-950/60 border border-gray-800 rounded-[32px] p-6 md:p-8 space-y-8 shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-800/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-950 text-blue-400">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-100">Sound Customizer & Mixing Console</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Flesh out the exact BPM, Key, scale signature, and category volumes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>STUDIO INTERACTION MATRIX v3.0</span>
                </div>
              </div>

              {/* 2-Column Responsive Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* COLUMN 1: Tone, Rhythm & Frequency Parameters */}
                <div className="space-y-6">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" />
                    Tone & Tempo Architect
                  </h4>

                  {/* BPM Tempo Slider */}
                  <div className="space-y-2 bg-gray-900/40 p-4.5 rounded-2xl border border-gray-850">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-300">Tempo (BPM)</label>
                      <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/30">{bpm} BPM</span>
                    </div>
                    <input 
                      type="range" 
                      min="60" 
                      max="180" 
                      step="1"
                      value={bpm} 
                      onChange={(e) => setBpm(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-slate-500">
                      <span>60 (Adagio)</span>
                      <span>120 (Moderato)</span>
                      <span>180 (Presto)</span>
                    </div>
                  </div>

                  {/* Harmonic Keys and Scale Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Scale Selector */}
                    <div className="space-y-2 bg-gray-900/40 p-4.5 rounded-2xl border border-gray-850">
                      <label className="text-xs font-semibold text-slate-300 block">Musical Scale</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {['Random', 'Major', 'Minor', 'Phrygian', 'Jazz'].map((sc) => (
                          <button
                            key={sc}
                            type="button"
                            onClick={() => setScale(sc)}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all text-center ${
                              scale === sc 
                                ? 'bg-blue-600/95 border-blue-500 text-white shadow-sm' 
                                : 'bg-gray-950/60 border-gray-850 text-slate-400 hover:border-gray-700 hover:text-slate-200'
                            }`}
                          >
                            {sc}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Rhythmic Density Selector */}
                    <div className="space-y-2 bg-gray-900/40 p-4.5 rounded-2xl border border-gray-850">
                      <label className="text-xs font-semibold text-slate-300 block">Rhythmic Density</label>
                      <div className="flex flex-col gap-1.5">
                        {['Sparse', 'Balanced', 'Dense'].map((ds) => (
                          <button
                            key={ds}
                            type="button"
                            onClick={() => setDensity(ds as any)}
                            className={`py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all text-center ${
                              density === ds 
                                ? 'bg-blue-600/95 border-blue-500 text-white shadow-sm' 
                                : 'bg-gray-950/60 border-gray-850 text-slate-400 hover:border-gray-700 hover:text-slate-200'
                            }`}
                          >
                            {ds}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Key Signature Selection */}
                  <div className="space-y-2.5 bg-gray-900/40 p-4.5 rounded-2xl border border-gray-850">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-300">Key Signature</label>
                      <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/60 px-2.5 py-0.5 rounded border border-blue-900/30">{key === 'Random' ? 'Auto/Random' : `${key}`}</span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                      {['Random', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setKey(k)}
                          className={`py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all border text-center ${
                            key === k 
                              ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.2)]' 
                              : 'bg-gray-950/60 border-gray-850 text-slate-400 hover:border-gray-700 hover:text-slate-200'
                          }`}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* COLUMN 2: Mixer Console & A/B Reference Setup */}
                <div className="space-y-6">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5" />
                    Console Mixer & Reference Analysis
                  </h4>

                  {/* Studio mixer board */}
                  <div className="bg-gray-900/40 p-5 rounded-2xl border border-gray-850 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Track Multi-Channel Faders</span>
                      <button 
                        type="button"
                        onClick={() => {
                          setBassLevel(100);
                          setDrumsLevel(100);
                          setMelodyLevel(100);
                          setPadLevel(100);
                          setDistortion(0);
                        }}
                        className="text-[9px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest cursor-pointer"
                      >
                        Reset Levels
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Drums fader */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-semibold text-slate-400">Drums Perc</span>
                          <span className="font-mono text-blue-400">{drumsLevel}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="150" 
                          value={drumsLevel} 
                          onChange={(e) => setDrumsLevel(parseInt(e.target.value))}
                          className="w-full h-1 bg-gray-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>

                      {/* Bass fader */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-semibold text-slate-400">Sub-Bass</span>
                          <span className="font-mono text-blue-400">{bassLevel}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="150" 
                          value={bassLevel} 
                          onChange={(e) => setBassLevel(parseInt(e.target.value))}
                          className="w-full h-1 bg-gray-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>

                      {/* Lead melody fader */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-semibold text-slate-400">Lead Melody</span>
                          <span className="font-mono text-blue-400">{melodyLevel}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="150" 
                          value={melodyLevel} 
                          onChange={(e) => setMelodyLevel(parseInt(e.target.value))}
                          className="w-full h-1 bg-gray-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>

                      {/* Pads/Atmosphere fader */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-semibold text-slate-400">Ambient Pads</span>
                          <span className="font-mono text-blue-400">{padLevel}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="150" 
                          value={padLevel} 
                          onChange={(e) => setPadLevel(parseInt(e.target.value))}
                          className="w-full h-1 bg-gray-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                    </div>

                    {/* Master Distortion / Saturation */}
                    <div className="pt-2 border-t border-gray-800/40 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-semibold text-slate-400 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-500" />
                          Analog Tape Grittiness (Drive)
                        </span>
                        <span className="font-mono text-amber-500 font-bold">{distortion}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={distortion} 
                        onChange={(e) => setDistortion(parseInt(e.target.value))}
                        className="w-full h-1 bg-gray-950 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 transition-all"
                      />
                    </div>
                  </div>

                  {/* REFERENCE AUDIO & YOUTUBE SECTION */}
                  <div className="bg-gray-900/40 p-5 rounded-2xl border border-gray-850 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Reference Signal Inputs</span>
                      <span className="text-[9px] text-slate-500">Paste beat link or upload WAV/MP3</span>
                    </div>

                    <div className="space-y-3">
                      {/* YouTube/SoundCloud Link */}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                          <LinkIcon className="w-3.5 h-3.5" />
                        </div>
                        <input 
                          type="text" 
                          value={referenceLink} 
                          onChange={(e) => setReferenceLink(e.target.value)}
                          placeholder="Paste reference link (YouTube / SoundCloud / Spotify)"
                          className="w-full pl-9 pr-3 py-2 bg-gray-950 border border-gray-850 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                        />
                      </div>

                      {/* File Upload drag-and-drop / manual block */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div className="relative">
                          <input 
                            type="file" 
                            id="reference-audio-upload"
                            onChange={handleFileUpload} 
                            accept="audio/*" 
                            className="hidden" 
                          />
                          <label 
                            htmlFor="reference-audio-upload"
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-950 hover:bg-gray-900 border border-gray-850 hover:border-gray-750 rounded-xl cursor-pointer transition-all text-xs text-slate-300 font-semibold text-center select-none"
                          >
                            <Upload className="w-3.5 h-3.5 text-blue-400" />
                            <span>Upload Beat File</span>
                          </label>
                        </div>

                        {/* Playback of Uploaded File */}
                        {uploadedBeatFile ? (
                          <div className="flex items-center justify-between px-3 py-1.5 bg-blue-950/20 border border-blue-900/30 rounded-xl">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <FileAudio className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="text-[10px] text-slate-300 truncate font-semibold" title={uploadedBeatFile.name}>{uploadedBeatFile.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={togglePlayUploaded}
                                className="p-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
                                title={isUploadedPlaying ? "Pause uploaded beat" : "Play uploaded beat"}
                              >
                                {isUploadedPlaying ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5 ml-0.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (uploadedAudioElement) {
                                    uploadedAudioElement.pause();
                                  }
                                  setUploadedBeatFile(null);
                                  setUploadedBeatUrl(null);
                                  setIsUploadedPlaying(false);
                                  setUploadedAudioElement(null);
                                }}
                                className="p-1 rounded-full bg-gray-800 hover:bg-rose-950 hover:text-rose-400 text-slate-500 transition-colors cursor-pointer"
                                title="Remove reference"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 italic text-center sm:text-left">No audio file attached.</div>
                        )}
                      </div>
                    </div>

                    {/* Trigger analysis button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        disabled={(!referenceLink.trim() && !uploadedBeatFile) || isAnalyzingReference}
                        onClick={handleAnalyzeReference}
                        className={`w-full py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          (!referenceLink.trim() && !uploadedBeatFile) || isAnalyzingReference
                            ? 'bg-gray-800/50 text-slate-500 cursor-not-allowed border border-transparent'
                            : 'bg-blue-950 border border-blue-900/40 text-blue-400 hover:bg-blue-900/30 hover:border-blue-500/50 active:scale-98 shadow-sm cursor-pointer'
                        }`}
                      >
                        {isAnalyzingReference ? (
                          <>
                            <Activity className="w-3.5 h-3.5 animate-pulse text-blue-400" />
                            <span>Analyzing Signature...</span>
                          </>
                        ) : (
                          <>
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Analyze Reference & Map Vibe</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Neon terminal logging block */}
                    {analysisLogs.length > 0 && (
                      <div className="bg-gray-950 border border-gray-850 rounded-xl p-3.5 space-y-1 font-mono text-[9px] text-[#32d74b]/90 h-28 overflow-y-auto custom-scrollbar shadow-inner animate-in fade-in zoom-in duration-200">
                        {analysisLogs.map((log, index) => (
                          <div key={index} className="flex items-start gap-1.5 leading-normal">
                            <span className="text-blue-500 select-none">&gt;</span>
                            <span>{log}</span>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                </div>

              </div>
            </div>

            {lyricsOption === 'Custom' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Custom Composition Lyrics</label>
                <textarea
                  value={customLyrics}
                  onChange={(e) => setCustomLyrics(e.target.value)}
                  placeholder={`[0:00 - 0:15] Hey this is your song\n[0:15 - ] You can write any lyrics you want`}
                  className="w-full min-h-[160px] bg-gray-950 border border-gray-800 rounded-3xl p-6 text-lg font-light leading-relaxed resize-none focus:bg-gray-900 focus:border-blue-500 transition-all custom-scrollbar text-white"
                />
              </div>
            )}

            <button 
              onClick={() => handleGenerate()} 
              disabled={(!prompt.trim() && selectedImages.length === 0) || CONFIG.IS_MAINTENANCE_MODE} 
              className={`w-full py-5 rounded-3xl text-lg font-bold text-white transition-all shadow-xl ${
                ((!prompt.trim() && selectedImages.length === 0) || CONFIG.IS_MAINTENANCE_MODE)
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed shadow-none' 
                  : `music-gradient shadow-blue-500/10 active:scale-[0.98] active:brightness-110 ${isTriggering ? 'scale-[0.98] brightness-125 ring-4 ring-blue-900/40' : ''}`
              }`}
            >
              Generate Song
            </button>
          </div>
        </section>

        {gen.results.length > 0 && (
          <div className="relative mb-12 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800"></div></div>
            <div className="relative bg-[#030712] px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">Songs Gallery</div>
          </div>
        )}

        <div className="space-y-6">
          {gen.results.map((result) => {
            const isExpanded = result.isExpanded;
            const isEncoding = encodingVideoId === result.id;
            const isGenerating = result.status === 'generating';
            const isFailed = result.status === 'error';
            
            return (
              <div key={result.id} className="group relative transition-all duration-700 ease-in-out transform">
                <div className={`relative transition-all duration-700 ease-in-out border border-gray-800/80 shadow-lg rounded-[40px] ${isExpanded ? 'p-8 pb-12' : 'p-4'}`}>
                  <div className="absolute inset-0 z-0 rounded-[40px] overflow-hidden" style={{ backgroundImage: result.coverImageUrl ? `url(${result.coverImageUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    <div className={`absolute inset-0 transition-opacity duration-700 ease-in-out backdrop-blur-2xl ${isExpanded ? 'bg-gray-950/80 opacity-100' : 'bg-gray-950/90 opacity-100'}`} />
                  </div>

                  <div className={`relative z-[30] flex transition-all duration-700 ease-in-out gap-6 items-center ${isExpanded ? 'flex-col md:flex-row mb-8' : 'flex-row'}`} onClick={() => !isExpanded && toggleExpand(result.id)} style={{ cursor: isExpanded ? 'default' : 'pointer' }}>
                    <div className={`relative shrink-0 transition-all duration-700 ease-in-out rounded-3xl overflow-hidden shadow-2xl ${isExpanded ? 'w-48 h-48 md:w-56 md:h-56' : 'w-16 h-16'}`}>
                      {result.coverImageUrl ? <img src={result.coverImageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-950/80"><Icons.Sparkles className={`text-blue-400 ${isExpanded ? 'w-12 h-12 animate-pulse' : 'w-5 h-5'}`} /></div>}
                      {isEncoding && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center"><Icons.Loading className={`${isExpanded ? 'w-12 h-12' : 'w-6 h-6'} text-blue-400 animate-spin`} /></div>}
                      <button onClick={(e) => { e.stopPropagation(); if (isGenerating) return; const audio = document.getElementById(`audio-${result.id}`) as HTMLAudioElement; if (audio) audio.paused ? audio.play() : audio.pause(); }} disabled={(!result.audioUrl && !isGenerating) || isEncoding} className={`absolute inset-0 flex items-center justify-center text-white z-10 transition-opacity duration-300 ${isExpanded || isGenerating ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${isEncoding ? 'cursor-wait' : 'cursor-pointer'}`}>
                        <div className={`music-gradient backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 shadow-2xl hover:scale-110 transition-transform ${isExpanded ? 'w-16 h-16' : 'w-10 h-10'}`}>
                          {isGenerating ? <Icons.Loading className={`${isExpanded ? 'w-8 h-8' : 'w-5 h-5'} animate-spin`} /> : isResultPlaying === result.id ? <Icons.Pause className={isExpanded ? 'w-8 h-8' : 'w-5 h-5'} /> : <Icons.Play className={`${isExpanded ? 'w-8 h-8' : 'w-5 h-5'} ml-1`} />}
                        </div>
                      </button>
                    </div>

                    <div className={`flex-1 min-w-0 transition-all duration-700 ease-in-out ${isExpanded ? 'text-center md:text-left' : ''}`}>
                      <div className="space-y-1 relative">
                        <div className={`flex items-center gap-4 ${isExpanded ? 'justify-center md:justify-start flex-wrap' : ''}`}>
                          <h4 className={`font-extrabold text-blue-400 tracking-tight transition-all duration-700 ease-in-out truncate ${isExpanded ? 'text-3xl md:text-4xl' : 'text-lg'}`}>
                            {isFailed ? 'Processing Failed' : (result.title || (isGenerating ? "Synthesizing..." : "Untitled Composition"))}
                          </h4>
                          {(isFailed || result.audioUrl) && (
                            <div className="relative" onClick={e => e.stopPropagation()}>
                              <button onClick={() => handleGenerate({ prompt: result.originalPrompt, duration: result.originalDuration, lyricsOption: result.originalLyricsOption })} className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-blue-950 border border-blue-900/50 text-blue-400 text-[10px] font-bold uppercase tracking-[0.1em] hover:bg-blue-900/50 transition-all shadow-sm active:scale-95 z-20">
                                <Icons.RefreshCw className="w-3.5 h-3.5 shrink-0" />
                                <span>{isFailed ? 'Retry' : 'Regenerate'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                        <div className={`flex items-center gap-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest transition-all duration-700 ease-in-out ${isExpanded ? 'justify-center md:justify-start' : ''}`}>
                          <span className="px-2 py-0.5 bg-blue-600 text-white rounded font-mono text-[9px]">JIMSOM 3.0</span>
                          <span>• {result.duration}</span>
                        </div>
                      </div>

                      <div className={`transition-all duration-700 ease-in-out overflow-visible ${isExpanded ? 'max-h-[200px] mt-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                        {result.audioUrl && (
                          <div className="space-y-4">
                            <audio id={`audio-${result.id}`} onPlay={() => setIsResultPlaying(result.id)} onPause={() => setIsResultPlaying(null)} controls className="h-10 w-full rounded-2xl"><source src={result.audioUrl} /></audio>
                            <div className="flex gap-4 items-start relative">
                              <div className="flex-1 relative group/download" onClick={e => e.stopPropagation()}>
                                <button onClick={(e) => { e.stopPropagation(); handleDownload(result); }} className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 text-white text-[10px] font-bold uppercase tracking-[0.1em] hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 ${isEncoding ? 'opacity-50 cursor-wait' : ''}`} disabled={isEncoding}>
                                  {isEncoding ? <Icons.Loading className="w-4 h-4 animate-spin" /> : <Icons.Download className="w-4 h-4" />}
                                  {isEncoding ? `Processing ${Math.round(encodingProgress)}%` : 'Download'}
                                </button>
                                {!isEncoding && (
                                  <div className="absolute top-full left-0 right-0 pt-2 opacity-0 translate-y-2 pointer-events-none group-hover/download:opacity-100 group-hover/download:translate-y-0 group-hover/download:pointer-events-auto transition-all duration-300 z-[60]">
                                    <div className="bg-gray-950 rounded-2xl shadow-2xl border border-gray-800 overflow-hidden">
                                      <button onClick={(e) => { e.stopPropagation(); handleDownload(result); }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-900 transition-colors">
                                        <div className="w-8 h-8 bg-blue-950 text-blue-400 rounded-lg flex items-center justify-center"><Icons.Download className="w-4 h-4" /></div>
                                        <div><div className="text-[10px] font-bold uppercase tracking-wider text-white">Track</div><div className="text-[9px] text-slate-400">High fidelity master</div></div>
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); onDownloadVideo(result, false); }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-900 border-t border-gray-850 transition-colors">
                                        <div className="w-8 h-8 bg-purple-950 text-purple-400 rounded-lg flex items-center justify-center"><Icons.Video className="w-4 h-4" /></div>
                                        <div><div className="text-[10px] font-bold uppercase tracking-wider text-white">Video</div><div className="text-[9px] text-slate-400">Reactive visual map</div></div>
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); onDownloadVideo(result, true); }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-900 border-t border-gray-850 transition-colors">
                                        <div className="w-8 h-8 bg-pink-950 text-pink-400 rounded-lg flex items-center justify-center"><Icons.Sparkles className="w-4 h-4" /></div>
                                        <div><div className="text-[10px] font-bold uppercase tracking-wider text-white">Karaoke</div><div className="text-[9px] text-slate-400">Timed sync engine</div></div>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        {!result.audioUrl && isGenerating && <div className="h-1 w-full bg-blue-950 rounded-full overflow-hidden mt-6"><div className="h-full bg-blue-600 animate-[loading_2s_infinite]"></div></div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4"><button onClick={(e) => { e.stopPropagation(); toggleExpand(result.id); }} className={`p-2 rounded-full transition-all duration-500 ${isExpanded ? 'bg-blue-950 text-blue-400 rotate-90' : 'text-slate-400 group-hover:text-blue-400'}`}><Icons.ChevronRight className="w-6 h-6" /></button></div>
                  </div>

                  <div className={`relative z-10 grid transition-all duration-700 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      {/* Generation Directive Box */}
                      {(result.fullPrompt || result.originalPrompt) && (
                        <div className="mb-6 space-y-3">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Generation Directive</label>
                          <div className="bg-gray-950/80 border border-gray-800 rounded-[24px] p-6 text-xs font-mono text-slate-300 whitespace-pre-wrap shadow-inner overflow-x-auto custom-scrollbar">
                            {result.fullPrompt || result.originalPrompt}
                          </div>
                        </div>
                      )}

                      {/* Studio Analysis & Recording Tools */}
                      {result.audioUrl && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                          <BeatAnalyzer 
                            audioUrl={result.audioUrl}
                            isPlaying={isResultPlaying === result.id}
                            bpm={bpm}
                            musicKey={key}
                            scale={scale}
                            density={density}
                          />
                          <VoiceStudio 
                            beatUrl={result.audioUrl}
                            beatIsPlaying={isResultPlaying === result.id}
                            onPlayBeat={() => {
                              const audio = document.getElementById(`audio-${result.id}`) as HTMLAudioElement;
                              if (audio) audio.play().catch(e => console.log('Sync play failed:', e));
                            }}
                            onPauseBeat={() => {
                              const audio = document.getElementById(`audio-${result.id}`) as HTMLAudioElement;
                              if (audio) audio.pause();
                            }}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 pb-2">
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Composition Lyrics</label>
                          <div className="bg-gray-950/40 border border-gray-800 backdrop-blur-md rounded-[32px] p-8 h-[240px] overflow-y-auto text-base text-slate-200 italic whitespace-pre-wrap font-serif shadow-inner custom-scrollbar">{result.lyrics ? cleanLyricsForDisplay(result.lyrics) : (isGenerating ? "Synthesizing narrative..." : "Instrumental")}</div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">System Console</label>
                          <div ref={el => { consoleRefs.current[result.id] = el; }} className="bg-[#1c1c1e] rounded-[32px] p-8 h-[240px] overflow-y-auto font-mono text-[11px] text-[#32d74b] space-y-1 shadow-2xl border border-gray-800/50 custom-scrollbar">{result.logs.map((log, i) => <div key={i} className="opacity-80 leading-relaxed">{log}</div>)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <style>{`
        @keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;