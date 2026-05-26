import Elysia  from "elysia";
import { db }  from "./index";

export const dbPlugin = new Elysia({ name: "db" })
  .decorate("db", db)
