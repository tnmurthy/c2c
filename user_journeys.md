# Campus to Corporate (C2C) User Journeys

This document outlines the end-to-end journeys for the four primary user roles in the Makeover Talent Agency (C2C) platform: Student, Employer, TPO/Institution, and Admin.

---

## 1. Student Journey

The student journey focuses on profiling, assessment, and career matching.

### Step 1: Authentication & Onboarding
- **Path:** `/login` → `/onboard`
- **Action:** The student signs up/logs in. If their profile metadata is incomplete, they are redirected to the onboarding flow.
- **Onboarding Details:** The student provides their Legal Name, Institutional Email, Graduation Year, and Academic Department.
- **Outcome:** A `student` profile is created, and the auth metadata is updated.

### Step 2: The Assessment (The "Ordeal")
- **Path:** `/assessment`
- **Action:** If the student hasn't completed their psychometric evaluation, they are prompted to do so. The assessment is presented with a cyber/terminal aesthetic ("Initializing The Ordeal").
- **Experience:** The student answers a series of questions (Likert scale, Situational Judgment Tests, open text).
- **Outcome:** Responses are submitted to calculate their cognitive archetype and dimension scores (IQ, EQ, AQ, SQ).

### Step 3: Student Dashboard
- **Path:** `/dashboard/[id]`
- **Action:** The central hub for the student's profile.
- **Features:**
  - **Cognitive Archetype:** Displays the assigned archetype (e.g., THE_BUILDER, LEADER) and a summary of their profile.
  - **Intelligence Matrix:** A radar chart visualizing their vector scores across dimensions (Technical, Product, Leadership, Communication, Adaptability) compared to peers.
  - **Optimization Protocols:** Actionable feedback and directives for skill optimization.
  - **Market Scout Sync:** Live job opportunity alerts showing matching roles from employers with compatibility scores.
  - **Export/Share:** Students can copy a 360-feedback link (`/feedback/[id]`), export their dossier/interview guide, or boot up their retro portfolio.

### Step 4: Retro Portfolio (Shareable Profile)
- **Path:** `/portfolio/[id]`
- **Action:** A public-facing, interactive portfolio styled as a Windows 95 desktop.
- **Features:** Includes interactive "windows" for 'My Computer' (Archetype), 'My Resume', 'Competencies', 'CogMatrix', and an interactive MS-DOS terminal to query profile stats.

---

## 2. Employer Journey

The employer journey revolves around discovering talent and managing job postings.

### Step 1: Authentication & Onboarding
- **Path:** `/login` → `/onboard`
- **Action:** The user selects the "Company" role during signup.
- **Onboarding Details:** The employer provides their Company Name, Industry, and Recruiter Contact Name.

### Step 2: Recruiter Console (Discover Talent)
- **Path:** `/employer` (Active Tab: Discover_Talent)
- **Action:** The employer views a grid of elite candidates matching their criteria.
- **Features:**
  - **Filters:** Sliders for Minimum AQ and EQ, and a toggle for "Strict Founder Fit" (prioritizes high adaptability/growth potential).
  - **Sorting:** Sort candidates by Smart Match, Tech Fit, or Sales Fit.
  - **Candidate Dossier:** Clicking "View Dossier" opens a sliding panel detailing the candidate's IQ/EQ/AQ scores, verified skills, and a professional summary.
  - **Actions:** The employer can "Request Introduction", "Save to Talent Pool", or bookmark the candidate.

### Step 3: Job Management
- **Path:** `/employer` (Active Tab: My_Job_Postings) → `/employer/jobs/new`
- **Action:** Employers manage their recruitment pipeline.
- **Features:** Displays active job postings with status, location, employment type, and target match counts. Employers can create new roles and view matched candidates for specific listings.

---

## 3. TPO / Institution Journey

The Training and Placement Officer (TPO) journey focuses on cohort analytics and intervention management.

### Step 1: Authentication & Onboarding
- **Path:** `/login` → `/onboard`
- **Action:** The user selects the "Institution / TPO" role.
- **Onboarding Details:** The TPO provides the Institution Name, Institution Type, Email Domain (used to auto-link students), and Location.

### Step 2: TPO Command Center
- **Path:** `/tpo-dashboard/[id]`
- **Action:** A high-level analytics dashboard for monitoring the entire student cohort.
- **Features:**
  - **KPIs:** Total Enrolled Students, Average Cohort EQ, and Placement Readiness %.
  - **Founder Profile Distribution:** A visual breakdown of the cohort's behavioral archetypes (Builder, Leader, Anchor).
  - **National Benchmarks:** Compares the cohort's average quotients (IQ, EQ, SQ, AQ, SpQ) against national industry norms.
  - **Intervention Feed:** Flags critical or elevated alerts for students requiring support (e.g., potential dropout patterns) and allows scheduling interventions.
  - **Placement Funnel:** Visualizes the pipeline from Assessment → Shortlisted → Interviewing.
  - **Navigation:** Links to Student Tracking, Talent Pool, and Interviews.

---

## 4. Admin Journey

The Admin journey provides global oversight of the platform's psychometric engine and market data.

### Step 1: Authentication
- **Path:** `/login`
- **Action:** Admins log in (restricted to specific domains like `@taliatech.in` or specific role metadata). They bypass onboarding and go straight to the admin root.

### Step 2: Global Admin Root
- **Path:** `/admin`
- **Action:** Real-time platform metrics and intelligence.
- **Features:**
  - **Stats Summary:** Total Active Nodes, Market Entities, Psychometric Items, and Flagged items.
  - **Market Leads Stream:** A live feed of market opportunities showing Identifier/Role, Target Vector/Entity, and an AI Confidence Score.
  - **Psychometric Item Analysis:** A detailed audit table of assessment questions (items) showing the dimension tested, attempts, success rate, and validity status (e.g., "Too Easy", "Too Hard", "Optimal"). Admins use this to calibrate the assessment engine.
