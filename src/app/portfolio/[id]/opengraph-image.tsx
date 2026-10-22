import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const alt = 'Candidate Cognitive Portfolio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { id: string } }) {
  const { id } = params;

  let fullName = 'Talent Candidate';
  let department = 'Software Engineering';
  let archetype = 'BUILDER';
  let skills = ['TypeScript', 'Python', 'React', 'FastAPI', 'PostgreSQL'];
  let hasGithub = true;
  let hasLinkedin = true;
  let hasX = true;
  let hasMeta = true;

  try {
    const { data } = await supabase
      .from('students')
      .select('full_name, department, skills, x_url, linkedin_url, github_url, meta_url, assessments(primary_profile, dimension_scores)')
      .eq('id', id)
      .single();

    if (data) {
      if (data.full_name) fullName = data.full_name;
      if (data.department) department = data.department;
      if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
        skills = data.skills.slice(0, 5);
      }
      hasGithub = !!(data.github_url || (data as any).github);
      hasLinkedin = !!data.linkedin_url;
      hasX = !!data.x_url;
      hasMeta = !!data.meta_url;

      if (data.assessments && data.assessments.length > 0 && data.assessments[0].primary_profile) {
        archetype = data.assessments[0].primary_profile.toUpperCase();
      }
    }
  } catch (err) {
    console.error('Failed fetching candidate data for OG image:', err);
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#070b0d',
          padding: '24px',
          fontFamily: 'monospace, sans-serif',
        }}
      >
        {/* Retro Win95 Outer Frame */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0b1114',
            border: '3px solid #06b6d4',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 0 40px rgba(6, 182, 212, 0.25)',
          }}
        >
          {/* Win95 Title Bar */}
          <div
            style={{
              height: '44px',
              backgroundColor: '#008080',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              borderBottom: '2px solid #042f2e',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>💻</span>
              <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '15px', letterSpacing: '1px' }}>
                C2C_COGNITIVE_PORTFOLIO://NODE_{id ? id.slice(0, 8).toUpperCase() : 'VERIFIED'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: '#c0c0c0',
                  border: '1px solid #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
              >
                _
              </div>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: '#c0c0c0',
                  border: '1px solid #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
              >
                □
              </div>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: '#c0c0c0',
                  border: '1px solid #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
              >
                ✕
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              padding: '40px 48px',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'radial-gradient(circle at 20% 30%, #0e1e24 0%, #080d10 80%)',
            }}
          >
            {/* Left Column: Candidate Info */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '680px',
              }}
            >
              {/* Status Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    boxShadow: '0 0 10px #10b981',
                  }}
                />
                <span
                  style={{
                    color: '#06b6d4',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                  }}
                >
                  Neural Recruitment Verified Profile
                </span>
              </div>

              {/* Full Name */}
              <div
                style={{
                  fontSize: '52px',
                  fontWeight: 900,
                  color: '#ffffff',
                  lineHeight: 1.1,
                  letterSpacing: '-1px',
                  marginBottom: '12px',
                }}
              >
                {fullName}
              </div>

              {/* Department */}
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: '#94a3b8',
                  marginBottom: '24px',
                }}
              >
                {department}
              </div>

              {/* Skills Row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
                {skills.map((skill) => (
                  <div
                    key={skill}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: 'rgba(6, 182, 212, 0.12)',
                      border: '1px solid rgba(6, 182, 212, 0.4)',
                      borderRadius: '8px',
                      color: '#22d3ee',
                      fontSize: '15px',
                      fontWeight: 600,
                    }}
                  >
                    {skill}
                  </div>
                ))}
              </div>

              {/* Social Channels Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Connected Channels:
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {hasGithub && (
                    <div style={{ padding: '4px 10px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '12px', fontWeight: 'bold' }}>
                      GitHub
                    </div>
                  )}
                  {hasLinkedin && (
                    <div style={{ padding: '4px 10px', backgroundColor: '#0284c7', borderRadius: '6px', color: '#ffffff', fontSize: '12px', fontWeight: 'bold' }}>
                      LinkedIn
                    </div>
                  )}
                  {hasX && (
                    <div style={{ padding: '4px 10px', backgroundColor: '#0f172a', border: '1px solid #38bdf8', borderRadius: '6px', color: '#38bdf8', fontSize: '12px', fontWeight: 'bold' }}>
                      X / Twitter
                    </div>
                  )}
                  {hasMeta && (
                    <div style={{ padding: '4px 10px', backgroundColor: '#831843', borderRadius: '6px', color: '#fbcfe8', fontSize: '12px', fontWeight: 'bold' }}>
                      Meta
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Archetype & CogMatrix Card */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                border: '2px solid rgba(6, 182, 212, 0.4)',
                borderRadius: '16px',
                padding: '30px 32px',
                width: '340px',
                boxShadow: 'inset 0 0 20px rgba(6, 182, 212, 0.1)',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  letterSpacing: '2px',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                Cognitive Archetype
              </div>
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 900,
                  color: '#38bdf8',
                  letterSpacing: '1px',
                  marginBottom: '20px',
                }}
              >
                {archetype}
              </div>

              {/* 5Q Quotient Grid */}
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingTop: '16px',
                }}
              >
                {[
                  { label: 'IQ (Intellectual)', val: 'Top 10%' },
                  { label: 'EQ (Emotional)', val: 'Top 25%' },
                  { label: 'AQ (Adaptability)', val: 'Top 10%' },
                  { label: 'SQ (Social)', val: 'Verified' },
                  { label: 'SpQ (Spiritual/Grit)', val: 'Optimal' },
                ].map((q) => (
                  <div
                    key={q.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ color: '#94a3b8' }}>{q.label}</span>
                    <span style={{ color: '#22d3ee', fontWeight: 'bold' }}>{q.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Win95 Footer Status Bar */}
          <div
            style={{
              height: '36px',
              backgroundColor: '#070f12',
              borderTop: '1px solid #164e63',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
              fontSize: '12px',
              color: '#64748b',
            }}
          >
            <span>STATUS: PORTFOLIO_NODE_ONLINE</span>
            <span style={{ color: '#06b6d4' }}>CAMPUS TO CORPORATE (C2C) · NEURAL RECRUITMENT</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
