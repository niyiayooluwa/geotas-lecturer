import { useState } from "react"
import { useNavigate, Link, useLocation } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const successMessage = location.state?.message

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const data = await api.post<{ token: string, id: string, first_name: string, last_name: string, email: string, role: string }>("/auth/login", {
        email,
        password,
      })
      
      login(data.token, {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        role: data.role,
      })
      
      navigate("/")
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("An unexpected error occurred during login")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <p className="text-sm font-medium text-neutral-500 mb-2 uppercase tracking-wider">Lecturer portal</p>
      <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 mb-2">Welcome back</h2>
      <p className="text-neutral-500 mb-8">Sign in with your email and password to access your dashboard.</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {successMessage && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="email" className="text-neutral-700">Email Address</Label>
          <Input 
            id="email" 
            type="email" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
            placeholder="e.g. jdoe@uni.edu.ng"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password" className="text-neutral-700">Password</Label>
          <div className="relative">
            <Input 
              id="password" 
              type={showPassword ? "text" : "password"} 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 pr-10"
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" className="w-full h-11 text-base bg-neutral-900 hover:bg-neutral-800" disabled={loading}>
            {loading ? "Signing in..." : "Sign in to dashboard"}
          </Button>
        </div>
      </form>

      <div className="mt-8 text-center text-sm text-neutral-500">
        Don't have an account?{" "}
        <Link to="/register" className="font-semibold text-neutral-900 hover:text-neutral-700">
          Sign up
        </Link>
      </div>
    </div>
  )
}
