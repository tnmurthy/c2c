"""Registry of downstream partner apps. Config comes from env so a partner is
off until its URL is set.

  PARTNER_EKLAV_LAUNCH_URL   eklav endpoint that accepts the c2c launch token
                             (HTTPS form POST, field `c2c_token`)
"""
import os
from dataclasses import dataclass
from typing import Dict, FrozenSet, Optional


@dataclass(frozen=True)
class Partner:
    id: str
    name: str
    audience: str                 # JWT `aud` the partner must verify
    launch_url_env: str
    launch_roles: FrozenSet[str]  # c2c roles allowed to launch into this partner

    @property
    def launch_url(self) -> Optional[str]:
        url = (os.environ.get(self.launch_url_env) or "").strip()
        return url or None


# eklav portals: Student, College Admin (c2c institution / TPO), HR (c2c employer).
# c2c platform admins do not get an eklav identity through SSO.
PARTNERS: Dict[str, Partner] = {
    "eklav": Partner(
        id="eklav",
        name="eklav",
        audience="eklav",
        launch_url_env="PARTNER_EKLAV_LAUNCH_URL",
        launch_roles=frozenset({"student", "institution", "employer"}),
    ),
}


def get_partner(partner_id: str) -> Optional[Partner]:
    return PARTNERS.get(partner_id)
