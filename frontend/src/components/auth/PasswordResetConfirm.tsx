import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { validatePassword, validatePasswordMatch } from '../../utils/validation';
import AuthInput from './AuthInput';

const PasswordResetConfirm: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError('');

    // Client-side validation
    const validationErrors: { [key: string]: string } = {};
    
    const passwordError = validatePassword(newPassword);
    if (passwordError) validationErrors.newPassword = passwordError;

    const matchError = validatePasswordMatch(newPassword, confirmPassword);
    if (matchError) validationErrors.confirmPassword = matchError;

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!token) {
      setServerError('Invalid or missing reset token.');
      return;
    }

    setLoading(true);

    try {
      await authAPI.passwordResetConfirm({ token, newPassword });
      alert('Password reset successful! Redirecting to login...');
      navigate('/login');
    } catch (error: any) {
      setServerError(
        error.response?.data?.message || 'Failed to reset password. The link may have expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Set New Password</h2>
      
      {serverError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <AuthInput
          type="password"
          name="newPassword"
          label="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={errors.newPassword}
          placeholder="Enter new password"
          required
        />

        <AuthInput
          type="password"
          name="confirmPassword"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          placeholder="Confirm new password"
          required
        />

        <p className="text-xs text-gray-600 mb-4">
          Password must be at least 8 characters with uppercase, lowercase, number, and special character.
        </p>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
};

export default PasswordResetConfirm;