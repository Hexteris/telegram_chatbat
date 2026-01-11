import { NextRequest, NextResponse } from "next/server";
import { CohereClientV2 } from 'cohere-ai';

function getCohereClient() {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) {
    throw new Error("COHERE_API_KEY is not set in environment variables");
  }
  return new CohereClientV2({
    token: 'OLE5vCRNWDWv3acFsWhpGvfPmPwoDhAszFVP1s7A',
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
            console.log("Environment check - COHERE_API_KEY exists:", !!process.env.COHERE_API_KEY);
            console.log("Environment check - COHERE_API_KEY length:", process.env.COHERE_API_KEY?.length || 0);
            console.log("Environment check - TELEGRAM_BOT_TOKEN exists:", !!process.env.TELEGRAM_BOT_TOKEN);
            
            if (!process.env.COHERE_API_KEY) {
              console.error("COHERE_API_KEY environment variable is not set");
              throw new Error("COHERE_API_KEY is not set");
            }
            
            console.log("Calling Cohere API with model: command-a-03-2025");
            console.log("User message:", text);
            
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

            console.log("Cohere API response received. Full response:", JSON.stringify(response, null, 2));
            console.log("Response message:", response?.message);

            // Extract text from response.message.content array
            let cohereText = "Sorry, I couldn't generate a response.";
            
            if (!response) {
              console.error("Response is null or undefined");
            } else if (!response.message) {
              console.error("Response.message is missing. Response keys:", Object.keys(response));
            } else if (!response.message.content) {
              console.error("Response.message.content is missing. Message keys:", Object.keys(response.message));
            } else if (Array.isArray(response.message.content)) {
              const textItems = response.message.content.filter((item: any) => item?.type === 'text' && item?.text);
              if (textItems.length > 0) {
                cohereText = textItems.map((item: any) => item.text).join('');
                console.log("Successfully extracted text. Length:", cohereText.length);
              } else {
                console.warn("No text items found in content array:", response.message.content);
              }
            } else if (typeof response.message.content === 'string') {
              // Handle case where content might be a string directly
              cohereText = response.message.content;
              console.log("Content is a string. Length:", cohereText.length);
            } else {
              console.warn("Unexpected content type:", typeof response.message.content, response.message.content);
            }
            
            await sendMessage(chatId, cohereText);
          } catch (error: any) {
            console.error("=== Cohere API Error Details ===");
            console.error("Error name:", error?.name);
            console.error("Error message:", error?.message);
            console.error("Error status code:", error?.statusCode);
            if (error?.statusCode === 401) {
              console.error("Authentication failed - check COHERE_API_KEY");
            }
            if (error?.body) {
              console.error("Error body:", typeof error.body === 'string' ? error.body : JSON.stringify(error.body, null, 2));
            }
            console.error("Full error:", error);
            console.error("=================================");
            
            // Send user-friendly error message (don't expose internal details)
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
