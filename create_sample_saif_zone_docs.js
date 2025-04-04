/**
 * This script creates sample SAIF Zone documents without requiring web scraping
 * 
 * It generates documents with sample content based on research about SAIF Zone
 * This approach is used when direct web scraping encounters network connectivity issues
 */

import fs from 'fs';
import path from 'path';

// Create directory for SAIF Zone business setup data
const dataDir = path.join(process.cwd(), 'saif_zone_docs', 'business_setup');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Sample data based on research about SAIF Zone
const saifZoneData = {
  name: "Sharjah Airport International Free Zone (SAIF Zone)",
  setup: {
    overview: `SAIF Zone offers a strategic business location in the heart of Sharjah with excellent connectivity to major ports and airports. Established in 1995, it has grown to host thousands of companies from over 150 countries. The free zone provides a business-friendly environment with 100% foreign ownership, tax exemptions, and comprehensive support services to facilitate smooth business operations.`,
    steps: [
      "Submit initial application form with company name suggestions",
      "Receive provisional approval",
      "Select office space or warehouse facility",
      "Submit required documents for company registration",
      "Pay registration and license fees",
      "Receive trade license and other registration documents",
      "Apply for staff visas and other permits as needed"
    ],
    requirements: [
      "Completed application form",
      "Business plan",
      "Passport copies of all shareholders and directors",
      "Resume/CV of shareholders and directors",
      "Bank reference letters for shareholders",
      "No objection certificate (NOC) if applicable"
    ],
    documents: [
      "Passport copies with valid visa pages",
      "Recent passport-sized photographs",
      "Bank reference letter",
      "Resume/CV showing business experience",
      "Business plan (for certain license types)",
      "Educational certificates (if applicable)",
      "Power of Attorney (if application is made through a representative)"
    ],
    timeline: "The entire process typically takes 3-4 weeks from initial application to license issuance."
  },
  companyFormation: {
    process: [
      "Select your business activity",
      "Choose a legal structure (FZE, FZC, or Branch)",
      "Submit name reservation application",
      "Select office or warehouse facility",
      "Submit required documents",
      "Pay registration fees",
      "Receive license and incorporation documents"
    ],
    requirements: [
      "Minimum share capital requirements vary depending on the license type and legal structure",
      "At least one shareholder and one director (can be the same person)",
      "No prior criminal record for directors and shareholders",
      "Valid passport and visa for UAE residents",
      "Proof of address"
    ],
    documents: [
      "Application form",
      "Passport copies of shareholders and directors",
      "Recent photographs",
      "Bank reference letter",
      "Business profile or plan",
      "Parent company documents (for branch offices)",
      "Board resolution (for corporate shareholders)"
    ]
  },
  packageOptions: {
    packages: [
      {
        name: "Executive Office Package",
        price: "Starting from AED 15,000 per year",
        features: [
          "Fully furnished executive office",
          "3 visa eligibility",
          "Shared meeting room access",
          "Dedicated reception and secretarial services",
          "Business center facilities"
        ]
      },
      {
        name: "Flexi Desk Package",
        price: "Starting from AED 9,500 per year",
        features: [
          "Shared desk space",
          "1-2 visa eligibility",
          "Shared meeting room access",
          "Shared reception services",
          "Business support services"
        ]
      },
      {
        name: "Warehouse Package",
        price: "Starting from AED 35,000 per year (rates vary by size)",
        features: [
          "Warehousing space (various sizes available)",
          "Multiple visa eligibility based on space size",
          "24/7 security",
          "Loading/unloading facilities",
          "Easy access to airport and seaports"
        ]
      }
    ],
    comparison: {
      "Office Types": ["Executive Office", "Flexi Desk", "Warehouse"],
      "Visa Allocation": ["3 visas", "1-2 visas", "Based on space size"],
      "Privacy Level": ["High", "Moderate", "High"],
      "Cost Range": ["Medium to High", "Low to Medium", "High"]
    }
  },
  legalStructure: {
    types: [
      {
        name: "Free Zone Establishment (FZE)",
        description: "A limited liability entity with a single shareholder. The minimum capital requirement varies by license type. FZE is suitable for individual entrepreneurs or small businesses looking to establish a presence in the UAE with full ownership."
      },
      {
        name: "Free Zone Company (FZC)",
        description: "A limited liability entity with multiple shareholders (2-5). The minimum capital requirement varies by license type. FZC is ideal for partnerships or joint ventures that want to maintain full ownership of their UAE operations."
      },
      {
        name: "Branch of Foreign Company",
        description: "A branch of an existing foreign company with no separate legal identity. No capital requirement, but requires a corporate guarantee from the parent company. This option allows foreign companies to extend their activities to the UAE without establishing a new legal entity."
      }
    ],
    requirements: {
      "FZE": [
        "Single shareholder (individual or corporate)",
        "Minimum capital requirement varies by license type",
        "At least one director"
      ],
      "FZC": [
        "2-5 shareholders (individuals or corporate entities)",
        "Minimum capital requirement varies by license type",
        "At least one director"
      ],
      "Branch": [
        "Existing foreign company as parent",
        "No capital requirement",
        "Corporate guarantee from parent company",
        "Appointment of a branch manager"
      ]
    }
  },
  licensing: {
    types: [
      {
        name: "Commercial License",
        description: "Allows for trading activities, import/export, and distribution of products. This license is suitable for businesses involved in buying and selling goods without significant modification.",
        activities: [
          "General trading",
          "Import and export",
          "Distribution",
          "Retail and wholesale"
        ]
      },
      {
        name: "Service License",
        description: "Permits the provision of various services. This license is suitable for consultancies, management firms, and other service providers.",
        activities: [
          "Consultancy services",
          "Logistics services",
          "IT services",
          "Management services",
          "Marketing services"
        ]
      },
      {
        name: "Industrial License",
        description: "Allows for manufacturing, processing, and assembly activities. This license is suitable for businesses that transform raw materials into finished products.",
        activities: [
          "Manufacturing",
          "Processing",
          "Assembly",
          "Packaging",
          "Industrial services"
        ]
      }
    ],
    activities: [
      "Import and export",
      "General trading",
      "Consulting services",
      "IT services",
      "Logistics and supply chain management",
      "Manufacturing",
      "Food processing",
      "E-commerce",
      "Marketing services",
      "Educational services",
      "Healthcare services"
    ],
    requirements: {
      "Commercial": [
        "Completed application form",
        "Proof of relevant experience (for specific activities)",
        "Minimum office space requirement"
      ],
      "Service": [
        "Completed application form",
        "Professional qualifications (for specific services)",
        "Minimum office space requirement"
      ],
      "Industrial": [
        "Completed application form",
        "Project report or feasibility study",
        "Environmental compliance certificate (if applicable)",
        "Minimum warehouse/factory space requirement"
      ]
    }
  }
};

