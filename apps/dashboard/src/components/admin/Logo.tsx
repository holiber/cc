import React from 'react'

/**
 * Custom logo shown on the Payload admin login page.
 * Replaces the default Payload logo to avoid exposing backend info.
 */
export default function Logo() {
    return (
        <span style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '-0.5px',
        }}>
            CenterC
        </span>
    )
}
