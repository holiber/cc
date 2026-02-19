/* Root layout is intentionally minimal.
 * App chrome (Sidebar, fonts) is in (app)/layout.tsx.
 * Payload admin has its own layout in (payload)/layout.tsx.
 * This prevents React hydration mismatches (#418).
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
