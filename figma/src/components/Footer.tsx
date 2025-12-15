import { Link } from 'react-router-dom';
import logo from 'figma:asset/0e6d5ac35544360f15b902845193c384729303dc.png';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="bg-white inline-block px-4 py-2 rounded mb-4">
              <img src={logo} alt="ClearWays AI" className="h-12 w-auto" />
            </div>
            <p className="text-gray-400 mb-4 max-w-2xl">
              Clearways.ai gives small and mid-size businesses the ability to compete at enterprise 
              speed without enterprise cost. We eliminate the complexity, price barriers, and technical 
              debt that prevent growth. We deliver four core capabilities—development, search, data, 
              and integrations, built for companies that need outcomes, not overhead.
            </p>
            <div className="space-y-1 text-gray-400">
              <p>ClearWays AI</p>
              <p>Email: info@clearways.ai</p>
              <p>Phone: 571-762-6973</p>
            </div>
          </div>

          {/* Links Section */}
          <div>
            <h3 className="text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/services" className="hover:text-[#17A2B8] transition-colors">
                  What We Do
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#17A2B8] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#17A2B8] transition-colors">
                  Free Assessment
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm mb-4 md:mb-0">
            © 2025 ClearWays AI. All rights reserved.
          </p>
          <div className="flex space-x-6 text-sm">
            <Link to="/terms" className="text-gray-500 hover:text-[#17A2B8] transition-colors">
              Terms of Use
            </Link>
            <Link to="/privacy" className="text-gray-500 hover:text-[#17A2B8] transition-colors">
              Privacy Policy
            </Link>
            <Link to="/accessibility" className="text-gray-500 hover:text-[#17A2B8] transition-colors">
              Accessibility
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
