 import { useState, useEffect, useCallback } from "react";
 
 export interface CapacitySettings {
   defaultCapacityLimit: number;
   alertAt80Percent: boolean;
   blockAboveLimit: boolean;
   typeWeights: {
     recurring: number;
     planning: number;
     project: number;
     extra: number;
   };
 }
 
 const STORAGE_KEY = "capacity_settings";
 
 const defaultSettings: CapacitySettings = {
   defaultCapacityLimit: 15,
   alertAt80Percent: true,
   blockAboveLimit: false,
   typeWeights: {
     recurring: 2,
     planning: 1,
     project: 4,
     extra: 3,
   },
 };
 
 function loadSettings(): CapacitySettings {
   try {
     const stored = localStorage.getItem(STORAGE_KEY);
     if (stored) {
       return { ...defaultSettings, ...JSON.parse(stored) };
     }
   } catch {
     // Ignore parse errors
   }
   return defaultSettings;
 }
 
 function saveSettings(settings: CapacitySettings) {
   try {
     localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
   } catch {
     // Ignore storage errors
   }
 }
 
 export function useCapacitySettings() {
   const [settings, setSettings] = useState<CapacitySettings>(loadSettings);
 
   const updateSettings = useCallback((updates: Partial<CapacitySettings>) => {
     setSettings((prev) => {
       const newSettings = { ...prev, ...updates };
       saveSettings(newSettings);
       return newSettings;
     });
   }, []);
 
   const updateTypeWeight = useCallback(
     (type: keyof CapacitySettings["typeWeights"], value: number) => {
       setSettings((prev) => {
         const newSettings = {
           ...prev,
           typeWeights: { ...prev.typeWeights, [type]: value },
         };
         saveSettings(newSettings);
         return newSettings;
       });
     },
     []
   );
 
   return {
     settings,
     updateSettings,
     updateTypeWeight,
   };
 }