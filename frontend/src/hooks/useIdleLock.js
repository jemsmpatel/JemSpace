import { useEffect, useRef } from "react";

export default function useIdleLock(onIdle, delay = 15000) {
    const timer = useRef(null);

    useEffect(() => {
        const resetTimer = () => {
            if (timer.current) clearTimeout(timer.current);

            timer.current = setTimeout(() => {
                onIdle();
            }, delay);
        };

        const events = ['mousemove', 'keydown', 'click', 'scroll'];

        events.forEach(e => window.addEventListener(e, resetTimer));

        resetTimer();

        return () => {
            if (timer.current) clearTimeout(timer.current);
            events.forEach(e => window.removeEventListener(e, resetTimer));
        };
    }, [onIdle, delay]);
}