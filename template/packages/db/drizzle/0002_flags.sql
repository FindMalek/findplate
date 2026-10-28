CREATE TABLE "feature_flag" (
	"name" text PRIMARY KEY NOT NULL,
	"rollout" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
