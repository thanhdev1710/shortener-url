import {
  pgTable,
  text,
  bigserial,
  varchar,
  timestamp,
  index,
  boolean,
  foreignKey,
  bigint,
} from "drizzle-orm/pg-core";

/* =========================
   USERS
========================= */

export const users = pgTable(
  "users",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),

    email: varchar("email", { length: 254 }).notNull().unique(),

    googleId: varchar("google_id", { length: 128 }).notNull().unique(),

    name: varchar("name", { length: 100 }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    refreshToken: text("refresh_token"),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
  })
);

/* =========================
   URLS
========================= */

export const urls = pgTable(
  "urls",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),

    shortCode: varchar("short_code", { length: 10 }).notNull().unique(),

    originalUrl: text("original_url").notNull(),

    userId: bigint("user_id", { mode: "number" }),

    clickCount: bigint("click_count", { mode: "number" }).default(0).notNull(),

    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    expiresAt: timestamp("expires_at", {
      mode: "date",
      withTimezone: true,
    }),

    isActive: boolean("is_active").default(true).notNull(),
  },
  (table) => ({
    shortCodeIdx: index("urls_short_code_idx").on(table.shortCode),

    userIdx: index("urls_user_idx").on(table.userId),

    userFk: foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "urls_user_fk",
    }).onDelete("set null"),
  })
);

/* =========================
   ANALYTICS
========================= */

export const analytics = pgTable(
  "analytics",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),

    urlId: bigint("url_id", { mode: "number" }).notNull(),

    country: varchar("country", { length: 5 }),

    userAgent: text("user_agent"),

    referer: text("referer"),

    clickedAt: timestamp("clicked_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    urlIdx: index("analytics_url_idx").on(table.urlId),

    urlDateIdx: index("analytics_url_date_idx").on(
      table.urlId,
      table.clickedAt
    ),

    urlFk: foreignKey({
      columns: [table.urlId],
      foreignColumns: [urls.id],
      name: "analytics_url_fk",
    }).onDelete("cascade"),
  })
);
