// in app/api/sponsors/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConfig, mysql } from '@/lib/db'; // <-- Step 1: Import shared config

// Validation schema for creating a sponsor
const sponsorSchema = z.object({
  name: z.string().min(1, { message: 'Sponsor name is required' }),
  tier: z.enum(['platinum', 'gold', 'silver', 'bronze']),
  logo_url: z.string().url({ message: 'Invalid URL format' }).optional().or(z.literal('')), // Allow empty string
  website: z.string().url({ message: 'Invalid URL format' }).optional().or(z.literal('')), // Allow empty string
  event_id: z.number().int().positive(), // An event ID should be provided
});

// --- REMOVED THE LOCAL dbConfig OBJECT FROM HERE ---

export async function GET() {
  console.log('GET /api/sponsors called');
  let connection;

  try {
    // Use the imported, centralized database configuration
    connection = await mysql.createConnection(dbConfig);
    
    // Corrected SQL to match your database schema (events has 'title', not 'name' or 'type')
    const [rows] = await connection.execute(`
      SELECT 
        s.id,
        s.name,
        s.tier,
        s.logo_url,
        s.website,
        s.event_id,
        e.title AS event_title
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
    // Ensure the connection is always closed, even if an error occurs
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
    
    // Validate the incoming data against the schema
    const validatedData = sponsorSchema.parse(body);
    
    connection = await mysql.createConnection(dbConfig);
    
    const sql = 'INSERT INTO sponsors (name, tier, logo_url, website, event_id) VALUES (?, ?, ?, ?, ?)';
    const values = [
      validatedData.name,
      validatedData.tier,
      validatedData.logo_url || null, // If empty string or undefined, insert NULL
      validatedData.website || null,
      validatedData.event_id,
    ];

    const [result] = await connection.execute(sql, values);
    
    const insertId = (result as any).insertId;
    console.log(`Sponsor created successfully with ID: ${insertId}`);
    
    return NextResponse.json({ 
      message: 'Sponsor created successfully',
      sponsorId: insertId 
    }, { status: 201 }); // 201 Created is the correct status code
    
  } catch (error) {
    // Handle validation errors specifically
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return NextResponse.json(
        { message: 'Invalid input data', details: error.flatten().fieldErrors },
        { status: 400 } // 400 Bad Request
      );
    }
    
    // Handle generic server errors
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