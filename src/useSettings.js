import { useEffect, useState } from 'react';

const KEY = 'mfn.settings.v1';

export const DEFAULTS = {
  openaiKey: '',
  serpKey: '',
  model: 'gpt-6.1-sol',
  remember: false,
  focus: 'India',
  aiAngle: true,
  link: '',
  tweetCount: 7,
  disclaimer: 'Mutual fund investments are subject to market risks. Read all scheme related documents carefully.',
};

// Keys live in this browser only. "Remember" decides localStorage vs sessionStorage.
export function useSettings() {
  const [s, setS] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
      return { ...DEFAULTS, ...JSON.parse(raw || '{}') };
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    const json = JSON.stringify(s);
    const [keep, drop] = s.remember ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
    keep.setItem(KEY, json);
    drop.removeItem(KEY);
  }, [s]);

  return [s, setS];
}
