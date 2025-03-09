import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Search.css';

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [categories, setCategories] = useState([]);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, userProfile } = useAuth();
  
  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');
        
        if (error) throw error;
        
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Load all papers (memoized to avoid ESLint warning)
  const loadAllPapers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('papers')
        .select(`
          id,
          title,
          abstract,
          status,
          submitted_at,
          category_id,
          categories(id, name)
        `);
      
      // Apply category filter if selected
      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }
      
      // Filter based on user permissions
      if (!user) {
        // Not logged in - only show published papers
        query = query.eq('status', 'published');
      } else if (userProfile?.user_type === 'staff') {
        // Staff can see all papers - no additional filtering
      } else {
        // Regular users - see published papers + own drafts
        const { data: authoredPapers } = await supabase
          .from('paper_authors')
          .select('paper_id')
          .eq('author_id', user.id);
        
        const authoredPaperIds = authoredPapers?.map(p => p.paper_id) || [];
        
        if (authoredPaperIds.length > 0) {
          query = query.or(`status.eq.published,id.in.(${authoredPaperIds.join(',')})`);
        } else {
          query = query.eq('status', 'published');
        }
      }
      
      // Final query execution with ordering
      const { data, error } = await query.order('submitted_at', { ascending: false });
      
      if (error) throw error;
      
      setPapers(data || []);
    } catch (error) {
      console.error('Error loading papers:', error);
      setError('An error occurred while loading papers.');
    } finally {
      setLoading(false);
    }
  }, [user, userProfile, selectedCategory]); // Added selectedCategory as a dependency

  // Use useCallback to memoize the searchPapers function
  const searchPapers = useCallback(async () => {
    if (!searchQuery.trim() && !selectedCategory) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Update URL parameters
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedCategory) params.set('category', selectedCategory);
      setSearchParams(params);
      
      // Build the query
      let query = supabase
        .from('papers')
        .select(`
          id,
          title,
          abstract,
          status,
          submitted_at,
          category_id,
          categories(id, name)
        `);
      
      // Apply category filter if selected
      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }
      
      // Apply visibility filters based on user role
      if (!user) {
        // Not logged in - only show published papers
        query = query.eq('status', 'published');
      } else if (userProfile?.user_type === 'staff') {
        // Staff can see all papers - no additional filtering
      } else {
        // Regular users - see published papers + own drafts
        const { data: authoredPapers } = await supabase
          .from('paper_authors')
          .select('paper_id')
          .eq('author_id', user.id);
        
        const authoredPaperIds = authoredPapers?.map(p => p.paper_id) || [];
        
        if (authoredPaperIds.length > 0) {
          query = query.or(`status.eq.published,id.in.(${authoredPaperIds.join(',')})`);
        } else {
          query = query.eq('status', 'published');
        }
      }
      
      // Apply text search if provided
      if (searchQuery.trim()) {
        // Search in title and abstract with additional filter
        query = query.or(`title.ilike.%${searchQuery}%,abstract.ilike.%${searchQuery}%`);
      }
      
      // Execute the search
      const { data, error } = await query.order('submitted_at', { ascending: false });
      
      if (error) throw error;
      
      setPapers(data || []);
    } catch (error) {
      console.error('Error searching papers:', error);
      setError('An error occurred while searching. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, setSearchParams, user, userProfile]);
  
  // Handle initial search or load all papers based on URL parameters
  useEffect(() => {
    if (!initialQuery && !initialCategory) {
      loadAllPapers();
    } else if (initialQuery || initialCategory) {
      searchPapers();
    }
  }, [initialQuery, initialCategory, searchPapers, loadAllPapers]); // Added loadAllPapers to the dependency array
  
  const handleSearch = (e) => {
    e.preventDefault();
    searchPapers();
  };
  
  return (
    <div className="search-page-container">
      <h1>Search Papers</h1>
      
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-inputs">
          <div className="search-field">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or keywords..."
              className="search-input"
            />
          </div>
          
          <div className="search-field">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-select"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <button type="submit" className="search-button btn primary">
            Search
          </button>
        </div>
      </form>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="search-results">
        <h2>
          {papers.length > 0 
            ? `Found ${papers.length} paper${papers.length === 1 ? '' : 's'}`
            : loading 
              ? 'Searching...' 
              : (searchQuery || selectedCategory) 
                ? 'No papers found' 
                : 'Enter search terms to find papers'
          }
        </h2>
        
        {loading ? (
          <div className="loading">Searching...</div>
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
                {paper.categories && (
                  <div className="paper-category">
                    {paper.categories.name}
                  </div>
                )}
                <p className="paper-abstract">
                  {paper.abstract.substring(0, 150)}...
                </p>
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
            {(searchQuery || selectedCategory) ? (
              <p>No papers found matching your search criteria.</p>
            ) : (
              <p>Enter search terms above to find papers.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchPage;