RENAME TABLE `mediaItems` TO `items`;
--> statement-breakpoint
ALTER TABLE `items`
  MODIFY `title` varchar(255) NULL,
  MODIFY `type` enum('Game','Series','Movie') NULL,
  MODIFY `status` varchar(40) NULL,
  ADD `category` enum('Movie','Game','Software','Study','Other') NULL,
  ADD `note` text NULL,
  ADD `sourceLink` text NULL,
  ADD `stage` enum('inbox','library') NOT NULL DEFAULT 'library',
  ADD `scheduledDate` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD `cemeteryDefaultCategory` varchar(32) NULL;
