// ─── A2A-Inspired Message Types ─────────────────────────────

export type MessageType = 'text' | 'event' | 'progress' | 'artifact'
export type ArtifactKind = 'image' | 'video' | 'markdown' | 'mdx' | 'typescript' | 'javascript'
export type EventStatus = 'submitted' | 'working' | 'completed' | 'failed'
export type SenderRole = 'user' | 'agent' | 'system' | 'stranger' | 'coder'
export type MessageSource = 'github' | 'gitea' | 'email' | 'telegram' | 'mattermost'

export interface Sender {
    name: string
    role: SenderRole
    avatar?: string
}

export interface MessageArtifact {
    kind: ArtifactKind
    name: string
    url: string
    preview?: string
    size?: string
    language?: string
}

export interface MessageEvent {
    status: EventStatus
    taskId: string
    taskName: string
    detail?: string
}

export interface MessageProgress {
    current: number
    total: number
    label: string
}

export interface Message {
    id: string
    type: MessageType
    from: Sender
    timestamp: Date
    read: boolean
    subject?: string
    text?: string
    event?: MessageEvent
    progress?: MessageProgress
    artifacts?: MessageArtifact[]
    source?: MessageSource
    project?: string
}

// ─── Mock Data ──────────────────────────────────────────────

// Fixed timestamps to avoid SSR/client hydration mismatch
// (dynamic Date.now() calls at module-load differ between server and client)
const ts = (isoString: string) => new Date(isoString)

