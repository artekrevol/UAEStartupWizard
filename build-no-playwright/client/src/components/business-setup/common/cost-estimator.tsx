import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, PlusCircle, MinusCircle } from 'lucide-react';
import { BusinessSetupData } from '@/hooks/useBusinessSetup';
import InfoTooltip from './info-tooltip';
import { motion } from 'framer-motion';

interface CostEstimatorProps {
  businessSetupData: BusinessSetupData;
}

// These are approximate cost ranges for different options
// Real implementation would use data from the API
const COSTS = {
  locations: {
    'mainland': { min: 12000, max: 25000 },
    'free-zone': { min: 8000, max: 20000 },
  },
  freeZones: {
    // Dubai free zones
    1: { min: 15000, max: 22000 }, // DMCC
    2: { min: 12000, max: 18000 }, // JAFZA
    3: { min: 10000, max: 16000 }, // Dubai Silicon Oasis
    // Abu Dhabi free zones
    4: { min: 12000, max: 20000 }, // ADGM
    5: { min: 10000, max: 18000 }, // Masdar City
    // Other emirates
    6: { min: 8000, max: 15000 }, // RAKEZ
    7: { min: 9000, max: 16000 }, // SAIF Zone
    8: { min: 8000, max: 14000 }, // Ajman Free Zone
  },
  legalStructures: {
    'FZE': { min: 1000, max: 3000 },
    'FZC': { min: 2000, max: 4000 },
    'Branch': { min: 1500, max: 3500 },
    'LLC': { min: 3000, max: 6000 },
  }
};

export default function CostEstimator({ businessSetupData }: CostEstimatorProps) {
  const [estimatedCost, setEstimatedCost] = useState({ min: 0, max: 0 });
  const [costBreakdown, setCostBreakdown] = useState<Array<{name: string, cost: {min: number, max: number}}>>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    let totalCost = { min: 0, max: 0 };
    let breakdown: Array<{name: string, cost: {min: number, max: number}}> = [];
    
    // Base application fee
    const baseCost = { min: 2000, max: 3000 };
    totalCost.min += baseCost.min;
    totalCost.max += baseCost.max;
    breakdown.push({ name: 'Application Fees', cost: baseCost });
    
    // Location costs
    if (businessSetupData.locationPreference === 'mainland' || businessSetupData.locationPreference === 'free-zone') {
      const locationCost = COSTS.locations[businessSetupData.locationPreference];
      totalCost.min += locationCost.min;
      totalCost.max += locationCost.max;
      breakdown.push({ 
        name: businessSetupData.locationPreference === 'mainland' ? 'Mainland Registration' : 'Free Zone Registration', 
        cost: locationCost 
      });
    }
    
    // Specific free zone costs
    if (businessSetupData.selectedFreeZone) {
      const freeZoneCost = COSTS.freeZones[businessSetupData.selectedFreeZone] || { min: 10000, max: 18000 };
      // If we already added a generic free zone cost and now have a specific one, remove the generic
      if (businessSetupData.locationPreference === 'free-zone') {
        totalCost.min -= COSTS.locations['free-zone'].min;
        totalCost.max -= COSTS.locations['free-zone'].max;
        breakdown = breakdown.filter(item => item.name !== 'Free Zone Registration');
      }
      totalCost.min += freeZoneCost.min;
      totalCost.max += freeZoneCost.max;
      
      // Get the free zone name (this would come from API in real implementation)
      const freeZoneNames: Record<number, string> = {
        1: 'DMCC',
        2: 'JAFZA',
        3: 'Dubai Silicon Oasis',
        4: 'ADGM',
        5: 'Masdar City',
        6: 'RAKEZ',
        7: 'SAIF Zone',
        8: 'Ajman Free Zone',
      };
      
      breakdown.push({ 
        name: `${freeZoneNames[businessSetupData.selectedFreeZone] || 'Selected Free Zone'} Setup`, 
        cost: freeZoneCost 
      });
    }
    
    // Legal structure costs
    if (businessSetupData.legalStructure) {
      const legalCost = COSTS.legalStructures[businessSetupData.legalStructure as keyof typeof COSTS.legalStructures] || { min: 2000, max: 4000 };
      totalCost.min += legalCost.min;
      totalCost.max += legalCost.max;
      breakdown.push({ 
        name: `${businessSetupData.legalStructure} Structure`, 
        cost: legalCost 
      });
    }
    
    // License fee (flat cost)
    const licenseCost = { min: 3000, max: 5000 };
    totalCost.min += licenseCost.min;
    totalCost.max += licenseCost.max;
    breakdown.push({ name: 'License Fee', cost: licenseCost });
    
    // Optional: Office space (estimated yearly)
    // For demo purposes: only add if we have progressed far enough in the wizard
    if (businessSetupData.selectedFreeZone) {
      const officeCost = { min: 15000, max: 40000 };
      totalCost.min += officeCost.min;
      totalCost.max += officeCost.max;
      breakdown.push({ name: 'Office Space (Yearly)', cost: officeCost });
    }
    
    setEstimatedCost(totalCost);
    setCostBreakdown(breakdown);
  }, [businessSetupData]);

  const toggleBreakdown = () => {
    setShowBreakdown(prev => !prev);
  };

  // If we don't have any selections yet, don't show the estimator
  if (!businessSetupData.locationPreference && !businessSetupData.selectedFreeZone) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden border-2 border-primary/10">
        <div className="bg-primary/5 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-full">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-medium text-sm">Estimated Setup Cost</h3>
          </div>
          <InfoTooltip 
            content="This is an approximate cost range based on your selections. Actual costs may vary depending on specific requirements and current regulations."
          />
        </div>
        <CardContent className="p-3 pt-2">
          <div className="flex flex-col">
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground text-sm">Approximate Range:</span>
              <Badge variant="outline" className="font-semibold text-primary">
                AED {estimatedCost.min.toLocaleString()} - {estimatedCost.max.toLocaleString()}
              </Badge>
            </div>
            
            <button 
              className="text-xs text-primary flex items-center gap-1 mt-1 self-end hover:underline"
              onClick={toggleBreakdown}
            >
              {showBreakdown ? (
                <>
                  <MinusCircle className="h-3 w-3" />
                  Hide breakdown
                </>
              ) : (
                <>
                  <PlusCircle className="h-3 w-3" />
                  Show breakdown
                </>
              )}
            </button>
            
            {showBreakdown && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 pt-2 border-t text-xs space-y-1.5"
              >
                {costBreakdown.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span>AED {item.cost.min.toLocaleString()} - {item.cost.max.toLocaleString()}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}