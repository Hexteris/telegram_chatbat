import { NextRequest, NextResponse } from "next/server";

async function sendMessage(chatId: number, text: string) {
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
        }),
      }
    );
  
    if (!response.ok) {
      console.error("Failed to send message to Telegram:", await response.text());
    }
}

export async function POST(request: NextRequest) {
    try {
      const body = await request.json();
  
      // Log the incoming webhook for debugging
      console.log("Received webhook:", JSON.stringify(body, null, 2));
  
      // Handle regular messages
      const message = body.message;
      if (!message) {
        return NextResponse.json({ status: "ok" });
      }
  
      const chatId = message.chat.id;
      const text = message.text;
  
      if (text) {
        if (text === "/start") {
          // Send welcome message
          await sendMessage(chatId, "Welcome! I'm your cross-gen bot.");
        } else {
          // Handle any other text with default response
          await sendMessage(
            chatId,
            "Give me 1 day, and I will speak like ChatGPT"
          );
        }
      }
  
      return NextResponse.json({ status: "ok" });
    } catch (error) {
      console.error("Webhook error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
}

export async function GET() {
    return NextResponse.json({
      message: "Telegram webhook endpoint is running",
      timestamp: new Date().toISOString(),
    });
}
// End of file