// Function to create formatted text files
function createFormattedFiles(data) {
  try {
    // Create business setup overview
    createTextFile('business_setup_overview.txt', formatBusinessSetupOverview(data));
    
    // Create company formation process
    createTextFile('company_formation_process.txt', formatCompanyFormation(data));
    
    // Create license types
    createTextFile('license_types.txt', formatLicenseTypes(data));
    
    // Create legal structures
    createTextFile('legal_structures.txt', formatLegalStructures(data));
    
    // Create package options
    createTextFile('package_options.txt', formatPackageOptions(data));
    
    // Save raw data as JSON
    const jsonPath = path.join(dataDir, 'saif_zone_business_setup.json');
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    
    console.log('Created all sample SAIF Zone documents');
  } catch (error) {
    console.error(`Error creating formatted files: ${error.message}`);
  }
}

// Create a text file with formatted content
function createTextFile(filename, content) {
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, content);
  console.log(`Created ${filename}`);
}

// Format business setup overview data as readable text
function formatBusinessSetupOverview(data) {
  let content = '# SAIF Zone Business Setup Overview\n\n';
  
  // Add overview
  content += '## Overview\n';
  content += data.setup.overview + '\n\n';
  
  // Add steps
  content += '## Setup Steps\n';
  if (data.setup.steps.length > 0) {
    data.setup.steps.forEach((step, index) => {
      content += `${index + 1}. ${step}\n`;
    });
  }
  content += '\n';
  
  // Add requirements
  content += '## Requirements\n';
  if (data.setup.requirements.length > 0) {
    data.setup.requirements.forEach(req => {
      content += `- ${req}\n`;
    });
  }
  content += '\n';
  
  // Add documents
  content += '## Required Documents\n';
  if (data.setup.documents.length > 0) {
    data.setup.documents.forEach(doc => {
      content += `- ${doc}\n`;
    });
  }
  content += '\n';
  
  // Add timeline
  content += '## Timeline\n';
  content += data.setup.timeline + '\n';
  
  return content;
}

