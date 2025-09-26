import React from 'react';

const LoadingDots = ({
    fullScreen = true,
    backgroundColor = 'white'
}) => {
    const containerStyle = {
        minHeight: fullScreen ? '100vh' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: backgroundColor
    };

    const dotStyle = {
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        position: 'absolute',
        animation: 'waveMove 2.4s ease-in-out infinite'
    };

    return (
        <>
            <style>
                {`
          @keyframes waveMove {
            0% { transform: translateX(0) scale(1); opacity: 1; }
            25% { transform: translateX(40px) scale(1.2); opacity: 0.8; }
            50% { transform: translateX(80px) scale(1); opacity: 1; }
            75% { transform: translateX(40px) scale(0.8); opacity: 0.6; }
            100% { transform: translateX(0) scale(1); opacity: 1; }
          }
        `}
            </style>
            <div style={containerStyle}>
                <div style={{ position: 'relative', width: '96px', height: '32px', display: 'flex', alignItems: 'center' }}>
                    <div
                        style={{ ...dotStyle, backgroundColor: '#3b82f6', animationDelay: '0s' }}
                    ></div>
                    <div
                        style={{ ...dotStyle, backgroundColor: '#facc15', animationDelay: '0.8s' }}
                    ></div>
                    <div
                        style={{ ...dotStyle, backgroundColor: '#22c55e', animationDelay: '1.6s' }}
                    ></div>
                </div>
            </div>
        </>
    );
};

export default LoadingDots;