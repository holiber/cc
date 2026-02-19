"use client";

import { useState, useEffect } from "react";

const STORYBOOK_PORT = process.env.NEXT_PUBLIC_STORYBOOK_PORT || "6006";

/**
 * Returns the Storybook URL based on the current hostname.
 * During SSR / first render returns "#" so no hydration mismatch occurs,
 * then updates to the real URL after mount.
 */
export function useStorybookUrl(): string {
    const [url, setUrl] = useState("#");

    useEffect(() => {
        setUrl(`http://${window.location.hostname}:${STORYBOOK_PORT}`);
    }, []);

    return url;
}
