// src/components/PaperFeedback.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import '../styles/PaperFeedback.css';

function PaperFeedback({ paperId, isAuthor }) {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState([]);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('paper_feedback')
          .select(`
            id, 
            content, 
            is_private,
            created_at, 
            updated_at, 
            user_id,
            profiles(id, full_name)
          `)
          .eq('paper_id', paperId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        // Filter feedback based on user role
        const filteredFeedback = isAuthor 
          ? data // Authors can see all feedback
          : data.filter(item => !item.is_private); // Others only see public feedback
          
        setFeedback(filteredFeedback || []);
      } catch (error) {
        console.error('Error fetching feedback:', error);
        setError('Failed to load feedback');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFeedback();
    
    // Set up real-time subscription for feedback
    const subscription = supabase
      .channel(`paper_feedback_${paperId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'paper_feedback',
        filter: `paper_id=eq.${paperId}`
      }, payload => {
        // Refresh feedback on any change
        fetchFeedback();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [paperId, isAuthor]);
  
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('Please sign in to provide feedback');
      return;
    }
    
    if (!feedbackContent.trim()) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('paper_feedback')
        .insert({
          paper_id: paperId,
          user_id: user.id,
          content: feedbackContent.trim(),
          is_private: isPrivate
        })
        .select(`
          id, 
          content, 
          is_private,
          created_at, 
          updated_at, 
          user_id,
          profiles(id, full_name)
        `)
        .single();
        
      if (error) throw error;
      
      // Add to feedback state if it should be visible to the current user
      if (!isPrivate || isAuthor) {
        setFeedback([data, ...feedback]);
      }
      
      setFeedbackContent('');
      setIsPrivate(false);
      setShowFeedbackForm(false);
    } catch (error) {
      console.error('Error adding feedback:', error);
      setError('Failed to add feedback');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleDeleteFeedback = async (feedbackId) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;
    
    try {
      const { error } = await supabase
        .from('paper_feedback')
        .delete()
        .eq('id', feedbackId);
        
      if (error) throw error;
      
      // Remove feedback from state
      setFeedback(feedback.filter(item => item.id !== feedbackId));
    } catch (error) {
      console.error('Error deleting feedback:', error);
      setError('Failed to delete feedback');
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  return (
    <div className="paper-feedback">
      <div className="feedback-header">
        <h2>Feedback ({isAuthor ? feedback.length : feedback.filter(f => !f.is_private).length})</h2>
        
        {user && !showFeedbackForm && (
          <button 
            className="btn primary"
            onClick={() => setShowFeedbackForm(true)}
          >
            Provide Feedback
          </button>
        )}
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {showFeedbackForm && (
        <form onSubmit={handleSubmitFeedback} className="feedback-form">
          <textarea
            value={feedbackContent}
            onChange={(e) => setFeedbackContent(e.target.value)}
            placeholder="Share your feedback on this paper..."
            disabled={submitting}
            rows={4}
          />
          
          <div className="form-options">
            <label className="private-option">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              Make this feedback private (only visible to authors)
            </label>
          </div>
          
          <div className="form-buttons">
            <button 
              type="button" 
              className="btn secondary"
              onClick={() => {
                setShowFeedbackForm(false);
                setFeedbackContent('');
                setIsPrivate(false);
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn primary"
              disabled={submitting || !feedbackContent.trim()}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      )}
      
      {loading ? (
        <div className="loading">Loading feedback...</div>
      ) : feedback.length > 0 ? (
        <div className="feedback-list">
          {feedback.map(item => (
            <div key={item.id} className={`feedback-item ${item.is_private ? 'private' : 'public'}`}>
              <div className="feedback-item-header">
                <div className="feedback-author">{item.profiles?.full_name || 'Anonymous'}</div>
                <div className="feedback-metadata">
                  {item.is_private && <span className="private-badge">Private</span>}
                  <span className="feedback-date">{formatDate(item.created_at)}</span>
                </div>
              </div>
              
              <div className="feedback-content">{item.content}</div>
              
              {user && user.id === item.user_id && (
                <div className="feedback-actions">
                  <button 
                    onClick={() => handleDeleteFeedback(item.id)} 
                    className="btn-link danger"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No feedback has been provided for this paper yet.</p>
          {user && (
            <p>Be the first to share your thoughts by clicking "Provide Feedback" above!</p>
          )}
        </div>
      )}
    </div>
  );
}

export default PaperFeedback;