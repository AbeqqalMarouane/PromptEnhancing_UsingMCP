// in lib/eventGenerator.ts

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// --- Setup Google Generative AI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// --- Create fresh MCP client ---
async function getMcpClient(): Promise<McpClient> {
  const serverUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL;
  if (!serverUrl) {
    throw new Error("Configuration Error: NEXT_PUBLIC_MCP_SERVER_URL is not set in your .env.local file.");
  }

  const client = new McpClient({ name: "EventScribeAI-Service", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
    fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(30000) }),
  });
  await client.connect(transport);
  return client;
}

// --- Retry helper ---
async function generateContentWithRetry(model: GenerativeModel, prompt: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      return result;
    } catch (error: any) {
      if (error.status === 503 && i < retries - 1) {
        const delay = Math.pow(2, i + 1) * 1000;
        console.warn(`Attempt ${i + 1} failed with 503. Retrying in ${delay / 1000} seconds...`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error("AI content generation failed after multiple retries.");
}

// --- Construct enhanced prompt ---
function constructEnhancedPrompt(userPrompt: string, context: any) {
  let contextSummary = "The following relevant data was retrieved from the database:\n\n";
  let hasContext = false;
  for (const key in context) {
    if (context[key] && Array.isArray(context[key]) && context[key].length > 0) {
      hasContext = true;
      contextSummary += `### Data from table \`${key}\`:\n${JSON.stringify(context[key], null, 2)}\n\n`;
    }
  }

  // If the AI found no relevant data, we should fail clearly.
  if (!hasContext) {
    throw new Error("The AI agent did not find any specific data in the database for your request. Please try a more specific event name or topic.");
  }

  return `
    You are a professional event copywriter. Your task is to write a compelling event description based on structured data.

    **CRITICAL INSTRUCTION:** You MUST use the provided "DATABASE CONTEXT" to write your response. Do not invent details. Your description MUST be based on the data provided below.

    **DATABASE CONTEXT:**
    ${contextSummary}

    **USER REQUEST:** "${userPrompt}"

    **TASK:**
    Using only the data from the DATABASE CONTEXT, write a compelling, professional event description of 150-300 words. Your description must:
    1.  Directly reference specific details from the context, such as the event's title, location, date, key speakers, or session topics.
    2.  Maintain an engaging and persuasive tone.
    3.  End with a clear call-to-action.
    4.  The final output must be ONLY the event description text.
  `;
}

// --- Main reusable function ---
export async function generateEventDescription(userPrompt: string): Promise<{ description: string, context: any }> {
  let mcpClient: McpClient | null = null;
  // This try...finally block ensures the MCP client connection is always closed,
  // even if an error occurs during the workflow.
  try {
    console.log("--- Starting Event Description Workflow ---");
    mcpClient = await getMcpClient();
    console.log("✅ MCP Client connected.");

    // Step 1: Get DB schema
    const schemaResult = await mcpClient.readResource({ uri: "mysql://schemas" });
    const schemaContent = schemaResult.contents[0];
    if (!schemaContent || !('text' in schemaContent)) {
      throw new Error("Could not fetch a valid text schema from the MCP resource.");
    }
    const dbSchema = schemaContent.text;
    console.log("✅ Database schema fetched.");

    // Step 2: Generate SQL queries
    const queryGenModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const sqlPrompt = `
      You are an automated SQL generation bot. Your only purpose is to generate a JSON array of SQL query strings. Do not ask for more information. Do not add any conversational text.

      DATABASE SCHEMA:
      \`\`\`sql
      ${dbSchema}
      \`\`\`

      USER REQUEST: "${userPrompt}"

      Task: Based on the schema and the user request, generate a JSON array of all SQL SELECT queries needed to gather the relevant information from all the database tables that have a relationship with the information asked for by the user (note that the asked title by the user may be just a part of the full title).

      IMPORTANT: Your response MUST be a valid JSON array of strings and nothing else.
    `;
    console.log("🤖 Asking LLM to generate SQL queries...");
    const sqlResult = await generateContentWithRetry(queryGenModel, sqlPrompt);
    const sqlResponse = sqlResult.response.text().trim();
    
    let queries: string[] = [];
    try {
        queries = JSON.parse(sqlResponse.replace(/^```json|```$/g, '').trim());
    } catch (e) {
        console.error("RAW LLM Response for SQL:", sqlResponse);
        throw new Error("AI failed to generate valid JSON for SQL queries.");
    }
    console.log(`✅ LLM generated ${queries.length} queries.`);

    // Step 3: Run queries
    const fetchedContext: any = {};
    console.log("Executing generated queries via MCP...");
    for (const sql of queries) {
      if (!sql.toLowerCase().startsWith("select")) {
        console.warn(`Skipping non-SELECT query generated by AI: ${sql}`);
        continue;
      }
      const result = await mcpClient.callTool({ name: "read_only_query", arguments: { sql } });
      if (!result.isError && Array.isArray(result.content) && result.content[0]?.type === "text") {
        const tableName = sql.toLowerCase().split("from ")[1]?.split(" ")[0] || "unknown_table";
        fetchedContext[tableName] = JSON.parse(result.content[0].text);
      }
    }
    console.log("✅ All context data fetched.");

    // Step 4: Final description
    const finalPrompt = constructEnhancedPrompt(userPrompt, fetchedContext);
    const finalModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("🤖 Generating final description...");
    const finalResult = await generateContentWithRetry(finalModel, finalPrompt);
    console.log("✅ Final description generated.");

    return {
      description: finalResult.response.text(),
      context: fetchedContext
    };

  } finally {
    if (mcpClient) {
      await mcpClient.close();
      console.log("MCP client connection closed.");
    }
  }
}