import { Config } from "effect"

export const AppConfig = Config.all({
  port: Config.number("PORT").pipe(Config.withDefault(3001)),
  databaseUrl: Config.redacted("DATABASE_URL"),
  auth: Config.all({
    jwksUrl: Config.string("AUTH_JWKS_URL"),
    issuer: Config.string("AUTH_ISSUER"),
    audience: Config.string("AUTH_AUDIENCE")
  })
})

export type AppConfig = Config.Config.Success<typeof AppConfig>
