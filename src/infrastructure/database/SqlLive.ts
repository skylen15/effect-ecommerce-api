import { PgClient } from "@effect/sql-pg"
import { Config, String } from "effect"

export const SqlLive = PgClient.layerConfig({
  url: Config.redacted("DATABASE_URL"),

  // Auto-transform column names between camelCase (code) and snake_case (DB)
  transformQueryNames: Config.succeed(String.camelToSnake),
  transformResultNames: Config.succeed(String.snakeToCamel)
})
