'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

const emptySubscribe = () => () => {};

// Detects "hydration is complete, we're running on the client" without an
// effect + setState (which would trigger cascading renders) — getSnapshot
// resolves to true only once React has swapped in the client render.
const useMounted = () => useSyncExternalStore(emptySubscribe, () => true, () => false);

const ThemeToggle = () => {
    const { resolvedTheme, setTheme } = useTheme();
    const mounted = useMounted();

    const isDark = mounted ? resolvedTheme === 'dark' : true;

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="theme-toggle"
            aria-label={isDark ? 'Switch to day theme' : 'Switch to night theme'}
            title={isDark ? 'Switch to day theme' : 'Switch to night theme'}
        >
            {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
    );
};

export default ThemeToggle;
