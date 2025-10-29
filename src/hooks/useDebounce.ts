import { useCallback, useEffect, useRef } from 'react';

export function useDebounce<T extends (...args: any[]) => void>(
	callback: T,
	delayMs: number
) {
	const timeoutRef = useRef<number | undefined>(undefined);
	const callbackRef = useRef<T>(callback);

	useEffect(() => {
		callbackRef.current = callback;
	}, [callback]);

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				window.clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	return useCallback((...args: Parameters<T>) => {
		if (timeoutRef.current) {
			window.clearTimeout(timeoutRef.current);
		}
		timeoutRef.current = window.setTimeout(() => {
			callbackRef.current(...args);
		}, delayMs);
	}, [delayMs]);
}
