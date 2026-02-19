import React from "react";

export function StarBorder({ children, color }: { children: React.ReactNode; color: string }) {
    return (
        <div className="star-border-container">
            <style jsx>{`
                .star-border-container { display: inline-block; position: relative; border-radius: 10px; overflow: hidden; padding: 1px; }
                .border-gradient-bottom { position: absolute; width: 300%; height: 50%; opacity: 0.7; bottom: -12px; right: -250%; border-radius: 50%; background: radial-gradient(circle, ${color}, transparent 10%); animation: star-bottom 4s linear infinite alternate; z-index: 0; }
                .border-gradient-top { position: absolute; opacity: 0.7; width: 300%; height: 50%; top: -12px; left: -250%; border-radius: 50%; background: radial-gradient(circle, ${color}, transparent 10%); animation: star-top 4s linear infinite alternate; z-index: 0; }
                .inner-content { position: relative; border: 1px solid ${color}40; background: rgba(0,0,0,0.95); border-radius: 10px; z-index: 1; }
                @keyframes star-bottom { 0% { transform: translateX(0%); opacity: 1; } 100% { transform: translateX(-100%); opacity: 0; } }
                @keyframes star-top { 0% { transform: translateX(0%); opacity: 1; } 100% { transform: translateX(100%); opacity: 0; } }
            `}</style>
            <div className="border-gradient-bottom" />
            <div className="border-gradient-top" />
            <div className="inner-content">{children}</div>
        </div>
    );
}
