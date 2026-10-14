# =============================================================================
# makeover-talent-agency — Next.js application
# Base: docker.io/tnmurthy/default:latest
# =============================================================================

FROM docker.io/tnmurthy/default:latest

USER root

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g pnpm \
    && rm -rf /var/lib/apt/lists/*

USER appuser

COPY --chown=appuser:appgroup package.json pnpm-lock.yaml* package-lock.json* ./
RUN pnpm install --frozen-lockfile 2>/dev/null || npm ci

COPY --chown=appuser:appgroup . .
RUN pnpm build 2>/dev/null || npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
