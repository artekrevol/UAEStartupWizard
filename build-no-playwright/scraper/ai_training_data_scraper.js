import { db } from '../server/db.js';
import { aiTrainingData } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

// UAE business setup Q&A pairs for AI training
const UAE_BUSINESS_TRAINING_DATA = [
  {
    category: "Business Setup",
    question: "What are the requirements for LLC formation?",
    answer: "To form an LLC in UAE, you need: 1. Minimum 2 shareholders 2. 51% local ownership 3. Minimum capital of AED 300,000 4. Required documents including passports, Emirates ID, and NOC",
    context: {
      legal_form: "LLC",
      jurisdiction: "UAE"
    },
    metadata: {
      source: "Government of UAE",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Business Setup",
    question: "What is the difference between mainland and free zone companies?",
    answer: "Mainland companies can operate throughout the UAE and internationally but require 51% local ownership. Free zone companies offer 100% foreign ownership but have restrictions on operating outside their free zone without a local agent.",
    context: {
      comparison: "mainland_vs_freezone"
    },
    metadata: {
      source: "UAE Ministry of Economy",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Business Setup",
    question: "What's the process for setting up a free zone company?",
    answer: "The process involves: 1. Selecting appropriate free zone 2. Reserving company name 3. Submitting application with required documents 4. Obtaining initial approval 5. Signing lease agreement 6. Paying registration fees 7. Receiving license 8. Opening bank account 9. Processing visas",
    context: {
      legal_form: "Free Zone Company"
    },
    metadata: {
      source: "UAE Free Zones Council",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Business Setup",
    question: "How much capital is required to start a business in Dubai?",
    answer: "Capital requirements vary by business type and jurisdiction. For mainland LLCs, the standard is AED 300,000, though there's no longer a minimum deposit requirement. Free zone companies typically require AED 50,000-1,000,000 depending on the free zone and activity.",
    context: {
      topic: "capital_requirements",
      location: "Dubai"
    },
    metadata: {
      source: "Department of Economic Development Dubai",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Business Setup",
    question: "Can I own 100% of my company in UAE?",
    answer: "Yes, 100% foreign ownership is possible in: 1. All free zones 2. Mainland businesses in over 1,000 commercial and industrial activities under the Foreign Direct Investment Law 3. Certain professional service categories. However, some strategic sectors still require Emirati partners.",
    context: {
      topic: "foreign_ownership"
    },
    metadata: {
      source: "UAE Ministry of Economy",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Documentation",
    question: "What documents are needed for trade license?",
    answer: "Required documents include: passport copies, Emirates ID, lease agreement, external department approvals, initial approval certificate, and application form. Specific businesses may need additional industry-specific approvals.",
    context: {
      license_type: "Commercial"
    },
    metadata: {
      source: "Department of Economic Development",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Documentation",
    question: "Do I need to notarize documents for business setup?",
    answer: "Yes, several documents require notarization including: 1. Memorandum of Association (MOA) 2. Power of Attorney 3. Local service agent agreement 4. Board resolutions (in some cases) 5. Foreign documents must be attested by UAE embassy in country of origin and then by UAE Ministry of Foreign Affairs",
    context: {
      topic: "document_notarization"
    },
    metadata: {
      source: "UAE Ministry of Justice",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Documentation",
    question: "What is an NOC and when do I need it?",
    answer: "An NOC (No Objection Certificate) is a formal letter granting permission. You need one: 1. From your sponsor if you're employed and starting a business 2. From your current free zone when relocating to another 3. For specific regulated business activities 4. When transferring company ownership 5. For certain visa processes",
    context: {
      document_type: "NOC"
    },
    metadata: {
      source: "Federal Authority for Identity and Citizenship",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Fees",
    question: "What are the initial costs for business setup?",
    answer: "Initial costs include: license fee (AED 10,000-50,000), registration fee (AED 5,000-15,000), office rent (varies widely by location), and minimum capital requirement (depends on business type). Additional costs include visa fees, banking fees, and professional service charges.",
    context: {
      cost_type: "initial_setup"
    },
    metadata: {
      source: "Department of Economic Development",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Fees",
    question: "How much does a Dubai trade license cost?",
    answer: "A Dubai trade license costs: AED 10,000-15,000 for commercial license, AED 15,000-20,000 for industrial license, AED 10,000-20,000 for professional license. Additional fees include: name reservation (AED 620), initial approval (AED 100), market fees (AED 480), and Chamber of Commerce membership (AED 1,200+).",
    context: {
      license_type: "Trade",
      location: "Dubai"
    },
    metadata: {
      source: "Department of Economic Development Dubai",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Fees",
    question: "Are there any hidden costs when setting up a business?",
    answer: "Yes, potential hidden costs include: 1. Office fit-out expenses 2. Technology setup costs 3. Marketing expenses 4. Insurance premiums 5. Annual audit fees 6. Municipality fees 7. Visa medical examination costs 8. Typing center charges 9. PRO services 10. Legal consultancy fees",
    context: {
      cost_type: "hidden_costs"
    },
    metadata: {
      source: "Business Setup Consultants Association",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Free Zones",
    question: "Which is the best free zone for trading business?",
    answer: "Best free zones for trading include: 1. Jebel Ali Free Zone (JAFZA) - Excellent for import/export with direct port access 2. Dubai Multi Commodities Centre (DMCC) - Ideal for commodity trading 3. Sharjah Airport International Free Zone (SAIF) - Cost-effective with good logistics 4. Ajman Free Zone - Budget-friendly for smaller trading operations 5. Ras Al Khaimah Economic Zone (RAKEZ) - Affordable with flexible warehouse options",
    context: {
      business_activity: "Trading",
      free_zone_comparison: true
    },
    metadata: {
      source: "UAE Free Zones Council",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Free Zones",
    question: "Which free zone is best for technology companies?",
    answer: "Best free zones for technology companies include: 1. Dubai Internet City (DIC) - Premier tech ecosystem with major global companies 2. Dubai Silicon Oasis (DSO) - Integrated tech community with R&D facilities 3. Dubai Technology Entrepreneur Campus (DTEC) - Focused on startups and entrepreneurs 4. Abu Dhabi Global Market (ADGM) - Strong for fintech 5. Sharjah Research Technology and Innovation Park - Research-focused tech environment",
    context: {
      business_activity: "Technology",
      free_zone_comparison: true
    },
    metadata: {
      source: "UAE Technology Innovation Council",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Free Zones",
    question: "What are the cheapest free zones in UAE?",
    answer: "Most affordable free zones include: 1. Ras Al Khaimah Economic Zone (RAKEZ) - Packages from AED 6,500 2. Ajman Free Zone - Packages from AED 9,000 3. Sharjah Media City (Shams) - Packages from AED 11,500 4. Fujairah Creative City - Packages from AED 11,500 5. Umm Al Quwain Free Trade Zone - Packages from AED 12,000. These offer flexi-desk options, minimal capital requirements, and cost-effective renewal fees.",
    context: {
      cost_comparison: true,
      free_zone_comparison: true
    },
    metadata: {
      source: "UAE Free Zones Directory",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Visas",
    question: "How many visas can I get with my trade license?",
    answer: "Visa allocation depends on: 1. Company type and legal structure 2. Office/warehouse space size (quota system of sq.ft per visa) 3. Specific free zone regulations. Typically, a standard office (200-250 sq.ft) permits 2-3 visas. Large mainland companies can sponsor more based on activities and space. Executive offices in free zones usually allow 2-4 visas while warehouses may qualify for 8+ visas based on size.",
    context: {
      topic: "visa_allocation"
    },
    metadata: {
      source: "General Directorate of Residency and Foreign Affairs",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Visas",
    question: "What is the investor visa process in UAE?",
    answer: "The investor visa process involves: 1. Obtaining trade license 2. Submitting visa application with trade license, passport copies, and photos 3. Entry permit approval (2-5 working days) 4. Status change if in UAE or entry with permit 5. Medical fitness test 6. Emirates ID registration 7. Visa stamping in passport. Investor visas are typically valid for 2-3 years with varying eligibility requirements based on business type and investment level.",
    context: {
      visa_type: "Investor",
      visa_process: true
    },
    metadata: {
      source: "Federal Authority for Identity and Citizenship",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Banking",
    question: "How do I open a corporate bank account in UAE?",
    answer: "To open a corporate account: 1. Choose suitable bank for your business needs 2. Prepare documentation (trade license, shareholder passports, company documents) 3. Complete application form 4. Attend in-person interview with all shareholders 5. Meet minimum deposit requirements 6. Submit additional KYC documents as requested. Process takes 2-4 weeks; requirements vary by bank and company type. Initial deposits range from AED 10,000-50,000 depending on the bank.",
    context: {
      topic: "corporate_banking"
    },
    metadata: {
      source: "UAE Banking Federation",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Banking",
    question: "Which bank is best for new businesses in UAE?",
    answer: "Best banks for new businesses include: 1. Emirates NBD - Comprehensive startup packages with digital banking 2. RAKBANK - Business ONE account with lower minimum balance 3. Mashreq NeoBiz - Digital-first business banking with simplified processes 4. ADCB - BusinessEdge with specialized SME services 5. Commercial Bank of Dubai - Business accounts with trade finance options. Evaluation should consider minimum balance requirements, transaction fees, digital capabilities, and industry specialization.",
    context: {
      topic: "business_banking",
      comparison: true
    },
    metadata: {
      source: "UAE Banking Federation",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Taxation",
    question: "What taxes do businesses pay in UAE?",
    answer: "UAE businesses are subject to: 1. Corporate Tax (9% for profits above AED 375,000, effective 2023) 2. Value Added Tax (VAT) at 5% 3. Excise Tax on specific goods 4. Customs duties (typically 5%) 5. Municipality fees (varies by emirate, 5-10% on commercial properties). The UAE has no personal income tax, capital gains tax, or withholding tax. Free zone companies may have tax exemptions based on specific free zone regulations.",
    context: {
      topic: "business_taxation"
    },
    metadata: {
      source: "Federal Tax Authority",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Taxation",
    question: "Do I need to register for VAT in UAE?",
    answer: "VAT registration is: 1. Mandatory if taxable supplies exceed AED 375,000 in preceding 12 months or expected in next 30 days 2. Optional if taxable supplies exceed AED 187,500 3. Required for non-resident businesses making taxable supplies in UAE with no fixed establishment. Registration process involves online application through FTA portal with trade license, authorized signatory details, and financial records.",
    context: {
      tax_type: "VAT"
    },
    metadata: {
      source: "Federal Tax Authority",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Legal Compliance",
    question: "What annual compliance requirements exist for UAE companies?",
    answer: "Annual compliance requirements include: 1. Trade license renewal (30 days before expiry) 2. Immigration file renewal (for companies with employees) 3. VAT returns (quarterly or monthly) 4. Corporate tax returns (from 2023) 5. Ultimate Beneficial Owner (UBO) information update 6. Economic Substance Regulations (ESR) reporting for relevant activities 7. Financial statement preparation (as per regulatory requirements) 8. Chamber of Commerce membership renewal 9. Lease contract renewal for registered address",
    context: {
      topic: "annual_compliance"
    },
    metadata: {
      source: "UAE Ministry of Economy",
      last_updated: "2024-04-01"
    }
  },
  {
    category: "Legal Compliance",
    question: "What are the labor laws businesses must follow in UAE?",
    answer: "Key UAE labor law requirements: 1. All employees must have Ministry of Human Resources & Emiratisation (MOHRE) contracts and labor cards 2. Probation cannot exceed 6 months 3. End of service benefits calculation based on duration of service 4. Working hours limited to 8 hours per day or 48 hours per week 5. Overtime compensation at 125-150% of hourly rate 6. Annual leave of 30 calendar days after one year 7. Sick leave regulations with varying pay rates 8. Maternity leave of 45-60 days based on service length 9. Health insurance mandatory for all employees",
    context: {
      topic: "labor_laws"
    },
    metadata: {
      source: "Ministry of Human Resources & Emiratisation",
      last_updated: "2024-04-01"
    }
  }
];

/**
 * Populates the AI training data table with structured Q&A pairs
 */
async function populateAiTrainingData() {
  console.log('Starting to populate AI training data...');
  
  for (const entry of UAE_BUSINESS_TRAINING_DATA) {
    try {
      await upsertAiTrainingData(entry);
    } catch (error) {
      console.error(`Error processing AI training data entry "${entry.question}":`, error);
    }
  }
  
  console.log(`Processed ${UAE_BUSINESS_TRAINING_DATA.length} AI training data entries`);
}

/**
 * Insert or update AI training data in the database
 */
async function upsertAiTrainingData(entryData) {
  try {
    // Check if entry already exists
    const [existingEntry] = await db
      .select()
      .from(aiTrainingData)
      .where(eq(aiTrainingData.question, entryData.question));
    
    if (existingEntry) {
      // Update existing entry
      await db.update(aiTrainingData)
        .set({
          category: entryData.category,
          answer: entryData.answer,
          context: entryData.context,
          metadata: entryData.metadata,
          createdAt: new Date()
        })
        .where(eq(aiTrainingData.id, existingEntry.id));
      
      console.log(`Updated existing AI training data: "${entryData.question}"`);
    } else {
      // Insert new entry
      await db.insert(aiTrainingData).values({
        category: entryData.category,
        question: entryData.question,
        answer: entryData.answer,
        context: entryData.context,
        metadata: entryData.metadata,
        createdAt: new Date()
      });
      
      console.log(`Added new AI training data: "${entryData.question}"`);
    }
  } catch (error) {
    console.error(`Error upserting AI training data "${entryData.question}":`, error);
  }
}

export { populateAiTrainingData };