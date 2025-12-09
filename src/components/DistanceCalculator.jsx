import { useState, useEffect } from 'react';
import { MapPin, RefreshCw, Ruler } from 'lucide-react';

const DistanceCalculator = ({ onClose }) => {
    const [currentPos, setCurrentPos] = useState(null);
    const [homePlatePos, setHomePlatePos] = useState(null);
    const [error, setError] = useState(null);
    const [watching, setWatching] = useState(true);

    useEffect(() => {
        let watchId;
        if (watching) {
            if (!navigator.geolocation) {
                setError('Geolocation is not supported by your browser');
                return;
            }

            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    setCurrentPos({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                    setError(null);
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
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [watching]);

    const setHomePlate = () => {
        if (currentPos) {
            setHomePlatePos(currentPos);
        }
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

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700 p-6 space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center">
                            <Ruler className="mr-2 text-blue-500" />
                            Distance Calculator
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">
                            Set Home Plate, then walk to measure distance.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
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
                                {currentPos ? (
                                    <p className="text-green-400 text-sm font-mono flex items-center mt-1">
                                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                        Updating... (±{Math.round(currentPos.accuracy * 3.28084)}ft)
                                    </p>
                                ) : (
                                    <p className="text-yellow-500 text-sm">Acquiring signal...</p>
                                )}
                            </div>
                            {homePlatePos && (
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase font-semibold">Home Plate</p>
                                    <p className="text-white text-sm">Set</p>
                                </div>
                            )}
                        </div>

                        {/* Main Display */}
                        <div className="text-center py-8">
                            <span className="text-6xl font-bold text-white font-mono">
                                {distance.toFixed(1)}
                            </span>
                            <span className="text- gray-500 ml-2 text-xl">ft</span>
                        </div>

                        {/* Action */}
                        <button
                            onClick={setHomePlate}
                            disabled={!currentPos}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg flex items-center justify-center transition-all"
                        >
                            <MapPin className="mr-2" />
                            Set Home Plate Here
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DistanceCalculator;
