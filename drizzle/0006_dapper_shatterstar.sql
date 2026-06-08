ALTER TABLE `users` ADD `whatsappVerified` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `whatsappOtp` varchar(6);--> statement-breakpoint
ALTER TABLE `users` ADD `whatsappOtpExpiresAt` timestamp;