-- Run this against a FRESH database.
-- If migrating from an existing Manus DB, see migration note at bottom.

CREATE TABLE IF NOT EXISTS `users` (
  `id` int AUTO_INCREMENT NOT NULL,
  `email` varchar(320) NOT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `upiId` varchar(255),
  `upiName` varchar(255),
  `whatsapp` varchar(20),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `users_id` PRIMARY KEY(`id`),
  CONSTRAINT `users_email_unique` UNIQUE(`email`)
);

CREATE TABLE IF NOT EXISTS `items` (
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

CREATE TABLE IF NOT EXISTS `deals` (
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

-- MIGRATION NOTE: If upgrading from a Manus deployment run this instead:
-- ALTER TABLE users ADD COLUMN `email` varchar(320) NOT NULL DEFAULT '' AFTER `id`;
-- ALTER TABLE users ADD COLUMN `passwordHash` varchar(255) NOT NULL DEFAULT '' AFTER `email`;
-- UPDATE users SET email = CONCAT(openId, '@placeholder.local') WHERE email = '';
-- ALTER TABLE users DROP COLUMN openId;
-- ALTER TABLE users DROP COLUMN loginMethod;
-- ALTER TABLE users MODIFY COLUMN name varchar(255) NOT NULL DEFAULT '';
-- ALTER TABLE users ADD UNIQUE INDEX users_email_unique (email);
