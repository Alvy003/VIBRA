import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const LAST_PAGE_KEY = 'vibra_last_page';

// Pages that should be cached
const CACHEABLE_ROUTES = [
  '/',
  '/chat',
  '/search',
  '/favorites',
  '/downloads',
];

export function useLastPageCache() {
  const location = useLocation();
  const navigate = useNavigate();

  // Save current page to localStorage
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Only cache specific routes (not album detail pages, etc.)
    if (CACHEABLE_ROUTES.includes(currentPath)) {
      localStorage.setItem(LAST_PAGE_KEY, currentPath);
    }
  }, [location.pathname]);

  // Restore last page on app load
  useEffect(() => {
    // Only run once on mount
    const lastPage = localStorage.getItem(LAST_PAGE_KEY);
    
    // If we're on home page and there's a cached page, navigate to it
    if (location.pathname === '/' && lastPage && lastPage !== '/' && CACHEABLE_ROUTES.includes(lastPage)) {
      navigate(lastPage, { replace: true });
    }
  }, []); // Empty deps - only run once on mount
}