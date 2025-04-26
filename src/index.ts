#!/usr/bin/env node

/**
 * This is a template MCP server that implements a tryon system.
 * It demonstrates core MCP concepts like resources and tools by allowing:
 * - Listing clothes as resources
 * - Reading individual clothes
 * - Submitting a tryon task via a tool
 * - Querying a tryon task via a tool
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RestServerTransport } from "@chatmcp/sdk/server/rest.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { HeyBeautyClient } from "./heybeauty.js";
import { getParamValue, getAuthValue } from "@chatmcp/sdk/utils/index.js";

/**
 * Create an MCP server with capabilities for resources (to list/read clothes),
 * prompts (to tryon with user image and cloth image), and tools (to submit a tryon task).
 */
const server = new Server(
  {
    name: "heybeauty-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

const heybeautyApiKey = getParamValue("HEYBEAUTY_API_KEY") || "";

const mode = getParamValue("mode") || "stdio";
const port = getParamValue("port") || 9593;
const endpoint = getParamValue("endpoint") || "/rest";

/**
 * Handler for listing available clothes as resources.
 * Each cloth is exposed as a resource with:
 * - A cloth:// URI scheme
 * - Plain text MIME type
 * - Human readable name and description (now including the cloth title)
 */
server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
  try {
    const apiKey =
      getAuthValue(request, "HEYBEAUTY_API_KEY") || heybeautyApiKey;
    if (!apiKey) {
      throw new Error("HEYBEAUTY_API_KEY is not set");
    }

    const client = new HeyBeautyClient({ apiKey });
    const clothes = await client.getClothes();

    return {
      resources: clothes.map((clothe: any) => ({
        uri: `cloth:///${clothe.cloth_id}`,
        mimeType: "text/plain",
        name: clothe.title,
        description: `${clothe.description}`,
      })),
    };
  } catch (error: any) {
    throw new Error("get resources failed: " + error.message);
  }
});

/**
 * Handler for reading the contents of a specific cloth.
 * Takes a cloth:// URI and returns the cloth content as plain text.
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  try {
    const apiKey =
      getAuthValue(request, "HEYBEAUTY_API_KEY") || heybeautyApiKey;
    if (!apiKey) {
      throw new Error("HEYBEAUTY_API_KEY is not set");
    }

    const url = new URL(request.params.uri);
    const id = url.pathname.replace(/^\//, "");

    const client = new HeyBeautyClient({ apiKey });
    const clothes = await client.getClothes();
    const cloth = clothes.find((clothe: any) => clothe.cloth_id == id);

    if (!cloth) {
      throw new Error(`Cloth ${id} not found`);
    }

    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "text/plain",
          text: cloth.cloth_img_url,
        },
      ],
    };
  } catch (error: any) {
    throw new Error("read resource failed: " + error.message);
  }
});

/**
 * Handler that lists available tools.
 * Exposes a single "submit_tryon_task" tool that lets clients submit a tryon task.
 * Exposes a single "query_tryon_task" tool that lets clients query a tryon task.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "submit_tryon_task",
        description:
          "Submit a tryon task with user image url and cloth image url",
        inputSchema: {
          type: "object",
          properties: {
            user_img_url: {
              type: "string",
              description: "User image url, should be a url of a picture",
            },
            cloth_img_url: {
              type: "string",
              description:
                "Cloth image url, should be a url of a picture, user input or get from the selected cloth resource",
            },
            cloth_id: {
              type: "string",
              description: "Cloth id, get from the selected cloth resource",
            },
            cloth_description: {
              type: "string",
              description:
                "Cloth description, user input or get from the selected cloth resource",
            },
          },
          required: ["user_img_url", "cloth_img_url"],
        },
      },
      {
        name: "query_tryon_task",
        description: "Query a tryon task with task id",
        inputSchema: {
          type: "object",
          properties: {
            task_id: {
              type: "string",
              description: "Task id, get from the submit_tryon_task tool",
            },
          },
          required: ["task_id"],
        },
      },
    ],
  };
});

/**
 * Handler for the submit_tryon_task and query_tryon_task tools.
 * Submits a tryon task with the provided user image url, cloth image url, cloth id and cloth description, and returns success message.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const apiKey =
      getAuthValue(request, "HEYBEAUTY_API_KEY") || heybeautyApiKey;
    if (!apiKey) {
      throw new Error("HEYBEAUTY_API_KEY is not set");
    }

    const client = new HeyBeautyClient({ apiKey });

    switch (request.params.name) {
      case "submit_tryon_task": {
        const user_img_url = String(
          request.params.arguments?.user_img_url || ""
        );
        const cloth_img_url = String(
          request.params.arguments?.cloth_img_url || ""
        );
        const cloth_id = String(request.params.arguments?.cloth_id || "");
        const cloth_description = String(
          request.params.arguments?.cloth_description || ""
        );

        if (!user_img_url) {
          throw new Error("user image is required");
        }

        if (!cloth_img_url) {
          throw new Error("cloth image is required");
        }

        const res = await client.submitTask({
          user_img_url,
          cloth_img_url,
          cloth_id,
          cloth_description,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(res),
            },
          ],
        };
      }

      case "query_tryon_task": {
        const task_id = String(request.params.arguments?.task_id);
        if (!task_id) {
          throw new Error("task id is required");
        }

        const res = await client.queryTask({ task_id });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(res),
            },
          ],
        };
      }

      default:
        throw new Error("Unknown tool");
    }
  } catch (error: any) {
    throw new Error("call tool failed: " + error.message);
  }
});

/**
 * Handler that lists available prompts.
 * Exposes a single "tryon_cloth" prompt that tryon with user uploaded image and cloth image.
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "tryon_cloth",
        description: "Tryon with user image and cloth image",
      },
    ],
  };
});

/**
 * Handler for the tryon_cloth prompt.
 * Returns a prompt that requests tryon with user image and cloth image.
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name !== "tryon_cloth") {
    throw new Error("Unknown prompt");
  }

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `You are a helpful assistant that helps users try on clothes virtually. When a user provides their photo URL and either:
1. A clothing image URL they want to try on, or
2. Selects a clothing item from the available resources

Here's how to handle each case:

1. If the user provides their own clothing image URL:
   - Use the submit_tryon_task tool with:
     - user_img_url: The URL of the user's photo
     - cloth_img_url: The URL of the clothing image provided by the user
   - cloth_id and cloth_description can be left empty

2. If the user selects a clothing item from resources:
   - Use the submit_tryon_task tool with:
     - user_img_url: The URL of the user's photo
     - cloth_img_url: The URL from the selected cloth resource
     - cloth_id: The ID from the selected cloth resource
     - cloth_description: The description from the selected cloth resource

After submitting the task:
- Get the task_id from the response
- Use the query_tryon_task tool every 5 seconds to check the task status
- Continue checking until the task status is either "succeeded" or "failed"
- If successful, display the tryon_img_url in markdown format: ![Try-on Result](tryon_img_url)
- If failed, inform the user about the failure

Throughout the process:
- Keep the user informed about the current status
- Be patient and friendly
- Handle any errors gracefully

Here is the user's photo URL and either their clothing image URL or the selected clothing item:`,
        },
      },
    ],
  };
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  if (mode === "rest") {
    const transport = new RestServerTransport({
      port,
      endpoint,
    });
    await server.connect(transport);

    await transport.startServer();

    return;
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
