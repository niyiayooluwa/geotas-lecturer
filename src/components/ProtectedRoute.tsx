import { Navigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: "lecturer" | "student"
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-neutral-950">
        <p className="text-neutral-400 animate-pulse font-medium">Verifying access...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user.role !== requiredRole) {
    // If they don't have the right role (e.g. a student trying to view lecturer screens), boot them to dashboard
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
