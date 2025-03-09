// src/components/PaperLikeButton.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import '../styles/PaperLikeButton.css';

function PaperLikeButton({ paperId }) {
  const { user } = useAuth();
  const [likeCount, setLikeCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchLikes = async () => {
      try {
        const { data, error } = await supabase
          .from('paper_likes')
          .select('id')
          .eq('paper_id', paperId);
        
        if (error) throw error;
        
        setLikeCount(data.length || 0);
        
        // Check if current user liked the paper
        if (user) {
          const { data: userLike, error: userError } = await supabase
            .from('paper_likes')
            .select('id')
            .eq('paper_id', paperId)
            .eq('user_id', user.id)
            .single();
            
          if (!userError && userLike) {
            setUserLiked(true);
          }
        }
      } catch (error) {
        console.error('Error fetching likes:', error);
      }
    };
    
    fetchLikes();
    
    // Set up real-time subscription for likes
    const subscription = supabase
      .channel(`paper_likes_${paperId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'paper_likes',
        filter: `paper_id=eq.${paperId}`
      }, async (payload) => {
        // Refresh the like count
        const { data, error } = await supabase
          .from('paper_likes')
          .select('id')
          .eq('paper_id', paperId);
          
        if (!error) {
          setLikeCount(data.length || 0);
        }
        
        // Update userLiked based on payload
        if (user && payload.eventType === 'INSERT' && payload.new.user_id === user.id) {
          setUserLiked(true);
        } else if (user && payload.eventType === 'DELETE' && payload.old.user_id === user.id) {
          setUserLiked(false);
        }
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [paperId, user]);
  
  const handleLike = async () => {
    if (!user) {
      // Prompt user to sign in
      alert('Please sign in to like papers');
      return;
    }
    
    try {
      setLoading(true);
      
      if (userLiked) {
        // Unlike the paper
        await supabase
          .from('paper_likes')
          .delete()
          .eq('paper_id', paperId)
          .eq('user_id', user.id);
          
        setUserLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        // Like the paper
        await supabase
          .from('paper_likes')
          .insert({
            paper_id: paperId,
            user_id: user.id
          });
          
        setUserLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="paper-like-button">
      <button 
        className={`like-button ${userLiked ? 'liked' : ''}`}
        onClick={handleLike}
        disabled={loading}
      >
        <span className="like-icon">👍</span>
        <span className="like-text">{userLiked ? 'Liked' : 'Like'}</span>
      </button>
      <span className="like-count">{likeCount}</span>
    </div>
  );
}

export default PaperLikeButton;