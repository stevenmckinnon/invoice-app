import { ChatContent } from "@/components/ai/ChatContent";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Assistant",
};

export default function ChatPage() {
  return <ChatContent variant="page" />;
}
