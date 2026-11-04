"""
Seed 400+ dummy student profiles across 4 universities, 15 colleges, and 5 departments.
Inserts into public.institutions, public.institution_whitelist, public.students, and public.assessments.
"""

import urllib.request
import json
import random
import uuid

SUPABASE_URL = "https://onsmkbwqucvbzggugmmn.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uc21rYndxdWN2YnpnZ3VnbW1uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE4OTAyNywiZXhwIjoyMDk2NzY1MDI3fQ.EqtvQLQ4Y8ne_YpkjI_31xana2ydabcWI4I_cIzBztk"

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

UNIVERSITIES = [
    {
        "name": "Jawaharlal Nehru Technological University (JNTU)",
        "colleges": [
            {"name": "JNTUH College of Engineering, Hyderabad", "domain": "jntuhceh.ac.in", "location": "Kukatpally, Hyderabad"},
            {"name": "Chaitanya Bharathi Institute of Technology (CBIT)", "domain": "cbit.ac.in", "location": "Gandipet, Hyderabad"},
            {"name": "Vasavi College of Engineering", "domain": "vce.ac.in", "location": "Ibrahimbagh, Hyderabad"},
            {"name": "VNR Vignana Jyothi Institute of Engineering & Technology", "domain": "vnrvjiet.ac.in", "location": "Bachupally, Hyderabad"},
        ]
    },
    {
        "name": "Osmania University (OU)",
        "colleges": [
            {"name": "University College of Engineering, Osmania University", "domain": "uceou.edu", "location": "Amberpet, Hyderabad"},
            {"name": "Muffakham Jah College of Engineering and Technology", "domain": "mjcet.ac.in", "location": "Banjara Hills, Hyderabad"},
            {"name": "Keshav Memorial Institute of Technology (KMIT)", "domain": "kmit.in", "location": "Narayanguda, Hyderabad"},
            {"name": "Maturi Venkata Subba Rao (MVSR) Engineering College", "domain": "mvsrec.edu.in", "location": "Nadergul, Hyderabad"},
        ]
    },
    {
        "name": "Kakatiya University (KU)",
        "colleges": [
            {"name": "Kakatiya Institute of Technology & Science (KITS)", "domain": "kitsw.ac.in", "location": "Warangal, Telangana"},
            {"name": "University College of Engineering, Kothagudem", "domain": "ucek.ac.in", "location": "Kothagudem, Telangana"},
            {"name": "SR University (SR Engineering College)", "domain": "sru.edu.in", "location": "Ananthasagar, Warangal"},
            {"name": "Vaagdevi College of Engineering", "domain": "vaagdevi.edu.in", "location": "Bollikunta, Warangal"},
        ]
    },
    {
        "name": "University of Hyderabad (UoH & Tech Institutes)",
        "colleges": [
            {"name": "School of Computer Sciences, University of Hyderabad", "domain": "uoh.ac.in", "location": "Gachibowli, Hyderabad"},
            {"name": "International Institute of Information Technology (IIIT-H)", "domain": "iiit.ac.in", "location": "Gachibowli, Hyderabad"},
            {"name": "Mahindra University School of Computer Science", "domain": "mahindrauniversity.edu.in", "location": "Bahadurpally, Hyderabad"},
        ]
    }
]

DEPARTMENTS = [
    {
        "name": "Computer Science & Engineering",
        "skills": ["Python", "TypeScript", "React", "Docker", "PostgreSQL", "FastAPI", "Go", "Redis", "Distributed Systems"],
        "profiles": ["Full-Stack System Architect", "Cloud Systems Engineer", "Backend Performance Specialist"]
    },
    {
        "name": "Artificial Intelligence & Data Science",
        "skills": ["Python", "PyTorch", "TensorFlow", "Scikit-Learn", "Pandas", "FastAPI", "Vector DBs", "LLMs", "MLOps"],
        "profiles": ["AI/ML Product Engineer", "Data Intelligence Specialist", "Applied AI Researcher"]
    },
    {
        "name": "Information Technology",
        "skills": ["Java", "Spring Boot", "AWS", "Microservices", "Kubernetes", "Next.js", "GraphQL", "CI/CD"],
        "profiles": ["Platform Reliability Engineer", "Enterprise Cloud Architect", "Full-Stack Engineer"]
    },
    {
        "name": "Electronics & Communication Engineering",
        "skills": ["Embedded C", "C++", "Verilog", "IoT Architecture", "MATLAB", "Microcontrollers", "RTOS", "Edge Computing"],
        "profiles": ["Embedded Systems & IoT Architect", "Hardware-Software Integration Lead", "Edge AI Specialist"]
    },
    {
        "name": "Electrical & Electronics Engineering",
        "skills": ["Power Systems", "PLC/SCADA", "MATLAB", "Simulink", "C++", "Circuit Design", "Renewable Energy Analytics"],
        "profiles": ["Power Grid Intelligence Specialist", "Industrial Systems Engineer", "Energy Optimization Analyst"]
    }
]

FIRST_NAMES = [
    "Aarav", "Priya", "Rohan", "Sneha", "Aditya", "Ananya", "Vikram", "Kavya", "Siddharth", "Pooja",
    "Karthik", "Divya", "Arjun", "Neha", "Varun", "Riya", "Sai", "Swathi", "Pranav", "Meera",
    "Nikhil", "Shreya", "Harsha", "Deepa", "Tarun", "Keerthi", "Akhil", "Bhavana", "Suresh", "Manasa",
    "Chaitanya", "Harika", "Vamsi", "Aishwarya", "Teja", "Sindhu", "Naveen", "Madhuri", "Manoj", "Sravani",
    "Gautam", "Lavanya", "Kalyan", "Gayatri", "Abhishek", "Pallavi", "Ravindra", "Archana", "Dinesh", "Sravanthi"
]

