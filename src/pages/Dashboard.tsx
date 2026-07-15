import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Users } from "lucide-react"

interface Course {
  id: string
  title: string
  code: string
  department: string
  invite_code?: string
  role?: string
  student_count?: number
}

type ModalState = "none" | "choose" | "create" | "join"

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [modalState, setModalState] = useState<ModalState>("none")
  
  // Create State
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newCode, setNewCode] = useState("")
  const [newDepartment, setNewDepartment] = useState("")
  const [newCourseInvite, setNewCourseInvite] = useState("")

  // Join State
  const [joinCode, setJoinCode] = useState("")
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const [owned, enrolled] = await Promise.all([
        api.get<Course[]>("/courses").catch(() => []),
        api.get<Course[]>("/courses/enrolled").catch(() => [])
      ])
      
      // Remove duplicates just in case the backend returns an owned course in the enrolled list
      const allCourses = [...(owned || []), ...(enrolled || [])]
      const uniqueCourses = Array.from(new Map(allCourses.map(c => [c.id, c])).values())
      
      setCourses(uniqueCourses)
    } catch (err) {
      console.error(err)
      setError("Failed to load courses. The API might not be fully implemented yet.")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setNewCourseInvite("")
    setError("")

    try {
      const newCourse = await api.post<Course>("/courses", {
        title: newTitle,
        code: newCode,
        department: newDepartment
      })
      
      setCourses([...courses, newCourse])
      setNewCourseInvite(newCourse.invite_code || "UNKNOWN")
      
      setNewTitle("")
      setNewCode("")
      setNewDepartment("")
      setModalState("none")
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("An error occurred creating the course.")
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    setJoining(true)
    setError("")
    
    try {
      const joinedCourse = await api.post<Course>("/courses/join", {
        invite_code: joinCode
      })
      setCourses([...courses, joinedCourse])
      setJoinCode("")
      setModalState("none")
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("An error occurred joining the course.")
      }
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="space-y-8 relative">
      
      {/* Modal Overlay System */}
      {modalState !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {modalState === "choose" && (
              <div className="p-6">
                <h3 className="text-xl font-bold mb-4">Add a Course</h3>
                <p className="text-sm text-neutral-500 mb-6">Would you like to create a new course from scratch or join an existing course as a co-lecturer?</p>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start h-14 text-base" onClick={() => setModalState("create")}>
                    <PlusCircle className="mr-3 h-5 w-5 text-neutral-500" />
                    Create New Course
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-14 text-base" onClick={() => setModalState("join")}>
                    <Users className="mr-3 h-5 w-5 text-neutral-500" />
                    Join as Co-lecturer
                  </Button>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button variant="ghost" onClick={() => setModalState("none")}>Cancel</Button>
                </div>
              </div>
            )}

            {modalState === "create" && (
              <form onSubmit={handleCreateCourse} className="p-0">
                <div className="p-6 border-b border-neutral-100">
                  <h3 className="text-xl font-bold">Create New Course</h3>
                  <p className="text-sm text-neutral-500 mt-1">Setup a new class to start tracking attendance.</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Course Title</Label>
                    <Input id="title" placeholder="e.g. Introduction to Geology" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Course Code</Label>
                      <Input id="code" placeholder="e.g. GEO101" required value={newCode} onChange={(e) => setNewCode(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input id="department" placeholder="e.g. Earth Sciences" required value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="p-6 border-t border-neutral-100 flex justify-end gap-3 bg-neutral-50">
                  <Button type="button" variant="ghost" onClick={() => setModalState("choose")}>Back</Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create Course"}
                  </Button>
                </div>
              </form>
            )}

            {modalState === "join" && (
              <form onSubmit={handleJoinCourse} className="p-0">
                <div className="p-6 border-b border-neutral-100">
                  <h3 className="text-xl font-bold">Join Course</h3>
                  <p className="text-sm text-neutral-500 mt-1">Enter an invite code to join as a co-lecturer.</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="joinCode">Invite Code</Label>
                    <Input id="joinCode" placeholder="e.g. 8xG2p" required value={joinCode} onChange={(e) => setJoinCode(e.target.value)} className="font-mono" />
                  </div>
                </div>
                <div className="p-6 border-t border-neutral-100 flex justify-end gap-3 bg-neutral-50">
                  <Button type="button" variant="ghost" onClick={() => setModalState("choose")}>Back</Button>
                  <Button type="submit" disabled={joining}>
                    {joining ? "Joining..." : "Join Course"}
                  </Button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      <div>
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900">Your Courses</h2>
        <p className="text-neutral-500 mt-1">Manage your classes and students.</p>
      </div>

      {error && (
        <div className="rounded bg-destructive/15 p-4 text-sm text-destructive font-medium border border-destructive/20">
          {error}
        </div>
      )}

      {newCourseInvite && (
        <Card className="border-green-200 bg-green-50 mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
          <CardHeader>
            <CardTitle className="text-green-800">Course Created Successfully!</CardTitle>
            <CardDescription className="text-green-700">
              Share this exact invite code with your students to let them join.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-3xl font-mono font-bold text-center py-4 tracking-widest text-green-900 bg-white rounded border border-green-200 shadow-sm">
                {newCourseInvite}
              </div>
              <Button 
                variant="outline" 
                size="lg"
                className="h-full py-4 px-6 border-green-200 text-green-800 hover:bg-green-100 hover:text-green-900"
                onClick={() => {
                  navigator.clipboard.writeText(newCourseInvite)
                  const btn = document.getElementById('copy-btn-text')
                  if (btn) {
                    const original = btn.innerText
                    btn.innerText = "Copied!"
                    setTimeout(() => btn.innerText = original, 2000)
                  }
                }}
              >
                <span id="copy-btn-text">Copy to clipboard</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading courses...</p>
      ) : (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((course) => (
            <Link key={course.id} to={`/courses/${course.id}`} className="block group h-full">
              <Card className="h-full hover:border-neutral-400 hover:shadow-md transition-all duration-200 flex flex-col group-hover:-translate-y-1">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full group-hover:bg-neutral-200 transition-colors">
                      {course.role === "lecturer" ? "Co-Lecturer" : (course.role || "Owner")}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-bold tracking-tight text-neutral-900">{course.code}</CardTitle>
                  <CardDescription className="text-sm font-medium text-neutral-600 mt-1.5 leading-snug line-clamp-2">
                    {course.title}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-4 flex items-center justify-between border-t border-neutral-100 text-xs text-neutral-500">
                  <span className="truncate flex-1 pr-2 font-medium" title={course.department}>{course.department}</span>
                  <div className="flex items-center gap-1 font-medium text-neutral-700 bg-neutral-100 px-2 py-1 rounded-md group-hover:bg-neutral-200 transition-colors flex-shrink-0">
                    <Users className="h-3.5 w-3.5" />
                    <span>{course.student_count || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Add Course Card */}
          <Card 
            className="h-full min-h-[180px] flex flex-col items-center justify-center border-dashed border-2 border-neutral-300 hover:border-neutral-500 hover:bg-neutral-50 transition-all duration-200 cursor-pointer group shadow-none"
            onClick={() => setModalState("choose")}
          >
            <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3 group-hover:bg-neutral-200 group-hover:scale-110 transition-all duration-200">
              <PlusCircle className="h-6 w-6 text-neutral-600" />
            </div>
            <h3 className="font-bold text-base text-neutral-700 group-hover:text-neutral-900 transition-colors">Add Course</h3>
          </Card>
        </div>
      )}
    </div>
  )
}
