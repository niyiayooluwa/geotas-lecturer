import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { PlusCircle, BookOpen } from "lucide-react"

interface Course {
  id: string
  title: string
  code: string
  department: string
  invite_code?: string
}

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newCode, setNewCode] = useState("")
  const [newDepartment, setNewDepartment] = useState("")
  const [newCourseInvite, setNewCourseInvite] = useState("")

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const data = await api.get<Course[]>("/courses")
      setCourses(data || [])
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Your Courses</h2>
        <p className="text-muted-foreground mt-1">Manage your classes and students.</p>
      </div>

      {error && (
        <div className="rounded bg-destructive/15 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {newCourseInvite && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Course Created Successfully!</CardTitle>
            <CardDescription className="text-green-700">
              Share this invite code with your students to let them join.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-mono font-bold text-center py-4 tracking-widest text-green-900 bg-white rounded border border-green-200">
              {newCourseInvite}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create New Course</CardTitle>
            <CardDescription>Setup a new class to start tracking attendance.</CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateCourse}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title</Label>
                <Input 
                  id="title" 
                  placeholder="e.g. Introduction to Geology" 
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Course Code</Label>
                  <Input 
                    id="code" 
                    placeholder="e.g. GEO101" 
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input 
                    id="department" 
                    placeholder="e.g. Earth Sciences" 
                    required
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isCreating} className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" />
                {isCreating ? "Creating..." : "Create Course"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Active Courses</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading courses...</p>
          ) : courses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
                <p className="text-sm text-muted-foreground">No courses created yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {courses.map((course) => (
                <Card key={course.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{course.code}</CardTitle>
                        <CardDescription>{course.title}</CardDescription>
                      </div>
                      <Button variant="secondary" size="sm" asChild>
                        <Link to={`/courses/${course.id}`}>Manage</Link>
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
