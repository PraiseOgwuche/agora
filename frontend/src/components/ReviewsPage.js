// frontend/src/components/ReviewsPage.js

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Reviews.css';

function ReviewsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignedPapers, setAssignedPapers] = useState([]);
  const [completedReviews, setCompletedReviews] = useState([]);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchReviewAssignments = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch papers assigned to the user for review
        const { data, error } = await supabase
          .from('review_assignments')
          .select(`
            id,
            status,
            assigned_at,
            paper_id,
            papers (
              id,
              title,
              abstract,
              status,
              submitted_at,
              categories (id, name)
            )
          `)
          .eq('reviewer_id', user.id);
          
        if (error) throw error;
        
        // Format the data and split into pending and completed reviews
        const pending = [];
        const completed = [];
        
        data.forEach(assignment => {
          if (assignment.papers) {
            const formattedAssignment = {
              id: assignment.id,
              status: assignment.status,
              assigned_at: assignment.assigned_at,
              paper: {
                id: assignment.papers.id,
                title: assignment.papers.title,
                abstract: assignment.papers.abstract,
                status: assignment.papers.status,
                submitted_at: assignment.papers.submitted_at,
                category: assignment.papers.categories?.name || 'Uncategorized'
              }
            };
            
            if (assignment.status === 'completed') {
              completed.push(formattedAssignment);
            } else {
              pending.push(formattedAssignment);
            }
          }
        });
        
        setAssignedPapers(pending);
        setCompletedReviews(completed);
        
      } catch (error) {
        console.error('Error fetching review assignments:', error);
        setError('Failed to load your review assignments');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReviewAssignments();
  }, [user]);
  
  const startReview = (paperId, assignmentId) => {
    // Navigate to the paper details page with a query parameter to open the review form
    navigate(`/papers/${paperId}?review=${assignmentId}`);
  };
  
  return (
    <div className="reviews-page-container">
      <h1>Papers to Review</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading">Loading your assigned papers...</div>
      ) : (
        <>
          <div className="reviews-section">
            <h2>Pending Reviews <span>{assignedPapers.length}</span></h2>
            {assignedPapers.length > 0 ? (
              <div className="papers-grid">
              {assignedPapers.map((assignment) => (
                <div key={assignment.id} className="paper-card">
                  <div className="paper-header">
                    <h3>{assignment.paper.title}</h3>
                    {assignment.paper.status && (
                      <div className={`paper-status status-${assignment.paper.status}`}>
                        {assignment.paper.status}
                      </div>
                    )}
                  </div>
                  <div className="paper-meta">
                    <span className="category">{assignment.paper.category}</span>
                    <span className="assigned-date">
                      Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="paper-abstract">{assignment.paper.abstract}</p>
                  <div className="paper-footer">
                    <span className={`review-status status-${assignment.status}`}>
                      {assignment.status}
                    </span>
                    <button 
                      className="btn primary"
                      onClick={() => startReview(assignment.paper.id, assignment.id)}
                    >
                      Start Review
                    </button>
                  </div>
                </div>
              ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>You don't have any pending papers to review.</p>
              </div>
            )}
          </div>
          
          {completedReviews.length > 0 && (
            <div className="reviews-section">
              <h2>Completed Reviews <span>{completedReviews.length}</span></h2>
              <div className="papers-grid">
                {completedReviews.map((assignment) => (
                  <div key={assignment.id} className="paper-card completed">
                    <div className="paper-header">
                      <h3>{assignment.paper.title}</h3>
                      {assignment.paper.status && (
                        <div className={`paper-status status-${assignment.paper.status}`}>
                          {assignment.paper.status}
                        </div>
                      )}
                    </div>
                    <div className="paper-meta">
                      <span className="category">{assignment.paper.category}</span>
                      <span className="completed-date">
                        Reviewed: {new Date(assignment.assigned_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="paper-abstract">{assignment.paper.abstract}</p>
                    <div className="paper-footer">
                      <span className="review-status status-completed">Completed</span>
                      <Link to={`/papers/${assignment.paper.id}`} className="btn secondary">
                        View Paper
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      
      <div className="reviews-help">
        <h3>About the Peer Review Process</h3>
        <p>
          As a reviewer, your role is to evaluate papers for scientific merit, methodology, 
          clarity, and relevance. Your constructive feedback helps authors improve their work
          and helps our community maintain high standards.
        </p>
        <p>
          When reviewing a paper, please consider:
        </p>
        <ul>
          <li>Scientific validity and soundness of the methodology</li>
          <li>Clarity and organization of the manuscript</li>
          <li>Significance and novelty of the research</li>
          <li>Appropriate citations and context within relevant literature</li>
        </ul>
        <p>
          Your reviews should be constructive, respectful, and specific enough to help authors 
          improve their work. Thank you for contributing to our academic community!
        </p>
      </div>
    </div>
  );
}

export default ReviewsPage;