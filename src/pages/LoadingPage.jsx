import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./LoadingPage.css";

const LoadingPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user_id } = location.state || {};
    const [showSecondLine, setShowSecondLine] = useState(false);

    useEffect(() => {
        const secondLineTimer = setTimeout(() => {
            setShowSecondLine(true);
        }, 1000);

        const navigateTimer = setTimeout(() => {
            if (user_id) {
                navigate("/Dashboard", { state: { user_id } });
            }
        }, 3000);

        return () => {
            clearTimeout(secondLineTimer);
            clearTimeout(navigateTimer);
        };
    }, [navigate, user_id]);

    return (
        <div className="loading-container">
            <div className="loading-content">
                <h1 className="loading-title">SamaVeda</h1>
                <div className="loading-text">
                    <p className={`line one`}>Loading your AI Learning Assistant...</p>
                    {showSecondLine && <p className={`line two`}>Preparing your personalized experience...</p>}
                </div>
            </div>
        </div>
    );
};

export default LoadingPage;
