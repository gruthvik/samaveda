// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import './Login.css';
import loginGif from './login.gif';

export default function Login() {
  const [user_id, setuser_id] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState('');
  const navigate = useNavigate();


  const handleLogin = async () => {
    try {
      const res = await fetch('http://localhost:5000/login', {
        method: 'POST',
        credentials: 'include', // <-- allows cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user_id,
          password: password,
        }),
      });

      const data = await res.json();
      setMessage(data.message);

      if (res.ok) {
        // login success - redirect or store auth info
        localStorage.setItem("user_id", user_id);
        console.log('User logged in!');
        if (data.iq_score) {
          navigate("/LoadingPage", { state: { user_id } });
        } else {
          navigate("/IQTest", { state: { user_id } });
        }
      } else {
        // login failed
        console.log('Login failed');
        alert("Please enter both user_id and password");
      }
    } catch (err) {
      console.error('Error during login:', err);
      setMessage('Something went wrong.');
    }
  };

  return (
    <div className="login-container">
      <div className="gif-container">
        <img
          src={loginGif}
          alt="loading"
          className="login-gif"
        />
      </div>
  
      <div className="login-card">
        <h1>Login</h1>
        <input
          type="text"
          placeholder="User ID"
          value={user_id}
          onChange={(e) => setuser_id(e.target.value)}
          className="login-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
        />
        <div className="login-button-container">
          <button onClick={handleLogin} className="login-button login">Login</button>
          <button onClick={() => navigate("/register")} className="login-button register">Register</button>
        </div>
      </div>
    </div>
  );
  
}
