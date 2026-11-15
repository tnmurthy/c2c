/**
 * Which Postgres schema the c2c frontend reads and writes (ADR-001, N2).
 * Mirror of api/db_schema.py — keep the two in step.
 *
 *   NEXT_PUBLIC_C2C_DB_SCHEMA = public | c2c | c2c_stg   (default public until N4)
 *
 * Guard: production never uses c2c_stg; preview/development never use c2c.
 * NEXT_PUBLIC_VERCEL_ENV is set by Vercel (production | preview | development).
 */
export const ALLOWED_SCHEMAS = ['public', 'c2c', 'c2c_stg'] as const;
export type C2CSchema = (typeof ALLOWED_SCHEMAS)[number];

export function resolveDbSchema(
  schemaEnv: string | undefined = process.env.NEXT_PUBLIC_C2C_DB_SCHEMA,
  deployEnv: string | undefined = process.env.NEXT_PUBLIC_VERCEL_ENV,
): C2CSchema {
  const schema = (schemaEnv || 'public').trim();
  if (!(ALLOWED_SCHEMAS as readonly string[]).includes(schema)) {
    throw new Error(`NEXT_PUBLIC_C2C_DB_SCHEMA=${schema} is not one of ${ALLOWED_SCHEMAS.join(', ')}`);
  }
  const env = (deployEnv || '').trim().toLowerCase();
  if (env === 'production' && schema === 'c2c_stg') {
    throw new Error('Production deployment must not use the staging schema c2c_stg');
  }
  if ((env === 'preview' || env === 'development') && schema === 'c2c') {
    throw new Error(`${env} deployment must not use the production schema c2c`);
  }
  return schema as C2CSchema;
}

export const DB_SCHEMA: C2CSchema = resolveDbSchema();

/** Spread into createBrowserClient / createServerClient options. */
export const dbOptions = { db: { schema: DB_SCHEMA } } as const;
