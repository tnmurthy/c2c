import { useEffect, useState } from 'react';

/**
 * Owns the CV Tailor window's data: opportunity alerts, job description
 * selection, and the tailor/download API calls against the market endpoints.
 */
export function useCvTailor(id: string | string[] | undefined, studentData: any, assessment: any) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [isCustomJd, setIsCustomJd] = useState<boolean>(false);
  const [tailorLoading, setTailorLoading] = useState<boolean>(false);
  const [tailoredResults, setTailoredResults] = useState<any>(null);

  // Fetch student alerts
  useEffect(() => {
    async function fetchAlerts() {
      try {
        const response = await fetch(`/api/alerts/student/${id}`);
        if (response.ok) {
          const data = await response.json();
          setAlerts(data || []);
          if (data && data.length > 0) {
            const firstLead = data.find((a: any) => a.market_leads);
            if (firstLead) {
              setSelectedLeadId(String(firstLead.market_leads.id));
              setJobDescription(firstLead.market_leads.ai_summary || firstLead.market_leads.ai_notes || '');
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch student alerts:', err);
      }
    }
    if (id) {
      fetchAlerts();
    }
  }, [id]);

  const handleLeadChange = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (leadId === 'custom') {
      setIsCustomJd(true);
      setJobDescription('');
    } else {
      setIsCustomJd(false);
      const alertItem = alerts.find((a: any) => a.market_leads && String(a.market_leads.id) === leadId);
      if (alertItem) {
        setJobDescription(alertItem.market_leads.ai_summary || alertItem.market_leads.ai_notes || '');
      } else {
        setJobDescription('');
      }
    }
  };

  const buildCandidatePayload = () => ({
    full_name: studentData.full_name || 'Student',
    department: studentData.department || 'General',
    skills: studentData.skills || [],
    archetype: assessment?.primary_profile || 'builder',
    location: studentData.location || 'San Francisco'
  });

  const handleTailorCV = async () => {
    if (!studentData) return;
    setTailorLoading(true);
    setTailoredResults(null);
    try {
      const candidatePayload = buildCandidatePayload();

      const resumePromise = fetch('/api/market/generate/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLeadId,
          posting: jobDescription,
          candidate: candidatePayload
        })
      });

      const coverLetterPromise = fetch('/api/market/generate/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLeadId,
          posting: jobDescription,
          candidate: candidatePayload
        })
      });

      const outreachPromise = fetch('/api/market/generate/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posting: jobDescription,
          candidate: candidatePayload,
          style: 'cold_email'
        })
      });

      const [resResume, resCoverLetter, resOutreach] = await Promise.all([
        resumePromise,
        coverLetterPromise,
        outreachPromise
      ]);

      if (resResume.ok && resCoverLetter.ok && resOutreach.ok) {
        const resumeData = await resResume.json();
        const coverLetterData = await resCoverLetter.json();
        const outreachData = await resOutreach.json();
        setTailoredResults({
          resume: resumeData,
          coverLetter: coverLetterData,
          outreach: outreachData
        });
      } else {
        console.error('One or more tailor APIs failed');
      }
    } catch (err) {
      console.error('Error tailoring CV:', err);
    } finally {
      setTailorLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!studentData) return;
    try {
      const candidatePayload = buildCandidatePayload();

      const response = await fetch('/api/market/download/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLeadId,
          posting: jobDescription,
          candidate: candidatePayload
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const nameStr = studentData.full_name || 'Student';
        a.download = `tailored_resume_${nameStr.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to download tailored resume PDF');
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
    }
  };

  return {
    alerts,
    selectedLeadId,
    jobDescription,
    setJobDescription,
    isCustomJd,
    tailorLoading,
    tailoredResults,
    handleLeadChange,
    handleTailorCV,
    handleDownloadPDF,
  };
}
