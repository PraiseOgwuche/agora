import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/Auth.css';

function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  // Remove unused state variables
  // const [userType, setUserType] = useState('student');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Validate Minerva email
  const validateEmail = (email) => {
    const studentPattern = /@uni\.minerva\.edu$/;
    const staffPattern = /@minerva\.edu$/;
    
    if (studentPattern.test(email)) {
      return 'student';
    } else if (staffPattern.test(email)) {
      return 'staff';
    }
    return null;
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    // Validate Minerva email
    const emailType = validateEmail(email);
    if (!emailType) {
      setError('Please use a valid Minerva email address (@uni.minerva.edu for students or @minerva.edu for staff)');
      return;
    }
    
    // Set user type based on email domain
    const actualUserType = emailType;
    
    try {
      setLoading(true);
      
      // Create user in Supabase Auth
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            user_type: actualUserType
          }
        }
      });
      
      if (error) throw error;
      
      setMessage('Registration successful! Please check your email to confirm your account.');
      
    } catch (error) {
      setError(error.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      setMessage('Signed in successfully!');
    } catch (error) {
      setError(error.message || 'Error signing in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isSignUp ? 'Create Account' : 'Sign In'}</h2>
        
        <form onSubmit={isSignUp ? handleSignUp : handleSignIn}>
          {isSignUp && (
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isSignUp ? "yourname@uni.minerva.edu" : "Enter your email"}
              required
            />
            {isSignUp && (
              <small>Use your Minerva email (@uni.minerva.edu for students, @minerva.edu for staff)</small>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}
          
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
        
        <div className="auth-toggle">
          {isSignUp ? (
            <p>Already have an account? <button onClick={() => setIsSignUp(false)}>Sign In</button></p>
          ) : (
            <p>Don't have an account? <button onClick={() => setIsSignUp(true)}>Sign Up</button></p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;