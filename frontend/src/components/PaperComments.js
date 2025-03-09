// src/components/PaperComments.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import '../styles/PaperComments.css';

function PaperComments({ paperId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');
  
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('paper_comments')
          .select(`
            id, 
            content, 
            created_at, 
            updated_at, 
            user_id, 
            parent_id,
            profiles(id, full_name)
          `)
          .eq('paper_id', paperId)
          .order('created_at');
          
        if (error) throw error;
        
        setComments(data || []);
      } catch (error) {
        console.error('Error fetching comments:', error);
        setError('Failed to load comments');
      } finally {
        setLoading(false);
      }
    };
    
    fetchComments();
    
    // Set up real-time subscription for comments
    const subscription = supabase
      .channel(`paper_comments_${paperId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'paper_comments',
        filter: `paper_id=eq.${paperId}`
      }, payload => {
        // Refresh comments on any change
        fetchComments();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [paperId]);
  
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('Please sign in to comment');
      return;
    }
    
    if (!newComment.trim()) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('paper_comments')
        .insert({
          paper_id: paperId,
          user_id: user.id,
          content: newComment.trim()
        })
        .select(`
          id, 
          content, 
          created_at, 
          updated_at, 
          user_id, 
          parent_id,
          profiles(id, full_name)
        `)
        .single();
        
      if (error) throw error;
      
      setComments([...comments, data]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      setError('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleEditComment = async (commentId) => {
    if (!editContent.trim()) return;
    
    try {
      setSubmitting(true);
      
      const { error } = await supabase
        .from('paper_comments')
        .update({ content: editContent.trim() })
        .eq('id', commentId);
        
      if (error) throw error;
      
      // Update comment in state
      setComments(comments.map(comment => 
        comment.id === commentId 
          ? { ...comment, content: editContent.trim(), updated_at: new Date().toISOString() } 
          : comment
      ));
      
      setEditingComment(null);
      setEditContent('');
    } catch (error) {
      console.error('Error updating comment:', error);
      setError('Failed to update comment');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      const { error } = await supabase
        .from('paper_comments')
        .delete()
        .eq('id', commentId);
        
      if (error) throw error;
      
      // Remove comment from state
      setComments(comments.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      setError('Failed to delete comment');
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  return (
    <div className="paper-comments">
      <h2>Discussion ({comments.length})</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmitComment} className="comment-form">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add your comment..."
          disabled={!user || submitting}
          rows={3}
        />
        <button 
          type="submit" 
          className="btn primary" 
          disabled={!user || submitting || !newComment.trim()}
        >
          {submitting ? 'Submitting...' : 'Post Comment'}
        </button>
      </form>
      
      {loading ? (
        <div className="loading">Loading comments...</div>
      ) : comments.length > 0 ? (
        <div className="comments-list">
          {comments.map(comment => (
            <div key={comment.id} className="comment-item">
              <div className="comment-header">
                <div className="comment-author">{comment.profiles?.full_name || 'Anonymous'}</div>
                <div className="comment-date">
                  {comment.updated_at !== comment.created_at 
                    ? `Updated: ${formatDate(comment.updated_at)}` 
                    : formatDate(comment.created_at)
                  }
                </div>
              </div>
              
              {editingComment === comment.id ? (
                <div className="comment-edit">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                  />
                  <div className="comment-actions">
                    <button 
                      onClick={() => setEditingComment(null)} 
                      className="btn secondary"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleEditComment(comment.id)} 
                      className="btn primary"
                      disabled={submitting || !editContent.trim()}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="comment-content">{comment.content}</div>
                  
                  {user && user.id === comment.user_id && (
                    <div className="comment-actions">
                      <button 
                        onClick={() => {
                          setEditingComment(comment.id);
                          setEditContent(comment.content);
                        }} 
                        className="btn-link"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteComment(comment.id)} 
                        className="btn-link danger"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No comments yet. Be the first to start the discussion!</p>
        </div>
      )}
    </div>
  );
}

export default PaperComments;