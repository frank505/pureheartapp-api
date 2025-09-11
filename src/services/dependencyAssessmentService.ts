import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiConfig } from '../config/environment';

export interface DependencyAssessmentInput {
	// Free-form narrative about user habits / history
	narrative?: string;
	// Optional structured answers (could be any shape coming from client questionnaire)
	answers?: Record<string, any>;
}

export interface DependencyAssessmentResult {
	score: number; // 40 - 100
	reasoning: string;
	raw?: string; // raw model text for debugging
}

function getClient() {
	if (!geminiConfig.apiKey) throw new Error('Gemini API key missing');
	return new GoogleGenerativeAI(geminiConfig.apiKey);
}

const SYSTEM_INSTRUCTIONS = `You are an assistant that estimates a USER'S CURRENT LEVEL OF PORN DEPENDENCY.
Return ONLY a short JSON object: {"score": <number 40-100>, "reasoning": "one concise sentence"}.
Rules:
- score MUST be an integer between 40 and 100 (never below 40, never above 100).
- 40-49: emerging dependency signals (early risk)
- 50-59: moderate habitual use with some control issues
- 60-69: significant habitual use impacting routines or mood
- 70-79: high dependency with notable loss of control & escalation patterns
- 80-89: severe dependency, frequent compulsive use, clear negative impacts
- 90-100: extreme dependency, pervasive intrusion & failed reduction attempts
- Keep reasoning neutral, non-shaming, 1 short sentence.
DO NOT add extra commentary.
`;

export async function assessDependency(input: DependencyAssessmentInput): Promise<DependencyAssessmentResult> {
	const client = getClient();
	const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

	const payload = {
		narrative: input.narrative || '',
		answers: input.answers || {},
	};

	const userSummary = JSON.stringify(payload, null, 2);

	const prompt = `${SYSTEM_INSTRUCTIONS}\nUSER_DATA:\n${userSummary}`;

	let text = '';
	try {
		const result = await model.generateContent(prompt);
		text = result.response.text();
	} catch (err: any) {
		// Fallback simple heuristic: baseline 55
		return { score: 55, reasoning: 'Baseline estimate (model unavailable)', raw: err?.message };
	}

	// Try to parse JSON first
	let score: number | null = null;
	let reasoning = '';

	// Extract JSON block if present
	const jsonMatch = text.match(/\{[\s\S]*\}/);
	if (jsonMatch) {
		try {
			const parsed = JSON.parse(jsonMatch[0]);
			if (typeof parsed.score === 'number') score = parsed.score;
			if (typeof parsed.reasoning === 'string') reasoning = parsed.reasoning.trim();
		} catch (_) {
			// ignore and fallback to regex parse
		}
	}

		if (score == null) {
			const numMatch = text.match(/(\d{2,3})/);
			if (numMatch && numMatch[1]) score = parseInt(numMatch[1], 10);
		}

	if (reasoning === '') {
		// Grab first sentence-ish
		const sent = text.split(/\n|\.|!/).map(s => s.trim()).filter(Boolean)[0];
		reasoning = sent ? sent.replace(/^["']|["']$/g, '') : 'Estimated level based on provided patterns';
	}

	if (typeof score !== 'number' || isNaN(score)) score = 55; // default
	// Clamp to 40-100 and ensure integer
	score = Math.round(Math.min(100, Math.max(40, score)));
	if (score < 40) score = 40; // double safety
	if (score > 100) score = 100;

	return { score, reasoning, raw: text };
}

