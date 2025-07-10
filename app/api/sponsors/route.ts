// in app/api/sponsors/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConfig, mysql } from '@/lib/db';

// CORRECTED: The validation schema is updated.
const sponsorSchema = z.object({
  name: z.string().min(1, { message: 'Sponsor name is required' }),
  tier: z.enum(['platinum', 'gold', 'silver', 'bronze']),
  // logo_url has been removed.
  website: z.string().url({ message: 'Invalid URL format' }).optional().or(z.literal('')), // Website is optional.
  // event_id is now optional to handle the "No event assigned" case.
  event_id: z.number().int().positive().optional().nullable(),
});


export async function GET() {
  console.log('GET /api/sponsors called');
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    
    // CORRECTED: SQL query updated to remove `logo_url` and provide `event_name` for the frontend.
    const [rows] = await connection.execute(`
      SELECT 
        s.id,
        s.name,
        s.tier,
        s.website,
        s.event_id,
        e.title AS event_name 
      FROM sponsors s
      LEFT JOIN events e ON s.event_id = e.id
      ORDER BY s.tier, s.name ASC
    `);
    
    return NextResponse.json(rows);
    
  } catch (error) {
    console.error('Error fetching sponsors:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching sponsors.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function POST(request: NextRequest) {
  console.log('POST /api/sponsors called');
  let connection;

  try {
    const body = await request.json();
    const validatedData = sponsorSchema.parse(body);
    
    connection = await mysql.createConnection(dbConfig);
    
    // CORRECTED: SQL statement and values updated to remove `logo_url`.
    const sql = 'INSERT INTO sponsors (name, tier, website, event_id) VALUES (?, ?, ?, ?)';
    const values = [
      validatedData.name,
      validatedData.tier,
      validatedData.website || null,
      validatedData.event_id || null, // Handles case where no event is assigned.
    ];

    const [result] = await connection.execute(sql, values);
    
    const insertId = (result as any).insertId;
    console.log(`Sponsor created successfully with ID: ${insertId}`);
    
    return NextResponse.json({ 
      message: 'Sponsor created successfully',
      sponsorId: insertId 
    }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json(
        { message: 'Invalid input data', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    console.error('Error creating sponsor:', error);
    return NextResponse.json(
      { message: 'An error occurred while creating the sponsor.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}