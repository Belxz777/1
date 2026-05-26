import { defineConfig } from "drizzle-kit";
import { env }          from "./config";

export default defineConfig({
  schema:    "./database/schema.ts",
  out:       "./drizzle",
  dialect:   "sqlite",
  dbCredentials: { url: env.db.path },
});