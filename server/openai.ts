import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getBusinessRecommendations(requirements: {
  budget: number;
  industry: string;
  employees: number;
  activities: string[];
}): Promise<{
  freeZone: string;
  businessType: string;
  requirements: string[];
  estimatedCost: number;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert UAE business setup consultant. Based on the requirements, recommend the best free zone and business type. Provide detailed recommendations in JSON format."
        },
        {
          role: "user",
          content: JSON.stringify(requirements)
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    return JSON.parse(content);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error("Failed to get business recommendations: " + message);
  }
}

export async function generateDocumentRequirements(businessType: string, freeZone: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Generate a list of required documents for business setup in UAE. Return as JSON array."
        },
        {
          role: "user",
          content: `Business Type: ${businessType}, Free Zone: ${freeZone}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(content);
    return result.documents;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error("Failed to generate document requirements: " + message);
  }
}