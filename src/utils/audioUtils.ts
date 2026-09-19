/**
 * Audio Utilities
 *
 * This module contains helper functions for processing and manipulating audio data.
 *
 * Use Cases:
 * - Converting base64 encoded audio strings received from APIs into playable Blob URLs.
 * - Dynamically synthesizing multi-genre professional audio tracks using OfflineAudioContext.
 * - Encoding raw audio buffers into CD-quality 16-bit PCM WAV Blobs.
 */
import { logFunctionCall } from './logger';

/**
 * Creates a playable object URL from a base64 encoded audio string.
 * @param base64 The base64 encoded audio data.
 * @param mimeType The MIME type of the audio (e.g., 'audio/wav').
 * @returns A string representing the object URL, or an empty string if decoding fails.
 */
export const createAudioUrlFromBase64 = (base64: string, mimeType: string): string => {
  logFunctionCall('createAudioUrlFromBase64', { base64Length: base64.length, mimeType });
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Failed to decode audio base64:", e);
    return "";
  }
};

/**
 * Encodes an AudioBuffer into a 16-bit standard stereo PCM WAV Blob.
 */
export const bufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  let result;
  if (numOfChan === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }
  
  const bufferArr = new ArrayBuffer(44 + result.length * 2);
  const view = new DataView(bufferArr);
  
  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + result.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numOfChan, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * numOfChan * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numOfChan * 2, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* chunk length */
  view.setUint32(40, result.length * 2, true);
  
  // Write the PCM audio samples
  let offset = 44;
  for (let i = 0; i < result.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, result[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  
  return new Blob([bufferArr], { type: 'audio/wav' });
  
  function interleave(inputL: Float32Array, inputR: Float32Array) {
    const length = inputL.length + inputR.length;
    const res = new Float32Array(length);
    let index = 0;
    let inputIndex = 0;
    
    while (index < length) {
      res[index++] = inputL[inputIndex];
      res[index++] = inputR[inputIndex];
      inputIndex++;
    }
    return res;
  }
  
  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
};

export interface SynthesisOptions {
  bpm?: number;
  key?: string; // e.g. "C", "C#", ...
  scale?: 'major' | 'minor' | 'phrygian' | 'jazz';
  density?: 'Sparse' | 'Balanced' | 'Dense';
  bassLevel?: number; // 0-100
  drumsLevel?: number; // 0-100
  melodyLevel?: number; // 0-100
  padLevel?: number; // 0-100
  distortion?: number; // 0-100
}

const keyOffsets: Record<string, number> = {
  'C': 48, 'C#': 49, 'Db': 49, 'D': 50, 'D#': 51, 'Eb': 51,
  'E': 52, 'F': 53, 'F#': 54, 'Gb': 54, 'G': 55, 'G#': 56,
  'Ab': 56, 'A': 57, 'A#': 58, 'Bb': 58, 'B': 59
};

/**
 * Procedurally synthesizes a high-quality studio track offline.
 * This is a fully generative engine that uses randomized musical elements (keys, chord progressions,
 * tempos, arpeggiators, sub-bass, and drum patterns) to ensure every output is unique.
 */
export const synthesizeOfflineTrack = async (
  genre: string, 
  durationSec: number = 30, 
  instrumentIds: string[] = [],
  options?: SynthesisOptions
): Promise<Blob> => {
  logFunctionCall('synthesizeOfflineTrack', { genre, durationSec, instrumentIds, options });
  
  const sampleRate = 44100;
  const ctx = new OfflineAudioContext(2, sampleRate * durationSec, sampleRate);
  
  // High-end master processing chain
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-12, 0);
  compressor.knee.setValueAtTime(24, 0);
  compressor.ratio.setValueAtTime(8, 0);
  compressor.attack.setValueAtTime(0.003, 0);
  compressor.release.setValueAtTime(0.18, 0);

  // Helper: Create distortion curve for waveshaping (gritty cyberpunk / alternative distortion)
  const makeDistortionCurve = (amount = 40) => {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  };

  if (options?.distortion && options.distortion > 0) {
    const driveGain = ctx.createGain();
    driveGain.gain.setValueAtTime(1.0 + (options.distortion / 100) * 0.5, 0);
    
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeDistortionCurve(options.distortion * 1.5);
    shaper.oversample = '4x';
    
    const makeupGain = ctx.createGain();
    makeupGain.gain.setValueAtTime(1.0 / (1.0 + (options.distortion / 100) * 0.4), 0);
    
    compressor.connect(driveGain);
    driveGain.connect(shaper);
    shaper.connect(makeupGain);
    makeupGain.connect(ctx.destination);
  } else {
    compressor.connect(ctx.destination);
  }

  // Individual instrument category volume nodes (user mixer adjustments)
  const drumsVolumeScaler = ctx.createGain();
  drumsVolumeScaler.gain.setValueAtTime(options?.drumsLevel !== undefined ? options.drumsLevel / 100 : 1.0, 0);
  drumsVolumeScaler.connect(compressor);

  const bassVolumeScaler = ctx.createGain();
  bassVolumeScaler.gain.setValueAtTime(options?.bassLevel !== undefined ? options.bassLevel / 100 : 1.0, 0);
  bassVolumeScaler.connect(compressor);

  const padVolumeScaler = ctx.createGain();
  padVolumeScaler.gain.setValueAtTime(options?.padLevel !== undefined ? options.padLevel / 100 : 1.0, 0);
  padVolumeScaler.connect(compressor);

  const leadVolumeScaler = ctx.createGain();
  leadVolumeScaler.gain.setValueAtTime(options?.melodyLevel !== undefined ? options.melodyLevel / 100 : 1.0, 0);
  leadVolumeScaler.connect(compressor);

  // 1. GENERATIVE TEMPO, KEY & SCALE CONFIGURATION
  const g = genre.toLowerCase();
  
  const isPhonk = g.includes('phonk') || g.includes('drift');
  const isCyberpunk = g.includes('cyberpunk') || g.includes('chase') || g.includes('industrial') || g.includes('techno');
  const isLofi = g.includes('lo-fi') || g.includes('lofi') || g.includes('chill') || g.includes('chillout');
  const isAmbient = g.includes('ambient') || g.includes('cosmic') || g.includes('compass');
  const isHyperpop = g.includes('hyperpop') || g.includes('blast');
  const isAcoustic = g.includes('acoustic') || g.includes('breeze') || g.includes('folk');
  const isAfrobeats = g.includes('afro') || g.includes('afrobeats') || g.includes('afrobeat') || g.includes('lagos') || g.includes('groove') || g.includes('rema') || g.includes('burna') || g.includes('wizkid') || g.includes('davido') || g.includes('asake') || g.includes('trobul');
  const isHighlife = g.includes('highlife') || g.includes('palmwine');
  const isJazz = g.includes('jazz') || g.includes('smoky') || g.includes('club jazz');
  const isReggae = g.includes('reggae') || g.includes('island') || g.includes('roots');
  const isRnb = g.includes('rnb') || g.includes('r&b') || g.includes('velvet') || g.includes('soul');
  const isHiphop = g.includes('hiphop') || g.includes('hip-hop') || g.includes('boom bap') || g.includes('vintage') || g.includes('rap');
  const isPop = g.includes('pop') || g.includes('neon pop') || g.includes('anthem');
  const isAlternative = g.includes('alternative') || g.includes('indie') || g.includes('distortion') || g.includes('rock');
  const isTrap = g.includes('trap') || g.includes('atlanta') || g.includes('sub808');
  const isDrill = g.includes('drill') || g.includes('uk drill') || g.includes('chicago drill') || g.includes('woo');
  const isAmapiano = g.includes('amapiano') || g.includes('log drum') || g.includes('yano');
  const isDancehall = g.includes('dancehall') || g.includes('shatta') || g.includes('dembow');

  // Configure parameters based on identified genre
  let bpm = 120;
  let scaleType: 'major' | 'minor' | 'phrygian' | 'jazz' = 'minor';
  
  if (isPhonk) {
    bpm = 130;
    scaleType = 'phrygian';
  } else if (isCyberpunk) {
    bpm = 135;
    scaleType = 'phrygian';
  } else if (isLofi) {
    bpm = 80;
    scaleType = 'jazz';
  } else if (isAmbient) {
    bpm = 65;
    scaleType = 'major';
  } else if (isHyperpop) {
    bpm = 145;
    scaleType = 'major';
  } else if (isAcoustic) {
    bpm = 105;
    scaleType = 'major';
  } else if (isAfrobeats) {
    bpm = 112;
    scaleType = 'major';
  } else if (isHighlife) {
    bpm = 115;
    scaleType = 'major';
  } else if (isAmapiano) {
    bpm = 113;
    scaleType = 'minor';
  } else if (isTrap) {
    bpm = 140;
    scaleType = 'minor';
  } else if (isDrill) {
    bpm = 142;
    scaleType = 'minor';
  } else if (isDancehall) {
    bpm = 100;
    scaleType = 'minor';
  } else if (isJazz) {
    bpm = 92;
    scaleType = 'jazz';
  } else if (isReggae) {
    bpm = 90;
    scaleType = 'major';
  } else if (isRnb) {
    bpm = 85;
    scaleType = 'jazz';
  } else if (isHiphop) {
    bpm = 90;
    scaleType = 'minor';
  } else if (isPop) {
    bpm = 124;
    scaleType = 'major';
  } else if (isAlternative) {
    bpm = 130;
    scaleType = 'minor';
  } else {
    bpm = Math.floor(95 + Math.random() * 25); // 95 - 120 BPM
    scaleType = Math.random() > 0.5 ? 'minor' : 'major';
  }

  // Override by User options if provided
  if (options?.bpm !== undefined && options.bpm > 0) {
    bpm = options.bpm;
  }
  if (options?.scale !== undefined && options.scale !== 'Random' as any) {
    scaleType = options.scale;
  }

  // Generative Key selection (randomized key from C3 to B3)
  let scaleRoot = Math.floor(48 + Math.random() * 12);
  if (options?.key !== undefined && options.key !== 'Random' && keyOffsets[options.key] !== undefined) {
    scaleRoot = keyOffsets[options.key];
  }
  
  // Scale formulas (intervals from root)
  const scaleIntervals = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    jazz: [0, 2, 3, 5, 7, 9, 10]
  };
  
  const selectedIntervals = scaleIntervals[scaleType];
  const getMidiNoteFromScale = (degree: number, octaveOffset: number = 0): number => {
    const scaleLength = selectedIntervals.length;
    const scaledDegree = ((degree % scaleLength) + scaleLength) % scaleLength;
    const octaveShift = Math.floor(degree / scaleLength) + octaveOffset;
    return scaleRoot + selectedIntervals[scaledDegree] + (octaveShift * 12);
  };

  // 2. GENERATIVE CHORD PROGRESSION
  let chordRoots = [0, 3, 4, 5]; // Generic degrees: I, IV, V, VI
  
  if (isAfrobeats || isHighlife || isAmapiano) {
    // West African & South African chord sequences
    const progressions = [
      [0, 3, 4, 3], // I - IV - V - IV (classic Highlife/Afrobeat feel)
      [1, 4, 0, 3], // ii - V - I - IV (warm jazz-infused groove)
      [5, 3, 0, 4], // vi - IV - I - V (soulful Burna Boy/Wizkid vibe)
      [0, 3, 5, 4], // i - iv - vi - v
      [0, 4, 5, 3]  // I - V - vi - IV (bouncy pop-afro fusion)
    ];
    chordRoots = progressions[Math.floor(Math.random() * progressions.length)];
  } else if (isTrap || isDrill) {
    // Moody dark minor / Phrygian tension sequences
    const progressions = [
      [0, 1, 0, 1], // Tension building half-step slide (classic Drill)
      [5, 4, 0, 1], // Deep trap slide
      [0, 4, 5, 1], // Dark melodic progression
      [0, 1, 0, 5]
    ];
    chordRoots = progressions[Math.floor(Math.random() * progressions.length)];
  } else if (isDancehall) {
    chordRoots = [0, 4, 5, 3]; // Catchy major-infused bounce
  } else if (isPhonk) {
    chordRoots = [0, 1, 0, 2]; // Tension building Phrygian chords
  } else if (isReggae) {
    chordRoots = Math.random() > 0.5 ? [0, 3, 0, 3] : [0, 3, 4, 3]; // Offbeat skank sequence
  } else if (isLofi || isRnb || isJazz) {
    chordRoots = [1, 4, 0, 5]; // ii - V - I - vi lush jazz pattern
  } else if (scaleType === 'phrygian') {
    chordRoots[1] = 1; // Neapolitan flat-II chord
  } else if (scaleType === 'jazz') {
    chordRoots[1] = 1; // bII or bVII chord
    chordRoots[2] = 4; // IV
    chordRoots[3] = 6; // VII
  } else {
    // Shuffle/randomize progression order slightly to make each synthesis sound unique
    for (let i = chordRoots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chordRoots[i], chordRoots[j]] = [chordRoots[j], chordRoots[i]];
    }
  }

  const chordProgression: number[][] = chordRoots.map(rootDegree => {
    // Custom chord voice building
    if (isLofi || isRnb || isJazz || isAfrobeats || isHighlife) {
      // Lush 7th/9th jazz chords
      return [
        getMidiNoteFromScale(rootDegree, 0),
        getMidiNoteFromScale(rootDegree + 2, 0),
        getMidiNoteFromScale(rootDegree + 4, 0),
        getMidiNoteFromScale(rootDegree + 6, 0),
        getMidiNoteFromScale(rootDegree + 8, 0)
      ];
    }
    // Standard triads or 7ths
    return [
      getMidiNoteFromScale(rootDegree, 0),
      getMidiNoteFromScale(rootDegree + 2, 0),
      getMidiNoteFromScale(rootDegree + 4, 0),
      getMidiNoteFromScale(rootDegree + 6, 0)
    ];
  });

  const secondsPerBeat = 60 / bpm;
  const totalBeats = Math.ceil(durationSec / secondsPerBeat);
  
  // 3. STEREO LUSH CHORUSED PAD SYNTHESIZER
  const padOsc1 = ctx.createOscillator();
  const padOsc2 = ctx.createOscillator();
  const padFilter = ctx.createBiquadFilter();
  const padGain = ctx.createGain();
  
  padOsc1.type = 'triangle';
  padOsc2.type = 'sawtooth';
  padOsc1.detune.setValueAtTime(-15, 0); // Detune Left
  padOsc2.detune.setValueAtTime(15, 0);  // Detune Right
  
  padFilter.type = 'lowpass';
  padFilter.frequency.setValueAtTime(isAmbient ? 180 : 280, 0);
  
  const padVol = isAmbient ? 0.09 : isLofi ? 0.07 : isAfrobeats || isHighlife || isReggae ? 0.005 : 0.03;
  padGain.gain.setValueAtTime(padVol, 0);
  
  padOsc1.connect(padFilter);
  padOsc2.connect(padFilter);
  padFilter.connect(padGain);
  padGain.connect(padVolumeScaler);
  
  padOsc1.start(0);
  padOsc2.start(0);

  // 4. SUB-BASS SYNTHESIZER
  const bassOsc = ctx.createOscillator();
  const bassGain = ctx.createGain();
  bassOsc.type = 'sine';
  bassGain.gain.setValueAtTime(isAfrobeats ? 0.0 : (isPhonk || isCyberpunk || isRnb ? 0.25 : 0.16), 0);
  bassOsc.connect(bassGain);
  bassGain.connect(bassVolumeScaler);
  bassOsc.start(0);

  // 5. VINYL CRACKLE BACKGROUND TEXTURE (Gives instant professional vintage feel)
  if (isLofi || isHiphop || isJazz) {
    const crackleLength = sampleRate * durationSec;
    const crackleBuffer = ctx.createBuffer(1, crackleLength, sampleRate);
    const channelData = crackleBuffer.getChannelData(0);
    for (let i = 0; i < crackleLength; i++) {
      // Gentle vintage hiss
      let hiss = (Math.random() * 2 - 1) * 0.003;
      // High-quality dynamic crackle pop sounds
      if (Math.random() > 0.99988) {
        hiss += (Math.random() > 0.5 ? 1 : -1) * (0.04 + Math.random() * 0.06);
      }
      channelData[i] = hiss;
    }
    const crackleSource = ctx.createBufferSource();
    crackleSource.buffer = crackleBuffer;
    const crackleFilter = ctx.createBiquadFilter();
    crackleFilter.type = 'bandpass';
    crackleFilter.frequency.setValueAtTime(2200, 0);
    crackleFilter.Q.setValueAtTime(1.2, 0);
    
    const crackleVolNode = ctx.createGain();
    crackleVolNode.gain.setValueAtTime(0.08, 0);
    
    crackleSource.connect(crackleFilter);
    crackleFilter.connect(crackleVolNode);
    crackleVolNode.connect(compressor);
    crackleSource.start(0);
  }

  // Choose melody configuration
  const melodyStyle = isAmbient ? 'arpeggiate' : Math.random() > 0.4 ? 'rhythmic' : 'arpeggiate';
  const melodySpeed = isHyperpop || isCyberpunk ? 0.25 : 0.5; // Sixteenth vs Eighth notes

  // Helper: Play a rhythmic chord stab with custom timbre
  const playRhythmicChord = (notes: number[], startTime: number, duration: number, type: 'epiano' | 'guitar' | 'synth' = 'epiano', vol = 0.04) => {
    notes.forEach((note, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      // Slight strumming delay for realism
      const noteStartTime = startTime + (index * 0.012);
      if (noteStartTime >= durationSec - 0.1) return;

      if (type === 'epiano') {
        osc.type = 'triangle';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, noteStartTime);
        filter.frequency.exponentialRampToValueAtTime(180, noteStartTime + duration * 0.7);
        
        gainNode.gain.setValueAtTime(0, noteStartTime);
        gainNode.gain.linearRampToValueAtTime(vol, noteStartTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, noteStartTime + duration);
      } else if (type === 'guitar') {
        osc.type = 'triangle';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, noteStartTime);
        filter.frequency.exponentialRampToValueAtTime(250, noteStartTime + duration * 0.55);
        
        gainNode.gain.setValueAtTime(0, noteStartTime);
        gainNode.gain.linearRampToValueAtTime(vol * 1.3, noteStartTime + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.001, noteStartTime + duration);
      } else {
        osc.type = 'sawtooth';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1100, noteStartTime);
        filter.frequency.exponentialRampToValueAtTime(320, noteStartTime + duration * 0.75);
        
        gainNode.gain.setValueAtTime(0, noteStartTime);
        gainNode.gain.linearRampToValueAtTime(vol * 0.6, noteStartTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, noteStartTime + duration);
      }
      
      osc.frequency.setValueAtTime(midiToFreq(note), noteStartTime);
      
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(padVolumeScaler);
      
      osc.start(noteStartTime);
      osc.stop(noteStartTime + duration + 0.05);
    });
  };

  // 6. MAIN MUSIC PRODUCTION GENERATION LOOP
  for (let beat = 0; beat < totalBeats; beat += 4) {
    const time = beat * secondsPerBeat;
    if (time >= durationSec - 0.5) break;
    
    const chordIndex = Math.floor(beat / 4) % chordProgression.length;
    const chord = chordProgression[chordIndex];
    
    // Update Pad and Bass note assignments dynamically
    const padRootFreq = midiToFreq(chord[0] - 12);
    padOsc1.frequency.setValueAtTime(padRootFreq, time);
    padOsc2.frequency.setValueAtTime(padRootFreq * 1.5, time); // Quintal voice layering
    
    // Smooth filter swells on chord changes
    const lowFreq = isAmbient ? 150 : 250;
    const highFreq = isAmbient ? 450 : isCyberpunk ? 1200 : 700;
    padFilter.frequency.setValueAtTime(lowFreq, time);
    padFilter.frequency.exponentialRampToValueAtTime(highFreq, time + secondsPerBeat * 2.0);
    padFilter.frequency.exponentialRampToValueAtTime(lowFreq, time + secondsPerBeat * 4.0);

    // Warm sub-bass notes following the chord root (for non-Afrobeats / non-Amapiano)
    if (!isAfrobeats && !isAmapiano) {
      const bassMidiNote = chord[0] - 24;
      const startFreq = midiToFreq(bassMidiNote);
      if (isTrap || isDrill) {
        // Sliding 808 pitch glides!
        bassOsc.frequency.setValueAtTime(startFreq, time);
        // Slide up by 5 semitones (perfect fourth) or 12 semitones (octave) on step 2/3
        const slideTime = time + secondsPerBeat * 2.0;
        bassOsc.frequency.setValueAtTime(startFreq, slideTime);
        bassOsc.frequency.exponentialRampToValueAtTime(startFreq * 1.5, slideTime + 0.15);
        bassOsc.frequency.exponentialRampToValueAtTime(startFreq, slideTime + 0.4);
      } else {
        bassOsc.frequency.setValueAtTime(startFreq, time);
      }
    }
    
    // Sidechain compressor / bass envelope ducking for kick punches
    if (!isAmbient && !isAfrobeats && !isAmapiano) {
      for (let step = 0; step < 4; step++) {
        const stepTime = time + (step * secondsPerBeat);
        const bassVol = isPhonk || isCyberpunk || isRnb || isTrap || isDrill ? 0.28 : 0.16;
        bassGain.gain.setValueAtTime(bassVol, stepTime);
        bassGain.gain.exponentialRampToValueAtTime(bassVol * 0.15, stepTime + 0.012);
        bassGain.gain.linearRampToValueAtTime(bassVol, stepTime + 0.2);
      }
    }

    // --- RHYTHMIC CHORD STABS (COMPING) ---
    if (isAfrobeats || isHighlife || isDancehall) {
      // Sweet syncopated Afrobeat chord comper
      playRhythmicChord(chord, time, secondsPerBeat * 1.5, 'guitar', 0.035);
      playRhythmicChord(chord, time + secondsPerBeat * 1.5, secondsPerBeat * 0.8, 'guitar', 0.025);
      playRhythmicChord(chord, time + secondsPerBeat * 3.0, secondsPerBeat * 0.7, 'guitar', 0.03);
    } else if (isAmapiano) {
      // Deep organic Rhodes chords
      playRhythmicChord(chord, time, secondsPerBeat * 2.5, 'epiano', 0.045);
      playRhythmicChord(chord, time + secondsPerBeat * 2.0, secondsPerBeat * 1.5, 'epiano', 0.035);
    } else if (isReggae) {
      // Reggae Skank offbeats (Beats 2 and 4)
      playRhythmicChord(chord, time + secondsPerBeat * 1.0, 0.15, 'epiano', 0.045);
      playRhythmicChord(chord, time + secondsPerBeat * 3.0, 0.15, 'epiano', 0.045);
    } else if (isLofi || isRnb || isJazz) {
      // Smooth laid-back Rhodes comping
      playRhythmicChord(chord, time, secondsPerBeat * 3.5, 'epiano', 0.055);
    } else if (isTrap || isDrill) {
      // Dark gothic synth bell chord on beat 1
      playRhythmicChord(chord, time, secondsPerBeat * 2.0, 'synth', 0.025);
    } else if (isPop || isCyberpunk) {
      // Synthesizer stabs on beats 1 and 3
      playRhythmicChord(chord, time, secondsPerBeat * 0.8, 'synth', 0.035);
      playRhythmicChord(chord, time + secondsPerBeat * 2.0, secondsPerBeat * 0.8, 'synth', 0.035);
    }

    // --- ACCORDING GENRE LEAD & MELODY VOICE ---
    const stepsInMeasure = 8;
    for (let step = 0; step < stepsInMeasure; step++) {
      const stepTime = time + (step * (secondsPerBeat * melodySpeed));
      if (stepTime >= durationSec - 0.2) break;
      
      // Syncopation: randomly skip notes
      if (step > 0 && Math.random() > 0.8) continue;
      
      let chordToneIndex = step % chord.length;
      let midiNote = chord[chordToneIndex] + 12; // Standard lead register
      
      if (melodyStyle === 'arpeggiate') {
        if (step === 3) midiNote += isPhonk ? 5 : Math.random() > 0.5 ? 5 : 7;
        if (step === 7) midiNote += isPhonk ? 12 : Math.random() > 0.5 ? 12 : -5;
      } else {
        if (step % 2 === 0) midiNote = chord[0] + (Math.random() > 0.5 ? 12 : 24);
        else continue;
      }
      
      const freq = midiToFreq(midiNote);
      
      // Synthesize lead voice
      const leadOsc = ctx.createOscillator();
      const leadGain = ctx.createGain();
      const leadFilter = ctx.createBiquadFilter();
      
      // Precise genre-specific lead synthesizers
      if (isPhonk) {
        // High-pitched bell melody synth typical of Memphis sound
        leadOsc.type = 'triangle';
        leadFilter.type = 'bandpass';
        leadFilter.frequency.setValueAtTime(3500, stepTime);
        leadGain.gain.setValueAtTime(0, stepTime);
        leadGain.gain.linearRampToValueAtTime(0.12, stepTime + 0.002);
        leadGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.15);
      } else if (isCyberpunk) {
        // Distorted industrial saw lead guitar simulation
        leadOsc.type = 'sawtooth';
        
        const distNode = ctx.createWaveShaper();
        distNode.curve = makeDistortionCurve(60);
        distNode.oversample = '4x';
        
        leadFilter.type = 'lowpass';
        leadFilter.frequency.setValueAtTime(3200, stepTime);
        leadFilter.frequency.exponentialRampToValueAtTime(450, stepTime + 0.25);
        
        leadGain.gain.setValueAtTime(0, stepTime);
        leadGain.gain.linearRampToValueAtTime(0.08, stepTime + 0.005);
        leadGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.28);
        
        leadOsc.connect(distNode);
        distNode.connect(leadFilter);
      } else if (isLofi || isRnb) {
        // Warm Rhodes/Jazz Piano Key timbre
        leadOsc.type = 'triangle';
        leadFilter.type = 'lowpass';
        leadFilter.frequency.setValueAtTime(1400, stepTime);
        leadFilter.frequency.exponentialRampToValueAtTime(180, stepTime + 0.35);
        
        leadGain.gain.setValueAtTime(0, stepTime);
        leadGain.gain.linearRampToValueAtTime(0.14, stepTime + 0.015);
        leadGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.42);
        
        leadOsc.connect(leadFilter);
      } else if (isAfrobeats || isHighlife) {
        // Occasionally trigger a brilliant brass horn stab for signature afro-fusion horn sections
        const isHornStab = (step === 0 || step === 4) && Math.random() > 0.65;
        if (isHornStab) {
          [chord[0] + 12, chord[1] + 12, chord[2] + 12].forEach((hornMidi, idx) => {
            const hOsc = ctx.createOscillator();
            const hGain = ctx.createGain();
            const hFilter = ctx.createBiquadFilter();
            
            hOsc.type = 'sawtooth';
            hFilter.type = 'bandpass';
            hFilter.frequency.setValueAtTime(1100 + (idx * 220), stepTime);
            hFilter.Q.setValueAtTime(1.8, stepTime);
            
            hGain.gain.setValueAtTime(0, stepTime);
            hGain.gain.linearRampToValueAtTime(0.045, stepTime + 0.04);
            hGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.3);
            
            hOsc.frequency.setValueAtTime(midiToFreq(hornMidi), stepTime);
            hOsc.connect(hFilter);
            hFilter.connect(hGain);
            hGain.connect(leadVolumeScaler);
            
            hOsc.start(stepTime);
            hOsc.stop(stepTime + 0.35);
          });
          continue; // Horn takes the stage for this step!
        } else {
          // Beautiful bright Plucked Guitar / Marimba pluck timbre
          leadOsc.type = 'triangle';
          
          // Brief noise burst for initial finger pluck attack
          const noiseLength = sampleRate * 0.015;
          const noiseBuffer = ctx.createBuffer(1, noiseLength, sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < noiseLength; i++) output[i] = Math.random() * 2 - 1;
          const noiseSrc = ctx.createBufferSource();
          noiseSrc.buffer = noiseBuffer;
          
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.12, stepTime);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.012);
          noiseSrc.connect(noiseGain);
          noiseGain.connect(leadVolumeScaler);
          noiseSrc.start(stepTime);
 
          leadFilter.type = 'lowpass';
          leadFilter.frequency.setValueAtTime(2600, stepTime);
          leadFilter.frequency.exponentialRampToValueAtTime(350, stepTime + 0.25);
          
          leadGain.gain.setValueAtTime(0, stepTime);
          leadGain.gain.linearRampToValueAtTime(0.15, stepTime + 0.004);
          leadGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.28);
          
          leadOsc.connect(leadFilter);
        }
      } else if (isAcoustic) {
        // Double Plucked Guitar Pluck / String timbre
        leadOsc.type = 'sine';
        
        // Brief noise burst for initial finger pluck attack
        const noiseLength = sampleRate * 0.015;
        const noiseBuffer = ctx.createBuffer(1, noiseLength, sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseLength; i++) output[i] = Math.random() * 2 - 1;
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuffer;
        
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.1, stepTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.01);
        noiseSrc.connect(noiseGain);
        noiseGain.connect(leadVolumeScaler);
        noiseSrc.start(stepTime);

        leadFilter.type = 'lowpass';
        leadFilter.frequency.setValueAtTime(2500, stepTime);
        leadFilter.frequency.exponentialRampToValueAtTime(280, stepTime + 0.3);
        
        leadGain.gain.setValueAtTime(0, stepTime);
        leadGain.gain.linearRampToValueAtTime(0.12, stepTime + 0.005);
        leadGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.32);
        
        leadOsc.connect(leadFilter);
      } else if (isReggae) {
        // Bubbling organ chords hitting in offset rhythm
        leadOsc.type = 'triangle';
        leadFilter.type = 'lowpass';
        leadFilter.frequency.setValueAtTime(1200, stepTime);
        
        leadGain.gain.setValueAtTime(0, stepTime);
        leadGain.gain.linearRampToValueAtTime(0.12, stepTime + 0.01);
        leadGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.2);
        
        leadOsc.connect(leadFilter);
      } else if (isAlternative) {
        // Heavy rock fuzzy/distorted rhythm chord or feedback
        leadOsc.type = 'sawtooth';
        
        const distNode = ctx.createWaveShaper();
        distNode.curve = makeDistortionCurve(80);
        
        leadFilter.type = 'lowpass';
        leadFilter.frequency.setValueAtTime(1800, stepTime);
        
        leadGain.gain.setValueAtTime(0, stepTime);
        leadGain.gain.linearRampToValueAtTime(0.06, stepTime + 0.01);
        leadGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.3);
        
        leadOsc.connect(distNode);
        distNode.connect(leadFilter);
      } else {
        // Default clean sine bell
        leadOsc.type = 'sine';
        leadFilter.type = 'lowpass';
        leadFilter.frequency.setValueAtTime(1500, stepTime);
        
        leadGain.gain.setValueAtTime(0, stepTime);
        leadGain.gain.linearRampToValueAtTime(0.1, stepTime + 0.01);
        leadGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.4);
        
        leadOsc.connect(leadFilter);
      }
      
      // Smooth vibrato / pitch modulation LFO
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(5.0 + Math.random() * 2, stepTime);
      lfoGain.gain.setValueAtTime(1.8 + Math.random() * 2, stepTime);
      lfo.connect(lfoGain);
      lfoGain.connect(leadOsc.frequency);
      lfo.start(stepTime);
      
      leadOsc.frequency.setValueAtTime(freq, stepTime);
      leadFilter.connect(leadGain);
      leadGain.connect(leadVolumeScaler);
      
      leadOsc.start(stepTime);
      leadOsc.stop(stepTime + secondsPerBeat * 0.52);
      lfo.stop(stepTime + secondsPerBeat * 0.52);
      
      // Delay / Echo simulator
      const delayTime = stepTime + (secondsPerBeat * 0.25);
      if (delayTime < durationSec - 0.2) {
        const echoOsc = ctx.createOscillator();
        const echoGain = ctx.createGain();
        echoOsc.type = leadOsc.type;
        echoOsc.frequency.setValueAtTime(freq, delayTime);
        
        echoGain.gain.setValueAtTime(0, delayTime);
        echoGain.gain.linearRampToValueAtTime(isLofi ? 0.05 : 0.03, delayTime + 0.01);
        echoGain.gain.exponentialRampToValueAtTime(0.001, delayTime + secondsPerBeat * 0.25);
        
        echoOsc.connect(echoGain);
        echoGain.connect(leadVolumeScaler);
        echoOsc.start(delayTime);
        echoOsc.stop(delayTime + secondsPerBeat * 0.3);
      }
    }
    
    // --- ACCORDING GENRE DRUM & RHYTHMIC BEATS ---
    const hasDrums = instrumentIds.includes('drums') || !isAmbient;
    if (hasDrums) {
      if (isAfrobeats || isAmapiano || isDancehall) {
        // 16-step highly syncopated Afrobeat, Amapiano & Dancehall drum-machine
        const stepDuration = secondsPerBeat * 0.25;
        for (let step = 0; step < 16; step++) {
          const stepTime = time + (step * stepDuration);
          if (stepTime >= durationSec - 0.05) break;

          // A. KICK DRUM (Bouncy, heavy foundation)
          let playKick = (step === 0 || step === 4 || step === 8 || step === 12);
          if (isDancehall) {
            // Dancehall Dembow kick emphasis on beats 1 and 3, plus syncopations
            playKick = (step === 0 || step === 8 || step === 4 || step === 12);
          }
          if (options?.density === 'Sparse') {
            playKick = (step === 0 || step === 8);
          } else {
            // Add a subtle syncopated ghost kick on step 14 sometimes to create a bouncing roll
            if (step === 14 && Math.floor(time / (secondsPerBeat * 4)) % 2 === 0 && !isDancehall) {
              playKick = true;
            }
          }

          if (playKick) {
            const kickOsc = ctx.createOscillator();
            const kickGain = ctx.createGain();
            
            kickOsc.frequency.setValueAtTime(isAmapiano ? 120 : 130, stepTime);
            kickOsc.frequency.exponentialRampToValueAtTime(isAmapiano ? 40 : 45, stepTime + 0.11);
            
            const vol = (step === 0 || step === 8) ? 1.0 : 0.65;
            kickGain.gain.setValueAtTime(vol, stepTime);
            kickGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.12);
            
            kickOsc.connect(kickGain);
            kickGain.connect(drumsVolumeScaler);
            kickOsc.start(stepTime);
            kickOsc.stop(stepTime + 0.14);
          }

          // B. SYNCOPATED RIMSHOT / SNARE (Afrobeat: 3-3-2-2 / Dancehall Dembow: 3-6-11-14)
          let playRim = (step === 3 || step === 6 || step === 10 || step === 14);
          if (isDancehall) {
            // Authentic Dembow snare timing!
            playRim = (step === 3 || step === 6 || step === 11 || step === 14);
          }
          if (options?.density === 'Sparse') {
            playRim = isDancehall ? (step === 3 || step === 11) : (step === 3 || step === 10);
          } else if (options?.density === 'Dense') {
            playRim = (step === 3 || step === 6 || step === 8 || step === 10 || step === 14);
          }

          if (playRim) {
            // Highly realistic physical stick contact click
            const rimOsc = ctx.createOscillator();
            const rimGain = ctx.createGain();
            rimOsc.type = 'triangle';
            rimOsc.frequency.setValueAtTime(1200, stepTime);
            rimOsc.frequency.exponentialRampToValueAtTime(180, stepTime + 0.015);
            rimGain.gain.setValueAtTime(0.18, stepTime);
            rimGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.025);
            rimOsc.connect(rimGain);
            rimGain.connect(drumsVolumeScaler);
            rimOsc.start(stepTime);
            rimOsc.stop(stepTime + 0.03);

            // Shimmering wooden shell resonance noise
            const bufferSize = sampleRate * 0.04;
            const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
            
            const rimNoise = ctx.createBufferSource();
            rimNoise.buffer = noiseBuffer;
            
            const rimFilter = ctx.createBiquadFilter();
            rimFilter.type = 'bandpass';
            rimFilter.frequency.setValueAtTime(2400, stepTime);
            rimFilter.Q.setValueAtTime(4.0, stepTime);
            
            const rimGainNode = ctx.createGain();
            rimGainNode.gain.setValueAtTime(0.14, stepTime);
            rimGainNode.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.03);
            
            rimNoise.connect(rimFilter);
            rimFilter.connect(rimGainNode);
            rimGainNode.connect(drumsVolumeScaler);
            
            rimNoise.start(stepTime);
            rimNoise.stop(stepTime + 0.04);
          }

          // C. ORGANIC HAND PERCUSSION: CONGAS / TOMS (Bouncing low-mid accents)
          let playConga = (step === 2 || step === 5 || step === 10 || step === 13);
          if (playConga && !playKick) {
            const congaOsc = ctx.createOscillator();
            const congaGain = ctx.createGain();
            
            congaOsc.type = 'triangle';
            congaOsc.frequency.setValueAtTime(170 + (step % 3) * 25, stepTime); // varied pitch
            congaOsc.frequency.exponentialRampToValueAtTime(80, stepTime + 0.08);
            
            congaGain.gain.setValueAtTime(0.32, stepTime);
            congaGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.09);
            
            congaOsc.connect(congaGain);
            congaGain.connect(drumsVolumeScaler);
            congaOsc.start(stepTime);
            congaOsc.stop(stepTime + 0.1);
          }

          // D. CRISP ROLLING EGG SHAKERS WITH HUMANIZED TIMING SWING (Laid back groove)
          let playShaker = true;
          if (options?.density === 'Sparse') {
            playShaker = (step % 2 === 0);
          }

          if (playShaker) {
            const bufferSize = sampleRate * 0.02;
            const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
            
            const shakerNoise = ctx.createBufferSource();
            shakerNoise.buffer = noiseBuffer;
            
            const shakerFilter = ctx.createBiquadFilter();
            shakerFilter.type = 'highpass';
            shakerFilter.frequency.setValueAtTime(11000, stepTime);
            
            let shakerVol = 0.015;
            if (step % 4 === 2) shakerVol = 0.045; // Off-beat accent (&)
            else if (step % 2 === 0) shakerVol = 0.028; // Ticking rhythm
            
            const shakerGainNode = ctx.createGain();
            shakerGainNode.gain.setValueAtTime(shakerVol, stepTime);
            shakerGainNode.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.015);
            
            shakerNoise.connect(shakerFilter);
            shakerFilter.connect(shakerGainNode);
            shakerGainNode.connect(drumsVolumeScaler);
            
            // Apply a 14% micro-time delay to the offbeat shakers to give a gorgeous African groove swing
            let shakerTime = stepTime;
            if (step % 2 !== 0) {
              shakerTime += stepDuration * 0.14;
            }
            
            shakerNoise.start(shakerTime);
            shakerNoise.stop(shakerTime + 0.02);
          }

          // E. 2024 AMAPIANO LOG DRUM (Rubbery pitched woody sub sweeps using triangle waves)
          let playLogDrum = (step === 2 || step === 5 || step === 8 || step === 11 || step === 13) && (Math.floor(time / (secondsPerBeat * 4)) % 2 === 0);
          if (isAmapiano) {
            // Hyper-authentic rolls and sweeps for Amapiano!
            playLogDrum = (step === 2 || step === 5 || step === 8 || step === 11 || step === 13 || step === 14 || step === 15);
          }
          if (options?.density === 'Sparse') {
            playLogDrum = (step === 2 || step === 8) && (Math.floor(time / (secondsPerBeat * 4)) % 2 === 0);
          } else if (options?.density === 'Dense' && !isAmapiano) {
            playLogDrum = (step === 2 || step === 5 || step === 8 || step === 10 || step === 11 || step === 13 || step === 15);
          }

          if (playLogDrum) {
            const logOsc = ctx.createOscillator();
            const logGain = ctx.createGain();
            const logFilter = ctx.createBiquadFilter();

            logOsc.type = 'triangle'; // Rubbery woody log drum knock!
            const bassFreq = midiToFreq(chord[0] - 24); // Chord root low octave
            logOsc.frequency.setValueAtTime(bassFreq * 1.6, stepTime);
            logOsc.frequency.exponentialRampToValueAtTime(bassFreq * 0.8, stepTime + 0.12);
            
            logFilter.type = 'lowpass';
            logFilter.frequency.setValueAtTime(320, stepTime);
            logFilter.frequency.exponentialRampToValueAtTime(100, stepTime + 0.14);
            
            logGain.gain.setValueAtTime(0.28, stepTime);
            logGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.15);
            
            logOsc.connect(logFilter);
            logFilter.connect(logGain);
            logGain.connect(bassVolumeScaler);
            
            logOsc.start(stepTime);
            logOsc.stop(stepTime + 0.18);
          }

          // F. ACOUSTIC MELODIC BASSLINE (Smooth deep bass guitar groove)
          // Lock in when Amapiano log-drums are resting for rhythmic call-and-response!
          let playAfroBass = (step === 0 || step === 3 || step === 6 || step === 8 || step === 11 || step === 14) && !playLogDrum;
          if (playAfroBass) {
            const bassMidi = chord[step % 2 === 0 ? 0 : 2] - 24; // alternating root and 5th
            const bassFreq = midiToFreq(bassMidi);
            
            const bassOscNode = ctx.createOscillator();
            const bassGainNode = ctx.createGain();
            const bassFilterNode = ctx.createBiquadFilter();
            
            bassOscNode.type = 'triangle'; // Warm acoustic bass sound
            
            bassFilterNode.type = 'lowpass';
            bassFilterNode.frequency.setValueAtTime(140, stepTime);
            
            bassGainNode.gain.setValueAtTime(0.18, stepTime);
            bassGainNode.gain.exponentialRampToValueAtTime(0.001, stepTime + stepDuration * 0.85);
            
            bassOscNode.frequency.setValueAtTime(bassFreq, stepTime);
            
            bassOscNode.connect(bassFilterNode);
            bassFilterNode.connect(bassGainNode);
            bassGainNode.connect(bassVolumeScaler);
            
            bassOscNode.start(stepTime);
            bassOscNode.stop(stepTime + stepDuration * 0.9);
          }
        }
      } else {
        for (let step = 0; step < 4; step++) {
          const beatTime = time + (step * secondsPerBeat);
          if (beatTime >= durationSec - 0.1) break;
          
          // 1. KICK DRUM SYNTHESIS (Tailored per genre)
          let playKick = false;
          let kickFreq = 145;
          let kickDecay = 0.12;
          let kickVolume = 1.1;

          if (isReggae) {
            // "One Drop" beat: kick hits only on beat 3 (step === 2)
            playKick = (step === 2);
            kickFreq = 110;
          } else if (isTrap || isDrill) {
            // Heavy Trap/Drill syncopated low kick
            playKick = (step === 0 || (step === 2 && Math.random() > 0.45));
            kickFreq = 115;
            kickDecay = 0.14;
            kickVolume = 1.25;
          } else if (isCyberpunk || isPop) {
            // Four on the floor kick
            playKick = true;
            kickFreq = 150;
            kickDecay = 0.1;
          } else if (isLofi) {
            // Lazy, warm kick
            playKick = (step === 0 || (step === 2 && Math.random() > 0.4));
            kickFreq = 120;
            kickDecay = 0.14;
            kickVolume = 0.8;
          } else if (isHiphop || isRnb) {
            // Boom bap syncopated kicks
            playKick = (step === 0 || (step === 2 && Math.random() > 0.6) || (step === 1 && Math.random() > 0.7));
            kickFreq = 135;
          } else {
            // Default beat
            playKick = (step === 0 || step === 2);
          }

          if (options?.density === 'Sparse') {
            playKick = playKick && (step === 0 || step === 2);
          } else if (options?.density === 'Dense') {
            if (step === 1 && Math.random() > 0.5) playKick = true;
            if (step === 3 && Math.random() > 0.6) playKick = true;
          }

          if (playKick) {
            const kickOsc = ctx.createOscillator();
            const kickGain = ctx.createGain();
            
            kickOsc.frequency.setValueAtTime(kickFreq, beatTime);
            kickOsc.frequency.exponentialRampToValueAtTime(0.01, beatTime + kickDecay - 0.01);
            
            kickGain.gain.setValueAtTime(kickVolume, beatTime);
            kickGain.gain.exponentialRampToValueAtTime(0.001, beatTime + kickDecay);
            
            kickOsc.connect(kickGain);
            kickGain.connect(drumsVolumeScaler);
            
            kickOsc.start(beatTime);
            kickOsc.stop(beatTime + kickDecay + 0.02);
          }
          
          // 2. SNARE / CLAP SYNTHESIS (Tailored per genre)
          let playSnare = false;
          let snareFreq = 1150;
          let snareDecay = 0.12;
          let snareVol = 0.25;

          if (isReggae) {
            // Snare hits together with the kick strictly on beat 3
            playSnare = (step === 2);
            snareFreq = 1300;
          } else if (isTrap || isDrill) {
            // Sharp modern Trap/Drill clap/snare strictly on Beat 3 (step === 2)
            playSnare = (step === 2);
            snareFreq = 1380;
            snareDecay = 0.09;
            snareVol = 0.32;
          } else if (isLofi) {
            playSnare = (step === 1 || step === 3);
            snareFreq = 750;
            snareVol = 0.16;
          } else if (isCyberpunk || isPop) {
            playSnare = (step === 1 || step === 3);
            snareFreq = 1250;
            snareVol = 0.28;
          } else {
            // Standard snare backbeat on 2 and 4
            playSnare = (step === 1 || step === 3);
          }

          if (options?.density === 'Sparse') {
            playSnare = playSnare && (step === 1);
          } else if (options?.density === 'Dense') {
            if (step === 2 && Math.random() > 0.4) playSnare = true;
          }

          if (playSnare) {
            const bufferSize = sampleRate * snareDecay;
            const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
            
            const snareNoise = ctx.createBufferSource();
            snareNoise.buffer = noiseBuffer;
            
            const snareFilter = ctx.createBiquadFilter();
            snareFilter.type = 'bandpass';
            snareFilter.frequency.setValueAtTime(snareFreq, beatTime);
            
            const snareGainNode = ctx.createGain();
            snareGainNode.gain.setValueAtTime(snareVol, beatTime);
            snareGainNode.gain.exponentialRampToValueAtTime(0.001, beatTime + snareDecay - 0.01);
            
            snareNoise.connect(snareFilter);
            snareFilter.connect(snareGainNode);
            snareGainNode.connect(drumsVolumeScaler);
            
            snareNoise.start(beatTime);
            snareNoise.stop(beatTime + snareDecay + 0.05);
          }
          
          // 3. HI-HAT CYMBALS / PERCUSSION (Tailored per genre)
          let hatSubSteps = isPhonk || isHyperpop || isTrap || isDrill ? 4 : 2; // Rapid rolls for modern beats
          if (isLofi || isReggae) hatSubSteps = 2; // Lazy groove
          
          if (options?.density === 'Sparse') {
            hatSubSteps = 1;
          } else if (options?.density === 'Dense') {
            hatSubSteps = 4;
          }
          
          for (let hat = 0; hat < hatSubSteps; hat++) {
            const hatTime = beatTime + (hat * secondsPerBeat / hatSubSteps);
            if (hatTime >= durationSec - 0.04) break;
            
            const bufferSize = sampleRate * 0.025;
            const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
            
            const hatNoise = ctx.createBufferSource();
            hatNoise.buffer = noiseBuffer;
            
            const hatFilter = ctx.createBiquadFilter();
            hatFilter.type = 'highpass';
            hatFilter.frequency.setValueAtTime(isLofi ? 7800 : 9500, hatTime);
            
            const hatGainNode = ctx.createGain();
            const hatVol = hat === 0 ? 0.05 : 0.025; // swing volume dynamics
            hatGainNode.gain.setValueAtTime(isLofi ? hatVol * 0.6 : hatVol, hatTime);
            hatGainNode.gain.exponentialRampToValueAtTime(0.001, hatTime + 0.018);
            
            hatNoise.connect(hatFilter);
            hatFilter.connect(hatGainNode);
            hatGainNode.connect(drumsVolumeScaler);
            
            hatNoise.start(hatTime);
            hatNoise.stop(hatTime + 0.025);
          }
        }
      }
    }
  }
  
  padOsc1.stop(durationSec);
  padOsc2.stop(durationSec);
  bassOsc.stop(durationSec);
  
  const renderedBuffer = await ctx.startRendering();
  return bufferToWav(renderedBuffer);
};

const midiToFreq = (note: number): number => {
  return 440 * Math.pow(2, (note - 69) / 12);
};

