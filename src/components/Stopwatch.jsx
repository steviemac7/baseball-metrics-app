import { useState, useEffect, useRef } from 'react';
import { Timer, RefreshCw, Flag, Play, Square } from 'lucide-react';

const Stopwatch = ({ onClose }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [finishes, setFinishes] = useState([]);
    const requestRef = useRef();
    const startTimeRef = useRef(0);

    const animate = (time) => {
        if (startTimeRef.current > 0) {
            setElapsed(performance.now() - startTimeRef.current);
            requestRef.current = requestAnimationFrame(animate);
        }
    };

    const handleAction = () => {
        if (!isRunning) {
            // Start or Resume
            const now = performance.now();
            if (finishes.length === 0 && elapsed === 0) {
                // Fresh Start
                startTimeRef.current = now;
            } else {
                // Resume: adjust start time so that (now - newStart) = elapsed
                startTimeRef.current = now - elapsed;
            }

            setIsRunning(true);
            requestRef.current = requestAnimationFrame(animate);
        } else {
            // Lap / Finish for an athlete
            const currentElapsed = performance.now() - startTimeRef.current;
            const newFinishes = [...finishes, currentElapsed];
            setFinishes(newFinishes);

            // If 5th athlete, stop automatically
            if (newFinishes.length >= 5) {
                stopTimer();
            }
        }
    };

    const stopTimer = () => {
        setIsRunning(false);
        cancelAnimationFrame(requestRef.current);
        // Ensure final display matches the last frame/calculation
        if (startTimeRef.current > 0) {
            setElapsed(performance.now() - startTimeRef.current);
        }
    };

    const handleReset = () => {
        setIsRunning(false);
        setFinishes([]);
        setElapsed(0);
        startTimeRef.current = 0;
        cancelAnimationFrame(requestRef.current);
    };

    useEffect(() => {
        return () => cancelAnimationFrame(requestRef.current);
    }, []);

    const formatTime = (ms) => {
        return (ms / 1000).toFixed(3);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700 p-6 space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center">
                            <Timer className="mr-2 text-blue-500" />
                            Multi-Athlete Stopwatch
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">
                            Time up to 5 athletes in a single race.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>

                {/* Main Timer Display */}
                <div className="text-center py-6 bg-gray-900 rounded-xl border border-gray-700">
                    <span className="text-6xl font-bold text-white font-mono tabular-nums">
                        {formatTime(elapsed)}
                    </span>
                    <span className="text-gray-500 ml-2 text-xl">s</span>
                </div>

                {/* Results List */}
                <div className="space-y-2">
                    {[0, 1, 2, 3, 4].map((index) => (
                        <div key={index} className={`flex justify-between items-center p-3 rounded-lg border ${finishes[index]
                            ? 'bg-gray-700/50 border-gray-600'
                            : 'bg-gray-800/30 border-gray-800 text-gray-600'
                            }`}>
                            <span className="font-medium">Athlete {index + 1}</span>
                            <span className={`font-mono font-bold ${finishes[index] ? 'text-white' : ''}`}>
                                {finishes[index] ? `${formatTime(finishes[index])}s` : '--'}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Controls */}
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={handleReset}
                        className="py-3 rounded-xl font-bold text-lg flex items-center justify-center transition-all bg-gray-700 hover:bg-gray-600 text-white"
                    >
                        <RefreshCw className="mr-2 w-5 h-5" />
                        Reset
                    </button>

                    <button
                        onClick={stopTimer}
                        disabled={!isRunning}
                        className={`py-3 rounded-xl font-bold text-lg flex items-center justify-center transition-all ${isRunning
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                            }`}
                    >
                        <Square className="mr-2 w-5 h-5 fill-current" />
                        Stop
                    </button>

                    <button
                        onClick={handleAction}
                        disabled={!isRunning && finishes.length >= 5}
                        className={`py-3 rounded-xl font-bold text-lg flex items-center justify-center transition-all ${isRunning
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : finishes.length >= 5
                                    ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                                    : 'bg-green-600 hover:bg-green-700 text-white' // Resume or Start
                            }`}
                    >
                        {isRunning ? (
                            <>
                                <Flag className="mr-2 w-5 h-5" />
                                Split
                            </>
                        ) : finishes.length > 0 && finishes.length < 5 ? (
                            <>
                                <Play className="mr-2 w-5 h-5" />
                                Resume
                            </>
                        ) : (
                            <>
                                <Play className="mr-2 w-5 h-5" />
                                Start
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Stopwatch;
