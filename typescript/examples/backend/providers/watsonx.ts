import "dotenv/config.js";
import { CustomMessage, ToolMessage, UserMessage } from "beeai-framework/backend/message";
import { WatsonxChatModel } from "beeai-framework/adapters/watsonx/backend/chat";
import { ChatModel } from "beeai-framework/backend/chat";
import { AbortError } from "beeai-framework/errors";
import { z } from "zod";
import { OpenMeteoTool } from "beeai-framework/tools/weather/openMeteo";

const llm = new WatsonxChatModel(
  "ibm/granite-3-3-8b-instruct",
  // {
  //   apiKey: "WATSONX_API_KEY",
  //   baseUrl: "WATSONX_BASE_URL",
  //   projectId: "WATSONX_PROJECT_ID",
  // }
);

llm.config({
  parameters: {
    temperature: 0,
    topP: 1,
  },
});

async function watsonxFromName() {
  const watsonxLLM = await ChatModel.fromName("watsonx:ibm/granite-3-3-8b-instruct");
  const response = await watsonxLLM.create({
    messages: [new UserMessage("what states are part of New England?")],
  });
  console.info(response.getTextContent());
}

async function watsonxCustomMessage() {
  const watsonxLLM = await ChatModel.fromName("watsonx:ibm/granite-3-3-8b-instruct");
  const response = await watsonxLLM.create({
    messages: [
      new UserMessage(
        "A farmer has 10 cows, 5 chickens, and 2 horses. If we count all the animals' legs together, how many legs are there in total?",
      ),
      new CustomMessage("control", "thinking"),
    ],
  });
  console.info(response.getTextContent());
}

async function watsonxSync() {
  const response = await llm.create({
    messages: [new UserMessage("what is the capital of Massachusetts?")],
  });
  console.info(response.getTextContent());
}

async function watsonxStream() {
  const response = await llm.create({
    messages: [new UserMessage("How many islands make up the country of Cape Verde?")],
    stream: true,
  });
  console.info(response.getTextContent());
}

async function watsonxAbort() {
  try {
    const response = await llm.create({
      messages: [new UserMessage("What is the smallest of the Cape Verde islands?")],
      stream: true,
      abortSignal: AbortSignal.timeout(5 * 1000),
    });
    console.info(response.getTextContent());
  } catch (err) {
    if (err instanceof AbortError) {
      console.log("Aborted", { err });
    }
  }
}

async function watsonxStructure() {
  const response = await llm.createStructure({
    schema: z.object({
      answer: z.string({ description: "your final answer" }),
    }),
    messages: [new UserMessage("How many islands make up the country of Cape Verde?")],
  });
  console.info(response.object);
}

async function watsonxToolCalling() {
  const currentDate = new Date().toISOString();
  const userMessage = new UserMessage(`What is the current weather (${currentDate}) in Boston?`);
  const weatherTool = new OpenMeteoTool({ retryOptions: { maxRetries: 3 } });
  const response = await llm.create({
    messages: [userMessage],
    tools: [weatherTool],
    toolChoice: weatherTool,
  });
  const toolCallMsg = response.getToolCalls()[0];
  console.debug(JSON.stringify(toolCallMsg));
  const toolResponse = await weatherTool.run(toolCallMsg.args as any);
  const toolResponseMsg = new ToolMessage({
    type: "tool-result",
    result: toolResponse.getTextContent(),
    toolName: toolCallMsg.toolName,
    toolCallId: toolCallMsg.toolCallId,
  });
  console.info(toolResponseMsg.toPlain());
  const finalResponse = await llm.create({
    messages: [userMessage, ...response.messages, toolResponseMsg],
    tools: [],
  });
  console.info(finalResponse.getTextContent());
}

async function watsonxDebug() {
  // Log every request
  llm.emitter.match("*", (value, event) =>
    console.debug(
      `Time: ${event.createdAt.toISOString()}`,
      `Event: ${event.name}`,
      `Data: ${value}`,
    ),
  );

  const response = await llm.create({
    messages: [new UserMessage("Hello world!")],
  });
  console.info(response.messages[0].toPlain());
}

console.info("watsonxFromName".padStart(25, "*"));
await watsonxFromName();
console.info("watsonxCustomMessage".padStart(25, "*"));
await watsonxCustomMessage();
console.info("watsonxSync".padStart(25, "*"));
await watsonxSync();
console.info("watsonxStream".padStart(25, "*"));
await watsonxStream();
console.info("watsonxAbort".padStart(25, "*"));
await watsonxAbort();
console.info("watsonxStructure".padStart(25, "*"));
await watsonxStructure();
console.info("watsonxToolCalling".padStart(25, "*"));
await watsonxToolCalling();
console.info("watsonxDebug".padStart(25, "*"));
await watsonxDebug();
