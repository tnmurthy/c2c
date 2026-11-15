"""Email-domain rules. A shared consumer mailbox domain (gmail.com, ...) proves
nothing about which institution a person belongs to, so it must never grant
institution access or be registered as an institution domain (GO_LIVE B9).
"""
from typing import Optional

PUBLIC_EMAIL_DOMAINS = frozenset({
    "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "yahoo.in", "ymail.com",
    "outlook.com", "outlook.in", "hotmail.com", "hotmail.co.in", "live.com", "live.in", "msn.com",
    "icloud.com", "me.com", "mac.com", "aol.com", "proton.me", "protonmail.com", "pm.me",
    "rediffmail.com", "rediff.com", "zoho.com", "zohomail.in", "gmx.com", "gmx.net",
    "mail.com", "yandex.com", "tutanota.com", "fastmail.com", "hey.com",
})

NON_ACADEMIC_DOMAIN_MESSAGE = "Only academic email domains (.edu, .ac.in) are authorized for TPO onboarding."


def email_domain(email: Optional[str]) -> str:
    if not email or "@" not in email:
        return ""
    return email.rsplit("@", 1)[-1].strip().lower()


def normalize_domain(domain: Optional[str]) -> str:
    return (domain or "").strip().lower().lstrip("@").rstrip(".")


def is_public_email_domain(domain: Optional[str]) -> bool:
    d = normalize_domain(domain)
    return not d or d in PUBLIC_EMAIL_DOMAINS


def domain_matches(email_dom: str, inst_domain: str) -> bool:
    """email_dom is inst_domain or one of its subdomains (cse.cbit.ac.in -> cbit.ac.in)."""
    e, i = normalize_domain(email_dom), normalize_domain(inst_domain)
    return bool(e and i) and (e == i or e.endswith("." + i))
