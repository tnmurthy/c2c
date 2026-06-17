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
