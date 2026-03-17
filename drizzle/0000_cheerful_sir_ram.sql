CREATE TABLE "analytics" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"url_id" bigint NOT NULL,
	"country" varchar(5),
	"user_agent" text,
	"referer" text,
	"clicked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "urls" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"short_code" varchar(10) NOT NULL,
	"original_url" text NOT NULL,
	"user_id" bigint,
	"click_count" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "urls_short_code_unique" UNIQUE("short_code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" varchar(254) NOT NULL,
	"google_id" varchar(128) NOT NULL,
	"name" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"refresh_token" text,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_url_fk" FOREIGN KEY ("url_id") REFERENCES "public"."urls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urls" ADD CONSTRAINT "urls_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_url_idx" ON "analytics" USING btree ("url_id");--> statement-breakpoint
CREATE INDEX "analytics_url_date_idx" ON "analytics" USING btree ("url_id","clicked_at");--> statement-breakpoint
CREATE INDEX "urls_short_code_idx" ON "urls" USING btree ("short_code");--> statement-breakpoint
CREATE INDEX "urls_user_idx" ON "urls" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");