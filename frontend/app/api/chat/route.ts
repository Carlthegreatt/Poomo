import { postChat } from "@/lib/server/chat/handleChatPost";

export async function POST(req: Request) {
  return postChat(req);
}
