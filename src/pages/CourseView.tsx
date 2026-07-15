import { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, RefreshCw, Trash2, Users } from "lucide-react"

interface Course {
  id: string
  title: string
  code: string
  department: string
  invite_code: string
}

interface Member {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
}

export default function CourseView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [course, setCourse] = useState<Course | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  
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
      const [courseData, membersData] = await Promise.all([
        api.get<Course>(`/courses/${id}`),
        api.get<Member[]>(`/courses/${id}/members`).catch(() => []) 
      ])
      setCourse(courseData)
      setMembers(membersData || [])
    } catch (err) {
      console.error(err)
      setError("Failed to load course details. The API endpoint might not be ready yet.")
    } finally {
      setLoading(false)
    }
  }

  const handleRotateCode = async () => {
    if (!window.confirm("Are you sure? The old invite code will immediately stop working.")) return

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
    }
  }

  const handleRemoveMember = async (member: Member) => {
    if (!window.confirm(`Remove ${member.first_name} ${member.last_name} from this course? Their attendance records will be deleted.`)) return

    setError("")
    try {
      await api.delete(`/courses/${id}/members/${member.id}`)
      setMembers(members.filter(m => m.id !== member.id))
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError("Failed to remove member")
    }
  }

  if (loading) return <div className="animate-pulse">Loading course details...</div>
  if (!course) return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
      <div className="p-4 bg-destructive/10 text-destructive rounded">{error || "Course not found"}</div>
    </div>
  )

  return (
    <div className="space-y-6 relative">
      {/* Custom Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-6 py-3 rounded-md shadow-lg font-medium animate-in slide-in-from-bottom-5">
          {toastMessage}
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{course.code}: {course.title}</h2>
          <p className="text-muted-foreground">{course.department}</p>
        </div>
      </div>

      {error && (
        <div className="rounded bg-destructive/15 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Invite Code</CardTitle>
            <CardDescription>Share this code to let students join</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="text-5xl font-mono font-bold tracking-widest text-primary mb-6">
              {course.invite_code || "---"}
            </div>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleRotateCode}
              disabled={rotating}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${rotating ? 'animate-spin' : ''}`} />
              Rotate Code
            </Button>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Rotating immediately invalidates the old code.
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Course Members</CardTitle>
                <CardDescription>Manage students and co-lecturers</CardDescription>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-md">
                No members have joined this course yet.
              </div>
            ) : (
              <div className="divide-y border rounded-md">
                {members.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-medium">{member.first_name} {member.last_name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs uppercase bg-slate-100 px-2 py-1 rounded font-medium text-slate-600">
                        {member.role}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveMember(member)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
