CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipient_user_id` integer NOT NULL,
	`actor_user_id` integer,
	`event_type` text NOT NULL,
	`course_id` integer,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`target_url` text NOT NULL,
	`metadata` text,
	`read_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_recipient_read_idx` ON `notifications` (`recipient_user_id`,`read_at`);--> statement-breakpoint
CREATE INDEX `notifications_course_idx` ON `notifications` (`course_id`);