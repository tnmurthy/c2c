interface CvTailorWindowProps {
  alerts: any[];
  selectedLeadId: string;
  jobDescription: string;
  isCustomJd: boolean;
  tailorLoading: boolean;
  tailoredResults: any;
  onLeadChange: (leadId: string) => void;
  onJobDescriptionChange: (value: string) => void;
  onTailorCV: () => void;
  onDownloadPDF: () => void;
}

export default function CvTailorWindow({
  alerts,
  selectedLeadId,
  jobDescription,
  isCustomJd,
  tailorLoading,
  tailoredResults,
  onLeadChange,
  onJobDescriptionChange,
  onTailorCV,
  onDownloadPDF,
}: CvTailorWindowProps) {
  return (
    <div className="space-y-4 text-xs font-sans">
      <div className="flex flex-col gap-1">
        <label className="font-bold">Select Opportunity Alert:</label>
        <select
          className="w-full border-2 border-gray-600 bg-white p-1 text-black font-sans outline-none"
          value={selectedLeadId}
          onChange={(e) => onLeadChange(e.target.value)}
          disabled={tailorLoading}
        >
          <option value="">-- Choose an Alert --</option>
          {alerts.map((a: any) => {
            const lead = a.market_leads;
            if (!lead) return null;
            return (
              <option key={lead.id} value={lead.id}>
                {lead.company || 'Unknown Company'} - {lead.name || 'Job Lead'} (Score: {a.score}%)
              </option>
            );
          })}
          <option value="custom">Paste Custom Job Description</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="custom-jd-checkbox"
          checked={isCustomJd}
          onChange={(e) => {
            if (e.target.checked) {
              onLeadChange('custom');
            } else {
              onLeadChange('');
            }
          }}
          disabled={tailorLoading}
        />
        <label htmlFor="custom-jd-checkbox" className="select-none font-bold">Paste Custom JD</label>
      </div>

      <div className="flex flex-col gap-1">
        <label className="font-bold">Job Description Details:</label>
        <textarea
          rows={5}
          className="w-full border-2 border-gray-600 bg-white p-1 text-black font-sans outline-none resize-none"
          value={jobDescription}
          onChange={(e) => onJobDescriptionChange(e.target.value)}
          placeholder="Paste details here..."
          disabled={tailorLoading || (!isCustomJd && selectedLeadId !== '')}
        />
      </div>

      <button
        className="win95-btn px-4 py-1.5 font-bold flex items-center justify-center disabled:opacity-50"
        onClick={onTailorCV}
        disabled={tailorLoading || !jobDescription}
      >
        {tailorLoading ? 'Tailoring in Progress...' : 'Tailor CV'}
      </button>

      {tailoredResults && (
        <div className="mt-4 space-y-4 border-2 border-gray-600 p-2 bg-gray-50 max-h-72 overflow-y-auto">
          <div>
            <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-blue-900 font-sans">1. Tailored Resume Preview</div>
            <div className="space-y-1 font-mono text-[11px] bg-white p-2 border border-gray-300">
              <div><strong>Candidate:</strong> {tailoredResults.resume.candidate_name}</div>
              <div><strong>Department:</strong> {tailoredResults.resume.department}</div>
              <div><strong>Role Title:</strong> {tailoredResults.resume.role_title}</div>
              <div><strong>Company:</strong> {tailoredResults.resume.company}</div>
              <div><strong>Location:</strong> {tailoredResults.resume.location}</div>
              <div><strong>Voice Hook:</strong> {tailoredResults.resume.voice_hook}</div>
              <div><strong>Summary:</strong> {tailoredResults.resume.archetype_summary}</div>
              {tailoredResults.resume.top_skills && (
                <div><strong>Top Skills:</strong> {tailoredResults.resume.top_skills.join(', ')}</div>
              )}
              {tailoredResults.resume.matched_tech && (
                <div><strong>Matched Tech:</strong> {tailoredResults.resume.matched_tech.join(', ')}</div>
              )}
            </div>
          </div>

          <div>
            <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-blue-900 font-sans">2. Tailored Cover Letter</div>
            <div className="whitespace-pre-wrap font-mono text-[11px] bg-white p-2 border border-gray-300">
              {tailoredResults.coverLetter && (
                <>
                  <p>Dear Hiring Team at {tailoredResults.coverLetter.company || 'Company'},</p>
                  <br />
                  <p>{tailoredResults.coverLetter.opener}. My core strengths include {tailoredResults.coverLetter.strength}, and I have hands-on experience with {tailoredResults.coverLetter.skills_str}.</p>
                  <br />
                  <p>{tailoredResults.coverLetter.hook}.</p>
                  <br />
                  <p>{tailoredResults.coverLetter.follow_up_note}</p>
                  <br />
                  <p>Sincerely,</p>
                  <p>{tailoredResults.coverLetter.candidate_name}</p>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-blue-900 font-sans">3. Outreach & LinkedIn Templates</div>
            <div className="space-y-4">
              <div>
                <div className="font-bold text-[10px] text-gray-600 font-sans">COLD EMAIL DRAFT:</div>
                <pre className="whitespace-pre-wrap font-mono text-[11px] bg-white p-2 border border-gray-300 mt-1">
                  {tailoredResults.outreach.cold_email}
                </pre>
              </div>
              <div>
                <div className="font-bold text-[10px] text-gray-600 font-sans">LINKEDIN NOTE DRAFT:</div>
                <pre className="whitespace-pre-wrap font-mono text-[11px] bg-white p-2 border border-gray-300 mt-1">
                  {tailoredResults.outreach.linkedin_note}
                </pre>
              </div>
              <div>
                <div className="font-bold text-[10px] text-gray-600 font-sans">FOUNDER MESSAGE DRAFT:</div>
                <pre className="whitespace-pre-wrap font-mono text-[11px] bg-white p-2 border border-gray-300 mt-1">
                  {tailoredResults.outreach.founder_message}
                </pre>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              className="win95-btn px-4 py-1.5 font-bold flex items-center justify-center"
              onClick={onDownloadPDF}
            >
              Download tailored PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
