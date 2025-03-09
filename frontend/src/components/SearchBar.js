// src/components/SearchBar.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SearchBar.css';

function SearchBar() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  
  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };
  
  return (
    <form className="search-bar" onSubmit={handleSearch}>
      <input
        type="text"
        placeholder="Search papers..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="search-bar-input"
      />
      <button type="submit" className="search-bar-button">
        🔍
      </button>
    </form>
  );
}

export default SearchBar;