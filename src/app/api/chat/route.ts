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
  // Band 0 = graduated (4+ years). Include all band content so chat has full context.
  const isGraduated = band === 0;
  const bands = isGraduated ? [1, 2, 3] : [band];

  const bandGuides = weeklyGuides.filter((g: Record<string, unknown>) => bands.includes(g.band as number));
  const bandCards = momentCards.filter((c: Record<string, unknown>) => bands.includes(c.band as number));
  const bandMilestones = milestones.filter((m: Record<string, unknown>) => bands.includes(m.band as number));
  const bandRhythm = rhythmSheets.filter((r: Record<string, unknown>) => bands.includes(r.band as number));

  const bandDescription = isGraduated
    ? 'graduated from Planting Roots (4+ years old). They have completed all Phase 0 developmental content.'
    : `in Band ${band} (${band === 1 ? 'Infant, 0-12 months' : band === 2 ? 'Toddler, 12-30 months' : 'Pre-Phase 1, 30-48 months'}).`;

  return `You are the Evergreen Homeschool parenting assistant for Planting Roots (Phase 0) — a developmental formation guide for ages 0-4 that builds the human substrate a child needs.

You are helping a parent with their child named ${childName} who is ${bandDescription}

Planting Roots covers 7 developmental domains:
- LANG: Language & Communication
- MOTR: Motor Development
- NUMR: Numeracy & Logic
- SOCL: Social & Emotional
- ROUT: Routine & Structure
- SENS: Sensory Exploration
- INDP: Independence & Self-Help

Planting Roots uses a 7-week rotating cycle. Each week focuses on a domain with daily moments, parent frames, and practical activities.

${isGraduated ? 'Here is all the Planting Roots content across all bands (for reference on their developmental journey):' : `Here is all the content for Band ${band}:`}

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
- Use the child's name naturally in conversation.${isGraduated ? '\n- This child has graduated from Phase 0. You can help the parent reflect on their journey and answer questions about what was covered. If they ask about next steps, mention that the Evergreen curriculum continues with structured pillars and domains in the next phases.' : ''}`;
}

function buildMultiChildPrompt(children: { name: string; band: number; age: string }[]): string {
  // Collect unique bands across all children
  const uniqueBands = [...new Set(children.map(c => c.band))];
  // For graduated children (band 0), include all bands
  const allBands = uniqueBands.includes(0)
    ? [...new Set([1, 2, 3, ...uniqueBands.filter(b => b > 0)])]
    : uniqueBands;

  const bandGuides = weeklyGuides.filter((g: Record<string, unknown>) => allBands.includes(g.band as number));
  const bandCards = momentCards.filter((c: Record<string, unknown>) => allBands.includes(c.band as number));
  const bandMilestones = milestones.filter((m: Record<string, unknown>) => allBands.includes(m.band as number));
  const bandRhythm = rhythmSheets.filter((r: Record<string, unknown>) => allBands.includes(r.band as number));

  const childDescriptions = children.map(c => {
    if (c.band === 0) return `- ${c.name} (${c.age}, graduated from Phase 0)`;
    const bandLabel = c.band === 1 ? 'Infant' : c.band === 2 ? 'Toddler' : 'Pre-Phase 1';
    return `- ${c.name} (${c.age}, Band ${c.band} — ${bandLabel})`;
  }).join('\n');

  return `You are the Evergreen Homeschool parenting assistant for Planting Roots (Phase 0) — a developmental formation guide for ages 0-4.

You are helping a parent with MULTIPLE children:
${childDescriptions}

When answering, consider ALL these children and their different developmental stages. Reference each child by name when giving age-specific advice. Help the parent find activities and approaches that work across different ages when possible.

Planting Roots covers 7 developmental domains:
- LANG: Language & Communication
- MOTR: Motor Development
- NUMR: Numeracy & Logic
- SOCL: Social & Emotional
- ROUT: Routine & Structure
- SENS: Sensory Exploration
- INDP: Independence & Self-Help

Here is the content across all relevant bands:

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
- Reference specific children by name and note which content applies to which child.
- When possible, suggest how activities can be adapted to work for multiple ages at once.
- Never give medical advice. If a parent has health concerns, suggest they talk to their pediatrician.`;
}

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'AI chat is not configured. Please add a GEMINI_API_KEY.' },
      { status: 500 }
    );
  }

  try {
    const { messages, band, childName, children: childrenArray } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required.' }, { status: 400 });
    }

    // Multi-child support: if children array provided with multiple entries, build combined prompt
    let systemPrompt: string;
    if (childrenArray && Array.isArray(childrenArray) && childrenArray.length > 1) {
      systemPrompt = buildMultiChildPrompt(childrenArray);
    } else {
      systemPrompt = buildSystemPrompt(band || 2, childName || 'your child');
    }

    // Cap conversation history to last 30 messages to stay within token limits.
    // The system prompt + content data can be 10-20k tokens; Gemini 2.5 Flash
    // has a large context but we want fast responses and low cost.
    const MAX_HISTORY = 30;
    const recentMessages = messages.length > MAX_HISTORY
      ? messages.slice(-MAX_HISTORY)
      : messages;

    // Build Gemini conversation format
    const geminiContents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: `Hi! I'm your Evergreen Homeschool assistant. I'm here to help with ${childrenArray && childrenArray.length > 1 ? 'your children\'s' : (childName || 'your child') + '\'s'} developmental journey. What would you like to know?` }] },
      ...recentMessages.map((m: { role: string; content: string }) => ({
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
