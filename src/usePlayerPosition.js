import { useState, useEffect } from "react";

// A "custom hook" is just a function that uses React's built-in hooks.
// The rule: its name must start with "use".
// Think of it like a Python class that manages state for you.

export function usePlayerPosition() {
  // useState is like declaring a variable that React watches.
  // When you call setPosition(...), the component that uses this hook re-renders.
  const [position, setPosition] = useState(null);
  const [error, setError]       = useState(null);

  // useEffect runs *after* the component renders.
  // The empty [] at the end means "run this once, when the component first mounts."
  // Think of it like __init__ in a Python class.
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by this browser");
      return;
    }

    // watchPosition is like a while loop that fires every time GPS updates.
    // It gives us back a "watcher ID" we can use to stop it later.
    const watcherId = navigator.geolocation.watchPosition(
      // SUCCESS callback — fired every time we get a new GPS reading
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy, // meters — useful later for display
        });
      },

      // ERROR callback — GPS denied, unavailable, timed out, etc.
      (err) => {
        setError(err.message);
      },

      // OPTIONS — tune how GPS behaves
      {
        enableHighAccuracy: true, // use GPS chip, not just wifi triangulation
        maximumAge: 5000,         // accept a cached reading up to 5 seconds old
        timeout: 10000,           // give up and call error after 10 seconds
      }
    );

    // This is the "cleanup" function. React calls it when the component unmounts.
    // Like a Python context manager's __exit__ — stops the GPS watcher.
    return () => navigator.geolocation.clearWatch(watcherId);

  }, []); // <- the empty array is the "dependency list". [] means run once only.

  return { position, error };
}