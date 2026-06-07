CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`revieweeId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`role` enum('buyer','seller') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
