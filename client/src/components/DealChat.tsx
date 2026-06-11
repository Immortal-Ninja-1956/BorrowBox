import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export function DealChat({
  dealId,
  otherPartyName,
}: {
  dealId: number;
  otherPartyName: string;
}) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Poll for new messages every 3 seconds
  const { data: messages, isLoading } = trpc.messages.getByDealId.useQuery(
    { dealId },
    { refetchInterval: 3000 }
  );

  const sendMessageMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      setText("");
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || !user) return;
    sendMessageMutation.mutate({ dealId, text: text.trim() });
  };

  return (
    <div className="flex flex-col h-[500px] bg-card border rounded-lg shadow-sm">
      <div className="p-4 border-b bg-muted/30">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-accent" />
          Chat with {otherPartyName}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-muted-foreground flex-col gap-2">
            <MessageSquare className="w-10 h-10 opacity-20" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderId === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    isMe
                      ? "bg-accent text-accent-foreground rounded-br-none"
                      : "bg-muted text-foreground rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t bg-card">
        <div className="flex gap-2">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-[120px] resize-y"
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!text.trim() || sendMessageMutation.isPending}
            className="h-[44px] w-[44px] shrink-0 rounded-full p-0 flex items-center justify-center bg-accent hover:bg-accent/90"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
