ALTER TABLE `deed_definitions` ADD `default_section_id` text DEFAULT 'sec_morning' NOT NULL;--> statement-breakpoint
ALTER TABLE `deed_definitions` ADD `bundle_id` text;--> statement-breakpoint
ALTER TABLE `deed_definitions` ADD `linked_dhikr_template` text;