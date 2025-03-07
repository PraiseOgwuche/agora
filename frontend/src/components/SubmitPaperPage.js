import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import '../styles/SubmitPaper.css';

function SubmitPaperPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [category, setCategory] = useState('');
  const [coAuthors, setCoAuthors] = useState([{ email: '', order: 2 }]);
  const [pdfFile, setPdfFile] = useState(null);
  
  // Categories state - we'll fetch them from the database
  const [categories, setCategories] = useState([]);
  
  // Fetch categories from the database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Call the database for categories
        const { data, error } = await supabase
          .from('categories')
          .select('*');
          
        if (error) throw error;
        
        if (data) {
          setCategories(data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        // Fallback to hardcoded categories if fetch fails
        setCategories([
          { id: '1', name: 'Biology' },
          { id: '2', name: 'Computer Science' },
          { id: '3', name: 'Chemistry' },
          { id: '4', name: 'Physics' }
        ]);
      }
    };
    
    fetchCategories();
  }, []);
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setPdfFile(file);
  };
  
  const addCoAuthor = () => {
    setCoAuthors([...coAuthors, { email: '', order: coAuthors.length + 2 }]);
  };
  
  const updateCoAuthor = (index, field, value) => {
    const updatedCoAuthors = [...coAuthors];
    updatedCoAuthors[index] = { ...updatedCoAuthors[index], [field]: value };
    setCoAuthors(updatedCoAuthors);
  };
  
  const removeCoAuthor = (index) => {
    const updatedCoAuthors = coAuthors.filter((_, i) => i !== index);
    // Update order numbers
    const reorderedCoAuthors = updatedCoAuthors.map((author, i) => ({
      ...author,
      order: i + 2
    }));
    setCoAuthors(reorderedCoAuthors);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !abstract.trim() || !category || !pdfFile) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // 1. Upload PDF to storage with a simple filename (no paths with UUIDs)
      const fileExt = pdfFile.name.split('.').pop();
      const fileName = `paper_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('papers')
        .upload(fileName, pdfFile);
        
      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(`Error uploading file: ${uploadError.message}`);
      }
      
      // Get the URL for the file
      const { data: fileData } = supabase.storage
        .from('papers')
        .getPublicUrl(fileName);
      
      if (!fileData || !fileData.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }
      
      console.log('File uploaded successfully, URL:', fileData.publicUrl);
      
      // 2. Create paper record
      const paperToInsert = {
        title,
        abstract,
        category_id: category,  // Make sure this is a valid UUID in your categories table
        status: 'draft',
        pdf_url: fileData.publicUrl
      };
      
      console.log('Inserting paper:', paperToInsert);
      
      const { data: paperData, error: paperError } = await supabase
        .from('papers')
        .insert([paperToInsert])
        .select();
        
      if (paperError) {
        console.error('Paper insert error details:', paperError);
        throw new Error(`Error creating paper: ${paperError.message}`);
      }
      
      if (!paperData || paperData.length === 0) {
        throw new Error('No paper data returned after insertion');
      }
      
      const paperId = paperData[0].id;
      console.log('Paper created successfully with ID:', paperId);
      
      // 3. Add author record
      const authorToInsert = {
        paper_id: paperId,
        author_id: user.id,
        is_corresponding: true,
        author_order: 1
      };
      
      console.log('Inserting author:', authorToInsert);
      
      const { error: authorError } = await supabase
        .from('paper_authors')
        .insert([authorToInsert]);
        
      if (authorError) {
        console.error('Author insert error details:', authorError);
        throw new Error(`Error adding author: ${authorError.message}`);
      }
      
      console.log('Author added successfully');
      
      // Handle co-authors
      if (coAuthors.length > 0 && coAuthors[0].email) {
        for (const coAuthor of coAuthors) {
          if (coAuthor.email) {
            // First check if the user exists
            const { data: userData, error: userError } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', coAuthor.email)
              .single();
              
            if (userError && userError.code !== 'PGRST116') {
              console.warn(`Error finding co-author ${coAuthor.email}:`, userError);
              continue; // Skip this co-author but continue with others
            }
            
            if (userData) {
              // Add co-author
              await supabase
                .from('paper_authors')
                .insert([{
                  paper_id: paperId,
                  author_id: userData.id,
                  is_corresponding: false,
                  author_order: coAuthor.order
                }]);
            } else {
              console.warn(`Co-author with email ${coAuthor.email} not found`);
            }
          }
        }
      }
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting paper:', error);
      setError(error.message || 'An error occurred while submitting your paper');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="submit-paper-container">
      <h1>Submit a Research Paper</h1>
      
      {success ? (
        <div className="success-message">
          <h2>Paper Submitted Successfully!</h2>
          <p>Redirecting to your dashboard...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="paper-form">
          {error && <div className="error-message">{error}</div>}

          <div className="submission-steps">
            <div className="step active">
              <div className="step-number">1</div>
              <div className="step-label">Paper Info</div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-label">Authors</div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-label">Upload</div>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <div className="step-label">Review</div>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="title">Paper Title *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">Select a category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="abstract">Abstract *</label>
            <textarea
              id="abstract"
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              rows={6}
              required
            />
            <small>{abstract.length} / 500 characters</small>
          </div>
          
          <div className="form-group">
            <label htmlFor="pdfFile">Paper PDF *</label>
            <input
              id="pdfFile"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              required
            />
            <small>Upload your full paper as a PDF (max 10MB)</small>
          </div>
          
          <div className="co-authors-section">
            <div className="section-header">
              <h3>Co-Authors</h3>
              <button type="button" onClick={addCoAuthor} className="btn-small">
                Add Co-Author
              </button>
            </div>
            
            <p>You are listed as the first author and corresponding author.</p>
            
            {coAuthors.map((author, index) => (
              <div key={index} className="co-author-row">
                <div className="form-group">
                  <label>Co-Author Email (Minerva)</label>
                  <input
                    type="email"
                    value={author.email}
                    onChange={(e) => updateCoAuthor(index, 'email', e.target.value)}
                    placeholder="colleague@uni.minerva.edu"
                  />
                </div>
                <div className="form-group order-group">
                  <label>Order</label>
                  <input
                    type="number"
                    value={author.order}
                    readOnly
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => removeCoAuthor(index)}
                  className="btn-icon remove-author"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={() => navigate('/dashboard')} className="btn secondary">
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Paper'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default SubmitPaperPage;