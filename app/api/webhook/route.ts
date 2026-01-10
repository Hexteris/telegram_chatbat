import { NextRequest, NextResponse } from "next/server";
import { CohereClientV2 } from 'cohere-ai';

const cohere = new CohereClientV2({
  token: process.env.COHERE_API_KEY || '',
});


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
          // Use Cohere to generate response
          try {
            if (!process.env.COHERE_API_KEY) {
              throw new Error("COHERE_API_KEY is not set");
            }
            
            const response = await cohere.chat({
              model: 'command-a-03-2025',
              messages: [
                {
                  role: 'user',
                  content: text,
                },
              ],
            });

            // Extract text from response.message.content array
            let cohereText = "Sorry, I couldn't generate a response.";
            if (response.message?.content && Array.isArray(response.message.content)) {
              const textContent = response.message.content
                .filter((item: any) => item.type === 'text')
                .map((item: any) => item.text)
                .join('');
              if (textContent) {
                cohereText = textContent;
              }
            }
            
            await sendMessage(chatId, cohereText);
          } catch (error) {
            console.error("Cohere API error:", error);
            await sendMessage(
              chatId,
              "Sorry, I'm having trouble processing your message right now."
            );
          }
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
