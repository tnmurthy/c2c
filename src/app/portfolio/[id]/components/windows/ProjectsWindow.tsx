interface ProjectsWindowProps {
  assessment: any;
  onOpenScores: () => void;
}

export default function ProjectsWindow({ assessment, onOpenScores }: ProjectsWindowProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold border-b border-gray-400 pb-2">Psychometric Dimensions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assessment?.dimension_scores ? (
          Object.entries(assessment.dimension_scores).map(([dim, score]: any) => (
            <div key={dim} className="border border-gray-400 p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={onOpenScores}>
              <div className="font-bold text-blue-800">{dim.toUpperCase()} Index</div>
              <div className="text-lg font-bold font-mono">{score}% Density</div>
            </div>
          ))
        ) : (
          <p className="col-span-2 text-center text-gray-500">No dimensions unlocked.</p>
        )}
      </div>
    </div>
  );
}
