import { AssistantResponse } from "ai";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

interface AssistantRequest {
  threadId: string | null;
  message: string;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const input: AssistantRequest = await req.json();
    console.log("Received Input:", input); // Log the incoming request

    const threadId =
      input.threadId || (await openai.beta.threads.create({})).id;
    console.log("Created or Retrieved Thread ID:", threadId); // Log the thread ID

    const createdMessage = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: input.message,
    });

    return AssistantResponse(
      { threadId, messageId: createdMessage.id },
      async ({ forwardStream }) => {
        try {
          const runStream = openai.beta.threads.runs.stream(threadId, {
            assistant_id: process.env.ASSISTANT_ID || "",
          });

          let runResult = await forwardStream(runStream);
          console.log("Initial Run Result:", runResult); // Log the run result after the stream starts

          if (
            runResult?.status === "requires_action" &&
            runResult.required_action?.type === "submit_tool_outputs"
          ) {
            const tool_outputs =
              runResult.required_action.submit_tool_outputs.tool_calls.map(
                (toolCall) => {
                  const parameters = JSON.parse(toolCall.function.arguments);
                  console.log(
                    "Tool Call Function:",
                    toolCall.function.name,
                    "Arguments:",
                    parameters
                  ); // Log each tool call
                  return {
                    tool_call_id: toolCall.function.name,
                    output: JSON.stringify(parameters),
                  };
                }
              );
            console.log("Submitting Tool Outputs:", tool_outputs); // Log the tool outputs before submitting
            runResult = await forwardStream(
              openai.beta.threads.runs.submitToolOutputsStream(
                threadId,
                runResult.id,
                { tool_outputs }
              )
            );
          }
        } catch (err) {
          console.error("Error during assistant run:", err);
        }
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500 }
    );
  }
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  data?: Record<string, unknown>;
}

export interface AssistantToolOutput {
  functionName: string;
  arguments: string;
}
