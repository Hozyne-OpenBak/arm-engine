import React, { useState } from 'react';
import AuthInput from './AuthInput';
import { validateEmail, validatePassword } from '../../utils/validation';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';

const LoginForm: React.FC = () => {
  const { login } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);

    if (emailError || passwordError) {
      setErrors({ email: emailError || '', password: passwordError || '' });
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password,
      });
      login(response.data.token);
    } catch (error) {
      setErrorMessage('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 border rounded shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Log In</h2>

      {errorMessage && (
        <p className="text-red-500 mb-4">{errorMessage}</p>
      )}

      <AuthInput
        type="email"
        name="email"
        label="Email"
        value={formData.email}
        onChange={handleInputChange}
        error={errors.email}
        required
      />

      <AuthInput
        type="password"
        name="password"
        label="Password"
        value={formData.password}
        onChange={handleInputChange}
        error={errors.password}
        required
      />

      <button
        type="submit"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? 'Logging In...' : 'Log In'}
      </button>
    </form>
  );
};

export default LoginForm;