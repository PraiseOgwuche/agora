// frontend/src/components/ReviewAssignmentPage.js

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
  const [assigningReviewers, setAssigningReviewers] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
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
        setError(null);
        
        // Fetch paper details
        const { data: paper, error: paperError } = await supabase
          .from('papers')
          .select(`
            id,
            title,
            abstract,
            status,
            submitted_at,
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
            profiles(id, full_name, email, user_type)
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
        
        // Fetch potential reviewers (all users except authors and already assigned reviewers)
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id, full_name, email, user_type')
          .not('id', 'in', `(${authorIds.join(',')})`)
          .order('full_name');
        
        if (usersError) throw usersError;
        
        // Filter out users who are already assigned as reviewers
        const currentReviewerIds = reviewers ? reviewers.map(r => r.reviewer_id) : [];
        const filteredUsers = users.filter(user => !currentReviewerIds.includes(user.id));
        
        setPotentialReviewers(filteredUsers || []);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load paper and reviewer data. Please try again.');
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
      setError('Please select at least one reviewer');
      return;
    }
    
    try {
      setAssigningReviewers(true);
      setError(null);
      
      // Create an array of assignment objects
      const assignments = selectedReviewers.map(reviewerId => ({
        paper_id: paperId,
        reviewer_id: reviewerId,
        status: 'assigned',
        assigned_at: new Date().toISOString()
      }));
      
      // Insert assignments into the database
      const { error: assignmentError } = await supabase
        .from('review_assignments')
        .insert(assignments);
      
      if (assignmentError) throw assignmentError;
      
      // Update paper status if it's not already under review
      if (paper.status === 'submitted' || paper.status === 'draft') {
        const { error: updateError } = await supabase
          .from('papers')
          .update({ status: 'under_review' })
          .eq('id', paperId);
          
        if (updateError) throw updateError;
      }
      
      // Refresh the current reviewers list
      const { data: updatedReviewers, error: refreshError } = await supabase
        .from('review_assignments')
        .select(`
          id,
          reviewer_id,
          status,
          assigned_at,
          profiles(id, full_name, email, user_type)
        `)
        .eq('paper_id', paperId);
      
      if (refreshError) throw refreshError;
      
      setCurrentReviewers(updatedReviewers || []);
      setSelectedReviewers([]);
      setSuccess(`${selectedReviewers.length} reviewer${selectedReviewers.length > 1 ? 's' : ''} assigned successfully`);
      
      // Remove assigned reviewers from potential reviewers
      const updatedPotentialReviewers = potentialReviewers.filter(
        reviewer => !selectedReviewers.includes(reviewer.id)
      );
      setPotentialReviewers(updatedPotentialReviewers);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error assigning reviewers:', error);
      setError('Failed to assign reviewers. Please try again.');
    } finally {
      setAssigningReviewers(false);
    }
  };
  
  const handleRemoveReviewer = async (assignmentId) => {
    try {
      setError(null);
      
      // Get reviewer info before deleting (to add back to potential reviewers)
      const reviewerToRemove = currentReviewers.find(r => r.id === assignmentId);
      
      // Delete the assignment
      const { error } = await supabase
        .from('review_assignments')
        .delete()
        .eq('id', assignmentId);
      
      if (error) throw error;
      
      // Update the current reviewers list
      setCurrentReviewers(currentReviewers.filter(r => r.id !== assignmentId));
      
      // Add the removed reviewer back to potential reviewers
      if (reviewerToRemove) {
        const reviewerProfile = reviewerToRemove.profiles;
        if (reviewerProfile && !potentialReviewers.some(r => r.id === reviewerProfile.id)) {
          setPotentialReviewers([...potentialReviewers, reviewerProfile]);
        }
      }
      
      setSuccess('Reviewer removed successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error removing reviewer:', error);
      setError('Failed to remove reviewer. Please try again.');
    }
  };
  
  const filteredReviewers = potentialReviewers.filter(reviewer => {
    // Filter by search term
    if (searchTerm) {
      return (
        reviewer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reviewer.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return true;
  });
  
  if (loading) return <div className="loading">Loading assignment page...</div>;
  if (!paper) return <div className="not-found">Paper not found</div>;
  
  return (
    <div className="review-assignment-container">
      <div className="page-header">
        <h1>Assign Reviewers</h1>
        <Link to={`/papers/${paperId}`} className="back-link">
          Back to Paper
        </Link>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div className="paper-info">
        <h2>{paper.title}</h2>
        <div className="paper-meta">
          <span className="category">{paper.categories?.name || 'Uncategorized'}</span>
          <span className="status">{paper.status}</span>
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
                    <div className="reviewer-name">{assignment.profiles?.full_name}</div>
                    <div className="reviewer-email">{assignment.profiles?.email}</div>
                    <div className="reviewer-type">{assignment.profiles?.user_type}</div>
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
                disabled={assigningReviewers}
              >
                {assigningReviewers 
                  ? 'Assigning...' 
                  : `Assign ${selectedReviewers.length} Reviewer${selectedReviewers.length !== 1 ? 's' : ''}`
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReviewAssignmentPage;