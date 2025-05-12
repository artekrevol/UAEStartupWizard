import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowRight, MessageCircle } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function PremiumAssistantPage() {
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState<Array<{ question: string; answer: string; timestamp: Date }>>([]);
  const { toast } = useToast();

  // Initialize assistant knowledge
  const initializeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/enhanced-business-assistant/initialize');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Assistant Initialized",
        description: "The premium assistant has been loaded with UAE free zone knowledge.",
      });
    },
    onError: (error) => {
      toast({
        title: "Initialization Error",
        description: "Failed to initialize the premium assistant.",
        variant: "destructive",
      });
    }
  });

  // Submit question to premium API
  const askQuestionMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await apiRequest('POST', '/api/premium-business-answer', { question });
      return response.json();
    },
    onSuccess: (data) => {
      // Add the new answer to our answers list
      setAnswers(prev => [
        { 
          question, 
          answer: data.answer, 
          timestamp: new Date() 
        },
        ...prev
      ]);
      
      // Clear the question input
      setQuestion("");
      
      // Show success toast
      toast({
        title: "Answer Generated",
        description: "The premium assistant has answered your question.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to get an answer. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Function to handle question submission
  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    askQuestionMutation.mutate(question);
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Premium Business Assistant</h1>
          <p className="text-muted-foreground mt-2">
            Ask detailed questions about UAE free zones and business setup
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            Premium
          </span>
        </Badge>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Ask a Question
          </CardTitle>
          <CardDescription>
            Our AI-powered assistant has comprehensive knowledge of UAE free zone regulations
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmitQuestion}>
          <CardContent>
            <Textarea
              placeholder="What would you like to know about UAE free zones?"
              className="min-h-[100px] mb-2"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              type="button"
              onClick={() => initializeMutation.mutate()}
              disabled={initializeMutation.isPending}
            >
              {initializeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initializing
                </>
              ) : (
                "Initialize Knowledge"
              )}
            </Button>
            <Button 
              type="submit" 
              disabled={askQuestionMutation.isPending || !question.trim()}
            >
              {askQuestionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing
                </>
              ) : (
                <>
                  Ask Question
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {answers.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Recent Answers</h2>
          {answers.map((item, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="bg-muted/50 py-3">
                <CardTitle className="text-lg font-medium">
                  {item.question}
                </CardTitle>
                <CardDescription>
                  {new Date(item.timestamp).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="whitespace-pre-line">
                  {item.answer}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}