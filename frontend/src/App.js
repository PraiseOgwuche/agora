import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import './styles/App.css';
import HomePage from './components/HomePage';
import AboutPage from './components/AboutPage';
import DashboardPage from './components/DashboardPage';
import SubmitPaperPage from './components/SubmitPaperPage';
import PaperDetailsPage from './components/PaperDetailsPage';
import ReviewAssignmentPage from './components/ReviewAssignmentPage';
import ReviewsPage from './components/ReviewsPage';
import Auth from './components/Auth';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Protected route component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  if (!user) {
    return <Navigate to="/auth" />;
  }
  
  return children;
}

// Staff-only route component
function StaffRoute({ children }) {
  const { user, userProfile, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  if (!user) {
    return <Navigate to="/auth" />;
  }
  
  if (userProfile?.user_type !== 'staff') {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
}

function AppContent() {
  const { user, userProfile, signOut } = useAuth();
  
  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <div className="logo">Agora</div>
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About</Link></li>
            {user && (
              <>
                <li><Link to="/dashboard">Dashboard</Link></li>
                <li><Link to="/reviews">My Reviews</Link></li>
                {userProfile?.user_type === 'staff' && (
                  <li><Link to="/admin">Admin</Link></li>
                )}
              </>
            )}
            {user ? (
              <li><button onClick={signOut} className="sign-out-btn">Sign Out</button></li>
            ) : (
              <li><Link to="/auth">Sign In</Link></li>
            )}
          </ul>
        </nav>

        <div className="content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/submit-paper" 
              element={
                <ProtectedRoute>
                  <SubmitPaperPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/papers/:paperId" 
              element={
                <ProtectedRoute>
                  <PaperDetailsPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/reviews" 
              element={
                <ProtectedRoute>
                  <ReviewsPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Staff-only Routes */}
            <Route 
              path="/papers/:paperId/assign-reviewers" 
              element={
                <StaffRoute>
                  <ReviewAssignmentPage />
                </StaffRoute>
              } 
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>

        <footer className="footer">
          <p>© 2025 Agora - All rights reserved</p>
        </footer>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;