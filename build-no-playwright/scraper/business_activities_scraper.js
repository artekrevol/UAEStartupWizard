import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from '../server/db.js';
import { businessActivities, businessCategories } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

// Business activity data organized by categories
const BUSINESS_ACTIVITIES = {
  "Manufacturing": [
    {
      name: "Food & Beverages",
      description: "Manufacturing of food products and beverages for consumer or industrial use",
      required_docs: [
        "Food safety certifications",
        "Health department approvals",
        "Environmental clearance",
        "Trade license application",
        "Emirates ID copies"
      ],
      minimum_capital: 250000,
      fees: {
        "license_fee": 15000,
        "registration_fee": 10000,
        "food_safety_fee": 5000
      },
      approval_requirements: [
        "Municipality approval",
        "Health department inspection",
        "Food safety certification",
        "Environmental compliance"
      ]
    },
    {
      name: "Textiles & Clothing",
      description: "Manufacturing of textiles, garments, and apparel products",
      required_docs: [
        "Factory layout",
        "Environmental clearance",
        "Trade license application",
        "Passport copies",
        "Emirates ID"
      ],
      minimum_capital: 200000,
      fees: {
        "license_fee": 12000,
        "registration_fee": 8000
      },
      approval_requirements: [
        "Municipality approval",
        "Department of Economic Development approval",
        "Environmental compliance"
      ]
    },
    {
      name: "Chemical Products",
      description: "Manufacturing of chemical compounds and products for industrial or consumer use",
      required_docs: [
        "Chemical handling certifications",
        "Hazardous materials permits",
        "Environmental impact assessment",
        "Factory layout",
        "Safety protocols documentation"
      ],
      minimum_capital: 500000,
      fees: {
        "license_fee": 18000,
        "registration_fee": 12000,
        "hazardous_materials_permit": 8000
      },
      approval_requirements: [
        "Civil Defense approval",
        "Environmental agency clearance",
        "Industrial safety inspection",
        "Hazardous materials handling certification"
      ]
    },
    {
      name: "Electronics & Electrical",
      description: "Manufacturing of electronic components, devices, and electrical equipment",
      required_docs: [
        "Technical specifications",
        "Product safety certifications",
        "Factory layout",
        "Equipment inventory",
        "Trade license application"
      ],
      minimum_capital: 350000,
      fees: {
        "license_fee": 15000,
        "registration_fee": 10000,
        "technical_inspection_fee": 5000
      },
      approval_requirements: [
        "Technical review board approval",
        "Product safety certification",
        "Environmental compliance",
        "Industrial zone authorization"
      ]
    },
    {
      name: "Metal Products",
      description: "Manufacturing of metal products, structures, and components",
      required_docs: [
        "Factory layout",
        "Equipment specifications",
        "Environmental clearance",
        "Trade license application",
        "Safety protocols documentation"
      ],
      minimum_capital: 300000,
      fees: {
        "license_fee": 14000,
        "registration_fee": 9000,
        "industrial_inspection_fee": 4000
      },
      approval_requirements: [
        "Municipality approval",
        "Environmental agency clearance",
        "Industrial zone authorization",
        "Safety certification"
      ]
    },
    {
      name: "Pharmaceuticals",
      description: "Manufacturing of pharmaceutical products and medical compounds",
      required_docs: [
        "Pharmaceutical licensing",
        "Good Manufacturing Practice certification",
        "Laboratory certifications",
        "Drug registration approvals",
        "Health authority permits"
      ],
      minimum_capital: 1000000,
      fees: {
        "license_fee": 25000,
        "registration_fee": 15000,
        "pharmaceutical_certification": 20000
      },
      approval_requirements: [
        "Ministry of Health approval",
        "Pharmaceutical regulatory compliance",
        "Laboratory certification",
        "Quality control certification",
        "Drug registration approval"
      ]
    }
  ],
  "Trading": [
    {
      name: "General Trading",
      description: "Trading in multiple product categories without specialization",
      required_docs: [
        "Trade license application",
        "Passport copies",
        "Emirates ID",
        "Lease agreement",
        "Company profile"
      ],
      minimum_capital: 100000,
      fees: {
        "license_fee": 15000,
        "registration_fee": 10000
      },
      approval_requirements: [
        "Department of Economic Development approval",
        "Chamber of Commerce registration"
      ]
    },
    {
      name: "Import/Export",
      description: "Specialized trading focused on international import and export activities",
      required_docs: [
        "Trade license application",
        "Import/export code registration",
        "Customs registration",
        "Passport copies",
        "Chamber of Commerce membership"
      ],
      minimum_capital: 150000,
      fees: {
        "license_fee": 16000,
        "registration_fee": 10000,
        "customs_registration": 5000
      },
      approval_requirements: [
        "Customs department approval",
        "Trade control approval",
        "Chamber of Commerce registration"
      ]
    },
    {
      name: "Wholesale",
      description: "Trading with retailers and businesses rather than end consumers",
      required_docs: [
        "Trade license application",
        "Warehouse lease agreement",
        "Trade name reservation",
        "Passport copies",
        "Company profile"
      ],
      minimum_capital: 200000,
      fees: {
        "license_fee": 14000,
        "registration_fee": 9000,
        "warehouse_inspection": 3000
      },
      approval_requirements: [
        "Department of Economic Development approval",
        "Municipality warehouse approval",
        "Fire safety certification"
      ]
    },
    {
      name: "Retail",
      description: "Trading directly with end consumers through physical or online stores",
      required_docs: [
        "Trade license application",
        "Store lease agreement",
        "Signage approval",
        "Passport copies",
        "Emirates ID"
      ],
      minimum_capital: 100000,
      fees: {
        "license_fee": 12000,
        "registration_fee": 8000,
        "signage_fee": 2000
      },
      approval_requirements: [
        "Department of Economic Development approval",
        "Municipality shop approval",
        "Signage approval",
        "Civil Defense clearance"
      ]
    },
    {
      name: "E-commerce",
      description: "Online trading and selling of products through digital platforms",
      required_docs: [
        "Trade license application",
        "Domain registration",
        "Payment gateway agreement",
        "Digital security certification",
        "Terms & conditions document"
      ],
      minimum_capital: 50000,
      fees: {
        "license_fee": 12000,
        "registration_fee": 8000,
        "e-commerce_permit": 5000
      },
      approval_requirements: [
        "Department of Economic Development approval",
        "Telecommunications Regulatory Authority registration",
        "Payment gateway certification"
      ]
    },
    {
      name: "Specialized Trading",
      description: "Trading focused on specific product categories requiring special permits",
      required_docs: [
        "Trade license application",
        "Product-specific permits",
        "Specialized knowledge certification",
        "Inventory documentation",
        "Supplier agreements"
      ],
      minimum_capital: 200000,
      fees: {
        "license_fee": 18000,
        "registration_fee": 12000,
        "specialized_permit": 10000
      },
      approval_requirements: [
        "Department of Economic Development approval",
        "Specialized product authority approval",
        "Chamber of Commerce registration"
      ]
    }
  ],
  "Professional Services": [
    {
      name: "Legal Services",
      description: "Providing legal advice, representation, and documentation services",
      required_docs: [
        "Professional license application",
        "Legal qualifications certificates",
        "Registration with legal authorities",
        "Professional indemnity insurance",
        "Office lease agreement"
      ],
      minimum_capital: 100000,
      fees: {
        "license_fee": 20000,
        "registration_fee": 15000,
        "legal_authority_registration": 10000
      },
      approval_requirements: [
        "Legal Affairs Department approval",
        "Ministry of Justice registration",
        "Emirates Lawyers Association membership"
      ]
    },
    {
      name: "Accounting & Auditing",
      description: "Financial accounting, auditing, and bookkeeping services",
      required_docs: [
        "Professional license application",
        "Accounting qualifications certificates",
        "Professional membership evidence",
        "Professional indemnity insurance",
        "Office lease agreement"
      ],
      minimum_capital: 80000,
      fees: {
        "license_fee": 18000,
        "registration_fee": 12000,
        "professional_board_registration": 8000
      },
      approval_requirements: [
        "Ministry of Economy approval",
        "Accountants Association membership",
        "Professional ethics certification"
      ]
    },
    {
      name: "Engineering",
      description: "Engineering design, consultation, and project management services",
      required_docs: [
        "Professional license application",
        "Engineering qualifications certificates",
        "Professional membership evidence",
        "Project portfolio",
        "Professional indemnity insurance"
      ],
      minimum_capital: 100000,
      fees: {
        "license_fee": 18000,
        "registration_fee": 12000,
        "engineering_board_registration": 8000
      },
      approval_requirements: [
        "Municipality engineering department approval",
        "Engineering Society membership",
        "Professional qualification verification"
      ]
    },
    {
      name: "Architecture",
      description: "Architectural design, planning, and consultation services",
      required_docs: [
        "Professional license application",
        "Architecture qualifications certificates",
        "Professional membership evidence",
        "Design portfolio",
        "Professional indemnity insurance"
      ],
      minimum_capital: 100000,
      fees: {
        "license_fee": 18000,
        "registration_fee": 12000,
        "architecture_board_registration": 8000
      },
      approval_requirements: [
        "Municipality planning department approval",
        "Architectural Society membership",
        "Professional qualification verification"
      ]
    },
    {
      name: "Management Consulting",
      description: "Business strategy, operations, and management advisory services",
      required_docs: [
        "Professional license application",
        "Qualifications certificates",
        "Experience documentation",
        "Client references",
        "Office lease agreement"
      ],
      minimum_capital: 50000,
      fees: {
        "license_fee": 15000,
        "registration_fee": 10000
      },
      approval_requirements: [
        "Department of Economic Development approval",
        "Professional qualification verification"
      ]
    },
    {
      name: "Healthcare",
      description: "Medical, health, and wellness professional services",
      required_docs: [
        "Professional license application",
        "Medical/healthcare qualifications",
        "Professional registration certificate",
        "Medical indemnity insurance",
        "Clinical protocols documentation"
      ],
      minimum_capital: 200000,
      fees: {
        "license_fee": 25000,
        "registration_fee": 15000,
        "health_authority_registration": 10000
      },
      approval_requirements: [
        "Health Authority approval",
        "Medical professional board registration",
        "Facility inspection clearance",
        "Medical license verification"
      ]
    }
  ],
  "Construction": [
    {
      name: "Building Construction",
      description: "Construction of residential, commercial, and industrial buildings",
      required_docs: [
        "Contractor license application",
        "Engineering staff credentials",
        "Equipment inventory",
        "Safety protocols documentation",
        "Previous project portfolio"
      ],
      minimum_capital: 500000,
      fees: {
        "license_fee": 20000,
        "registration_fee": 15000,
        "contractor_classification": 10000
      },
      approval_requirements: [
        "Municipality contractor approval",
        "Civil Defense clearance",
        "Contractor classification certification",
        "Engineering staff verification"
      ]
    },
    {
      name: "Civil Engineering",
      description: "Construction of infrastructure projects like roads, bridges, and utilities",
      required_docs: [
        "Contractor license application",
        "Civil engineering credentials",
        "Heavy equipment inventory",
        "Safety protocols documentation",
        "Project management plan"
      ],
      minimum_capital: 1000000,
      fees: {
        "license_fee": 25000,
        "registration_fee": 15000,
        "contractor_classification": 15000
      },
      approval_requirements: [
        "Municipality infrastructure department approval",
        "Roads & Transport Authority clearance",
        "Contractor classification certification",
        "Engineering staff verification"
      ]
    },
    {
      name: "Specialized Construction",
      description: "Specialized construction services like HVAC, electrical, or plumbing",
      required_docs: [
        "Specialized contractor license",
        "Technical staff credentials",
        "Specialized equipment inventory",
        "Safety protocols documentation",
        "Technical certifications"
      ],
      minimum_capital: 300000,
      fees: {
        "license_fee": 18000,
        "registration_fee": 12000,
        "specialized_certification": 8000
      },
      approval_requirements: [
        "Municipality technical department approval",
        "Technical certification verification",
        "Specialized contractor classification"
      ]
    },
    {
      name: "Real Estate Development",
      description: "Development of real estate projects from planning to completion",
      required_docs: [
        "Developer license application",
        "Land ownership documents",
        "Project financing evidence",
        "Development proposal",
        "Environmental impact assessment"
      ],
      minimum_capital: 5000000,
      fees: {
        "license_fee": 50000,
        "registration_fee": 25000,
        "developer_registration": 20000
      },
      approval_requirements: [
        "Land Department approval",
        "Planning Department clearance",
        "Developer registration",
        "Financial capability verification",
        "Environmental compliance"
      ]
    },
    {
      name: "MEP Services",
      description: "Mechanical, electrical, and plumbing engineering and contracting services",
      required_docs: [
        "MEP contractor license",
        "Technical staff credentials",
        "Equipment inventory",
        "Safety protocols documentation",
        "Technical certifications"
      ],
      minimum_capital: 300000,
      fees: {
        "license_fee": 18000,
        "registration_fee": 12000,
        "technical_certification": 8000
      },
      approval_requirements: [
        "Municipality technical department approval",
        "Civil Defense clearance",
        "Technical certification verification",
        "Specialized contractor classification"
      ]
    },
    {
      name: "Interior Design",
      description: "Commercial and residential interior design and fit-out services",
      required_docs: [
        "Interior design license",
        "Design portfolio",
        "Staff credentials",
        "Office lease agreement",
        "Professional indemnity insurance"
      ],
      minimum_capital: 100000,
      fees: {
        "license_fee": 15000,
        "registration_fee": 10000
      },
      approval_requirements: [
        "Department of Economic Development approval",
        "Professional qualification verification",
        "Portfolio assessment"
      ]
    }
  ],
  "Technology": [
    {
      name: "Software Development",
      description: "Design, development, and maintenance of software applications",
      required_docs: [
        "Technology license application",
        "Technical staff credentials",
        "Software development methodology",
        "Project portfolio",
        "Office lease agreement"
      ],
      minimum_capital: 50000,
      fees: {
        "license_fee": 15000,
        "registration_fee": 10000
      },
      approval_requirements: [
        "Department of Economic Development approval",
        "Telecommunications Regulatory Authority registration (if applicable)"
      ]
    },
    {
      name: "IT Services",
      description: "Information technology support, maintenance, and consulting services",
      required_docs: [
        "Technology license application",
        "Technical staff credentials",
        "Service methodology documentation",
        "Client references",
        "Office lease agreement"
      ],
      minimum_capital: 50000,
      fees: {
        "license_fee": 15000,
        "registration_fee": 10000
      },
      approval_requirements: [
        "Department of Economic Development approval",
        "Technical qualification verification"
      ]
    },
    {
      name: "Digital Solutions",
      description: "Provision of digital transformation and integrated digital solutions",
      required_docs: [
        "Technology license application",
        "Technical staff credentials",
        "Solution methodology documentation",
        "Project portfolio",
        "Office lease agreement"
      ],
      minimum_capital: 80000,
      fees: {
        "license_fee": 16000,
        "registration_fee": 10000
      },
      approval_requirements: [
        "Department of Economic Development approval",
        "Technical qualification verification"
      ]
    },
    {
      name: "AI & Data Analytics",
      description: "Artificial intelligence solutions and data analysis services",
      required_docs: [
        "Technology license application",
        "Technical staff credentials",
        "Data privacy compliance documentation",
        "AI ethics statement",
        "Project portfolio"
      ],
      minimum_capital: 100000,
      fees: {
        "license_fee": 18000,
        "registration_fee": 12000
      },
      approval_requirements: [
        "Department of Economic Development approval",
        "Data protection compliance verification",
        "Technical qualification verification"
      ]
    },
    {
      name: "Cybersecurity",
      description: "Information security services, consulting, and solutions",
      required_docs: [
        "Technology license application",
        "Security certifications",
        "Technical staff credentials",
        "Methodology documentation",
        "Security clearances (if applicable)"
      ],
      minimum_capital: 100000,
      fees: {
        "license_fee": 18000,
        "registration_fee": 12000,
        "security_verification": 5000
      },
      approval_requirements: [
        "Department of Economic Development approval",
        "Cybersecurity qualification verification",
        "Security clearance verification (if applicable)"
      ]
    },
    {
      name: "Cloud Services",
      description: "Cloud computing, hosting, and related technology services",
      required_docs: [
        "Technology license application",
        "Technical staff credentials",
        "Data center documentation (if applicable)",
        "Service methodology documentation",
        "Data protection policies"
      ],
      minimum_capital: 100000,
      fees: {
        "license_fee": 18000,
        "registration_fee": 12000
      },
      approval_requirements: [
        "Department of Economic Development approval",
        "Telecommunications Regulatory Authority registration (if applicable)",
        "Data protection compliance verification"
      ]
    }
  ],
  "Tourism & Hospitality": [
    {
      name: "Hotel Management",
      description: "Operation and management of hotels and accommodation facilities",
      required_docs: [
        "Tourism license application",
        "Hotel classification documentation",
        "Staff credentials",
        "Safety and security protocols",
        "Property management agreement"
      ],
      minimum_capital: 500000,
      fees: {
        "license_fee": 25000,
        "registration_fee": 15000,
        "hotel_classification": 10000
      },
      approval_requirements: [
        "Department of Tourism approval",
        "Civil Defense clearance",
        "Health Department approval",
        "Hotel classification certification"
      ]
    },
    {
      name: "Travel Agency",
      description: "Booking and organization of travel, tours, and related services",
      required_docs: [
        "Tourism license application",
        "IATA certification (if applicable)",
        "Staff credentials",
        "Office lease agreement",
        "Service offerings documentation"
      ],
      minimum_capital: 100000,
      fees: {
        "license_fee": 15000,
        "registration_fee": 10000,
        "tourism_department_registration": 5000
      },
      approval_requirements: [
        "Department of Tourism approval",
        "IATA verification (if applicable)",
        "Tourism department registration"
      ]
    },
    {
      name: "Restaurant & Catering",
      description: "Food service operations including restaurants and catering services",
      required_docs: [
        "Food service license application",
        "Menu approval",
        "Staff health cards",
        "Premises lease agreement",
        "Food safety certification"
      ],
      minimum_capital: 200000,
      fees: {
        "license_fee": 15000,
        "registration_fee": 10000,
        "food_safety_certification": 5000
      },
      approval_requirements: [
        "Municipality food control approval",
        "Health Department clearance",
        "Civil Defense certification",
        "Food safety certification"
      ]
    },
    {
      name: "Event Management",
      description: "Organization and management of events, conferences, and exhibitions",
      required_docs: [
        "Event management license application",
        "Staff credentials",
        "Event safety protocols",
        "Office lease agreement",
        "Previous event portfolio"
      ],
      minimum_capital: 100000,
      fees: {
        "license_fee": 15000,
        "registration_fee": 10000
      },
      approval_requirements: [
        "Department of Tourism approval",
        "Department of Economic Development registration",
        "Event safety certification (for large events)"
      ]
    },
    {
      name: "Entertainment Services",
      description: "Entertainment venues, activities, and services",
      required_docs: [
        "Entertainment license application",
        "Venue layout/specifications",
        "Safety protocols documentation",
        "Content approval (if applicable)",
        "Staff credentials"
      ],
      minimum_capital: 200000,
      fees: {
        "license_fee": 20000,
        "registration_fee": 15000,
        "entertainment_permit": 10000
      },
      approval_requirements: [
        "Department of Tourism approval",
        "Civil Defense clearance",
        "Content approval (if applicable)",
        "Municipality venue approval"
      ]
    }
  ]
};

