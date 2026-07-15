import { useState, useEffect, useRef } from "react"
import { Outlet, Navigate, Link } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { LogOut, ChevronLeft, ChevronRight, LayoutDashboard, Search, Bell } from "lucide-react"
import logoWhite from "@/assets/svgs/logo-white.svg"
import logoBlack from "@/assets/svgs/logo-black.svg"

interface Course {
  id: string
  title: string
  code: string
}

function GlobalSearch() {
  const [query, setQuery] = useState("")
  const [courses, setCourses] = useState<Course[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Silently fetch all accessible courses for the search index
    Promise.all([
      api.get<Course[]>("/courses").catch(() => []),
      api.get<Course[]>("/courses/enrolled").catch(() => [])
    ]).then(([owned, enrolled]) => {
      const all = [...(owned || []), ...(enrolled || [])]
      const unique = Array.from(new Map(all.map(c => [c.id, c])).values())
      setCourses(unique)
    })
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filtered = query.length > 0 
    ? courses.filter(c => 
        c.title.toLowerCase().includes(query.toLowerCase()) || 
        c.code.toLowerCase().includes(query.toLowerCase())
      )
    : []

  return (
    <div ref={wrapperRef} className="relative hidden md:block">
      <div className="flex items-center bg-neutral-100 rounded-md px-3 py-1.5 w-64 border border-transparent focus-within:border-neutral-300 focus-within:bg-white transition-all">
        <Search className="h-4 w-4 text-neutral-400 mr-2" />
        <input 
          type="text" 
          placeholder="Search courses..." 
          className="bg-transparent border-none focus:outline-none text-sm w-full"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => { if (query.length > 0) setIsOpen(true) }}
        />
      </div>
      
      {isOpen && query.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white border border-neutral-200 rounded-md shadow-lg overflow-hidden z-50">
          {filtered.length > 0 ? (
            <div className="max-h-64 overflow-y-auto">
              {filtered.map(c => (
                <Link 
                  key={c.id} 
                  to={`/courses/${c.id}`} 
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 hover:bg-neutral-50 border-b border-neutral-100 last:border-0"
                >
                  <div className="font-semibold text-sm text-neutral-900">{c.code}</div>
                  <div className="text-xs text-neutral-500 truncate">{c.title}</div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-4 text-sm text-neutral-500 text-center">
              No courses found.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
interface AppNotification {
  id: string
  course_id: string
  type: string
  payload: any
  created_at: string
}

function NotificationPopover() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  
  useEffect(() => {
    api.get<AppNotification[]>('/notifications')
      .then(data => setNotifications(data || []))
      .catch(() => {})
  }, [])
  
  const handleMarkSeen = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/seen`, {})
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (e) {}
  }
  
  const getNotificationText = (n: AppNotification) => {
    if (n.type === 'session_starting') return `Session starting: ${n.payload.title}`
    if (n.type === 'schedule_created') return `New schedule at ${n.payload.venue}`
    if (n.type === 'schedule_updated') return `Schedule updated`
    return 'New notification'
  }
  
  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-700 relative" onClick={() => setIsOpen(!isOpen)}>
        <Bell className="h-5 w-5" />
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-neutral-200 z-50 overflow-hidden">
          <div className="p-3 border-b border-neutral-100 bg-neutral-50">
            <h3 className="font-semibold text-neutral-900 text-sm">Notifications</h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500">
                You're all caught up!
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {notifications.map(n => (
                  <div key={n.id} className="p-3 hover:bg-neutral-50 flex flex-col gap-2 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm text-neutral-800 leading-snug">{getNotificationText(n)}</p>
                      <button onClick={() => handleMarkSeen(n.id)} className="text-neutral-400 hover:text-neutral-900 p-1 rounded-full shrink-0" title="Mark as read">
                        <div className="h-2 w-2 rounded-full bg-blue-500 hover:bg-neutral-300 transition-colors" />
                      </button>
                    </div>
                    <p className="text-xs text-neutral-400">
                      {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardLayout() {
  const { user, isLoading, logout } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading session...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${isCollapsed ? 'w-20' : 'w-64'} hidden md:flex flex-col flex-shrink-0 bg-neutral-900 text-neutral-100 transition-all duration-300 ease-in-out border-r border-neutral-800`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-800">
          {!isCollapsed && <img src={logoWhite} alt="GEOTAS Logo" className="h-6 ml-2" />}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`text-neutral-400 hover:text-white hover:bg-neutral-800 ${isCollapsed ? 'mx-auto' : ''}`}
          >
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-2 mt-4">
          <Button variant="ghost" asChild className={`justify-start text-neutral-300 hover:text-white hover:bg-neutral-800 ${isCollapsed ? 'px-2 justify-center' : 'px-4'}`}>
            <Link to="/">
              <LayoutDashboard className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && "Dashboard"}
            </Link>
          </Button>

        </nav>

        <div className="p-3 border-t border-neutral-800">
          {!isCollapsed && (
            <div className="px-4 py-3 mb-2 bg-neutral-800/50 rounded-lg flex items-center gap-3">
              <img 
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.first_name}+${user?.last_name}&backgroundColor=171717,0a0a0a,262626&textColor=ffffff`}
                alt="User Avatar"
                className="h-8 w-8 rounded-full border border-neutral-700"
              />
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{user.first_name} {user.last_name}</p>
                <p className="text-xs text-neutral-400 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <Button 
            variant="ghost" 
            onClick={logout}
            className={`w-full text-neutral-400 hover:text-white hover:bg-neutral-800 hover:text-destructive ${isCollapsed ? 'px-2 justify-center' : 'justify-start px-4'}`}
          >
            <LogOut className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
            {!isCollapsed && "Logout"}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-neutral-50/50">
        {/* Persistent Top Bar */}
        <header className="h-16 border-b bg-white flex items-center justify-between px-4 md:px-8 flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="md:hidden">
              <img src={logoBlack} alt="GEOTAS Logo" className="h-5" />
            </div>
            <div className="hidden md:flex flex-col justify-center">
              <div className="text-sm font-bold text-neutral-900">
                {(() => {
                  const hour = new Date().getHours();
                  if (hour < 12) return "Good morning";
                  if (hour < 17) return "Good afternoon";
                  return "Good evening";
                })()}, {user.first_name}
              </div>
              <div className="text-xs font-medium text-neutral-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <GlobalSearch />
            
            <NotificationPopover />
            
            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={logout} className="text-destructive">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto pb-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
