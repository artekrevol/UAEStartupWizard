import { db } from '../server/db.js';
import { documentTypes } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

// Document types required for UAE business setup
const UAE_DOCUMENT_TYPES = [
  {
    name: "Passport Copies",
    description: "Colored scanned copies of all shareholders' and directors' passports",
    isRequired: true,
    validityPeriod: null,
    attestationRequired: false
  },
  {
    name: "Emirates ID",
    description: "Copies of Emirates ID for UAE residents involved in the business",
    isRequired: true,
    validityPeriod: null,
    attestationRequired: false
  },
  {
    name: "Visa Copies",
    description: "Copies of residence visas for non-UAE nationals residing in UAE",
    isRequired: true,
    validityPeriod: null,
    attestationRequired: false
  },
  {
    name: "No Objection Certificate (NOC)",
    description: "Letter of no objection from sponsor if applicant is under sponsorship",
    isRequired: true,
    validityPeriod: 3,
    attestationRequired: true
  },
  {
    name: "Bank Reference Letter",
    description: "Letter from bank confirming good standing and relationship",
    isRequired: true,
    validityPeriod: 3,
    attestationRequired: false
  },
  {
    name: "Business Plan",
    description: "Detailed business plan with executive summary, market analysis, and financial projections",
    isRequired: true,
    validityPeriod: null,
    attestationRequired: false
  },
  {
    name: "Memorandum of Association (MOA)",
    description: "Legal document outlining company structure, shareholder information, and business activities",
    isRequired: true,
    validityPeriod: null,
    attestationRequired: true
  },
  {
    name: "Board Resolution",
    description: "Official company decision to establish UAE entity, signed by board members",
    isRequired: false,
    validityPeriod: 3,
    attestationRequired: true
  },
  {
    name: "Power of Attorney",
    description: "Legal authorization for representative to act on behalf of shareholders",
    isRequired: false,
    validityPeriod: 12,
    attestationRequired: true
  },
  {
    name: "Trade Name Reservation Certificate",
    description: "Proof of approved and reserved trade name from DED",
    isRequired: true,
    validityPeriod: 6,
    attestationRequired: false
  },
  {
    name: "Tenancy Contract",
    description: "Office lease agreement registered with Ejari/Tawtheeq",
    isRequired: true,
    validityPeriod: 12,
    attestationRequired: false
  },
  {
    name: "Certificate of Incorporation",
    description: "For parent companies, proof of incorporation in home country",
    isRequired: false,
    validityPeriod: null,
    attestationRequired: true
  },
  {
    name: "Good Standing Certificate",
    description: "Proof that parent company is active and compliant in home country",
    isRequired: false,
    validityPeriod: 3,
    attestationRequired: true
  },
  {
    name: "Professional Qualifications",
    description: "Certificates proving qualifications for regulated professions",
    isRequired: false,
    validityPeriod: null,
    attestationRequired: true
  },
  {
    name: "CV/Resume",
    description: "Professional experience details of key personnel",
    isRequired: true,
    validityPeriod: null,
    attestationRequired: false
  },
  {
    name: "Passport-sized Photos",
    description: "Recent passport photos with white background",
    isRequired: true,
    validityPeriod: 6,
    attestationRequired: false
  },
  {
    name: "Initial Approval Certificate",
    description: "Preliminary approval document from licensing authority",
    isRequired: true,
    validityPeriod: 3,
    attestationRequired: false
  },
  {
    name: "Police Clearance Certificate",
    description: "Criminal record verification from home country and/or UAE",
    isRequired: false,
    validityPeriod: 3,
    attestationRequired: true
  },
  {
    name: "Financial Statement",
    description: "Bank statements or audited financial reports",
    isRequired: false,
    validityPeriod: 3,
    attestationRequired: false
  },
  {
    name: "Local Service Agent Agreement",
    description: "Agreement with UAE national for certain business types",
    isRequired: false,
    validityPeriod: null,
    attestationRequired: true
  }
];

/**
 * Populates the document types table
 */
async function populateDocumentTypes() {
  console.log('Starting to populate document types data...');
  
  for (const docType of UAE_DOCUMENT_TYPES) {
    try {
      await upsertDocumentType(docType);
    } catch (error) {
      console.error(`Error processing document type "${docType.name}":`, error);
    }
  }
  
  console.log(`Processed ${UAE_DOCUMENT_TYPES.length} document types`);
}

/**
 * Insert or update document type in the database
 */
async function upsertDocumentType(docTypeData) {
  try {
    // Check if document type already exists
    const [existingDocType] = await db
      .select()
      .from(documentTypes)
      .where(eq(documentTypes.name, docTypeData.name));
    
    if (existingDocType) {
      // Update existing document type
      await db.update(documentTypes)
        .set({
          description: docTypeData.description,
          isRequired: docTypeData.isRequired,
          validityPeriod: docTypeData.validityPeriod,
          attestationRequired: docTypeData.attestationRequired
        })
        .where(eq(documentTypes.id, existingDocType.id));
      
      console.log(`Updated existing document type: ${docTypeData.name}`);
    } else {
      // Insert new document type
      await db.insert(documentTypes).values({
        name: docTypeData.name,
        description: docTypeData.description,
        isRequired: docTypeData.isRequired,
        validityPeriod: docTypeData.validityPeriod,
        attestationRequired: docTypeData.attestationRequired
      });
      
      console.log(`Added new document type: ${docTypeData.name}`);
    }
  } catch (error) {
    console.error(`Error upserting document type "${docTypeData.name}":`, error);
  }
}

export { populateDocumentTypes };