// in app/api/generate/route.ts (CORRECTED)

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
// --- STEP 1: Import the shared config INSTEAD of the raw mysql library ---
import { dbConfig, mysql } from '@/lib/db';

// Validation schema
const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
});

// --- STEP 2: REMOVE the old, local dbConfig object ---
// (The bad dbConfig object that was here is now gone)

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export async function POST(request: NextRequest) {
  console.log('Generate API called');
  
  try {
    const body = await request.json();
    console.log('Request body:', body);
    
    // Validate input
    const validatedData = generateSchema.parse(body);
    const { prompt } = validatedData;
    
    console.log('Validated prompt:', prompt);
    
    // Connect to database
    let connection;
    try {
      // This now uses the CORRECT imported dbConfig
      connection = await mysql.createConnection(dbConfig);
      console.log('Database connected successfully');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      // If database connection fails, still try to generate with AI only
      return await generateWithAIOnly(prompt);
    }

    // Query database for context
    const context = await gatherDatabaseContext(connection, prompt);
    console.log('Database context gathered:', context);

    // Close database connection
    await connection.end();

    // Generate enhanced prompt with context
    const enhancedPrompt = constructEnhancedPrompt(prompt, context);
    console.log('Enhanced prompt constructed');

    // Generate description using AI
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(enhancedPrompt);
    const response = await result.response;
    const description = response.text();
    
    console.log('AI generation completed');

    return NextResponse.json({
      description,
      context: context,
    });

  } catch (error) {
    console.error('Generation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate description. Please try again.' },
      { status: 500 }
    );
  }
}

// Keep all the helper functions below (generateWithAIOnly, gatherDatabaseContext, etc.) exactly as they were.
// They don't need to be changed.
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

async function gatherDatabaseContext(connection: mysql.Connection, prompt: string) {
  console.log('Gathering database context for prompt:', prompt);
  
  const context: any = {
    events: [],
    speakers: [],
    sessions: [],
    sponsors: [],
  };

  try {
    // Get recent events
    const [events] = await connection.execute(
      'SELECT * FROM events ORDER BY created_at DESC LIMIT 10'
    );
    context.events = events;
    console.log('Events fetched:', (events as any[]).length);

    // Get speakers
    const [speakers] = await connection.execute(
      'SELECT * FROM speakers ORDER BY created_at DESC LIMIT 20'
    );
    context.speakers = speakers;
    console.log('Speakers fetched:', (speakers as any[]).length);

    // Get sessions
    const [sessions] = await connection.execute(
      'SELECT * FROM sessions ORDER BY created_at DESC LIMIT 30'
    );
    context.sessions = sessions;
    console.log('Sessions fetched:', (sessions as any[]).length);

    // Get sponsors
    const [sponsors] = await connection.execute(
      'SELECT * FROM sponsors ORDER BY created_at DESC LIMIT 15'
    );
    context.sponsors = sponsors;
    console.log('Sponsors fetched:', (sponsors as any[]).length);

  } catch (error) {
    console.error('Error gathering database context:', error);
    // Return empty context if database queries fail
  }

  return context;
}

function constructEnhancedPrompt(userPrompt: string, context: any) {
  console.log('Constructing enhanced prompt with context');
  
  const contextSummary = `
Available Event Data:
- Events: ${context.events?.length || 0} entries
- Speakers: ${context.speakers?.length || 0} entries  
- Sessions: ${context.sessions?.length || 0} entries
- Sponsors: ${context.sponsors?.length || 0} entries

Recent Events: ${context.events?.slice(0, 3).map((e: any) => `${e.title} (${e.type})`).join(', ') || 'None'}
Featured Speakers: ${context.speakers?.slice(0, 5).map((s: any) => `${s.name} - ${s.bio.substring(0,20)}...`).join(', ') || 'None'}
`;

  return `You are an expert event copywriter with access to a comprehensive event database. 
  
User Request: "${userPrompt}"

Context from Database:
${contextSummary}

Based on the user's request and the available data context, create a compelling, professional event description that:

1. Incorporates relevant information from the database context when applicable
2. Maintains a professional, engaging tone
3. Is 150-300 words in length
4. Includes key event highlights and value propositions
5. Has a clear call-to-action
6. Is suitable for marketing materials and promotional content

If the user's request doesn't match existing data, create a compelling description based on the prompt while maintaining consistency with the types of events and speakers in the database.

Provide only the event description without any additional formatting, explanations, or metadata.`;
}