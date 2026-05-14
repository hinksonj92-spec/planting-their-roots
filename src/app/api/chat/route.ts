import { NextRequest, NextResponse } from 'next/server';

// Import all content data for the system prompt context
import weeklyGuides from '@/data/weekly-guides.json';
import momentCards from '@/data/moment-cards.json';
import rhythmSheets from '@/data/rhythm-sheets.json';
import milestones from '@/data/milestones.json';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

function buildSystemPrompt(band: number, childName: string): string {
  const bandGuides = weeklyGuides.filter((g: Record<string, unknown>) => g.band === band);
  const bandCards = momentCards.filter((c: Record<string, unknown>) => c.band === band);
  const bandMilestones = milestones.filter((m: Record<string, unknown>) => m.band === band);
  const bandRhythm = rhythmSheets.find((r: Record<string, unknown>) => r.band === band);

  return `You are the Evergreen Homeschool parenting assistant for Planting Roots (Phase 0) — a developmental formation guide for ages 0-4 that builds the human substrate a child needs.

You are helping a parent with their child named ${childName} who is in Band ${band} (${band === 1 ? 'Infant, 0-12 months' : band === 2 ? 'Toddler, 12-30 months' : 'Pre-Phase 1, 30-48 months'}).

Planting Roots covers 7 developmental domains:
- LANG: Language & Communication
- MOTR: Motor Development
- NUMR: Numeracy & Logic
- SOCL: Social & Emotional
- ROUT: Routine & Structure
- SENS: Sensory Exploration
- INDP: Independence & Self-Help

Planting Roots uses a 7-week rotating cycle. Each week focuses on a domain with daily moments, parent frames, and practical activities.

Here is all the content for Band ${band}:

WEEKLY GUIDES:
${JSON.stringify(bandGuides, null, 1)}

MOMENT CARDS:
${JSON.stringify(bandCards, null, 1)}

MILESTONES:
${JSON.stringify(bandMilestones, null, 1)}

DAILY RHYTHM:
${JSON.stringify(bandRhythm, null, 1)}

IMPORTANT GUIDELINES:
- Answer based ONLY on the Planting Roots content above. Do not invent or hallucinate content.
- Be warm, encouraging, and practical. Parents using this are busy.
- Keep responses concise — 2-4 short paragraphs max unless more detail is asked for.
- Reference specific weekly guides, moments, or milestones when relevant.
- If asked about something outside the Planting Roots content, acknowledge it and gently redirect to what Planting Roots covers.
- Never give medical advice. If a parent has health concerns, suggest they talk to their pediatrician.
- Use the child's name naturally in conversation.`;
}

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'AI chat is not configured. Please add a GEMINI_API_KEY.' },
      { status: 500 }
    );
  }

  try {
    const { messages, band, childName } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required.' }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(band || 2, childName || 'your child');

    // Build Gemini conversation format
    const geminiContents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: `Hi! I'm your Evergreen Homeschool assistant. I'm here to help with ${childName || 'your child'}'s developmental journey. What would you like to know?` }] },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    ];

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.9,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to get response from AI.' },
        { status: 502 }
      );
    }

    const data = await response.json();
    // Gemini 2.5 may return multiple parts (thinking + text); extract the text part
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find((p: { text?: string; thought?: boolean }) => p.text && !p.thought);
    const reply = textPart?.text || parts[parts.length - 1]?.text;

    if (!reply) {
      return NextResponse.json(
        { error: 'No response generated.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
