import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import '../styles/ReviewAssignment.css';

function ReviewAssignmentPage() {
  const { paperId } = useParams();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [paper, setPaper] = useState(null);
  const [potentialReviewers, setPotentialReviewers] = useState([]);
  const [currentReviewers, setCurrentReviewers] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Check if user is staff
  useEffect(() => {
    if (userProfile && userProfile.user_type !== 'staff') {
      navigate('/dashboard');
    }
  }, [userProfile, navigate]);
  
  // Fetch paper details and potential reviewers
  useEffect(() => {
    const fetchPaperAndReviewers = async () => {
      try {
        setLoading(true);
        
        // Fetch paper details
        const { data: paper, error: paperError } = await supabase
          .from('papers')
          .select(`
            id,
            title,
            abstract,
            status,
            categories(id, name)
          `)
          .eq('id', paperId)
          .single();
        
        if (paperError) throw paperError;
        setPaper(paper);
        
        // Fetch current reviewers
        const { data: reviewers, error: reviewersError } = await supabase
          .from('review_assignments')
          .select(`
            id,
            reviewer_id,
            status,
            assigned_at,
            profiles(id, full_name, email)
          `)
          .eq('paper_id', paperId);
        
        if (reviewersError) throw reviewersError;
        setCurrentReviewers(reviewers || []);
        
        // Get list of author IDs to exclude them from potential reviewers
        const { data: authors, error: authorsError } = await supabase
          .from('paper_authors')
          .select('author_id')
          .eq('paper_id', paperId);
        
        if (authorsError) throw authorsError;
        
        const authorIds = authors.map(author => author.author_id);
        
        // Fetch potential reviewers (all users except authors)
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id, full_name, email, user_type')
          .not('id', 'in', `(${authorIds.join(',')})`)
          .order('full_name');
        
        if (usersError) throw usersError;
        setPotentialReviewers(users || []);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Error loading review assignment page');
      } finally {
        setLoading(false);
      }
    };
    
    if (paperId) {
      fetchPaperAndReviewers();
    }
  }, [paperId]);
  
  const handleSelectReviewer = (reviewerId) => {
    if (selectedReviewers.includes(reviewerId)) {
      setSelectedReviewers(selectedReviewers.filter(id => id !== reviewerId));
    } else {
      setSelectedReviewers([...selectedReviewers, reviewerId]);
    }
  };
  
  const handleAssignReviewers = async () => {
    if (selectedReviewers.length === 0) {
      alert('Please select at least one reviewer');
      return;
    }
    
    try {
      // Prepare assignments data
      const assignments = selectedReviewers.map(reviewerId => ({
        paper_id: paperId,
        reviewer_id: reviewerId,
        status: 'assigned',
        assigned_at: new Date().toISOString()
      }));
      
      // Insert assignments
      const { error } = await supabase
        .from('review_assignments')
        .insert(assignments);
      
      if (error) throw error;
      
      // Update paper status if not already under review
      if (paper.status === 'submitted') {
        await supabase
          .from('papers')
          .update({ status: 'under_review' })
          .eq('id', paperId);
      }
      
      alert('Reviewers assigned successfully');
      
      // Refresh the current reviewers list
      const { data: updatedReviewers } = await supabase
        .from('review_assignments')
        .select(`
          id,
          reviewer_id,
          status,
          assigned_at,
          profiles(id, full_name, email)
        `)
        .eq('paper_id', paperId);
      
      setCurrentReviewers(updatedReviewers || []);
      setSelectedReviewers([]);
      
    } catch (error) {
      console.error('Error assigning reviewers:', error);
      alert('Failed to assign reviewers');
    }
  };
  
  const handleRemoveReviewer = async (assignmentId) => {
    try {
      const { error } = await supabase
        .from('review_assignments')
        .delete()
        .eq('id', assignmentId);
      
      if (error) throw error;
      
      // Update the current reviewers list
      setCurrentReviewers(currentReviewers.filter(r => r.id !== assignmentId));
      
    } catch (error) {
      console.error('Error removing reviewer:', error);
      alert('Failed to remove reviewer');
    }
  };
  
  const filteredReviewers = potentialReviewers.filter(reviewer => {
    // Exclude users who are already assigned
    const isAlreadyAssigned = currentReviewers.some(
      r => r.reviewer_id === reviewer.id
    );
    
    if (isAlreadyAssigned) return false;
    
    // Filter by search term
    if (searchTerm) {
      return (
        reviewer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reviewer.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return true;
  });
  
  if (loading) return <div className="loading">Loading...</div>;
  if (!paper) return <div className="not-found">Paper not found</div>;
  
  return (
    <div className="review-assignment-container">
      <div className="page-header">
        <h1>Assign Reviewers</h1>
        <Link to={`/papers/${paperId}`} className="back-link">
          Back to Paper
        </Link>
      </div>
      
      <div className="paper-info">
        <h2>{paper.title}</h2>
        <div className="paper-meta">
          <span className="category">{paper.categories.name}</span>
          <span className="status">Status: {paper.status}</span>
        </div>
        <div className="paper-abstract">
          <h3>Abstract</h3>
          <p>{paper.abstract}</p>
        </div>
      </div>
      
      <div className="assignment-sections">
        <div className="current-reviewers">
          <h3>Current Reviewers ({currentReviewers.length})</h3>
          {currentReviewers.length > 0 ? (
            <div className="reviewers-list">
              {currentReviewers.map(assignment => (
                <div key={assignment.id} className="reviewer-item">
                  <div className="reviewer-info">
                    <div className="reviewer-name">{assignment.profiles.full_name}</div>
                    <div className="reviewer-email">{assignment.profiles.email}</div>
                    <div className={`reviewer-status status-${assignment.status}`}>
                      {assignment.status}
                    </div>
                  </div>
                  <div className="reviewer-actions">
                    <button 
                      onClick={() => handleRemoveReviewer(assignment.id)}
                      className="btn danger-outline"
                      disabled={assignment.status !== 'assigned'}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-notice">No reviewers assigned yet</p>
          )}
        </div>
        
        <div className="potential-reviewers">
          <h3>Assign New Reviewers</h3>
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="reviewers-list selectable">
            {filteredReviewers.length > 0 ? (
              filteredReviewers.map(reviewer => (
                <div 
                  key={reviewer.id} 
                  className={`reviewer-item ${selectedReviewers.includes(reviewer.id) ? 'selected' : ''}`}
                  onClick={() => handleSelectReviewer(reviewer.id)}
                >
                  <div className="reviewer-info">
                    <div className="reviewer-name">{reviewer.full_name}</div>
                    <div className="reviewer-email">{reviewer.email}</div>
                    <div className="reviewer-type">{reviewer.user_type}</div>
                  </div>
                  <div className="reviewer-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedReviewers.includes(reviewer.id)}
                      onChange={() => {}} // Handle change in the onClick of the parent div
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-notice">No potential reviewers available</p>
            )}
          </div>
          
          {selectedReviewers.length > 0 && (
            <div className="assignment-actions">
              <button 
                onClick={handleAssignReviewers} 
                className="btn primary"
              >
                Assign {selectedReviewers.length} Reviewer{selectedReviewers.length !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReviewAssignmentPage;