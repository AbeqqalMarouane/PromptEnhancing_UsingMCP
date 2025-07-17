// in app/api/generate/route.ts

// This import is correct for a Next.js API route. If your editor still shows
// an error here, it's likely an environment issue. Try these steps:
// 1. Run `npm install` to ensure all dependencies are present.
// 2. Restart your code editor (like VS Code) to let the TypeScript server refresh.
import { NextRequest, NextResponse } from 'next/server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// --- MCP Client Singleton ---
// This pattern is crucial for performance. It ensures we only start and 
// connect to the MCP server process once, reusing the connection for 
// all subsequent API requests while the app is running.
let mcpClientInstance: McpClient | null = null;
let mcpInitializationPromise: Promise<McpClient> | null = null;

async function getMcpClient(): Promise<McpClient> {
  if (mcpClientInstance) {
    return mcpClientInstance;
  }
  if (mcpInitializationPromise) {
    return mcpInitializationPromise;
  }
  mcpInitializationPromise = new Promise(async (resolve, reject) => {
    try {
      const serverPath = process.env.MCP_SERVER_PROJECT_PATH;
      if (!serverPath) {
        throw new Error("MCP_SERVER_PROJECT_PATH is not set in your .env.local file. Please add the absolute path to your MySQL_MCP_Server project.");
      }
      console.log("Initializing MCP Client and starting server process...");
      const client = new McpClient({
        name: "EventScribeAI-Client",
        version: "1.0.0",
      });
      const transport = new StdioClientTransport({
        command: "npm",
        args: ["start"],
        cwd: serverPath,
      });
      await client.connect(transport);
      console.log("✅ MCP Server connected successfully.");
      mcpClientInstance = client;
      resolve(client);
    } catch (error) {
      mcpInitializationPromise = null;
      reject(error);
    }
  });
  return mcpInitializationPromise;
}

// --- API Route Logic ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = generateSchema.parse(body);
    const mcpClient = await getMcpClient();
    const eventName = await findTargetEvent(mcpClient, prompt);
    if (!eventName) {
      console.warn("Could not identify a matching event. Falling back to AI-only generation.");
      return await generateWithAIOnly(prompt);
    }
    const context = await fetchEventContext(mcpClient, eventName);
    const enhancedPrompt = constructEnhancedPrompt(prompt, context);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(enhancedPrompt);
    const description = result.response.text();
    console.log('AI generation completed with rich MCP context.');
    return NextResponse.json({ description, context });
  } catch (error) {
    console.error('An error occurred in the generate API route:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to generate description due to an internal error.' }, { status: 500 });
  }
}

// --- Helper Functions (Corrected with More Robust Type Guards) ---

async function findTargetEvent(mcpClient: McpClient, userPrompt: string): Promise<string | null> {
  console.log("🔍 Identifying target event via MCP...");
  const allEventsResult = await mcpClient.callTool({
    name: "read_only_query",
    arguments: { sql: "SELECT title FROM events;" },
  });

  // FIX: This more robust check ensures `content` is an array and its first element is a text block.
  // This resolves the `Element implicitly has an 'any' type` errors.
  const content = allEventsResult.content;
  if (allEventsResult.isError || !Array.isArray(content) || content.length === 0 || content[0].type !== 'text') {
    console.error("MCP Error: Invalid or empty content received when fetching event titles.");
    return null;
  }
  
  const eventData = JSON.parse(content[0].text);
  if (!Array.isArray(eventData)) {
      console.error("MCP Error: Parsed event data is not an array.");
      return null;
  }

  const eventTitles = eventData.map((e: { title: string }) => e.title).join(", ");
  if (!eventTitles) {
      console.warn("No event titles found in the database.");
      return null;
  }
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const promptToFindEvent = `From the user prompt: "${userPrompt}", identify which of the following event titles is the best match. Respond with only the exact event title and nothing else. If no clear match is found, respond with "N/A".\n\nAvailable events: [${eventTitles}]`;
  const result = await model.generateContent(promptToFindEvent);
  const eventName = result.response.text().trim();
  if (eventName === "N/A" || !eventTitles.includes(eventName)) {
      console.log("No specific event matched from user prompt.");
      return null;
  }
  console.log(`🎯 Identified event: ${eventName}`);
  return eventName;
}

