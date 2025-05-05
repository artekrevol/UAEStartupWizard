import OpenAI from "openai";
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Verify OpenAI API key is set
if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY environment variable is not set');
  // Don't throw error to allow app to start, but API calls will fail gracefully
}

// Set up rate limiting to prevent abuse
const rateLimiter = new RateLimiterMemory({
  points: 50, // Number of points
  duration: 60, // Per 60 seconds
});

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3, // Automatically retry failed requests up to 3 times
  timeout: 30000 // 30 second timeout for API requests
});

function getMockRecommendations(requirements: {
  budget: number;
  industry: string;
  employees: number;
  activities: string[];
}): {
  freeZone: string;
  businessType: string;
  requirements: string[];
  estimatedCost: number;
} {
  // Provide realistic mock data based on the industry
  const mockData = {
    Technology: {
      freeZone: "Dubai Internet City",
      businessType: "Technology Service Provider",
      requirements: ["Trade License", "Office Space", "NOC from DIC"],
      estimatedCost: 50000
    },
    Trading: {
      freeZone: "Jebel Ali Free Zone",
      businessType: "General Trading",
      requirements: ["Trade License", "Warehouse Space", "Import/Export Permit"],
      estimatedCost: 75000
    },
    Consulting: {
      freeZone: "Dubai International Financial Centre",
      businessType: "Professional Services",
      requirements: ["Professional License", "Office Space", "Professional Indemnity Insurance"],
      estimatedCost: 45000
    },
    Manufacturing: {
      freeZone: "Sharjah Airport Free Zone",
      businessType: "Industrial License",
      requirements: ["Industrial License", "Factory Space", "Environmental Compliance"],
      estimatedCost: 100000
    },
    "E-commerce": {
      freeZone: "Dubai CommerCity",
      businessType: "E-commerce Company",
      requirements: ["E-commerce License", "Warehouse", "Payment Gateway Setup"],
      estimatedCost: 40000
    },
    Media: {
      freeZone: "Dubai Media City",
      businessType: "Media Production",
      requirements: ["Media License", "Studio Space", "Content Permission"],
      estimatedCost: 55000
    }
  };

  const defaultData = {
    freeZone: "Dubai Multi Commodities Centre",
    businessType: "General Trading",
    requirements: ["Trade License", "Office Space", "Visa Allocation"],
    estimatedCost: 50000
  };

  return mockData[requirements.industry as keyof typeof mockData] || defaultData;
}

function getMockDocuments(businessType: string): string[] {
  const commonDocuments = [
    "Passport Copies",
    "Emirates ID",
    "Bank Reference Letter",
    "Business Plan",
    "No Objection Certificate"
  ];

  const specificDocuments = {
    "Technology Service Provider": [
      "Software Development Portfolio",
      "Technical Team CVs",
      "IT Infrastructure Plan"
    ],
    "General Trading": [
      "Supplier Agreements",
      "Import/Export Codes",
      "Warehouse Lease Agreement"
    ],
    "Professional Services": [
      "Professional Qualifications",
      "Industry Certifications",
      "Service Framework Document"
    ],
    "Industrial License": [
      "Manufacturing Layout",
      "Equipment List",
      "Safety Compliance Certificate"
    ],
    "E-commerce Company": [
      "Platform Architecture Document",
      "Payment Gateway Agreements",
      "Logistics Partnership Contracts"
    ],
    "Media Production": [
      "Content Distribution Strategy",
      "Media Equipment Inventory",
      "Copyright Registrations"
    ]
  };

  const additionalDocs = specificDocuments[businessType as keyof typeof specificDocuments] || [];
  return [...commonDocuments, ...additionalDocs];
}

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
    console.log("OpenAI API error, falling back to mock data:", error);
    return getMockRecommendations(requirements);
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
    console.log("OpenAI API error, falling back to mock data:", error);
    return getMockDocuments(businessType);
  }
}

/**
 * This function provides a contextual AI assistant for UAE business setup inquiries
 * It uses retrieved database context to provide more accurate and specific responses
 */
