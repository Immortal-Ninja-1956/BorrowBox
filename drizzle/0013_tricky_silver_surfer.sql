ALTER TABLE `users` ADD `isEmailVerified` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `emailOtp` varchar(6);--> statement-breakpoint
ALTER TABLE `users` ADD `emailOtpExpiresAt` timestamp;