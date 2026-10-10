import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const isProduction = process.env.NODE_ENV === 'production'

// En production, aucune valeur par défaut n'est tolérée pour les secrets,
// l'URL de base de données et les origines CORS.
function setting(name: string, devDefault?: string): string {
  const value = process.env[name]
  if (value) return value
  if (!isProduction && devDefault !== undefined) return devDefault
  throw new Error(`Variable d'environnement manquante : ${name}`)
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: setting('DATABASE_URL'),
    // Beaucoup d'hébergeurs PostgreSQL imposent SSL : DATABASE_SSL=true l'active.
    databaseDriverOptions:
      process.env.DATABASE_SSL === 'true'
        ? { connection: { ssl: { rejectUnauthorized: false } } }
        : {},
    // Redis est optionnel : sans REDIS_URL, le projet fonctionne sur une seule instance.
    redisUrl: process.env.REDIS_URL || undefined,
    // "shared" (défaut), "server" ou "worker" selon l'hébergement choisi.
    workerMode: process.env.MEDUSA_WORKER_MODE as
      | 'shared'
      | 'server'
      | 'worker'
      | undefined,
    http: {
      storeCors: setting('STORE_CORS', 'http://localhost:8000'),
      adminCors: setting('ADMIN_CORS', 'http://localhost:9000'),
      authCors: setting('AUTH_CORS', 'http://localhost:9000'),
      jwtSecret: setting('JWT_SECRET', 'dev-only-jwt-secret'),
      cookieSecret: setting('COOKIE_SECRET', 'dev-only-cookie-secret'),
    },
  },
  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === 'true',
    backendUrl: process.env.MEDUSA_BACKEND_URL,
  },
})
