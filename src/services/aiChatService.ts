import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiConfig } from '../config/environment';
import OnboardingData from '../models/OnboardingData';
import User from '../models/User';
// import { cleanGeminiResponse } from '../utils/gemini';

export interface AIResponse {
  content: string;
  safetyFlag?: boolean;
}

const SYSTEM_COACH_PROMPT = `You are PureHeart, a compassionate, faith-informed recovery coach and crisis companion. Your mission: keep the user safe and help them avoid relapsing into old habits. Be warm, non-judgmental, practical, and encouraging.

Guidelines:
- Safety first. If user expresses intent to self-harm or harm others, respond with urgent, caring language, encourage reaching out to a trusted person, and suggest contacting local emergency services. Offer 988 (US) or local equivalents when needed.
- Gently redirect urges with immediate, actionable steps (grounding, prayer, brief Scripture, urge-surfing).
- Reflect and validate emotions. No platitudes. Keep it personal.
- IMPORTANT: Keep responses very short, 2-3 sentences max. One scripture reference max.
- Stay conversational, like a caring friend. No lectures or long explanations.
- Faith-forward but gentle: a brief prayer OR scripture, not both, plus one simple next step.
- For complex topics, break into smaller pieces; let user ask follow-ups.
- If asked theological questions, be very brief and humble - point to pastoral guidance.`;

export class AIChatService {
  private static getClient() {
    const apiKey = geminiConfig.apiKey;
    if (!apiKey) throw new Error('Gemini API key missing');
    return new GoogleGenerativeAI(apiKey);
  }

  static async generateReply(userId: number, userMessage: string, history: { role: 'user'|'assistant'|'system'; content: string }[]): Promise<AIResponse> {
    const client = this.getClient();
    const model = client.getGenerativeModel({ model: 'gemini-1.5-pro' });

    // Pull onboarding context
    const user = await User.findByPk(userId, { include: [{ model: OnboardingData, as: 'onboardingData' }] as any });
    const contextPieces: string[] = [];
    if ((user as any)?.firstName) contextPieces.push(`Name: ${(user as any).firstName}`);
    const userWithOD: any = user as any;
    if (userWithOD?.onboardingData) {
      const od = userWithOD.onboardingData as any;
      if (od.assessmentData?.primaryStruggle) contextPieces.push(`Primary struggle: ${od.assessmentData.primaryStruggle}`);
      if (od.faithData?.churchDenomination) contextPieces.push(`Faith: ${od.faithData.churchDenomination}`);
      if (od.accountabilityPreferences?.communicationStyle) contextPieces.push(`Prefers: ${od.accountabilityPreferences.communicationStyle}`);
    }

    const systemPreamble = `${SYSTEM_COACH_PROMPT}\nUser Context: ${contextPieces.join(' | ')}`.trim();

    const messages = [
      { role: 'system', content: systemPreamble },
      ...history,
      { role: 'user', content: userMessage }
    ];

    const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return { content: text, safetyFlag: /suicide|kill myself|harm myself|end my life/i.test(userMessage) };
  }

  static async generateReplyStream(
    userId: number,
    userMessage: string,
    history: { role: 'user'|'assistant'|'system'; content: string }[],
    onDelta: (textChunk: string) => void
  ): Promise<AIResponse> {
    const client = this.getClient();
    const model = client.getGenerativeModel({ model: 'gemini-1.5-pro' });

    // Pull onboarding context
    const user = await User.findByPk(userId, { include: [{ model: OnboardingData, as: 'onboardingData' }] as any });
    const contextPieces: string[] = [];
    if ((user as any)?.firstName) contextPieces.push(`Name: ${(user as any).firstName}`);
    const userWithOD: any = user as any;
    if (userWithOD?.onboardingData) {
      const od = userWithOD.onboardingData as any;
      if (od.assessmentData?.primaryStruggle) contextPieces.push(`Primary struggle: ${od.assessmentData.primaryStruggle}`);
      if (od.faithData?.churchDenomination) contextPieces.push(`Faith: ${od.faithData.churchDenomination}`);
      if (od.accountabilityPreferences?.communicationStyle) contextPieces.push(`Prefers: ${od.accountabilityPreferences.communicationStyle}`);
    }

    const systemPreamble = `${SYSTEM_COACH_PROMPT}\nUser Context: ${contextPieces.join(' | ')}`.trim();

    const messages = [
      { role: 'system', content: systemPreamble },
      ...history,
      { role: 'user', content: userMessage }
    ];

    const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

    const result = await model.generateContentStream(prompt);
    let finalText = '';
    for await (const chunk of (result as any).stream) {
      const chunkText = (chunk as any).text ? (chunk as any).text() : '';
      if (chunkText) {
        finalText += chunkText;
        onDelta(chunkText);
      }
    }
    // Ensure we also read aggregated response (in case last tokens aren't captured)
    const aggregated = await (result as any).response;
    const aggregatedText = aggregated?.text?.() ?? '';
    if (aggregatedText && aggregatedText.length > finalText.length) {
      const remainder = aggregatedText.slice(finalText.length);
      if (remainder) {
        finalText = aggregatedText;
        onDelta(remainder);
      }
    }

    return { content: finalText, safetyFlag: /suicide|kill myself|harm myself|end my life/i.test(userMessage) };
  }
}
