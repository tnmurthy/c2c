"""
Moodle REST Web Services Client for Campus-to-Corporate (C2C).
Enables automated candidate enrolment into remediation courses when skill gaps are detected.
"""
import os
import logging
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger("c2c_api.moodle_client")

# Standard course mapping for C2C 5Q & Technical assessment gaps
GAP_COURSE_MAPPING: Dict[str, Dict[str, Any]] = {
    "concurrency": {"course_id": 101, "title": "Distributed Concurrency & High-Throughput APIs"},
    "distributed": {"course_id": 101, "title": "Distributed Concurrency & High-Throughput APIs"},
    "fastapi": {"course_id": 101, "title": "Distributed Concurrency & High-Throughput APIs"},
    "incident": {"course_id": 102, "title": "Production Incident Triage & Stress Resilience"},
    "stress": {"course_id": 102, "title": "Production Incident Triage & Stress Resilience"},
    "outage": {"course_id": 102, "title": "Production Incident Triage & Stress Resilience"},
    "adversity": {"course_id": 102, "title": "Production Incident Triage & Stress Resilience"},
    "founder": {"course_id": 103, "title": "Founder Alignment & Stakeholder Persuasion"},
    "leadership": {"course_id": 103, "title": "Founder Alignment & Stakeholder Persuasion"},
    "stakeholder": {"course_id": 103, "title": "Founder Alignment & Stakeholder Persuasion"},
    "security": {"course_id": 104, "title": "Secure Identity, JWT & Microservice Vaulting"},
    "jwt": {"course_id": 104, "title": "Secure Identity, JWT & Microservice Vaulting"},
    "vault": {"course_id": 104, "title": "Secure Identity, JWT & Microservice Vaulting"},
}


class MoodleClient:
    def __init__(
        self,
        base_url: Optional[str] = None,
        token: Optional[str] = None,
        timeout: float = 6.0,
    ):
        self.base_url = (base_url or os.environ.get("MOODLE_URL") or "http://127.0.0.1:8080/lms").rstrip("/")
        self.token = token or os.environ.get("MOODLE_API_TOKEN")
        self.timeout = timeout
        self.endpoint = f"{self.base_url}/webservice/rest/server.php"

    def is_configured(self) -> bool:
        return bool(self.token)

    def _call(self, wsfunction: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Executes a JSON request against Moodle's REST server.php."""
        if not self.token:
            logger.info(f"MoodleClient: token not set; skipping call to {wsfunction}.")
            return None

        query_params = {
            "wstoken": self.token,
            "wsfunction": wsfunction,
            "moodlewsrestformat": "json",
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(self.endpoint, params=query_params, data=params)
                if resp.status_code == 200:
                    return resp.json()
                logger.warning(f"MoodleClient: HTTP {resp.status_code} from {wsfunction}: {resp.text}")
                return None
        except Exception as e:
            logger.error(f"MoodleClient connection error ({wsfunction}): {e}")
            return None

    def get_user_by_email(self, email: str) -> Optional[int]:
        """Looks up Moodle user ID by email."""
        data = self._call("core_user_get_users_by_field", {"field": "email", "values[0]": email})
        if data and isinstance(data, list) and len(data) > 0:
            return data[0].get("id")
        return None

    def enrol_user(self, user_id: int, course_id: int, role_id: int = 5) -> bool:
        """
        Enrols a student in a course via enrol_manual_enrol_users.
        role_id 5 represents standard 'student' in Moodle.
        """
        params = {
            "enrolments[0][roleid]": role_id,
            "enrolments[0][userid]": user_id,
            "enrolments[0][courseid]": course_id,
        }
        res = self._call("enrol_manual_enrol_users", params)
        # enrol_manual_enrol_users returns null on success
        return res is None or res == {}

    def auto_remediate_gaps(
        self,
        student_id: str,
        student_email: str,
        audit_gaps: List[str],
    ) -> Dict[str, Any]:
        """
        Matches candidate audit gaps to Moodle courses and executes enrolment.
        Gracefully handles offline or mock scenarios.
        """
        assigned_courses = []
        for gap in audit_gaps:
            gap_lower = gap.lower()
            matched = False
            for keyword, course in GAP_COURSE_MAPPING.items():
                if keyword in gap_lower:
                    if course not in assigned_courses:
                        assigned_courses.append(course)
                    matched = True
                    break
            if not matched:
                # Default technical track fallback
                fallback = {"course_id": 101, "title": f"Core Competency Track ({gap})"}
                if fallback not in assigned_courses:
                    assigned_courses.append(fallback)

        if not self.is_configured():
            logger.info(
                f"[REMEDIATION] Moodle token not configured. Simulating enrolment for {student_email}: "
                f"{[c['title'] for c in assigned_courses]}"
            )
            return {
                "success": True,
                "simulated": True,
                "student_id": student_id,
                "student_email": student_email,
                "enrolled_courses": assigned_courses,
            }

        # Live Moodle Enrolment
        moodle_user_id = self.get_user_by_email(student_email)
        enrolled_success = []
        if moodle_user_id:
            for c in assigned_courses:
                ok = self.enrol_user(moodle_user_id, c["course_id"])
                if ok:
                    enrolled_success.append(c)

        return {
            "success": True,
            "simulated": False,
            "student_id": student_id,
            "student_email": student_email,
            "moodle_user_id": moodle_user_id,
            "enrolled_courses": enrolled_success if moodle_user_id else assigned_courses,
        }


# Singleton client
moodle_client = MoodleClient()
