import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import '../styles/Dashboard.css';

function DashboardPage() {
  const { user, userProfile } = useAuth();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPapers = async () => {
      try {
        setLoading(true);
        
        // Get papers authored by the user
        const { data, error } = await supabase
          .from('paper_authors')
          .select(`
            paper_id,
            papers (
              id,
              title,
              abstract,
              status,
              submitted_at,
              updated_at
            )
          `)
          .eq('author_id', user.id);
          
        if (error) throw error;
        
        // Format the papers data
        const formattedPapers = data.map(item => ({
          id: item.paper_id,
          ...item.papers
        }));
        
        setPapers(formattedPapers);
      } catch (error) {
        console.error('Error fetching papers:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchPapers();
    }
  }, [user]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Your Dashboard</h1>
        {userProfile && (
          <p>Welcome, {userProfile.full_name} ({userProfile.user_type})</p>
        )}
      </div>
      
      <div className="dashboard-actions">
        <Link to="/submit-paper" className="btn primary">Submit New Paper</Link>
        <Link to="/profile" className="btn secondary">Edit Profile</Link>
      </div>
      
      <div className="dashboard-section">
        <h2>Your Papers</h2>
        {loading ? (
          <p>Loading your papers...</p>
        ) : papers.length > 0 ? (
          <div className="papers-grid">
            {papers.map(paper => (
              <div key={paper.id} className="paper-card">
                <h3>{paper.title}</h3>
                <p className="paper-status">Status: <span className={`status-${paper.status}`}>{paper.status}</span></p>
                <p className="paper-abstract">{paper.abstract.substring(0, 150)}...</p>
                <div className="paper-footer">
                  <span>Submitted: {new Date(paper.submitted_at).toLocaleDateString()}</span>
                  <Link to={`/papers/${paper.id}`}>View Details</Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>You haven't submitted any papers yet.</p>
            <Link to="/submit-paper" className="btn primary">Submit Your First Paper</Link>
          </div>
        )}
      </div>
      
      <div className="dashboard-section">
        <h2>Papers to Review</h2>
        <p>Coming soon: Papers assigned to you for peer review will appear here.</p>
      </div>
      
      <div className="dashboard-section">
        <h2>Recent Activity</h2>
        <p>Coming soon: Track comments, reviews, and updates on your papers.</p>
      </div>
    </div>
  );
}

export default DashboardPage;