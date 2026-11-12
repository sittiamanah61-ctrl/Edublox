import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Server-side Gemini question generator grounded strictly in the provided material
  app.post('/api/generate-questions', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return res.status(503).json({
          error: 'GEMINI_API_KEY belum dikonfigurasi pada server.',
          fallbackAvailable: true,
        });
      }

      const { count = 3, difficulty = 'Sedang', material } = req.body ?? {};
      if (!material || !material.bab || !material.ringkasan) {
        return res.status(400).json({ error: 'Data materi pembelajaran wajib disertakan.' });
      }

      const safeCount = Math.min(10, Math.max(1, Number(count) || 3));

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `Buat tepat ${safeCount} soal pilihan ganda Bahasa Indonesia untuk siswa SMK Kelas X jurusan Desain Komunikasi Visual (DKV) dengan tingkat kesulitan "${difficulty}".
Gunakan HANYA materi terverifikasi berikut sebagai sumber fakta (jangan mengarang di luar topik ini):
- Bab: ${material.bab}
- Subbab: ${material.subbab}
- Judul: ${material.judul}
- Ringkasan: ${material.ringkasan}
- Konsep Penting: ${(material.konsepPenting || []).join('; ')}
- Istilah Penting: ${(material.istilahPenting || []).map((i: { istilah: string; definisi: string }) => `${i.istilah}: ${i.definisi}`).join('; ')}

Aturan:
1. Setiap soal memiliki 4 pilihan (A, B, C, D) yang masuk akal dan jelas.
2. kunciJawaban harus tepat salah satu dari "A", "B", "C", atau "D".
3. Sertakan pembahasan singkat yang merujuk pada materi di atas.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Anda adalah guru Desain Komunikasi Visual (DKV) SMK Kelas X profesional. Keluarkan hanya JSON sesuai skema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pertanyaan: { type: Type.STRING },
                    pilihanA: { type: Type.STRING },
                    pilihanB: { type: Type.STRING },
                    pilihanC: { type: Type.STRING },
                    pilihanD: { type: Type.STRING },
                    kunciJawaban: { type: Type.STRING },
                    pembahasan: { type: Type.STRING },
                    materi: { type: Type.STRING },
                  },
                  required: [
                    'pertanyaan',
                    'pilihanA',
                    'pilihanB',
                    'pilihanC',
                    'pilihanD',
                    'kunciJawaban',
                    'pembahasan',
                  ],
                },
              },
            },
            required: ['questions'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{"questions":[]}').trim());
      return res.json({ questions: Array.isArray(parsed.questions) ? parsed.questions : [] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghasilkan soal dengan Gemini API';
      return res.status(500).json({ error: msg, fallbackAvailable: true });
    }
  });

  // Server-side URL text extractor to assist Teacher Panel import without browser CORS errors
  app.post('/api/import-url', async (req, res) => {
    try {
      const { url } = req.body ?? {};
      if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        return res.status(400).json({ error: 'URL tidak valid. Gunakan awalan http:// atau https://.' });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Edublox-DKV-Teacher-Importer/1.0' },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return res.status(502).json({ error: `Gagal mengakses URL (HTTP ${response.status}).` });
      }

      const html = await response.text();
      const stripped = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, '\n')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/\n{2,}/g, '\n')
        .trim();

      return res.json({ text: stripped, length: stripped.length });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengambil konten URL.';
      return res.status(500).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*path}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`EDUBLOX CITY BY SITTY running at http://0.0.0.0:${port}`);
  });
}

startServer();
