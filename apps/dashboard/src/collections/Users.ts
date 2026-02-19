import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
    slug: 'users',
    auth: true,
    admin: {
        useAsTitle: 'email',
    },
    fields: [
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
