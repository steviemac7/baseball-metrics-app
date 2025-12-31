
import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { Target } from 'lucide-react';

const PitchingGrid = ({
    counts = {},     // Legacy/Simple counts: { 1: 2, 2: 0, ... }
    pitches = [],    // Detailed pitches: [{ location: 1, x: 20, y: 30 }, ...]
    onSquareClick,   // (squareIndex, {x, y}) => void
    onPitchClick,    // Optional: (pitchId) => void. If provided, dots become interactive.
    readOnly = false,
    size = 'md',      // sm, md, lg
    targetZones = [], // Array of square IDs that are "targets"
    renderSquare      // Optional: (displayId, count) => ReactNode. Overrides internal dot rendering.
}) => {
    // Custom Mapping for Display IDs
    // We want Center 4 to be 1, 2, 3, 4.
    // 0-15 Indices:
    // 0  1  2  3
    // 4  5  6  7
    // 8  9 10 11
    // 12 13 14 15
    // So indices 5,6,9,10 are the center.
    // Let's map them:
    const DISPLAY_MAPPING = {
        5: 1, 6: 2,
        9: 3, 10: 4,
        // Outer Ring (arbitrary clockwise or reading order)
        0: 5, 1: 6, 2: 7, 3: 8,
        7: 9, 11: 10, 15: 11,
        14: 12, 13: 13, 12: 14, 8: 15, 4: 16
    };

    // Helper to get logic ID (0-15) from Display ID (1-16) if needed, 
    // but here we iterate 0-15 and show the mapped ID.

    const handleSquareClick = (e, displayId) => {
        // Prevent adding a pitch if we just clicked a dot (event bubbling)
        // But the dot click handler should stop propagation ideally.
        if (readOnly || !onSquareClick) return;

        const rect = e.currentTarget.getBoundingClientRect();
        // Calculate percentage relative to the square
        // Clamp between 0-100 just in case
        const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));

        onSquareClick(displayId, { x, y });
    };

    // Timer ref for long press
    const pressTimer = useRef(null);

    // Helper to render dots or custom content
    const renderContent = (displayId) => {
        const count = counts[displayId] || 0;

        if (renderSquare) {
            return renderSquare(displayId, count);
        }

        // Default Dot Rendering
        // Find specific pitches for this square if 'pitches' prop is provided
        const squarePitches = pitches.length > 0
            ? pitches.filter(p => p.location === displayId)
            : [];

        // Use specific pitches if avail, else fallback to count generation
        const renderCount = squarePitches.length > 0 ? squarePitches.length : count;

        return Array.from({ length: renderCount }).map((_, i) => {
            const pitch = squarePitches[i];

            // If pitch has specific coords, use them. Else fallback to algo.
            // Algo: stacked/randomized slightly
            const hasCoords = pitch && pitch.x !== undefined && pitch.y !== undefined;
            const top = hasCoords ? `${pitch.y}% ` : `${20 + (i * 15 % 60)}% `;
            const left = hasCoords ? `${pitch.x}% ` : `${20 + (i * 23 % 60)}% `;
            // If precise, center the dot on the click (offset by half width/height)
            // Dot is 12x12px (w-3 h-3 is 0.75rem = 12px)
            // Using transform translate is better for centering
            const transform = hasCoords ? 'translate(-50%, -50%)' : 'none';

            // Interaction
            const isInteractive = !!onPitchClick && !!pitch?.id;

            return (
                <div
                    key={i}
                    onPointerDown={(e) => {
                        if (isInteractive) {
                            // Start Timer
                            pressTimer.current = setTimeout(() => {
                                onPitchClick(pitch.id);
                                pressTimer.longPressed = true;
                                // Optional: Visual feedback here?
                            }, 800); // 800ms threshold
                            pressTimer.longPressed = false;
                        }
                    }}
                    onPointerUp={(e) => {
                        if (pressTimer.current) {
                            clearTimeout(pressTimer.current);
                            pressTimer.current = null;
                        }
                    }}
                    onPointerLeave={(e) => {
                        if (pressTimer.current) {
                            clearTimeout(pressTimer.current);
                            pressTimer.current = null;
                        }
                    }}
                    onClick={(e) => {
                        if (isInteractive) {
                            if (pressTimer.longPressed) {
                                e.stopPropagation(); // Block click if it was a long press (action handled)
                            }
                            // Else: Bubbles up to Square -> Records new pitch
                        }
                    }}
                    className={clsx(
                        "absolute w-3 h-3 bg-white rounded-full border border-red-500 shadow-sm transition-transform select-none touch-none",
                        isInteractive ? "cursor-pointer hover:border-red-700 z-20 active:scale-150 active:bg-red-200" : "pointer-events-none"
                    )}
                    title={isInteractive ? "Hold to remove" : ""}
                    style={{
                        top,
                        left,
                        transform,
                        backgroundImage: 'radial-gradient(circle at 30% 30%, #fff, #ddd)',
                    }}
                />
            );
        });
    };



    // Outer Container is slightly larger to fit wild zones
    // We'll use a grid layout: 
    // Row 1: High (spans 3)
    // Row 2: Left, Main Grid, Right
    // Row 3: Low (spans 3) - or maybe Main Grid spans middle

    // Actually simplicity:
    // Grid: 
    //  .  High  .
    // Left Main Right
    //  .  Low   .
    // That's 3x3.
    // High / Low should probably span width of Main?
    // Left / Right should span height of Main?
    // Let's do a flex/grid setup.
    const sizeClasses = {
        sm: { grid: 'w-48 h-48', side: 'h-48', wSide: 'w-8', hTop: 'h-8' },
        md: { grid: 'w-72 h-72', side: 'h-72', wSide: 'w-12', hTop: 'h-12' },
        lg: { grid: 'w-96 h-96', side: 'h-96', wSide: 'w-16', hTop: 'h-16' }
    };

    const currentSize = sizeClasses[size] || sizeClasses.md;

    return (
        <div className="flex flex-col items-center gap-2 select-none">
            {/* High Wild Zone (ID 17) */}
            <div
                onClick={(e) => handleSquareClick(e, 17)}
                className={clsx(
                    "relative w-full rounded border border-gray-600 flex items-center justify-center cursor-pointer transition-colors",
                    currentSize.hTop,
                    targetZones.includes(17) ? "bg-green-500/20" : "hover:bg-red-900/20 bg-gray-800/50"
                )}
            >
                {!renderSquare && <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">High (Wild)</span>}
                {renderContent(17)}
            </div>

            <div className="flex items-center gap-2">
                {/* Left Wild Zone (ID 19) */}
                <div
                    onClick={(e) => handleSquareClick(e, 19)}
                    className={clsx(
                        "relative rounded border border-gray-600 flex flex-col items-center justify-center cursor-pointer transition-colors",
                        currentSize.side, currentSize.wSide,
                        targetZones.includes(19) ? "bg-green-500/20" : "hover:bg-red-900/20 bg-gray-800/50"
                    )}
                >
                    {!renderSquare && <span className="text-[10px] text-gray-500 font-bold uppercase -rotate-90 whitespace-nowrap">Wild Left</span>}
                    {renderContent(19)}
                </div>

                {/* Main 4x4 Grid */}
                <div className={clsx("relative grid grid-cols-4 grid-rows-4 gap-0 border-2 border-white bg-slate-800", currentSize.grid)}>
                    {/* Red Strike Zone Border around center 2x2 */}
                    <div className="absolute top-[25%] left-[25%] w-[50%] h-[50%] border-4 border-red-600 pointer-events-none z-10 box-border" />

                    {Array.from({ length: 16 }).map((_, index) => {
                        const displayId = DISPLAY_MAPPING[index];
                        const isTarget = targetZones.includes(displayId);

                        return (
                            <div
                                key={index}
                                onClick={(e) => handleSquareClick(e, displayId)}
                                className={clsx(
                                    "relative border border-gray-600 flex items-center justify-center cursor-pointer transition-colors",
                                    readOnly ? 'cursor-default' : 'active:bg-slate-600',
                                    isTarget ? "bg-green-500/20 hover:bg-green-500/30" : "hover:bg-slate-700/50"
                                )}
                            >
                                <span className={clsx("absolute top-1 left-1 text-[10px] select-none", isTarget ? "text-green-400 font-bold" : "text-gray-600")}>
                                    {displayId}
                                </span>

                                {renderContent(displayId)}
                            </div>
                        );
                    })}
                </div>

                {/* Right Wild Zone (ID 20) */}
                <div
                    onClick={(e) => handleSquareClick(e, 20)}
                    className={clsx(
                        "relative rounded border border-gray-600 flex flex-col items-center justify-center cursor-pointer transition-colors",
                        currentSize.side, currentSize.wSide,
                        targetZones.includes(20) ? "bg-green-500/20" : "hover:bg-red-900/20 bg-gray-800/50"
                    )}
                >
                    {!renderSquare && <span className="text-[10px] text-gray-500 font-bold uppercase rotate-90 whitespace-nowrap">Wild Right</span>}
                    {renderContent(20)}
                </div>
            </div>

            {/* Low Wild Zone (ID 18) - Dirt */}
            <div
                onClick={(e) => handleSquareClick(e, 18)}
                className={clsx(
                    "relative w-full rounded border border-gray-600 flex items-center justify-center cursor-pointer transition-colors",
                    currentSize.hTop,
                    targetZones.includes(18) ? "bg-green-500/20" : "hover:bg-amber-900/20 bg-gray-800/50"
                )}
            >
                {!renderSquare && <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Dirt (Low)</span>}
                {renderContent(18)}
            </div>
        </div>
    );
};

export default PitchingGrid;