LAST_NAMES = [
    "Reddy", "Rao", "Sharma", "Patel", "Varma", "Choudhury", "Gupta", "Kumar", "Iyer", "Nair",
    "Bhat", "Deshmukh", "Kulkarni", "Menon", "Joshi", "Prasad", "Murthy", "Sen", "Das", "Nambiar"
]

def make_request(url, method="GET", data=None):
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=HEADERS, method=method)
    with urllib.request.urlopen(req) as resp:
        res = resp.read().decode("utf-8")
        return json.loads(res) if res else None

def main():
    print("=" * 70)
    print("SEEDBOMB: 4 Universities, 15 Colleges, 5 Departments, 400+ Students")
    print("=" * 70)

    # 1. Fetch existing institutions
    existing_insts = make_request(f"{SUPABASE_URL}/rest/v1/institutions?select=*") or []
    inst_by_domain = {inst["domain"]: inst for inst in existing_insts}
    print(f"Found {len(existing_insts)} existing institutions in Talia.")

    college_records = []
    # 2. Insert or update the 15 colleges
    for uni in UNIVERSITIES:
        uni_name = uni["name"]
        for col in uni["colleges"]:
            domain = col["domain"]
            if domain in inst_by_domain:
                college_records.append(inst_by_domain[domain])
                print(f"  [OK] Exists: {col['name']} (ID: {inst_by_domain[domain]['id']})")
            else:
                new_inst = {
                    "name": f"{col['name']} ({uni_name.split('(')[0].strip()})",
                    "type": "University" if "University" in col["name"] else "College",
                    "domain": domain,
                    "location": col["location"]
                }
                res = make_request(f"{SUPABASE_URL}/rest/v1/institutions", method="POST", data=new_inst)
                if res:
                    college_records.append(res[0])
                    inst_by_domain[domain] = res[0]
                    print(f"  [+] Created: {col['name']} (ID: {res[0]['id']})")

    print(f"\nTotal colleges ready: {len(college_records)}")

    # 3. Generate 450 students (30 students per college across the 5 departments)
    students_batch = []
    assessments_batch = []
    student_count = 0

    print("\nGenerating 450 student profiles & psychometric assessments...")

    for col in college_records:
        inst_id = col["id"]
        inst_domain = col["domain"]
        students_per_college = 30  # 15 * 30 = 450 students

        for i in range(students_per_college):
            dept = DEPARTMENTS[i % len(DEPARTMENTS)]
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            full_name = f"{first} {last}"
            email = f"{first.lower()}.{last.lower()}{random.randint(10, 99)}@{inst_domain}"
            grad_year = random.choice([2025, 2026, 2027])
            skills = random.sample(dept["skills"], k=random.randint(4, min(7, len(dept["skills"]))))

            student_id = str(uuid.uuid4())
            student = {
                "id": student_id,
                "full_name": full_name,
                "email": email,
                "graduation_year": grad_year,
                "department": dept["name"],
                "institution_id": inst_id,
                "skills": skills,
                "is_verified": True,
                "bio": f"{dept['name']} candidate at {col['name']}. Specializing in {skills[0]} and {skills[1]}."
            }
            students_batch.append(student)

            # Psychological & Technical Assessment
            dim_scores = {
                "Execution": random.randint(70, 96),
                "Leadership": random.randint(65, 93),
                "Problem Solving": random.randint(74, 98),
                "Communication": random.randint(68, 95),
                "Adaptability": random.randint(72, 97),
                "IQ": random.randint(110, 142),
                "EQ": random.randint(102, 138),
                "AQ": random.randint(106, 140)
            }
            founder_fit = {
                "early_stage": random.randint(65, 96),
                "scale_up": random.randint(70, 98),
                "corporate": random.randint(68, 95)
            }
            primary_profile = random.choice(dept["profiles"])

            assessment = {
                "student_id": student_id,
                "dimension_scores": dim_scores,
                "founder_fit": founder_fit,
                "primary_profile": primary_profile,
                "development_report": {
                    "profile_summary": f"Strong engineering foundation with demonstrated capability in {skills[0]} and {skills[1]}. Displays high cognitive flexibility ({dim_scores['AQ']} AQ) and robust analytical execution.",
                    "actionable_feedback": [
                        f"Deepen proficiency in architectural system design and latency optimization.",
                        f"Expand portfolio with distributed open-source project contributions in {dept['name']}.",
                        f"Refine technical presentation clarity in cross-functional review discussions."
                    ]
                }
            }
            assessments_batch.append(assessment)
            student_count += 1

    print(f"Generated {len(students_batch)} student models. Writing to database in batches...")

    # Insert students in chunks of 50
    chunk_size = 50
    for i in range(0, len(students_batch), chunk_size):
        chunk = students_batch[i:i+chunk_size]
        make_request(f"{SUPABASE_URL}/rest/v1/students", method="POST", data=chunk)
        print(f"  Inserted students batch {i+1} to {min(i+chunk_size, len(students_batch))}...")

    # Insert assessments in chunks of 50
    for i in range(0, len(assessments_batch), chunk_size):
        chunk = assessments_batch[i:i+chunk_size]
        make_request(f"{SUPABASE_URL}/rest/v1/assessments", method="POST", data=chunk)
        print(f"  Inserted assessments batch {i+1} to {min(i+chunk_size, len(assessments_batch))}...")

    print("\n" + "=" * 70)
    print(f"SUCCESS: Seeded {len(college_records)} colleges and {student_count} students with full assessments!")
    print("=" * 70)

if __name__ == "__main__":
    main()
