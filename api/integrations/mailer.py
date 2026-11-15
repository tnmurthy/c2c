"""Plain-text email over SMTP (SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD).

Returns False when SMTP is not configured or sending fails, so callers can fall
back to showing a link. Never logs the message body (invite links are secrets).
"""
import logging
import os
import smtplib
from email.mime.text import MIMEText

logger = logging.getLogger("c2c_api.mailer")


def smtp_configured() -> bool:
    return all(os.environ.get(k) for k in ("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD"))


def send_mail(to: str, subject: str, body: str) -> bool:
    if not smtp_configured():
        return False
    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = os.environ.get("SMTP_FROM") or os.environ["SMTP_USER"]
        msg["To"] = to
        with smtplib.SMTP(os.environ["SMTP_HOST"], int(os.environ["SMTP_PORT"]), timeout=10) as server:
            server.starttls()
            server.login(os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"])
            server.send_message(msg)
        return True
    except Exception as e:
        logger.error("SMTP send to %s failed: %s", to.split("@")[-1], e)
        return False
