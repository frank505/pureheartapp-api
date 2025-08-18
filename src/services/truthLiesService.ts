import { GoogleGenerativeAI } from '@google/generative-ai';
import { Op } from 'sequelize';
import { OnboardingState } from '../types/auth';
import TruthLies from '../models/TruthLies';
import OnboardingData from '../models/OnboardingData';
import { cleanGeminiResponse } from '../utils/gemini';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

interface TruthLieResponse {
  lie: string;
  biblicalTruth: string;
  explanation: string;
  isDefault: boolean;
}

// Default lies as fallback
const commonAddictionLies: TruthLieResponse[] = [
  {
    lie: "I can't change, this is just who I am",
    biblicalTruth: "Therefore, if anyone is in Christ, he is a new creation. The old has passed away; behold, the new has come. - 2 Corinthians 5:17",
    explanation: "God's power to transform lives is greater than any addiction or habit. Through Christ, we can become entirely new people.",
    isDefault: true
  },
  {
    lie: "I'm too far gone for God to love me",
    biblicalTruth: "But God shows his love for us in that while we were still sinners, Christ died for us. - Romans 5:8",
    explanation: "God's love is not conditional on our behavior. He loved us even when we were at our worst.",
    isDefault: true
  },
  {
    lie: "I'll never be free from this addiction",
    biblicalTruth: "So if the Son sets you free, you will be free indeed. - John 8:36",
    explanation: "True freedom is possible through Christ. His power can break any chain of addiction.",
    isDefault: true
  },
  {
    lie: "No one understands what I'm going through",
    biblicalTruth: "For we do not have a high priest who is unable to sympathize with our weaknesses. - Hebrews 4:15",
    explanation: "Jesus understands our struggles and temptations. We are never alone in our journey.",
    isDefault: true
  },
  {
    lie: "I can handle this on my own",
    biblicalTruth: "Bear one another's burdens, and so fulfill the law of Christ. - Galatians 6:2",
    explanation: "God designed us for community and mutual support. Recovery is a journey best walked together.",
    isDefault: true
  }
];