async function fetchEventContext(mcpClient: McpClient, eventName: string): Promise<any> {
  console.log(`📚 Fetching full context for "${eventName}" via MCP...`);
  const sanitizedEventName = eventName.replace(/'/g, "''");
  const context: any = {};
  const queries = {
    details: `SELECT * FROM events WHERE title = '${sanitizedEventName}'`,
    speakers: `SELECT * FROM speakers WHERE event_id = (SELECT id FROM events WHERE title = '${sanitizedEventName}')`,
    sessions: `SELECT * FROM sessions WHERE event_id = (SELECT id FROM events WHERE title = '${sanitizedEventName}')`,
    sponsors: `SELECT * FROM sponsors WHERE event_id = (SELECT id FROM events WHERE title = '${sanitizedEventName}')`,
  };

  for (const [key, sql] of Object.entries(queries)) {
    const result = await mcpClient.callTool({ name: "read_only_query", arguments: { sql } });
    
    // FIX: Applying the same robust type guard pattern here.
    const content = result.content;
    if (!result.isError && Array.isArray(content) && content.length > 0 && content[0].type === 'text') {
      context[key] = JSON.parse(content[0].text);
    } else {
      console.warn(`Could not fetch context for "${key}" for event "${eventName}".`);
      context[key] = [];
    }
  }
  console.log("✅ MCP context fetched.");
  return context;
}

// --- Unchanged Helper Functions ---

async function generateWithAIOnly(prompt: string) {
  console.log('Generating with AI only (no database context)');
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const basicPrompt = `You are an expert event copywriter. Create a compelling, professional event description based on this prompt: "${prompt}". 
    The description should be:
    - Engaging and professional
    - 150-300 words
    - Include key event highlights
    - Have a clear call-to-action
    - Be suitable for marketing materials
    Please provide only the event description without any additional formatting or explanations.`;
    const result = await model.generateContent(basicPrompt);
    const response = await result.response;
    const description = response.text();
    return NextResponse.json({
      description,
      context: { message: 'Generated without database context' },
    });
  } catch (error) {
    console.error('AI-only generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate description. Please check your AI API configuration.' },
      { status: 500 }
    );
  }
}

function constructEnhancedPrompt(userPrompt: string, context: any) {
  console.log('Constructing enhanced prompt with context');
  
  // This check is safer now because we initialize keys in fetchEventContext
  const details = context.details?.[0];

  const contextSummary = `
Available Event Data for "${details?.title || userPrompt}":
- Event Details: ${JSON.stringify(details || {}, null, 2)}
- Speakers: ${context.speakers?.length || 0} entries. Examples: ${context.speakers?.slice(0, 3).map((s: any) => s.name).join(', ') || 'None'}
- Sessions: ${context.sessions?.length || 0} entries. Examples: ${context.sessions?.slice(0, 3).map((s: any) => s.title).join(', ') || 'None'}
- Sponsors: ${context.sponsors?.length || 0} entries. Examples: ${context.sponsors?.slice(0, 2).map((s: any) => `${s.name} (${s.tier})`).join(', ') || 'None'}
`;

  return `You are an expert event copywriter with access to a comprehensive event database. 
  User Request: "${userPrompt}"
  Context from Database:
  ${contextSummary}
  Based on the user's request and the detailed database context provided, create a compelling, professional event description that:
  1. Seamlessly incorporates specific information from the database, such as the event's theme, location, date, key speakers, and session topics.
  2. Maintains a professional, engaging, and persuasive tone suitable for marketing materials.
  3. Is 150-300 words in length.
  4. Highlights the key value propositions and what makes this event unique.
  5. Ends with a clear call-to-action (e.g., "Register now!", "Join us for this unique experience!").
  Provide only the final event description without any additional formatting, explanations, or metadata.`;
}