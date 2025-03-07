import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import axios from 'axios';
import '../styles/Home.css';

function HomePage() {
  const [message, setMessage] = useState('Welcome to Agora!');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorDetails, setErrorDetails] = useState('');

  useEffect(() => {
    // Try multiple approaches to connect to the backend
    const backendUrl = process.env.REACT_APP_API_URL || '/api/hello';
    
    console.log("Attempting to connect to backend at:", backendUrl);
    
    axios.get(backendUrl)
      .then(response => {
        console.log("Backend response:", response.data);
        setMessage(response.data.message);
        setLoading(false);
        setError(false);
      })
      .catch(error => {
        console.error('First attempt failed, trying direct URL...');
        
        // Try with an explicit URL as fallback
        axios.get('http://localhost:5000/api/hello')
          .then(response => {
            console.log("Second attempt succeeded:", response.data);
            setMessage(response.data.message);
            setLoading(false);
            setError(false);
          })
          .catch(secondError => {
            console.error('Both connection attempts failed');
            let errorMsg = 'Could not connect to backend service';
            
            setErrorDetails(errorMsg);
            setMessage('Welcome to Agora!');
            setError(true);
            setLoading(false);
          });
      });
  }, []);

  return (
    <div className="home-page">
      <section className="hero-section">
        <h1>{loading ? 'Loading...' : message}</h1>
        <p>
          Welcome to Agora, Minerva University's academic journal platform where students and faculty can publish and discover groundbreaking research.
        </p>
        <div className="cta-buttons">
          <Link to="/auth" className="btn primary">Get Started</Link>
          <Link to="/about" className="btn secondary">Learn More</Link>
        </div>
      </section>

      {error && (
        <div className="error-container">
          <p className="error-message">Error connecting to server</p>
          <p className="error-details">{errorDetails}</p>
          <p className="error-help">
            Connection issue detected. If you're running in GitHub Codespaces or similar environment, 
            make sure port 5000 is forwarded and publicly accessible.
          </p>
        </div>
      )}

      <section className="feature-section">
        <h2>Why Publish with Agora?</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Academic Excellence</h3>
            <p>
              Experience the full academic publishing process with peer review by Minerva's community of scholars.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Community Feedback</h3>
            <p>
              Receive constructive feedback from peers and faculty to strengthen your research and ideas.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌐</div>
            <h3>Global Visibility</h3>
            <p>
              Share your research with the Minerva community and invited external scholars.
            </p>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <h2>Agora in Numbers</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">50+</div>
            <div className="stat-label">Published Papers</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">120+</div>
            <div className="stat-label">Active Users</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">8</div>
            <div className="stat-label">Research Categories</div>
          </div>
        </div>
      </section>
    </div>
  );
}
export default HomePage;