interface ResumeWindowProps {
  studentData: any;
  assessment: any;
}

export default function ResumeWindow({ studentData, assessment }: ResumeWindowProps) {
  return (
    <div className="space-y-4 font-sans text-xs">
      <div className="text-center font-serif text-lg font-black">{studentData?.full_name}</div>
      <div className="text-center text-[10px] text-gray-500 font-mono tracking-widest">{studentData?.email}</div>
      <hr className="border-gray-400" />

      <div>
        <h4 className="font-bold uppercase tracking-wider text-blue-900 border-b border-gray-300 pb-1 mb-2 font-sans">Academic Foundation</h4>
        <p>
          <strong>Degree & Major:</strong> {studentData?.department}<br />
          <strong>Graduation Year:</strong> {studentData?.graduation_year}<br />
        </p>
      </div>

      <div>
        <h4 className="font-bold uppercase tracking-wider text-blue-900 border-b border-gray-300 pb-1 mb-2 font-sans">Cognitive Capacity Parameters</h4>
        <p className="italic mb-2">Evaluated via modular psychometric assessment engine:</p>
        {assessment?.dimension_scores ? (
          <ul className="list-disc pl-4 space-y-1 font-mono">
            {Object.entries(assessment.dimension_scores).map(([dim, score]) => (
              <li key={dim}>{dim.toUpperCase()} Vector score: {score as any}/100</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 font-mono">Assessment scores uninitialized.</p>
        )}
      </div>
    </div>
  );
}
