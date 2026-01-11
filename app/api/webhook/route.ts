import { NextRequest, NextResponse } from "next/server";
import { CohereClientV2 } from 'cohere-ai';

function getCohereClient() {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) {
    throw new Error("COHERE_API_KEY is not set in environment variables");
  }
  return new CohereClientV2({
    token: apiKey,
  });
}


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

      // Handle regular messages
      const message = body.message;
      if (!message) {
        return NextResponse.json({ status: "ok" });
      }

      const chatId = message.chat.id;
      const text = message.text;

      if (text) {
        if (text === "/start") {
          // Send welcome messages
          await sendMessage(chatId, "Welcome! I'm your AI assistant powered by Cohere. How can I help you today?");
        } else {
          // Use Cohere to generate response
          try {
            const cohere = getCohereClient();
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
            
            if (response?.message?.content && Array.isArray(response.message.content)) {
              const textItems = response.message.content.filter((item: any) => item?.type === 'text' && item?.text);
              if (textItems.length > 0) {
                cohereText = textItems.map((item: any) => item.text).join('');
              }
            } else if (typeof response?.message?.content === 'string') {
              cohereText = response.message.content;
            }
            
            await sendMessage(chatId, cohereText);
          } catch (error: any) {
            console.error("Cohere API error:", error?.message || error);
            if (error?.statusCode === 401) {
              console.error("Authentication failed - check COHERE_API_KEY");
            }
            
            // Send user-friendly error message
            await sendMessage(
              chatId,
              "Sorry, I'm having trouble processing your message right now. Please try again later."
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
