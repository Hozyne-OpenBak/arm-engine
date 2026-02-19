import React, { useState } from 'react';
import AuthInput from './AuthInput';
import { validateEmail, validatePassword, validateRequired } from '../../utils/validation';
import { authAPI } from '../../services/api';

const SignupForm: React.FC = () => {
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [errors, setErrors] = useState({ email: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    const nameError = validateRequired(formData.name, 'Name');

    if (emailError || passwordError || nameError) {
      setErrors({ email: emailError || '', password: passwordError || '', name: nameError || '' });
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.signup({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });
      setSuccessMessage(response.data.message);
    } catch (error) {
      setErrors((prev) => ({ ...prev, email: 'Signup failed. Please try again.' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 border rounded shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Sign Up</h2>

      {successMessage && (
        <p className="text-green-500 mb-4">{successMessage}</p>
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

      <AuthInput
        type="text"
        name="name"
        label="Name"
        value={formData.name}
        onChange={handleInputChange}
        error={errors.name}
        required
      />

      <button
        type="submit"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? 'Signing Up...' : 'Sign Up'}
      </button>
    </form>
  );
};

export default SignupForm;