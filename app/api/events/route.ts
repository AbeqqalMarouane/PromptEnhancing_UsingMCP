// app/api/events/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConfig, mysql } from '@/lib/db';

// CORRECTED: This schema is now simplified. 'capacity' and 'status' have been removed.
const eventFormSchema = z.object({
  name: z.string().min(1, 'Event Name is required'),
  type: z.string().min(1, 'Event Type is required'),
  date: z.string().min(1, 'Date is required'),
  location: z.string().min(1, 'Location is required'),
  description: z.string().optional(),
});


export async function GET() {
  console.log('GET /api/events called');
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    
    // The query now uses `e.event_type` as corrected previously.
    const [rows] = await connection.execute(`
      SELECT 
        id,
        title AS name,
        event_date AS date,
        location,
        event_type AS type
      FROM events
      ORDER BY event_date DESC
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
    
    // Validate using the new, simpler schema.
    const validatedData = eventFormSchema.parse(body);
    
    connection = await mysql.createConnection(dbConfig);
    
    // The SQL statement uses the new `event_type` and `description` columns.
    const sql = `
      INSERT INTO events (title, event_date, location, event_type, description, user_id) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
      validatedData.name,
      validatedData.date,
      validatedData.location,
      validatedData.type,
      validatedData.description || null,
      1, // Hardcoding user_id to 1.
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
      console.error('Validation error:', error.flatten().fieldErrors);
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