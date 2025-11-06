import { useState, useEffect } from 'react';
import { Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const toggleAuthMode = (newMode: boolean) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsSignUp(newMode);
      setError('');
      setTimeout(() => setIsTransitioning(false), 50);
    }, 200);
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithGoogle();
    } catch (err) {
      setError('Failed to sign in with Google');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          setError('Please enter your full name');
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, fullName);
        // Show success message
        setShowSuccess(true);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      if (err.code === 'user_already_exists' || err.message?.includes('already registered')) {
        setError('This email is already registered.');
        setTimeout(() => {
          toggleAuthMode(false);
        }, 2000);
      } else if (err.code === 'email_confirmation_required') {
        setError(err.message);
      } else if (err.message?.includes('Invalid login credentials') || err.message?.includes('Email not confirmed')) {
        setError('No account found with this email.');
        setTimeout(() => {
          toggleAuthMode(true);
        }, 2000);
      } else if (err.message?.includes('rate_limit') || err.message?.includes('only request this after')) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else {
        setError(err.message || 'Authentication failed. Try reincarnating');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B0C10] via-[#1a1d29] to-[#0B0C10] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center animate-in fade-in zoom-in duration-500">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] rounded-full mx-auto flex items-center justify-center animate-in zoom-in duration-700 delay-100">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2 animate-in slide-in-from-bottom duration-700 delay-200">
            Welcome, {fullName.split(' ')[0]}!
          </h2>
          <p className="text-gray-400 text-lg animate-in slide-in-from-bottom duration-700 delay-300">
            Your stupid chungus account has been created successfully
          </p>
          <div className="mt-6 flex justify-center animate-in fade-in duration-700 delay-500">
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-[#4C6EF5] rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-[#4C6EF5] rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-[#4C6EF5] rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0C10] via-[#1a1d29] to-[#0B0C10] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="text-5xl font-bold mb-3">
            <span className="text-white">vyb</span>
            <span className="text-[#00BFFF]">in</span>
          </div>
          <p className="text-gray-400 text-lg">Discover. Connect. Vybe.</p>
        </div>

        <div className="bg-[#1a1d29] rounded-3xl p-8 shadow-2xl border border-gray-800 overflow-hidden">
          <div className={`transition-all duration-200 ease-out ${
            isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#0B0C10] text-white pl-12 pr-4 py-4 rounded-xl border border-gray-700 focus:border-[#4C6EF5] focus:outline-none transition-colors"
                    placeholder="John Doe"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0B0C10] text-white pl-12 pr-4 py-4 rounded-xl border border-gray-700 focus:border-[#4C6EF5] focus:outline-none transition-colors"
                  placeholder="yourname@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0B0C10] text-white pl-12 pr-4 py-4 rounded-xl border border-gray-700 focus:border-[#4C6EF5] focus:outline-none transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#4C6EF5] to-[#7C3AED] text-white font-semibold py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#1a1d29] text-gray-400">or</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white text-gray-900 font-semibold py-4 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => toggleAuthMode(!isSignUp)}
                disabled={isTransitioning || loading}
                className="text-[#4C6EF5] hover:text-[#7C3AED] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
