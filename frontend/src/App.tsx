import React, { useState } from 'react';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    
    setTimeout(() => {
      setIsLoading(false);
      alert(isLogin ? "Welcome back! " : "Account created! Let's set up your preferences.");
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 font-sans">
      {/* Background Aesthetic */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />

      <div className="relative w-full max-w-md p-8 bg-slate-900/40 border border-slate-800 backdrop-blur-2xl rounded-3xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {isLogin ? "Sign In" : "Join the Beta"}
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            {isLogin ? "Your schedule is waiting." : "Automate your calendar with AI."}
          </p>
        </div>

        {/* Social Logins */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {['Google', 'Microsoft', 'Apple'].map((platform) => (
            <button 
              key={platform}
              type="button"
              className="flex items-center justify-center py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl hover:bg-slate-700 transition-all group"
              title={`Login with ${platform}`}
            >
              <span className="text-xs font-medium text-slate-300 group-hover:text-white">{platform}</span>
            </button>
          ))}
        </div>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900/0 px-2 text-slate-500 backdrop-blur-sm">Or continue with email</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder="Full Name"
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
          )}

          <input 
            type="email" 
            required
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition"
            placeholder="Email Address"
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />

          <input 
            type="password" 
            required
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition"
            placeholder="Password"
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </span>
            ) : (
              isLogin ? "Sign In" : "Sign Up"
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-slate-400 hover:text-blue-400 transition underline-offset-4 hover:underline"
          >
            {isLogin ? "New here? Create an account" : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;