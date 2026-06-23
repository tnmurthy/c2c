# Original User Request

## Initial Request — 2026-06-18T16:39:25Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Map user journeys and write end-to-end tests

Map out all user journeys across the application (Student, Employer, TPO/Institution, and Admin) and write automated end-to-end tests to verify each journey.

Working directory: c:\tt-ai-stack\01_projects\makeover-talent-agency
Integrity mode: development

## Requirements

### R1. Journey Documentation
Create a detailed Markdown document outlining every step, decision branch, and expected outcome for all four user roles.

### R2. Automated Test Suite
Write automated end-to-end test scripts (using Playwright) to execute the documented journeys, ensuring that logins, redirects, and core actions (like the Student Assessment) function correctly.

## Acceptance Criteria

### Documentation
- [ ] A `user_journeys.md` file is created containing flows for Student, Employer, TPO, and Admin.

### Test Execution
- [ ] Playwright tests are written for each of the 4 roles.
- [ ] Tests must successfully execute and pass against the application.
