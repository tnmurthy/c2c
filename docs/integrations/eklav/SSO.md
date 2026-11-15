# c2c → eklav single sign-on (v1)

c2c is the identity provider (upstream). eklav (downstream) accepts a short-lived
signed token from c2c and signs the user in. eklav needs no c2c credentials and no
shared secret — only c2c's public keys.

## Flow

1. A signed-in c2c user clicks "Open eklav".
2. c2c calls `POST /api/sso/eklav/launch` and gets a token (valid 120 s).
3. The c2c browser auto-submits an HTML form: `POST <eklav launch URL>` with field `c2c_token`.
4. eklav verifies the token (below), finds or creates the user, starts its own session.

The token is sent in a form body, never in a URL.

## Endpoints eklav uses

| What | URL |
|---|---|
| Public keys (JWKS) | `https://c2c.mytestbed.tech/api/sso/jwks.json` — cache ≤ 1 h; refetch on unknown `kid` |
| eklav launch endpoint (eklav implements) | e.g. `https://eklav.in/integrations/c2c/launch` — HTTPS, `POST`, `application/x-www-form-urlencoded` |

## Token

Header: `alg=RS256`, `kid` (e.g. `c2c-sso-v1`).

| Claim | Meaning | eklav must |
|---|---|---|
| `iss` | `https://c2c.mytestbed.tech` | require exact match |
| `aud` | `eklav` | require exact match |
| `exp`, `nbf`, `iat` | 120 s lifetime | reject expired; allow ≤ 30 s clock skew |
| `jti` | unique token id | store until `exp`; reject reuse (replay) |
| `sub` | stable c2c user id | use as the link key to the eklav user |
| `c2c_role` | `student` \| `institution` \| `employer` | map to Student / College Admin / HR portal |
| `c2c_profile_id` | c2c student / institution / employer record id | store; used by later data sync |
| `c2c_institution_id` | c2c institution id (when present) | tenant mapping |
| `email` | user email | display/contact only — **do not** use as the link key |

c2c platform admins cannot launch into eklav.

## Verify in Node.js (Express)

```js
// npm i jose express
import express from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(new URL("https://c2c.mytestbed.tech/api/sso/jwks.json"));
const app = express();
app.use(express.urlencoded({ extended: false }));

app.post("/integrations/c2c/launch", async (req, res) => {
  try {
    const { payload } = await jwtVerify(req.body.c2c_token, JWKS, {
      issuer: "https://c2c.mytestbed.tech",
      audience: "eklav",
      algorithms: ["RS256"],
      clockTolerance: 30,
    });
    // 1. replay guard: SET jti NX EX (exp - now) in Redis; reject if it already existed
    // 2. upsert user by c2c sub; map c2c_role -> eklav portal
    // 3. start the eklav session, redirect to the right portal
    res.redirect(portalFor(payload.c2c_role));
  } catch {
    res.status(401).send("Invalid c2c launch token");
  }
});
```

## Key rotation

c2c publishes the new key under a new `kid` before signing with it. eklav refetches
JWKS when it sees an unknown `kid`; no change is needed on the eklav side.
