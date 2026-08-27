"use client";
import React, { useContext, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/Authcontext";
import axiosInstance from "@/lib/axios";
import axios from "axios";

const RegisterPage = () => {
  const authContext = useContext(AuthContext);
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationStep, setVerificationStep] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendingCode, setResendingCode] = useState(false);

  if (!authContext) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const { register, isLoading } = authContext;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.username || !formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    if (formData.password.length < 10 || !/[A-Z]/.test(formData.password) || !/[a-z]/.test(formData.password) || !/[0-9]/.test(formData.password) || !/[^A-Za-z0-9]/.test(formData.password)) {
      setError("Use 10+ characters with uppercase, lowercase, number, and special character");
      return;
    }

    try {
      const result = await register(formData.username, formData.email, formData.password);
      setRegisteredEmail(result.email);
      setVerificationStep(true);
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message || "Failed to register. Please try again." : "Failed to register. Please try again.");
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const code = verificationCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit verification code from your email.");
      return;
    }
    try {
      await axiosInstance.post("/api/auth/verify-email", { email: registeredEmail, code });
      router.push("/login?verified=1");
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message || "Verification failed." : "Verification failed.");
    }
  };

  const handleResend = async () => {
    setError("");
    setResendingCode(true);
    try {
      await axiosInstance.post("/api/auth/resend-verification", { email: registeredEmail });
      setVerificationCode("");
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message || "Could not resend the verification code." : "Could not resend the verification code.");
    } finally {
      setResendingCode(false);
    }
  };

  if (verificationStep) {
    return <div className="flex min-h-screen items-center justify-center px-4"><div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-lg sm:p-8"><h1 className="text-2xl font-bold text-gray-900">Check your email</h1><p className="mt-2 text-sm text-gray-600">We sent a six-digit verification code to {registeredEmail}. Enter it below to finish creating your account. The code expires in one hour.</p><form onSubmit={handleVerify} className="mt-6 space-y-4"><label htmlFor="verification-code" className="block text-sm font-medium text-gray-900">Verification code</label><Input id="verification-code" aria-label="Verification code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter 6-digit code" /><Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "Verifying..." : "Verify and continue"}</Button><button type="button" onClick={handleResend} disabled={resendingCode} className="w-full text-sm font-semibold text-blue-700 disabled:opacity-50">{resendingCode ? "Sending new code..." : "Resend verification code"}</button>{error && <p className="text-sm text-red-700">{error}</p>}</form></div></div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-3 py-6 sm:px-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="mb-6 text-center sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-violet-600 to-violet-700 mb-4">
            <span className="text-white font-bold text-lg">AI</span>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">Create Account</h1>
          <p className="text-gray-600">Join MockInterview and start practicing</p>
        </div>

        {/* Register Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-lg sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Username Field */}
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-gray-900">
                Username
              </label>
              <div className="relative">
                <div className="absolute left-3 top-3 text-gray-400">👤</div>
                <Input
                  id="username"
                  type="text"
                  name="username"
                  placeholder="johndoe"
                  value={formData.username}
                  onChange={handleChange}
                  className="pl-10 h-11"
                  disabled={isLoading}
                />
              </div>
            </div>

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
              <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                Password
              </label>
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
              <p className="text-xs text-gray-500 mt-1">10+ characters with upper/lowercase, number, and symbol</p>
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
                  Creating account...
                </span>
              ) : (
                "Sign Up"
              )}
            </Button>

            {/* Terms Agreement */}
            <div className="flex items-start mt-4">
              <input
                type="checkbox"
                id="agree"
                className="w-4 h-4 mt-0.5 rounded border-blue-300 text-blue-600 cursor-pointer"
              />
              <label htmlFor="agree" className="ml-2 text-xs text-gray-700 cursor-pointer">
                I agree to the{" "}
                <Link href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  Privacy Policy
                </Link>
              </label>
            </div>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 bg-gray-200 h-px"></div>
            <span className="px-3 text-gray-500 text-sm">or</span>
            <div className="flex-1 bg-gray-200 h-px"></div>
          </div>

          {/* Sign In Link */}
          <p className="text-center text-gray-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer Text */}
        <p className="text-center text-gray-600 text-xs mt-6">
          By signing up, you agree to our{" "}
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

export default RegisterPage;