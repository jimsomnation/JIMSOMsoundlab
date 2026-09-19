/**
 * GenAI Service (Client Proxy)
 *
 * This module proxies all AI requests through the secure backend /api routes.
 * No API keys or @google/genai instances are ever loaded in client-side code.
 */
import { logFunctionCall } from '../utils/logger';
import { Duration, LyricsOption } from '../../types';

/**
 * Parses the raw text output from the model to separate lyrics from metadata.
 * @param text The raw text output from the model.
 * @returns An object containing the separated lyrics and metadata.
 */
export const parseModelOutput = (text: string): { lyrics: string, metadata: string } => {
  logFunctionCall('parseModelOutput', { textLength: text.length });
  const metaMarkers = /Caption:|Instruments:|Metadata:|Structure:|Description:|Mood:|mosic:|bpm:/i;
  const match = text.search(metaMarkers);
  if (match !== -1) return { lyrics: text.substring(0, match).trim(), metadata: text.substring(match).trim() };
  return { lyrics: text, metadata: '' };
};

/**
 * Generates a song title based on the prompt and lyrics via server API.
 */
export const generateSongTitle = async (musicPrompt: string, lyricContext: string): Promise<string> => {
  logFunctionCall('generateSongTitle', { musicPrompt, lyricContextLength: lyricContext.length });
  try {
    const res = await fetch('/api/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ musicPrompt, lyricContext: lyricContext.substring(0, 500) }),
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    return data.title || 'Lyria Composition';
  } catch (err) {
    console.warn('Failed to generate title via server:', err);
    return 'Lyria Composition';
  }
};

/**
 * Generates cover art for the song via server API.
 */
export const generateCoverArt = async (musicPrompt: string, lyricContext: string, title?: string): Promise<string | null> => {
  logFunctionCall('generateCoverArt', { musicPrompt, lyricContextLength: lyricContext.length, title });
  try {
    const res = await fetch('/api/generate-cover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        musicPrompt,
        lyricContext: lyricContext.substring(0, 200),
        title: title || 'Music',
      }),
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();
    return data.imageUrl || null;
  } catch (err) {
    console.warn('Cover art generation skipped:', err);
    return null;
  }
};

/**
 * Local offline backup lyric generator in case the server fails or no key is configured.
 */
export const generateLocalOfflineLyrics = (musicPrompt: string, duration: Duration): { lyrics: string, title: string } => {
  const p = musicPrompt.toLowerCase();
  let title = "Stellar Voyager";
  let lyrics = `[0:00] Floating out into the stardust glow
[0:05] Leaving all the heavy clouds below
[0:10] We are drifting past the satellite line
[0:15] Caught inside an everlasting design
[0:20] High above, the galaxies align`;

  if (p.includes('rain') || p.includes('storm') || p.includes('sad') || p.includes('melancholy') || p.includes('lost')) {
    title = "Neon Raindrops";
    lyrics = `[0:00] Cold raindrops hitting on the glass
[0:05] Wishing that these memories would pass
[0:10] Neon reflections in the street below
[0:15] Watching all the lonely headlights go
[0:20] Waiting for the morning light to show`;
  } else if (p.includes('drift') || p.includes('phonk') || p.includes('car') || p.includes('aggressive') || p.includes('fast') || p.includes('flame')) {
    title = "Drift Legend";
    lyrics = `[0:00] Tires burning, screaming on the bend
[0:05] Chasing shadows right until the end
[0:10] Engine roaring, flying through the dark
[0:15] Leaving behind a blazing neon spark
[0:20] Speeding past the limits we have set`;
  } else if (p.includes('love') || p.includes('heart') || p.includes('you') || p.includes('together')) {
    title = "Eternal Echoes";
    lyrics = `[0:00] Walked together in the morning breeze
[0:05] Laughing softly underneath the trees
[0:10] Every word you said was like a song
[0:15] Knew that this was where I belonged
[0:20] Heartbeats keeping time all day long`;
  } else if (p.includes('cyber') || p.includes('future') || p.includes('neon') || p.includes('tech') || p.includes('digital') || p.includes('chase')) {
    title = "Silicon Dreams";
    lyrics = `[0:00] Neon lines across the dark skyline
[0:05] Data streams and memories entwine
[0:10] Digital heartbeats pulsing in the wire
[0:15] Burning with a cold electric fire
[0:20] Living in the matrix of desire`;
  }

  if (duration === 'Pro') {
    lyrics += `\n[0:25] (Chorus)\nWe fly beyond the stars tonight\nInto the clear electric light\n[0:35] No turning back, we've broken free\nWriting our own sweet destiny\n[0:45] (Guitar Solo)\n[0:55] The journey carries on and on\nDrifting until the break of dawn`;
  }

  return { lyrics, title };
};

/**
 * Generates custom timed lyrics and a title using the backend API.
 * Falls back gracefully to local offline generation if the API call fails or no key is present.
 */
export const generateSandboxLyricsAndTitle = async (
  musicPrompt: string,
  duration: Duration,
  lyricsOption: LyricsOption,
  customLyrics?: string
): Promise<{ lyrics: string, title: string }> => {
  logFunctionCall('generateSandboxLyricsAndTitle', { musicPrompt, duration, lyricsOption });
  
  if (lyricsOption === 'Instrumental') {
    return { lyrics: '', title: "Instrumental Composition" };
  }
  
  if (lyricsOption === 'Custom' && customLyrics) {
    return { lyrics: customLyrics, title: "Custom Lyric Project" };
  }

  try {
    const res = await fetch('/api/generate-lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        musicPrompt,
        duration,
        lyricsOption,
        customLyrics,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    return {
      lyrics: data.lyrics || '',
      title: data.title || 'Sandbox Track',
    };
  } catch (err) {
    console.warn("Server lyric generation unavailable, using local lyrics engine.", err);
    return generateLocalOfflineLyrics(musicPrompt, duration);
  }
};
