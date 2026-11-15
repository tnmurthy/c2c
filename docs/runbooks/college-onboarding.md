# Runbook — onboarding a college (M4)

For c2c admins and a college's TPO. Covers ADR-002 (prospects, TPO verification) and ADR-003 M4.
Production: `https://c2c.mytestbed.tech`. Every step below is written to `audit_logs`.

## 0. Before you start (sales / legal)

| Need | Why |
|---|---|
| Signed LoI or MSA, with its reference (e.g. `MSA-2026-07`) | Activation records it; invites are blocked without it |
| The TPO's name and official email, **taken from the agreement or the college website** | Never from the person asking (ADR-002 SOP step 1) |
| A clause making c2c the college's data processor for student data (DPDP), with its reference (e.g. `MSA-2026-07 cl. 9`) | Roster import stays off without it |
| The college's official email domain on file (e.g. `cbit.ac.in`) | Invites only go to that domain; webmail is refused |

## 1. Activate the college — c2c admin

1. Sign in as admin → **Global Admin Root** → **Colleges & staff** (`/admin/tenancy`).
2. Find the college (filter **Prospects**) → **Activate** → enter the agreement reference.
3. It shows **active** with the agreement reference.

A college must belong to a tenant (university / college group). If it doesn't, assign it first (SQL, admin-only).

## 2. Invite the TPO — c2c admin

1. Call the placement cell on the college's official switchboard number to confirm the person (ADR-002 SOP step 3). Note caller, date and outcome in the CRM lead.
2. On the college row: enter the TPO's official email → **Invite TPO**.
3. Until SMTP is configured, copy the link shown (it is shown **once**, works **once**, expires in **72 h**) and send it from your own mailbox.
4. To re-send: invite again — the old link is revoked automatically. To cancel: **Open invites → Revoke**.

**Older TPO accounts** under *Unverified staff*: verify only after steps 0–2 confirm the person; otherwise invite the right person and leave the old account unverified (it stays read-only).

## 3. TPO accepts — TPO

1. Open the link → sign in or create an account **with the invited email** (Google or email + password).
2. **Accept invite** → lands on the TPO dashboard. The account is now a *verified* TPO for that college.

If it says "signed in as someone else": **Switch account** and sign in with the invited email.

## 4. Departments & staff — TPO

Sidebar → **Departments & Staff**.

| Task | How |
|---|---|
| Fix names / codes | Click a name to rename; type a short code (e.g. `AI&DS`) |
| Map to a discipline | Choose one in **Discipline**; unmapped rows are highlighted |
| Duplicates (e.g. "CSE" and "Computer Science") | **Merge into** → the one to keep. Students, cohorts and staff move; the old name is remembered. Cannot be undone |
| *Needs review* | Students whose department text didn't match: pick a department per spelling, or **+ New department** |
| Department coordinators / faculty mentors | Email (college domain) + role + department → **Invite**; send the link shown. They see only their department |

## 5. Switch on roster import — c2c admin

Only once the data-processing clause (step 0) is signed: `/admin/tenancy` → college row → **Roster off** → enter the clause reference → it shows **Roster on**. To stop imports: click **Roster on** → confirm.

## 6. Import the roster — TPO

Sidebar → **Roster Import**.

1. **Template** shows the columns: `full_name, email, department, graduation_year` (+ optional `phone, roll_no`). Common headings ("Branch", "Year of Passing", "Hall Ticket", "Mobile") are recognised; comma, semicolon or tab.
2. **Upload CSV** (≤ 2 MB, ≤ 5,000 students; split by department or year if bigger). Nothing is saved yet.
3. Review the check: *new* / *update* / *error*. Use the filter to see errors. Typical errors: invalid email, 2-digit year, duplicate email in the file, email already registered at another college, a cell starting with `=`.
4. **Import N students** → confirm. Rows with errors are skipped; fix them and upload again (re-uploading updates the same students, never duplicates).
5. Students whose department wasn't recognised are added and appear under *Needs review* (step 4).

What students experience: **nothing yet** — no email, no login. When a student signs up with the **same email** (confirmed), their record is linked automatically. Until then employers cannot see them.

## 7. After the first real roster

- ADR-002 T6: that college's seeded sample students are hidden from employers already; deleting them is a separate, reviewed step (ask engineering).
- Tell students to sign up at `https://c2c.mytestbed.tech` with their college email.

## Troubleshooting

| Message | Meaning / fix |
|---|---|
| "Activate the college … before inviting staff" | Step 1 not done, or no agreement reference |
| "The address must be on the college's domain" | Use the official address; add the domain if the college has a second one |
| "This invite has been expired / revoked / accepted" | Send a new invite |
| "View only: your TPO account is not verified yet" | Old account: admin verifies it (step 2) or invites again |
| "Roster import isn't switched on" | Step 5 |
| "Preview expired" | Upload the file again (previews last 24 h) |
| Student: "This email is already linked to another account" | Two logins for one email: admin investigates in Supabase Auth |
| Student: "Confirm your email address" | They must click the confirmation email from sign-up first |
