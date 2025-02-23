import { BusinessSetup } from "@shared/schema";

interface ScoreComponent {
  score: number;
  maxScore: number;
  label: string;
  description: string;
}

export interface BusinessScore {
  total: number;
  components: ScoreComponent[];
  progress: number;
}

function calculateBudgetScore(budget: number, estimatedCost: number): ScoreComponent {
  const ratio = budget / estimatedCost;
  let score = 0;
  let description = "";

  if (ratio >= 1.5) {
    score = 25;
    description = "Excellent budget allocation";
  } else if (ratio >= 1.2) {
    score = 20;
    description = "Good budget allocation";
  } else if (ratio >= 1) {
    score = 15;
    description = "Adequate budget";
  } else if (ratio >= 0.8) {
    score = 10;
    description = "Budget might be tight";
  } else {
    score = 5;
    description = "Budget may need revision";
  }

  return {
    score,
    maxScore: 25,
    label: "Budget Readiness",
    description
  };
}

function calculateIndustryScore(industry: string, businessType: string): ScoreComponent {
  // Predefined weights for different industries
  const industryWeights = {
    "Technology": {
      "Software Development": 25,
      "IT Consulting": 23,
      "Digital Marketing": 22,
      "Cloud Services": 24,
      "Cybersecurity": 25,
      "Mobile App Development": 24
    },
    "Trading": {
      "Import/Export General Trading": 25,
      "E-commerce Trading": 23,
      "Consumer Electronics": 22,
      "Textiles & Garments": 21,
      "Building Materials": 20,
      "Auto Parts": 21
    }
    // Add more industry weights as needed
  };

  const score = industryWeights[industry as keyof typeof industryWeights]?.[businessType as keyof typeof industryWeights[keyof typeof industryWeights]] || 15;
  
  return {
    score,
    maxScore: 25,
    label: "Industry Alignment",
    description: score >= 20 
      ? "Highly favorable industry selection"
      : score >= 15
      ? "Good industry selection"
      : "Consider exploring other industries"
  };
}

function calculateEmployeeScore(employees: number): ScoreComponent {
  let score = 0;
  let description = "";

  if (employees >= 10) {
    score = 25;
    description = "Strong team capacity";
  } else if (employees >= 5) {
    score = 20;
    description = "Good team size";
  } else if (employees >= 3) {
    score = 15;
    description = "Adequate team size";
  } else {
    score = 10;
    description = "Consider team expansion";
  }

  return {
    score,
    maxScore: 25,
    label: "Team Readiness",
    description
  };
}

function calculateMarketScore(businessType: string): ScoreComponent {
  // Market potential scores for different business types
  const marketScores = {
    "Technology Service Provider": 25,
    "General Trading": 23,
    "Professional Services": 22,
    "Industrial License": 20,
    "E-commerce Company": 24,
    "Media Production": 21
  };

  const score = marketScores[businessType as keyof typeof marketScores] || 15;

  return {
    score,
    maxScore: 25,
    label: "Market Potential",
    description: score >= 20 
      ? "High market potential"
      : score >= 15
      ? "Good market potential"
      : "Consider market analysis"
  };
}

export function calculateBusinessScore(setup: BusinessSetup & {
  budget: number;
  employees: number;
}): BusinessScore {
  const budgetScore = calculateBudgetScore(setup.budget, 50000); // Using a base cost of 50,000 AED
  const industryScore = calculateIndustryScore(setup.businessType, setup.businessType);
  const employeeScore = calculateEmployeeScore(setup.employees);
  const marketScore = calculateMarketScore(setup.businessType);

  const components = [budgetScore, industryScore, employeeScore, marketScore];
  const totalScore = components.reduce((sum, component) => sum + component.score, 0);
  const maxPossibleScore = components.reduce((sum, component) => sum + component.maxScore, 0);
  
  // Calculate progress as a percentage of the total possible score
  const progress = Math.round((totalScore / maxPossibleScore) * 100);

  return {
    total: totalScore,
    components,
    progress
  };
}
