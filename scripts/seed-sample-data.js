// // Sample Data Seeder for EventScribe AI
// // Run this script to populate your database with sample data for testing
// // Usage: node scripts/seed-sample-data.js

// const mysql = require('mysql2/promise');

// const dbConfig = {
//   host: process.env.DB_HOST || 'localhost',
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || '',
//   database: process.env.DB_NAME || 'eventscribe',
//   port: parseInt(process.env.DB_PORT || '3306'),
// };

// const sampleEvents = [
//   {
//     name: 'TechCon 2024',
//     type: 'Conference',
//     date: '2024-09-15',
//     location: 'San Francisco Convention Center',
//     description: 'Annual technology conference featuring the latest innovations in AI, cloud computing, and software development.',
//     capacity: 1500,
//     status: 'active'
//   },
//   {
//     name: 'AI Workshop Series',
//     type: 'Workshop',
//     date: '2024-08-20',
//     location: 'Silicon Valley Community Center',
//     description: 'Hands-on workshop series covering machine learning fundamentals and practical AI applications.',
//     capacity: 50,
//     status: 'planning'
//   },
//   {
//     name: 'Startup Pitch Night',
//     type: 'Networking',
//     date: '2024-07-30',
//     location: 'Downtown Startup Hub',
//     description: 'Monthly networking event where early-stage startups pitch their ideas to investors and mentors.',
//     capacity: 200,
//     status: 'completed'
//   }
// ];

// const sampleSpeakers = [
//   {
//     name: 'Dr. Sarah Chen',
//     topic: 'Machine Learning in Healthcare',
//     bio: 'Leading AI researcher with 15+ years experience in healthcare applications.',
//     company: 'MedTech AI Labs'
//   },
//   {
//     name: 'Marcus Rodriguez',
//     topic: 'Cloud Architecture Best Practices',
//     bio: 'Senior Cloud Architect specializing in scalable distributed systems.',
//     company: 'CloudScale Solutions'
//   },
//   {
//     name: 'Emma Thompson',
//     topic: 'Startup Funding Strategies',
//     bio: 'Serial entrepreneur and angel investor with multiple successful exits.',
//     company: 'Venture Partners'
//   },
//   {
//     name: 'Alex Kim',
//     topic: 'Full-Stack Development Trends',
//     bio: 'Full-stack developer and tech blogger covering modern web technologies.',
//     company: 'DevCorp Inc'
//   }
// ];

// const sampleSessions = [
//   {
//     title: 'Introduction to Neural Networks',
//     description: 'Comprehensive overview of neural network architectures and applications.',
//     start_time: '09:00',
//     end_time: '10:30',
//     room: 'Main Auditorium'
//   },
//   {
//     title: 'Building Scalable APIs',
//     description: 'Best practices for designing and implementing scalable REST APIs.',
//     start_time: '11:00',
//     end_time: '12:30',
//     room: 'Conference Room A'
//   },
//   {
//     title: 'Pitch Workshop',
//     description: 'Interactive workshop on crafting compelling startup pitches.',
//     start_time: '14:00',
//     end_time: '16:00',
//     room: 'Workshop Space'
//   }
// ];

// const sampleSponsors = [
//   {
//     name: 'TechCorp Solutions',
//     tier: 'platinum',
//     website: 'https://techcorp.example.com'
//   },
//   {
//     name: 'InnovateLabs',
//     tier: 'gold',
//     website: 'https://innovatelabs.example.com'
//   },
//   {
//     name: 'StartupAccelerator',
//     tier: 'silver',
//     website: 'https://startupaccelerator.example.com'
//   },
//   {
//     name: 'DevTools Inc',
//     tier: 'bronze',
//     website: 'https://devtools.example.com'
//   }
// ];

// async function seedDatabase() {
//   console.log('🌱 Starting database seeding process...');
  
//   try {
//     const connection = await mysql.createConnection(dbConfig);
//     console.log('✅ Connected to database');

//     // Clear existing data
//     console.log('🧹 Clearing existing data...');
//     await connection.execute('DELETE FROM sessions');
//     await connection.execute('DELETE FROM speakers');
//     await connection.execute('DELETE FROM sponsors');
//     await connection.execute('DELETE FROM events');

//     // Insert events
//     console.log('📅 Inserting sample events...');
//     const eventIds = [];
//     for (const event of sampleEvents) {
//       const [result] = await connection.execute(
//         'INSERT INTO events (name, type, date, location, description, capacity, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
//         [event.name, event.type, event.date, event.location, event.description, event.capacity, event.status]
//       );
//       eventIds.push(result.insertId);
//     }

//     // Insert speakers
//     console.log('🎤 Inserting sample speakers...');
//     const speakerIds = [];
//     for (let i = 0; i < sampleSpeakers.length; i++) {
//       const speaker = sampleSpeakers[i];
//       const eventId = eventIds[i % eventIds.length]; // Distribute speakers across events
      
//       const [result] = await connection.execute(
//         'INSERT INTO speakers (name, topic, bio, company, event_id) VALUES (?, ?, ?, ?, ?)',
//         [speaker.name, speaker.topic, speaker.bio, speaker.company, eventId]
//       );
//       speakerIds.push(result.insertId);
//     }

//     // Insert sessions
//     console.log('⏰ Inserting sample sessions...');
//     for (let i = 0; i < sampleSessions.length; i++) {
//       const session = sampleSessions[i];
//       const eventId = eventIds[i % eventIds.length];
//       const speakerId = speakerIds[i % speakerIds.length];
      
//       await connection.execute(
//         'INSERT INTO sessions (title, description, start_time, end_time, room, event_id, speaker_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
//         [session.title, session.description, session.start_time, session.end_time, session.room, eventId, speakerId]
//       );
//     }

//     // Insert sponsors
//     console.log('🏆 Inserting sample sponsors...');
//     for (let i = 0; i < sampleSponsors.length; i++) {
//       const sponsor = sampleSponsors[i];
//       const eventId = eventIds[i % eventIds.length];
      
//       await connection.execute(
//         'INSERT INTO sponsors (name, tier, website, event_id) VALUES (?, ?, ?, ?)',
//         [sponsor.name, sponsor.tier, sponsor.website, eventId]
//       );
//     }

//     await connection.end();

//     console.log('🎉 Database seeding completed successfully!');
//     console.log(`📊 Seeded:`);
//     console.log(`   - ${sampleEvents.length} events`);
//     console.log(`   - ${sampleSpeakers.length} speakers`);
//     console.log(`   - ${sampleSessions.length} sessions`);
//     console.log(`   - ${sampleSponsors.length} sponsors`);
//     console.log('');
//     console.log('💡 You can now test the EventScribe AI application with this sample data!');

//   } catch (error) {
//     console.error('❌ Error seeding database:', error);
//     process.exit(1);
//   }
// }

// // Check if running directly
// if (require.main === module) {
//   seedDatabase();
// }

// module.exports = { seedDatabase };