import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import PaperLikeButton from './PaperLikeButton';
import PaperComments from './PaperComments';
import PaperFeedback from './PaperFeedback';
import SharedLinksManager from './SharedLinksManager';
import '../styles/PaperDetails.css';

function PaperDetailsPage() {
  const { paperId } = useParams();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reviewAssignmentId = searchParams.get('review');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [paper, setPaper] = useState(null);
  const [authors, setAuthors] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isAuthor, setIsAuthor] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [reviewAssignment, setReviewAssignment] = useState(null);
  const [activeTab, setActiveTab] = useState('abstract');
  const [pdfSignedUrl, setPdfSignedUrl] = useState('');
  const [viewLogged, setViewLogged] = useState(false);
const viewTimeoutRef = useRef(null);
  
  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(!!reviewAssignmentId);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  
  useEffect(() => {
    if (activeTab === 'pdf' && paper?.pdf_url) {
      const generateSignedUrl = async () => {
        try {
          const filename = paper.pdf_url.split('/').pop();
          const { data, error } = await supabase.storage
            .from('papers')
            .createSignedUrl(filename, 3600);
          
          if (!error && data?.signedUrl) {
            setPdfSignedUrl(data.signedUrl);
          }
        } catch (err) {
          console.error("Error generating signed URL:", err);
        }
      };
      
      generateSignedUrl();
    }
  }, [activeTab, paper]);

  useEffect(() => {
    const logPaperView = async () => {
      if (paper && !viewLogged) {
        try {
          // Log the view after 5 seconds to ensure it's a meaningful view
          viewTimeoutRef.current = setTimeout(async () => {
            const { error } = await supabase
              .from('paper_views')
              .insert({
                paper_id: paperId,
                user_id: user?.id || null,
                // Note: We're not capturing IP or user agent for privacy reasons
                // in a production environment, you might want to anonymize this data
              });
              
            if (error) {
              console.error('Error logging paper view:', error);
            } else {
              setViewLogged(true);
            }
          }, 5000); // 5 second delay
        } catch (error) {
          console.error('Error setting up view tracking:', error);
        }
      }
      
      return () => {
        if (viewTimeoutRef.current) {
          clearTimeout(viewTimeoutRef.current);
        }
      };
    };
    
    logPaperView();
  }, [paper, paperId, user, viewLogged]);

  useEffect(() => {
    const fetchPaperDetails = async () => {
      try {
        setLoading(true);
        console.log("Fetching details for paper ID:", paperId);
        
        // Get paper details
        const { data: paperData, error: paperError } = await supabase
          .from('papers')
          .select(`
            *,
            categories(id, name)
          `)
          .eq('id', paperId)
          .single();
        
        if (paperError) {
          console.error("Paper fetch error:", paperError);
          throw new Error('Failed to fetch paper details');
        }
        
        console.log("Paper data:", paperData);
        setPaper(paperData);
        
        // Get authors
        const { data: authorData, error: authorError } = await supabase
          .from('paper_authors')
          .select(`
            *,
            profiles(id, full_name, email)
          `)
          .eq('paper_id', paperId);
        
        if (authorError) {
          console.error("Authors fetch error:", authorError);
          throw authorError;
        }
        
        console.log("Author data:", authorData);
        setAuthors(authorData || []);
        
        // Check if current user is an author
        if (user) {
          const authorIds = authorData.map(author => author.author_id);
          setIsAuthor(authorIds.includes(user.id));
          
          // Fetch reviews if user is an author, staff, or reviewer
          if (authorIds.includes(user.id) || userProfile?.user_type === 'staff') {
            const { data: reviewsData, error: reviewsError } = await supabase
              .from('reviews')
              .select(`
                id,
                content,
                rating,
                status,
                created_at,
                reviewer_id,
                profiles(id, full_name)
              `)
              .eq('paper_id', paperId);
            
            if (reviewsError) {
              console.error("Reviews fetch error:", reviewsError);
            } else {
              console.log("Reviews data:", reviewsData);
              setReviews(reviewsData || []);
            }
          }
          
          // Check if user can review this paper
          const { data: assignment, error: assignmentError } = await supabase
            .from('review_assignments')
            .select('*')
            .eq('paper_id', paperId)
            .eq('reviewer_id', user.id)
            .single();
          
          if (!assignmentError && assignment) {
            console.log("Review assignment found:", assignment);
            setCanReview(true);
            setReviewAssignment(assignment);
            
            // If this user has already submitted a review, fetch it
            const { data: existingReview, error: reviewError } = await supabase
              .from('reviews')
              .select('*')
              .eq('paper_id', paperId)
              .eq('reviewer_id', user.id)
              .single();
              
            if (!reviewError && existingReview) {
              console.log("Existing review found:", existingReview);
              setReviewContent(existingReview.content || '');
              setReviewRating(existingReview.rating || 0);
            }
          }
        }
        
      } catch (error) {
        console.error('Error fetching paper details:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (paperId) {
      fetchPaperDetails();
    }
  }, [paperId, user, userProfile]);
  
  const handleSubmitReview = async () => {
    if (!reviewContent.trim()) {
      setError('Please enter your review content');
      return;
    }
    
    try {
      setSubmittingReview(true);
      setError(null);
      
      // Check if this reviewer has already submitted a review
      const { data: existingReview, error: checkError } = await supabase
        .from('reviews')
        .select('id')
        .eq('paper_id', paperId)
        .eq('reviewer_id', user.id)
        .single();
      
      if (!checkError && existingReview) {
        // Update existing review
        const { error: updateError } = await supabase
          .from('reviews')
          .update({
            content: reviewContent,
            rating: reviewRating || null,
            status: 'revised',
            created_at: new Date().toISOString()
          })
          .eq('id', existingReview.id);
        
        if (updateError) throw updateError;
      } else {
        // Insert new review
        const { error: insertError } = await supabase
          .from('reviews')
          .insert([
            {
              paper_id: paperId,
              reviewer_id: user.id,
              content: reviewContent,
              rating: reviewRating || null,
              status: 'submitted'
            }
          ]);
        
        if (insertError) throw insertError;
      }
      
      // Update the review assignment status
      const { error: updateError } = await supabase
        .from('review_assignments')
        .update({ status: 'completed' })
        .eq('id', reviewAssignmentId || reviewAssignment?.id);
      
      if (updateError) throw updateError;
      
      setSuccess('Review submitted successfully');
      setShowReviewForm(false);
      
      // Refresh reviews for authors and staff
      if (isAuthor || userProfile?.user_type === 'staff') {
        const { data: updatedReviews, error: reviewsError } = await supabase
          .from('reviews')
          .select(`
            id,
            content,
            rating,
            status,
            created_at,
            reviewer_id,
            profiles(id, full_name)
          `)
          .eq('paper_id', paperId);
        
        if (!reviewsError) {
          setReviews(updatedReviews || []);
        }
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting review:', error);
      setError('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };
  
  const handleSubmitForReview = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Update paper status to 'submitted'
      const { error } = await supabase
        .from('papers')
        .update({ status: 'submitted' })
        .eq('id', paperId);
      
      if (error) throw error;
      
      // Refresh paper data
      const { data: updatedPaper, error: paperError } = await supabase
        .from('papers')
        .select('*, categories(id, name)')
        .eq('id', paperId)
        .single();
      
      if (paperError) throw paperError;
      
      setPaper(updatedPaper);
      setSuccess('Paper submitted for review successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting paper for review:', error);
      setError('Failed to submit paper for review. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <div className="loading">Loading paper details...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!paper) return <div className="not-found">Paper not found</div>;
  
  return (
    <div className="paper-details-container">
      {success && <div className="success-message">{success}</div>}
      
      <div className="paper-header">
        <h1>{paper.title}</h1>
        <div className="paper-meta">
          <div className="meta-item">
            <strong>Submitted:</strong> {paper.submitted_at ? new Date(paper.submitted_at).toLocaleDateString() : 'Not yet submitted'}
          </div>
          <div className="meta-item">
            <strong>Category:</strong> {paper.categories?.name || 'Uncategorized'}
          </div>
          <div className="meta-item">
            <strong>Status:</strong> <span className={`status-${paper.status}`}>{paper.status}</span>
          </div>
        </div>
        
        <div className="paper-authors">
          {authors.length > 0 ? (
            <div>
              <strong>Authors:</strong> {authors.map((author, index) => (
                <span key={index} className="author-name">
                  {author.profiles?.full_name}
                  {author.is_corresponding && ' (Corresponding)'}
                  {index < authors.length - 1 && ', '}
                </span>
              ))}
            </div>
          ) : (
            <p>No author information available</p>
          )}
        </div>
        
        <div className="paper-actions">
          {/* Add Like button component */}
          {user && <PaperLikeButton paperId={paperId} />}
          
          {paper.pdf_url && (
            <button
              onClick={async () => {
                try {
                  // Extract just the filename from whatever is stored
                  const filename = paper.pdf_url.split('/').pop();
                  console.log("Attempting to get PDF with filename:", filename);
                  
                  // Use the supabase client to get a signed URL
                  const { data, error } = await supabase.storage
                    .from('papers')
                    .createSignedUrl(filename, 60); // 60 seconds expiry
                  
                  if (error) {
                    console.error("Error creating signed URL:", error);
                    alert("Error accessing PDF: " + error.message);
                    return;
                  }
                  
                  if (data?.signedUrl) {
                    console.log("Opening signed URL:", data.signedUrl);
                    window.open(data.signedUrl, '_blank');
                  }
                } catch (err) {
                  console.error("Exception:", err);
                  alert("Error: " + err.message);
                }
              }}
              className="btn primary"
            >
              View PDF
            </button>
          )}
        </div>
      </div>
      
      {/* Content Tabs */}
      <div className="paper-tabs">
        <button 
          className={`tab-button ${activeTab === 'abstract' ? 'active' : ''}`}
          onClick={() => setActiveTab('abstract')}
        >
          Abstract
        </button>
        {paper.pdf_url && (
          <button 
            className={`tab-button ${activeTab === 'pdf' ? 'active' : ''}`}
            onClick={() => setActiveTab('pdf')}
          >
            Full Paper
          </button>
        )}
        <button 
          className={`tab-button ${activeTab === 'discussion' ? 'active' : ''}`}
          onClick={() => setActiveTab('discussion')}
        >
          Discussion
        </button>
        <button 
          className={`tab-button ${activeTab === 'feedback' ? 'active' : ''}`}
          onClick={() => setActiveTab('feedback')}
        >
          Feedback
        </button>
        {(isAuthor || userProfile?.user_type === 'staff') && (
          <button 
            className={`tab-button ${activeTab === 'sharing' ? 'active' : ''}`}
            onClick={() => setActiveTab('sharing')}
          >
            Sharing
          </button>
        )}
        {(isAuthor || userProfile?.user_type === 'staff') && reviews.length > 0 && (
          <button 
            className={`tab-button ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            Reviews ({reviews.length})
          </button>
        )}
      </div>

      
      <div className="paper-content">
        {activeTab === 'abstract' && (
          <div className="paper-section">
            <h2>Abstract</h2>
            <div className="paper-abstract">
              {paper.abstract}
            </div>
            
            {isAuthor && paper.status === 'draft' && (
              <div className="author-actions">
                <h3>Author Actions</h3>
                <button 
                  className="btn primary"
                  onClick={handleSubmitForReview}
                >
                  Submit for Review
                </button>
                <button 
                  className="btn secondary"
                  onClick={() => navigate(`/papers/${paperId}/edit`)}
                >
                  Edit Paper
                </button>
              </div>
            )}
            
            {paper.status === 'rejected' && (
              <div className="paper-status-message">
                <p>This paper was not accepted for publication. Please see reviewer comments for details.</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'pdf' && paper.pdf_url && (
          <div className="paper-section">
            <h2>Full Paper</h2>
            <div className="paper-pdf-container">
              {pdfSignedUrl ? (
                <iframe 
                  src={pdfSignedUrl} 
                  title={paper.title}
                  className="paper-pdf"
                />
              ) : (
                <div className="loading">Loading PDF...</div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'discussion' && (
          <div className="paper-section">
            <PaperComments paperId={paperId} />
          </div>
        )}
        
        {activeTab === 'feedback' && (
          <div className="paper-section">
            <PaperFeedback paperId={paperId} isAuthor={isAuthor} />
          </div>
        )}

        {activeTab === 'sharing' && (isAuthor || userProfile?.user_type === 'staff') && (
          <div className="paper-section">
            <SharedLinksManager paperId={paperId} paperTitle={paper.title} />
          </div>
        )}
        
        {activeTab === 'reviews' && (isAuthor || userProfile?.user_type === 'staff') && (
          <div className="paper-section reviews-section">
            <h2>Reviews ({reviews.length})</h2>
            <div className="reviews-list">
              {reviews.map((review) => (
                <div key={review.id} className="review-item">
                  <div className="review-header">
                    <div className="reviewer-name">{review.profiles?.full_name || 'Anonymous Reviewer'}</div>
                    <div className="review-date">{new Date(review.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="review-content">{review.content}</div>
                  {review.rating && (
                    <div className="review-rating">
                      Rating: <strong>{review.rating} out of 5 stars</strong>
                      <div className="stars-display">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={star <= review.rating ? 'star filled' : 'star'}>
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Peer Review Section - Only visible to assigned reviewers */}
      {canReview && (
        <div className="paper-section review-section">
          <h2>Peer Review</h2>
          {reviewAssignment?.status === 'completed' ? (
            <div className="review-status-message">
              <p>You have already submitted your review for this paper. Thank you for your contribution!</p>
              {/* Option to view or edit submitted review */}
              <button 
                onClick={() => setShowReviewForm(true)} 
                className="btn secondary"
              >
                View/Edit Your Review
              </button>
            </div>
          ) : showReviewForm ? (
            <div className="review-form">
              <div className="form-group">
                <label htmlFor="reviewContent">Your Review:</label>
                <textarea
                  id="reviewContent"
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  rows={10}
                  placeholder="Enter your review here. Consider the paper's methodology, clarity, significance, and relevance."
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="reviewRating">Rating (optional):</label>
                <div className="rating-selector">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`star-button ${star <= reviewRating ? 'active' : ''}`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="rating-text">
                    {reviewRating ? `${reviewRating} out of 5 stars` : 'Select a rating'}
                  </span>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  onClick={() => setShowReviewForm(false)} 
                  className="btn secondary"
                  disabled={submittingReview}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmitReview} 
                  className="btn primary"
                  disabled={submittingReview}
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowReviewForm(true)} className="btn primary">
              Write Review
            </button>
          )}
        </div>
      )}
      
      {/* Staff-only actions */}
      {userProfile?.user_type === 'staff' && (
        <div className="paper-section admin-section">
          <h2>Administrative Actions</h2>
          <div className="admin-actions">
            <Link to={`/papers/${paperId}/assign-reviewers`} className="btn primary">
              Assign Reviewers
            </Link>
            {paper.status === 'under_review' && (
              <>
                <button 
                  className="btn success"
                  onClick={async () => {
                    try {
                      const { error } = await supabase
                        .from('papers')
                        .update({ status: 'published' })
                        .eq('id', paperId);
                        
                      if (error) throw error;
                      
                      // Refresh paper data
                      const { data: updatedPaper } = await supabase
                        .from('papers')
                        .select('*, categories(id, name)')
                        .eq('id', paperId)
                        .single();
                        
                      setPaper(updatedPaper);
                      setSuccess('Paper published successfully');
                    } catch (error) {
                      setError('Failed to publish paper');
                    }
                  }}
                >
                  Approve For Publication
                </button>
                <button 
                  className="btn danger"
                  onClick={async () => {
                    try {
                      const { error } = await supabase
                        .from('papers')
                        .update({ status: 'rejected' })
                        .eq('id', paperId);
                        
                      if (error) throw error;
                      
                      // Refresh paper data
                      const { data: updatedPaper } = await supabase
                        .from('papers')
                        .select('*, categories(id, name)')
                        .eq('id', paperId)
                        .single();
                        
                      setPaper(updatedPaper);
                      setSuccess('Paper rejected');
                    } catch (error) {
                      setError('Failed to reject paper');
                    }
                  }}
                >
                  Reject Paper
                </button>
              </>
            )}
          </div>
        </div>
      )}
      
      <div className="back-link">
        <Link to="/dashboard">← Back to Dashboard</Link>
      </div>
    </div>
  );
}

export default PaperDetailsPage;