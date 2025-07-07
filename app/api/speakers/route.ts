// in app/api/speakers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConfig, mysql } from '@/lib/db'; // <-- Step 1: Import shared config

// Validation schema for creating a speaker
const speakerSchema = z.object({
  name: z.string().min(1, { message: 'Speaker name is required' }),
  topic: z.string().min(1, { message: 'Topic is required' }),
  bio: z.string().optional().or(z.literal('')),
  company: z.string().optional().or(z.literal('')),
  event_id: z.number().int().positive({ message: 'A valid event ID is required' }),
});

// --- REMOVED THE LOCAL dbConfig OBJECT FROM HERE ---

export async function GET() {
  console.log('GET /api/speakers called');
  let connection;

  try {
    // Use the imported, centralized database configuration
    connection = await mysql.createConnection(dbConfig);
    
    // Corrected SQL to match your database schema (events has 'title')
    const [rows] = await connection.execute(`
      SELECT 
        s.id,
        s.name,
        s.topic,
        s.bio,
        s.company,
        s.event_id,
        e.title AS event_title
      FROM speakers s
      LEFT JOIN events e ON s.event_id = e.id
      ORDER BY s.name ASC
    `);
    
    return NextResponse.json(rows);
    
  } catch (error) {
    console.error('Error fetching speakers:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching speakers.' },
      { status: 500 }
    );
  } finally {
    // Ensure the connection is always closed
    if (connection) {
      await connection.end();
    }
  }
}

export async function POST(request: NextRequest) {
  console.log('POST /api/speakers called');
  let connection;

  try {
    const body = await request.json();
    
    // Validate the incoming data
    const validatedData = speakerSchema.parse(body);
    
    connection = await mysql.createConnection(dbConfig);
    
    const sql = 'INSERT INTO speakers (name, topic, bio, company, event_id) VALUES (?, ?, ?, ?, ?)';
    const values = [
      validatedData.name,
      validatedData.topic,
      validatedData.bio || null,
      validatedData.company || null,
      validatedData.event_id,
    ];

    const [result] = await connection.execute(sql, values);
    
    const insertId = (result as any).insertId;
    console.log(`Speaker created successfully with ID: ${insertId}`);
    
    return NextResponse.json({ 
      message: 'Speaker created successfully',
      speakerId: insertId 
    }, { status: 201 }); // 201 Created
    
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json(
        { message: 'Invalid input data', details: error.flatten().fieldErrors },
        { status: 400 } // 400 Bad Request
      );
    }
    
    // Handle generic server errors
    console.error('Error creating speaker:', error);
    return NextResponse.json(
      { message: 'An error occurred while creating the speaker.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}