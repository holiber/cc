import configPromise from '@/payload.config'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import type { ServerFunctionClient } from 'payload'
import React from 'react'

import '@payloadcms/next/css'
import { importMap } from './importMap'

type Args = {
    children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
    'use server'
    return handleServerFunctions({
        ...args,
        config: configPromise,
        importMap,
    })
}

const Layout = ({ children }: Args) => (
    <RootLayout config={configPromise} importMap={importMap} serverFunction={serverFunction}>
        {children}
    </RootLayout>
)

export default Layout
