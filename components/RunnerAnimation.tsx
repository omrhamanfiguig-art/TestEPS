import React, { useState, useEffect, useRef } from 'react';
import type { TestState, LucLegerLevel } from '../types';
import { RunningManIcon } from './Icons';
import { SHUTTLE_TIMELINE } from '../constants';

interface RunnerAnimationProps {
  testState: TestState;
  currentLevel: LucLegerLevel | null;
  time?: number;
}

export const RunnerAnimation: React.FC<RunnerAnimationProps> = ({ testState, currentLevel, time = 0 }) => {
    const [progressPercent, setProgressPercent] = useState<number>(0);
    const [isMovingLeftToRight, setIsMovingLeftToRight] = useState<boolean>(true);
    const animationFrameRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        if (testState !== 'running') {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            startTimeRef.current = null;
            setProgressPercent(0);
            setIsMovingLeftToRight(true);
            return;
        }

        if (startTimeRef.current === null) {
            // Synchronize with the elapsed time passed into component if test is already running
            startTimeRef.current = performance.now() - (time * 1000);
        }

        const updatePosition = () => {
            if (startTimeRef.current === null) return;
            const now = performance.now();
            const elapsedSeconds = (now - startTimeRef.current) / 1000;

            // Find current shuttle segment in exact timeline
            const segment = SHUTTLE_TIMELINE.find(
                s => elapsedSeconds >= s.startTime && elapsedSeconds < s.endTime
            ) || SHUTTLE_TIMELINE[SHUTTLE_TIMELINE.length - 1];

            const progressInSegment = Math.min(Math.max((elapsedSeconds - segment.startTime) / segment.duration, 0), 1);
            const isForward = segment.shuttleIndex % 2 === 0;

            // Forward: 0% -> 100% (0m to 20m)
            // Backward: 100% -> 0% (20m to 0m)
            const pos = isForward ? progressInSegment * 100 : (1 - progressInSegment) * 100;

            setProgressPercent(pos);
            setIsMovingLeftToRight(isForward);

            animationFrameRef.current = requestAnimationFrame(updatePosition);
        };

        animationFrameRef.current = requestAnimationFrame(updatePosition);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [testState, time]);

    const shuttleTime = currentLevel?.tempsNavette || 8.47;

    return (
        <div className="w-full mt-4 bg-gray-50 dark:bg-gray-900/60 p-3 rounded-2xl border border-gray-200/80 dark:border-gray-700">
            {/* Visual Track */}
            <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-visible my-3">
                {/* Track progress fill */}
                <div 
                    className="h-full bg-indigo-500/30 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                />

                {/* Runner Icon */}
                <div 
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                    style={{ left: `${progressPercent}%` }}
                >
                    <div 
                        className="p-1 rounded-full bg-indigo-600 text-white shadow-md transform transition-transform"
                        style={{ transform: isMovingLeftToRight ? 'scaleX(-1)' : 'scaleX(1)' }}
                    >
                        <RunningManIcon className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Track markers */}
            <div className="flex justify-between text-xs font-black text-gray-700 dark:text-gray-200 px-1">
                <span className="bg-gray-200/80 dark:bg-gray-800 px-2.5 py-0.5 rounded-md border border-gray-300 dark:border-gray-700">0م</span>
                <span className="bg-gray-200/80 dark:bg-gray-800 px-2.5 py-0.5 rounded-md border border-gray-300 dark:border-gray-700">20م</span>
            </div>
        </div>
    );
};