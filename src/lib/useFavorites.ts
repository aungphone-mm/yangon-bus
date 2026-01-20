'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'yangon-bus-favorites';

export interface FavoriteStop {
  id: number;
  name_en: string;
  name_mm: string;
  township_en: string;
  addedAt: number;
}

/**
 * Custom hook for managing favorite stops in localStorage
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteStop[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFavorites(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
      setFavorites([]);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever favorites change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
      } catch (error) {
        console.error('Failed to save favorites:', error);
      }
    }
  }, [favorites, isLoaded]);

  // Check if a stop is favorited
  const isFavorite = useCallback(
    (stopId: number): boolean => {
      return favorites.some((f) => f.id === stopId);
    },
    [favorites]
  );

  // Add a stop to favorites
  const addFavorite = useCallback(
    (stop: { id: number; name_en: string; name_mm: string; township_en: string }) => {
      setFavorites((prev) => {
        if (prev.some((f) => f.id === stop.id)) {
          return prev; // Already exists
        }
        return [
          ...prev,
          {
            id: stop.id,
            name_en: stop.name_en,
            name_mm: stop.name_mm,
            township_en: stop.township_en,
            addedAt: Date.now(),
          },
        ];
      });
    },
    []
  );

  // Remove a stop from favorites
  const removeFavorite = useCallback((stopId: number) => {
    setFavorites((prev) => prev.filter((f) => f.id !== stopId));
  }, []);

  // Toggle favorite status
  const toggleFavorite = useCallback(
    (stop: { id: number; name_en: string; name_mm: string; township_en: string }) => {
      if (isFavorite(stop.id)) {
        removeFavorite(stop.id);
      } else {
        addFavorite(stop);
      }
    },
    [isFavorite, addFavorite, removeFavorite]
  );

  // Clear all favorites
  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  // Get favorites sorted by most recently added
  const getFavoritesSorted = useCallback((): FavoriteStop[] => {
    return [...favorites].sort((a, b) => b.addedAt - a.addedAt);
  }, [favorites]);

  return {
    favorites,
    isLoaded,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    clearFavorites,
    getFavoritesSorted,
    count: favorites.length,
  };
}
