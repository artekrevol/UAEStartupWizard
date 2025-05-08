/**
 * Static Responses Utility
 * 
 * This module provides pre-defined responses for common business assistant queries,
 * reducing the need for AI processing for frequent or simple questions.
 */

// Define static responses for common queries
const staticResponses: { [key: string]: string } = {
  // Basic information
  "what is a free zone": "A free zone in the UAE is a special economic area where businesses can operate with 100% foreign ownership, enjoy tax benefits, and have simplified customs procedures. Each free zone is typically designed for specific industries or business activities.",
  
  "how to start a business in uae": "Starting a business in the UAE involves several steps: 1) Choose between mainland, free zone, or offshore setup, 2) Select your business activity, 3) Apply for initial approval, 4) Choose a trade name, 5) Prepare and submit required documents, 6) Get license approval, 7) Open a corporate bank account, and 8) Apply for relevant visas.",
  
  "what is the best free zone": "The 'best' free zone depends on your business needs, industry, and budget. DMCC is popular for trading businesses, Dubai Internet City for tech companies, and JAFZA for manufacturing and logistics. Consider factors like setup costs, visa quotas, office requirements, and proximity to industry clusters.",
  
  "difference between mainland and free zone": "Mainland companies can conduct business throughout the UAE without restrictions but require a local sponsor (51% ownership). Free zone companies offer 100% foreign ownership, tax benefits, and simplified procedures but face restrictions when doing business on the mainland and may need a service agent for mainland activities.",
  
  "what documents do I need": "Common documents required for business setup include: passport copies of all shareholders, completed application forms, business plan, bank reference letters, CV/resume of shareholders, NOC from current sponsor (for UAE residents), and company memorandum/articles of association. Specific requirements vary by jurisdiction and business type.",
  
  // Cost related
  "how much does it cost": "Business setup costs in UAE vary widely. Free zone packages range from 15,000 to 50,000 AED, mainland setup costs 15,000 to 100,000+ AED, plus office/facility costs, visa expenses, bank account opening fees, and ongoing compliance costs. The total depends on business location, activity, size, and jurisdiction requirements.",
  
  "cheapest free zone": "The most affordable free zones in the UAE include Fujairah Creative City (starting around 15,000 AED), Ajman Free Zone (starting around 12,000 AED), and Sharjah Media City (starting around 13,000 AED). These zones typically offer flexi-desk options and virtual office packages for entrepreneurs and small businesses.",
  
  // Specific free zones
  "what is dmcc": "The Dubai Multi Commodities Centre (DMCC) is one of the leading free zones in Dubai, specializing in commodities trading, including precious metals, diamonds, tea, and various other goods. It offers 100% foreign ownership, 0% corporate and personal tax, and a strategic location in Jumeirah Lakes Towers (JLT).",
  
  "what is dic": "Dubai Internet City (DIC) is a free zone dedicated to technology companies and digital businesses. Established in 1999, it hosts global IT companies, tech startups, and digital entrepreneurs. DIC offers 100% foreign ownership, 0% taxes, and an ecosystem of technology partners in a centralized location."
};

/**
 * Find the best static response for a given query
 * 
 * @param query The user's query
 * @returns The static response if one matches, otherwise null
 */
export function findBestStaticResponse(query: string): string | null {
  // Normalize the query
  const normalizedQuery = query.toLowerCase().trim();
  
  // Exact match
  if (staticResponses[normalizedQuery]) {
    return staticResponses[normalizedQuery];
  }
  
  // Check for substring matches
  for (const [key, response] of Object.entries(staticResponses)) {
    if (normalizedQuery.includes(key) || key.includes(normalizedQuery)) {
      return response;
    }
  }
  
  return null;
}