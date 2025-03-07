# Agora - Minerva University Academic Journal Platform

Agora is a modern academic journal platform designed specifically for Minerva University students and faculty. Named after the ancient Greek gathering places for ideas and discourse, Agora serves as a digital commons where the Minerva academic community can share research, provide peer feedback, and engage with scholarly work.

## Project Overview

This platform enables students and faculty to experience the full academic publishing process, from submission to peer review and final publication. Agora is built with a focus on:

- **Academic Excellence**: Professional-grade publishing experience
- **Community Engagement**: Peer review and feedback from the Minerva community
- **Educational Value**: Preparing students for scholarly publication in the wider academic world

## Features

### Currently Implemented

1. **User Authentication**
   - Registration and login with email constraints (Minerva domains only)
   - User profile management
   - Role-based access (students vs. staff)

2. **Paper Submission**
   - Submit research papers with title, abstract, and category
   - PDF file upload to secure storage
   - Co-author management
   - Draft paper saving

3. **Dashboard**
   - View your submitted papers
   - Papers listed with status indicators
   - Basic user information display

4. **Paper Details**
   - View paper information (title, abstract, authors)
   - View PDF using secure signed URLs
   - Author actions based on paper status

5. **Backend API**
   - Routes for papers, categories, user data
   - Supabase integration for database and storage
   - Basic security with Row Level Security (RLS) policies

### Coming Soon

1. **Peer Review System**
   - Reviewer assignment workflow
   - Review submission and feedback
   - Review dashboard for papers assigned to reviewers

2. **Paper Status Workflow**
   - Submit for review functionality
   - Paper approval/rejection process
   - Status change notifications

3. **Categories and Search**
   - Category browsing
   - Search functionality
   - Filter papers by various criteria

4. **Community Features**
   - Likes/upvotes for papers
   - Feedback mechanism
   - Comments/discussion section

5. **Access Control for Non-Minervans**
   - Shareable links for external access
   - Restricted access to only shared papers
   - Read-only PDF viewing for external users

## Tech Stack

- **Frontend**: React.js
- **Backend**: Flask (Python)
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **Styling**: Custom CSS with responsive design

## Project Structure

```
agora/
├── backend/
│   ├── app.py               # Main Flask application
│   ├── models/              # Database models
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   └── utils/               # Utility functions
├── frontend/
│   ├── public/              # Static files
│   └── src/
│       ├── components/      # React components
│       ├── contexts/        # React contexts (Auth)
│       ├── styles/          # CSS styles
│       ├── App.js           # Main React component
│       └── index.js         # React entry point
└── README.md                # This file
```

## Setup and Installation

### Prerequisites

- Node.js (>= 14.x)
- Python (>= 3.8)
- Supabase account

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

5. Create a `.env` file with your Supabase credentials:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```

6. Run the Flask server:
   ```
   python app.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with your Supabase credentials:
   ```
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```
   npm start
   ```

5. The application will be available at `http://localhost:3000`

## Database Setup

1. Create the following tables in your Supabase project:
   - profiles
   - papers
   - categories
   - paper_authors
   - figures
   - reviews
   - review_assignments

2. Set up appropriate RLS policies for each table.

## Deployment

The application can be deployed using platforms like Vercel (frontend) and Heroku (backend), or any other hosting service that supports React and Flask applications.

## Contributing

This project is currently in development. If you're a Minerva student or faculty member interested in contributing, please contact the project maintainers.

## License

[MIT License](LICENSE)

## Contact

For questions or feedback, please contact [your-email@minerva.edu](mailto:praiseogwuche@minerva.edu).

---

© 2025 Agora - All rights reserved