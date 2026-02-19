import React from 'react'

// File tree types
export type FileStatus = "unchanged" | "added" | "modified" | "deleted"

export interface FileNode {
    name: string
    type: "file" | "folder"
    status?: FileStatus
    children?: FileNode[]
    expanded?: boolean
    path?: string
}

// Todo types
export interface TodoItem {
    id: string
    text: string
    status: "pending" | "in_progress" | "done"
    assignee?: string
    children?: TodoItem[]
}

// Agent types
export interface WorkerAgent {
    id: string
    name: string
    color: string
    icon: React.ElementType
    currentFile: string | null
    currentTask: string
    thought: string
    isWorking: boolean
    linesAdded: number
    linesRemoved: number
    yPosition: number
}

// Chat types
export interface ChatMessage {
    role: "user" | "system" | "worker" | "orchestrator"
    text: string
}
