/**
 * Cleans and parses Gemini API responses that are returned as markdown code blocks
 * @param response The raw response from Gemini API containing markdown code blocks
 * @returns Parsed JSON object from the cleaned response
 */
export function cleanGeminiResponse<T>(response: string): T {
  try {
    // Remove markdown code block identifiers and extract JSON
    const jsonString = response.replace(/^```json\n|\n```$/g, '').trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error cleaning Gemini response:', error);
    throw new Error('Failed to parse Gemini response');
  }
}
