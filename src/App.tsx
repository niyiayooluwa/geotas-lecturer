import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import AuthLayout from "./pages/AuthLayout"
import Login from "./pages/Login"
import Register from "./pages/Register"
import DashboardLayout from "./pages/DashboardLayout"
import Dashboard from "./pages/Dashboard"
import CourseView from "./pages/CourseView"
import ProtectedRoute from "./components/ProtectedRoute"
import LiveSession from "./pages/LiveSession"

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AuthLayout><Outlet /></AuthLayout>}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
          
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/courses/:id" element={<CourseView />} />
          </Route>
          
          <Route path="/sessions/:id/live" element={
            <ProtectedRoute requiredRole="lecturer">
              <LiveSession />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
