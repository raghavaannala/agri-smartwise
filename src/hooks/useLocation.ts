import { useState, useEffect, useCallback } from 'react';

interface LocationState {
  latitude: number;
  longitude: number;
}

// Default location (fallback)
const DEFAULT_LOCATION: LocationState = {
  latitude: 17.3850, // Hyderabad coordinates
  longitude: 78.4867
};

// Timeout for geolocation request (in milliseconds)
const GEOLOCATION_TIMEOUT = 10000;

export function useLocation() {
  const [location, setLocation] = useState<LocationState>(DEFAULT_LOCATION); // Start with default location
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState<boolean>(true); // Start with true since we start with default
  const [permissionState, setPermissionState] = useState<string>("prompt"); // 'granted', 'denied', 'prompt'

  // Check if the browser supports the Permissions API
  const checkPermissionStatus = useCallback(async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        console.log('Geolocation permission status:', result.state);
        setPermissionState(result.state);
        
        // Listen for changes to permission state
        result.onchange = () => {
          console.log('Permission state changed to:', result.state);
          setPermissionState(result.state);
          
          // If permission is granted after a change, try getting location
          if (result.state === 'granted') {
            getLocationFromBrowser();
          }
        };
        
        return result.state;
      }
    } catch (error) {
      console.error('Error checking permission status:', error);
    }
    
    // Default to 'prompt' if Permissions API is not available
    return 'prompt';
  }, []);

  const getLocationFromBrowser = useCallback(() => {
    console.log('Getting location from browser...');
    setLoading(true);
    
    if (!navigator.geolocation) {
      console.log('Geolocation not supported, using default location');
      setLocation(DEFAULT_LOCATION);
      setUsingFallback(true);
      setLoading(false);
      return;
    }

    const successCallback = (position: GeolocationPosition) => {
      console.log('Got actual location:', position.coords);
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      console.log(`Setting location to: ${coords.latitude}, ${coords.longitude}`);
      setLocation(coords);
      setUsingFallback(false);
      setLoading(false);
      setError(null);
      
      // Force the permission state to granted since we successfully got location
      setPermissionState('granted');
      
      // Store in localStorage to use as a cache in case geolocation fails next time
      try {
        localStorage.setItem('lastKnownLocation', JSON.stringify({
          coords,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.error('Error saving location to localStorage:', e);
      }
    };

    const errorCallback = (error: GeolocationPositionError) => {
      console.log('Geolocation error, using default location:', error.message);
      console.log('Error code:', error.code);
      
      let errorMsg = '';
      // Check specific error codes
      if (error.code === 1) { // PERMISSION_DENIED
        errorMsg = 'Location permission denied. Please check your browser settings.';
        setPermissionState('denied');
      } else if (error.code === 2) { // POSITION_UNAVAILABLE
        errorMsg = 'Location information is unavailable.';
      } else if (error.code === 3) { // TIMEOUT
        errorMsg = 'The request to get location timed out.';
      }
      
      // Try to get last known location from localStorage
      try {
        const lastKnownLocation = localStorage.getItem('lastKnownLocation');
        if (lastKnownLocation) {
          const { coords, timestamp } = JSON.parse(lastKnownLocation);
          // Only use if it's less than a day old
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            console.log('Using cached location:', coords);
            setLocation(coords);
            setUsingFallback(false);
            setLoading(false);
            setError(null);
            return;
          }
        }
      } catch (e) {
        console.error('Error reading location from localStorage:', e);
      }
      
      setLocation(DEFAULT_LOCATION);
      setUsingFallback(true);
      setLoading(false);
      setError(errorMsg);
    };

    try {
      console.log('Requesting current position...');
      navigator.geolocation.getCurrentPosition(
        successCallback,
        errorCallback,
        { 
          timeout: GEOLOCATION_TIMEOUT,
          maximumAge: 0, // Don't use cached position
          enableHighAccuracy: true 
        }
      );
    } catch (e) {
      console.error('Error getting location:', e);
      setLocation(DEFAULT_LOCATION);
      setUsingFallback(true);
      setLoading(false);
    }
  }, []);

  // Function to explicitly request location permission
  const requestLocationPermission = useCallback(() => {
    console.log('Explicitly requesting location permission');
    setLoading(true);
    
    // Reset any previous state
    setError(null);
    
    // Check permission status first
    checkPermissionStatus().then(status => {
      console.log('Current permission status:', status);
      
      if (status === 'denied') {
        // If already denied, show instructions to change browser settings
        setError(
          'Location access is blocked. Please enable location access in your browser settings.' +
          '\n\nFor Chrome: Click the lock icon in address bar → Site Settings → Allow location' +
          '\nFor Firefox: Click the lock icon → Clear permission → Reload the page' +
          '\nFor Safari: Go to Settings → Privacy → Location Services → Enable for this website'
        );
        setLoading(false);
        setUsingFallback(true);
        return;
      }
      
      // Proceed with location request
      if (navigator.geolocation) {
        console.log('Making geolocation request with fresh params');
        // Try clearing any cached permissions with a forced prompt
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('Position obtained successfully:', position.coords);
            const coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            console.log(`Setting location to: ${coords.latitude}, ${coords.longitude}`);
            setLocation(coords);
            setUsingFallback(false);
            setLoading(false);
            setPermissionState('granted');
            
            // Store in localStorage
            try {
              localStorage.setItem('lastKnownLocation', JSON.stringify({
                coords,
                timestamp: Date.now()
              }));
            } catch (e) {
              console.error('Error saving location to localStorage:', e);
            }
          },
          (error) => {
            console.error('Error getting location after explicit request:', error);
            console.log('Error code:', error.code);
            
            let errorMsg = '';
            if (error.code === 1) { // PERMISSION_DENIED
              errorMsg = 'Location permission was denied. Please check your browser settings to enable location access.';
              setPermissionState('denied');
            } else if (error.code === 2) { // POSITION_UNAVAILABLE
              errorMsg = 'Your location information is unavailable. Please try again.';
            } else if (error.code === 3) { // TIMEOUT
              errorMsg = 'The request to get your location timed out. Please try again.';
            }
            
            setLocation(DEFAULT_LOCATION);
            setUsingFallback(true);
            setLoading(false);
            setError(errorMsg);
          },
          { 
            timeout: GEOLOCATION_TIMEOUT,
            maximumAge: 0, // Force fresh location
            enableHighAccuracy: true 
          }
        );
      } else {
        setLoading(false);
        setUsingFallback(true);
        setError('Geolocation is not supported by your browser');
      }
    });
  }, [checkPermissionStatus]);

  useEffect(() => {
    // Check permission status first
    checkPermissionStatus().then(status => {
      console.log('Initial permission status:', status);
      
      // If already denied, don't even try
      if (status === 'denied') {
        console.log('Permission already denied, using default location');
        setLocation(DEFAULT_LOCATION);
        setUsingFallback(true);
        setLoading(false);
        return;
      }
      
      const timeoutId = window.setTimeout(() => {
        if (loading) {
          console.log('Geolocation timed out, using default location');
          setLocation(DEFAULT_LOCATION);
          setUsingFallback(true);
          setLoading(false);
          setError(null);
        }
      }, GEOLOCATION_TIMEOUT);

      // Only try to get location if not already denied
      getLocationFromBrowser();

      return () => {
        clearTimeout(timeoutId);
      };
    });
  }, [getLocationFromBrowser, checkPermissionStatus]);

  return { 
    location, 
    loading, 
    error, 
    usingFallback, 
    requestLocationPermission,
    permissionState
  };
} 