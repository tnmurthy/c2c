import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
  params: { id: string };
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { id } = params;
  let studentName = 'Candidate';
  let department = 'Technical Specialist';
  let archetype = 'Talent';
  let skills: string[] = [];
  let xHandle = '';

  try {
    const { data } = await supabase
      .from('students')
      .select('full_name, department, skills, x_url, linkedin_url, github_url, meta_url, assessments(primary_profile)')
      .eq('id', id)
      .single();

    if (data) {
      if (data.full_name) studentName = data.full_name;
      if (data.department) department = data.department;
      if (data.skills && Array.isArray(data.skills)) skills = data.skills;
      if (data.x_url) {
        xHandle = data.x_url.replace(/^(?:https?:\/\/(?:www\.)?(?:x|twitter)\.com\/|@)/, '').replace(/\/.*$/, '');
      }
      if (data.assessments && data.assessments.length > 0 && data.assessments[0].primary_profile) {
        archetype = data.assessments[0].primary_profile.toUpperCase();
      }
    }
  } catch (err) {
    console.error('Error generating metadata for portfolio:', err);
  }

  const skillsSummary = skills.length > 0 ? skills.slice(0, 5).join(', ') : 'Software Engineering, System Design';
  const title = `${studentName} - ${archetype} Portfolio | C2C`;
  const description = `Verified cognitive profile of ${studentName} (${department} · ${archetype}). Core competencies: ${skillsSummary}. Verified via Campus to Corporate Neural Placement Infrastructure.`;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://c2c.mytestbed.tech';
  const portfolioUrl = `${siteUrl}/portfolio/${id}`;
  const ogImageUrl = `${portfolioUrl}/opengraph-image`;

  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: portfolioUrl,
    },
    openGraph: {
      title,
      description,
      url: portfolioUrl,
      siteName: 'Campus to Corporate (C2C)',
      type: 'profile',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${studentName} Cognitive Portfolio Preview`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: xHandle ? `@${xHandle}` : '@c2c_syst',
      site: '@c2c_syst',
      images: [ogImageUrl],
    },
    other: {
      'profile:first_name': studentName.split(' ')[0] || studentName,
      'profile:last_name': studentName.split(' ').slice(1).join(' ') || '',
    },
  };
}

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
