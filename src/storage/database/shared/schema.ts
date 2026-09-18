import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  serial,
} from "drizzle-orm/pg-core";

// Keep system health check table
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

// Global site settings
export const siteSettings = pgTable(
  "site_settings",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    key: varchar("key", { length: 100 }).notNull().unique(),
    value: text("value").notNull().default(""),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("site_settings_key_idx").on(table.key)]
);

// Banner images for homepage
export const banners = pgTable(
  "banners",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 255 }).notNull().default(""),
    subtitle: varchar("subtitle", { length: 500 }).notNull().default(""),
    image_url: text("image_url").notNull().default(""),
    sort_order: integer("sort_order").notNull().default(0),
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("banners_sort_idx").on(table.sort_order)]
);

// Products (trucks, vehicles)
export const products = pgTable(
  "products",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description").notNull().default(""),
    images: jsonb("images").notNull().default(sql`'[]'::jsonb`),
    specs: jsonb("specs").notNull().default(sql`'{}'::jsonb`),
    b_scenarios: text("b_scenarios").notNull().default(""),
    c_scenarios: text("c_scenarios").notNull().default(""),
    category: varchar("category", { length: 50 }).notNull(),
    is_active: boolean("is_active").notNull().default(true),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("products_category_idx").on(table.category)]
);

// Business services
export const businessServices = pgTable(
  "business_services",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull().default(""),
    image_url: text("image_url").notNull().default(""),
    cooperation_mode: text("cooperation_mode").notNull().default(""),
    scenarios: text("scenarios").notNull().default(""),
    category: varchar("category", { length: 20 }).notNull(), // 'enterprise' or 'personal'
    is_active: boolean("is_active").notNull().default(true),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("business_services_category_idx").on(table.category)]
);

// Project cases
export const cases = pgTable(
  "cases",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull().default(""),
    images: jsonb("images").notNull().default(sql`'[]'::jsonb`),
    category: varchar("category", { length: 20 }).notNull(), // 'enterprise' or 'personal'
    is_active: boolean("is_active").notNull().default(true),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("cases_category_idx").on(table.category)]
);

// Customer leads (form submissions)
export const leads = pgTable(
  "leads",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    type: varchar("type", { length: 20 }).notNull(), // 'enterprise' or 'personal'
    company_name: varchar("company_name", { length: 255 }),
    contact_person: varchar("contact_person", { length: 255 }),
    phone: varchar("phone", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }),
    intention: varchar("intention", { length: 50 }),
    planned_time: varchar("planned_time", { length: 100 }),
    scenario: text("scenario"),
    message: text("message"),
    is_followed: boolean("is_followed").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("leads_type_idx").on(table.type),
    index("leads_created_at_idx").on(table.created_at),
  ]
);

// About us content sections
export const aboutSections = pgTable(
  "about_sections",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    section_key: varchar("section_key", { length: 100 }).notNull().unique(),
    title: varchar("title", { length: 255 }).notNull().default(""),
    content: text("content").notNull().default(""),
    images: jsonb("images").notNull().default(sql`'[]'::jsonb`),
    sort_order: integer("sort_order").notNull().default(0),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("about_sections_key_idx").on(table.section_key)]
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    url: text("url").notNull().default(""),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("media_assets_category_idx").on(table.category)]
);
