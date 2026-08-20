interface AboutWindowProps {
  studentData: any;
  assessment: any;
  onOpenResume: () => void;
}

export default function AboutWindow({ studentData, assessment, onOpenResume }: AboutWindowProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold border-b border-gray-400 pb-2">{studentData?.full_name || 'Candidate'}</h2>
      <p className="text-xs leading-relaxed">
        <strong>Cognitive Archetype:</strong> {assessment?.primary_profile || 'Unknown'}<br />
        <strong>Specialization:</strong> {studentData?.department || 'N/A'}<br />
        <strong>Datalink Status:</strong> ONLINE / ACTIVE
      </p>
      <p className="text-xs text-gray-700 italic border-l-2 border-blue-800 pl-4 py-2 bg-gray-100">
        {assessment?.development_report?.profile_summary || 'No profile summary telemetry loaded.'}
      </p>
      <button className="win95-btn mt-4 px-4 py-1.5" onClick={onOpenResume}>View Technical Resume</button>
    </div>
  );
}
