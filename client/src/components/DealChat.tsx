import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const QUICK_REPLIES = [
  "Is this still available?",
  "Where can we meet on campus?",
  "Is the price negotiable?",
  "I'd like to check it out."
];

export function DealChat({
  dealId,
  otherPartyName,
  dealStatus,
}: {
  dealId: number;
  otherPartyName: string;
  dealStatus?: string;
}) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const isTerminal = dealStatus === "PAID" || dealStatus === "CANCELLED";

  // Poll for new messages with exponential backoff (5s -> 10s -> 30s), disable if terminal
  const { data: messages, isLoading } = trpc.messages.getByDealId.useQuery(
    { dealId },
    { 
      refetchInterval: (query) => {
        if (isTerminal) return false;
        const updates = query.state?.dataUpdateCount ?? 0;
        if (updates <= 5) return 5000;
        if (updates <= 12) return 10000;
        return 30000;
      },
      refetchIntervalInBackground: false
    }
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
    <div className="flex flex-col h-[500px] bg-card border border-border/40 rounded-2xl shadow-xl overflow-hidden">
      <div className="p-4 border-b border-border/40 bg-card/60 backdrop-blur-md">
        <h3 className="font-bold flex items-center gap-2 text-foreground">
          <MessageSquare className="w-5 h-5 text-primary" />
          Chat with {otherPartyName}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-muted/10" ref={scrollRef}>
        {isLoading ? (
          <div className="space-y-4 py-2 animate-pulse">
            <div className="flex flex-col items-start max-w-[70%]">
              <div className="h-9 w-40 bg-muted rounded-2xl rounded-bl-none" />
              <div className="h-3 w-10 bg-muted/40 rounded mt-1.5 ml-1" />
            </div>
            <div className="flex flex-col items-end max-w-[70%] ml-auto">
              <div className="h-9 w-48 bg-muted rounded-2xl rounded-br-none" />
              <div className="h-3 w-10 bg-muted/40 rounded mt-1.5 mr-1" />
            </div>
            <div className="flex flex-col items-start max-w-[70%]">
              <div className="h-9 w-32 bg-muted rounded-2xl rounded-bl-none" />
              <div className="h-3 w-10 bg-muted/40 rounded mt-1.5 ml-1" />
            </div>
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-muted-foreground flex-col gap-2">
            <MessageSquare className="w-10 h-10 opacity-20" />
            <p className="text-sm font-semibold">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderId === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-1 duration-150`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4.5 py-2 text-sm leading-relaxed ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-none shadow-xs shadow-primary/10"
                      : "bg-card border border-border/40 text-foreground rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1.5">
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

      <div className="p-4 border-t border-border/40 bg-card space-y-3.5">
        {/* Quick action reply chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-2 px-2">
          {QUICK_REPLIES.map(reply => (
            <button
              key={reply}
              type="button"
              disabled={sendMessageMutation.isPending}
              onClick={() => {
                sendMessageMutation.mutate({ dealId, text: reply });
              }}
              className="px-3.5 py-1.5 bg-muted/50 hover:bg-primary hover:text-primary-foreground border border-border/40 rounded-full text-xs font-semibold text-foreground whitespace-nowrap transition-all cursor-pointer hover:scale-102"
            >
              {reply}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type a message..."
            aria-label="Message input"
            className="min-h-[44px] max-h-[120px] resize-y bg-card border-border/50 rounded-xl text-sm"
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
            aria-label="Send message"
            className="h-[44px] w-[44px] sm:w-auto sm:px-4 shrink-0 rounded-full sm:rounded-xl p-0 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/15"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Send</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
