interface ProtectedRouteProps {
  children: React.ReactNode
}

/** Renders children. Login has been removed; this component is kept for API compatibility. */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return <>{children}</>
}
