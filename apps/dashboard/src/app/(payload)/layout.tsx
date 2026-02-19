import React from 'react'

/* Payload's RootLayout already renders <html> and <body>.
 * This layout must NOT add its own to avoid hydration errors. */
export default function PayloadLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
