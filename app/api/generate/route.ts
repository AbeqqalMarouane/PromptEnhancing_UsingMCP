// in app/api/generate/route.ts
//this code works

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// --- MCP Client Singleton 
let mcpClientInstance: McpClient | null = null;
let mcpInitializationPromise: Promise<McpClient> | null = null;

async function getMcpClient(): Promise<McpClient> {
  if (mcpClientInstance) return mcpClientInstance;
  if (mcpInitializationPromise) return mcpInitializationPromise;
  
  mcpInitializationPromise = new Promise(async (resolve, reject) => {
    try {
      const serverPath = process.env.MCP_SERVER_PROJECT_PATH;
      if (!serverPath) {
        throw new Error("MCP_SERVER_PROJECT_PATH is not set in your .env.local file.");
      }
      console.log("Initializing MCP Client and starting server process...");
      const client = new McpClient({ name: "EventScribeAI-Client", version: "1.0.0" });
      const transport = new StdioClientTransport({ command: "npm", args: ["start"], cwd: serverPath });
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

// --- API Route Logic (NEWEST "Autonomous Agent" Version) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt: userPrompt } = generateSchema.parse(body);

  try {
    const mcpClient = await getMcpClient();

    // --- AGENTIC WORKFLOW START ---

    // FIX #1: Fetch the FULL database schema for much better context.
    console.log("AGENT: Fetching full database schema via MCP resource...");
    const schemaResult = await mcpClient.readResource({ uri: "mysql://schemas" });
    const schemaContent = schemaResult.contents[0];
    if (!schemaContent || !('text' in schemaContent)) {
        throw new Error("AGENT ERROR: Could not fetch a valid text schema from the MCP resource.");
    }
    const dbSchema = schemaContent.text;
    console.log("AGENT: ✅ Full schema fetched.");

    // Step 2: Ask the LLM to generate the SQL queries it needs, with better instructions.
    console.log("AGENT: Asking LLM to generate necessary SQL queries...");
    const queryGenerationModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // FIX #2: A more robust prompt for the AI to ensure it returns valid JSON.
    const promptForSql = `
      You are an expert SQL data analyst AI. Your task is to generate the necessary SQL queries to answer a user's request based on the provided database schema.

      DATABASE SCHEMA:
      \`\`\`sql
      ${dbSchema}
      \`\`\`

      USER REQUEST: "${userPrompt}"

      Based on the user's request and the schema, generate a JSON array of SQL SELECT query strings to fetch all relevant details about the event mentioned. The main event can be found by its title. Use subqueries with the event ID to fetch related data from other tables like speakers and sessions.

      IMPORTANT: Your response MUST be a valid JSON array of strings and nothing else. Do not include any explanatory text, markdown formatting, or anything outside of the JSON array.

      Example of a perfect response for a request about "DevOps Mastring":
      ["SELECT * FROM event_table WHERE title LIKE '%DevOps Mastring%'", "SELECT * FROM speakers_table WHERE event_id IN (SELECT id FROM events_table WHERE title LIKE '%DevOps Mastring%')"]
    `;
    
    const sqlResult = await queryGenerationModel.generateContent(promptForSql);
    const sqlResponseText = sqlResult.response.text().trim();
    
    let queriesToRun: string[] = [];
    try {
        const cleanedResponse = sqlResponseText.replace(/```json|```/g, '').trim();
        queriesToRun = JSON.parse(cleanedResponse);
    } catch (e) {
        console.error("AGENT ERROR: LLM did not return valid JSON for SQL queries. Raw response:", sqlResponseText);
        throw new Error("The AI failed to generate valid SQL queries.");
    }
    console.log(`AGENT: ✅ LLM generated ${queriesToRun.length} queries:`, queriesToRun);

    // Step 3: Execute the LLM-generated queries using the MCP tool.
    console.log("AGENT: Executing generated queries via MCP...");
    const fetchedContext: any = {};
    for (const sql of queriesToRun) {
        if (!sql.trim().toLowerCase().startsWith('select')) {
            console.warn(`AGENT WARNING: LLM tried to generate a non-SELECT query, skipping: ${sql}`);
            continue;
        }
        const queryResult = await mcpClient.callTool({ name: "read_only_query", arguments: { sql } });
        const queryContent = queryResult.content;
        if (!queryResult.isError && Array.isArray(queryContent) && queryContent.length > 0 && queryContent[0].type === 'text') {
            const tableName = sql.toLowerCase().split('from ')[1]?.split(' ')[0] || `query_${Math.random()}`;
            fetchedContext[tableName] = JSON.parse(queryContent[0].text);
        }
    }
    console.log("AGENT: ✅ All data fetched.");

    // Step 4: Generate the final description using the dynamically fetched context.
    const finalPrompt = constructEnhancedPrompt(userPrompt, fetchedContext);
    const finalGenerationModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const finalResult = await finalGenerationModel.generateContent(finalPrompt);
    const description = finalResult.response.text();

    console.log('AI generation completed with DYNAMICALLY fetched MCP context.');
    return NextResponse.json({ description, context: fetchedContext });

  } catch (error) {
    console.error('An error occurred in the generate API route:', error);
    console.warn("Agentic workflow failed. Falling back to AI-only generation.");
    return await generateWithAIOnly(userPrompt);
  }
}

// --- Helper Functions (No changes needed below this line) ---

function constructEnhancedPrompt(userPrompt: string, context: any) {
  console.log('Constructing final prompt with dynamic context');
  let contextSummary = "The following data was retrieved from the database to answer your request:\n";
  for(const key in context) {
      contextSummary += `- Data from table \`${key}\`: ${JSON.stringify(context[key], null, 2)}\n`;
  }
  return `You are an expert event copywriter with access to a comprehensive event database. 
  User Request: "${userPrompt}"
  You have dynamically queried the database and gathered the following context:
  ${contextSummary}
  Based on the user's request and this precise data you retrieved, create a compelling, professional event description that:
  1. Seamlessly incorporates specific, relevant information from the database context.
  2. Maintains a professional, engaging, and persuasive tone suitable for marketing materials.
  3. Is 150-300 words in length.
  4. Highlights the key value propositions and what makes the event unique.
  5. Ends with a clear call-to-action (e.g., "Register now!", "Join us for this unique experience!").
  Provide only the final event description without any additional formatting, explanations, or metadata.`;
}

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