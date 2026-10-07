// src/hooks/useAuthValidation.ts
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '@/Storage/Redux/store';
import { variables } from '@/Variables';

const useAuthValidation = () => {
  // Get the token from Redux store.
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const navigate = useNavigate();

  useEffect(() => {
    const validateToken = async () => {
      // If no token exists, navigate to the login page.
      if (!token) {
        navigate('/users/login');
        return;
      }

      try {
        // Call the validate-token endpoint.
        const response = await fetch(`${variables.API_URL}Auth/validate-token`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        // If the token is not valid, redirect to the login page.
        if (!response.ok) {
          console.error('Token validation failed:', response.status);
          navigate('/users/login');
        }
      } catch (error) {
        console.error('Error validating token:', error);
        navigate('/users/login');
      }
    };

    // Execute token validation.
    validateToken();
  }, [token, navigate]);
};

export default useAuthValidation;
