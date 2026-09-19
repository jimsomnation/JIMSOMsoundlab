import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Lazy GoogleGenAI initialization
let genAiClient: GoogleGenAI | null = null;

function getGenAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  if (!genAiClient) {
    genAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAiClient;
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Lyria Music Streaming Generation endpoint
app.post('/api/music/generate', async (req, res) => {
  const { modelId, promptText, images } = req.body;

  try {
    const ai = getGenAiClient();
    const contents: any = Array.isArray(images) && images.length > 0
      ? {
          parts: [
            { text: promptText },
            ...images.map((img: { data: string; mimeType: string }) => ({
              inlineData: { data: img.data, mimeType: img.mimeType },
            })),
          ],
        }
      : promptText;

    const responseStream = await ai.models.generateContentStream({
      model: modelId || 'lyria-3-clip-preview',
      contents,
      config: {
        responseModalities: [Modality.AUDIO],
      },
    });

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of responseStream) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;

      for (const part of parts) {
        if (part.inlineData?.data) {
          res.write(
            `data: ${JSON.stringify({
              type: 'audio',
              data: part.inlineData.data,
              mimeType: part.inlineData.mimeType || 'audio/wav',
            })}\n\n`
          );
        }
        if (part.text) {
          res.write(
            `data: ${JSON.stringify({
              type: 'text',
              text: part.text,
            })}\n\n`
          );
        }
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('Error generating music via Lyria:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Music generation failed.' });
    } else {
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          error: err.message || 'Music generation failed.',
        })}\n\n`
      );
      res.end();
    }
  }
});

// Title generation endpoint
app.post('/api/generate-title', async (req, res) => {
  const { musicPrompt, lyricContext } = req.body;

  try {
    const ai = getGenAiClient();
    const prompt = `Based on this music prompt: "${musicPrompt}" and these lyrics: "${(lyricContext || '').substring(0, 500)}", generate a catchy, evocative, short song title (3 words max). Return ONLY the title string, no quotes or extra text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    res.json({ title: response.text?.trim() || 'Untitled Track' });
  } catch (err: any) {
    console.warn('Title generation fallback:', err.message);
    res.json({ title: 'Lyria Composition' });
  }
});

// Cover art generation endpoint
app.post('/api/generate-cover', async (req, res) => {
  const { musicPrompt, lyricContext, title } = req.body;

  try {
    const ai = getGenAiClient();
    const imagePrompt = `A high-quality, professional square song cover for a music track titled "${title || 'Music'}". Atmosphere: ${musicPrompt}. Context: ${(lyricContext || '').substring(0, 200)}. Abstract, cinematic aesthetic. IMPORTANT: Ignore any mention of BPM or musical scale in the prompt; do NOT print any numbers, BPM, or scale text on the image.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: imagePrompt,
      config: {
        imageConfig: { aspectRatio: '1:1' },
      },
    });

    let imageUrl: string | null = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    res.json({ imageUrl });
  } catch (err: any) {
    console.warn('Cover art generation skipped:', err.message);
    res.json({ imageUrl: null });
  }
});

// Timed Lyrics and Title generation endpoint
app.post('/api/generate-lyrics', async (req, res) => {
  const { musicPrompt, duration, lyricsOption, customLyrics } = req.body;

  if (lyricsOption === 'Instrumental') {
    return res.json({ lyrics: '', title: 'Instrumental Composition' });
  }

  if (lyricsOption === 'Custom' && customLyrics) {
    return res.json({ lyrics: customLyrics, title: 'Custom Lyric Project' });
  }

  try {
    const ai = getGenAiClient();
    const prompt = `You are a professional songwriter. Write a set of beautiful song lyrics for a ${duration === 'Pro' ? 'full-length' : '30-second'} track based on this prompt: "${musicPrompt}".
Include exact timing markers in the format [0:00], [0:05], etc. at the start of every few lines, matching the duration.
Also generate a short catchy song title (3 words max).
Format your response exactly as:
Title: <Title Here>
Lyrics:
<Lyrics Here with [m:ss] timestamps>`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const text = response.text || '';
    let title = 'Sandbox Track';
    let lyrics = '';

    const titleMatch = text.match(/Title:\s*(.*?)\n/i);
    if (titleMatch) title = titleMatch[1].trim();

    const lyricsMatch = text.split(/Lyrics:\s*/i)[1];
    if (lyricsMatch) lyrics = lyricsMatch.trim();
    else lyrics = text;

    res.json({ lyrics, title });
  } catch (err: any) {
    console.warn('Server lyrics generation failed, returning error to trigger offline engine:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Vite dev middleware or production static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JIMSOM soundlab server running on port ${PORT}`);
  });
}

startServer();
