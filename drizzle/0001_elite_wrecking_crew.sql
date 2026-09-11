CREATE TABLE `episodeProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mediaItemId` int NOT NULL,
	`seasonNumber` int NOT NULL,
	`episodeNumber` int NOT NULL,
	`title` varchar(255),
	`watched` int NOT NULL DEFAULT 0,
	`watchedAt` timestamp,
	CONSTRAINT `episodeProgress_id` PRIMARY KEY(`id`),
	CONSTRAINT `episode_progress_key` UNIQUE(`userId`,`mediaItemId`,`seasonNumber`,`episodeNumber`)
);
--> statement-breakpoint
CREATE TABLE `mediaItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`externalId` varchar(128),
	`title` varchar(255) NOT NULL,
	`type` enum('Game','Series','Movie') NOT NULL,
	`status` varchar(40) NOT NULL,
	`genre` varchar(120),
	`platform` varchar(120),
	`progress` int NOT NULL DEFAULT 0,
	`rating` int NOT NULL DEFAULT 0,
	`favorite` int NOT NULL DEFAULT 0,
	`hours` int NOT NULL DEFAULT 0,
	`detail` varchar(255),
	`image` text,
	`metadataJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mediaItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `media_user_external_idx` UNIQUE(`userId`,`externalId`)
);
--> statement-breakpoint
CREATE TABLE `playSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mediaItemId` int NOT NULL,
	`startedAt` timestamp NOT NULL,
	`endedAt` timestamp,
	`minutes` int NOT NULL DEFAULT 0,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `playSessions_id` PRIMARY KEY(`id`)
);
