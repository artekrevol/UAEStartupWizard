import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

interface ComparisonOption {
  title: string;
  subtitle: string;
  points: {
    category: string;
    value: string;
    isPositive: boolean;
  }[];
}

// Default comparison data - in a real app, this would come from API
const defaultOptions: Record<string, ComparisonOption[]> = {
  'location': [
    {
      title: 'Mainland',
      subtitle: 'UAE Department of Economic Development',
      points: [
        { category: 'Ownership', value: 'Foreign ownership up to 49% (100% in some sectors)', isPositive: false },
        { category: 'Market Access', value: 'Full access to UAE market', isPositive: true },
        { category: 'Local Sponsor', value: 'Required (UAE national partner)', isPositive: false },
        { category: 'Tax Benefits', value: 'Standard UAE tax regulations', isPositive: false },
        { category: 'Govt. Contracts', value: 'Eligible for government contracts', isPositive: true },
        { category: 'Setup Time', value: '2-4 weeks', isPositive: true },
        { category: 'Setup Cost', value: 'AED 15,000 - 30,000', isPositive: false },
      ]
    },
    {
      title: 'Free Zone',
      subtitle: 'Specialized economic zones',
      points: [
        { category: 'Ownership', value: '100% foreign ownership', isPositive: true },
        { category: 'Market Access', value: 'Limited access to UAE market (local agent required)', isPositive: false },
        { category: 'Local Sponsor', value: 'Not required', isPositive: true },
        { category: 'Tax Benefits', value: 'Tax exemptions and incentives', isPositive: true },
        { category: 'Govt. Contracts', value: 'Limited eligibility', isPositive: false },
        { category: 'Setup Time', value: '1-3 weeks', isPositive: true },
        { category: 'Setup Cost', value: 'AED 10,000 - 25,000', isPositive: true },
      ]
    }
  ],
  'free-zones': [
    {
      title: 'DMCC',
      subtitle: 'Dubai Multi Commodities Centre',
      points: [
        { category: 'Focus', value: 'Commodities, Trading, Professional Services', isPositive: true },
        { category: 'Location', value: 'Jumeirah Lakes Towers, Dubai', isPositive: true },
        { category: 'Prestige', value: 'Very High - Award-winning free zone', isPositive: true },
        { category: 'Office Options', value: 'Physical and Flexi-desk', isPositive: true },
        { category: 'Visa Quota', value: 'Generous visa allocation', isPositive: true },
        { category: 'Setup Cost', value: 'AED 15,000 - 25,000', isPositive: false },
        { category: 'Annual Renewal', value: 'AED 15,000 - 20,000', isPositive: false },
      ]
    },
    {
      title: 'JAFZA',
      subtitle: 'Jebel Ali Free Zone',
      points: [
        { category: 'Focus', value: 'Trading, Logistics, Manufacturing', isPositive: true },
        { category: 'Location', value: 'Jebel Ali, Dubai', isPositive: true },
        { category: 'Prestige', value: 'High - Well-established zone', isPositive: true },
        { category: 'Office Options', value: 'Physical, Warehouses', isPositive: true },
        { category: 'Visa Quota', value: 'Based on space leased', isPositive: true },
        { category: 'Setup Cost', value: 'AED 15,000 - 22,000', isPositive: false },
        { category: 'Annual Renewal', value: 'AED 12,000 - 18,000', isPositive: true },
      ]
    },
    {
      title: 'RAKEZ',
      subtitle: 'Ras Al Khaimah Economic Zone',
      points: [
        { category: 'Focus', value: 'Manufacturing, Trading, Services', isPositive: true },
        { category: 'Location', value: 'Ras Al Khaimah', isPositive: false },
        { category: 'Prestige', value: 'Medium - Growing reputation', isPositive: false },
        { category: 'Office Options', value: 'Physical, Flexi-desk, Virtual', isPositive: true },
        { category: 'Visa Quota', value: 'Competitive allocation', isPositive: true },
        { category: 'Setup Cost', value: 'AED 8,000 - 15,000', isPositive: true },
        { category: 'Annual Renewal', value: 'AED 7,000 - 12,000', isPositive: true },
      ]
    }
  ],
  'legal-structure': [
    {
      title: 'Free Zone LLC',
      subtitle: 'Limited Liability Company',
      points: [
        { category: 'Shareholders', value: '1-50 shareholders', isPositive: true },
        { category: 'Liability', value: 'Limited to capital contribution', isPositive: true },
        { category: 'Min. Capital', value: 'Depends on free zone (AED 50,000+)', isPositive: false },
        { category: 'Complexity', value: 'Medium setup complexity', isPositive: true },
        { category: 'Management', value: 'Flexible management structure', isPositive: true },
        { category: 'Transferability', value: 'Shares can be transferred', isPositive: true },
        { category: 'Credibility', value: 'High business credibility', isPositive: true },
      ]
    },
    {
      title: 'Free Zone Branch',
      subtitle: 'Branch of existing company',
      points: [
        { category: 'Shareholders', value: 'Not applicable (extension of parent)', isPositive: false },
        { category: 'Liability', value: 'Parent company bears liability', isPositive: false },
        { category: 'Min. Capital', value: 'No minimum capital required', isPositive: true },
        { category: 'Complexity', value: 'Simpler setup process', isPositive: true },
        { category: 'Management', value: 'Must follow parent company structure', isPositive: false },
        { category: 'Transferability', value: 'Not applicable', isPositive: false },
        { category: 'Credibility', value: 'Leverages parent company reputation', isPositive: true },
      ]
    },
    {
      title: 'Free Zone Establishment (FZE)',
      subtitle: 'Single shareholder entity',
      points: [
        { category: 'Shareholders', value: 'Single shareholder only', isPositive: false },
        { category: 'Liability', value: 'Limited to capital contribution', isPositive: true },
        { category: 'Min. Capital', value: 'Depends on free zone (AED 50,000+)', isPositive: false },
        { category: 'Complexity', value: 'Low setup complexity', isPositive: true },
        { category: 'Management', value: 'Simplified management structure', isPositive: true },
        { category: 'Transferability', value: 'Entity can be transferred', isPositive: true },
        { category: 'Credibility', value: 'Good business credibility', isPositive: true },
      ]
    }
  ]
};

