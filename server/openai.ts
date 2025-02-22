import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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