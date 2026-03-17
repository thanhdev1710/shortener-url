import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

export const getDb = (DATABASE_URL: string) => {
  const sql = neon(DATABASE_URL);
  const db = drizzle(sql);
  return db;
};
