import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import logo from 'figma:asset/bc8e51a0b2cc6939233324ed738db70e42faed93.png';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

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
