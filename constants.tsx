/**
 * Global Constants and Configuration Data
 * 
 * This file contains static data used throughout the Lyria Studio application,
 * including configuration options for the Prompt Builder (moods, genres, themes),
 * a list of example songs for the gallery, and a collection of SVG icons as React components.
 */
import React from 'react';
import { ExampleSong, SoundTemplate, InstrumentPreset } from './types';

/**
 * Configuration for the Prompt Builder helper tool.
 * Provides predefined lists of musical attributes to help users construct prompts.
 */
export const PROMPT_HELPER_CONFIG = {
  moods: ['Epic', 'Groovy', 'Melancholic', 'Aggressive', 'Ethereal', 'Uplifting', 'Cinematic', 'Nostalgic', 'Energetic', 'Dreamy', 'Dark', 'Hopeful', 'Mysterious', 'Playful', 'Tense', 'Serene'],
  genders: ['Lo-fi', 'Rock', 'Disco', 'Robot', 'Metal', 'Choir', 'Rap', 'Jazz', 'Synthwave', 'Classical', 'Techno', 'Folk', 'R&B', 'Country', 'Ambient'],
  themes: ['Midnight City', 'Lost Love', 'Galaxy Exploration', 'Morning Coffee', 'Cyberpunk Future', 'Ocean Waves', 'Digital Dreams', 'Summer Sunset', 'Neon Rain', 'Deep Space', 'Ancient Ruins', 'Mountain Peak', 'Urban Jungle', 'Time Travel', 'Winter Solstice'],
  timestamps: ['0:10', '0:20', '0:30', '0:45', '1:00', '1:15', '1:30', '2:00'],
  bpms: ['80 BPM', '100 BPM', '120 BPM', '128 BPM', '140 BPM', '160 BPM', '172 BPM'],
  scales: ['C Major', 'A Minor', 'G Major', 'E Minor', 'D Minor', 'F Major', 'Blues Scale', 'Phrygian']
};

export const EXAMPLE_SONGS: ExampleSong[] = [
  {
    id: '1',
    title: 'Neon Horizons',
    artist: 'Lyria Synth',
    coverUrl: 'https://picsum.photos/seed/music1/400/400',
    prompt: 'A high-energy synthwave track with driving basslines, shimmering 80s pads, and a cinematic build-up. Suggests a late-night drive through a futuristic cityscape.',
    duration: '3:45',
    tags: ['Electronic', 'Synthwave', 'Cinematic']
  },
  {
    id: '2',
    title: 'Midnight Jazz Lounge',
    artist: 'Echo Blue',
    coverUrl: 'https://picsum.photos/seed/music2/400/400',
    prompt: 'Soft acoustic jazz with a smooth saxophone lead, light brush drums, and a warm upright bass. Intimate atmosphere with a touch of melancholy.',
    duration: '2:30',
    tags: ['Jazz', 'Acoustic', 'Chill']
  },
  {
    id: '3',
    title: 'Digital Raindrops',
    artist: 'Pixel Pulse',
    coverUrl: 'https://picsum.photos/seed/music3/400/400',
    prompt: 'Experimental IDM featuring glitchy textures, rhythmic water drop samples, and ethereal vocal chops. Dynamic and evolving soundscape.',
    duration: '4:12',
    tags: ['IDM', 'Experimental', 'Ambient']
  },
  {
    id: '4',
    title: 'Desert Mirage',
    artist: 'Solar Winds',
    coverUrl: 'https://picsum.photos/seed/music4/400/400',
    prompt: 'A slow, atmospheric ambient track with sweeping pads, distant echoing guitar, and subtle wind sound effects. Evokes a feeling of vast, empty spaces.',
    duration: '5:05',
    tags: ['Ambient', 'Atmospheric', 'Chill']
  },
  {
    id: '5',
    title: 'Cybernetic Rebellion',
    artist: 'Null Pointer',
    coverUrl: 'https://picsum.photos/seed/music5/400/400',
    prompt: 'Aggressive industrial techno with distorted kick drums, metallic clangs, and a fast, driving tempo. High energy and intense.',
    duration: '3:15',
    tags: ['Techno', 'Industrial', 'Aggressive']
  },
  {
    id: '6',
    title: 'Summer Breeze',
    artist: 'The Sunflowers',
    coverUrl: 'https://picsum.photos/seed/music6/400/400',
    prompt: 'An uplifting indie pop song with bright acoustic guitars, a catchy whistling melody, and a light, bouncy rhythm. Cheerful and carefree.',
    duration: '2:50',
    tags: ['Indie Pop', 'Uplifting', 'Acoustic']
  }
];

