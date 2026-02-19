import React, { useState } from 'react';
import { authAPI } from '../../services/api';
import { validateEmail } from '../../utils/validation';
import AuthInput from './AuthInput';

const PasswordResetRequest: React.FC = () => {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError('');
    setSuccess(false);

    // Client-side validation
    const emailError = validateEmail(email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    setLoading(true);

    try {
      await authAPI.passwordResetRequest({ email });
      setSuccess(true);
      setEmail('');
    } catch (error: any) {
      setServerError(
        error.response?.data?.message || 'Failed to send password reset email. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Reset Password</h2>
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          Password reset email sent! Check your inbox for instructions.
        </div>
      )}
      
      {serverError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <AuthInput
          type="email"
          name="email"
          label="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="Enter your email"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Remember your password?{' '}
        <a href="/login" className="text-blue-600 hover:text-blue-800">
          Log In
        </a>
      </p>
    </div>
  );
};

export default PasswordResetRequest;