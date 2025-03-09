// src/components/TrendingPapers.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/TrendingPapers.css';

function TrendingPapers({ limit = 5 }) {
  const [trendingPapers, setTrendingPapers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [timePeriod, setTimePeriod] = useState(30); // Add this state variable
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch available categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .order('name');
          
        if (error) throw error;
        
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    
    fetchCategories();
  }, []);

  // Fetch trending papers
  useEffect(() => {
    const fetchTrendingPapers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Call the stored function to get trending papers
        const { data, error } = await supabase.rpc(
          'get_trending_papers',
          { 
            time_period_days: timePeriod,
            category_filter: selectedCategory,
            limit_count: limit
          }
        );
        
        if (error) throw error;
        
        setTrendingPapers(data || []);
      } catch (error) {
        console.error('Error fetching trending papers:', error);
        setError('Failed to load trending papers');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrendingPapers();
  }, [limit, timePeriod, selectedCategory]);

  // Handler for category filter change
  const handleCategoryChange = (event) => {
    setSelectedCategory(event.target.value === 'all' ? null : event.target.value);
  };

  // Handler for time period change
  const handleTimePeriodChange = (days) => {
    return () => {
      if (days !== timePeriod) {
        setTrendingPapers([]);
        setTimePeriod(days);
      }
    };
  };

  if (loading && trendingPapers.length === 0) {
    return <div className="trending-papers-loading">Loading trending papers...</div>;
  }

  if (error) {
    return <div className="trending-papers-error">{error}</div>;
  }

  return (
    <div className="trending-papers">
      <div className="trending-papers-header">
        <div className="trending-filters">
          <div className="filter-group">
            <label htmlFor="category-filter">Filter by Category:</label>
            <select 
              id="category-filter" 
              value={selectedCategory || 'all'} 
              onChange={handleCategoryChange}
              className="category-select"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group time-filter">
            <span>Time Period:</span>
            <div className="time-buttons">
              <button 
                className={timePeriod === 7 ? 'active' : ''} 
                onClick={handleTimePeriodChange(7)}
              >
                Week
              </button>
              <button 
                className={timePeriod === 30 ? 'active' : ''} 
                onClick={handleTimePeriodChange(30)}
              >
                Month
              </button>
              <button 
                className={timePeriod === 90 ? 'active' : ''} 
                onClick={handleTimePeriodChange(90)}
              >
                3 Months
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {trendingPapers.length > 0 ? (
        <div className="trending-papers-list">
          {trendingPapers.map((paper) => (
            <div key={paper.paper_id} className="trending-paper-card">
              <div className="paper-card-header">
                <div className="paper-category">{paper.category_name}</div>
                <div className="paper-stats">
                    {paper.status && (
                        <span className={`paper-status status-${paper.status}`}>
                            {paper.status}
                        </span>
                    )}
                  <span className="views-count" title="Views">
                    👁️ {paper.view_count}
                  </span>
                  <span className="likes-count" title="Likes">
                    👍 {paper.like_count}
                  </span>
                  <span className="comments-count" title="Comments">
                    💬 {paper.comment_count}
                  </span>
                </div>
              </div>
              
              <Link to={`/papers/${paper.paper_id}`} className="paper-title">
                {paper.title}
              </Link>
              
              <div className="paper-authors">
                By: {paper.author_names ? paper.author_names.join(', ') : 'Unknown'}
              </div>
              
              <p className="paper-abstract">
                {paper.abstract && paper.abstract.length > 150 
                  ? paper.abstract.substring(0, 150) + '...' 
                  : paper.abstract}
              </p>
              
              <Link to={`/papers/${paper.paper_id}`} className="read-more-link">
                Read More
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-papers-message">
          <p>No trending papers found in this category for the selected time period.</p>
          <p>Try changing your filter options or check back later.</p>
        </div>
      )}
    </div>
  );
}

export default TrendingPapers;