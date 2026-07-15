import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Search, UserCheck, AlertTriangle, ShieldAlert } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface AttendanceRecord {
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

export default function SessionReport() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const data = await api.get<AttendanceRecord[]>(`/sessions/${id}/attendance`)
        setRecords(data || [])
      } catch (err) {
        if (err instanceof ApiError) setError(err.message)
        else setError("Failed to load attendance report.")
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [id])

  const filteredRecords = records.filter(r => 
    (r.first_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.last_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.matriculation_number || "").toLowerCase().includes(search.toLowerCase())
  )

  const getScoreColor = (score: number) => {
    if (score >= 0.85) return "text-green-600 bg-green-50 border-green-200"
    if (score >= 0.70) return "text-yellow-600 bg-yellow-50 border-yellow-200"
    return "text-red-600 bg-red-50 border-red-200"
  }

  if (loading) return <div className="animate-pulse p-8">Loading report...</div>
  if (error) return <div className="text-red-500 p-8">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-neutral-500" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Session Report</h1>
          <p className="text-neutral-500 text-sm">Detailed attendance breakdown and confidence scores</p>
        </div>
      </div>

      <Card className="border-neutral-200 shadow-sm">
        <CardHeader className="border-b border-neutral-100 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>{records.length} students scanned during this session</CardDescription>
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
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Confidence Score</th>
                  <th className="px-6 py-4">Risk Factors & Metrics</th>
                  <th className="px-6 py-4 text-right">Marked At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">
                      No attendance records found for this session.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id || record.user_id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-neutral-900">{record.first_name} {record.last_name}</div>
                        <div className="text-xs text-neutral-500">{record.matriculation_number}</div>
                      </td>
                      <td className="px-6 py-4">
                        {record.confidence_score !== undefined ? (
                          <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${getScoreColor(record.confidence_score)}`}>
                            {Math.round(record.confidence_score * 100)}%
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-xs italic">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-xs">
                          {record.distance_from_center > 0 && (
                            <div className={record.distance_from_center > 50 ? "text-red-600 font-medium flex items-center gap-1" : "text-neutral-600 flex items-center gap-1"}>
                              <AlertTriangle className="h-3 w-3" /> Distance: {record.distance_from_center.toFixed(1)}m away
                            </div>
                          )}
                          {record.method === "otp" && (
                            <div className="text-amber-600 font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Method: OTP Fallback
                            </div>
                          )}
                          {record.mock_location_detected && (
                            <div className="text-red-600 font-bold flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3" /> Fraud: Mock GPS Detected
                            </div>
                          )}
                          {record.distance_from_center === 0 && record.method === "qr" && !record.mock_location_detected && (
                            <span className="text-green-600 font-medium">Clean Scan</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-neutral-500 whitespace-nowrap">
                        {record.marked_at ? new Date(record.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
