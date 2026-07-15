import { useState, useEffect, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Search, Download, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface CourseAttendanceRecord {
  id: string
  session_id: string
  user_id: string
  first_name: string
  last_name: string
  matriculation_number: string
  marked_at: string
  method: "qr" | "otp"
  distance_from_center: number
  mock_location_detected: boolean
  confidence_score: number
  week_number: number
}

export default function CourseMasterReport() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [records, setRecords] = useState<CourseAttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const fetchMasterReport = async () => {
      try {
        const data = await api.get<CourseAttendanceRecord[]>(`/courses/${id}/attendance`)
        setRecords(data || [])
      } catch (err) {
        if (err instanceof ApiError) setError(err.message)
        else setError("Failed to load master attendance report.")
      } finally {
        setLoading(false)
      }
    }
    fetchMasterReport()
  }, [id])

  const { students, weeks } = useMemo(() => {
    const weekSet = new Set<number>()
    const studentMap = new Map<string, any>()
    
    records.forEach(r => {
      weekSet.add(r.week_number)
      
      if (!studentMap.has(r.user_id)) {
        studentMap.set(r.user_id, {
          user_id: r.user_id,
          first_name: r.first_name,
          last_name: r.last_name,
          matriculation_number: r.matriculation_number,
          weeks: {} 
        })
      }
      studentMap.get(r.user_id).weeks[r.week_number] = r.confidence_score
    })
    
    const sortedWeeks = Array.from(weekSet).sort((a, b) => a - b)
    const sortedStudents = Array.from(studentMap.values()).sort((a, b) => {
      const aName = `${a.first_name} ${a.last_name}`
      const bName = `${b.first_name} ${b.last_name}`
      return aName.localeCompare(bName)
    })
    
    return { students: sortedStudents, weeks: sortedWeeks }
  }, [records])

  const filteredStudents = students.filter(s => 
    (s.first_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.last_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.matriculation_number || "").toLowerCase().includes(search.toLowerCase())
  )

  const getScoreColor = (score: number) => {
    if (score >= 0.85) return "text-green-700 bg-green-50"
    if (score >= 0.70) return "text-amber-700 bg-amber-50"
    return "text-red-700 bg-red-50 font-bold"
  }

  // Calculate overall attendance percentage for a student
  const getAttendanceRate = (studentWeeks: any) => {
    if (weeks.length === 0) return 0
    let presentCount = 0
    weeks.forEach(w => {
      if (studentWeeks[w] !== undefined) presentCount++
    })
    return (presentCount / weeks.length) * 100
  }

  if (loading) return <div className="animate-pulse p-8">Building master report...</div>
  if (error) return <div className="text-red-500 p-8">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5 text-neutral-500" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Master Attendance Report</h1>
            <p className="text-neutral-500 text-sm">Aggregated attendance matrix across all weeks</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => alert('CSV Export coming soon!')}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card className="border-neutral-200 shadow-sm">
        <CardHeader className="border-b border-neutral-100 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle>Attendance Matrix</CardTitle>
            <CardDescription>{students.length} students across {weeks.length} active weeks</CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search students..."
              className="pl-9 pr-4 py-2 border border-neutral-200 rounded-md text-sm w-64 focus:outline-none focus:border-neutral-400 transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-neutral-50 text-neutral-600 font-medium border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 sticky left-0 bg-neutral-50 border-r border-neutral-200 shadow-[10px_0_15px_-15px_rgba(0,0,0,0.1)]">Student</th>
                  <th className="px-6 py-4">Total Rate</th>
                  {weeks.map(week => (
                    <th key={week} className="px-6 py-4 text-center">Week {week}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={weeks.length + 2} className="px-6 py-12 text-center text-neutral-500">
                      No attendance data available for this course yet.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const rate = getAttendanceRate(student.weeks)
                    return (
                      <tr key={student.user_id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="px-6 py-4 sticky left-0 bg-white border-r border-neutral-100 shadow-[10px_0_15px_-15px_rgba(0,0,0,0.1)] group-hover:bg-neutral-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <img 
                              src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.first_name}+${student.last_name}&backgroundColor=171717,0a0a0a,262626&textColor=ffffff`}
                              alt={`${student.first_name}'s avatar`}
                              className="h-8 w-8 rounded-full border border-neutral-200"
                            />
                            <div>
                              <div className="font-medium text-neutral-900">{student.first_name} {student.last_name}</div>
                              <div className="text-xs text-neutral-500">{student.matriculation_number}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-neutral-100 rounded-full h-2 max-w-[80px]">
                              <div 
                                className={`h-2 rounded-full ${rate >= 75 ? 'bg-green-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                style={{ width: `${rate}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-bold text-neutral-700">{Math.round(rate)}%</span>
                          </div>
                        </td>
                        {weeks.map(week => {
                          const score = student.weeks[week]
                          return (
                            <td key={week} className="px-6 py-4 text-center border-l border-neutral-50">
                              {score !== undefined ? (
                                <span className={`inline-flex items-center justify-center w-12 py-1 rounded text-xs font-bold ${getScoreColor(score)}`}>
                                  {Math.round(score * 100)}%
                                </span>
                              ) : (
                                <span className="text-neutral-300 font-bold">-</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
