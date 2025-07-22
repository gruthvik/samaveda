import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const [user_id, setUserId] = useState(() => {
    return localStorage.getItem("user_id") || "";
  });

  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionName, setSessionName] = useState('');
  const [studyMode, setStudyMode] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [step, setStep] = useState(1); // Track the current step

  const handleNextStep = () => {
    setStep((prevStep) => prevStep + 1);
  };

  const handlePreviousStep = () => {
    setStep((prevStep) => prevStep - 1);
  };

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/get-sessions?user_id=${user_id}`);
        setSessions(response.data.sessions.reverse()); // Reverse to show latest first
      } catch (err) {
        console.error(err);
        alert('Error fetching sessions');
      }
    };

    fetchSessions();
  }, [user_id]);
  
    const handleSubmit = async () => {
    const formData = new FormData();
    formData.append('user_id', user_id);
    formData.append('session_name', sessionName);
    formData.append('study_mode', studyMode);
    if (pdfFile) formData.append('file', pdfFile);

    try {
      await axios.post('http://localhost:5000/create-session', formData);
      alert('Session created successfully!');
      setShowModal(false);
     navigate('/SamaVeda', {
    state: {
      sessionName: sessionName,
      user_id: user_id
    }
    }); 
    } catch (err) {
      console.error(err);
      alert('Error creating session');
    }
  };
  
 const handleSessionClick = ( sessionName) => {
  // Navigate to the Archimedes page with sessionName and userId
  navigate('/SamaVeda', {
    state: {
      sessionName: sessionName,
      user_id: user_id
    }
  }); 
};

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', padding: '1rem 2rem', borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ color: 'white', margin: 0, fontSize: '1.8rem', fontWeight: '600' }}>
            <i>SamaVeda</i> Dashboard
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'white', opacity: 0.9 }}>Welcome, {user_id}</span>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              👤
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', display: 'grid', gap: '2rem' }}>
        {/* Welcome Section */}
        <section style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '16px', padding: '2rem', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)', textAlign: 'center' }}>
          <h2 style={{ color: '#333', marginBottom: '1rem', fontSize: '2rem' }}>
            Welcome to Your Learning Hub
          </h2>
          <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: '1.6' }}>
            Start a new conversation with your AI tutor and explore interactive learning with videos, images, and personalized assistance.
          </p>
          
          {/* New Chat Button - Main CTA */}
          <button
            onClick={() => setShowModal(true)}
            style={{
              backgroundColor: '#0978f7',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '1rem 2rem',
              fontSize: '1.2rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 16px rgba(9, 120, 247, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(9, 120, 247, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 16px rgba(9, 120, 247, 0.3)';
            }}
          >
            <span style={{ fontSize: '24px', marginRight: '8px' }}>💬</span>
            Start New Chat
          </button>
        </section>

        {/* Sessions Section */}
<section style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '16px', padding: '2rem', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)' }}>
  <h3 style={{ color: '#333', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
    Your Sessions
  </h3>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
    {sessions.map((session) => (
      <button
        key={session.id}
        onClick={() => handleSessionClick(session.id, session.name)}
        style={{
          backgroundColor: '#f8f9fa',
          border: '2px solid #e9ecef',
          borderRadius: '8px',
          padding: '1rem',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          transition: 'all 0.3s ease',
          color: '#495057',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
          height: '100px', // Set a consistent height
          width: '100%', // Full width of the grid column
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#e9ecef';
          e.target.style.borderColor = '#0978f7';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = '#f8f9fa';
          e.target.style.borderColor = '#e9ecef';
        }}
      >
        <span style={{ fontSize: '1.2rem', fontWeight: '600' }}>{session.name}</span>
        <span style={{ fontSize: '1rem', color: '#666' }}>{new Date(session.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}</span>
      </button>
    ))}
  </div>
</section>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
        <p>© 2024 SamaVeda Learning Platform. Empowering education through AI.</p>
      </footer>

      {showModal && (
        <div style={{
          position: 'fixed',
          top: '10%',
          left: '12.5%',
          width: '75%',
          height: '80%',
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '2rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 999,
          overflowY: 'auto'
        }}>
          {/* Modal content here */}
          <h2 style={{ marginBottom: '1rem' }}>New Study Session</h2>

          {step === 1 && (
            <>
              <label>Session Name:</label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Enter session name"
                style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
              />
              <button onClick={handleNextStep} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#0978f7', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                Next
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <label>Choose Study Mode:</label>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                {['chill', 'deep dive', 'speed run'].map((mode) => (
                  <div
                    key={mode}
                    onClick={() => setStudyMode(mode)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      backgroundColor: studyMode === mode
                        ? (mode === 'chill' ? '#6ec6ff' : mode === 'deep dive' ? '#a881af' : '#fbc02d')
                        : '#f0f0f0',
                      color: studyMode === mode ? 'white' : 'black',
                      border: studyMode === mode ? '2px solid #444' : '1px solid #ccc'
                    }}
                  >
                    {mode}
                  </div>
                ))}
              </div>
              <button onClick={handlePreviousStep} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#ccc', borderRadius: '8px', border: 'none', cursor: 'pointer', marginRight: '1rem' }}>
                Back
              </button>
              <button onClick={handleNextStep} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#0978f7', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                Next
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <label>Upload Subject Portion (optional):</label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setPdfFile(e.target.files[0])}
                style={{ marginBottom: '1.5rem' }}
              />
              <button onClick={handlePreviousStep} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#ccc', borderRadius: '8px', border: 'none', cursor: 'pointer', marginRight: '1rem' }}>
                Back
              </button>
              <button onClick={handleSubmit} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#0978f7', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                Confirm & Save
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
