from fpdf import FPDF

def generate_student_pdf(student_data: dict, assessment_data: dict) -> bytes:
    class PDF(FPDF):
        def header(self):
            self.set_font("helvetica", "B", 15)
            self.cell(0, 10, "Campus to Corporate (C2C) Professional Legend Dossier", align="C", new_x="LMARGIN", new_y="NEXT")
            self.ln(10)

        def footer(self):
            self.set_y(-15)
            self.set_font("helvetica", "I", 8)
            self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    pdf = PDF()
    pdf.add_page()
    pdf.set_font("helvetica", size=12)

    # Student Info
    pdf.set_font("helvetica", "B", 14)
    name = student_data.get("full_name", "Unknown Student")
    pdf.cell(0, 10, f"Candidate Name: {name}", new_x="LMARGIN", new_y="NEXT")
    
    dept = student_data.get("department", "Unknown Department")
    pdf.set_font("helvetica", size=12)
    pdf.cell(0, 8, f"Department: {dept}", new_x="LMARGIN", new_y="NEXT")
    
    grad_year = student_data.get("graduation_year", "Unknown Year")
    pdf.cell(0, 8, f"Graduation Year: {grad_year}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Assessment Results
    if assessment_data:
        # Profile
        profile = assessment_data.get("primary_profile", "Unknown Profile")
        pdf.set_font("helvetica", "B", 14)
        pdf.cell(0, 10, "Cognitive Archetype & Founder Fit", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", size=12)
        pdf.cell(0, 8, f"Primary Profile: {profile}", new_x="LMARGIN", new_y="NEXT")
        
        founder_fit = assessment_data.get("founder_fit", {})
        if founder_fit:
            fit_scores = ", ".join([f"{k}: {v}%" for k, v in founder_fit.items()])
            pdf.multi_cell(0, 8, f"Founder Fit Density: {fit_scores}")
        pdf.ln(5)

        # Dimension Scores
        dimensions = assessment_data.get("dimension_scores", {})
        if dimensions:
            pdf.set_font("helvetica", "B", 14)
            pdf.cell(0, 10, "Intelligence Quotient Vector Scores", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("helvetica", size=12)
            for dim, score in dimensions.items():
                pdf.cell(0, 8, f"{dim.upper()} (Score): {score}", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(5)

        # Development Report
        development_report = assessment_data.get("development_report", {})
        if development_report:
            pdf.set_font("helvetica", "B", 14)
            pdf.cell(0, 10, "Development & Optimization Directives", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("helvetica", size=12)
            
            summary = development_report.get("profile_summary", "")
            if summary:
                pdf.multi_cell(0, 8, f"Summary: {summary}")
                pdf.ln(3)
                
            feedback = development_report.get("actionable_feedback", [])
            if feedback:
                pdf.set_font("helvetica", "B", 12)
                pdf.cell(0, 8, "Optimization Protocols:", new_x="LMARGIN", new_y="NEXT")
                pdf.set_font("helvetica", size=12)
                for f in feedback:
                    pdf.multi_cell(0, 8, f"- {f}")
                pdf.ln(3)
    else:
        pdf.cell(0, 10, "No assessment data available.", new_x="LMARGIN", new_y="NEXT")

    return bytes(pdf.output())

def generate_interview_guide_pdf(student_data: dict, assessment_data: dict) -> bytes:
    class PDF(FPDF):
        def header(self):
            self.set_font("helvetica", "B", 15)
            self.cell(0, 10, "C2C Customized HR Interview Panel Guide", align="C", new_x="LMARGIN", new_y="NEXT")
            self.ln(10)

        def footer(self):
            self.set_y(-15)
            self.set_font("helvetica", "I", 8)
            self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    pdf = PDF()
    pdf.add_page()
    pdf.set_font("helvetica", size=12)

    # Candidate Profile Header
    pdf.set_font("helvetica", "B", 13)
    name = student_data.get("full_name", "Unknown Candidate")
    pdf.cell(0, 8, f"Candidate: {name}", new_x="LMARGIN", new_y="NEXT")
    
    dept = student_data.get("department", "Unknown Dept")
    pdf.set_font("helvetica", size=11)
    pdf.cell(0, 6, f"Department/Specialization: {dept}", new_x="LMARGIN", new_y="NEXT")
    
    profile = assessment_data.get("primary_profile", "Unknown Profile")
    pdf.cell(0, 6, f"Evaluated Primary Archetype: {profile}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    
    # Overview of Gaps
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 8, "Competency Vector Assessment & Gap Analysis", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", size=10)
    pdf.cell(0, 6, "Below is the summary of dimension scores. Gaps are identified as scores under 70.", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    dimensions = assessment_data.get("dimension_scores", {})
    gaps = []
    
    pdf.set_font("helvetica", "B", 10)
    for dim, score in dimensions.items():
        is_gap = score < 70
        gap_status = "[GAP IDENTIFIED]" if is_gap else "[SATISFACTORY]"
        if is_gap:
            gaps.append(dim)
        pdf.cell(0, 6, f"- {dim.upper()}: {score} {gap_status}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Questions based on Gaps
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 8, "Automated Tailored Panel Questions", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    questions_bank = {
        "aq": {
            "q": "Tell me about a time when a critical dependency or tool in your project suddenly failed or went behind a paywall. How did you react and adapt?",
            "eval": "Look for high resourcefulness, self-directed learning of alternatives, and speed of pivot without giving up."
        },
        "eq": {
            "q": "Describe a scenario where a peer or reviewer gave extremely harsh public feedback on your code. How did you manage your emotions and address the critique?",
            "eval": "Assess if they react defensively or if they take it constructively, separate self-worth from work, and seek clarity."
        },
        "sq": {
            "q": "If a teammate is consistently ghosting their deliverables during a critical sprint, how would you handle it?",
            "eval": "Look for proactive private reach-out, empathetic blocker resolution, followed by structured escalation only if needed."
        },
        "iq": {
            "q": "Walk me through how you would optimize a slow, bottlenecked data pipeline. What metrics would you track?",
            "eval": "Check for structured diagnostic logic, profiling tools knowledge, and consideration of trade-offs like memory vs storage."
        },
        "spq": {
            "q": "How would you handle a situation where your company asks you to implement a dark pattern or an ethically questionable AI feature?",
            "eval": "Evaluate moral clarity, risk assessment, and constructive dissent or alternative alignment proposal."
        }
    }

    # If no gaps are found, add questions for the lowest score
    if not gaps and dimensions:
        lowest_dim = min(dimensions, key=dimensions.get)
        gaps.append(lowest_dim)
        
    pdf.set_font("helvetica", size=10)
    for idx, dim in enumerate(gaps):
        dim_key = dim.lower()
        if dim_key in questions_bank:
            q_info = questions_bank[dim_key]
            pdf.set_font("helvetica", "B", 11)
            pdf.multi_cell(0, 6, f"Question {idx+1} (Targeting {dim.upper()} Vector Gap):")
            pdf.set_font("helvetica", "I", 10)
            pdf.multi_cell(0, 5, f"\"{q_info['q']}\"")
            pdf.ln(1)
            pdf.set_font("helvetica", "B", 9)
            pdf.multi_cell(0, 5, f"Evaluation Criteria: {q_info['eval']}")
            pdf.ln(4)
            
    if not gaps:
        pdf.cell(0, 6, "No significant competency gaps detected. General screening questions are recommended.", new_x="LMARGIN", new_y="NEXT")

    return bytes(pdf.output())