interface ComparisonViewProps {
  comparisonType: 'location' | 'free-zones' | 'legal-structure';
  options?: ComparisonOption[];
}

export default function ComparisonView({ comparisonType, options }: ComparisonViewProps) {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  
  const comparisonOptions = options || defaultOptions[comparisonType];
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };
  
  const getAllCategories = () => {
    const categories = new Set<string>();
    comparisonOptions.forEach(option => {
      option.points.forEach(point => {
        categories.add(point.category);
      });
    });
    return Array.from(categories);
  };
  
  const allCategories = getAllCategories();
  
  const getPointByCategory = (option: ComparisonOption, category: string) => {
    return option.points.find(point => point.category === category);
  };

  return (
    <Card className="mt-6 border-primary/10 overflow-hidden">
      <CardHeader className="bg-primary/5 pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">Comparison View</CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant={viewMode === 'cards' ? "secondary" : "outline"} 
              size="sm"
              onClick={() => setViewMode('cards')}
              className="text-xs h-8"
            >
              Card View
            </Button>
            <Button 
              variant={viewMode === 'table' ? "secondary" : "outline"} 
              size="sm"
              onClick={() => setViewMode('table')}
              className="text-xs h-8"
            >
              Table View
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparisonOptions.map((option, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="bg-muted/50 p-4">
                  <CardTitle className="text-base">{option.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{option.subtitle}</p>
                </CardHeader>
                <CardContent className="p-4">
                  <ul className="space-y-2">
                    {option.points.map((point, pointIndex) => (
                      <li key={pointIndex} className="flex items-start gap-2 text-sm">
                        {point.isPositive ? (
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <span className="font-medium">{point.category}: </span>
                          {point.value}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Category</TableHead>
                  {comparisonOptions.map((option, index) => (
                    <TableHead key={index}>{option.title}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allCategories.map((category, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{category}</TableCell>
                    {comparisonOptions.map((option, optionIndex) => {
                      const point = getPointByCategory(option, category);
                      return (
                        <TableCell key={optionIndex}>
                          {point ? (
                            <div className="flex items-start gap-1.5">
                              <Badge variant={point.isPositive ? "default" : "outline"} className="h-5 px-1">
                                {point.isPositive ? <Check className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                              </Badge>
                              {point.value}
                            </div>
                          ) : "—"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}