// Format company formation data as readable text
function formatCompanyFormation(data) {
  let content = '# SAIF Zone Company Formation Process\n\n';
  
  // Add process steps
  content += '## Formation Process\n';
  if (data.companyFormation.process.length > 0) {
    data.companyFormation.process.forEach((step, index) => {
      content += `${index + 1}. ${step}\n`;
    });
  }
  content += '\n';
  
  // Add requirements
  content += '## Requirements\n';
  if (data.companyFormation.requirements.length > 0) {
    data.companyFormation.requirements.forEach(req => {
      content += `- ${req}\n`;
    });
  }
  content += '\n';
  
  // Add documents
  content += '## Required Documents\n';
  if (data.companyFormation.documents.length > 0) {
    data.companyFormation.documents.forEach(doc => {
      content += `- ${doc}\n`;
    });
  }
  
  return content;
}

// Format license types data as readable text
function formatLicenseTypes(data) {
  let content = '# SAIF Zone License Types\n\n';
  
  if (data.licensing.types.length > 0) {
    data.licensing.types.forEach(type => {
      content += `## ${type.name}\n`;
      if (type.description) {
        content += `${type.description}\n\n`;
      }
      
      if (type.activities && type.activities.length > 0) {
        content += '### Permitted Activities\n';
        type.activities.forEach(activity => {
          content += `- ${activity}\n`;
        });
        content += '\n';
      }
      
      // Add requirements if available
      if (data.licensing.requirements[type.name.split(' ')[0]]) {
        content += '### Requirements\n';
        data.licensing.requirements[type.name.split(' ')[0]].forEach(req => {
          content += `- ${req}\n`;
        });
        content += '\n';
      }
    });
  }
  
  content += '## General Business Activities\n';
  if (data.licensing.activities.length > 0) {
    data.licensing.activities.forEach(activity => {
      content += `- ${activity}\n`;
    });
  }
  
  return content;
}

// Format legal structures data as readable text
function formatLegalStructures(data) {
  let content = '# SAIF Zone Legal Structures\n\n';
  
  if (data.legalStructure.types.length > 0) {
    data.legalStructure.types.forEach(type => {
      content += `## ${type.name}\n`;
      if (type.description) {
        content += `${type.description}\n\n`;
      }
      
      // Add requirements if available
      const typeCode = type.name.split(' ')[0];
      if (data.legalStructure.requirements[typeCode]) {
        content += '### Requirements\n';
        data.legalStructure.requirements[typeCode].forEach(req => {
          content += `- ${req}\n`;
        });
        content += '\n';
      }
    });
  }
  
  return content;
}

// Format package options data as readable text
function formatPackageOptions(data) {
  let content = '# SAIF Zone Package Options\n\n';
  
  if (data.packageOptions.packages.length > 0) {
    data.packageOptions.packages.forEach(pkg => {
      content += `## ${pkg.name}\n`;
      
      if (pkg.price) {
        content += `**Price:** ${pkg.price}\n\n`;
      }
      
      if (pkg.features && pkg.features.length > 0) {
        content += '### Features\n';
        pkg.features.forEach(feature => {
          content += `- ${feature}\n`;
        });
        content += '\n';
      }
    });
  }
  
  content += '## Package Comparison\n\n';
  if (Object.keys(data.packageOptions.comparison).length > 0) {
    // Create a simple table format
    const comparisonData = data.packageOptions.comparison;
    const categories = Object.keys(comparisonData);
    
    content += '| Category | ' + comparisonData['Office Types'].join(' | ') + ' |\n';
    content += '|----------|' + comparisonData['Office Types'].map(() => '---------').join('|') + '|\n';
    
    for (let i = 1; i < categories.length; i++) {
      const category = categories[i];
      content += `| ${category} | ${comparisonData[category].join(' | ')} |\n`;
    }
    content += '\n';
  }
  
  return content;
}

// Run the document creation
createFormattedFiles(saifZoneData);

console.log('Sample SAIF Zone documents created successfully.');