import { ChatPageView } from "@/components/ai/ChatPageView";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Assistant",
};

export default function ChatPage() {
  return <ChatPageView />;
}
