// in app/api/events/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConfig, mysql } from '@/lib/db'; // <-- Step 1: Import shared config

// Validation schema that matches our final database schema
const eventSchema = z.object({
  title: z.string().min(1, { message: 'Event title is required' }),
  event_date: z.string().datetime({ message: 'A valid event date is required' }),
  location: z.string().min(1, { message: 'Location is required' }),
  organizer: z.string().optional().or(z.literal('')),
  user_id: z.number().int().positive({ message: 'A valid user ID is required' }),
});

// --- REMOVED THE FLAWED initializeDatabase() FUNCTION AND LOCAL dbConfig ---

export async function GET() {
  console.log('GET /api/events called');
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    
    // This query counts related items and uses the correct column 'title'
    const [rows] = await connection.execute(`
      SELECT 
        e.id,
        e.title,
        e.event_date,
        e.location,
        e.organizer,
        e.user_id,
        u.username AS user_username,
        COUNT(DISTINCT sp.id) AS speaker_count,
        COUNT(DISTINCT se.id) AS session_count,
        COUNT(DISTINCT so.id) AS sponsor_count
      FROM events e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN speakers sp ON e.id = sp.event_id
      LEFT JOIN sessions se ON e.id = se.event_id
      LEFT JOIN sponsors so ON e.id = so.event_id
      GROUP BY e.id
      ORDER BY e.event_date DESC
    `);
    
    return NextResponse.json(rows);
    
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching events.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function POST(request: NextRequest) {
  console.log('POST /api/events called');
  let connection;

  try {
    const body = await request.json();
    
    const validatedData = eventSchema.parse(body);
    
    connection = await mysql.createConnection(dbConfig);
    
    const sql = 'INSERT INTO events (title, event_date, location, organizer, user_id) VALUES (?, ?, ?, ?, ?)';
    const values = [
      validatedData.title,
      validatedData.event_date,
      validatedData.location,
      validatedData.organizer || null,
      validatedData.user_id,
    ];

    const [result] = await connection.execute(sql, values);
    
    const insertId = (result as any).insertId;
    console.log(`Event created successfully with ID: ${insertId}`);
    
    return NextResponse.json({ 
      message: 'Event created successfully',
      eventId: insertId 
    }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json(
        { message: 'Invalid input data', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    console.error('Error creating event:', error);
    return NextResponse.json(
      { message: 'An error occurred while creating the event.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}