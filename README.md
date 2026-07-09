# Campus to Corporate (c2c) 👔
## The Unified AI-First Recruitment & Branding Suite

> **"Transforming individual technical brilliance into cohesive enterprise impact."**

---

### 📂 AGENCY SERVICE DIRECTORY

```text
  ┌────────────────────────────┬───────────────────────────────┬─────────────────────────────────┬───┐
  │ Service Unit               │ Business Vision               │ Technical Highlights            │   │
  ├────────────────────────────┼───────────────────────────────┼─────────────────────────────────┼───┤
  │ brand-optimizer            │ Identity / Core Vision        │ Windows 95 Interactive Desktop  │   │
  │ git-optimizer              │ GitHub Profile Engineering    │ README ASCII / Code Auditing    │   │
  │ job-intel-desk             │ Recruitment Intelligence      │ Scrapers + Fit Ranking          │   │
  │ agent-recruiters           │ Automated Interview Swarm     │ Multi-Agent Coordinated Hiring  │   │
  │ campus-to-corporate        │ Talent Pipeline Bridge        │ Training + Career Readiness     │   │
  └────────────────────────────┴───────────────────────────────┴─────────────────────────────────┴───┘
```

---

### 🏗️ Monorepo Structure

The **Campus to Corporate (c2c)** monorepo organizes specialized AI services into cohesive business units.

*   **/services/brand-optimizer:** [Interactive Branding] Nostalgic UI for modern portfolios.
*   **/services/git-optimizer:** [Technical Presence] Optimizing GitHub profiles for impact.
*   **/services/job-intel-desk:** [Market Intelligence] High-signal role matching and scraping.
*   **/services/agent-recruiters:** [Process Automation] Domain-specific expert agent swarms.
*   **/services/campus-to-corporate:** [Pipeline Development] Bridging the gap for new graduates.

---

### 🧠 Core Competencies

*   **GenAI Integration:** RAG Pipelines, Fine-tuning, Prompt Engineering.
*   **Agentic Workflows:** LangGraph, CrewAI, AutoGen orchestration.
*   **Technical Branding:** Portfolio optimization and GitHub profile engineering.
*   **Pipeline Development:** Bridging the gap for new technical talent.

---

---

### 🚀 Production Deployment (Vercel)

The **Campus to Corporate (c2c)** platform is structured to deploy seamlessly on **Vercel** with a Next.js frontend and a FastAPI Python backend hosted as serverless functions.

#### 1. Configuration (`vercel.json`)
The routing configuration in `vercel.json` directs all frontend traffic to the Next.js application while proxying `/api/*` request paths to the FastAPI python entrypoint `/api/main.py`:
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/main.py"
    }
  ]
}
```

#### 2. Environment Variables
Configure the following environment variables in your Vercel Dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase public anonymous API key.
- `SUPABASE_URL`: Database connection URL.
- `SUPABASE_KEY`: General api key.
- `SUPABASE_SERVICE_ROLE_KEY`: Service role secret key (required for updating user JWT `app_metadata` during onboarding).

---

### 🔌 Database Connection Pooling

For serverless deployments (such as Vercel Functions), database connection exhaustion is a primary concern. Always configure **Supabase connection pooling** to prevent serverless execution threads from flooding Postgres.

- **Transaction Connection URL (Recommended):** Use port `6543` (transaction mode via Supabase Supavisor) for your `SUPABASE_URL` connection strings in serverless deployments.
- **Session Connection URL:** Use port `5432` only for short-lived database migrations and setup scripts.

---

### ⚖️ 5Q Match Engine Weighting

The **Campus to Corporate (c2c)** match engine uses a deterministic, weighted system based on five developmental quotients (**5Q**):
- **IQ** (Intelligence Quotient)
- **AQ** (Adversity Quotient)
- **EQ** (Emotional Quotient)
- **SQ** (Social Quotient)
- **SpQ** (Spiritual/Purpose Quotient)

Depending on the job's `role_type` profile, the quotients are weighted as follows to calculate a score from `0` to `100`:

| Role Type | IQ Weight | AQ Weight | EQ Weight | SQ Weight | SpQ Weight |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tech** | 40% | 30% | 20% | 5% | 5% |
| **Sales** | 10% | 20% | 35% | 35% | 0% |
| **Ops** | 30% | 25% | 25% | 15% | 5% |
| **Leadership**| 20% | 20% | 30% | 25% | 5% |

---

### 📫 Connect with the Agency

*   **Principal:** [Narayanamurthy T](https://www.linkedin.com/in/narayanamurthy-t/)
*   **GitHub:** [tnmurthy](https://github.com/tnmurthy)
*   **Launch Center:** [c2c Platform](https://makeover.mytestbed.tech)

---

<p align="center">
  <img src="https://win98icons.alexmeub.com/icons/png/briefcase-2.png" width="50" height="50">
</p>
