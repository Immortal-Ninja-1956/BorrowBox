CREATE TABLE `deals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemId` int NOT NULL,
	`sellerId` int NOT NULL,
	`buyerId` int,
	`status` enum('OPEN','Contacted','Shipped','DELIVERED','CONFIRMED','PAID') NOT NULL DEFAULT 'OPEN',
	`buyerConfirmed` int NOT NULL DEFAULT 0,
	`amount` decimal(10,2) NOT NULL,
	`upiQrCode` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`amount` decimal(10,2) NOT NULL,
	`imageUrl` text,
	`category` varchar(100),
	`status` enum('OPEN','Contacted','Shipped','DELIVERED') NOT NULL DEFAULT 'OPEN',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `upiId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `upiName` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `whatsapp` varchar(20);