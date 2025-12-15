import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const { login, sendOTP } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [displayedOTP, setDisplayedOTP] = useState<string | null>(null);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your corporate email');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await sendOTP(email);
      if (result.success) {
        setStep('otp');
        // Store OTP for display if provided (development mode)
        if (result.otp) {
          setDisplayedOTP(result.otp);
        }
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await login(email, otp);
      if (result.success) {
        setStep('success');
        toast.success(result.message);
        // Don't auto-navigate - let user click the button
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    try {
      const result = await sendOTP(email);
      if (result.success) {
        // Update displayed OTP if provided
        if (result.otp) {
          setDisplayedOTP(result.otp);
        }
        toast.success('New OTP sent to your email');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#17A2B8] to-[#138C9E] rounded-xl flex items-center justify-center">
            <Mail className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-gray-900">
          Corporate Login
        </h2>
        <p className="mt-2 text-center text-gray-600">
          {step === 'email' && 'Enter your corporate email to receive a one-time password'}
          {step === 'otp' && 'Enter the 6-digit code sent to your email'}
          {step === 'success' && 'Login successful!'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          {step === 'email' && (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-gray-700 mb-2">
                  Corporate Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#17A2B8] focus:border-[#17A2B8]"
                  placeholder="you@company.com"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Personal email addresses (Gmail, Yahoo, etc.) are not allowed
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-[#17A2B8] hover:bg-[#138C9E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#17A2B8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Sending...' : 'Send One-Time Password'}
                {!isLoading && <ArrowRight size={18} />}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              {/* Development OTP Display */}
              {displayedOTP && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider mb-2">
                    Development Mode - Your OTP Code:
                  </p>
                  <div className="text-center">
                    <div className="inline-block bg-white border-2 border-blue-300 rounded-lg px-6 py-3">
                      <p className="text-3xl font-mono font-bold text-blue-900 tracking-widest">
                        {displayedOTP}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 mt-2 text-center">
                    This code is valid for 10 minutes
                  </p>
                </div>
              )}
              
              <div>
                <label htmlFor="otp" className="block text-gray-700 mb-2">
                  One-Time Password
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#17A2B8] focus:border-[#17A2B8] text-center text-2xl tracking-widest"
                  placeholder="000000"
                />
                <p className="mt-2 text-sm text-gray-500 text-center">
                  Code sent to {email}
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-[#17A2B8] hover:bg-[#138C9E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#17A2B8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Verifying...' : 'Verify & Login'}
                {!isLoading && <ArrowRight size={18} />}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isLoading}
                  className="text-sm text-[#17A2B8] hover:text-[#138C9E] disabled:opacity-50"
                >
                  Didn't receive the code? Resend
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Use a different email
                </button>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="text-gray-900 mb-2">Welcome back!</h3>
                <p className="text-gray-600">
                  You have successfully logged in with {email}
                </p>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-[#17A2B8] hover:bg-[#138C9E] transition-colors"
              >
                Go to My Dashboard
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                Secure corporate authentication
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}