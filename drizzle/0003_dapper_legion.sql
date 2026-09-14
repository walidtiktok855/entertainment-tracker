ALTER TABLE `items` ADD `completedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `monthlyGoal` int DEFAULT 10 NOT NULL;
