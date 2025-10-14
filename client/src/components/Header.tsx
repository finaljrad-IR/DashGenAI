import { LogOut, Home } from "lucide-react"
import { Button } from "./ui/button"
import { ThemeToggle } from "./ui/theme-toggle"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate, useLocation } from "react-router-dom"

export function Header() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    console.log('User logging out')
    logout()
    navigate("/login")
  }

  const handleHomeClick = () => {
    navigate("/")
  }

  const isAuthenticated = !!user

  return (
    <header className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-6">
        <div 
          className="text-xl font-bold cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2"
          onClick={handleHomeClick}
        >
          <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Home className="h-5 w-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard Generator
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {isAuthenticated && (
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}