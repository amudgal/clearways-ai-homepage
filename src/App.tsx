import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Accessibility from './pages/Accessibility';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AnalysisForm from './pages/AnalysisForm';
import AnalysisTypeSelection from './pages/AnalysisTypeSelection';
import AdminPricing from './pages/AdminPricing';
import AdminPricingTable from './pages/AdminPricingTable';
import AdminTenants from './pages/AdminTenants';
import AdminAnalyses from './pages/AdminAnalyses';
import AgentMarketplace from './pages/AgentMarketplace';
import AgentDetail from './pages/AgentDetail';
import { useAuth } from './contexts/AuthContext';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/services" element={<Services />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />
      <Route path="/agents" element={<AgentMarketplace />} />
      <Route path="/agents/:id" element={<AgentDetail />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analysis/new"
        element={
          <ProtectedRoute>
            <AnalysisTypeSelection />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analysis/create"
        element={
          <ProtectedRoute>
            <AnalysisForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analysis/:id"
        element={
          <ProtectedRoute>
            <AnalysisForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analysis"
        element={<Navigate to="/dashboard" replace />}
      />
      <Route
        path="/admin/pricing"
        element={
          <ProtectedRoute>
            <AdminPricing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pricing/table"
        element={
          <ProtectedRoute>
            <AdminPricingTable />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tenants"
        element={
          <ProtectedRoute>
            <AdminTenants />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analyses"
        element={
          <ProtectedRoute>
            <AdminAnalyses />
          </ProtectedRoute>
        }
      />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/accessibility" element={<Accessibility />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow">
            <AppRoutes />
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}