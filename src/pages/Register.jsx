import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Commented for demo
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";
import './Register.css';

export default function Register() {
  const [user_id, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Additional user info
  const [username, setUsername] = useState("");
  const [gmail, setGmail] = useState("");
  const [age, setAge] = useState("");
  const [role, setRole] = useState("");
  
  // Notification state
  const [notification, setNotification] = useState(null);
  
  // const navigate = useNavigate(); // Commented for demo
const navigate = useNavigate();


  const roleOptions = [
    "Student",
    "Teacher",
    "Software Developer",
    "Engineer",
    "Doctor",
    "Lawyer",
    "Business Professional",
    "Researcher",
    "Designer",
    "Other"
  ];

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (type, title, message) => {
    setNotification({ type, title, message });
  };

  const handleInitialSubmit = () => {
    if (!user_id || !password) {
      showNotification(
        'error',
        'Missing Information',
        'Please enter both User ID and Password to continue.'
      );
      return;
    }
    setShowModal(true);
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !username.trim()) {
      showNotification(
        'warning',
        'Name Required',
        'Please tell us what to call you!'
      );
      return;
    }
    if (currentStep === 2 && !gmail.trim()) {
      showNotification(
        'warning',
        'Email Required',
        'Please provide your Gmail address to continue.'
      );
      return;
    }
    if (currentStep === 2 && gmail.trim() && !gmail.includes('@gmail.com')) {
      showNotification(
        'warning',
        'Invalid Gmail',
        'Please enter a valid Gmail address (must end with @gmail.com).'
      );
      return;
    }
    if (currentStep === 3 && !age.trim()) {
      showNotification(
        'warning',
        'Age Required',
        'Please enter your age to continue.'
      );
      return;
    }
    if (currentStep === 4 && !role) {
      showNotification(
        'warning',
        'Role Required',
        'Please select your role from the options.'
      );
      return;
    }
    
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinalRegister();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinalRegister = async () => {
    try {
      const res = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id, 
          password, 
          username, 
          gmail,
          age: age || null, 
          role 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(
          'success',
          'Welcome aboard! 🎉',
          'Your account has been created successfully. Redirecting to login...'
        );
        setTimeout(() => {
          navigate("/");
        }, 2000);
      } else {
        showNotification(
          'error',
          'Registration Failed',
          data.message || 'Something went wrong. Please try again.'
        );
      }
    } catch (error) {
      console.error("Registration error:", error);
      showNotification(
        'error',
        'Network Error',
        'Unable to connect to the server. Please check your connection and try again.'
      );
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentStep(1);
    setUsername("");
    setGmail("");
    setAge("");
    setRole("");
  };

  const dismissNotification = () => {
    setNotification(null);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="notification-icon" />;
      case 'error':
        return <XCircle className="notification-icon" />;
      case 'warning':
        return <AlertCircle className="notification-icon" />;
      default:
        return <AlertCircle className="notification-icon" />;
    }
  };

  const renderModalContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="modal-step">
            <h2 className="modal-title">👋 Welcome!</h2>
            <p className="modal-subtitle">What should we call you?</p>
            <input
              type="text"
              placeholder="Enter your display name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="modal-input"
              autoFocus
            />
          </div>
        );
      case 2:
        return (
          <div className="modal-step">
            <h2 className="modal-title">📧 Your Gmail Address</h2>
            <p className="modal-subtitle">Please provide your Gmail address</p>
            <input
              type="email"
              placeholder="Enter your Gmail address"
              value={gmail}
              onChange={(e) => setGmail(e.target.value)}
              className="modal-input"
              autoFocus
            />
          </div>
        );
      case 3:
        return (
          <div className="modal-step">
            <h2 className="modal-title">🎂 Tell us about yourself</h2>
            <p className="modal-subtitle">How old are you?</p>
            <input
              type="number"
              placeholder="Enter your age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="modal-input"
              min="1"
              max="120"
              autoFocus
            />
          </div>
        );
      case 4:
        return (
          <div className="modal-step">
            <h2 className="modal-title">💼 What's your role?</h2>
            <p className="modal-subtitle">Select your occupation</p>
            <div className="role-options">
              {roleOptions.map((option) => (
                <button
                  key={option}
                  className={`role-option ${role === option ? 'selected' : ''}`}
                  onClick={() => setRole(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

 return (
  <div className="register-wrapper">
    {/* Notification */}
    {notification && (
      <div className={`notification notification-${notification.type}`}>
        <div className="notification-content">
          {getNotificationIcon(notification.type)}
          <div className="notification-text">
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message">{notification.message}</div>
          </div>
          <button 
            className="notification-close" 
            onClick={dismissNotification}
            aria-label="Dismiss notification"
          >
            <X size={18} />
          </button>
        </div>
        <div className="notification-progress"></div>
      </div>
    )}

    {/* Gif Container on the left */}
    <div className="gif-container">
      <img
        src="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXFpaTczMWNya3FyZDU2c205YnJqYncybWN2bTVma2R4ZjQ5a21kNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6MbkmMMoUPl9sxI4/giphy.gif"
        alt="giphy"
        className="register-gif"
      />
    </div>

    {/* Register Form */}
    <div className="register-container">
      <div className="register-card">
        <h1>Register</h1>
        <input
          type="text"
          placeholder="User ID"
          value={user_id}
          onChange={(e) => setUserId(e.target.value)}
          className="register-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="register-input"
        />
        <button onClick={handleInitialSubmit} className="register-button">
          Continue
        </button>
      </div>
    </div>

    {/* Modal Overlay */}
    {showModal && (
      <div className="modal-overlay">
        <div className="modal-container">
          <button className="modal-close" onClick={closeModal}>
            ×
          </button>
          
          {/* Progress Indicator */}
          <div className="progress-indicator">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(currentStep / 4) * 100}%` }}
              ></div>
            </div>
            <span className="progress-text">Step {currentStep} of 4</span>
          </div>

          {/* Modal Content */}
          {renderModalContent()}

          {/* Modal Actions */}
          <div className="modal-actions">
            {currentStep > 1 && (
              <button className="modal-btn modal-btn-secondary" onClick={handlePrevStep}>
                Back
              </button>
            )}
            <button className="modal-btn modal-btn-primary" onClick={handleNextStep}>
              {currentStep === 4 ? 'Complete Registration' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    )}


      <style >{`
        /* Notification Styles */
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          min-width: 350px;
          max-width: 500px;
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          backdrop-filter: blur(10px);
          z-index: 10000;
          animation: slideInRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          overflow: hidden;
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .notification-success {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(21, 128, 61, 0.95) 100%);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: white;
        }

        .notification-error {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: white;
        }

        .notification-warning {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.95) 0%, rgba(180, 83, 9, 0.95) 100%);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: white;
        }

        .notification-content {
          display: flex;
          align-items: flex-start;
          padding: 20px;
          gap: 16px;
        }

        .notification-icon {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .notification-text {
          flex: 1;
          min-width: 0;
        }

        .notification-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 4px;
          line-height: 1.3;
        }

        .notification-message {
          font-size: 14px;
          font-weight: 400;
          opacity: 0.95;
          line-height: 1.4;
        }

        .notification-close {
          background: none;
          border: none;
          color: currentColor;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          opacity: 0.8;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .notification-close:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.2);
        }

        .notification-progress {
          height: 3px;
          background: rgba(255, 255, 255, 0.3);
          position: relative;
          overflow: hidden;
        }

        .notification-progress::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: rgba(255, 255, 255, 0.8);
          animation: progressBar 5s linear;
        }

        @keyframes progressBar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        /* Existing Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-container {
          background: white;
          border-radius: 20px;
          padding: 40px;
          width: 90%;
          max-width: 500px;
          position: relative;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(30px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-close {
          position: absolute;
          top: 15px;
          right: 20px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s ease;
        }

        .modal-close:hover {
          background: #f5f5f5;
          color: #333;
        }

        .progress-indicator {
          margin-bottom: 30px;
          text-align: center;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: #e0e0e0;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }

        .modal-step {
          text-align: center;
          margin-bottom: 30px;
        }

        .modal-title {
          font-size: 28px;
          font-weight: 700;
          color: #333;
          margin-bottom: 10px;
        }

        .modal-subtitle {
          font-size: 16px;
          color: #666;
          margin-bottom: 25px;
        }

        .modal-input {
          width: 100%;
          padding: 15px 20px;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          font-size: 16px;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }

        .modal-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .role-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
          margin-top: 20px;
        }

        .role-option {
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
          font-weight: 500;
        }

        .role-option:hover {
          border-color: #667eea;
          background: #f8f9ff;
        }

        .role-option.selected {
          border-color: #667eea;
          background: #667eea;
          color: white;
        }

        .modal-actions {
          display: flex;
          gap: 15px;
          justify-content: flex-end;
        }

        .modal-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 100px;
        }

        .modal-btn-primary {
          background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .modal-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .modal-btn-secondary {
          background: #f5f5f5;
          color: #666;
        }

        .modal-btn-secondary:hover {
          background: #e8e8e8;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .notification {
            top: 10px;
            right: 10px;
            left: 10px;
            min-width: auto;
            max-width: none;
          }
          
          .modal-container {
            padding: 30px 20px;
            margin: 20px;
          }
          
          .role-options {
            grid-template-columns: 1fr;
          }
          
          .modal-actions {
            flex-direction: column;
          }
        }

        @media (max-width: 480px) {
          .notification-content {
            padding: 16px;
            gap: 12px;
          }
          
          .notification-title {
            font-size: 15px;
          }
          
          .notification-message {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}