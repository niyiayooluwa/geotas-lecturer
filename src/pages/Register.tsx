import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, CheckCircle2, Circle } from "lucide-react"

export default function Register() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [department, setDepartment] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const isLengthValid = password.length >= 8
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^a-zA-Z0-9]/.test(password)

  const isPasswordValid = isLengthValid && hasUpper && hasNumber && hasSpecial

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    if (!isPasswordValid) {
      setError("Please ensure your password meets all requirements.")
      return
    }

    setLoading(true)

    try {
      await api.post("/auth/register", {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        department,
      })
      
      navigate("/login", { state: { message: "Registration successful. Please login." } })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("An unexpected error occurred during registration.")
      }
    } finally {
      setLoading(false)
    }
  }

  const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-sm transition-colors ${met ? 'text-green-600' : 'text-neutral-500'}`}>
      {met ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      <span>{text}</span>
    </div>
  )

  const isEmailError = error.toLowerCase().includes("email")

  return (
    <div className="w-full pb-8">
      <p className="text-sm font-medium text-neutral-500 mb-2 uppercase tracking-wider">Lecturer portal</p>
      <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 mb-2">Create an account</h2>
      <p className="text-neutral-500 mb-8">Sign up to manage your courses and track attendance.</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && !isEmailError && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-neutral-700">First Name</Label>
            <Input 
              id="firstName" 
              required 
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-neutral-700">Last Name</Label>
            <Input 
              id="lastName" 
              required 
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="department" className="text-neutral-700">Department</Label>
          <Input 
            id="department" 
            required 
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="h-11"
            placeholder="e.g. Computer Science"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className={isEmailError ? "text-red-600" : "text-neutral-700"}>
            University Email (.edu.ng)
          </Label>
          <Input 
            id="email" 
            type="email" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`h-11 ${isEmailError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            placeholder="e.g. jdoe@uni.edu.ng"
          />
          {isEmailError && (
            <p className="text-sm font-medium text-red-600 mt-1">{error}</p>
          )}
        </div>
        
        <div className="space-y-4">
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
            
            {/* Password visual feedback */}
            <div className="pt-2 grid grid-cols-2 gap-y-2">
              <RequirementItem met={isLengthValid} text="At least 8 characters" />
              <RequirementItem met={hasUpper} text="1 uppercase letter" />
              <RequirementItem met={hasNumber} text="1 number" />
              <RequirementItem met={hasSpecial} text="1 special character" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-neutral-700">Confirm Password</Label>
            <div className="relative">
              <Input 
                id="confirmPassword" 
                type={showConfirmPassword ? "text" : "password"} 
                required 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 pr-10"
              />
              <button 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" className="w-full h-11 text-base bg-neutral-900 hover:bg-neutral-800" disabled={loading}>
            {loading ? "Creating account..." : "Sign up for dashboard"}
          </Button>
        </div>
      </form>

      <div className="mt-8 text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-neutral-900 hover:text-neutral-700">
          Sign in
        </Link>
      </div>
    </div>
  )
}
