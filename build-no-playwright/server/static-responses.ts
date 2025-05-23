/**
 * Static responses for common business setup questions
 * Used as a fallback when OpenAI encounters timeout issues
 */

export interface StaticResponse {
  question: string;
  response: string;
  keywords: string[];
}

export const staticResponses: StaticResponse[] = [
  {
    question: "What is the process of setting up a business in Dubai?",
    response: `# Step-by-Step Guide to Setting Up a Business in Dubai

## 1. Choose Your Business Structure
- **Mainland company**: 100% foreign ownership now allowed in most sectors
- **Free zone company**: 100% foreign ownership with specific free zone benefits
- **Offshore company**: For holding assets and investments only

## 2. Select Business Activities
- Identify your primary and secondary business activities
- Ensure activities align with your chosen jurisdiction (mainland/free zone)
- Each business activity requires appropriate licensing

## 3. Choose a Trade Name
- Check name availability through DED (mainland) or relevant free zone
- Reserve your trade name by paying registration fees
- Consider name restrictions (prohibited terms, existing names)

## 4. Select Your Location
- **Free zone**: Use the free zone's physical or virtual office solutions
- **Mainland**: Lease commercial space or use an approved business center
- Obtain Ejari (lease registration) for your chosen premises

## 5. Apply for Initial Approval
- Submit business plan, activities, and ownership details
- Pay initial approval fees
- Receive preliminary approval to proceed

## 6. Prepare Legal Documents
- Draft Memorandum of Association (MOA)
- Prepare other required legal documents based on company type
- Have documents notarized by a UAE Notary Public

## 7. Open a Corporate Bank Account
- Select from numerous local and international banks
- Prepare minimum capital deposit (if required)
- Complete bank's KYC process and documentation

## 8. Apply for Business License
- Submit all documentation to relevant authority:
  - Department of Economic Development (DED) for mainland
  - Free zone authority for free zone businesses
- Pay license fees
- Receive business license

## 9. Register for Tax Purposes
- Obtain Tax Registration Number (TRN) from Federal Tax Authority
- Register for VAT if applicable (mandatory if turnover exceeds AED 375,000)

## 10. Apply for Immigration Establishment Card
- Required for sponsoring visas for staff and dependents
- Apply through General Directorate of Residency and Foreign Affairs (GDRFA)

## Typical Timeframes & Costs:
- **Free zone setup**: 1-2 weeks, starting from AED 15,000-50,000
- **Mainland setup**: 2-4 weeks, starting from AED 20,000-50,000
- **Offshore setup**: 1-2 weeks, starting from AED 15,000-25,000

These processes may vary depending on your specific business type, nationality, and the jurisdiction you choose. Professional business setup services can streamline this process significantly.`,
    keywords: ["process", "setup", "setting up", "set up", "business", "Dubai", "steps", "guide", "how to"]
  },
  {
    question: "Compare DMCC and DIC for a small tech startup",
    response: `# Comparing DMCC and DIC for a Small Tech Startup

## Dubai Multi Commodities Centre (DMCC)
**Advantages for tech startups:**
- More flexible licensing options that can accommodate various tech activities
- Strong community networking opportunities through events and programs
- DMCC Innovation Hub specifically designed for tech companies
- Prestigious business address in Jumeirah Lakes Towers
- Access to shared working spaces and cost-effective flexi-desk options
- Comprehensive support services for new businesses

**Considerations:**
- Generally higher setup costs compared to DIC (starting around AED 30,000-50,000)
- Less tech-specific ecosystem than DIC
- Location may be less central for tech industry networking

## Dubai Internet City (DIC)
**Advantages for tech startups:**
- Purpose-built for technology companies with a tech-focused ecosystem
- Proximity to major tech companies and potential clients/partners
- Industry-specific knowledge sharing and networking opportunities
- In5 Tech innovation center providing incubation services
- Strategic location in the technology corridor with Dubai Media City
- More established tech community with industry events

**Considerations:**
- More rigid in activity classifications for tech businesses
- Physical office space may be more expensive
- May have stricter requirements for approval of tech activities

## Cost Comparison
- **DMCC**: Starting from AED 30,000 for basic flexi-desk package
- **DIC**: Starting from AED 35,000 for basic setup

## Recommendation for Small Tech Startups
- **For pure tech/software/IT services**: DIC typically offers better ecosystem benefits
- **For tech with trading elements**: DMCC offers more flexibility
- **For budget-conscious startups**: DMCC flexible desk options might be more economical
- **For networking with tech giants**: DIC provides better proximity to major tech players

The best choice ultimately depends on your specific tech niche, growth plans, and budget constraints.`,
    keywords: ["compare", "DMCC", "DIC", "tech", "startup", "difference"]
  },
  {
    question: "What are the best free zones for a technology consulting company in UAE?",
    response: `For technology consulting companies in the UAE, these free zones are particularly suitable:

1. Dubai Internet City (DIC) - Specialized for technology, IT consulting, and digital services companies
2. Dubai Multi Commodities Centre (DMCC) - Offers flexible licensing options for consultancy businesses
3. Dubai Silicon Oasis (DSO) - Technology-focused free zone with dedicated facilities for tech companies
4. Abu Dhabi Global Market (ADGM) - Emerging hub with favorable regulations for consulting businesses
5. RAKEZ (Ras Al Khaimah Economic Zone) - Cost-effective option with comprehensive business services

These free zones offer benefits including 100% foreign ownership, tax exemptions, and specialized infrastructure. DIC is particularly advantageous for tech consulting due to its technology ecosystem and networking opportunities.`,
    keywords: ["technology", "tech", "consulting", "best", "free zone", "zones"]
  },
  {
    question: "What documents do I need to set up a company in DMCC?",
    response: `To set up a company in DMCC (Dubai Multi Commodities Centre), you'll need these key documents:

1. Completed DMCC application form
2. Business plan (brief description of activities)
3. Passport copies of all shareholders and directors
4. Resume/CV of all shareholders and directors
5. Bank reference letters for each shareholder
6. No Objection Certificate (NOC) from sponsor if you're a UAE resident
7. Proof of residential address (utility bill or similar)
8. Passport-sized photographs of shareholders/directors
9. Memorandum & Articles of Association (provided by DMCC)
10. If establishing a branch: parent company documents including certificate of incorporation, board resolution, and audited financial statements

The exact requirements may vary based on company type (Free Zone Company, Branch, or Subsidiary) and whether shareholders are individuals or corporate entities. DMCC also requires payment of application fees, license fees, and registration fees during the process.`,
    keywords: ["documents", "document", "need", "setup", "set up", "DMCC", "Dubai Multi Commodities"]
  },
  {
    question: "What are the costs of setting up a business in UAE free zones?",
    response: `Setting up a business in UAE free zones involves several cost categories that vary by location:

Initial Setup Costs:
- License fee: AED 15,000-50,000 annually, depending on the free zone
- Registration fee: AED 10,000-15,000 (one-time)
- Immigration card: AED 2,000-5,000
- Establishment card: AED 1,500-3,500

Office/Facility Options:
- Flexi desk/shared workspace: AED 12,000-25,000 annually
- Dedicated desk: AED 18,000-35,000 annually
- Office space: Starting from AED 50,000 annually (varies by size and free zone)
- Warehouse space: AED 200-300 per sqm annually in some free zones

Visa Costs (per person):
- Entry permit: AED 1,200-2,500
- Status change: AED 750-1,500
- Medical test: AED 500-1,500
- Emirates ID: AED 370-700
- Visa stamping: AED 5,000-6,500

Additional Costs:
- Bank guarantee deposit: AED 3,000-5,000 per visa
- PRO services: AED 2,000-5,000
- Annual audit: AED 5,000-10,000

Most Affordable Free Zones:
- RAKEZ (Ras Al Khaimah): Starting from AED 15,000-20,000 for basic packages
- Fujairah Free Zone: Starting from AED 17,000-25,000
- SHAMS (Sharjah Media City): Starting from AED 12,000-24,000

Premium Free Zones (Higher Cost):
- DIFC: Starting from AED 60,000-100,000+
- ADGM: Starting from AED 40,000-80,000
- Dubai Internet City: Starting from AED 30,000-50,000

Total first-year setup costs typically range from AED 30,000 (basic package in affordable free zones) to AED 100,000+ (premium free zones with physical office space).`,
    keywords: ["cost", "costs", "fee", "fees", "price", "pricing", "expensive", "cheap", "affordable"]
  },
  {
    question: "What are the different types of licenses available in UAE free zones?",
    response: `UAE free zones offer several types of licenses based on business activities:

1. Commercial License
   - For trading, import/export, distribution, and retail activities
   - Allows buying, selling, and storage of products
   - Common in JAFZA, DAFZA, and DMCC

2. Service/Professional License
   - For service providers and consultants
   - Covers marketing, management, IT services, education, etc.
   - Popular in free zones like DIC, DIFC, and ADGM

3. Industrial License
   - For manufacturing, processing, and assembly activities
   - Covers light to heavy industrial operations
   - Common in free zones with warehousing like JAFZA and KIZAD

4. E-Commerce License
   - Specifically for online trading platforms
   - Available in most free zones including SHAMS and IFZA

5. Trading License
   - For general trading activities (multiple product categories)
   - Allows importing, exporting, and re-exporting goods
   - Available in most free zones

6. Media License
   - For media-related businesses (publishing, production, advertising)
   - Offered in specialized zones like Dubai Media City and SHAMS

7. Educational License
   - For educational institutions and training centers
   - Available in Dubai Knowledge Park and other specialized zones

8. Logistics License
   - For freight forwarding, shipping, and logistics services
   - Common in JAFZA, DAFZA, and similar logistics-oriented zones

9. Holding Company License
   - For companies that own and manage subsidiaries
   - Available in DIFC, ADGM, and JAFZA

10. Freelance Permit/License
    - For individual professionals working independently
    - Available in zones like TECOM (Dubai Internet City, Dubai Media City), RAKEZ, and SHAMS

Each free zone may have specific requirements and restrictions for different license types. Some free zones specialize in certain industries, so the best choice depends on your specific business activities.`,
    keywords: ["license", "licenses", "types", "type", "different", "available"]
  },
  {
    question: "What are the tax benefits of setting up in UAE free zones?",
    response: `UAE free zones offer substantial tax benefits that make them attractive for international businesses:

Primary Tax Benefits:
- 0% corporate tax on profits for up to 50 years (renewable exemption)
- 0% personal income tax for employees and owners
- 0% import and export duties within the free zone
- 100% repatriation of capital and profits
- No currency restrictions
- No withholding taxes on dividends or interest

UAE Corporate Tax Considerations:
- The UAE introduced a 9% federal corporate tax effective June 1, 2023
- Free zone companies qualifying under the Free Zone Persons (FZP) regime can continue to benefit from 0% corporate tax on qualifying income
- Non-qualifying income may be subject to the standard 9% rate

Qualifying for Tax Benefits:
- Maintain substantial business activities in the free zone
- Comply with regulatory requirements of the specific free zone
- Submit required financial statements and reports
- Meet economic substance requirements
- Avoid prohibited activities with mainland UAE without proper channels

Important Exceptions:
- Banking and insurance businesses in free zones may be subject to specific tax provisions
- VAT (5%) still applies to most goods and services within free zones
- Excise taxes apply to specific products (tobacco, sugary drinks, etc.)
- Free zone entities conducting business with mainland UAE may have tax implications

Additional Financial Benefits:
- No foreign exchange controls
- Double tax treaties available through UAE's extensive network (90+ countries)
- No restriction on hiring expatriate employees

The exact benefits can vary between free zones, and regulations are subject to change, especially with recent tax reforms in the UAE. It's advisable to consult with a tax professional familiar with UAE free zone regulations before establishing your business.`,
    keywords: ["tax", "taxes", "taxation", "benefits", "advantage", "advantages"]
  }
];

/**
 * Find the best matching static response for a given query
 * @param query The user's question
 * @returns The most relevant response or undefined if no good match
 */
export function findBestStaticResponse(query: string): string | undefined {
  // Normalize the query
  const normalizedQuery = query.toLowerCase();
  
  // Check for direct matches first
  for (const response of staticResponses) {
    if (normalizedQuery === response.question.toLowerCase()) {
      return response.response;
    }
  }
  
  // Calculate scores based on keyword matches
  const scoredResponses = staticResponses.map(response => {
    let score = 0;
    
    // Check for keyword matches
    for (const keyword of response.keywords) {
      if (normalizedQuery.includes(keyword.toLowerCase())) {
        // Increase score based on keyword length (longer keywords are more specific)
        score += keyword.length;
      }
    }
    
    return { response: response.response, score };
  });
  
  // Sort by score, highest first
  scoredResponses.sort((a, b) => b.score - a.score);
  
  // Return the best match if it has a reasonable score (threshold of 10)
  if (scoredResponses[0] && scoredResponses[0].score > 10) {
    return scoredResponses[0].response;
  }
  
  return undefined;
}