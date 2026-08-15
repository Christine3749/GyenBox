import { fail, ok } from '@/lib/api-response';
import { requireActor } from '@/lib/ownership';

export const runtime = 'nodejs';

const MODEL = /^[a-z0-9][a-z0-9._-]{1,120}$/i;
const MAX_TOKEN_LENGTH = 512;
const MAX_NOTE_COUNT = 60;
const MAX_TEXT_LENGTH = 6000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function text(value: unknown, max = MAX_TEXT_LENGTH) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function notes(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_NOTE_COUNT).map((note) => {
    const row = note && typeof note === 'object' ? note as Record<string, unknown> : {};
    return { id: text(row.id, 120), title: text(row.title, 300), content: text(row.content), labels: Array.isArray(row.labels) ? row.labels.map((label) => text(label, 80)).slice(0, 12) : [], updatedAt: text(row.updatedAt, 64) };
  }).filter((note) => note.id);
}

function image(value: Record<string, unknown>) {
  const data = typeof value.imageData === 'string' ? value.imageData : '';
  const mimeType = typeof value.mimeType === 'string' ? value.mimeType : '';
  if (!IMAGE_TYPES.has(mimeType) || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return null;
  const bytes = Math.floor((data.length * 3) / 4);
  if (bytes === 0 || bytes > MAX_IMAGE_BYTES) return null;
  return { data, mimeType };
}

function promptFor(action: string, payload: Record<string, unknown>) {
  const language = payload.language === 'en' ? 'English' : 'Chinese';
  const library = notes(payload.notes);
  if (action === 'health') return 'Return JSON only: {"ok":true}';
  if (action === 'semantic-search') return `Return JSON only: {"results":[{"id":"note id","whyMatch":"short reason"}]}. Find the most relevant notes for this query: ${JSON.stringify(text(payload.query, 500))}. Notes: ${JSON.stringify(library)}. Reply in ${language}.`;
  if (action === 'overview') return `Return JSON only: {"summary":"short","duplicatesToMerge":[{"noteIdA":"","noteIdB":"","reason":"","mergedTitle":"","mergedContent":""}],"staleNotesToArchive":[{"id":"","reason":""}]}. Suggest only supported IDs from these notes, with conservative recommendations. Notes: ${JSON.stringify(library)}. Reply in ${language}.`;
  if (action === 'analyze-note') return `Return JSON only: {"suggestedTags":[""],"relatedNotes":[{"id":"","reason":""}]}. Analyze this note and choose only tags from the provided list and note IDs from the related library. Note: ${JSON.stringify({ title: text(payload.title, 300), content: text(payload.content), labels: Array.isArray(payload.labels) ? payload.labels.slice(0, 30) : [] })}. Library: ${JSON.stringify(library)}. Reply in ${language}.`;
  if (action === 'structure-voice') return `Return JSON only: {"title":"","type":"text"|"list","items":[{"text":"","completed":false}],"noteBody":"","reminder":null,"tags":[]}. Convert this spoken note into a concise usable note. Transcript: ${JSON.stringify(text(payload.transcript))}. Reply in ${language}.`;
  if (action === 'ocr') return `Return JSON only: {"title":"","type":"text"|"list","content":"","items":[{"text":"","completed":false}],"tags":[""]}. Read every legible word in this image, preserve numbers, dates and amounts exactly, and structure tasks as checklist items when appropriate. Do not invent unreadable text. Reply in ${language}.`;
  return null;
}

function parseJson(value: string) {
  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned) as unknown;
}

export async function POST(request: Request) {
  const actor = await requireActor(request);
  if (!actor.ok) return actor.response;

  const apiKey = request.headers.get('x-gyenbox-ai-key')?.trim();
  if (!apiKey || apiKey.length > MAX_TOKEN_LENGTH) return fail('AI_TOKEN_REQUIRED', 'A valid Gemini API Token is required.', 400);

  const body = await request.json().catch(() => null) as { action?: unknown; model?: unknown; payload?: unknown } | null;
  if (!body || typeof body.action !== 'string' || typeof body.model !== 'string' || !MODEL.test(body.model)) return fail('INVALID_AI_REQUEST', 'Invalid AI request.', 400);
  const payload = body.payload && typeof body.payload === 'object' ? body.payload as Record<string, unknown> : {};
  const prompt = promptFor(body.action, payload);
  if (!prompt) return fail('UNSUPPORTED_AI_ACTION', 'Unsupported AI action.', 400);
  const sourceImage = body.action === 'ocr' ? image(payload) : null;
  if (body.action === 'ocr' && !sourceImage) return fail('INVALID_OCR_IMAGE', 'Upload a PNG, JPEG, or WebP image no larger than 8 MB.', 400);

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(body.model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, ...(sourceImage ? [{ inlineData: sourceImage }] : [])] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 2048 },
      }),
    });
    const result = await response.json().catch(() => null) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } } | null;
    if (!response.ok) return fail('AI_PROVIDER_FAILED', result?.error?.message ?? 'Gemini API request failed.', 502);
    const output = result?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();
    if (!output) return fail('AI_EMPTY_RESPONSE', 'Gemini returned no usable response.', 502);
    return ok(parseJson(output));
  } catch (error) {
    return fail('AI_UNAVAILABLE', error instanceof Error ? error.message : 'AI request failed.', 502);
  }
}
