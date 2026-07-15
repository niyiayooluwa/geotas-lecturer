import { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, RefreshCw, Trash2, Users, MapPin, Search, Info } from "lucide-react"

import { useAuth } from "@/context/AuthContext"

interface Course {
  id: string
  owner_id: string
  title: string
  code: string
  department: string
  invite_code: string
  confidence_threshold?: number
}

interface Member {
  user_id: string
  first_name: string
  last_name: string
  email: string
  role: string
  matriculation_number?: string
  co_lecturer?: boolean
  joined_at?: string
}

interface Session {
  id: string
  course_id: string
  week_number: number
  status: "active" | "closed"
  started_at: string
  radius_meters?: number
}

export default function CourseView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [course, setCourse] = useState<Course | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  
  const [loading, setLoading] = useState(true)
  const [rotating, setRotating] = useState(false)
  const [error, setError] = useState("")

  const [toastMessage, setToastMessage] = useState("")

  useEffect(() => {
    if (id) {
      fetchCourseData()
    }
  }, [id])

  const fetchCourseData = async () => {
    try {
      // The backend does not currently have a dedicated GET /courses/:id route, 
      // so we fetch all user's courses (owned and enrolled) and filter by ID to hydrate the view.
      const [ownedData, enrolledData, membersData, sessionsData] = await Promise.all([
        api.get<Course[]>(`/courses`).catch(() => []),
        api.get<Course[]>(`/courses/enrolled`).catch(() => []),
        api.get<Member[]>(`/courses/${id}/members`).catch(() => []),
        api.get<Session[]>(`/courses/${id}/sessions`).catch(() => []) 
      ])
      
      const allCourses = [...(ownedData || []), ...(enrolledData || [])]
      const foundCourse = allCourses.find(c => c.id === id)
      if (!foundCourse) {
        throw new Error("Course not found or you don't have permission to view it.")
      }
      
      setCourse(foundCourse)
      setMembers(membersData || [])
      
      try {
        const schedulesData = await api.get<any[]>(`/courses/${id}/schedules`)
        setSchedules(schedulesData || [])
      } catch (e) {
        console.error("Failed to load schedules", e)
      }
      
      setSessions(sessionsData || [])
      if (foundCourse.confidence_threshold !== undefined) {
        setConfidenceThreshold(foundCourse.confidence_threshold)
      }
    } catch (err) {
      console.error(err)
      if (err instanceof ApiError) {
        setError(`Failed to load course: ${err.message}`)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Failed to load course details. The API endpoint might not be ready yet.")
      }
    } finally {
      setLoading(false)
    }
  }

  const [confirmAction, setConfirmAction] = useState<{ type: "rotate" } | { type: "remove", member: Member } | { type: "delete_session", sessionId: string } | { type: "leave" } | { type: "delete_course" } | null>(null)

  const [showSessionModal, setShowSessionModal] = useState(false)
  const [sessionWeek, setSessionWeek] = useState(1)
  const [sessionRadius, setSessionRadius] = useState(50.0)
  const [isStartingSession, setIsStartingSession] = useState(false)
  const [locationError, setLocationError] = useState("")
  const [memberSearchQuery, setMemberSearchQuery] = useState("")
  
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.85)
  const [savingSettings, setSavingSettings] = useState(false)

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsStartingSession(true)
    setLocationError("")

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.")
      setIsStartingSession(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // The API returns the created session object
          const newSession = await api.post<Session>("/sessions", {
            course_id: id,
            week_number: sessionWeek,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            radius_meters: sessionRadius
          })
          
          setSessions([newSession, ...sessions])
          setToastMessage(`Week ${sessionWeek} session started successfully!`)
          setTimeout(() => setToastMessage(""), 4000)
          setShowSessionModal(false)
          
          // TODO: Next step is transitioning the UI to show the active QR code for this session
        } catch (err) {
          if (err instanceof ApiError) setLocationError(err.message)
          else setLocationError("Failed to start session on the server.")
        } finally {
          setIsStartingSession(false)
        }
      },
      (geoError) => {
        setIsStartingSession(false)
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setLocationError("Location permission denied. We must lock the geofence to your physical location.")
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          setLocationError("Location information is currently unavailable.")
        } else if (geoError.code === geoError.TIMEOUT) {
          setLocationError("Location request timed out. Please try again.")
        } else {
          setLocationError("An unknown location error occurred.")
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const executeRotateCode = async () => {
    setRotating(true)
    setError("")
    try {
      const response = await api.post<{ invite_code: string }>(`/courses/${id}/invite-code/rotate`, {})
      setCourse((prev) => prev ? { ...prev, invite_code: response.invite_code } : null)
      
      setToastMessage("Old code is now invalid")
      setTimeout(() => setToastMessage(""), 4000)
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("Failed to rotate invite code")
    } finally {
      setRotating(false)
      setConfirmAction(null)
    }
  }

  const executeRemoveMember = async () => {
    if (confirmAction?.type !== "remove") return
    const member = confirmAction.member

    setError("")
    try {
      await api.delete(`/courses/${id}/members/${member.user_id}`)
      setMembers(members.filter(m => m.user_id !== member.user_id))
      setToastMessage(`${member.first_name} removed`)
      setTimeout(() => setToastMessage(""), 4000)
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("Failed to remove member")
    } finally {
      setConfirmAction(null)
    }
  }

  const executeLeaveCourse = async () => {
    if (confirmAction?.type !== "leave") return

    setError("")
    try {
      await api.delete(`/courses/${id}/leave`)
      setToastMessage("You have left the course")
      setTimeout(() => navigate("/"), 1000)
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("Failed to leave course")
      setConfirmAction(null)
    }
  }

  const executeDeleteCourse = async () => {
    if (confirmAction?.type !== "delete_course") return

    setError("")
    try {
      await api.delete(`/courses/${id}`)
      setToastMessage("Course permanently deleted")
      setTimeout(() => navigate("/"), 1000)
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("Failed to delete course")
      setConfirmAction(null)
    }
  }

  const handleSaveSettings = async () => {
    if (!course) return
    setSavingSettings(true)
    setError("")
    try {
      await api.patch(`/courses/${id}/settings`, {
        confidence_threshold: confidenceThreshold
      })
      setCourse({ ...course, confidence_threshold: confidenceThreshold })
      setToastMessage("Settings saved successfully")
      setTimeout(() => setToastMessage(""), 4000)
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("Failed to save settings")
    } finally {
      setSavingSettings(false)
    }
  }

  const [activeTab, setActiveTab] = useState<"sessions" | "members" | "reports" | "settings" | "schedules">("sessions")
  const [isAddingSchedule, setIsAddingSchedule] = useState(false)
  const [newSchedule, setNewSchedule] = useState({ day_of_week: 1, start_time: "09:00", end_time: "11:00", venue: "" })
  
  const createSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post(`/courses/${id}/schedules`, {
        ...newSchedule,
        day_of_week: Number(newSchedule.day_of_week)
      })
      const schedulesData = await api.get<any[]>(`/courses/${id}/schedules`)
      setSchedules(schedulesData || [])
      setIsAddingSchedule(false)
      setNewSchedule({ day_of_week: 1, start_time: "09:00", end_time: "11:00", venue: "" })
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
    }
  }

  const deleteSchedule = async (scheduleId: string) => {
    if (!window.confirm("Delete this schedule?")) return
    try {
      await api.delete(`/schedules/${scheduleId}`)
      setSchedules(prev => prev.filter(s => s.id !== scheduleId))
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
    }
  }

  if (loading) return <div className="animate-pulse">Loading course details...</div>
  if (!course) return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
      <div className="p-4 bg-destructive/10 text-destructive rounded">{error || "Course not found"}</div>
    </div>
  )

  const executeDeleteSession = async () => {
    if (confirmAction?.type !== "delete_session") return
    const sessionId = confirmAction.sessionId

    setError("")
    try {
      await api.delete(`/sessions/${sessionId}`)
      setSessions(sessions.filter(s => s.id !== sessionId))
      setToastMessage("Session deleted successfully")
      setTimeout(() => setToastMessage(""), 4000)
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("Failed to delete session")
    } finally {
      setConfirmAction(null)
    }
  }

  const isOwner = user?.id === course?.owner_id

  return (
    <div className="space-y-6 relative">
      {/* Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <form onSubmit={handleStartSession} className="p-0">
              <div className="p-6 border-b border-neutral-100">
                <h3 className="text-xl font-bold">Start Attendance Session</h3>
                <p className="text-sm text-neutral-500 mt-1">Configure the physical geofence for this class.</p>
              </div>
              <div className="p-6 space-y-4">
                {locationError && (
                  <div className="rounded bg-destructive/15 p-3 text-sm text-destructive font-medium border border-destructive/20">
                    {locationError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weekNumber">Week Number</Label>
                    <Input 
                      id="weekNumber" 
                      type="number" 
                      min="1" 
                      max="52" 
                      required 
                      value={sessionWeek} 
                      onChange={(e) => setSessionWeek(parseInt(e.target.value))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="radius">Radius (meters)</Label>
                    <Input 
                      id="radius" 
                      type="number" 
                      min="10" 
                      max="1000" 
                      step="5"
                      required 
                      value={sessionRadius} 
                      onChange={(e) => setSessionRadius(parseFloat(e.target.value))} 
                    />
                  </div>
                </div>
                <div className="bg-neutral-50 p-4 rounded-md border border-neutral-100 mt-2">
                  <div className="flex items-start gap-3">
                    <div className="bg-neutral-200 p-2 rounded-full mt-0.5">
                      <MapPin className="h-4 w-4 text-neutral-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">Location Required</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Your browser will ask for location access when you click Start. This locks the geofence to your physical position.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-neutral-100 flex justify-end gap-3 bg-neutral-50">
                <Button type="button" variant="ghost" onClick={() => setShowSessionModal(false)} disabled={isStartingSession}>Cancel</Button>
                <Button type="submit" disabled={isStartingSession}>
                  {isStartingSession ? "Locating..." : "Start Session"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              {confirmAction.type === "rotate" && (
                <>
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">Rotate Invite Code?</h3>
                  <p className="text-neutral-500 mb-6">Are you sure you want to rotate the invite code? The old invite code will immediately stop working, and any pending invitations will be invalid.</p>
                  <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={executeRotateCode} disabled={rotating}>
                      {rotating ? "Rotating..." : "Rotate Code"}
                    </Button>
                  </div>
                </>
              )}
              {confirmAction.type === "remove" && (
                <>
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">Remove Member?</h3>
                  <p className="text-neutral-500 mb-6">Are you sure you want to remove <span className="font-semibold text-neutral-800">{confirmAction.member.first_name} {confirmAction.member.last_name}</span> from this course? Their historical attendance records will be permanently deleted.</p>
                  <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={executeRemoveMember}>
                      Remove Member
                    </Button>
                  </div>
                </>
              )}
              {confirmAction.type === "leave" && (
                <>
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">Leave Course?</h3>
                  <p className="text-neutral-500 mb-6">Are you sure you want to leave this course? You will no longer have access to it.</p>
                  <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={executeLeaveCourse}>
                      Leave Course
                    </Button>
                  </div>
                </>
              )}
              {confirmAction.type === "delete_session" && (
                <>
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">Delete Session?</h3>
                  <p className="text-neutral-500 mb-6">Are you sure you want to delete this session? All attendance records recorded during this session will be permanently lost.</p>
                  <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={executeDeleteSession}>
                      Delete Session
                    </Button>
                  </div>
                </>
              )}
              {confirmAction.type === "delete_course" && (
                <>
                  <h3 className="text-xl font-bold text-red-600 mb-2">Delete Course?</h3>
                  <p className="text-neutral-500 mb-6">Are you absolutely sure you want to permanently delete <span className="font-semibold text-neutral-800">{course.code}</span>? This will wipe all sessions and attendance records. This action cannot be undone.</p>
                  <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={executeDeleteCourse}>
                      Permanently Delete
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white px-6 py-3 rounded-md shadow-lg font-medium animate-in slide-in-from-bottom-5">
          {toastMessage}
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" className="mt-1 flex-shrink-0" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-neutral-100 text-neutral-800 font-bold px-2.5 py-1 rounded-md text-xs uppercase tracking-wider">
                {course.code}
              </span>
              <span className="text-sm font-medium text-neutral-500">{course.department}</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900">{course.title}</h2>
          </div>
        </div>
        
        {/* Primary Action Button */}
        {activeTab === "sessions" && (
          <Button className="md:w-auto w-full h-11 px-6 shadow-sm" onClick={() => setShowSessionModal(true)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Start New Session
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded bg-destructive/15 p-4 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("sessions")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "sessions"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
          >
            Sessions
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === "members"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
          >
            Members
            <span className="bg-neutral-100 text-neutral-600 py-0.5 px-2 rounded-full text-xs">
              {members.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === "reports"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
          >
            Reports
          </button>
          <button
            onClick={() => setActiveTab("schedules")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "schedules"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
          >
            Schedules
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "settings"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
          >
            Settings
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="pt-4">
        
        {/* SESSIONS TAB */}
        {activeTab === "sessions" && (
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <Card className="border-dashed shadow-none bg-neutral-50/50">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                    <RefreshCw className="h-6 w-6 text-neutral-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900">No sessions recorded yet</h3>
                  <p className="text-neutral-500 mt-1 max-w-sm">Start a new attendance session to generate a secure, rotating QR code for your students.</p>
                  <Button className="mt-6" variant="outline" onClick={() => setShowSessionModal(true)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Start New Session
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sessions.map(session => (
                  <Card key={session.id} className="hover:border-neutral-300 transition-colors flex flex-col">
                    <CardHeader className="pb-3 flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <CardTitle className="text-lg font-bold text-neutral-900">Week {session.week_number}</CardTitle>
                          <CardDescription className="text-xs font-medium text-neutral-500 mt-1">
                            {new Date(session.started_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </CardDescription>
                        </div>
                        {session.status === "active" ? (
                          <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            Active
                          </span>
                        ) : (
                          <span className="bg-neutral-100 text-neutral-500 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
                            Closed
                          </span>
                        )}
                      </div>
                      {session.radius_meters && (
                        <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-neutral-600 bg-neutral-50 w-fit px-2 py-1 rounded border border-neutral-100">
                          <MapPin className="h-3 w-3 text-neutral-400" />
                          {session.radius_meters}m radius
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0 flex gap-2">
                      <Button className="flex-1" variant={session.status === "active" ? "default" : "secondary"} asChild>
                        <Link to={session.status === "active" ? `/sessions/${session.id}/live` : `/sessions/${session.id}/report`}>
                          {session.status === "active" ? "View Live QR" : "View Report"}
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="text-neutral-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 flex-shrink-0"
                        onClick={() => setConfirmAction({ type: "delete_session", sessionId: session.id })}
                        title="Delete Session"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === "members" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
              <div>
                <h3 className="text-lg font-semibold">Course Members</h3>
                <p className="text-sm text-neutral-500">Manage students and co-lecturers</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input 
                  placeholder="Search members..." 
                  className="pl-9 h-9"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {members.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 border-2 border-dashed rounded-md bg-neutral-50/50">
                <Users className="h-8 w-8 mx-auto mb-3 text-neutral-300" />
                <p className="font-medium">No members have joined this course yet.</p>
                <p className="text-sm mt-1">Share your invite code to get started.</p>
              </div>
            ) : (
              <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <div className="grid grid-cols-12 gap-4 p-4 bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden sm:grid">
                  <div className="col-span-4">Name</div>
                  <div className="col-span-3">Matric No.</div>
                  <div className="col-span-3">Email</div>
                  <div className="col-span-1">Role</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>
                <div className="divide-y divide-neutral-100">
                  {members
                    .filter(m => 
                      `${m.first_name} ${m.last_name}`.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                      m.email.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                      (m.matriculation_number && m.matriculation_number.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                    )
                    .map(member => (
                    <div key={member.user_id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 p-4 sm:items-center hover:bg-neutral-50/50 transition-colors">
                      <div className="col-span-4 flex items-center justify-between sm:block">
                        <div className="font-medium text-neutral-900 flex items-center gap-3">
                          <img 
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.first_name}+${member.last_name}&backgroundColor=171717,0a0a0a,262626&textColor=ffffff`}
                            alt={`${member.first_name}'s avatar`}
                            className="h-8 w-8 rounded-full border border-neutral-200"
                          />
                          {member.first_name} {member.last_name}
                        </div>
                        <span className="sm:hidden text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md">
                          {member.role}
                        </span>
                      </div>
                      <div className="col-span-3 text-sm text-neutral-600 font-mono">
                        {member.matriculation_number || <span className="text-neutral-400">---</span>}
                      </div>
                      <div className="col-span-3 text-sm text-neutral-500 truncate" title={member.email}>
                        {member.email}
                      </div>
                      <div className="col-span-1 hidden sm:block">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600 px-2 py-1 rounded-md">
                          {member.role}
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {member.user_id !== course?.owner_id && member.user_id !== user?.id && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-neutral-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                            onClick={() => setConfirmAction({ type: "remove", member })}
                            title="Remove Member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {members.filter(m => 
                      `${m.first_name} ${m.last_name}`.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                      m.email.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                      (m.matriculation_number && m.matriculation_number.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                    ).length === 0 && (
                    <div className="p-8 text-center text-neutral-500 text-sm">
                      No members match your search query.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-neutral-50 p-6 rounded-2xl border border-neutral-200 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-1">Course Master Report</h3>
                <p className="text-sm text-neutral-500">View the aggregated attendance matrix for all students across all weeks.</p>
              </div>
              <Button 
                className="bg-neutral-900 hover:bg-neutral-800 text-white whitespace-nowrap" 
                onClick={() => navigate(`/courses/${course.id}/report`)}
              >
                View Master Report
              </Button>
            </div>
            
            <h3 className="text-lg font-semibold text-neutral-900 mt-8 mb-4">Historical Sessions</h3>
            
            {course.sessions?.length === 0 ? (
              <div className="text-center py-12 bg-neutral-50 rounded-2xl border border-neutral-200 border-dashed">
                <p className="text-neutral-500 font-medium">No sessions recorded yet.</p>
                <p className="text-sm text-neutral-400 mt-1">Start a live session to begin tracking attendance.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {course.sessions?.map(session => (
                  <Card key={session.id} className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3 border-b border-neutral-100 bg-neutral-50/50">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">Week {session.week_number}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {new Date(session.started_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <div className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                          session.status === 'active' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-neutral-200 text-neutral-700'
                        }`}>
                          {session.status}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 flex justify-between items-center">
                      <Button variant="outline" className="w-full text-neutral-900 border-neutral-200 hover:bg-neutral-100" onClick={() => navigate(`/sessions/${session.id}/report`)}>
                        View Session Report
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SCHEDULES TAB */}
        {activeTab === "schedules" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-neutral-50 p-6 rounded-2xl border border-neutral-200 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-1">Course Schedules</h3>
                <p className="text-sm text-neutral-500">Weekly timetable for this course.</p>
              </div>
              {!isAddingSchedule && (
                <Button 
                  className="bg-neutral-900 hover:bg-neutral-800 text-white whitespace-nowrap" 
                  onClick={() => setIsAddingSchedule(true)}
                >
                  Add Schedule
                </Button>
              )}
            </div>
            
            {isAddingSchedule && (
              <Card className="border-neutral-200 shadow-sm border-dashed bg-neutral-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">New Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={createSchedule} className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Day of Week</Label>
                        <select 
                          className="flex h-10 w-full items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          value={newSchedule.day_of_week}
                          onChange={e => setNewSchedule({...newSchedule, day_of_week: Number(e.target.value)})}
                        >
                          <option value={1}>Monday</option>
                          <option value={2}>Tuesday</option>
                          <option value={3}>Wednesday</option>
                          <option value={4}>Thursday</option>
                          <option value={5}>Friday</option>
                          <option value={6}>Saturday</option>
                          <option value={7}>Sunday</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input type="time" required value={newSchedule.start_time} onChange={e => setNewSchedule({...newSchedule, start_time: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input type="time" required value={newSchedule.end_time} onChange={e => setNewSchedule({...newSchedule, end_time: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Venue</Label>
                        <Input type="text" required placeholder="e.g. LT1" value={newSchedule.venue} onChange={e => setNewSchedule({...newSchedule, venue: e.target.value})} />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <Button type="button" variant="ghost" onClick={() => setIsAddingSchedule(false)}>Cancel</Button>
                      <Button type="submit" className="bg-neutral-900 hover:bg-neutral-800 text-white">Save Schedule</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
            
            {schedules.length === 0 && !isAddingSchedule ? (
              <div className="text-center py-12 bg-neutral-50 rounded-2xl border border-neutral-200 border-dashed">
                <p className="text-neutral-500 font-medium">No schedules set.</p>
                <p className="text-sm text-neutral-400 mt-1">Add a schedule slot to notify students.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {schedules.map(schedule => (
                  <Card key={schedule.id} className="border-neutral-200 shadow-sm relative group">
                    <CardHeader className="pb-3 border-b border-neutral-100 bg-neutral-50/50">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base text-neutral-900">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][schedule.day_of_week - 1]}
                          </CardTitle>
                          <CardDescription className="text-xs mt-1 text-neutral-600 font-medium">
                            {schedule.start_time} - {schedule.end_time}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <span className="font-medium">Venue:</span> {schedule.venue}
                      </div>
                    </CardContent>
                    <div className="absolute top-2 right-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-red-500 bg-white shadow-sm border border-neutral-200" onClick={() => deleteSchedule(schedule.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-neutral-200 shadow-sm col-span-1">
              <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 pb-4">
                <CardTitle className="text-lg">Course Access</CardTitle>
                <CardDescription>
                  Share this code to let students and co-lecturers join
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center pt-6">
                <div className="text-4xl font-mono font-bold tracking-widest text-neutral-900 bg-neutral-100 px-6 py-4 rounded-lg mb-6 border border-neutral-200 w-full text-center">
                  {course.invite_code || "---"}
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full font-medium" 
                  onClick={() => setConfirmAction({ type: "rotate" })}
                  disabled={rotating}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${rotating ? 'animate-spin' : ''}`} />
                  {rotating ? "Rotating..." : "Rotate Invite Code"}
                </Button>
                <p className="text-xs text-neutral-500 mt-4 text-center leading-relaxed">
                  Rotating will immediately invalidate the old code. Students who already joined will not be affected.
                </p>

                {!isOwner && (
                  <div className="w-full mt-6 pt-6 border-t border-neutral-100">
                    <Button 
                      variant="destructive" 
                      className="w-full font-medium" 
                      onClick={() => setConfirmAction({ type: "leave" })}
                    >
                      Leave Course
                    </Button>
                    <p className="text-xs text-neutral-500 mt-4 text-center leading-relaxed">
                      Leaving this course will remove your access. You will need a new invite code to rejoin.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-neutral-200 shadow-sm col-span-1">
              <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 pb-4">
                <CardTitle className="text-lg">Geofence Sensitivity</CardTitle>
                <CardDescription>Adjust the strictness of the GPS bounds</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-sm text-neutral-700 font-medium">Confidence Threshold</Label>
                    <span className="text-xs font-bold bg-neutral-100 px-2 py-1 rounded text-neutral-600">
                      {Math.round(confidenceThreshold * 100)}%
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    className="w-full accent-neutral-900"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-neutral-500 mt-2">
                    Higher percentages strictly require student devices to report highly accurate GPS locations.
                  </p>
                  
                  <details className="mt-4 text-xs text-neutral-500 bg-neutral-50 p-3 rounded border border-neutral-100 group">
                    <summary className="font-semibold text-neutral-700 cursor-pointer list-none flex items-center gap-2 select-none">
                      <Info className="h-4 w-4 text-blue-500" />
                      How does the scoring system work?
                    </summary>
                    <div className="mt-3 space-y-2.5 pl-5 border-l-2 border-neutral-200 ml-2">
                      <p>Students start with a perfect <strong>100%</strong> score when they scan in, but lose points based on risk factors:</p>
                      <ul className="list-disc pl-4 space-y-1.5 text-neutral-600">
                        <li><strong>Location:</strong> Being completely outside the geofence radius applies a massive <strong>-50%</strong> penalty. Being inside applies a dynamic penalty based on distance from the center (up to <strong>-15%</strong>).</li>
                        <li><strong>Lateness:</strong> Arriving late dynamically reduces the score based on elapsed time (up to <strong>-15%</strong> for 60+ mins late).</li>
                        <li><strong>OTP Fallback:</strong> Typing an OTP instead of scanning the live QR code deducts <strong>-10%</strong>.</li>
                        <li><strong>Fraud:</strong> Mock GPS apps or using multiple accounts on one device incurs severe penalties (-30% to -40%).</li>
                      </ul>
                      <div className="mt-2 text-blue-800 font-medium bg-blue-50/50 border border-blue-100 p-2 rounded">
                        If a student's final score after deductions drops below your set threshold, their attendance is instantly rejected.
                      </div>
                    </div>
                  </details>
                </div>
                <Button 
                  className="w-full" 
                  disabled={savingSettings || confidenceThreshold === (course.confidence_threshold ?? 0.85)}
                  onClick={handleSaveSettings}
                >
                  {savingSettings ? "Saving..." : "Save Settings"}
                </Button>
              </CardContent>
            </Card>

            {isOwner && (
              <Card className="border-red-200 mt-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg text-red-700">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-neutral-900">Delete Course</h4>
                        <p className="text-sm text-neutral-500">Permanently delete this course and all of its attendance data. This action cannot be undone.</p>
                      </div>
                      <Button variant="destructive" onClick={() => setConfirmAction({ type: "delete_course" })}>
                        Delete Course
                      </Button>
                    </div>
                  </CardContent>
                </Card>
            )}
          </div>
        )}
        
      </div>
    </div>
  )
}
