import { useState } from 'react';
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
        setShowSuccess(true);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Try again.');
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
            <div className="w-20 h-20 bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] rounded-full mx-auto flex items-center justify-center animate-pulse">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Welcome, {fullName.split(' ')[0]}!</h2>
          <p className="text-gray-400 text-lg">Your account has been created successfully 🎉</p>
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

        {/* 🔹 Card with blue underglow on hover */}
        <div className="group relative">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] opacity-0 blur-2xl transition duration-500 group-hover:opacity-30 group-hover:blur-3xl" />
          <div className="relative bg-[#1a1d29] rounded-3xl p-8 shadow-2xl border border-gray-800 overflow-hidden transition-all duration-500 group-hover:shadow-[0_0_25px_rgba(0,191,255,0.3)] group-hover:-translate-y-1">

            <div className={`transition-all duration-200 ease-out ${isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-[#0B0C10] text-white pl-12 pr-4 py-4 rounded-xl border border-gray-700 focus:ring-2 focus:ring-[#00BFFF]/50 focus:border-[#00BFFF] outline-none transition-all duration-200"
                        placeholder="John Doe"
                        required={isSignUp}
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#0B0C10] text-white pl-12 pr-4 py-4 rounded-xl border border-gray-700 focus:ring-2 focus:ring-[#00BFFF]/50 focus:border-[#00BFFF] outline-none transition-all duration-200"
                      placeholder="yourname@example.com"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#0B0C10] text-white pl-12 pr-4 py-4 rounded-xl border border-gray-700 focus:ring-2 focus:ring-[#00BFFF]/50 focus:border-[#00BFFF] outline-none transition-all duration-200"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {/* Sign in button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] text-white font-semibold py-4 rounded-xl transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,191,255,0.6)] hover:-translate-y-[2px] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-[#1a1d29] text-gray-400">or</span>
                </div>
              </div>

              {/* Google Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-white text-gray-900 font-semibold py-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,191,255,0.5)] hover:-translate-y-[2px] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92..." />
                </svg>
                Continue with Google
              </button>

              {/* Toggle link */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => toggleAuthMode(!isSignUp)}
                  disabled={isTransitioning || loading}
                  className="text-[#00BFFF] hover:text-[#4C6EF5] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}
