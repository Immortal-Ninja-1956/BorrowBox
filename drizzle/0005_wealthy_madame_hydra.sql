CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealId` int NOT NULL,
	`senderId` int NOT NULL,
	`text` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
