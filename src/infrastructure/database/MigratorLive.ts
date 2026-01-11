import { PgMigrator } from "@effect/sql-pg"
import { Layer } from "effect"
import { fileURLToPath } from "node:url"

// Migration layer using file system loader
export const MigratorLive = PgMigrator.layer({
  loader: PgMigrator.fromFileSystem(
    fileURLToPath(new URL("../../migrations", import.meta.url))
  ),
  // Where to put the generated _schema.sql file
  schemaDirectory: "src/migrations"
}).pipe(Layer.orDie)