export const mockMessages: Message[] = [
    {
        id: 'msg-001',
        type: 'text',
        from: { name: 'Orchestrator', role: 'agent' },
        timestamp: ts('2026-02-19T09:15:00Z'),
        read: false,
        subject: 'Sprint Planning Complete',
        text: 'I\'ve completed the sprint planning for this week. Here\'s a summary:\n\n- **12 tasks** assigned across 3 agents\n- **4 high-priority** items flagged for immediate attention\n- Estimated completion: **Friday 5pm**\n\nLet me know if you\'d like to adjust any priorities.',
        source: 'mattermost',
        project: 'CommandCenter',
    },
    {
        id: 'msg-002',
        type: 'event',
        from: { name: 'Coder Agent', role: 'agent' },
        timestamp: ts('2026-02-19T09:12:00Z'),
        read: false,
        subject: 'Auth Module Refactor',
        event: {
            status: 'working',
            taskId: 'TASK-142',
            taskName: 'Refactor authentication middleware',
            detail: 'Currently updating JWT validation logic and adding refresh token rotation.',
        },
        source: 'github',
        project: 'workflow-viz',
    },
    {
        id: 'msg-003',
        type: 'artifact',
        from: { name: 'Architect', role: 'agent' },
        timestamp: ts('2026-02-19T09:05:00Z'),
        read: false,
        subject: 'Database Schema v2',
        text: 'Here are the updated schema diagrams and migration scripts for the new data model.',
        artifacts: [
            { kind: 'image', name: 'schema-diagram.png', url: '#', preview: 'ER diagram showing users, messages, and artifacts tables', size: '245 KB' },
            { kind: 'typescript', name: 'migration-001.ts', url: '#', size: '3.2 KB', language: 'typescript' },
            { kind: 'markdown', name: 'CHANGELOG.md', url: '#', size: '1.1 KB' },
        ],
        source: 'gitea',
        project: 'workflow-viz',
    },
    {
        id: 'msg-004',
        type: 'progress',
        from: { name: 'System', role: 'system' },
        timestamp: ts('2026-02-19T09:02:00Z'),
        read: true,
        subject: 'Deployment Pipeline',
        progress: { current: 7, total: 10, label: 'Building containers' },
        text: 'Deployment to staging is in progress. 3 containers remaining.',
        project: 'infrastructure',
    },
    {
        id: 'msg-005',
        type: 'event',
        from: { name: 'Reviewer', role: 'agent' },
        timestamp: ts('2026-02-19T08:52:00Z'),
        read: true,
        subject: 'Code Review: PR #87',
        event: {
            status: 'completed',
            taskId: 'TASK-139',
            taskName: 'Review API endpoint changes',
            detail: 'All checks passed. 2 minor suggestions left as comments. Approved for merge.',
        },
        project: 'workflow-viz',
    },
    {
        id: 'msg-006',
        type: 'text',
        from: { name: 'Alex', role: 'user' },
        timestamp: ts('2026-02-19T08:47:00Z'),
        read: true,
        subject: 'Re: Performance Issues',
        text: 'Thanks for the analysis. Let\'s focus on the database query optimization first, then tackle the frontend bundle size.\n\nCan the Coder Agent start on the query changes today?',
        source: 'email',
        project: 'CommandCenter',
    },
    {
        id: 'msg-007',
        type: 'artifact',
        from: { name: 'Coder Agent', role: 'agent' },
        timestamp: ts('2026-02-19T08:32:00Z'),
        read: true,
        subject: 'Component Library Update',
        text: 'Finished implementing the new button variants and form components.',
        artifacts: [
            { kind: 'typescript', name: 'Button.tsx', url: '#', size: '4.8 KB', language: 'tsx' },
            { kind: 'typescript', name: 'Input.tsx', url: '#', size: '3.1 KB', language: 'tsx' },
            { kind: 'javascript', name: 'theme.config.js', url: '#', size: '1.5 KB', language: 'javascript' },
            { kind: 'image', name: 'component-preview.png', url: '#', preview: 'Preview showing all new button variants', size: '180 KB' },
        ],
        project: 'design-system',
    },
    {
        id: 'msg-008',
        type: 'event',
        from: { name: 'System', role: 'system' },
        timestamp: ts('2026-02-19T08:17:00Z'),
        read: true,
        subject: 'CI Pipeline Failed',
        event: {
            status: 'failed',
            taskId: 'CI-2891',
            taskName: 'Integration test suite',
            detail: 'Test "auth.login" failed: expected 200 but received 401. Build #2891.',
        },
    },
    {
        id: 'msg-009',
        type: 'progress',
        from: { name: 'Orchestrator', role: 'agent' },
        timestamp: ts('2026-02-19T07:47:00Z'),
        read: true,
        subject: 'Knowledge Base Sync',
        progress: { current: 10, total: 10, label: 'Indexing complete' },
        text: 'Successfully indexed 847 documents across 12 collections.',
        project: 'knowledge-base',
    },
    {
        id: 'msg-010',
        type: 'text',
        from: { name: 'Architect', role: 'agent' },
        timestamp: ts('2026-02-19T07:17:00Z'),
        read: true,
        subject: 'Architecture Decision: Message Queue',
        text: 'After evaluating the options, I recommend using **BullMQ** over RabbitMQ for our use case:\n\n1. **Redis-backed** — we already have Redis in the stack\n2. **TypeScript native** — better DX for the team\n3. **Job scheduling** — built-in cron and delayed jobs\n4. **Dashboard** — Bull Board for monitoring\n\nThe trade-off is slightly less throughput vs RabbitMQ, but our projected load (< 10k msgs/min) is well within BullMQ capacity.',
    },
    {
        id: 'msg-011',
        type: 'artifact',
        from: { name: 'System', role: 'system' },
        timestamp: ts('2026-02-19T06:17:00Z'),
        read: true,
        subject: 'Daily Report — Feb 19',
        text: 'Automated daily report generated.',
        artifacts: [
            { kind: 'markdown', name: 'daily-report-feb19.md', url: '#', size: '8.3 KB' },
            { kind: 'image', name: 'metrics-chart.png', url: '#', preview: 'Bar chart showing task completion rates by agent', size: '92 KB' },
        ],
    },
    {
        id: 'msg-012',
        type: 'event',
        from: { name: 'Coder Agent', role: 'agent' },
        timestamp: ts('2026-02-19T05:17:00Z'),
        read: true,
        subject: 'Feature: User Avatars',
        event: {
            status: 'completed',
            taskId: 'TASK-135',
            taskName: 'Implement avatar upload and generation',
            detail: 'Added duck-themed avatar generation, image upload, and Payload CMS integration.',
        },
    },
    {
        id: 'msg-013',
        type: 'artifact',
        from: { name: 'Coder Agent', role: 'agent' },
        timestamp: ts('2026-02-19T04:17:00Z'),
        read: true,
        subject: 'Video: Terminal Integration Demo',
        text: 'Recorded a quick demo of the new terminal integration in CommandCenter.',
        artifacts: [
            { kind: 'video', name: 'terminal-demo.webm', url: '#', size: '4.2 MB' },
            { kind: 'mdx', name: 'terminal-docs.mdx', url: '#', size: '2.1 KB' },
        ],
    },
    {
        id: 'msg-014',
        type: 'text',
        from: { name: 'Alex', role: 'user' },
        timestamp: ts('2026-02-19T03:17:00Z'),
        read: true,
        subject: 'Weekend Deployment Plan',
        text: 'Let\'s plan the production deployment for Saturday morning:\n\n1. Backup current DB\n2. Run migrations\n3. Deploy new containers\n4. Smoke test all endpoints\n5. Monitor for 2 hours\n\nOrchestrator, can you prepare the runbook?',
        source: 'telegram',
        project: 'infrastructure',
    },
    {
        id: 'msg-015',
        type: 'event',
        from: { name: 'Orchestrator', role: 'agent' },
        timestamp: ts('2026-02-19T03:17:00Z'),
        read: true,
        subject: 'Task Assignment',
        event: {
            status: 'submitted',
            taskId: 'TASK-150',
            taskName: 'Prepare deployment runbook',
            detail: 'Assigned to Orchestrator. Estimated time: 30 minutes.',
        },
    },
]

export function getUnreadCount(): number {
    return mockMessages.filter(m => !m.read).length
}
