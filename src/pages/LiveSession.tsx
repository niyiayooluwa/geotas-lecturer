import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ArrowLeft, XCircle, RefreshCw, Sun, Moon } from "lucide-react"
import QRCode from "react-qr-code"

const FOREGROUND_COLORS = [
  "#ffffff", // 1 (Brightest)
  "#f5f5f5", // 2
  "#e5e5e5", // 3
  "#d4d4d4", // 4
  "#a3a3a3", // 5 (Default)
  "#737373", // 6
  "#525252", // 7
  "#404040", // 8
  "#262626", // 9
  "#171717"  // 10 (Darkest)
];

export default function LiveSession() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [token, setToken] = useState<string>("")
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [totalTime, setTotalTime] = useState(30)
  const [countdown, setCountdown] = useState(30)
  const [error, setError] = useState("")
  
  const [otpToken, setOtpToken] = useState<string>("")
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null)
  const [otpTotalTime, setOtpTotalTime] = useState(60)
  const [otpCountdown, setOtpCountdown] = useState(60)
  const [otpError, setOtpError] = useState("")
  
  const [isClosing, setIsClosing] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  
  const [contrastLevel, setContrastLevel] = useState(4) // Index 4 is #a3a3a3

  const fetchToken = async () => {
    try {
      const data = await api.get<any>(`/sessions/${id}/qr-token`)
      const tokenValue = data.qr_content || data.qr_token || data.token || data.code || (typeof data === 'string' ? data : "")
      
      if (!tokenValue) throw new Error("Received empty token from server")
      
      if (data.expires_at) {
        const target = new Date(data.expires_at).getTime()
        setExpiresAt(target)
        setTotalTime(Math.max(1, Math.floor((target - Date.now()) / 1000)))
      } else if (data.expires_in_seconds) {
        setExpiresAt(Date.now() + (data.expires_in_seconds * 1000))
        setTotalTime(data.expires_in_seconds)
      } else {
        setExpiresAt(Date.now() + 30000)
        setTotalTime(30)
      }
      
      setToken(tokenValue)
      setError("")
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("Failed to fetch live QR token")
    }
  }

  const fetchOtp = async () => {
    try {
      const data = await api.get<any>(`/sessions/${id}/otp-token`)
      const tokenValue = data.otp_code || data.otp || data.token || data.code || (typeof data === 'string' ? data : "")
      
      if (!tokenValue) throw new Error("Received empty OTP from server")
      
      if (data.expires_at) {
        const target = new Date(data.expires_at).getTime()
        setOtpExpiresAt(target)
        setOtpTotalTime(Math.max(1, Math.floor((target - Date.now()) / 1000)))
      } else if (data.expires_in_seconds) {
        setOtpExpiresAt(Date.now() + (data.expires_in_seconds * 1000))
        setOtpTotalTime(data.expires_in_seconds)
      } else {
        setOtpExpiresAt(Date.now() + 60000)
        setOtpTotalTime(60)
      }
      
      setOtpToken(tokenValue)
      setOtpError("")
    } catch (err) {
      if (err instanceof ApiError) setOtpError(err.message)
      else setOtpError("Failed to fetch live OTP")
    }
  }

  useEffect(() => {
    if (id) {
      fetchToken()
      fetchOtp()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Exact countdown calculation that never drifts
  useEffect(() => {
    if (!expiresAt) return
    
    const tick = () => {
      const diff = Math.floor((expiresAt - Date.now()) / 1000)
      if (diff <= 0) {
        setCountdown(0)
        fetchToken()
      } else {
        setCountdown(diff)
      }
    }
    
    tick() // call immediately
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt])

  // Exact countdown calculation for OTP
  useEffect(() => {
    if (!otpExpiresAt) return
    
    const tick = () => {
      const diff = Math.floor((otpExpiresAt - Date.now()) / 1000)
      if (diff <= 0) {
        setOtpCountdown(0)
        fetchOtp()
      } else {
        setOtpCountdown(diff)
      }
    }
    
    tick() // call immediately
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpExpiresAt])

  const handleCloseSession = async () => {
    setIsClosing(true)
    try {
      await api.patch(`/sessions/${id}/close`, {})
      navigate(-1) // go back on success
    } catch (err) {
      if (err instanceof ApiError) setError("Close Session Failed: " + err.message)
      else setError("Close Session Failed: " + String(err))
      setIsClosing(false)
      setShowCloseModal(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Custom Close Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Close Session?</h2>
            <p className="text-neutral-400 mb-8">
              Are you sure you want to end this attendance session? Students will no longer be able to scan in.
            </p>
            <div className="flex justify-end gap-4">
              <Button variant="ghost" className="text-neutral-400 hover:text-white hover:bg-neutral-800" onClick={() => setShowCloseModal(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleCloseSession} disabled={isClosing}>
                {isClosing ? "Closing..." : "Yes, Close Session"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top Controls */}
      <Button 
        variant="ghost" 
        className="absolute top-4 left-4 z-50 text-neutral-400 hover:text-white hover:bg-neutral-900"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      
      <Button 
        variant="destructive" 
        className="absolute top-4 right-4 z-50"
        onClick={() => setShowCloseModal(true)}
      >
        <XCircle className="mr-2 h-4 w-4" /> 
        Close Session
      </Button>

      {/* Contrast / Darkness Widget */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center bg-neutral-900/50 p-3 rounded-full border border-neutral-800 backdrop-blur-md z-50 gap-2">
        <Sun className="h-4 w-4 text-neutral-400 mb-1" />
        {FOREGROUND_COLORS.map((color, index) => (
          <button
            key={index}
            onClick={() => setContrastLevel(index)}
            className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
              contrastLevel === index 
                ? "border-blue-500 scale-125 z-10 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                : "border-transparent hover:scale-110"
            }`}
            style={{ backgroundColor: color }}
            title={`Brightness Level ${10 - index}`}
          />
        ))}
        <Moon className="h-4 w-4 text-neutral-500 mt-1" />
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-12 w-full max-w-7xl h-full flex-1 p-8 pt-20">
        
        {/* QR Section */}
        <div className="flex flex-col items-center justify-center flex-1 max-w-2xl w-full h-full relative">
          {error ? (
            <div className="flex flex-col items-center justify-center w-full aspect-square max-h-[80vh] text-center bg-neutral-900/50 rounded-3xl border border-red-900/50 p-8">
              <RefreshCw className="h-16 w-16 text-red-500 mb-6 animate-spin" />
              <p className="text-red-500 font-medium text-xl">{error}</p>
              <Button variant="outline" className="mt-8 border-red-500 text-red-500 hover:bg-red-950" onClick={fetchToken}>Retry</Button>
            </div>
          ) : !token ? (
            <div className="flex flex-col items-center justify-center w-full aspect-square max-h-[80vh] bg-neutral-900 rounded-3xl">
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-64 h-64 bg-neutral-800 rounded-lg mb-8"></div>
                <p className="text-neutral-500 font-medium text-lg">Generating secure QR...</p>
              </div>
            </div>
          ) : (
            <div className="relative w-full aspect-square max-h-[80vh] flex items-center justify-center p-8 bg-black">
              <QRCode 
                value={token} 
                size={256}
                style={{ height: "100%", width: "100%" }}
                bgColor="#000000"
                fgColor={FOREGROUND_COLORS[contrastLevel]}
                level="H"
              />
            </div>
          )}
          
          {token && !error && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-neutral-900/60 backdrop-blur-xl px-5 py-3 rounded-full border border-neutral-800 shadow-2xl">
              <div className="relative flex items-center justify-center w-12 h-12">
                <svg className="w-12 h-12 -rotate-90">
                  <circle 
                    cx="24" cy="24" r="22" 
                    className="stroke-neutral-800" 
                    strokeWidth="1.5" fill="transparent" 
                  />
                  <circle 
                    cx="24" cy="24" r="22" 
                    className="stroke-blue-500 transition-all duration-1000 ease-linear" 
                    strokeWidth="1.5" fill="transparent" 
                    strokeDasharray={2 * Math.PI * 22}
                    strokeDashoffset={(2 * Math.PI * 22) - ((countdown / totalTime) * (2 * Math.PI * 22))}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-sm font-light text-white">
                  {countdown}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-neutral-200 text-sm font-medium tracking-wide">Rotating QR</span>
                <span className="text-neutral-500 text-xs">Anti-cheat synchronization</span>
              </div>
            </div>
          )}
        </div>

        {/* OTP Section */}
        <div className="flex flex-col items-center justify-center bg-neutral-900/40 rounded-3xl p-10 border border-neutral-800/50 flex-none w-full max-w-sm relative">
          <h3 className="text-neutral-400 font-medium mb-8 text-center text-lg">Manual Entry Code</h3>
          
          {otpError ? (
            <div className="flex flex-col items-center">
              <p className="text-red-500 font-medium text-center">{otpError}</p>
              <Button variant="ghost" className="mt-4 text-red-400" onClick={fetchOtp}>Retry</Button>
            </div>
          ) : !otpToken ? (
            <div className="animate-pulse h-24 w-48 bg-neutral-800 rounded-xl mb-4"></div>
          ) : (
            <div className="text-7xl font-bold tracking-[0.2em] text-white text-center font-mono">
              {otpToken}
            </div>
          )}
          
          {otpToken && !otpError && (
            <div className="mt-12 flex items-center gap-4 bg-neutral-900/60 backdrop-blur-xl px-5 py-3 rounded-full border border-neutral-800 shadow-xl">
              <div className="relative flex items-center justify-center w-10 h-10">
                <svg className="w-10 h-10 -rotate-90">
                  <circle 
                    cx="20" cy="20" r="18" 
                    className="stroke-neutral-800" 
                    strokeWidth="1.5" fill="transparent" 
                  />
                  <circle 
                    cx="20" cy="20" r="18" 
                    className="stroke-amber-500 transition-all duration-1000 ease-linear" 
                    strokeWidth="1.5" fill="transparent" 
                    strokeDasharray={2 * Math.PI * 18}
                    strokeDashoffset={(2 * Math.PI * 18) - ((otpCountdown / otpTotalTime) * (2 * Math.PI * 18))}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-xs font-light text-white">
                  {otpCountdown}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-neutral-200 text-sm font-medium tracking-wide">Rotating OTP</span>
                <span className="text-neutral-500 text-xs">Fallback for broken cameras</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