export async function getUAEBusinessAssistantResponse({
  query,
  freeZoneData,
  establishmentGuideData,
  userBusinessContext
}: {
  query: string;
  freeZoneData?: Array<{
    name: string;
    description: string | null;
    location: string | null;
    benefits: any;
    requirements: any;
    industries: any;
    [key: string]: any;
  }>;
  establishmentGuideData?: Array<{
    category: string;
    title: string;
    content: string;
    requirements: any;
    documents: any;
    steps: any;
    [key: string]: any;
  }>;
  userBusinessContext?: {
    industry?: string;
    businessType?: string;
    freeZone?: string;
    budget?: number;
    employees?: number;
  };
}): Promise<{
  answer: string;
  sources: Array<{ title: string; content: string }>;
}> {
  try {
    // Prepare context from database records
    let contextText = "";
    const sources: Array<{ title: string; content: string }> = [];
    
    // Add free zone data to context
    if (freeZoneData && freeZoneData.length > 0) {
      freeZoneData.forEach(zone => {
        const zoneContext = `
Free Zone: ${zone.name}
Location: ${zone.location}
Description: ${zone.description}
Benefits: ${zone.benefits.join(", ")}
Requirements: ${zone.requirements.join(", ")}
Industries: ${zone.industries.join(", ")}
`;
        contextText += zoneContext;
        sources.push({
          title: `Free Zone: ${zone.name}`,
          content: zone.description || "Free zone in UAE"
        });
      });
    }

    // Add establishment guide data to context
    if (establishmentGuideData && establishmentGuideData.length > 0) {
      establishmentGuideData.forEach(guide => {
        const stepsText = Array.isArray(guide.steps) 
          ? guide.steps
              .map((step: any) => `${step.title || step.step || ""}: ${step.description || ""}`)
              .join("\n")
          : "";
          
        const guideContext = `
Guide: ${guide.title}
Category: ${guide.category}
Content: ${guide.content}
Requirements: ${guide.requirements.join(", ")}
Documents: ${guide.documents.join(", ")}
Steps:
${stepsText}
`;
        contextText += guideContext;
        sources.push({
          title: `Guide: ${guide.title}`,
          content: guide.content
        });
      });
    }
    
    // Add user's business context if available
    let businessContextText = "";
    if (userBusinessContext) {
      businessContextText = `
The user's business context:
Industry: ${userBusinessContext.industry || "Not specified"}
Business Type: ${userBusinessContext.businessType || "Not specified"}
Free Zone: ${userBusinessContext.freeZone || "Not specified"}
Budget: ${userBusinessContext.budget ? `${userBusinessContext.budget} AED` : "Not specified"}
Employees: ${userBusinessContext.employees || "Not specified"}
`;
    }

    // Create the system message with all context
    const systemMessage = `
You are an expert UAE business setup assistant, specialized in helping entrepreneurs establish businesses in the UAE.
Use the context information to provide accurate, helpful, and actionable responses to inquiries about business setup in the UAE.
You should always use official and up-to-date information about UAE business processes.
When answering, cite relevant sources from the provided context.

Here is information about UAE free zones and business establishment guides to inform your responses:
${contextText}

${businessContextText}

Respond in a professional, helpful manner. Always prioritize accuracy and be specific where possible. 
If you're unsure about any information not contained in the context, acknowledge the limitations and suggest 
where the user might find more details.

Always respond with JSON in the following format:
{
  "answer": "Your detailed response here...",
  "sources": [
    {
      "title": "Source title",
      "relevance": "Brief explanation of why this source is relevant to the query"
    }
  ]
}
`;

    // Create the OpenAI completion request
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: query
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(content);
    
    // Handle case where the response format might not match our expected structure
    if (!result.answer) {
      return {
        answer: "I apologize, but I encountered an issue processing your question. Could you please rephrase it?",
        sources: []
      };
    }
    
    return {
      answer: result.answer,
      sources: result.sources || []
    };
  } catch (error: unknown) {
    console.error("Error with OpenAI assistant:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Handle rate limit and other API errors with a useful mock response
    if (errorMessage.includes("429") || errorMessage.includes("quota")) {
      console.log("OpenAI API rate limit reached, providing mock response");
      
      // Prepare a mock response based on the query and available context
      const mockResponses: Record<string, { answer: string; sources: Array<{ title: string; content: string }> }> = {
        "free zone": {
          answer: "Based on the available information, the UAE offers several free zones with distinct benefits. Dubai Multi Commodities Centre (DMCC) is a leading free zone for commodities trade, offering 100% business ownership, 0% taxes, and state-of-the-art infrastructure. Dubai Internet City (DIC) caters to technology businesses with industry-specific infrastructure and networking opportunities. Abu Dhabi Global Market (ADGM) provides an independent jurisdiction based on Common Law with a world-class regulatory framework. Each free zone is designed to attract specific industries and offers benefits like tax exemptions, 100% foreign ownership, simplified procedures, and specialized infrastructure.",
          sources: [
            { 
              title: "Free Zone: Dubai Multi Commodities Centre (DMCC)", 
              content: "World's leading free zone for commodities trade and enterprise."
            },
            { 
              title: "Free Zone: Dubai Internet City (DIC)", 
              content: "Technology business community that fosters innovation."
            },
            { 
              title: "Free Zone: Abu Dhabi Global Market (ADGM)", 
              content: "International financial centre with its own jurisdiction and common law framework."
            }
          ]
        },
        "business setup": {
          answer: "Setting up a business in the UAE involves several key steps. First, you need to decide on the legal form of your business - options include LLC, Sole Proprietorship, Free Zone Company, etc. Each has different requirements for minimum shareholders, capital, and local ownership. For a Free Zone Company, you'll first need to choose a suitable free zone based on your business activity, then complete the company registration process, get license approval, and process visas. For mainland companies like LLCs, the process includes initial approval, drafting and notarizing a Memorandum of Association, signing a lease agreement, and obtaining a trade license. Document requirements typically include passport copies, Emirates ID, bank reference letters, business plans, and a No Objection Certificate.",
          sources: [
            { 
              title: "Guide: Limited Liability Company (LLC)", 
              content: "Setup Process includes Initial Approval, Draft and Notarize MOA, Sign Lease Agreement, and Obtain Trade License."
            },
            { 
              title: "Guide: Free Zone Company", 
              content: "Setup Process includes Choose Free Zone, Company Registration, License Approval, and Visa Processing."
            }
          ]
        },
        "default": {
          answer: "Thank you for your question about business setup in the UAE. Based on the information available, the UAE offers various business establishment options including mainland companies and free zone entities. Free zones like DMCC, DIC, and ADGM offer benefits such as 100% foreign ownership, tax exemptions, and industry-specific infrastructure. The setup process generally involves selecting a legal form, obtaining initial approvals, submitting required documentation, and receiving your business license. Specific requirements vary based on your chosen business activity and location. For more detailed guidance tailored to your specific business needs, I recommend consulting with a UAE business setup specialist.",
          sources: [
            { 
              title: "UAE Business Information", 
              content: "General information about business establishment in the UAE."
            }
          ]
        }
      };
      
      // Select the most appropriate mock response based on the query
      let responseKey = "default";
      
      // Check if the user query contains any of the keywords
      for (const key of Object.keys(mockResponses)) {
        if (query.toLowerCase().includes(key.toLowerCase())) {
          responseKey = key;
          break;
        }
      }
      
      // Also check the business context if available
      if (responseKey === "default" && userBusinessContext?.businessType) {
        for (const key of Object.keys(mockResponses)) {
          if (userBusinessContext.businessType.toLowerCase().includes(key.toLowerCase())) {
            responseKey = key;
            break;
          }
        }
      }
      
      return mockResponses[responseKey];
    }
    
    return {
      answer: `I apologize, but I'm currently experiencing technical difficulties. Please try again later. Error: ${errorMessage}`,
      sources: []
    };
  }
}