async function generatePersonalizedLies(onboardingData: Partial<OnboardingState>): Promise<TruthLieResponse[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `As a Christian counselor with expertise in addiction recovery, analyze this person's background and generate 5 personalized lies they might believe, along with biblical truths and explanations to counter them.

Context about the person:
${JSON.stringify(onboardingData, null, 2)}

Generate a response in this exact JSON format:
[
  {
    "lie": "The specific lie they might believe",
    "biblicalTruth": "A bible verse that counters this lie - with reference",
    "explanation": "A clear explanation connecting the truth to their situation"
  }
]

Ensure each response:
1. Is deeply personal and relevant to their specific situation
2. Uses clear, compassionate language
3. Includes complete Bible verses with references
4. Provides practical, biblical explanations
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const parsedResponse = cleanGeminiResponse<TruthLieResponse[]>(response);
    
    // Validate the response format
    if (!Array.isArray(parsedResponse) || parsedResponse.length === 0) {
      throw new Error('Invalid response format from Gemini');
    }

    return parsedResponse.map(item => ({
      lie: item.lie,
      biblicalTruth: item.biblicalTruth,
      explanation: item.explanation,
      isDefault: false // Generated responses are not default
    }));
  } catch (error) {
    console.error('Error generating personalized lies:', error);
    return commonAddictionLies;
  }
}

export async function generateTruthLiesFromOnboarding(
  userId: number,
  onboardingData?: Partial<OnboardingState>
): Promise<TruthLieResponse[]> {
  try {
    // If onboarding data wasn't provided, fetch it
    let userOnboarding = onboardingData;
    if (!userOnboarding) {
      const dbOnboarding = await OnboardingData.findOne({
        where: { userId },
        attributes: ['personalInfo', 'assessmentData', 'additionalAssessmentData', 'faithData', 'recoveryJourneyData']
      });
      userOnboarding = dbOnboarding?.toJSON();
    }

    // Generate lies based on onboarding data or use defaults
    const truthLies = userOnboarding 
      ? await generatePersonalizedLies(userOnboarding)
      : commonAddictionLies;

    // Store the generated lies
    await Promise.all(
      truthLies.map(item => 
        TruthLies.create({
          userId,
          lie: item.lie,
          biblicalTruth: item.biblicalTruth,
          explanation: item.explanation,
          isDefault: item.isDefault
        })
      )
    );

    return truthLies;
  } catch (error) {
    console.error('Error in generateTruthLiesFromOnboarding:', error);
    // Fallback to creating and returning common lies if generation fails
    await Promise.all(
      commonAddictionLies.map(item => 
        TruthLies.create({
          userId,
          lie: item.lie,
          biblicalTruth: item.biblicalTruth,
          explanation: item.explanation,
          isDefault: item.isDefault
        })
      )
    );
    return commonAddictionLies;
  }
}

export async function getCommonLies(userId: number) {
  try {
    const truthLies = await TruthLies.findAll({
      where: { userId, isDefault: true },
      attributes: ['id', 'lie', 'biblicalTruth', 'explanation', 'isDefault'],
    });
    return truthLies;
  } catch (error) {
    console.error('Error fetching common lies:', error);
    throw error;
  }
}

export async function saveTruthEntry(userId: number, data: {
  lie: string;
  biblicalTruth: string;
  explanation: string;
}) {
  try {
    const entry = await TruthLies.create({
      ...data,
      userId,
      isDefault: false,
    });
    return entry;
  } catch (error) {
    console.error('Error saving truth entry:', error);
    throw error;
  }
}

export async function getUserTruthEntries(userId: number, options?: {
  isDefault?: boolean;
  search?: string;
}) {
  try {
    const where: any = { userId };
    
    // if (typeof options?.isDefault === 'boolean') {
    //   where.isDefault = options.isDefault;
    // }
    
    if (options?.search) {
      where[Op.or] = [
        { lie: { [Op.like]: `%${options.search}%` } },
        { biblicalTruth: { [Op.like]: `%${options.search}%` } },
        { explanation: { [Op.like]: `%${options.search}%` } }
      ];
    }
    
    const entries = await TruthLies.findAll({
      where,
      attributes: ['id', 'lie', 'biblicalTruth', 'explanation', 'isDefault', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    return entries;
  } catch (error) {
    console.error('Error fetching truth entries:', error);
    throw error;
  }
}

export async function deleteTruthEntry(userId: number, entryId: number) {
  try {
    const entry = await TruthLies.findOne({
      where: { id: entryId, userId }
    });
    
    if (!entry) {
      throw new Error('Entry not found');
    }
    
    // Don't allow deletion of default entries
    if (entry.isDefault) {
      throw new Error('Cannot delete default entries');
    }
    
    await entry.destroy();
    return true;
  } catch (error) {
    console.error('Error deleting truth entry:', error);
    throw error;
  }
}

export async function generateResponseToLie(lie: string): Promise<{
  biblicalTruth: string;
  explanation: string;
}> {
  const model = genAI.getGenerativeModel({ model:'gemini-2.0-flash'});

  const prompt = `As a Christian counselor, provide a biblical response to counter this lie: "${lie}"

Generate a response in this exact JSON format:
{
  "biblicalTruth": "A relevant Bible verse with reference that directly counters this lie",
  "explanation": "A clear, compassionate explanation (2-3 sentences) connecting the biblical truth to the lie"
}

Ensure the response:
1. Uses a specific, relevant Bible verse with correct reference
2. Provides practical, biblical explanation
3. Is compassionate and encouraging in tone
4. Directly addresses and counters the specific lie
5. IF RESPONSE IS NOT EXACTLY ONLY JSON FORMATED DATA WITH THIS EXACT TEMPLATE THIS WILL BE CONSIDERED A FAILURE
`;

  try {
    const result = await model.generateContent(prompt);
     const response = result.response.text();
    const parsed = cleanGeminiResponse<TruthLieResponse>(response);
   
    
    return {
      biblicalTruth: parsed.biblicalTruth,
      explanation: parsed.explanation,
    };
  } catch (error) {
    console.error('Error generating response to lie:', error);
    throw new Error('Failed to generate biblical response');
  }
}

/**
 * Update common lies for a user, usually called after preferences change
 */
export async function updateCommonLies(userId: number): Promise<TruthLieResponse[]> {
  try {
    // Delete existing truth/lies
    await TruthLies.destroy({ where: { userId } });

    // Generate new ones based on current onboarding data
    return generateTruthLiesFromOnboarding(userId);
  } catch (error) {
    console.error('Error updating common lies:', error);
    throw error;
  }
}
