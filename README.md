# Agora - Minerva University Academic Journal Platform

Agora is a modern academic journal platform designed specifically for Minerva University students and faculty. Named after the ancient Greek gathering places for ideas and discourse, Agora serves as a digital commons where the Minerva academic community can share research, provide peer feedback, and engage with scholarly work.

## Project Overview

This platform enables students and faculty to experience the full academic publishing process, from submission to peer review and final publication. Agora is built with a focus on:

- **Academic Excellence**: Professional-grade publishing experience
- **Community Engagement**: Peer review and feedback from the Minerva community
- **Educational Value**: Preparing students for scholarly publication in the wider academic world

## Features

### Core Features

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

5. **Peer Review System**
   - Reviewer assignment workflow
   - Review submission and feedback
   - Review dashboard for papers assigned to reviewers

6. **Paper Status Workflow**
   - Submit for review functionality
   - Paper approval/rejection process
   - Status change notifications

7. **Categories and Search**
   - Category browsing
   - Search functionality with filters
   - Browse papers by discipline

### Community Features

1. **Social Engagement**
   - Like/upvote papers to show appreciation
   - Comment on papers to discuss findings
   - Provide constructive feedback to authors

2. **Notifications**
   - Real-time notifications for likes, comments, and feedback
   - Status change notifications
   - Review assignment notifications

3. **Trending Papers**
   - View most popular papers based on engagement metrics
   - Filter trending papers by category and time period
   - Track view counts for published papers

4. **External Sharing**
   - Generate shareable links for non-Minerva users
   - Control access permissions for shared papers
   - Track views from external sources

### Coming Soon

1. **Personalized Paper Recommendations**
   - Recommendations based on reading history
   - Suggestions based on academic interests
   - Discover related research

2. **Enhanced Search**
   - Full-text search across papers, comments, and feedback
   - Advanced filtering options
   - Sort by relevance, date, or popularity

3. **Analytics Dashboard**
   - Detailed engagement statistics for authors
   - Track views, likes, and comments over time
   - Visualization of paper impact

4. **User Experience Improvements**
   - Optimistic UI updates
   - Improved loading states
   - Animations and transitions

## Tech Stack

- **Frontend**: React.js
- **Backend**: Flask (Python)
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Styling**: Custom CSS with responsive design

## Project Structure

```
agora/
├── backend/
│   ├── app.py               # Main Flask application
│   ├── requirements.txt     # Python dependencies
│   └── ... 
├── frontend/
│   ├── public/              # Static files
│   └── src/
│       ├── components/      # React components
│       │   ├── AboutPage.js
│       │   ├── Auth.js
│       │   ├── CategoriesPage.js
│       │   ├── DashboardPage.js
│       │   ├── HomePage.js
│       │   ├── NotificationsComponent.js
│       │   ├── PaperComments.js
│       │   ├── PaperDetailsPage.js
│       │   ├── PaperFeedback.js
│       │   ├── PaperLikeButton.js
│       │   ├── ReviewAssignmentPage.js
│       │   ├── ReviewsPage.js
│       │   ├── SearchBar.js
│       │   ├── SearchPage.js
│       │   ├── SharedLinksManager.js
│       │   ├── SharedPaperView.js
│       │   ├── SubmitPaperPage.js
│       │   └── TrendingPapers.js
│       ├── contexts/        # React contexts
│       │   └── AuthContext.js
│       ├── styles/          # CSS styles
│       ├── utils/           # Utility functions
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

## Database Schema

The application uses the following main tables:

1. **profiles** - User profiles and information
2. **papers** - Academic papers with metadata
3. **categories** - Research disciplines and categories
4. **paper_authors** - Mapping between papers and authors
5. **paper_likes** - Paper likes/upvotes
6. **paper_comments** - Comments on papers
7. **paper_feedback** - Constructive feedback on papers
8. **paper_views** - View tracking for analytics
9. **paper_shared_links** - External sharing links
10. **reviews** - Peer reviews of papers
11. **review_assignments** - Reviewer assignments
12. **notifications** - User notifications

## Deployment

The application can be deployed using platforms like Vercel (frontend) and Heroku (backend), or any other hosting service that supports React and Flask applications.

## Contributing

This project is currently in development. If you're a Minerva student or faculty member interested in contributing, please contact the project maintainers.

## License

[MIT License](LICENSE)

## Contact

For questions or feedback, please contact [praiseogwuche@minerva.edu](mailto:praiseogwuche@minerva.edu).

---

© 2025 Agora - Minerva University Academic Journal Platform - All rights reserved