import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search as SearchIcon, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { trackUserAction } from "@/lib/user-tracker";

// Define types for the research results
interface ResearchResult {
  topic: string;
  conversationId?: number;
  internalResults: {
    freeZones: any[];
    documents: any[];
  };
  webResults: {
    title: string;
    url: string;
    description: string;
  }[];
  summary: string;
  timestamp: string;
}

export default function AIResearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ResearchResult | null>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Empty search",
        description: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      trackUserAction({ 
        action: "research_search", 
        category: "ai_research",
        details: { query: searchQuery }
      });

      // Simulate API call - in production, this would call the actual API
      // You'll need to implement the real API endpoint
      const response = await apiRequest("POST", "/api/ai-research/search", {
        topic: searchQuery
      });

      // Assuming the API returns JSON - parse it
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Error performing research:", error);
      toast({
        title: "Research failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">AI Research Assistant</h1>
        <p className="text-muted-foreground">
          Ask complex questions about UAE business setup and get comprehensive insights
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="What do you want to research about UAE business setup?"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="max-w-2xl"
        />
        <Button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Researching...
            </>
          ) : (
            <>
              <SearchIcon className="mr-2 h-4 w-4" />
              Research
            </>
          )}
        </Button>
      </div>

      {/* Display Research Results */}
      {results && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Research Summary</CardTitle>
              <CardDescription>
                AI-generated insights about "{results.topic}"
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <div className="whitespace-pre-line">{results.summary}</div>
              </div>
            </CardContent>
          </Card>

          {/* Internal Results */}
          {results.internalResults && (
            (results.internalResults.freeZones.length > 0 || 
             results.internalResults.documents.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>From Our Database</CardTitle>
                  <CardDescription>
                    Information found in our knowledge base
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results.internalResults.freeZones.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Free Zones</h3>
                        <ul className="list-disc pl-5 space-y-1">
                          {results.internalResults.freeZones.map((zone, index) => (
                            <li key={index}>
                              <span className="font-medium">{zone.name}</span>
                              {zone.description && (
                                <span className="text-muted-foreground"> - {zone.description}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {results.internalResults.documents.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Documents</h3>
                        <ul className="list-disc pl-5 space-y-1">
                          {results.internalResults.documents.map((doc, index) => (
                            <li key={index}>
                              <span className="font-medium">{doc.title}</span>
                              {doc.description && (
                                <span className="text-muted-foreground"> - {doc.description}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          )}

          {/* Web Results */}
          {results.webResults && results.webResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Web Research Results</CardTitle>
                <CardDescription>
                  Information gathered from external sources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.webResults.map((result, index) => (
                    <div key={index} className="border-b pb-3 last:border-b-0 last:pb-0">
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-semibold text-primary">{result.title}</h3>
                        <a 
                          href={result.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-primary hover:underline"
                        >
                          Visit <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </div>
                      <p className="text-sm text-muted-foreground">{result.url}</p>
                      <p className="mt-1">{result.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {!results && !isLoading && (
        <div className="mt-10 text-center">
          <SearchIcon className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h3 className="mt-2 text-lg font-semibold">Start your research</h3>
          <p className="mt-1 text-muted-foreground">
            Enter a topic about UAE business setup to get comprehensive insights
          </p>
        </div>
      )}
    </div>
  );
}