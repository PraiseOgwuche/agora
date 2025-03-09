// src/components/SharedPaperView.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import PaperComments from './PaperComments';
import '../styles/SharedPaperView.css';

function SharedPaperView() {
  const { accessKey } = useParams();
  const [paper, setPaper] = useState(null);
  const [sharing, setSharing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('abstract');
  
  useEffect(() => {
    const fetchSharedPaper = async () => {
      try {
        setLoading(true);
        
        // Get shared paper details
        const { data, error } = await supabase
          .from('paper_shared_links')
          .select(`
            id,
            paper_id,
            is_active,
            expires_at,
            allow_comments,
            allow_download,
            papers(
              id,
              title,
              abstract,
              status,
              created_at,
              updated_at,
              category_id,
              categories(name)
            )
          `)
          .eq('access_key', accessKey)
          .single();
          
        if (error) throw error;
        
        if (!data) {
          setError('Shared link not found');
          setLoading(false);
          return;
        }
        
        // Check if link is active
        if (!data.is_active) {
          setError('This shared link has been deactivated');
          setLoading(false);
          return;
        }
        
        // Check if link has expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setError('This shared link has expired');
          setLoading(false);
          return;
        }
        
        // Get paper authors
        const { data: authorsData, error: authorsError } = await supabase
          .from('paper_authors')
          .select(`
            profiles(id, full_name)
          `)
          .eq('paper_id', data.paper_id);
          
        if (authorsError) throw authorsError;
        
        const authors = authorsData.map(item => item.profiles.full_name);
        
        // Set paper and sharing details
        setPaper({
          ...data.papers,
          authors
        });
        
        setSharing({
          allow_comments: data.allow_comments,
          allow_download: data.allow_download,
          access_key: accessKey
        });
        
        // Log view to increase view count
        await supabase
          .from('paper_shared_links')
          .update({
            view_count: data.view_count + 1,
            last_viewed_at: new Date().toISOString()
          })
          .eq('id', data.id);
          
      } catch (error) {
        console.error('Error fetching shared paper:', error);
        setError('Failed to load paper. The link may be invalid or expired.');
      } finally {
        setLoading(false);
      }
    };
    
    if (accessKey) {
      fetchSharedPaper();
    }
  }, [accessKey]);
  
  const handleDownloadPdf = async () => {
    if (!paper || !sharing || !sharing.allow_download) return;
    
    try {
      setPdfLoading(true);
      
      // Get PDF URL for paper
      const filename = paper.pdf_url?.split('/').pop();
      
      if (!filename) {
        setError('PDF not available for this paper');
        setPdfLoading(false);
        return;
      }
      
      // Get a signed URL for the PDF
      const { data, error } = await supabase.storage
        .from('papers')
        .createSignedUrl(filename, 60); // URL valid for 60 seconds
        
      if (error) throw error;
      
      // Open PDF in new tab
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error getting PDF:', error);
      setError('Failed to get PDF. Please try again later.');
    } finally {
      setPdfLoading(false);
    }
  };
  
  // Get PDF for embedded viewing
  useEffect(() => {
    const getEmbeddedPdf = async () => {
      if (activeTab !== 'pdf' || !paper || !paper.pdf_url) return;
      
      try {
        const filename = paper.pdf_url.split('/').pop();
        
        if (!filename) return;
        
        // Get a signed URL for the PDF
        const { data, error } = await supabase.storage
          .from('papers')
          .createSignedUrl(filename, 3600); // URL valid for 1 hour
          
        if (error) throw error;
        
        setPdfUrl(data.signedUrl);
      } catch (error) {
        console.error('Error getting embedded PDF:', error);
        setError('Failed to load PDF viewer.');
      }
    };
    
    getEmbeddedPdf();
  }, [activeTab, paper]);
  
  if (loading) return <div className="loading">Loading shared paper...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!paper) return <div className="not-found">Paper not found</div>;
  
  return (
    <div className="shared-paper-container">
      <div className="shared-header">
        <div className="shared-badge">Shared Paper</div>
        <div className="shared-info">
          <p>You're viewing a shared paper from the Minerva Academic Journal Platform.</p>
          <a href="/" className="join-link">Join Agora</a>
        </div>
      </div>
      
      <div className="paper-details">
        <h1 className="paper-title">{paper.title}</h1>
        
        <div className="paper-meta">
          <div className="meta-item">
            <strong>Category:</strong> {paper.categories?.name || 'Uncategorized'}
          </div>
          <div className="meta-item">
            <strong>Published:</strong> {new Date(paper.created_at).toLocaleDateString()}
          </div>
        </div>
        
        <div className="paper-authors">
          By: {paper.authors?.join(', ') || 'Unknown Authors'}
        </div>
        
        <div className="paper-actions">
          {sharing?.allow_download && (
            <button 
              onClick={handleDownloadPdf}
              className="btn primary"
              disabled={pdfLoading}
            >
              {pdfLoading ? 'Loading...' : 'Download PDF'}
            </button>
          )}
        </div>
        
        <div className="paper-tabs">
          <button 
            className={`tab-button ${activeTab === 'abstract' ? 'active' : ''}`}
            onClick={() => setActiveTab('abstract')}
          >
            Abstract
          </button>
          <button 
            className={`tab-button ${activeTab === 'pdf' ? 'active' : ''}`}
            onClick={() => setActiveTab('pdf')}
          >
            Full Paper
          </button>
          {sharing?.allow_comments && (
            <button 
              className={`tab-button ${activeTab === 'discussion' ? 'active' : ''}`}
              onClick={() => setActiveTab('discussion')}
            >
              Discussion
            </button>
          )}
        </div>
        
        <div className="paper-content">
          {activeTab === 'abstract' && (
            <div className="paper-abstract">
              <h2>Abstract</h2>
              <p>{paper.abstract}</p>
            </div>
          )}
          
          {activeTab === 'pdf' && (
            <div className="paper-pdf-container">
              {pdfUrl ? (
                <iframe 
                  src={pdfUrl} 
                  title={paper.title}
                  className="paper-pdf"
                />
              ) : (
                <div className="loading">Loading PDF viewer...</div>
              )}
            </div>
          )}
          
          {activeTab === 'discussion' && sharing?.allow_comments && (
            <div className="paper-discussion">
              <PaperComments paperId={paper.id} isSharedView={true} />
            </div>
          )}
        </div>
      </div>
      
      <div className="shared-footer">
        <p>
          This content is shared from Agora, Minerva University's Academic Journal Platform. 
          <a href="/" className="explore-link">Explore more research</a>
        </p>
      </div>
    </div>
  );
}

export default SharedPaperView;