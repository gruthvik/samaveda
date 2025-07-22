// src/components/WebcamEmotion.jsx
import React, { useRef, useEffect, useState } from "react";
import * as cam from "@mediapipe/camera_utils";
import { FaceMesh } from "@mediapipe/face_mesh";

const DEEPFACE_API_URL = "http://127.0.0.1:5000/emotion"; // Replace with your actual endpoint

function WebcamEmotion() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const faceMeshRef = useRef(null);
  
  // States for popup and timer
  const [showPopup, setShowPopup] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [timerDuration, setTimerDuration] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [emotionState, setEmotionState] = useState(null);
  const [popupTimeout, setPopupTimeout] = useState(null);
  const [popupCooldown, setPopupCooldown] = useState(false); // State to track popup cooldown
  
  // Refs for tracking state that needs to be accessed synchronously
  const cooldownTimeoutRef = useRef(null); // Ref to store the cooldown timeout ID
  const popupCooldownRef = useRef(false); // Ref to track cooldown state
  const showPopupRef = useRef(false); // Ref to track popup state
  
  // Use a ref to track emotions without storing in state
  const recentEmotionsRef = useRef([]);
  
  // Frame rate limiting - only process 2 frames per second
  const lastFrameTimeRef = useRef(0);
  const FRAME_INTERVAL = 500; // 500ms = 2 frames per second
  
  // Debug counter for tracking processed frames
  const frameCountRef = useRef(0);
  
  // Array of possible popup headings with separate emojis and text
  const popupHeadings = [
    { emoji: "🕊️", text: "Taking a moment might help you refocus." },
    { emoji: "🐢", text: "No rush—smart minds take mindful pauses!" },
    { emoji: "📘", text: "You seem a bit distracted—need a quick pause?" },
    { emoji: "💭", text: "Lost in thought? I got you!" },
    { emoji: "🧠", text: "You seem tense or distracted!"},
    { emoji: "🌥️", text: "Cloudy brain weather detected!" }
  ];
  
  // Function to get a random heading
  const getRandomHeading = () => {
    const randomIndex = Math.floor(Math.random() * popupHeadings.length);
    return popupHeadings[randomIndex];
  };
  
  // State for the current popup heading
  const [currentHeading, setCurrentHeading] = useState({ emoji: "", text: "" });
  
  // Send face image to DeepFace API for emotion detection
  async function analyzeEmotion(faceImageBlob) {
    try {
      // IMPORTANT: First check if timer is active or cooldown is active
      // If either is true, we'll skip emotion processing entirely
      // Use the refs for cooldown and popup to get the most up-to-date values
      const isTimerActive = showTimer;
      const isCooldownActive = popupCooldownRef.current;
      const isPopupShowing = showPopupRef.current;
      const isPopupBlocked = isTimerActive || isCooldownActive || isPopupShowing;
      
      if (isPopupBlocked) {
        console.log("POPUP BLOCKED: " + 
          (isTimerActive ? "Timer active" : 
           (isCooldownActive ? "In cooldown period" : "Popup already showing")));
        return; // Skip emotion processing entirely when blocked
      }
      
      // Real API call to DeepFace server
      const formData = new FormData();
      formData.append("image", faceImageBlob, "face.jpg");

      const response = await fetch(DEEPFACE_API_URL, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Emotion result:", result);
      console.log("Current recentEmotions:", recentEmotionsRef.current);
      
      // Check if the result contains an emotion
      if (result && result.emotion) {
        const currentEmotion = result.emotion;
        
        // Set current emotion state for display in popup
        setEmotionState(currentEmotion);
        
        // Add the current emotion to the ref array
        recentEmotionsRef.current.push(currentEmotion);
        console.log("Adding emotion to array:", currentEmotion);
        console.log("Updated emotions array:", recentEmotionsRef.current);
        
        // ONLY check for popup conditions when we've reached exactly 10 emotions
        if (recentEmotionsRef.current.length === 10) {
          console.log("Reached 10 emotions, performing check:", recentEmotionsRef.current);
          
          // Count unique emotions
          const uniqueEmotions = new Set(recentEmotionsRef.current);
          const uniqueCount = uniqueEmotions.size;
          
          // Find the most common emotion and its count
          const emotionCounts = {};
          recentEmotionsRef.current.forEach(emotion => {
            emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
          });
          
          let mostCommonCount = 0;
          let mostCommonEmotion = null;
          Object.entries(emotionCounts).forEach(([emotion, count]) => {
            if (count > mostCommonCount) {
              mostCommonCount = count;
              mostCommonEmotion = emotion;
            }
          });
          
          console.log("Emotion analysis:", {
            uniqueEmotions: Array.from(uniqueEmotions),
            uniqueCount,
            mostCommonEmotion,
            mostCommonCount,
            emotionCounts
          });
          
          // Show popup if there are 3 or more unique emotions OR
          // if the most common emotion appears less than 50% of the time
          if (uniqueCount >= 3 || mostCommonCount < recentEmotionsRef.current.length / 2) {
            console.log("Showing popup due to emotion variability");
            
            // First, update our ref to prevent race conditions
            showPopupRef.current = true;
            
            // Set a random heading for the popup
            const randomHeading = getRandomHeading();
            setCurrentHeading(randomHeading);
            console.log("Selected random heading:", randomHeading);
            
            // Then set the popup state
            setShowPopup(true);
            
            // Activate cooldown immediately to prevent more popups
            activateCooldown();
            
            // Auto-close popup after 15 seconds if not interacted with
            const timeout = setTimeout(() => {
              setShowPopup(false);
            }, 15000); // 15 seconds
            
            setPopupTimeout(timeout);
          }
          
          // Clear the array after performing the check regardless of whether we showed a popup
          // This ensures we always start collecting a fresh set of 10 emotions
          recentEmotionsRef.current = [];
        }
        
        // We no longer check for non-neutral emotions outside of the 10-emotion check
        // This ensures we only show popups after collecting 10 emotions
      }
    } catch (error) {
      console.error("Emotion API error:", error);
      
      // Check if it's a connection error
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_RESET')) {
        console.warn("DeepFace API server is not running. Please start the server at http://127.0.0.1:5000");
        // You could show a user-friendly message here or set a state to indicate server is down
      }
    }
  }

  // Extract face image from video frame using landmarks bounding box
  function extractFaceImage(video, landmarks) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Calculate bounding box from landmarks
    let minX = 1,
      minY = 1,
      maxX = 0,
      maxY = 0;
    landmarks.forEach((lm) => {
      if (lm.x < minX) minX = lm.x;
      if (lm.y < minY) minY = lm.y;
      if (lm.x > maxX) maxX = lm.x;
      if (lm.y > maxY) maxY = lm.y;
    });

    // Video dimensions
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // Convert normalized coordinates to pixel values
    const boxX = minX * videoWidth;
    const boxY = minY * videoHeight;
    const boxWidth = (maxX - minX) * videoWidth;
    const boxHeight = (maxY - minY) * videoHeight;

    // Set canvas size to bounding box size (with padding)
    const padding = 20;
    canvas.width = boxWidth + padding * 2;
    canvas.height = boxHeight + padding * 2;

    // Draw face region from video to canvas
    ctx.drawImage(
      video,
      boxX - padding,
      boxY - padding,
      boxWidth + padding * 2,
      boxHeight + padding * 2,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/jpeg");
    });
  }

  // Handle timer start
  const startTimer = (minutes) => {
    // Clear any existing popup timeout
    if (popupTimeout) {
      clearTimeout(popupTimeout);
      setPopupTimeout(null);
    }
    
    // Update popup ref first
    showPopupRef.current = false;
    
    // Close popup
    setShowPopup(false);
    
    // Set timer duration and start timer
    const durationInSeconds = minutes * 60;
    setTimerDuration(durationInSeconds);
    setTimeRemaining(durationInSeconds);
    setShowTimer(true);
    
    // Activate cooldown
    activateCooldown();
    
    console.log("Timer started for", minutes, "minutes");
  };
  
  // Function to activate popup cooldown
  const activateCooldown = () => {
    console.log("ACTIVATING POPUP COOLDOWN FOR 1 MINUTE");
    
    // Clear any existing cooldown timeout
    if (cooldownTimeoutRef.current) {
      clearTimeout(cooldownTimeoutRef.current);
      cooldownTimeoutRef.current = null;
    }
    
    // Set cooldown state to true immediately
    setPopupCooldown(true);
    
    // Set timeout to clear cooldown after 1 minute
    cooldownTimeoutRef.current = setTimeout(() => {
      console.log("POPUP COOLDOWN ENDED");
      setPopupCooldown(false);
      cooldownTimeoutRef.current = null;
      
      // We don't clear the emotions array here anymore
      // We want to collect a full 10 emotions before showing another popup
    }, 60000); // 1 minute cooldown
  };
  
  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Timer countdown effect
  useEffect(() => {
    let interval = null;
    
    if (showTimer && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(interval);
            // Timer completed - redirect to chatbot
            setShowTimer(false);
            
            // Activate cooldown after timer completes
            activateCooldown();
            
            // Here you would add code to focus on chatbot
            console.log("Timer completed, redirecting to chatbot...");
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showTimer, timeRemaining]);
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear popup timeout
      if (popupTimeout) {
        clearTimeout(popupTimeout);
      }
      
      // Clear cooldown timeout
      if (cooldownTimeoutRef.current) {
        clearTimeout(cooldownTimeoutRef.current);
      }
    };
  }, [popupTimeout]);

  useEffect(() => {
    if (!videoRef.current) return;

    faceMeshRef.current = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMeshRef.current.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    faceMeshRef.current.onResults(async (results) => {
      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        console.log("No face detected in frame");
        return;
      }

      frameCountRef.current += 1;
      console.log(`Processing frame #${frameCountRef.current} - Face detected`);

      const landmarks = results.multiFaceLandmarks[0];

      // Optional: draw landmarks on canvas
      // const canvasElement = canvasRef.current;
      // const ctx = canvasElement.getContext("2d");
      // canvasElement.width = videoRef.current.videoWidth;
      // canvasElement.height = videoRef.current.videoHeight;

      // ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      // ctx.drawImage(videoRef.current, 0, 0, canvasElement.width, canvasElement.height);

      // // Draw landmarks points
      // for (const lm of landmarks) {
      //   ctx.beginPath();
      //   ctx.arc(lm.x * canvasElement.width, lm.y * canvasElement.height, 2, 0, 2 * Math.PI);
      //   ctx.fillStyle = "red";
      //   ctx.fill();
      // }

      // Extract face image from video frame
      const faceBlob = await extractFaceImage(videoRef.current, landmarks);

      // Send face to DeepFace API (with error handling to prevent stopping the webcam)
      try {
        await analyzeEmotion(faceBlob);
      } catch (error) {
        console.error("Error in emotion analysis, but continuing webcam processing:", error);
        // Continue processing even if emotion analysis fails
      }
    });

    cameraRef.current = new cam.Camera(videoRef.current, {
      onFrame: async () => {
        // Throttle frame processing to 2 frames per second
        const currentTime = Date.now();
        if (currentTime - lastFrameTimeRef.current >= FRAME_INTERVAL) {
          lastFrameTimeRef.current = currentTime;
          console.log("Sending frame to FaceMesh for processing");
          await faceMeshRef.current.send({ image: videoRef.current });
        }
      },
      width: 1920,
      height: 1080,
    });

    cameraRef.current.start();

    return () => {
      cameraRef.current.stop();
    };
  }, []);

  // Keep refs in sync with state
  useEffect(() => {
    console.log("Popup cooldown state changed:", popupCooldown);
    popupCooldownRef.current = popupCooldown;
  }, [popupCooldown]);
  
  useEffect(() => {
    console.log("Popup visibility changed:", showPopup);
    showPopupRef.current = showPopup;
  }, [showPopup]);

  return (
    <div>
      <video
        ref={videoRef}
        style={{ display: "none" }} // Hides the video element
        autoPlay
        muted
        playsInline
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 640,
          height: 480,
          pointerEvents: "none",
        }}
      />
      
      {/* Debug indicators removed */}
      
      {/* Popup notification for stressed emotions */}
      {showPopup && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            width: "350px",
            boxShadow: "0 10px 35px rgba(0, 0, 0, 0.25)",
            borderRadius: "20px",
            padding: "28px",
            zIndex: 1000,
            animation: "popupEntrance 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            backdropFilter: "blur(12px)",
            background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%), url('data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\" fill=\"%23f0f0f0\" fill-opacity=\"0.1\" fill-rule=\"evenodd\"/%3E%3C/svg%3E')",
            backgroundSize: "cover",
            overflow: "hidden",
          }}
        >
          {/* Decorative element - soft glow in corner */}
          <div style={{
            position: "absolute",
            top: "-50px",
            right: "-50px",
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255, 214, 165, 0.6) 0%, rgba(255, 214, 165, 0) 70%)",
            zIndex: -1,
          }}></div>
          
          <div style={{ 
            marginBottom: "18px", 
            fontFamily: "'Poppins', 'Segoe UI', sans-serif",
            fontWeight: "700", 
            fontSize: "22px", 
            display: "flex",
            alignItems: "center",
            letterSpacing: "0.3px",
            lineHeight: "1.4",
            gap: "12px"
          }}>
            <span style={{ 
              fontSize: "26px",
              animation: "pulseText 2s infinite ease-in-out",
            }}>
              {currentHeading.emoji}
            </span>
            <span style={{ 
              background: "linear-gradient(135deg, #6c5ce7 0%, #a363d9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
              animation: "pulseText 2s infinite ease-in-out",
            }}>
              {currentHeading.text}
            </span>
          </div>
          
          <p style={{ 
            marginBottom: "24px", 
            fontFamily: "'Nunito', 'Segoe UI', sans-serif",
            fontSize: "17px",
            lineHeight: "1.6",
            color: "#444",
            animation: "fadeSlideUp 0.6s ease-out forwards",
            animationDelay: "0.2s",
            opacity: 0,
            transform: "translateY(10px)",
            letterSpacing: "0.2px",
          }}>
            ✨ Right-click the tricky part and I'll do some magic!
          </p>
          
          <div style={{ 
            marginBottom: "16px", 
            fontFamily: "'Poppins', 'Segoe UI', sans-serif",
            fontWeight: "600",
            fontSize: "17px",
            color: "#333",
            animation: "fadeSlideUp 0.6s ease-out forwards",
            animationDelay: "0.3s",
            opacity: 0,
            transform: "translateY(10px)"
          }}>
            😌 Need a break? Pick your timer:
          </div>
          
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            gap: "12px",
            animation: "fadeSlideUp 0.6s ease-out forwards",
            animationDelay: "0.4s",
            opacity: 0,
            transform: "translateY(10px)"
          }}>
            <button
              onClick={() => startTimer(2)}
              style={{
                padding: "12px 0",
                flex: 1,
                background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 10px rgba(79, 172, 254, 0.3)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-3px) scale(1.03)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(79, 172, 254, 0.5)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 10px rgba(79, 172, 254, 0.3)";
              }}
            >
              <span style={{ fontSize: "18px" }}>⏱️</span>
              <span>2 min</span>
              <span style={{ fontSize: "11px", opacity: 0.9 }}>Quick recharge</span>
            </button>
            <button
              onClick={() => startTimer(5)}
              style={{
                padding: "12px 0",
                flex: 1,
                background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 10px rgba(67, 233, 123, 0.3)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-3px) scale(1.03)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(67, 233, 123, 0.5)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 10px rgba(67, 233, 123, 0.3)";
              }}
            >
              <span style={{ fontSize: "18px" }}>🌿</span>
              <span>5 min</span>
              <span style={{ fontSize: "11px", opacity: 0.9 }}>Chill reset</span>
            </button>
            <button
              onClick={() => startTimer(10)}
              style={{
                padding: "12px 0",
                flex: 1,
                background: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 10px rgba(161, 140, 209, 0.3)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-3px) scale(1.03)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(161, 140, 209, 0.5)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 10px rgba(161, 140, 209, 0.3)";
              }}
            >
              <span style={{ fontSize: "18px" }}>☁️</span>
              <span>10 min</span>
              <span style={{ fontSize: "11px", opacity: 0.9 }}>Full zen mode</span>
            </button>
          </div>
          
          <button
            onClick={() => {
              // Clear any existing popup timeout
              if (popupTimeout) {
                clearTimeout(popupTimeout);
                setPopupTimeout(null);
              }
              
              // Update ref first
              showPopupRef.current = false;
              
              // Then update state
              setShowPopup(false);
              
              // Activate cooldown after dismissing
              activateCooldown();
              
              console.log("Popup dismissed");
            }}
            style={{
              marginTop: "22px",
              padding: "12px 0",
              width: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.05)",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              color: "#555",
              fontWeight: "600",
              transition: "all 0.3s ease",
              animation: "fadeSlideUp 0.6s ease-out forwards",
              animationDelay: "0.5s",
              opacity: 0,
              transform: "translateY(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span>🔘</span>
            <span>Dismiss</span>
          </button>
        </div>
      )}
      
      {/* Fullscreen timer with darkened background */}
      {showTimer && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, rgba(25, 25, 35, 0.95) 0%, rgba(10, 10, 20, 0.98) 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
            animation: "fadeIn 0.5s ease-in-out",
            backdropFilter: "blur(8px)",
          }}
        >
          {/* Decorative elements */}
          <div style={{
            position: "absolute",
            top: "10%",
            left: "15%",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(108, 92, 231, 0.15) 0%, rgba(108, 92, 231, 0) 70%)",
            animation: "floatButton 8s infinite ease-in-out",
          }}></div>
          
          <div style={{
            position: "absolute",
            bottom: "15%",
            right: "10%",
            width: "250px",
            height: "250px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255, 214, 165, 0.15) 0%, rgba(255, 214, 165, 0) 70%)",
            animation: "floatButton 6s infinite ease-in-out",
            animationDelay: "1s",
          }}></div>
          
          <div style={{
            position: "absolute",
            top: "40%",
            right: "20%",
            width: "180px",
            height: "180px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(67, 233, 123, 0.1) 0%, rgba(67, 233, 123, 0) 70%)",
            animation: "floatButton 7s infinite ease-in-out",
            animationDelay: "0.5s",
          }}></div>
          
          {/* Breathing animation circle */}
          <div style={{
            position: "absolute",
            width: "450px",
            height: "450px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 70%)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            animation: "breathe 4s infinite ease-in-out",
            zIndex: -1,
          }}></div>
          
          {/* Timer display */}
          <div
            style={{
              fontSize: "140px",
              fontWeight: "700",
              color: "#ffffff",
              marginBottom: "30px",
              fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              textShadow: "0 2px 10px rgba(0,0,0,0.2)",
              letterSpacing: "5px",
              textRendering: "optimizeLegibility",
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: "linear-gradient(to bottom, #ffffff, #e0e0e0)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))",
              animation: "softGlow 3s infinite ease-in-out",
            }}
          >
            {formatTime(timeRemaining)}
          </div>
          
          <div style={{ 
            color: "rgba(255, 255, 255, 0.95)", 
            fontSize: "28px", 
            marginBottom: "50px",
            fontWeight: "300",
            fontFamily: "'Nunito', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            textAlign: "center",
            maxWidth: "600px",
            lineHeight: "1.5",
            animation: "fadeSlideUp 0.8s ease-out forwards",
            animationDelay: "0.3s",
            opacity: 0,
            transform: "translateY(10px)",
            textShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}>
            <span style={{ fontSize: "32px", display: "block", marginBottom: "10px" }}>Take a deep breath... 🌬️</span>
            <span style={{ fontSize: "20px", opacity: 0.9, fontWeight: "300" }}>
              Focus on your breathing and clear your mind
            </span>
          </div>
          
          <button
            onClick={() => {
              // Update state
              setShowTimer(false);
              
              // Activate cooldown after timer is canceled
              activateCooldown();
              
              // Here you would add code to focus on chatbot
              console.log("Timer stopped, redirecting to chatbot...");
            }}
            style={{
              padding: "16px 36px",
              background: "linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)",
              color: "white",
              border: "none",
              borderRadius: "30px",
              cursor: "pointer",
              fontSize: "18px",
              fontWeight: "bold",
              fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              boxShadow: "0 4px 15px rgba(255, 126, 95, 0.4)",
              transition: "all 0.3s ease",
              animation: "fadeSlideUp 0.8s ease-out forwards",
              animationDelay: "0.5s",
              opacity: 0,
              transform: "translateY(10px)",
              letterSpacing: "0.5px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-3px) scale(1.03)";
              e.currentTarget.style.boxShadow = "0 7px 20px rgba(255, 126, 95, 0.6)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 15px rgba(255, 126, 95, 0.4)";
            }}
          >
            <span>✨</span>
            <span>Return to Work</span>
          </button>
        </div>
      )}
      
      {/* Add CSS animations */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes popupEntrance {
            0% { opacity: 0; transform: scale(0.9) translateY(-20px); box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1); }
            70% { opacity: 1; transform: scale(1.03) translateY(0); box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3); }
            100% { opacity: 1; transform: scale(1) translateY(0); box-shadow: 0 10px 35px rgba(0, 0, 0, 0.25); }
          }
          
          @keyframes fadeSlideUp {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes pulseText {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.9; transform: scale(1.02); }
            100% { opacity: 1; transform: scale(1); }
          }
          
          @keyframes floatButton {
            0% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
            100% { transform: translateY(0); }
          }
          
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          
          @keyframes softGlow {
            0% { box-shadow: 0 0 10px rgba(255, 255, 255, 0.5); }
            50% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.8); }
            100% { box-shadow: 0 0 10px rgba(255, 255, 255, 0.5); }
          }
          
          @keyframes breathe {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          
          @font-face {
            font-family: 'Poppins';
            font-style: normal;
            font-weight: 400;
            src: url(https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecg.woff2) format('woff2');
          }
          
          @font-face {
            font-family: 'Nunito';
            font-style: normal;
            font-weight: 400;
            src: url(https://fonts.gstatic.com/s/nunito/v25/XRXI3I6Li01BKofiOc5wtlZ2di8HDLshdTQ3jw.woff2) format('woff2');
          }
        `}
      </style>
    </div>
  );
}

export default WebcamEmotion;
