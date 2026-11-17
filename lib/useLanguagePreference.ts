"use client";
// Adapted persistence pattern from TransitSave LanguageContext.tsx (MIT).
// Copyright (c) 2026 Subash Nagaraj V. See third_party/transitsave.LICENSE.
// Revision 83ee7b057ef0ed3bd0c7e45a7142b10b39d304a4: SSR-safe effect,
// strict locale validation, namespaced key and denied-storage handling added.
import { useEffect, useState } from "react";
import { languageSchema, type Language } from "./schemas";
export function useLanguagePreference() {
  const [language, setLanguage] = useState<Language>("en-IN");
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const p = languageSchema.safeParse(
        localStorage.getItem("metrosathi.language"),
      );
      if (p.success) setLanguage(p.data);
    } catch {}
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated)
      try {
        localStorage.setItem("metrosathi.language", language);
      } catch {}
  }, [language, hydrated]);
  return [language, setLanguage] as const;
}