export const Icons = {
  Play: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  Pause: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  ),
  Info: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  Sparkles: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707" />
    </svg>
  ),
  ChevronRight: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Loading: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ),
  Download: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Video: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  RefreshCw: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Camera: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  Music: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
  Flame: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  ),
  Moon: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  Sun: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  Compass: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  ),
  Volume2: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  ),
  X: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Drums: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M12 8v14" />
      <path d="M3 12h18" />
    </svg>
  ),
  Piano: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <path d="M6 3v12M10 3v12M14 3v12M18 3v12" />
      <path d="M2 15h20" />
      <path d="M6 15v6M10 15v6M14 15v6M18 15v6" />
    </svg>
  ),
  Violin: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22V10M9 6a3 3 0 0 1 6 0M10 14A2 2 0 1 0 14 14A2 2 0 1 0 10 14Z" />
      <path d="M8 12c.5-2 1.5-3 4-3s3.5 1 4 3" />
      <path d="M8 16c.5 2 1.5 3 4 3s3.5-1 4-3" />
    </svg>
  ),
  Guitar: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m21.5 2.5-13 13" />
      <path d="M11 11h.01M13 13h.01" />
      <path d="M10.5 13.5a3 3 0 1 0 4 4c0-2-1-3-4-4Z" />
      <path d="M6.5 17.5a4.5 4.5 0 1 0 6 6c0-3-1.5-4.5-6-6Z" />
    </svg>
  ),
  Synthesizer: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <circle cx="6" cy="8" r="1" />
      <circle cx="10" cy="8" r="1" />
      <circle cx="14" cy="8" r="1" />
      <path d="M6 12h12M6 16h12" />
    </svg>
  ),
  Saxophone: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 3v13a4 4 0 0 0 8 0V7a2 2 0 0 1 4 0v4a5 5 0 0 1-5 5h-1" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  ),
  Flute: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="2" y1="22" x2="22" y2="2" />
      <circle cx="9" cy="15" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="15" cy="9" r="1" />
    </svg>
  ),
  Mic: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
};

export const INSTRUMENT_PRESETS: InstrumentPreset[] = [
  {
    id: 'drums',
    name: 'Dynamic Drums',
    description: 'Crisp percussive beats, kicks, and organic rhythms.',
    promptPhrase: 'featuring crisp professional acoustic drum beats and intricate organic percussive layers',
    iconName: 'Drums'
  },
  {
    id: 'piano',
    name: 'Grand Piano',
    description: 'Elegant ivory keys, grand reverb, and emotional chord progression.',
    promptPhrase: 'with an elegant, rich grand piano progression and ambient acoustic reverb',
    iconName: 'Piano'
  },
  {
    id: 'violin',
    name: 'Chamber Violin',
    description: 'Symphonic violin, deep cinematic string section, and lush sweeps.',
    promptPhrase: 'layered with cinematic symphonic violin sweeps and emotional bowed strings',
    iconName: 'Violin'
  },
  {
    id: 'guitar',
    name: 'Acoustic Guitar',
    description: 'Warm finger-picked acoustic tones and sun-drenched strums.',
    promptPhrase: 'anchored by warm acoustic guitar strumming and intimate finger-picked melodies',
    iconName: 'Guitar'
  },
  {
    id: 'synth',
    name: 'Analog Synth',
    description: 'Retro fat wave modulators, thick poly-synths, and futuristic sweeps.',
    promptPhrase: 'reinforced with thick polyphonic analog synthesizers and modular retro sweeps',
    iconName: 'Synthesizer'
  },
  {
    id: 'sax',
    name: 'Sultry Saxophone',
    description: 'Smooth brass leads, midnight jazz solos, and warm horn sections.',
    promptPhrase: 'headlining smooth midnight jazz saxophone leads and warm brass swells',
    iconName: 'Saxophone'
  },
  {
    id: 'flute',
    name: 'Ethereal Flute',
    description: 'Airy wooden flute solos, celtic whistles, and dreamy ambient air.',
    promptPhrase: 'complemented by airy wooden flute soloing and cosmic breathing soundscapes',
    iconName: 'Flute'
  },
  {
    id: 'mic',
    name: 'Vocal Chops',
    description: 'Ethereal vocal harmonies, atmospheric choirs, and warm backup layers.',
    promptPhrase: 'blended with gorgeous backing vocal harmonies, choral layers, and ethereal vocal chops',
    iconName: 'Mic'
  }
];

