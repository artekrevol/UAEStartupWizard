/**
 * This script adds detailed DMCC documents to the database
 * It creates comprehensive information for bot memory without changing frontend display
 */

import { db } from './server/db.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function addDMCCDetailedDocuments() {
  console.log('Adding detailed DMCC documents to database...');

  // Check if DMCC exists in free_zones
  const dmccResult = await db.execute(sql`
    SELECT id FROM free_zones WHERE name = 'Dubai Multi Commodities Centre'
  `);

  if (dmccResult.rows.length === 0) {
    console.error('DMCC free zone not found in database');
    return;
  }

  const dmccId = dmccResult.rows[0].id;
  console.log(`Found DMCC with ID: ${dmccId}`);

  // Create detailed FAQ document
  const faqsContent = `# Comprehensive DMCC FAQs

## General Information

**Q: What is Dubai Multi Commodities Centre (DMCC)?**
A: Dubai Multi Commodities Centre (DMCC) is a government authority established in 2002 to enhance commodity trade flows through Dubai. It is a leading free zone and a center for global commodities trade, providing a world-class ecosystem for businesses to thrive. Located in the Jumeirah Lakes Towers (JLT) district, DMCC houses over 20,000 member companies from various industries.

**Q: What makes DMCC different from other UAE free zones?**
A: DMCC distinguishes itself through its commodity-focused approach, offering specialized infrastructure for commodities trading including the Dubai Diamond Exchange, DMCC Tea Centre, and DMCC Coffee Centre. It is the only free zone in the world awarded the Global Free Zone of the Year title by the Financial Times fDi Magazine for 7 consecutive years (2015-2021). DMCC also offers a complete ecosystem for business setup with comprehensive services, diverse office solutions, and a vibrant community environment.

**Q: Where is DMCC located?**
A: DMCC is located in the Jumeirah Lakes Towers (JLT) district in Dubai, UAE. The free zone spans approximately 200 hectares and includes both commercial and residential areas. JLT is strategically positioned between Dubai Marina and Emirates Hills, with excellent access to major highways like Sheikh Zayed Road and proximity to Dubai Marina Metro Station.

## Business Setup

**Q: What types of businesses can be established in DMCC?**
A: DMCC supports a wide range of business activities including but not limited to: commodities trading (precious metals, diamonds, tea, coffee, etc.), financial services, professional services (consulting, marketing, etc.), technology companies, manufacturing and industrial operations, logistics and shipping, retail businesses, and many others. The free zone is particularly known for its support of commodity-related businesses but welcomes companies from diverse sectors.

**Q: What are the steps to set up a company in DMCC?**
A: Setting up a company in DMCC involves the following steps:
1. Select your business activity and company name
2. Submit the application with required documents
3. Receive initial approval
4. Select and lease office space
5. Submit company documents including Memorandum of Association
6. Pay registration and license fees
7. Receive company license and official documentation
8. Open a corporate bank account
9. Apply for visas for employees and dependents

**Q: What company types can be registered in DMCC?**
A: DMCC offers several company structures including:
- Free Zone Company (FZCO) - Multiple shareholders (2-50)
- Free Zone Establishment (FZE) - Single shareholder
- Branch of Local or Foreign Company
- Offshore Company (DMCC Offshore Company)
- Subsidiary of an existing company

**Q: What is the minimum capital requirement for a DMCC company?**
A: The minimum share capital requirement is AED 50,000, which must be mentioned in the Memorandum of Association. However, there is no requirement to deposit this amount in a bank account for most business activities. Some specialized industries may have higher capital requirements.

**Q: Is physical office space mandatory for a DMCC license?**
A: Yes, having a physical address within DMCC is mandatory. DMCC offers various options including:
- Flexi Desk (shared workstation)
- Serviced Office (fully furnished)
- Physical Office (unfurnished space)
- Warehouse facilities
An office is required for visa processing and official correspondence.

## Licensing and Activities

**Q: What types of licenses does DMCC offer?**
A: DMCC offers several types of licenses based on business activities:
- Trading License (for buying, selling, importing, and exporting goods)
- Service License (for providing professional services)
- Industrial License (for manufacturing and processing activities)
- General Trading License (for trading in multiple, unrelated product lines)
- Holding Company License (for holding shares in other companies)
- E-commerce License (for online trading activities)
- Dual License (with DED, allowing operations both in free zone and mainland)

**Q: How many business activities can be included in a single license?**
A: A DMCC license can include multiple related activities under a single license fee. For unrelated activities, additional fees may apply. General Trading License allows trading in unlimited product lines but at a higher license fee.

**Q: Can a DMCC company change its activities after licensing?**
A: Yes, a DMCC company can add, modify, or remove activities after obtaining a license. This requires submission of an application to DMCC, and approval will depend on the compatibility of the new activities with the existing business model and facilities.

**Q: What is the license renewal process in DMCC?**
A: DMCC licenses are valid for one year and must be renewed annually. The renewal process includes:
- Submitting renewal application 30 days before expiry
- Clearing any outstanding payments or fines
- Providing audited financial statements (if applicable)
- Paying renewal fees for license and lease
- Updating any company documents that have changed

## Costs and Financials

**Q: What are the typical costs for setting up in DMCC?**
A: The typical costs include:
- Registration Fee: AED 9,020
- License Fee: Starting from AED 20,285 (varies by activity)
- Office Lease: Varies by type and size (Flexi Desk from AED 16,500/year, Physical Office from AED 50,000/year)
- Establishment Card: AED 1,150
- Immigration Card: AED 3,330
- DMCC Employee Access Cards: AED 160 per employee

Additional costs may include bank guarantee deposits, visa processing fees, and service charges.

**Q: Are there any hidden fees or charges?**
A: DMCC is transparent about its fees, but companies should be aware of potential additional costs such as:
- Post-license documentation fees
- Notarization and attestation fees
- Bank account opening charges
- Annual audit fees
- Insurance requirements
- Additional DEWA deposits for office space

**Q: Are there any tax obligations for DMCC companies?**
A: DMCC companies enjoy:
- 0% corporate tax (Note: UAE has introduced a 9% corporate tax effective from June 1, 2023, but free zone companies with qualifying income may still benefit from 0% rate for a specified period)
- 0% personal income tax
- 0% import and export duties (for operations within the free zone)
- 5% VAT applies to most goods and services in the UAE
Companies must maintain proper accounting records and may need to register for VAT if annual turnover exceeds AED 375,000.

## Visas and Employment

**Q: How many employment visas can a DMCC company obtain?**
A: The visa allocation depends on the size of the office space:
- Flexi Desk: Up to 3 visas
- Serviced Office: Up to 6 visas
- Physical Office: Based on office size (approximately 1 visa per 9 sqm)
Additional visas may be available upon special application and approval from DMCC authorities.

**Q: What is the visa process for employees?**
A: The visa process includes:
1. Entry permit application
2. Status change (if applicant is already in UAE)
3. Medical fitness test
4. Emirates ID registration
5. Visa stamping in passport
6. Labor card issuance
The process typically takes 2-3 weeks.

**Q: Can family members be sponsored on a DMCC company visa?**
A: Yes, employees with a monthly salary of at least AED 4,000 can sponsor their immediate family members (spouse and children). Male employees can sponsor parents under certain conditions. The sponsorship process is similar to the employment visa process.

**Q: What are the UAE labor laws that apply to DMCC companies?**
A: DMCC companies must comply with UAE labor laws, including:
- Maximum 8-hour workday or 48-hour workweek
- Minimum of 30 calendar days of annual leave
- End of service benefits (gratuity) based on length of service
- Health insurance provision for all employees
- Maternity leave entitlements
- Proper termination procedures

## Operational Questions

**Q: Can a DMCC company do business with mainland UAE companies?**
A: Yes, DMCC companies can do business with mainland UAE companies. However, mainland companies may treat purchases from free zone companies as imports, and certain services may require a local service agent for mainland operations. A Dual License option is available for companies wanting to operate extensively in the mainland market.

**Q: Are there restrictions on hiring employees of certain nationalities?**
A: No, DMCC companies can hire employees of any nationality. There are no quotas for Emirati nationals in free zone companies, unlike mainland businesses.

**Q: What banking facilities are available to DMCC companies?**
A: DMCC companies have access to a wide range of local and international banks in the UAE. The free zone has partnerships with major banks to facilitate account opening. Companies can open accounts in multiple currencies and access various corporate banking services including trade finance, loans, and payment processing solutions.

**Q: What are the audit and compliance requirements?**
A: DMCC companies must:
- Maintain proper accounting records
- Submit audited financial statements annually (prepared by a UAE approved auditor)
- Comply with AML (Anti-Money Laundering) regulations
- Maintain a registered agent if operating as an offshore company
- Adhere to Ultimate Beneficial Ownership (UBO) disclosure requirements
- Report any significant changes in company structure or ownership

## Specialized Services

**Q: What commodity-specific services does DMCC offer?**
A: DMCC offers specialized services for commodity traders including:
- Dubai Diamond Exchange (DDE) for diamond trading
- DMCC Tea Centre for tea trading and processing
- DMCC Coffee Centre for coffee trading and processing
- DMCC Tradeflow for electronic commodity trading
- Gold and Precious Metals testing facilities
- Warehousing and logistics services for commodities

**Q: What support services are available for startups?**
A: DMCC supports startups through:
- DMCC Business Incubation Centre
- Reduced setup packages for entrepreneurs
- Co-working spaces at discounted rates
- Networking events and mentorship opportunities
- Access to innovation programs and competitions
- Partnerships with venture capital firms and investors

**Q: What are the exit options for a DMCC company?**
A: Companies wishing to exit DMCC have several options:
- Company liquidation (voluntary winding up)
- Company transfer to another free zone or mainland
- Sale of the company to new owners
- Merger with another entity
- Conversion to a different company type
Each option has specific procedures and requirements set by DMCC authorities.

**Q: Does DMCC offer arbitration or dispute resolution services?**
A: Yes, DMCC has established the DMCC Dispute Resolution Authority (DRA) which includes the DIFC-LCIA Arbitration Centre and the DMCC Courts. These institutions offer world-class dispute resolution services to DMCC member companies, with proceedings conducted in English under common law principles.`;

  const detailedSetupContent = `# Detailed DMCC Business Setup Guide

## Initial Steps for Company Formation

### Choosing a Business Activity
DMCC categorizes business activities into several sectors:
- Trading (physical goods)
- Services (consulting, marketing, etc.)
- Industrial (manufacturing, processing)
- General Trading (multiple product lines)
- Holding Company

Each activity has specific licensing requirements and fees. Companies must select the appropriate activity that matches their business model. Multiple related activities can be included under a single license for an additional fee.

### Company Name Selection
The company name must comply with DMCC naming conventions:
- Must not contain offensive or blasphemous language
- Must not reference any religion
- Must not include UAE or Dubai in a way that suggests government affiliation
- Names of individuals must include the full first name and surname as in passport
- Cannot be identical to an existing company name
- Can be reserved for 30 days before registration

### Legal Structure Options
DMCC offers several legal structures with different requirements:

1. **Free Zone Company (FZCO)**
   - 2-50 shareholders
   - Directors can be different from shareholders
   - Minimum share capital: AED 50,000
   - Limited liability structure

2. **Free Zone Establishment (FZE)**
   - Single shareholder only
   - Minimum share capital: AED 50,000
   - Limited liability structure

3. **Branch of Foreign/Local Company**
   - Extension of parent company
   - No separate legal personality
   - No share capital requirement
   - Parent company assumes full liability

4. **Subsidiary**
   - Owned by another company (parent)
   - Operates as FZCO or FZE
   - Standard minimum capital requirements apply

5. **DMCC Offshore Company**
   - For holding assets, investments, or intellectual property
   - Cannot conduct physical operations in UAE
   - No requirement for physical office space
   - Lower annual fees

### Shareholder Requirements
- Individual and corporate shareholders are permitted
- Foreign ownership up to 100% is allowed
- Shareholders need to provide passport copies, proof of address, and bank reference
- Corporate shareholders must provide certificate of incorporation, articles of association, board resolution, etc.
- No residency requirement for shareholders

## Documentation and Application Process

### Required Documents for Registration
For Individual Shareholders:
- Passport copies of all shareholders and directors
- Proof of residential address (utility bill, bank statement)
- Bank reference letter
- No-objection certificate from sponsor (if UAE resident)
- Passport-sized photographs
- CV/resume for directors

For Corporate Shareholders:
- Certificate of Incorporation
- Memorandum & Articles of Association
- Board Resolution approving DMCC company formation
- Certificate of Good Standing
- Register of Directors and Shareholders
- Passport copies of authorized signatories
- All documents must be legally attested and translated if not in English or Arabic

### Application Submission
The application can be submitted online through the DMCC member portal or with assistance from DMCC customer service. The process includes:

1. Registration on DMCC member portal
2. Submission of business application form
3. Document upload
4. Name reservation
5. Payment of initial fees
6. Review by DMCC authority

### Initial Approval
Upon successful review, DMCC issues an initial approval valid for 90 days. During this period, the applicant must:
- Select and lease office space
- Prepare and notarize company documents
- Pay registration and license fees

### Memorandum & Articles of Association (MOA)
The MOA must include:
- Company name and registered address
- Names of shareholders and their shareholding percentage
- Share capital amount and allocation
- Business activities
- Management structure
- Financial year details
- Provisions for dispute resolution

The document must be notarized at a UAE notary public in the presence of all shareholders or their authorized representatives.

## Office Space and Physical Presence

### Office Options
DMCC offers various office solutions:

1. **Flexi Desk**
   - Shared desk space
   - Access to meeting rooms
   - Cost: From AED 16,500/year
   - Includes 3 visa allocations
   - Suitable for small businesses or startups

2. **Serviced Office**
   - Fully furnished private office
   - Reception and administrative services
   - Cost: From AED 35,000/year
   - Includes up to 6 visa allocations
   - Suitable for small teams needing private space

3. **Physical Office**
   - Unfurnished office space
   - Various size options available
   - Cost: From AED 50,000/year
   - Visa allocation based on space (1 visa per 9 sqm)
   - Suitable for established businesses with larger teams

4. **Retail Space**
   - Ground floor commercial units
   - Various size options available
   - Cost varies based on size and location
   - Suitable for customer-facing businesses

5. **Industrial/Warehouse Space**
   - Available in DMCC industrial areas
   - Various size options
   - Suitable for manufacturing and storage operations

### Office Lease Agreement
All office spaces require a lease agreement with DMCC or a third-party landlord within the free zone. The lease typically requires:
- Security deposit (usually 3 months' rent)
- Advance payment (usually 1 year)
- DEWA (utility) deposit
- Service charges for maintenance and common areas

### Office Design and Fit-out
For physical offices, companies must:
- Submit fit-out plans for approval
- Use DMCC-approved contractors
- Comply with health and safety regulations
- Obtain necessary permits for modifications
- Complete fit-out within timeframe (usually 2-3 months)

## Licensing and Registration

### License Issuance
After office lease and MOA notarization, DMCC issues:
- Company License (valid for 1 year)
- Commercial Registration Certificate
- Share Certificate(s)
- Establishment Card

### Registration Fees
Registration fees vary based on company type and activities:
- Registration Fee: AED 9,020
- License Fee: From AED 20,285 (Trading/Service)
- License Fee: From AED 50,285 (General Trading)
- Establishment Card: AED 1,150

Additional fees apply for:
- Company name plates
- Employee access cards
- Attestation of documents

### Post-Registration Requirements
After registration, companies must:
- Open a corporate bank account
- Register for VAT (if applicable)
- Apply for employee visas
- Register with the Ministry of Human Resources (if applicable)
- Obtain industry-specific permits and approvals
- Set up accounting and audit arrangements

## Banking and Financial Aspects

### Bank Account Opening
DMCC companies can open accounts with various local and international banks. The process typically requires:
- Company license and registration documents
- Passport copies of all signatories
- Board resolution specifying authorized signatories
- Business plan or company profile
- Bank reference letters for shareholders
- Completion of bank's due diligence process
- Initial deposit (varies by bank)

The process can take 2-6 weeks depending on the bank's requirements.

### Banking Options
Major banks serving DMCC companies include:
- Emirates NBD
- RAK Bank
- Abu Dhabi Commercial Bank
- HSBC
- Standard Chartered
- Mashreq Bank
- Commercial Bank of Dubai

Many banks have branches within or near the DMCC area.

### Payment Facilities
DMCC companies can access various payment facilities:
- Online banking platforms
- International wire transfers
- Letter of credit facilities
- Trade finance solutions
- Foreign exchange services
- Point of sale systems
- Payment gateways for e-commerce

### Accounting and Audit Requirements
DMCC companies must:
- Maintain accounting records and financial statements
- Prepare annual financial statements
- Have financial statements audited by a UAE-approved auditor
- Submit audited accounts during license renewal
- Comply with IFRS (International Financial Reporting Standards)
- File VAT returns if registered for VAT

## Visa Processing

### Visa Allocation
The number of visas available depends on:
- Office type and size
- Nature of business activity
- Employee designations
- Salary packages

### Visa Categories
DMCC offers various visa types:
- Employment visas (for company staff)
- Partner/Investor visas (for shareholders)
- Family sponsorship (for dependents)
- Domestic helper visas (for household staff)

### Visa Process Steps
1. **Entry Permit**
   - Application submitted through DMCC portal
   - Approval within 5-7 working days
   - Valid for 60 days, single entry

2. **Status Change**
   - Converting visitor visa to employment visa
   - Required if applicant is already in UAE
   - Takes 3-5 working days

3. **Medical Fitness Test**
   - Mandatory health screening
   - Includes blood tests and chest X-ray
   - Results within 3-4 working days

4. **Emirates ID Registration**
   - Biometric data collection
   - Photo and fingerprinting
   - Card delivery in 10-15 days

5. **Visa Stamping**
   - Final stage of visa process
   - Passport must be submitted
   - Takes 3-5 working days

6. **Labor Card Issuance**
   - Electronic work permit
   - Linked to the company license
   - Valid for the duration of visa

The entire process typically takes 2-3 weeks if all documents are in order.

### Visa Costs
Visa costs include:
- Entry permit: AED 1,300-2,100 (depending on type)
- Status change: AED 640
- Medical test: AED 320-650 (depending on type)
- Emirates ID: AED 370
- Visa stamping: AED 460-1,180 (depending on duration)
- Security deposit: AED 3,000 (refundable)

### Family Sponsorship Requirements
To sponsor family members, employees must:
- Earn a minimum monthly salary of AED 4,000
- Have appropriate accommodation
- Provide marriage certificate for spouse (attested)
- Provide birth certificates for children (attested)
- Male employees can sponsor parents under specific conditions

## Compliance and Regulatory Requirements

### Annual Compliance
DMCC companies must comply with:
- Annual license renewal
- Lease renewal
- Submission of audited financial statements
- Employee visa renewals
- Updated Ultimate Beneficial Owner (UBO) information
- Anti-Money Laundering (AML) regulations

### Record Keeping Requirements
Companies must maintain:
- Corporate documents (License, MOA, etc.)
- Financial records for at least 5 years
- Employee records
- Minutes of board meetings
- Shareholder registers
- Business transaction documentation

### Legal Compliance
DMCC companies must adhere to:
- UAE Federal Laws
- DMCC Free Zone Rules and Regulations
- Industry-specific regulations
- Labor laws for employment
- Intellectual property laws
- Data protection standards

### Changes to Company Structure
Any changes to the company structure require DMCC approval, including:
- Change of shareholders or directors
- Change of company name
- Change of business activities
- Increase or decrease in share capital
- Change of registered address
- Amendment to the MOA

### Penalties for Non-Compliance
Failure to comply with DMCC regulations can result in:
- Financial penalties
- License suspension
- Visa freezing
- Legal proceedings
- Ultimately, company deregistration

## Specialized Business Support

### Industry-Specific Facilities
DMCC offers specialized facilities for certain industries:

1. **DMCC Coffee Centre**
   - Coffee bean storage and processing
   - Quality testing and grading
   - Roasting facilities
   - Training and education

2. **DMCC Tea Centre**
   - Tea storage and blending
   - Quality testing
   - Packaging facilities
   - Trading platform

3. **Dubai Diamond Exchange**
   - Secure trading environment
   - Valuation services
   - Certification and verification
   - Industry networking

4. **Gold and Precious Metals**
   - Testing and certification
   - Secure vaulting
   - Trading facilities
   - Industry networking

### Innovation Hub
DMCC has established an innovation hub offering:
- Accelerator programs
- Incubation services
- Mentorship networks
- Funding access
- Networking events
- Collaborative workspace

### Business Support Services
DMCC offers various support services:
- Business setup consultancy
- PRO services for government transactions
- Visa and document processing
- Marketing support
- Networking opportunities
- Training and development`;

  const visaInformationContent = `# DMCC Visa and Immigration Guide

## Overview of DMCC Visa System

Dubai Multi Commodities Centre (DMCC) offers a comprehensive visa system for company owners, employees, and their dependents. As a free zone authority, DMCC can sponsor residence visas for individuals working in or owning companies established within the free zone. These visas grant legal residency in the UAE and allow individuals to live, work, and access various services in the country.

## Visa Allocation and Eligibility

### Allocation Criteria
The number of visas a company can obtain depends primarily on:

1. **Office Space Type and Size**
   - Flexi Desk: Up to 3 visas
   - Serviced Office: Up to 6 visas
   - Physical Office: Approximately 1 visa per 9 sqm of office space
   
2. **Business Activity**
   - Trading companies may receive different allocations than service companies
   - Some activities with higher operational needs may qualify for additional visas
   
3. **Company Structure**
   - FZE (Free Zone Establishment): Different allocation than FZCO
   - Branch offices: Allocation based on operational requirements
   
4. **Investment Level**
   - Companies with higher capital investment may qualify for additional visas

### Additional Visa Requests
Companies requiring visas beyond their standard allocation can apply through:

1. **Additional Visa Application**
   - Submission of business justification
   - Proof of necessity (contracts, expansion plans)
   - Payment of additional security deposits
   
2. **Labor Permit**
   - Short-term work authorization
   - Limited validity (typically 3-6 months)
   - Renewable based on business needs

## Types of Visas Available

### Employee Residence Visa
- **Duration**: 2 or 3 years (renewable)
- **Eligibility**: Full-time employees with valid employment contracts
- **Requirements**: Medical fitness, valid passport, employment contract, educational certificates
- **Processing Time**: 15-20 working days
- **Cost**: Approximately AED 4,500-5,500 (including all steps)

### Investor/Partner Visa
- **Duration**: 2 or 3 years (renewable)
- **Eligibility**: Shareholders holding at least 10% of company shares
- **Requirements**: Proof of shareholding, company documents, medical fitness
- **Processing Time**: 15-20 working days
- **Cost**: Approximately AED 4,500-5,500 (including all steps)

### Family Sponsorship
- **Duration**: Matches sponsor's visa duration
- **Eligibility**: Employees earning minimum monthly salary of AED 4,000
- **Eligible Dependents**: Spouse, children (sons under 18, unmarried daughters of any age)
- **Requirements**: Attested marriage/birth certificates, proof of adequate housing
- **Processing Time**: 15-20 working days per dependent
- **Cost**: Approximately AED 4,000-5,000 per dependent

### Domestic Helper Visa
- **Duration**: 2 years (renewable)
- **Eligibility**: DMCC visa holders earning above AED 10,000 monthly
- **Requirements**: Employment contract, sponsor's salary certificate, housing contract
- **Processing Time**: 15-20 working days
- **Cost**: Approximately AED 5,500-6,500

### Remote Work Visa
- **Duration**: 1 year
- **Eligibility**: Foreign professionals with employment contract outside UAE
- **Requirements**: Proof of employment, minimum monthly salary of USD 5,000
- **Processing Time**: 15-20 working days
- **Cost**: Approximately AED 3,000

## Visa Application Process

### Pre-Application Preparation
1. **Document Collection**
   - Passport copies (validity minimum 6 months)
   - Passport-sized photographs (white background)
   - Educational certificates (attested)
   - Previous employment certificates (if applicable)
   - No Objection Certificate (if transferring from another UAE sponsor)

2. **Document Authentication**
   - Educational certificates must be attested by:
     - Country of issuance
     - UAE embassy in that country
     - UAE Ministry of Foreign Affairs
   - Marriage and birth certificates require similar attestation
   - Documents not in Arabic or English must be legally translated

### Application Submission
1. **Online Application**
   - Submit through DMCC member portal
   - Upload required documents
   - Pay initial application fees
   
2. **Security Screening**
   - Background check by UAE authorities
   - Duration: 3-7 working days
   - May require additional information for certain nationalities

### Entry Permit Issuance
1. **Electronic Entry Permit**
   - Issued after security clearance
   - Valid for 60 days, single entry
   - Allows legal entry into UAE
   
2. **Status Change (if already in UAE)**
   - Convert tourist/visit visa to employment visa
   - Cost: Approximately AED 640
   - Duration: 3-5 working days

### Medical Fitness Testing
1. **Appointment Booking**
   - Through approved medical centers
   - Premium and VIP services available (faster processing)
   
2. **Required Tests**
   - Blood tests (including HIV, Hepatitis B)
   - Chest X-ray
   - General health assessment
   
3. **Results Processing**
   - Duration: 2-4 working days
   - Fitness certificate issued if tests are cleared

### Emirates ID Registration
1. **Application Submission**
   - Biometric data collection (fingerprints, photo)
   - Application form completion
   
2. **ID Card Issuance**
   - Duration: 10-15 working days
   - Collection in person or via courier
   - Valid for the duration of the residence visa

### Visa Stamping
1. **Passport Submission**
   - Original passport required
   - Temporary passport copy provided if needed
   
2. **Residence Visa Stamping**
   - Physical stamp placed in passport
   - Duration: 3-5 working days
   - Contains visa validity dates and sponsor information

### Labor Card Issuance
1. **Electronic Work Permit**
   - Issued by Ministry of Human Resources
   - Linked to the company and employee
   
2. **Labor Contract**
   - Official employment contract registration
   - Required for all employees
   - Must match offer letter terms

## Visa Costs and Fees

### Initial Visa Costs
- Entry Permit: AED 1,300-2,100 (depending on visa type)
- Status Change (if applicable): AED 640
- Medical Test: AED 320-650 (depending on type of service)
- Emirates ID: AED 370
- Visa Stamping: AED 460-1,180 (depending on visa duration)
- Labor Card: AED 500-700

### Additional Costs
- Security Deposit: AED 3,000 per visa (refundable)
- Typing and Processing Fees: AED 200-500
- Insurance: AED 800-2,500 (depending on coverage)
- Document Attestation: Varies by country and document type
- Translation Services: AED 100-300 per document

### Renewal Costs
- Renewal Application: AED 500
- Medical Test: AED 320-650
- Emirates ID Renewal: AED 370
- Visa Stamping: AED 460-1,180
- Insurance Renewal: AED 800-2,500

## Visa Maintenance Requirements

### Visa Activation
- Entry into UAE within 60 days of entry permit issuance
- Completion of residence visa stamping
- Emirates ID registration

### Residency Requirements
- No absence from UAE exceeding 6 continuous months
- Regular entry and exit recording in immigration system
- Maintaining valid employment relationship with sponsor

### Insurance Requirements
- Mandatory health insurance coverage
- Must meet minimum DHA (Dubai Health Authority) requirements
- Must be valid for entire visa duration

### Visa Cancellation Requirements
- Cancellation application through DMCC portal
- Original passport submission
- Clearance of any outstanding liabilities
- Return of Emirates ID
- Exit from UAE or status change to new sponsor within grace period

## Dependent Visa Details

### Spouse Visa Requirements
- Attested marriage certificate
- Husband's salary certificate (if wife is sponsoring)
- Proof of accommodation
- Health insurance

### Children Visa Requirements
- Attested birth certificates
- School enrollment certificates (if applicable)
- Health insurance
- Age limitations:
  - Sons: Under 18 years (extendable to 21 if in UAE university)
  - Daughters: Any age if unmarried

### Parent Sponsorship Requirements
- Minimum salary requirement: AED 20,000
- Proof of no support in home country
- Health insurance with senior coverage
- Deposit guarantee
- Annual renewal requirement

## Employment Contracts and Labor Relations

### DMCC Employment Contract
- Follows UAE Labor Law framework
- Must be registered with MOHRE (Ministry of Human Resources & Emiratisation)
- Specifies:
  - Job title and description
  - Remuneration package
  - Working hours
  - Leave entitlements
  - Notice period
  - Contract duration (limited or unlimited)

### Employee Rights
- End of service benefits (gratuity)
- Annual leave (30 calendar days for full year of service)
- Sick leave entitlements
- Health insurance coverage
- Overtime compensation (for eligible positions)
- Maternity leave (45-60 calendar days based on service length)

### Termination Procedures
- Written notice as per contract terms
- Settlement of all dues including gratuity
- Visa cancellation process
- Grace period of 30 days to exit or transfer sponsorship

## Visa Complications and Solutions

### Visa Rejection Scenarios
- Security concerns or background issues
- Medical fitness test failure
- Incomplete or incorrect documentation
- Previous immigration violations
- Nationality restrictions (rare but possible)

### Appeal Process
- Submission of appeal letter
- Provision of additional documentation
- Medical re-testing if applicable
- Legal assistance if necessary
- Timeline: 15-30 days for decision

### Visa Status Regularization
- For expired visas: Fine payment and renewal
- For visa violations: Amnesty periods or exit and re-entry
- For job loss: 30-day grace period to find new employment or exit

### Emergency Support
- DMCC Customer Happiness Center assistance
- Immigration consultancy services
- Legal counsel for complex cases
- Urgent visa processing options (premium fees apply)

## Special Considerations

### Golden Visa Eligibility
- DMCC investors with AED 10+ million investment
- Specialized talents in specific fields
- Executive directors with high salaries
- Duration: 5-10 years
- Benefit: Long-term stability without regular renewal

### Retirement Visa Option
- For individuals aged 55+
- Financial requirement: AED 1 million in savings or property
- Monthly income of AED 20,000+
- Duration: 5 years (renewable)

### Student Visa Transfer
- From parent's sponsorship to university sponsorship
- From university to DMCC employment
- Documentation: Release letter, new contract, academic records

### Salary Requirements for Certain Positions
- Managerial: Minimum AED 5,000+
- Professional: Minimum AED 4,000+
- Skilled: Minimum AED 3,000+
- These minimums may affect visa type and eligibility for dependent sponsorship`;

  // Array of documents to create
  const documents = [
    {
      title: "DMCC Comprehensive FAQs",
      filename: "dmcc_comprehensive_faqs.txt",
      filePath: "/dmcc_docs/knowledge_bank/dmcc_comprehensive_faqs.txt",
      documentType: "FAQ",
      category: "knowledge_bank",
      subcategory: "faqs",
      content: faqsContent
    },
    {
      title: "DMCC Detailed Business Setup Guide",
      filename: "dmcc_detailed_setup_guide.txt",
      filePath: "/dmcc_docs/business_setup/dmcc_detailed_setup_guide.txt",
      documentType: "Guide",
      category: "business_setup",
      subcategory: "setup_process",
      content: detailedSetupContent
    },
    {
      title: "DMCC Visa and Immigration Guide",
      filename: "dmcc_visa_immigration_guide.txt",
      filePath: "/dmcc_docs/compliance/dmcc_visa_immigration_guide.txt",
      documentType: "Guide",
      category: "compliance",
      subcategory: "visa_information",
      content: visaInformationContent
    }
  ];

  // Insert documents into the database
  for (const doc of documents) {
    try {
      // Check if document already exists
      const existingDocResult = await db.execute(sql`
        SELECT id FROM documents 
        WHERE filename = ${doc.filename} AND free_zone_id = ${dmccId}
      `);

      if (existingDocResult.rows.length > 0) {
        console.log(`Document ${doc.title} already exists, updating...`);
        
        await db.execute(sql`
          UPDATE documents
          SET content = ${doc.content},
              title = ${doc.title},
              file_path = ${doc.filePath},
              document_type = ${doc.documentType},
              category = ${doc.category},
              subcategory = ${doc.subcategory},
              metadata = jsonb_set(metadata::jsonb, '{updated}', 'true'::jsonb)
          WHERE id = ${existingDocResult.rows[0].id}
        `);
      } else {
        console.log(`Creating new document: ${doc.title}`);
        
        await db.execute(sql`
          INSERT INTO documents (
            title, 
            filename, 
            file_path, 
            document_type, 
            category, 
            subcategory, 
            free_zone_id, 
            content, 
            metadata
          ) VALUES (
            ${doc.title},
            ${doc.filename},
            ${doc.filePath},
            ${doc.documentType},
            ${doc.category},
            ${doc.subcategory},
            ${dmccId},
            ${doc.content},
            ${JSON.stringify({ 
              enhanced: true, 
              created_at: new Date().toISOString(),
              word_count: doc.content.split(/\s+/).length,
              category_path: `${doc.category}/${doc.subcategory}`
            })}
          )
        `);
      }
    } catch (error) {
      console.error(`Error creating/updating document ${doc.title}:`, error);
    }
  }

  console.log('Completed adding detailed DMCC documents to database');
}

// Run the function
addDMCCDetailedDocuments()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });