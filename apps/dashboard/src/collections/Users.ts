import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
    slug: 'users',
    auth: true,
    admin: {
        useAsTitle: 'email',
    },
    hooks: {
        beforeValidate: [
            ({ data }) => {
                if (!data) return data
                if (!data.username && typeof data.email === 'string' && data.email.includes('@')) {
                    data.username = data.email.split('@')[0]
                }
                if (typeof data.username === 'string') {
                    data.username = data.username.trim().toLowerCase()
                }
                return data
            },
        ],
    },
    fields: [
        {
            name: 'username',
            type: 'text',
            required: false,
            unique: true,
            index: true,
        },
        {
            name: 'role',
            type: 'select',
            required: true,
            defaultValue: 'worker',
            options: [
                { label: 'Admin', value: 'admin' },
                { label: 'Orchestrator', value: 'orchestrator' },
                { label: 'Worker', value: 'worker' },
            ],
        },
        {
            name: 'displayName',
            type: 'text',
            label: 'Display Name',
        },
        {
            name: 'avatar',
            type: 'upload',
            relationTo: 'media',
        },
    ],
}
