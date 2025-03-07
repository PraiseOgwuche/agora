import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import '../styles/PaperDetails.css';

function PaperDetailsPage() {
  const { paperId } = useParams();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paper, setPaper] = useState(null);
  const [authors, setAuthors] = useState([]);
  const [isAuthor, setIsAuthor] = useState(false);
  
  // Add this near the top of your PaperDetailsPage component
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;

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
        const authorIds = authorData.map(author => author.author_id);
        setIsAuthor(authorIds.includes(user.id));
        
      } catch (error) {
        console.error('Error fetching paper details:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (paperId && user) {
      fetchPaperDetails();
    }
  }, [paperId, user]);
  
  if (loading) return <div className="loading">Loading paper details...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!paper) return <div className="not-found">Paper not found</div>;
  
  return (
    <div className="paper-details-container">
      <div className="paper-header">
        <h1>{paper.title}</h1>
        <div className="paper-status">
          Status: <span className={`status-${paper.status}`}>{paper.status}</span>
        </div>
      </div>
      
      <div className="paper-meta">
        <div className="meta-item">
          <strong>Submitted:</strong> {paper.submitted_at ? new Date(paper.submitted_at).toLocaleDateString() : 'Not yet submitted'}
        </div>
        <div className="meta-item">
          <strong>Category:</strong> {paper.categories?.name || 'Uncategorized'}
        </div>
      </div>
      
      <div className="paper-section">
        <h2>Abstract</h2>
        <div className="paper-abstract">
          {paper.abstract}
        </div>
      </div>
      
      <div className="paper-section">
        <h2>Authors</h2>
        <div className="authors-list">
          {authors.length > 0 ? (
            authors.map((author, index) => (
              <div key={index} className="author-item">
                <div className="author-name">{author.profiles?.full_name}</div>
                <div className="author-email">{author.profiles?.email}</div>
                {author.is_corresponding && <div className="corresponding-badge">Corresponding Author</div>}
              </div>
            ))
          ) : (
            <p>No author information available</p>
          )}
        </div>
      </div>
      
      <div className="paper-section">
        <h2>Full Paper</h2>
        {paper.pdf_url ? (
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
        ) : (
        <p>PDF not available</p>
        )}
      </div>
      
      {isAuthor && (
        <div className="paper-actions author-actions">
          <h2>Author Actions</h2>
          {paper.status === 'draft' && (
            <>
              <button className="btn primary">Submit for Review</button>
              <button className="btn secondary">Edit Paper</button>
            </>
          )}
        </div>
      )}
      
      <div className="back-link">
        <Link to="/dashboard">← Back to Dashboard</Link>
      </div>
    </div>
  );
}

export default PaperDetailsPage;