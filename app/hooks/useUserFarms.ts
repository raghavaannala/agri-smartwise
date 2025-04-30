import { useState, useEffect } from 'react';
import { getUserFarms } from '../../src/lib/firestore';
import { useAuth } from '../../src/contexts/AuthContext';

interface Farm {
  id: string;
  name: string;
  location?: string;
  // Add other farm fields as needed
}

export const useUserFarms = () => {
  const { currentUser } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchFarms = async () => {
      if (!currentUser?.uid) {
        setFarms([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const userFarms = await getUserFarms(currentUser.uid);
        setFarms(userFarms);
      } catch (err) {
        console.error('Failed to load farms:', err);
        setError(err instanceof Error ? err : new Error('Failed to load farms'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchFarms();
  }, [currentUser]);

  return { farms, isLoading, error };
}; 