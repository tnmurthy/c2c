interface ScoresWindowProps {
  assessment: any;
}

export default function ScoresWindow({ assessment }: ScoresWindowProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold border-b border-gray-400 pb-2">Optimization Protocols</h3>
      <p className="text-xs">Based on candidate evaluation, the following optimization directives are issued:</p>
      {assessment?.development_report?.actionable_feedback ? (
        <ul className="list-disc pl-4 space-y-2 text-xs">
          {assessment.development_report.actionable_feedback.map((f: string, idx: number) => (
            <li key={idx} className="leading-relaxed">{f}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500">No actionable feedback directives compiled.</p>
      )}
    </div>
  );
}
