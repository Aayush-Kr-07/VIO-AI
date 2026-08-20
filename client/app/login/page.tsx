"use client";
import React, { useContext, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AuthContext } from "@/context/Authcontext";

const LoginPage = () => {
  const authContext = useContext(AuthContext);
  
  if (!authContext) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const { login, isLoading } = authContext;
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }
    
    try {
      await login(formData.email, formData.password);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to login. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-violet-600 to-violet-700 mb-4">
            <span className="text-white font-bold text-lg">AI</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your MockInterview account</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-3 top-3 text-gray-400">📧</div>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 h-11"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-3 text-gray-400">🔒</div>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 h-11"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 mt-6 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <span className="mr-2">⏳</span>
                  Logging in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>

            {/* Remember Me */}
            <div className="flex items-center mt-4">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 rounded border-blue-300 text-blue-600 cursor-pointer"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-gray-700 cursor-pointer">
                Keep me signed in
              </label>
            </div>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 bg-gray-200 h-px"></div>
            <span className="px-3 text-gray-500 text-sm">or</span>
            <div className="flex-1 bg-gray-200 h-px"></div>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-gray-600">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Footer Text */}
        <p className="text-center text-gray-600 text-xs mt-6">
          By signing in, you agree to our{" "}
          <Link href="#" className="text-blue-600 hover:text-blue-700 font-medium">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="#" className="text-blue-600 hover:text-blue-700 font-medium">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