export const SOUND_TEMPLATES: SoundTemplate[] = [
  {
    id: 't-phonk',
    name: 'Midnight Phonk',
    description: 'Distorted cowbells, dirty 808 basslines & dark atmosphere.',
    prompt: 'Aggressive drift phonk featuring distorted cowbells, heavy clipping 808 basslines, rapid Memphis rap vocal chops, and a dark, sinister, late-night atmosphere.',
    duration: 'Clip (30s)',
    lyricsOption: 'Instrumental',
    iconName: 'Flame',
    genre: 'Phonk'
  },
  {
    id: 't-cyberpunk',
    name: 'Cyberpunk Chase',
    description: 'High-octane modular synth, heavy beats & dark neon vibes.',
    prompt: 'A fast-paced cyberpunk industrial techno track with a heavy driving modular synth bass, dark metallic percussion, cybernetic vocal effects, and dystopian sci-fi tension.',
    duration: 'Pro',
    lyricsOption: 'Instrumental',
    iconName: 'Music',
    genre: 'Electronic'
  },
  {
    id: 't-lofi',
    name: 'Dreamy Lo-Fi',
    description: 'Warm dusty vinyl crackle, cozy rhodes keys & jazz drums.',
    prompt: 'Nostalgic and warm lo-fi hip-hop beat with cozy electric piano chords, dusty vinyl crackle, laid-back jazzy drums, and an intimate, soothing vocal chant.',
    duration: 'Clip (30s)',
    lyricsOption: 'Auto',
    iconName: 'Moon',
    genre: 'Chillout'
  },
  {
    id: 't-ambient',
    name: 'Cosmic Ambient',
    description: 'Ethereal cinematic pads & peaceful stellar space theme.',
    prompt: 'An ethereal space ambient soundtrack with sweeping cinematic synthesizer pads, twinkling stellar arpeggios, cosmic sound effects, and a deep peaceful sense of wonder.',
    duration: 'Pro',
    lyricsOption: 'Instrumental',
    iconName: 'Compass',
    genre: 'Ambient'
  },
  {
    id: 't-hyperpop',
    name: 'Hyperpop Blast',
    description: 'Glitchy bright synths, bubbly beats & high energy.',
    prompt: 'A bright, high-energy hyperpop anthem with bubbly futuristic synths, glitchy acoustic guitars, bouncy digital drums, and sweet, high-pitched vocals about digital youth.',
    duration: 'Clip (30s)',
    lyricsOption: 'Auto',
    iconName: 'Sparkles',
    genre: 'Hyperpop'
  },
  {
    id: 't-acoustic',
    name: 'Acoustic Breeze',
    description: 'Warm acoustic strumming, shaker & happy summer mood.',
    prompt: 'Uplifting acoustic indie folk song featuring warm strummed acoustic guitars, soft shaker percussion, light handclaps, and bright positive vocal melodies.',
    duration: 'Pro',
    lyricsOption: 'Auto',
    iconName: 'Sun',
    genre: 'Folk/Pop'
  },
  {
    id: 't-afrobeats',
    name: 'Lagos Groove',
    description: 'West African polyrhythms, log drums & sunny mood.',
    prompt: 'Warm uptempo Afrobeats groove with syncopated log drum patterns, bouncy percussion, bright acoustic guitar riffs, and breezy brass instrumentation.',
    duration: 'Pro',
    lyricsOption: 'Auto',
    iconName: 'Drums',
    genre: 'Afrobeats'
  },
  {
    id: 't-highlife',
    name: 'Palmwine Highlife',
    description: 'Sweet West African palm-wine guitar, horns & percussion.',
    prompt: 'Uplifting classic Highlife music with cheerful finger-picked electric guitars, conga grooves, sweet horn section melodies, and a light-hearted, sunny West African vibe.',
    duration: 'Pro',
    lyricsOption: 'Auto',
    iconName: 'Guitar',
    genre: 'Highlife'
  },
  {
    id: 't-jazz',
    name: 'Midnight Club Jazz',
    description: 'Smoky saxophones, smooth brush snare & piano chords.',
    prompt: 'Sophisticated modern jazz featuring walking double bass lines, smoky jazz saxophone leads, warm acoustic piano chords, and smooth brushed drums.',
    duration: 'Pro',
    lyricsOption: 'Instrumental',
    iconName: 'Saxophone',
    genre: 'Jazz'
  },
  {
    id: 't-reggae',
    name: 'Island Roots Reggae',
    description: 'Offbeat guitar skanks, deep dub basslines & organ bubbles.',
    prompt: 'Laid-back island roots reggae with offbeat rhythm guitar skanks, deep warm sub-bass, bubbling hammond organ, and a peaceful roots percussion grove.',
    duration: 'Pro',
    lyricsOption: 'Auto',
    iconName: 'Sun',
    genre: 'Reggae'
  },
  {
    id: 't-rnb',
    name: 'Velvet Soul R&B',
    description: 'Smooth contemporary 90s slow jam with rich Rhodes keys.',
    prompt: 'Smooth late-night R&B ballad featuring warm Rhodes electric piano, heavy bass, velvet synth layers, crisp 808 percussion, and stunning vocal harmonies.',
    duration: 'Pro',
    lyricsOption: 'Auto',
    iconName: 'Mic',
    genre: 'RnB'
  },
  {
    id: 't-hiphop',
    name: 'Boom Bap Vintage',
    description: 'Gritty vinyl drum breaks, jazz loops & street bass.',
    prompt: 'Classic golden era hip-hop beat featuring dusty vinyl drum breaks, jazz horn chops, deep acoustic double bass, and occasional scratching fx.',
    duration: 'Pro',
    lyricsOption: 'Auto',
    iconName: 'Volume2',
    genre: 'Hiphop'
  },
  {
    id: 't-pop',
    name: 'Neon Pop Anthem',
    description: 'Catchy synth chord hooks & driving dance beat.',
    prompt: 'Sparkling modern pop anthem featuring bright acoustic synth loops, driving electronic four-on-the-floor beat, and positive backing vocal melodies.',
    duration: 'Pro',
    lyricsOption: 'Auto',
    iconName: 'Sparkles',
    genre: 'Pop'
  },
  {
    id: 't-alternative',
    name: 'Indie Distortion',
    description: 'Fuzzy electric guitars, driving indie bass & raw energy.',
    prompt: 'Atmospheric alternative indie rock song with fuzzy electric guitars, driving melodic basslines, powerful drum grooves, and a raw expressive vocal feel.',
    duration: 'Pro',
    lyricsOption: 'Auto',
    iconName: 'Flame',
    genre: 'Alternative'
  }
];