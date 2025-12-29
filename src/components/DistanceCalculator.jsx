import { useState, useEffect, useRef } from 'react';
import { MapPin, RefreshCw, Ruler } from 'lucide-react';

const DistanceCalculator = ({ onClose, onSelect, embedded = false }) => {
    const [currentPos, setCurrentPos] = useState(null);
    const [homePlatePos, setHomePlatePos] = useState(() => {
        const saved = localStorage.getItem('homePlatePos');
        return saved ? JSON.parse(saved) : null;
    });
    const [error, setError] = useState(null);
    const [isAveraging, setIsAveraging] = useState(false);
    const [sampleCount, setSampleCount] = useState(0);
    const samplesRef = useRef([]);

    useEffect(() => {
        let watchId;
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const newPos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };

                setCurrentPos(newPos);
                setError(null);

                // If averaging, collect samples in Ref
                if (isAveraging) {
                    samplesRef.current.push(newPos);
                    setSampleCount(samplesRef.current.length);
                }
            },
            (err) => {
                setError('Unable to retrieve your location. Please allow GPS access.');
                console.error(err);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [isAveraging]);

    // Finish averaging after 5 seconds
    useEffect(() => {
        if (isAveraging) {
            const timer = setTimeout(() => {
                finishAveraging();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isAveraging]);

    const startSetHomePlate = () => {
        samplesRef.current = [];
        setSampleCount(0);
        setIsAveraging(true);
    };

    const finishAveraging = () => {
        const collectedSamples = samplesRef.current;
        if (collectedSamples.length === 0) {
            setIsAveraging(false);
            return;
        }

        // Calculate average
        const sumLat = collectedSamples.reduce((acc, curr) => acc + curr.lat, 0);
        const sumLng = collectedSamples.reduce((acc, curr) => acc + curr.lng, 0);

        const avgPos = {
            lat: sumLat / collectedSamples.length,
            lng: sumLng / collectedSamples.length,
            accuracy: collectedSamples[collectedSamples.length - 1].accuracy
        };

        setHomePlatePos(avgPos);
        localStorage.setItem('homePlatePos', JSON.stringify(avgPos));
        setIsAveraging(false);
    };

    const calculateDistance = (pos1, pos2) => {
        if (!pos1 || !pos2) return 0;

        const R = 20902231; // Radius of the earth in feet
        const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
        const dLon = (pos2.lng - pos1.lng) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in feet
        return d;
    };

    const distance = homePlatePos && currentPos ? calculateDistance(homePlatePos, currentPos) : 0;

    const content = (
        <div className={`bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-6 ${embedded ? 'w-full shadow-lg' : 'max-w-md w-full'}`}>
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        <Ruler className="mr-2 text-blue-500" />
                        GPS Rangefinder
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Set Home Plate, then walk to measure distance.
                    </p>
                </div>
                {!embedded && (
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                )}
            </div>

            {error ? (
                <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Current Status */}
                    <div className="bg-gray-700/50 p-4 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Current Location</p>
                            {isAveraging ? (
                                <p className="text-blue-400 text-sm font-bold animate-pulse">
                                    Calibrating... ({sampleCount} samples)
                                </p>
                            ) : currentPos ? (
                                <p className="text-green-400 text-sm font-mono flex items-center mt-1">
                                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                    Live (±{Math.round(currentPos.accuracy * 3.28084)}ft)
                                </p>
                            ) : (
                                <p className="text-yellow-500 text-sm">Acquiring signal...</p>
                            )}
                        </div>
                        {homePlatePos && !isAveraging && (
                            <div className="text-right">
                                <p className="text-xs text-gray-500 uppercase font-semibold">Home Plate</p>
                                <p className="text-white text-sm">Set (Avg)</p>
                            </div>
                        )}
                    </div>

                    {/* Main Display */}
                    <div className="text-center py-8">
                        <span className="text-6xl font-bold text-white font-mono">
                            {distance.toFixed(1)}
                        </span>
                        <span className="text-gray-500 ml-2 text-xl">ft</span>
                    </div>

                    {/* Action */}
                    <button
                        onClick={startSetHomePlate}
                        disabled={!currentPos || isAveraging}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center transition-all ${isAveraging
                            ? 'bg-blue-600/50 text-blue-200 cursor-wait'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
                            }`}
                    >
                        {isAveraging ? (
                            <>
                                <RefreshCw className="mr-2 animate-spin" />
                                Calibrating Home Plate...
                            </>
                        ) : (
                            <>
                                <MapPin className="mr-2" />
                                {homePlatePos ? 'Reset Home Plate' : 'Set Home Plate'}
                            </>
                        )}
                    </button>

                    {onSelect && (
                        <button
                            onClick={() => onSelect(parseFloat(distance.toFixed(1)))}
                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg flex items-center justify-center transition-all"
                        >
                            Use {distance.toFixed(1)} ft
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    if (embedded) {
        return content;
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            {content}
        </div>
    );
};

export default DistanceCalculator;

// End of file
