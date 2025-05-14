import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface ScoreComponent {
  score: number;
  maxScore: number;
  label: string;
  description: string;
}

interface BusinessScore {
  total: number;
  components: ScoreComponent[];
  progress: number;
}

interface ProgressTrackerProps {
  progress: number;
  score?: BusinessScore;
}

export default function ProgressTracker({ progress, score }: ProgressTrackerProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">Setup Progress</h2>
          <span className="text-sm text-muted-foreground">{progress}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="grid grid-cols-4 gap-4 text-sm">
          {[
            { label: "Requirements", target: 25 },
            { label: "Documentation", target: 50 },
            { label: "Review", target: 75 },
            { label: "Completion", target: 100 },
          ].map(({ label, target }) => (
            <div
              key={label}
              className={`text-center ${progress >= target ? "text-primary" : "text-muted-foreground"}`}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {score && (
        <div className="grid gap-4 md:grid-cols-2">
          {score.components.map((component, index) => (
            <Card key={index} className="relative overflow-hidden">
              <div
                className="absolute top-0 left-0 h-1 bg-primary"
                style={{ width: `${(component.score / component.maxScore) * 100}%` }}
              />
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{component.label}</CardTitle>
                  <Badge variant={component.score >= component.maxScore * 0.8 ? "default" : "secondary"}>
                    {component.score}/{component.maxScore}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2">
                  {component.score >= component.maxScore * 0.8 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                  {component.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}