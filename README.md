# EventScribe AI 🎯

A sophisticated full-stack web application that generates AI-powered event descriptions using data from your MySQL database. Built with Next.js, TypeScript, Tailwind CSS, and Google's Generative AI.

## ✨ Features

### 🤖 AI-Powered Generation
- Generate compelling event descriptions using Google's Gemini AI
- Context-aware generation using database content
- Smart prompt enhancement with relevant data

### 📚 History Management
- Collapsible sidebar with conversation history
- Local storage persistence
- Click to reload previous generations

### 🗄️ Database Management
- Complete CRUD interface for Events, Speakers, Sessions, and Sponsors
- Intuitive forms with validation
- Relationship management between entities
- Real-time data tables

### 🎨 Modern UI/UX
- Professional design inspired by Linear and Notion
- Responsive layout with Tailwind CSS
- shadcn/ui component library
- Smooth animations and transitions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+
- Google AI API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd eventscribe-ai
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=eventscribe
DB_PORT=3306

# Google AI API Key
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

3. **Create the database:**
```sql
CREATE DATABASE eventscribe;
```

4. **Start the development server:**
```bash
npm run dev
```

5. **Visit the application:**
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 🌱 Seed Sample Data (Optional)

To get started quickly with sample data:

```bash
node scripts/seed-sample-data.js
```

This will populate your database with sample events, speakers, sessions, and sponsors.

## 📖 Usage Guide

### Main Interface
1. **Generate Descriptions:** Enter a prompt describing your event and click "Generate Description"
2. **View History:** Click the hamburger menu to open the history sidebar
3. **Manage Data:** Click "Manage Data" to access the database interface

### Data Management
- **Events Tab:** Add and view events with details like date, location, capacity
- **Speakers Tab:** Manage speakers and link them to events
- **Sessions Tab:** Create sessions with time slots and speaker assignments
- **Sponsors Tab:** Add sponsors with tier levels and event associations

### AI Generation Tips
- Be specific about the type of event (conference, workshop, meetup)
- Mention key topics or themes
- Reference speaker expertise areas
- Include target audience information

## 🏗️ Architecture

### Tech Stack
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Database:** MySQL with mysql2 driver
- **AI:** Google Generative AI (Gemini)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Icons:** Lucide React
- **Validation:** Zod

### Project Structure
```
├── app/
│   ├── api/
│   │   ├── events/route.ts       # Events CRUD API
│   │   ├── speakers/route.ts     # Speakers CRUD API
│   │   ├── sessions/route.ts     # Sessions CRUD API
│   │   ├── sponsors/route.ts     # Sponsors CRUD API
│   │   └── generate/route.ts     # AI generation endpoint
│   ├── manage-data/page.tsx      # Database management UI
│   ├── page.tsx                  # Main application
│   ├── layout.tsx                # App layout
│   └── globals.css               # Global styles
├── components/ui/                # shadcn/ui components
├── scripts/
│   └── seed-sample-data.js       # Sample data seeder
└── README.md
```

### Database Schema
- **events:** Core event information
- **speakers:** Speaker profiles linked to events
- **sessions:** Time-slotted sessions with speaker assignments
- **sponsors:** Event sponsors with tier levels

## 🔧 Configuration

### Environment Variables
All configuration is managed through environment variables. See `.env.example` for the complete list.

### Database Auto-Initialization
The application automatically creates database tables on first run. No manual schema setup required!

### AI Model Configuration
Currently uses Google's Gemini 1.5 Flash model. You can modify the model in `app/api/generate/route.ts`.

## 🚨 Troubleshooting

### Common Issues

**Database Connection Failed:**
- Verify MySQL is running
- Check database credentials in `.env.local`
- Ensure the database exists

**AI Generation Not Working:**
- Verify your Google AI API key is valid
- Check API quota limits
- Review server logs for detailed errors

**UI Components Not Loading:**
- Run `npm install` to ensure all dependencies are installed
- Check for TypeScript errors with `npm run build`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request with a clear description

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Google AI](https://ai.google.dev/) for the powerful Gemini API
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first styling
- [Next.js](https://nextjs.org/) for the amazing React framework

---

Built with ❤️ using EventScribe AI