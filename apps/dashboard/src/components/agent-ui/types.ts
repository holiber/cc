import React from 'react';

export interface WorkerAgent {
    id: string;
    name: string;
    color: string;
    icon: React.ElementType; // Using React.ElementType for icons
    currentFile: string | null;
    currentTask: string;
    thought: string;
    isWorking: boolean;
    linesAdded: number;
    linesRemoved: number;
    yPosition: number;
}
