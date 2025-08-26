// in app/api/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateEventDescription } from '@/lib/eventGenerator';

const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
});

export async function POST(req: NextRequest) {
  try {
    const { prompt } = generateSchema.parse(await req.json());
    console.log(`API route received request to enhance prompt: "${prompt}"`);

    // Call the service function to do all the heavy lifting.
    const result = await generateEventDescription(prompt);
    
    // If we get here, it was a success.
    return NextResponse.json(result);

  } catch (error: any) {
    // This 'catch' block will now catch any failure from the enhancement service.
    console.error('An error occurred in the generate API route:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input: Please provide a prompt.' }, { status: 400 });
    }

    // Return a user-friendly error message that includes the reason for failure.
    return NextResponse.json(
      { error: `Failed to generate description. Reason: ${error.message}` },
      { status: 500 }
    );
  }
}