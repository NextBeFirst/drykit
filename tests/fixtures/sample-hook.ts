import { useState, useEffect } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  const [user, setUser] = useState(null);
  return { user, setUser };
}
