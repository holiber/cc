import type { CollectionConfig } from 'payload'

function isAdmin(req: any): boolean {
    return req?.user?.role === 'admin'
}

export const Projects: CollectionConfig = {
    slug: 'projects',
    admin: {
        useAsTitle: 'name',
    },
    access: {
        create: ({ req }) => isAdmin(req),
        update: ({ req }) => isAdmin(req),
        delete: ({ req }) => isAdmin(req),
        read: ({ req }) => {
            if (!req.user) return false
            if (isAdmin(req)) return true
            return {
                members: {
                    contains: req.user.id,
                },
            }
        },
    },
    fields: [
        {
            name: 'name',
            type: 'text',
            required: true,
            unique: true,
            index: true,
        },
        {
            name: 'slug',
            type: 'text',
            required: true,
            unique: true,
            index: true,
        },
        {
            name: 'description',
            type: 'textarea',
        },
        {
            name: 'members',
            type: 'relationship',
            relationTo: 'users',
            hasMany: true,
        },
    ],
}

