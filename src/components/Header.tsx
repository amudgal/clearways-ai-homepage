import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, LogOut, Settings, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logo from 'figma:asset/bc56b2cd1a0b77abaa55ba2f68f90ef6c8e0ef44.png';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const isHomePage = location.pathname === '/';
  const isLoginPage = location.pathname === '/login';

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="ClearWays AI" className="h-12 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/services"
              className={`transition-colors ${
                isActive('/services')
                  ? 'text-[#17A2B8]'
                  : 'text-gray-700 hover:text-[#17A2B8]'
              }`}
            >
              What We Do
            </Link>
            <Link
              to="/about"
              className={`transition-colors ${
                isActive('/about')
                  ? 'text-[#17A2B8]'
                  : 'text-gray-700 hover:text-[#17A2B8]'
              }`}
            >
              About Us
            </Link>
            {/* Show Login on home page, Logout on other pages, nothing on login page */}
            {!isLoginPage && (
              <>
                {isHomePage ? (
                  <Link
                    to="/login"
                    className="transition-colors flex items-center gap-2 text-gray-700 hover:text-[#17A2B8]"
                  >
                    <LogIn size={18} />
                    Login
                  </Link>
                ) : (
                  <>
                    {user?.role === 'ADMIN' && (
                      <div className="flex items-center gap-4">
                        <Link
                          to="/dashboard"
                          className="transition-colors flex items-center gap-2 text-gray-700 hover:text-[#17A2B8]"
                        >
                          <FileText size={18} />
                          Analyses
                        </Link>
                        <Link
                          to="/admin/analyses"
                          className="transition-colors text-gray-700 hover:text-[#17A2B8]"
                        >
                          Manage Analyses
                        </Link>
                        <Link
                          to="/admin/tenants"
                          className="transition-colors text-gray-700 hover:text-[#17A2B8]"
                        >
                          Tenants
                        </Link>
                        <Link
                          to="/admin/pricing/table"
                          className="transition-colors flex items-center gap-2 text-gray-700 hover:text-[#17A2B8]"
                        >
                          <Settings size={18} />
                          Pricing
                        </Link>
                      </div>
                    )}
                    <button
                      onClick={handleLogout}
                      className="transition-colors flex items-center gap-2 text-gray-700 hover:text-[#17A2B8]"
                    >
                      <LogOut size={18} />
                      Logout
                    </button>
                  </>
                )}
              </>
            )}
            <Link
              to="/contact"
              className="bg-[#17A2B8] text-white px-6 py-2 rounded hover:bg-[#138C9E] transition-colors"
            >
              Free Assessment
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-700"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              <Link
                to="/services"
                onClick={() => setIsMenuOpen(false)}
                className={`${
                  isActive('/services') ? 'text-[#17A2B8]' : 'text-gray-700'
                }`}
              >
                What We Do
              </Link>
              <Link
                to="/about"
                onClick={() => setIsMenuOpen(false)}
                className={`${
                  isActive('/about') ? 'text-[#17A2B8]' : 'text-gray-700'
                }`}
              >
                About Us
              </Link>
              {/* Show Login on home page, Logout on other pages, nothing on login page */}
              {!isLoginPage && (
                <>
                  {isHomePage ? (
                    <Link
                      to="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 text-gray-700"
                    >
                      <LogIn size={18} />
                      Login
                    </Link>
                  ) : (
                    <>
                      {user?.role === 'ADMIN' && (
                        <>
                          <Link
                            to="/dashboard"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-2 text-gray-700"
                          >
                            <FileText size={18} />
                            Analyses
                          </Link>
                          <Link
                            to="/admin/analyses"
                            onClick={() => setIsMenuOpen(false)}
                            className="text-gray-700"
                          >
                            Manage Analyses
                          </Link>
                          <Link
                            to="/admin/tenants"
                            onClick={() => setIsMenuOpen(false)}
                            className="text-gray-700"
                          >
                            Tenants
                          </Link>
                          <Link
                            to="/admin/pricing/table"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-2 text-gray-700"
                          >
                            <Settings size={18} />
                            Pricing
                          </Link>
                        </>
                      )}
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2 text-gray-700"
                      >
                        <LogOut size={18} />
                        Logout
                      </button>
                    </>
                  )}
                </>
              )}
              <Link
                to="/contact"
                onClick={() => setIsMenuOpen(false)}
                className="bg-[#17A2B8] text-white px-6 py-2 rounded hover:bg-[#138C9E] transition-colors text-center"
              >
                Free Assessment
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}