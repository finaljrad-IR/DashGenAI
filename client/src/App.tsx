import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./components/ui/theme-provider"
import { Toaster } from "./components/ui/toaster"
import { AuthProvider } from "./contexts/AuthContext"
import { Login } from "./pages/Login"
import { Register } from "./pages/Register"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { Layout } from "./components/Layout"
import { Home } from "./pages/Home"
import { DashboardOwner } from "./pages/DashboardOwner"
import { DashboardShared } from "./pages/DashboardShared"
import { AcceptInvitation } from "./pages/AcceptInvitation"
import { MyDashboards } from "./pages/MyDashboards"

function App() {
  return (
  <AuthProvider>
    <ThemeProvider defaultTheme="light" storageKey="ui-theme">
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/invite/accept/:token" element={<AcceptInvitation />} />
          <Route path="/" element={<Home />} />
          <Route path="/my-dashboards" element={<ProtectedRoute><Layout><MyDashboards /></Layout></ProtectedRoute>} />
          <Route path="/dashboard/:id" element={<ProtectedRoute><DashboardOwner /></ProtectedRoute>} />
          <Route path="/dashboard/:id/shared" element={<ProtectedRoute><DashboardShared /></ProtectedRoute>} />
        </Routes>
      </Router>
      <Toaster />
    </ThemeProvider>
  </AuthProvider>
  )
}

export default App