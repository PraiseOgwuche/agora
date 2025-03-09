// src/components/SharedLinksManager.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import '../styles/SharedLinksManager.css';

function SharedLinksManager({ paperId, paperTitle }) {
  const { user } = useAuth();
  const [sharedLinks, setSharedLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form state for creating new links
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expiresDays, setExpiresDays] = useState(30);
  const [allowComments, setAllowComments] = useState(false);
  const [allowDownload, setAllowDownload] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Load shared links
  useEffect(() => {
    const fetchSharedLinks = async () => {
      if (!user || !paperId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('paper_shared_links')
          .select('*')
          .eq('paper_id', paperId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setSharedLinks(data || []);
      } catch (error) {
        console.error('Error fetching shared links:', error);
        setError('Failed to load shared links');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSharedLinks();
  }, [paperId, user]);
  
  // Create a new shared link
  const handleCreateLink = async (e) => {
    e.preventDefault();
    
    if (!user || !paperId) return;
    
    try {
      setCreating(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('paper_shared_links')
        .insert([{
          paper_id: paperId,
          created_by: user.id,
          access_key: generateRandomKey(),
          expires_at: expiresDays ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString() : null,
          allow_comments: allowComments,
          allow_download: allowDownload
        }])
        .select();
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        setSharedLinks([data[0], ...sharedLinks]);
        setShowCreateForm(false);
        // Reset form
        setExpiresDays(30);
        setAllowComments(false);
        setAllowDownload(true);
      }
    } catch (error) {
      console.error('Error creating shared link:', error);
      setError('Failed to create shared link');
    } finally {
      setCreating(false);
    }
  };
  
  // Delete a shared link
  const handleDeleteLink = async (linkId) => {
    if (!window.confirm('Are you sure you want to delete this shared link? Anyone using it will no longer be able to access the paper.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('paper_shared_links')
        .delete()
        .eq('id', linkId);
        
      if (error) throw error;
      
      // Remove from state
      setSharedLinks(sharedLinks.filter(link => link.id !== linkId));
    } catch (error) {
      console.error('Error deleting shared link:', error);
      setError('Failed to delete shared link');
    }
  };
  
  // Toggle active status of a link
  const handleToggleActive = async (link) => {
    try {
      const { data, error } = await supabase
        .from('paper_shared_links')
        .update({ is_active: !link.is_active })
        .eq('id', link.id)
        .select();
        
      if (error) throw error;
      
      // Update in state
      if (data && data.length > 0) {
        setSharedLinks(sharedLinks.map(l => 
          l.id === link.id ? data[0] : l
        ));
      }
    } catch (error) {
      console.error('Error updating shared link:', error);
      setError('Failed to update shared link');
    }
  };
  
  // Generate a random key for the shared link
  const generateRandomKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get share URL
  const getShareUrl = (accessKey) => {
    return `${window.location.origin}/shared/${accessKey}`;
  };
  
  // Copy link to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
      });
  };
  
  // Check if a link has expired
  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };
  
  // Display remaining days until expiration
  const getRemainingDays = (expiresAt) => {
    if (!expiresAt) return 'Never';
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    
    if (expiry < now) return 'Expired';
    
    const diffTime = Math.abs(expiry - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  };
  
  return (
    <div className="shared-links-manager">
      <div className="shared-links-header">
        <h2>Shared Links</h2>
        <button 
          className="btn primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'Create New Link'}
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {showCreateForm && (
        <div className="create-link-form">
          <h3>Create Shared Link</h3>
          <p>
            Create a link that can be shared with people outside the Minerva community.
            This will allow them to view the paper without needing to sign in.
          </p>
          
          <form onSubmit={handleCreateLink}>
            <div className="form-group">
              <label>Paper:</label>
              <div className="paper-info">{paperTitle}</div>
            </div>
            
            <div className="form-group">
              <label htmlFor="expiresDays">Expires After:</label>
              <select 
                id="expiresDays" 
                value={expiresDays || ''}
                onChange={(e) => setExpiresDays(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Never</option>
                <option value="1">1 day</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="allowDownload" className="checkbox-label">
                <input
                  type="checkbox"
                  id="allowDownload"
                  checked={allowDownload}
                  onChange={(e) => setAllowDownload(e.target.checked)}
                />
                Allow PDF Download
              </label>
            </div>
            
            <div className="form-group">
              <label htmlFor="allowComments" className="checkbox-label">
                <input
                  type="checkbox"
                  id="allowComments"
                  checked={allowComments}
                  onChange={(e) => setAllowComments(e.target.checked)}
                />
                Allow Comments
              </label>
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="btn secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn primary"
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create Link'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {loading ? (
        <div className="loading">Loading shared links...</div>
      ) : sharedLinks.length > 0 ? (
        <div className="shared-links-list">
          <table>
            <thead>
              <tr>
                <th>Link</th>
                <th>Created</th>
                <th>Expires</th>
                <th>Views</th>
                <th>Settings</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sharedLinks.map(link => (
                <tr key={link.id} className={`${!link.is_active || isExpired(link.expires_at) ? 'inactive-link' : ''}`}>
                  <td className="link-cell">
                    <div className="share-url">
                      <span className="link-text">{getShareUrl(link.access_key)}</span>
                      <button 
                        className="btn-icon"
                        onClick={() => copyToClipboard(getShareUrl(link.access_key))}
                        title="Copy Link"
                      >
                        📋
                      </button>
                    </div>
                  </td>
                  <td>{formatDate(link.created_at)}</td>
                  <td className={isExpired(link.expires_at) ? 'expired' : ''}>
                    {link.expires_at ? getRemainingDays(link.expires_at) : 'Never'}
                  </td>
                  <td>{link.view_count}</td>
                  <td>
                    <div className="link-settings">
                      <span className={`setting ${link.allow_download ? 'enabled' : 'disabled'}`} title="Allow Download">
                        {link.allow_download ? '✓' : '✗'} Download
                      </span>
                      <span className={`setting ${link.allow_comments ? 'enabled' : 'disabled'}`} title="Allow Comments">
                        {link.allow_comments ? '✓' : '✗'} Comments
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="link-actions">
                      <button 
                        className={`btn-toggle ${link.is_active ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleActive(link)}
                        title={link.is_active ? 'Deactivate Link' : 'Activate Link'}
                      >
                        {link.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => handleDeleteLink(link.id)}
                        title="Delete Link"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-shared-links">
          <p>No shared links have been created for this paper.</p>
          <p>Create a shared link to allow people outside Minerva to view this paper without signing in.</p>
        </div>
      )}
    </div>
  );
}

export default SharedLinksManager;