/**
 * Populates business activities data from our structured data
 */
async function populateBusinessActivities() {
  console.log('Starting to populate business activities data...');
  
  for (const [categoryName, activities] of Object.entries(BUSINESS_ACTIVITIES)) {
    try {
      // Get the category ID
      const [category] = await db
        .select()
        .from(businessCategories)
        .where(eq(businessCategories.name, categoryName));
      
      if (!category) {
        console.log(`Category ${categoryName} not found, skipping its activities`);
        continue;
      }
      
      const categoryId = category.id;
      
      // Process each activity
      for (const activity of activities) {
        await upsertBusinessActivity(categoryId, activity);
      }
      
      console.log(`Processed ${activities.length} activities for category: ${categoryName}`);
    } catch (error) {
      console.error(`Error processing activities for category ${categoryName}:`, error);
    }
  }
  
  console.log('Finished populating business activities data');
}

/**
 * Insert or update a business activity in the database
 */
async function upsertBusinessActivity(categoryId, activityData) {
  try {
    // Check if activity already exists
    const [existingActivity] = await db
      .select()
      .from(businessActivities)
      .where(eq(businessActivities.name, activityData.name))
      .where(eq(businessActivities.categoryId, categoryId));
    
    if (existingActivity) {
      // Update existing activity
      await db.update(businessActivities)
        .set({
          description: activityData.description,
          requiredDocs: activityData.required_docs,
          minimumCapital: activityData.minimum_capital,
          fees: activityData.fees,
          approvalRequirements: activityData.approval_requirements
        })
        .where(eq(businessActivities.id, existingActivity.id));
      
      console.log(`Updated existing business activity: ${activityData.name}`);
    } else {
      // Insert new activity
      await db.insert(businessActivities).values({
        categoryId: categoryId,
        name: activityData.name,
        description: activityData.description,
        requiredDocs: activityData.required_docs,
        minimumCapital: activityData.minimum_capital,
        fees: activityData.fees,
        approvalRequirements: activityData.approval_requirements
      });
      
      console.log(`Added new business activity: ${activityData.name}`);
    }
  } catch (error) {
    console.error(`Error upserting business activity ${activityData.name}:`, error);
  }
}

export { populateBusinessActivities };