CREATE TABLE `deed_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`default_schedule` text NOT NULL,
	`payload` text
);
--> statement-breakpoint
CREATE TABLE `deed_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`deed_id` text NOT NULL,
	`date` text NOT NULL,
	`status` text NOT NULL,
	`value` integer,
	`note` text,
	`updated_at` integer NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	`dirty` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`deed_id`) REFERENCES `deeds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deed_logs_user_date_deed_unique` ON `deed_logs` (`user_id`,`date`,`deed_id`);--> statement-breakpoint
CREATE TABLE `deeds` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`definition_id` text,
	`section_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`schedule` text NOT NULL,
	`created_at` text NOT NULL,
	`sort_order` integer NOT NULL,
	`deleted_at` text,
	`linked_dhikr_id` text,
	`target` integer,
	`updated_at` integer NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	`dirty` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`definition_id`) REFERENCES `deed_definitions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`linked_dhikr_id`) REFERENCES `dhikrs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `dhikr_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`dhikr_id` text NOT NULL,
	`date` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	`dirty` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`dhikr_id`) REFERENCES `dhikrs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dhikr_logs_user_date_dhikr_unique` ON `dhikr_logs` (`user_id`,`date`,`dhikr_id`);--> statement-breakpoint
CREATE TABLE `dhikrs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`sort_order` integer NOT NULL,
	`target` integer,
	`created_at` text NOT NULL,
	`deleted_at` text,
	`updated_at` integer NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	`dirty` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`sort_order` integer NOT NULL,
	`deleted_at` text,
	`updated_at` integer NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	`dirty` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
DROP TABLE `prayer_logs`;