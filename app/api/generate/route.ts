// in app/api/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { z } from 'zod';
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// --- MCP Client (STATELESS Production Version) ---
// This function creates a new, fresh client for every API request. This is the
// most reliable pattern for serverless environments and for local Next.js
// development with Fast Refresh, as it prevents session conflicts.
async function getMcpClient(): Promise<McpClient> {
  const serverUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL;
  if (!serverUrl) {
    throw new Error("NEXT_PUBLIC_MCP_SERVER_URL is not set in your .env.local file.");
  }

  const client = new McpClient({ name: "EventScribeAI-Client", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
    fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(30000) }),
  });
  await client.connect(transport);
  
  console.log("✅ New remote MCP Server connection established successfully.");
  
  return client;
}

// --- RECOMMENDED: Retry Helper Function ---
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
    throw new Error("Failed to generate content after multiple retries.");
}

// --- API Route Logic ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt: userPrompt } = generateSchema.parse(body);

  let mcpClient: McpClient | null = null;
  try {
    // A new client is created for every request.
    mcpClient = await getMcpClient();

    // --- AGENTIC WORKFLOW START ---
    console.log("AGENT: Fetching full database schema via MCP resource...");
    const schemaResult = await mcpClient.readResource({ uri: "mysql://schemas" });
    const schemaContent = schemaResult.contents[0];
    if (!schemaContent || !('text' in schemaContent)) {
        throw new Error("AGENT ERROR: Could not fetch a valid text schema from the MCP resource.");
    }
    const dbSchema = schemaContent.text;
    console.log("AGENT: ✅ Full schema fetched.");

    console.log("AGENT: Asking LLM to generate necessary SQL queries...");
    const queryGenerationModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const promptForSql = `
      You are an automated SQL generation bot. Your only purpose is to generate a JSON array of SQL query strings. Do not ask for more information. Do not add any conversational text.

      Input Schema:
      \`\`\`sql
      ${dbSchema}
      \`\`\`

      Input User Request: "${userPrompt}"

      Task: Based on the schema and the user request, generate a JSON array of all SQL SELECT queries needed to gather the relevant information from all the the database tables that have reletion with this relevante information asked by the user.

      Output:
      `;
    
    const sqlResult = await generateContentWithRetry(queryGenerationModel, promptForSql);
    const sqlResponseText = sqlResult.response.text().trim();
    
    let queriesToRun: string[] = [];
    try {
        const cleanedResponse = sqlResponseText.replace(/^```json\s*|```$/g, '').trim();
        queriesToRun = JSON.parse(cleanedResponse);
    } catch (e) {
        console.error("AGENT ERROR: LLM did not return valid JSON for SQL queries. Raw response:", sqlResponseText);
        throw new Error("The AI failed to generate valid SQL queries.");
    }
    console.log(`AGENT: ✅ LLM generated ${queriesToRun.length} queries:`, queriesToRun);

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

    const finalPrompt = constructEnhancedPrompt(userPrompt, fetchedContext);
    const finalGenerationModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const finalResult = await generateContentWithRetry(finalGenerationModel, finalPrompt);
    const description = finalResult.response.text();

    console.log('AI generation completed with DYNAMICALLY fetched MCP context.');
    return NextResponse.json({ description, context: fetchedContext });

  } catch (error) {
    console.error('An error occurred in the generate API route:', error);
    console.warn("Agentic workflow failed. Falling back to AI-only generation.");
    return await generateWithAIOnly(userPrompt);
  } finally {
    // Crucial: We must close the connection after every request.
    if (mcpClient) {
      await mcpClient.close();
      console.log("MCP client connection closed.");
    }
  }
}

// --- Helper Functions (No changes needed) ---
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
      
      const result = await generateContentWithRetry(model, basicPrompt);
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