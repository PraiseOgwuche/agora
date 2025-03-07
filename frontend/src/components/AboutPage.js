import React from 'react';
import '../styles/About.css';

function AboutPage() {
  return (
    <div className="about-page">
      <h1>About Agora</h1>
      
      <div className="about-section">
        <p>
          Agora is Minerva University's premier academic journal platform, designed to connect students and faculty through scholarly research and publication.
        </p>
        <p>
          Named after the ancient Greek gathering places for ideas and discourse, Agora serves as a digital commons where Minerva's academic community can share groundbreaking research, receive peer feedback, and engage with scholarly work.
        </p>
      </div>
      
      <div className="mission-section">
        <h2>Our Mission</h2>
        <p>
          To provide Minerva students and faculty with a professional academic publishing platform that facilitates knowledge sharing, enhances research skills, and prepares students for scholarly publication in the wider academic world.
        </p>
      </div>
      
      <div className="about-section">
        <h2>Features</h2>
        <ul>
          <li><strong>Academic Excellence</strong> - Experience the full academic publishing process with peer review by Minerva's community of scholars.</li>
          <li><strong>Community Feedback</strong> - Receive constructive feedback from peers and faculty to strengthen your research and ideas.</li>
          <li><strong>Global Visibility</strong> - Share your research with the Minerva community and invited external scholars.</li>
          <li><strong>Categories & Fields</strong> - Submit papers across a wide range of academic disciplines including sciences, social sciences, arts, and humanities.</li>
        </ul>
      </div>
      
      <div className="about-section">
        <h2>Our Team</h2>
        <p>Agora is developed and maintained by a dedicated team of Minerva students and faculty.</p>
        <div className="team-members">
          <div className="team-member">
            <h3>Your Name</h3>
            <p className="role">Founder & Lead Developer</p>
            <p>Minerva University student passionate about research and academic publishing.</p>
          </div>
          {/* Add more team members as needed */}
        </div>
      </div>
      
      <div className="contact-section">
        <h2>Contact Us</h2>
        <p>Have questions, suggestions, or feedback? We'd love to hear from you.</p>
        <div className="contact-methods">
          <div className="contact-method">
            <div className="icon-container">
              <span className="icon">✉️</span>
            </div>
            <h3>Email</h3>
            <p>agora@minerva.edu</p>
          </div>
          <div className="contact-method">
            <div className="icon-container">
              <span className="icon">💬</span>
            </div>
            <h3>Office Hours</h3>
            <p>Tuesdays 3-5pm PT</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;