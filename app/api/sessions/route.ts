// in app/api/sessions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConfig, mysql } from '@/lib/db'; // <-- Step 1: Import shared config

// Validation schema for creating a session
const sessionSchema = z.object({
  title: z.string().min(1, { message: 'Session title is required' }),
  description: z.string().optional().or(z.literal('')),
  // Expect a full ISO date-time string from the client (e.g., "2025-07-15T09:00:00")
  start_time: z.string().datetime({ message: 'Invalid start time format. Expected ISO 8601 format.' }),
  end_time: z.string().datetime({ message: 'Invalid end time format. Expected ISO 8601 format.' }),
  room: z.string().optional().or(z.literal('')),
  event_id: z.number().int().positive({ message: 'A valid event ID is required' }),
  // speaker_id can be optional (e.g., for a lunch break)
  speaker_id: z.number().int().positive().optional().nullable(),
});

// --- REMOVED THE LOCAL dbConfig OBJECT FROM HERE ---

export async function GET() {
  console.log('GET /api/sessions called');
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Corrected SQL to select correct column names and join speaker info
    const [rows] = await connection.execute(`
      SELECT 
        s.id,
        s.title,
        s.description,
        s.start_time,
        s.end_time,
        s.room,
        s.event_id,
        s.speaker_id,
        e.title AS event_title,
        sp.name AS speaker_name
      FROM sessions s
      LEFT JOIN events e ON s.event_id = e.id
      LEFT JOIN speakers sp ON s.speaker_id = sp.id
      ORDER BY s.start_time ASC
    `);
    
    return NextResponse.json(rows);
    
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching sessions.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function POST(request: NextRequest) {
  console.log('POST /api/sessions called');
  let connection;

  try {
    const body = await request.json();
    
    // Validate the incoming data
    const validatedData = sessionSchema.parse(body);
    
    connection = await mysql.createConnection(dbConfig);
    
    const sql = 'INSERT INTO sessions (title, description, start_time, end_time, room, event_id, speaker_id) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const values = [
      validatedData.title,
      validatedData.description || null,
      validatedData.start_time, // This is now a full DATETIME string
      validatedData.end_time,   // This is now a full DATETIME string
      validatedData.room || null,
      validatedData.event_id,
      validatedData.speaker_id || null, // Handle optional speaker
    ];

    const [result] = await connection.execute(sql, values);
    
    const insertId = (result as any).insertId;
    console.log(`Session created successfully with ID: ${insertId}`);
    
    return NextResponse.json({ 
      message: 'Session created successfully',
      sessionId: insertId 
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
    console.error('Error creating session:', error);
    return NextResponse.json(
      { message: 'An error occurred while creating the session.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}