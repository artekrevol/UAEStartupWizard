import { Progress } from "@/components/ui/progress";

export default function ProgressTracker({ progress }: { progress: number }) {
  return (
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
  );
}
