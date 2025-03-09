// src/components/CategoriesPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Categories.css';

function CategoriesPage() {
  const { user, userProfile } = useAuth();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch all categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');
        
        if (error) throw error;
        
        setCategories(data || []);
        
        // If there are categories, select the first one by default
        if (data && data.length > 0) {
          setSelectedCategory(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setError('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Fetch papers for the selected category
  useEffect(() => {
    const fetchPapersByCategory = async () => {
      if (!selectedCategory) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // First, get all papers in this category
        let query = supabase
          .from('papers')
          .select(`
            id,
            title,
            abstract,
            status,
            submitted_at,
            category_id,
            categories(name)
          `)
          .eq('category_id', selectedCategory);
        
        // Set visibility filters based on user role
        if (!user) {
          // Not logged in - only show published papers
          query = query.eq('status', 'published');
        } else if (userProfile?.user_type === 'staff') {
          // Staff can see all papers - no additional filtering needed
        } else {
          // Regular user - show published papers + own drafts
          const { data: authoredPapers, error: authorError } = await supabase
            .from('paper_authors')
            .select('paper_id')
            .eq('author_id', user.id);
          
          if (authorError) throw authorError;
          
          const authoredPaperIds = authoredPapers?.map(p => p.paper_id) || [];
          
          if (authoredPaperIds.length > 0) {
            // Show published papers OR papers authored by the user
            query = query.or(`status.eq.published,id.in.(${authoredPaperIds.join(',')})`);
          } else {
            // User hasn't authored any papers, only show published
            query = query.eq('status', 'published');
          }
        }
        
        // Execute the query with ordering
        const { data, error } = await query.order('submitted_at', { ascending: false });
        
        if (error) throw error;
        
        setPapers(data || []);
      } catch (error) {
        console.error('Error fetching papers by category:', error);
        setError('Failed to load papers for this category');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPapersByCategory();
  }, [selectedCategory, user, userProfile]);
  
  return (
    <div className="categories-container">
      <h1>Browse Papers by Category</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="categories-layout">
        <div className="categories-sidebar">
          <h2>Categories</h2>
          <ul className="category-list">
            {categories.map(category => (
              <li 
                key={category.id}
                className={selectedCategory === category.id ? 'active' : ''}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="category-papers">
          <h2>
            {selectedCategory ? 
              categories.find(c => c.id === selectedCategory)?.name || 'Papers' : 
              'Papers'
            }
          </h2>
          
          {loading ? (
            <div className="loading">Loading papers...</div>
          ) : papers.length > 0 ? (
            <div className="papers-grid">
              {papers.map(paper => (
                <div key={paper.id} className="paper-card">
                  <div className="paper-header">
                    <h3>{paper.title}</h3>
                    {paper.status && (
                      <div className={`paper-status status-${paper.status}`}>
                        {paper.status}
                      </div>
                    )}
                  </div>
                  <p className="paper-abstract">{paper.abstract.substring(0, 150)}...</p>
                  <div className="paper-footer">
                    <span className="paper-date">
                      {new Date(paper.submitted_at).toLocaleDateString()}
                    </span>
                    <Link to={`/papers/${paper.id}`} className="btn primary">
                      View Paper
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No papers found in this category.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CategoriesPage;