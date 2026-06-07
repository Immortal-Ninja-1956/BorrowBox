// Push notification stub - not used in core flow.
// Wire up Firebase, Twilio, or your own service here if needed.
export async function sendNotification(_userId: number, _message: string): Promise<void> {
  console.log("[Notification] stub called - configure a real provider to send notifications");
}

export async function notifyOwner(data: { title: string; content: string }): Promise<boolean> {
  console.log(`[Notification] Owner notified: ${data.title} - ${data.content}`);
  return true;
}
