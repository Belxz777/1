CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`inbound_id` integer NOT NULL,
	`email` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`total_upload_limit` integer DEFAULT 0,
	`total_download_limit` integer DEFAULT 0,
	`total_upload_used` integer DEFAULT 0,
	`total_download_used` integer DEFAULT 0,
	`expiry_time` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`inbound_id`) REFERENCES `inbounds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_clients_inbound` ON `clients` (`inbound_id`);--> statement-breakpoint
CREATE TABLE `inbounds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tag` text NOT NULL,
	`protocol` text NOT NULL,
	`port` integer NOT NULL,
	`listen` text DEFAULT '0.0.0.0' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`settings` text DEFAULT '{}' NOT NULL,
	`stream_settings` text DEFAULT '{}' NOT NULL,
	`sniffing_enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inbounds_tag_unique` ON `inbounds` (`tag`);--> statement-breakpoint
CREATE TABLE `routing_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`action` text NOT NULL,
	`value` text NOT NULL,
	`outbound_tag` text,
	`priority` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `traffic_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` text NOT NULL,
	`upload` integer DEFAULT 0 NOT NULL,
	`download` integer DEFAULT 0 NOT NULL,
	`recorded_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_traffic_client` ON `traffic_stats` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_traffic_date` ON `traffic_stats` (`recorded_at`);