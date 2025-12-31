import { useState, useEffect, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import TrendChart from '../components/TrendChart';
import DistanceCalculator from '../components/DistanceCalculator';
import Stopwatch from '../components/Stopwatch';
import { Plus, Table, TrendingUp, Trash2, Ruler, Timer, X, Mic, MicOff, Save, Undo2, RefreshCcw } from 'lucide-react';
import clsx from 'clsx';
import { METRIC_GROUPS } from '../utils/constants';
import PitchingGrid from '../components/PitchingGrid';



const UserProfile = () => {
    const { id } = useParams();
    const { user: currentUser } = useAuth();
    const [profileUser, setProfileUser] = useState(null);
    const [allMetrics, setAllMetrics] = useState([]);
    const [activeTab, setActiveTab] = useState('Biometric Data');

    // History & Review State
    const [pitchingHistory, setPitchingHistory] = useState([]);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [reviewSessionDate, setReviewSessionDate] = useState(null);

    // Input state
    const [inputState, setInputState] = useState({});
    const [showGpsModal, setShowGpsModal] = useState(false);
    const [gpsTargetMetric, setGpsTargetMetric] = useState(null);
    const [isStopwatchOpen, setIsStopwatchOpen] = useState(false);
    const [selectedDataPoint, setSelectedDataPoint] = useState(null);

    // Voice Entry State
    const [activeMicMetricId, setActiveMicMetricId] = useState(null);
    const activeMicRef = useRef(null); // Ref to track active ID without re-binding effects
    const [isListening, setIsListening] = useState(false);
    const [voiceFeedback, setVoiceFeedback] = useState(null);

    const recognition = useState(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return null;

        const reco = new SpeechRecognition();
        reco.continuous = true;
        reco.interimResults = true;
        reco.lang = 'en-US';
        return reco;
    })[0];

    useEffect(() => {
        if (!recognition) return;

        recognition.onresult = (event) => {
            const results = Array.from(event.results);
            const latestResult = results[results.length - 1];

            if (latestResult.isFinal) {
                const transcript = latestResult[0].transcript.toLowerCase().trim();
                // Use ref to call the latest version of the handler to avoid stale closures
                if (handleVoiceCommandRef.current) {
                    handleVoiceCommandRef.current(transcript);
                }
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setVoiceFeedback({ type: 'error', message: 'Mic Error' });
            setIsListening(false);
            setActiveMicMetricId(null);
            activeMicRef.current = null;
        };

        recognition.onend = () => {
            if (isListening) {
                setIsListening(false);
                setActiveMicMetricId(null);
                activeMicRef.current = null;
            }
        };

        return () => {
            recognition.stop();
        };
    }, [recognition]); // Stable dependency

    const STOPWATCH_METRICS = [
        'dash_60', 'dash_30', 'home_to_2b', 'steal_2b', // Foot Speed
        'pop_2b', 'pop_3b' // Pop Times
    ];

    useEffect(() => {
        loadData();
    }, [id, currentUser]);

    const [error, setError] = useState(null);

    const loadData = async () => {
        try {
            setError(null);
            const userId = id || currentUser.id;
            console.log("Loading data for:", userId);

            const u = await dataService.getUserById(userId);
            console.log("User data:", u);

            if (!u) {
                // If u is null, it means doc doesn't exist but read succeeded
                setError(`Profile document not found for ID: ${userId}`);
                return;
            }

            setProfileUser(u);

            // Check permissions
            const metrics = await dataService.getUserMetrics(userId);
            setAllMetrics(metrics);
        } catch (err) {
            console.error("Load Data Error:", err);
            setError(err.message);
        }
    };

    // Voice command handler
    const handleVoiceCommand = (transcript) => {
        const currentMetricId = activeMicRef.current;
        if (!currentMetricId) return;

        // Check for "enter"
        const hasEnter = transcript.includes('enter');

        // Extract number
        const numberMatch = transcript.match(/(\d+(\.\d+)?)/);

        if (numberMatch) {
            const val = numberMatch[0];
            setInputState(prev => ({ ...prev, [currentMetricId]: val }));

            if (hasEnter) {
                handleAddMetric(currentMetricId, val);

                setVoiceFeedback({ type: 'success', message: 'Saved!' });
                setTimeout(() => setVoiceFeedback(null), 3000);
            }
        } else if (hasEnter) {
            const currentVal = inputState[currentMetricId];
            if (currentVal) {
                handleAddMetric(currentMetricId, currentVal);
                stopListening();
            }
        }
    };

    // Keep a ref to the latest handler
    const handleVoiceCommandRef = useRef(handleVoiceCommand);
    useEffect(() => {
        handleVoiceCommandRef.current = handleVoiceCommand;
    });

    const startListening = (metricId) => {
        if (!recognition) {
            alert("Voice not supported.");
            return;
        }
        try {
            recognition.stop();
            setActiveMicMetricId(metricId);
            activeMicRef.current = metricId;
            setIsListening(true);
            recognition.start();
        } catch (e) {
            console.error(e);
        }
    };

    const stopListening = () => {
        if (recognition) recognition.stop();
        setIsListening(false);
        setActiveMicMetricId(null);
        activeMicRef.current = null;
    };

    const toggleMic = (metricId) => {
        if (activeMicMetricId === metricId && isListening) {
            stopListening();
        } else {
            startListening(metricId);
        }
    };

    const handleAddMetric = async (metricId, value) => {
        if (!value) return;

        await dataService.addMetric({
            userId: profileUser.id,
            date: new Date().toISOString().split('T')[0], // Today
            metricId,
            value: parseFloat(value)
        });

        // Clear input
        setInputState(prev => ({ ...prev, [metricId]: '' }));
        loadData();
    };

    const handleDeleteMetric = async (metricId) => {
        if (window.confirm('Delete this entry?')) {
            await dataService.deleteMetric(metricId);
            loadData();
        }
    };

    // Pitching Feature State
    const [previousSessions, setPreviousSessions] = useState([]);

    // REDESIGN: We now store an array of pitch objects to allow filtering by target context.
    // pitchSession.pitches = [{ location: 1, target: 'Strike', type: 'Fastball', timestamp: 123 }]
    const [pitchSession, setPitchSession] = useState({
        date: new Date().toISOString().split('T')[0],
        type: 'Fastball',
        target: 'Strike',
        pitches: []
    });

    const loadPitchingHistory = async (userId) => {
        const history = await dataService.getPitchingSessions(userId);
        // Sort by date desc
        history.sort((a, b) => new Date(b.date) - new Date(a.date));
        setPreviousSessions(history);
    };

    const handleGridClick = (displayId, coords = {}) => {
        // Add new pitch with current context
        const newPitch = {
            id: `pitch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique ID
            location: displayId,
            target: pitchSession.target,
            type: pitchSession.type,
            timestamp: Date.now(),
            x: coords.x, // Save relative x %
            y: coords.y  // Save relative y %
        };

        setPitchSession(prev => ({
            ...prev,
            pitches: [...prev.pitches, newPitch]
        }));
    };

    // --- Session Management Handlers ---

    // 1. Reset Session (Clear All)
    const handleResetSession = () => {
        if (window.confirm("Are you sure you want to clear the filters and DELETE ALL pitches in this session?")) {
            setPitchSession(prev => ({ ...prev, pitches: [] }));
        }
    };

    // 2. Reset Context (Clear only current Type + Target)
    const handleResetContext = () => {
        if (window.confirm(`Clear all ${pitchSession.type}s aimed at ${pitchSession.target}?`)) {
            setPitchSession(prev => ({
                ...prev,
                pitches: prev.pitches.filter(p =>
                    !(p.target === pitchSession.target && p.type === pitchSession.type)
                )
            }));
        }
    };

    // 3. Undo (Remove last added pitch for CURRENT CONTEXT)
    const handleUndo = () => {
        setPitchSession(prev => {
            // Find indices of pitches that match current context
            const matchingIndices = prev.pitches.reduce((acc, p, index) => {
                if (p.target === prev.target && p.type === prev.type) {
                    acc.push(index);
                }
                return acc;
            }, []);

            if (matchingIndices.length === 0) return prev; // Nothing to undo in this context

            const lastMatchIndex = matchingIndices[matchingIndices.length - 1];

            // Create new array excluding that specific pitch
            const newPitches = [
                ...prev.pitches.slice(0, lastMatchIndex),
                ...prev.pitches.slice(lastMatchIndex + 1)
            ];

            return {
                ...prev,
                pitches: newPitches
            };
        });
    };

    // 4. Delete Specific Pitch (by ID)
    const handleDeletePitch = (pitchId) => {
        if (window.confirm("Delete this pitch?")) {
            setPitchSession(prev => ({
                ...prev,
                pitches: prev.pitches.filter(p => p.id !== pitchId)
            }));
        }
    };


    // Load Pitching History on mount or user change
    useEffect(() => {
        if (id) {
            const loadPitchingHistory = async () => {
                const sessions = await dataService.getPitchingSessions(id);
                // Sort by date desc
                const sorted = sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setPitchingHistory(sorted);
            };
            loadPitchingHistory();
        }
    }, [id]);

    const handleSelectSession = (session) => {
        let hydratedPitches = [];

        // Scenario 1: Legacy "Counts" Map (Oldest Data)
        // If 'pitches' array is missing/empty but 'counts' exists (key: locationId, value: count)
        if ((!session.pitches || session.pitches.length === 0) && session.counts) {
            Object.entries(session.counts).forEach(([locationId, count]) => {
                for (let i = 0; i < count; i++) {
                    hydratedPitches.push({
                        id: `legacy-${locationId}-${i}-${Date.now()}`,
                        location: parseInt(locationId),
                        type: session.pitchType || 'Fastball',
                        target: session.intendedTarget || 'Strike',
                        timestamp: session.timestamp || session.date || Date.now()
                        // No x/y, Grid will fallback to algo
                    });
                }
            });
        }
        // Scenario 2: "Pitches" Array (Newer Data) or "PitchData" (Intermediate Format)
        else {
            const rawPitches = session.pitches || session.pitchData || [];
            hydratedPitches = rawPitches.map(p => ({
                ...p,
                type: p.type || session.pitchType || 'Fastball',
                target: p.target || session.intendedTarget || 'Strike'
            }));
        }

        // Detect Mixed/Variable sessions and default to a standard view so data appears
        const initialType = (session.pitchType === 'Mixed' || !session.pitchType) ? 'Fastball' : session.pitchType;
        const initialTarget = (session.intendedTarget === 'Variable' || !session.intendedTarget) ? 'Strike' : session.intendedTarget;

        setPitchSession({
            pitches: hydratedPitches,
            type: initialType,
            target: initialTarget,
            date: session.date
        });
        setIsReviewMode(true);
        setReviewSessionDate(session.date || session.timestamp);
    };

    const handleExitReview = () => {
        setIsReviewMode(false);
        setReviewSessionDate(null);
        setPitchSession({
            pitches: [],
            type: 'Fastball',
            target: 'Strike',
            date: new Date().toISOString().split('T')[0]
        });
    };

    const handleDeleteSession = async () => {
        if (!isReviewMode || !reviewSessionDate) return;

        if (window.confirm("Are you sure you want to PERMANENTLY delete this saved session? This cannot be undone.")) {
            try {
                // Find ID from history based on current review date (timestamp/date)
                const sessionToDelete = pitchingHistory.find(s => (s.date || s.timestamp) === reviewSessionDate);
                if (sessionToDelete) {
                    await dataService.deletePitchingSession(sessionToDelete.id);
                    alert("Session deleted.");
                    loadPitchingHistory(profileUser.id); // Refresh list
                    handleExitReview(); // Exit review mode
                }
            } catch (e) {
                console.error("Error deleting session:", e);
                alert("Failed to delete session.");
            }
        }
    };

    const handleSavePitchingSession = async () => {
        if (pitchSession.pitches.length === 0) {
            alert("No pitches recorded!");
            return;
        }

        try {
            // Calculate total counts for summary (optional, or just save raw pitches)
            // We'll save the raw pitches mostly, but maybe a summary for the UI list?
            // Actually existing getPitchingSessions expected `locations`.
            // We should probably update the backend service to handle this new structure or 
            // map it back. 
            // For now, let's save the RAW pitches as `sessionPitches` and 
            // also a simplified `locations` map for backward compatibility or list view if needed.

            // Map pitches to a simple count for list view summary (total pitches)
            const locationCounts = {};
            pitchSession.pitches.forEach(p => {
                locationCounts[p.location] = (locationCounts[p.location] || 0) + 1;
            });

            await dataService.savePitchingSession({
                userId: profileUser.id,
                date: pitchSession.date,
                pitchType: 'Mixed', // Since we can change type mid-session
                mixedTypes: true,
                // aggregate info
                target: 'Variable', // or Primary?
                variableTargets: true,

                locations: locationCounts, // Backward compat for list view count
                pitchData: pitchSession.pitches // The real data
            });

            alert("Session Saved!");
            setPitchSession({
                ...pitchSession,
                pitches: []
            });
            loadPitchingHistory(profileUser.id);
        } catch (e) {
            console.error(e);
            alert("Error saving session");
        }
    };

    // Load pitching history when user loads
    useEffect(() => {
        if (profileUser) {
            loadPitchingHistory(profileUser.id);
        }
    }, [profileUser]);

    const getMetricHistory = (metricId) => {
        return allMetrics
            .filter(m => m.metricId === metricId)
            .sort((a, b) => {
                const dateDiff = new Date(b.date) - new Date(a.date);
                if (dateDiff !== 0) return dateDiff;
                return new Date(b.timestamp) - new Date(a.timestamp);
            });
    };

    if (error) {
        const isProfileMissing = error.includes('Profile document not found');
        return (
            <div className="p-6 text-red-400 bg-gray-800 rounded-xl border border-red-500/20 m-4">
                <h3 className="font-bold text-lg mb-2">Error Loading Profile</h3>
                <p>{error}</p>
                <div className="mt-4 text-sm text-gray-500">
                    <p>Logged in as: <span className="text-white font-mono">{currentUser.email}</span></p>
                    <p>User ID: <span className="text-white font-mono">{currentUser.id}</span></p>
                </div>

                {isProfileMissing && (
                    <button
                        onClick={async () => {
                            if (window.confirm(`Initialize ${currentUser.email} as ADMIN?`)) {
                                await dataService.ensureAdminProfile(currentUser.id, currentUser.email);
                                window.location.reload();
                            }
                        }}
                        className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                    >
                        Initialize as Admin
                    </button>
                )}

                <div className="mt-6 text-sm text-gray-500 border-t border-gray-700 pt-4">
                    <p>Tip: If this persists, check Firestore Security Rules.</p>
                </div>
            </div>
        );
    }

    if (!profileUser) {
        return <div className="text-white p-6">Loading profile... (ID: {id || currentUser.id})</div>;
    }

    // Security check: Only Admin or the User themselves can view
    if (currentUser.role !== 'ADMIN' && currentUser.id !== profileUser.id) {
        return <Navigate to="/" />;
    }

    const isAdmin = currentUser.role === 'ADMIN';

    const renderMetricInput = (metric, group) => {
        if (!isAdmin) return null;

        const handleSubmit = async (e) => {
            e.preventDefault();
            const val = inputState[metric.id];
            if (!val || isNaN(parseFloat(val))) return;

            const date = document.getElementById(`date-${metric.id}`).value;
            await dataService.addMetric({
                userId: profileUser.id,
                date,
                metricId: metric.id,
                value: parseFloat(val)
            });
            setInputState({ ...inputState, [metric.id]: '' });
            loadData();
        };

        return (
            <form onSubmit={handleSubmit} className="flex items-center space-x-2 mt-2">
                <input
                    type="date"
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    id={`date-${metric.id}`}
                />
                <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder={`${metric.unit}`}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white w-24"
                    value={inputState[metric.id] || ''}
                    onChange={(e) => setInputState({ ...inputState, [metric.id]: e.target.value })}
                />

                {metric.id === 'dist_tee' && (
                    <button
                        type="button"
                        onClick={() => {
                            setGpsTargetMetric(metric.id);
                            setShowGpsModal(true);
                        }}
                        className="p-1 px-2 bg-gray-700 border border-gray-600 text-blue-400 hover:bg-gray-600 rounded flex items-center"
                        title="Use GPS Rangefinder"
                    >
                        <Ruler size={16} />
                    </button>
                )}
                {STOPWATCH_METRICS.includes(metric.id) && (
                    <button
                        type="button"
                        onClick={() => setIsStopwatchOpen(true)}
                        className="p-1 px-2 bg-gray-700 border border-gray-600 text-green-400 hover:bg-gray-600 rounded flex items-center"
                        title="Open Stopwatch"
                    >
                        <Timer size={16} />
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => toggleMic(metric.id)}
                    className={clsx(
                        "p-1 px-2 border rounded flex items-center transition-all",
                        activeMicMetricId === metric.id && isListening
                            ? "bg-red-500/20 border-red-500 text-red-500 animate-pulse"
                            : "bg-gray-700 border-gray-600 text-gray-400 hover:text-white hover:bg-gray-600"
                    )}
                    title="Voice Entry"
                >
                    {activeMicMetricId === metric.id && isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                {activeMicMetricId === metric.id && voiceFeedback && (
                    <span className={clsx(
                        "text-xs px-2 py-1 rounded",
                        voiceFeedback.type === 'error' ? "text-red-400 bg-red-500/10" : "text-green-400 bg-green-500/10"
                    )}>
                        {voiceFeedback.message}
                    </span>
                )}
                <button
                    type="submit"
                    className="p-1 bg-blue-600 rounded text-white hover:bg-blue-700"
                    title="Add Entry"
                >
                    <Plus size={16} />
                </button>
            </form>
        );
    };

    // Pitching Stats Logic (Dynamic Filtering & Corrected Mapping)
    // 1. Filter pitches to only those thrown when the CURRENT target and CURRENT pitch type were selected.
    // RELAXED MATCH: Trim whitespace and lowercase to handle legacy sloppy data
    const filteredPitches = pitchSession.pitches.filter(p => {
        const pType = (p.type || '').trim().toLowerCase();
        const sType = (pitchSession.type || '').trim().toLowerCase();
        const pTarget = (p.target || '').trim().toLowerCase();
        const sTarget = (pitchSession.target || '').trim().toLowerCase();

        return pType === sType && pTarget === sTarget;
    });

    // 2. Aggregate counts for the Grid based on filtered pitches
    const visibleGridCounts = {};
    filteredPitches.forEach(p => {
        visibleGridCounts[p.location] = (visibleGridCounts[p.location] || 0) + 1;
    });

    // 3. Define Targets with NEW Display IDs (Center = 1,2,3,4)
    // Matches DISPLAY_MAPPING in PitchingGrid.jsx
    const TARGET_ZONES = {
        'Strike': [1, 2, 3, 4],     // Center
        'Left': [5, 14, 15, 16],    // Left Col (IDs 5, 16, 15, 14 sorted roughly) -> actually [5,16,15,14]
        // Let's use exact IDs from derivation: [5, 14, 15, 16].
        // Correction for Left based on derivation: 0->5, 4->16, 8->15, 12->14. So Left is [5, 14, 15, 16].
        'Right': [8, 9, 10, 11],    // Right Col
        'Up': [5, 6, 7, 8],         // Top Row
        'Below': [11, 12, 13, 14]   // Bottom Row
    };

    const currentTargetZones = TARGET_ZONES[pitchSession.target] || [];

    const totalPitches = filteredPitches.length;
    let hits = 0;
    let wildPitches = 0;

    filteredPitches.forEach(p => {
        if (currentTargetZones.includes(p.location)) {
            hits++;
        }
        // Wild Pitches are IDs > 16
        if (p.location > 16) {
            wildPitches++;
        }
    });

    const misses = totalPitches - hits;
    const hitPct = totalPitches > 0 ? ((hits / totalPitches) * 100).toFixed(1) : 0;
    const missPct = totalPitches > 0 ? ((misses / totalPitches) * 100).toFixed(1) : 0;
    const wildPct = totalPitches > 0 ? ((wildPitches / totalPitches) * 100).toFixed(1) : 0;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h1 className="text-3xl font-bold text-white mb-2">{profileUser.name}</h1>
                <div className="flex space-x-6 text-gray-400">
                    <span>{profileUser.team && `Team: ${profileUser.team}`}</span>
                    <span>@{profileUser.username}</span>
                    <span>{profileUser.biometrics?.dob}</span>
                    <span>{profileUser.biometrics?.heightFt}'{profileUser.biometrics?.heightIn}"</span>
                    <span>{profileUser.biometrics?.weight} lbs</span>
                    <span>{profileUser.biometrics?.gender}</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700">
                {['Biometric Data', 'Pitching Velo', 'Pitching Accuracy', ...Object.keys(METRIC_GROUPS).filter(k => k !== 'Pitching Velo')].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={clsx(
                            "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                            activeTab === tab
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="space-y-6">
                {activeTab === 'Biometric Data' ? (
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h3 className="text-xl font-bold text-white mb-4">Biometric Information</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="p-4 bg-gray-700/50 rounded-lg">
                                <p className="text-sm text-gray-400">Date of Birth</p>
                                <p className="text-lg font-semibold text-white">{profileUser.biometrics?.dob || 'N/A'}</p>
                            </div>
                            <div className="p-4 bg-gray-700/50 rounded-lg">
                                <p className="text-sm text-gray-400">Height</p>
                                <p className="text-lg font-semibold text-white">
                                    {profileUser.biometrics?.heightFt}' {profileUser.biometrics?.heightIn}"
                                </p>
                            </div>
                            <div className="p-4 bg-gray-700/50 rounded-lg">
                                <p className="text-sm text-gray-400">Weight</p>
                            </div>
                        </div>
                        {isAdmin && (
                            <p className="mt-4 text-sm text-gray-500 italic">Editing biometrics coming in v2 (please recreate user to fix)</p>
                        )}
                    </div>
                ) : activeTab === 'Pitching Accuracy' ? (

                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-6 relative">
                        {isReviewMode && (
                            <div className="bg-red-900/40 border border-red-500/50 p-4 rounded-lg mb-4 flex justify-between items-center animate-pulse">
                                <div className="flex flex-col">
                                    <span className="text-red-200 font-bold text-lg">⚠️ Read-Only Mode</span>
                                    <span className="text-red-300 text-sm">Reviewing session from {new Date(reviewSessionDate).toLocaleString()}</span>
                                </div>
                                <button
                                    onClick={handleExitReview}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold shadow-lg transition-transform transform hover:scale-105"
                                >
                                    Exit Review
                                </button>
                                {isAdmin && (
                                    <button
                                        onClick={handleDeleteSession}
                                        className="ml-2 px-3 py-2 bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-700/50 rounded flex items-center transition-colors"
                                        title="Delete this session"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Header Row: Title */}
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">Pitching Location Tracker</h3>
                            </div>
                        </div>

                        {/* Main Layout (Clean, Single Column) */}
                        <div className="space-y-6">

                            {/* 1. Dropdowns (Type, Target, Date) */}
                            {/* 1. Meta Controls (Date & Save) */}
                            <div className="flex flex-col gap-2">
                                {isAdmin && !isReviewMode && (
                                    <div className="flex justify-start">
                                        <button
                                            onClick={handleSavePitchingSession}
                                            className="flex items-center justify-center w-full md:w-auto px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-700 transition space-x-2 text-sm"
                                        >
                                            <Save size={16} />
                                            <span>Save Session</span>
                                        </button>
                                    </div>
                                )}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-end w-full gap-4">
                                    <div className="w-full md:w-auto">
                                        <label className="block text-sm font-medium text-gray-400 mb-2">New Session Date</label>
                                        <input
                                            type="date"
                                            value={pitchSession.date}
                                            onChange={(e) => setPitchSession({ ...pitchSession, date: e.target.value })}
                                            disabled={isReviewMode}
                                            className={clsx(
                                                "w-full bg-gray-700 text-white border border-gray-600 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none md:max-w-xs",
                                                isReviewMode && "opacity-70 cursor-not-allowed"
                                            )}
                                        />
                                    </div>

                                    {/* Review Historical Session */}
                                    <div className="w-full md:w-auto">
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Review Historical Session</label>
                                        <select
                                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 md:min-w-[200px]"
                                            onChange={(e) => {
                                                if (e.target.value === "") return;
                                                const session = pitchingHistory.find(s => s.id === e.target.value);
                                                if (session) handleSelectSession(session);
                                            }}
                                            value={isReviewMode && reviewSessionDate ? pitchingHistory.find(s => (s.date || s.timestamp) === reviewSessionDate)?.id || "" : ""}
                                        >
                                            <option value="">Select a session...</option>
                                            {pitchingHistory.map(session => {
                                                const sessionDate = session.date || new Date(session.timestamp).toISOString().split('T')[0];
                                                const sameDaySessions = pitchingHistory.filter(s => (s.date || new Date(s.timestamp).toISOString().split('T')[0]) === sessionDate);
                                                let labelSuffix = "";

                                                if (sameDaySessions.length > 1) {
                                                    const sorted = [...sameDaySessions].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                                                    const index = sorted.findIndex(s => s.id === session.id);
                                                    labelSuffix = ` (Session ${index + 1})`;
                                                }

                                                return (
                                                    <option key={session.id} value={session.id}>
                                                        {new Date(session.date || session.timestamp).toLocaleDateString()}{labelSuffix} - {session.pitchType} ({session.pitches?.length || (session.counts ? Object.values(session.counts).reduce((a, b) => a + b, 0) : 0)})
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Pitching Parameters (Grid: Type | Target) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                {/* Left Column: Pitch Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Pitch Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Fastball', 'Curveball', 'Changeup', 'Slider'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setPitchSession({ ...pitchSession, type })}
                                                className={clsx(
                                                    "w-full py-1 text-xs rounded transition-colors border",
                                                    pitchSession.type === type
                                                        ? "bg-blue-600 border-blue-500 text-white"
                                                        : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                                                )}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Right Column: Intended Target */}
                                <div className="flex flex-col items-center">
                                    <label className="block text-sm font-medium text-gray-400 mb-2 w-full text-center">Intended Target</label>
                                    <div className="grid grid-cols-3 gap-1 w-[120px]">
                                        {/* Top Row */}
                                        <div className="col-start-2">
                                            <button
                                                onClick={() => setPitchSession({ ...pitchSession, target: 'Up' })}
                                                className={clsx(
                                                    "w-full py-1 text-xs rounded transition-colors border",
                                                    pitchSession.target === 'Up'
                                                        ? "bg-blue-600 border-blue-500 text-white"
                                                        : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                                                )}
                                            >
                                                Up
                                            </button>
                                        </div>

                                        {/* Middle Row */}
                                        <div className="col-start-1 col-span-3 grid grid-cols-3 gap-1">
                                            <button
                                                onClick={() => setPitchSession({ ...pitchSession, target: 'Left' })}
                                                className={clsx(
                                                    "w-full py-1 text-xs rounded transition-colors border",
                                                    pitchSession.target === 'Left'
                                                        ? "bg-blue-600 border-blue-500 text-white"
                                                        : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                                                )}
                                            >
                                                Left
                                            </button>
                                            <button
                                                onClick={() => setPitchSession({ ...pitchSession, target: 'Strike' })}
                                                className={clsx(
                                                    "w-full py-1 text-xs rounded transition-colors border font-bold",
                                                    pitchSession.target === 'Strike'
                                                        ? "bg-green-600 border-green-500 text-white"
                                                        : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                                                )}
                                            >
                                                Strk
                                            </button>
                                            <button
                                                onClick={() => setPitchSession({ ...pitchSession, target: 'Right' })}
                                                className={clsx(
                                                    "w-full py-1 text-xs rounded transition-colors border",
                                                    pitchSession.target === 'Right'
                                                        ? "bg-blue-600 border-blue-500 text-white"
                                                        : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                                                )}
                                            >
                                                Right
                                            </button>
                                        </div>

                                        {/* Bottom Row */}
                                        <div className="col-start-2">
                                            <button
                                                onClick={() => setPitchSession({ ...pitchSession, target: 'Below' })}
                                                className={clsx(
                                                    "w-full py-1 text-xs rounded transition-colors border",
                                                    pitchSession.target === 'Below'
                                                        ? "bg-blue-600 border-blue-500 text-white"
                                                        : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                                                )}
                                            >
                                                Down
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Stats Row (Hits/Misses/Wild) - Just below dropdowns */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 bg-gray-700/30 rounded-lg text-center border border-gray-700">
                                    <p className="text-sm text-gray-400 uppercase">Hits</p>
                                    <p className="text-2xl font-bold text-green-400">{hits} <span className="text-sm text-gray-500">({hitPct}%)</span></p>
                                </div>
                                <div className="p-4 bg-gray-700/30 rounded-lg text-center border border-gray-700">
                                    <p className="text-sm text-gray-400 uppercase">Misses</p>
                                    <p className="text-2xl font-bold text-red-400">{misses} <span className="text-sm text-gray-500">({missPct}%)</span></p>
                                </div>
                                <div className="p-4 bg-gray-700/30 rounded-lg text-center border border-gray-700">
                                    <p className="text-sm text-gray-400 uppercase">Wild Pitches</p>
                                    <p className="text-xl font-bold text-amber-500">{wildPitches} <span className="text-sm text-gray-500">({wildPct}%)</span></p>
                                </div>
                            </div>

                            {/* 3. Side-by-Side Charts (Recording & Breakdown) */}
                            <div className="flex flex-col xl:flex-row gap-8 items-start justify-center">




                                {/* Recording Section (Grid + Controls) */}
                                <div className="flex flex-row items-start justify-center gap-4">
                                    {/* Recording Grid */}
                                    <div className="flex flex-col items-center overflow-x-auto">
                                        <h4 className="text-gray-400 font-semibold mb-2 uppercase text-sm">Recording</h4>
                                        <PitchingGrid
                                            counts={visibleGridCounts}
                                            pitches={filteredPitches}
                                            onSquareClick={!isReviewMode ? handleGridClick : undefined}
                                            onPitchClick={isAdmin && !isReviewMode ? handleDeletePitch : undefined}
                                            readOnly={!isAdmin || isReviewMode}
                                            size="responsive"
                                            targetZones={currentTargetZones}
                                        />
                                        {!isReviewMode && (
                                            <div className="mt-2 text-center text-sm text-gray-400">
                                                Tap grid to record pitch location
                                            </div>
                                        )}
                                    </div>

                                    {/* Session Controls: Undo / Reset (Right of Recording Grid) */}
                                    {isAdmin && !isReviewMode && (
                                        <div className="flex flex-col gap-2 pt-8 justify-center items-center flex-shrink-0">
                                            <button
                                                onClick={handleUndo}
                                                title="Undo Pitch"
                                                className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg border border-gray-600 transition-colors shadow-sm flex items-center justify-center"
                                            >
                                                <Undo2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={handleResetContext}
                                                title="Reset Context (Pitch/Target)"
                                                className="p-2 bg-gray-700 hover:bg-gray-600 text-yellow-400 rounded-lg border border-gray-600 transition-colors shadow-sm flex items-center justify-center"
                                            >
                                                <RefreshCcw className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={handleResetSession}
                                                title="Reset Full Session"
                                                className="p-2 bg-gray-700 hover:bg-red-900/50 text-red-400 rounded-lg border border-gray-600 transition-colors shadow-sm flex items-center justify-center"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT: Breakdown Grid */}
                                <div className="flex flex-col items-center overflow-x-auto">
                                    <h4 className="text-blue-400 font-semibold mb-2 uppercase text-sm">Breakdown</h4>
                                    <PitchingGrid
                                        counts={visibleGridCounts}
                                        size="responsive"
                                        readOnly={true}
                                        targetZones={currentTargetZones}
                                        renderSquare={(displayId, count) => {
                                            const pct = totalPitches > 0 ? Math.round((count / totalPitches) * 100) : 0;
                                            const isTarget = currentTargetZones.includes(displayId);

                                            return (
                                                <div className="w-full h-full flex flex-col items-center justify-center">
                                                    <span className={clsx("text-lg font-bold", isTarget ? "text-green-400" : "text-white")}>
                                                        {count}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {pct}%
                                                    </span>
                                                </div>
                                            );
                                        }}
                                    />
                                    <div className="mt-2 text-center text-sm text-gray-400">
                                        Number of pitches per zone
                                    </div>
                                </div>

                            </div>



                            {/* 4. Session Summary Matrix */}
                            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mt-6">
                                <h4 className="text-white font-bold mb-4">Session Summary (Hit %)</h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left text-gray-400">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-700/50">
                                            <tr>
                                                <th className="px-4 py-3">Pitch Type</th>
                                                {Object.keys(TARGET_ZONES).map(target => (
                                                    <th key={target} className="px-4 py-3 text-center">{target}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {['Fastball', 'Curveball', 'Changeup', 'Slider'].map(type => (
                                                <tr key={type} className="border-b border-gray-700 hover:bg-gray-700/20">
                                                    <td className="px-4 py-3 font-medium text-white">{type}</td>
                                                    {Object.keys(TARGET_ZONES).map(target => {
                                                        // Calculate stats for this cell
                                                        const cellPitches = pitchSession.pitches.filter(p => p.type === type && p.target === target);
                                                        const total = cellPitches.length;
                                                        let hits = 0;
                                                        const zones = TARGET_ZONES[target];

                                                        cellPitches.forEach(p => {
                                                            if (zones.includes(p.location)) hits++;
                                                        });

                                                        const hitPct = total > 0 ? Math.round((hits / total) * 100) : '-';

                                                        // Determine color based on % (simple heatmap)
                                                        let colorClass = "text-gray-500";
                                                        if (typeof hitPct === 'number') {
                                                            if (hitPct >= 70) colorClass = "text-green-400 font-bold";
                                                            else if (hitPct >= 50) colorClass = "text-yellow-400";
                                                            else colorClass = "text-red-400";
                                                        }

                                                        return (
                                                            <td key={target} className="px-4 py-3 text-center">
                                                                <div className="flex flex-col">
                                                                    <span className={clsx("text-lg", colorClass)}>
                                                                        {typeof hitPct === 'number' ? `${hitPct}%` : '-'}
                                                                    </span>
                                                                    {total > 0 && (
                                                                        <span className="text-xs text-gray-600">
                                                                            {hits}/{total}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                    </div>
                ) : ( // Default to Standard Metrics Grid for other tabs
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {(METRIC_GROUPS[activeTab] || []).map(metric => {
                            const history = getMetricHistory(metric.id);
                            const latest = history[0];

                            return (
                                <div key={metric.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                                    <div className="p-4 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
                                        <div>
                                            <h4 className="font-semibold text-white">{metric.label}</h4>
                                            <p className="text-xs text-gray-500">Unit: {metric.unit}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-bold text-blue-400">
                                                {latest ? latest.value : '-'}
                                            </span>
                                            <span className="text-xs text-gray-500 block">Current</span>
                                        </div>
                                    </div>

                                    <div className="p-4 space-y-4">
                                        {/* Controls */}
                                        {renderMetricInput(metric, activeTab)}

                                        {/* Tabs for Table/Chart */}
                                        <div className="space-y-4">
                                            <h5 className="text-sm font-medium text-gray-400 flex items-center">
                                                <TrendingUp className="w-4 h-4 mr-2" /> Recent Trend
                                            </h5>
                                            <TrendChart
                                                data={history}
                                                metricName={metric.label}
                                                unit={metric.unit}
                                                onDataPointClick={(point) => setSelectedDataPoint({ ...point, metricLabel: metric.label, unit: metric.unit })}
                                            />

                                            <details className="group">
                                                <summary className="flex items-center text-sm text-gray-400 cursor-pointer hover:text-white">
                                                    <Table className="w-4 h-4 mr-2" /> View History Table
                                                </summary>
                                                <div className="mt-2 max-h-40 overflow-y-auto">
                                                    <table className="w-full text-sm text-left text-gray-400">
                                                        <thead className="text-xs text-gray-500 uppercase bg-gray-700/50">
                                                            <tr>
                                                                <th className="px-3 py-2">Date</th>
                                                                <th className="px-3 py-2">Value</th>
                                                                {isAdmin && <th className="px-3 py-2 w-10"></th>}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {history.map(h => (
                                                                <tr key={h.id} className="border-b border-gray-700">
                                                                    <td className="px-3 py-2">{h.date}</td>
                                                                    <td className="px-3 py-2 text-white">{h.value}</td>
                                                                    {isAdmin && (
                                                                        <td className="px-3 py-2">
                                                                            <button
                                                                                onClick={() => handleDeleteMetric(h.id)}
                                                                                className="text-gray-500 hover:text-red-500 transition-colors"
                                                                                title="Delete Entry"
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </details>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {/* Closing div for lg:col-span-3 space-y-6 */}
                    </div>
                )}
            </div >

            {
                showGpsModal && (
                    <DistanceCalculator
                        onClose={() => setShowGpsModal(false)}
                        onSelect={(dist) => {
                            if (gpsTargetMetric) {
                                setInputState({ ...inputState, [gpsTargetMetric]: dist });
                            }
                            setShowGpsModal(false);
                            setGpsTargetMetric(null);
                        }}
                    />
                )
            }
            {
                isStopwatchOpen && (
                    <Stopwatch onClose={() => setIsStopwatchOpen(false)} />
                )
            }

            {/* Metric Detail Modal */}
            {
                selectedDataPoint && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDataPoint(null)}>
                        <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-sm w-full p-6 relative" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => setSelectedDataPoint(null)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>

                            <h3 className="text-xl font-bold text-white mb-1">{selectedDataPoint.metricLabel}</h3>
                            <p className="text-gray-400 text-sm mb-6">Data Point Details</p>

                            <div className="space-y-4">
                                <div className="bg-gray-700/50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-400 mb-1">Date</p>
                                    <p className="text-lg font-medium text-white">
                                        {new Date(selectedDataPoint.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>

                                <div className="bg-gray-700/50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-400 mb-1">Value</p>
                                    <p className="text-3xl font-bold text-blue-400">
                                        {selectedDataPoint.value} <span className="text-lg font-normal text-gray-500">{selectedDataPoint.unit}</span>
                                    </p>
                                </div>

                                {isAdmin && (
                                    <button
                                        onClick={async () => {
                                            if (window.confirm('Are you sure you want to delete this specific entry?')) {
                                                await handleDeleteMetric(selectedDataPoint.id);
                                                setSelectedDataPoint(null);
                                            }
                                        }}
                                        className="w-full mt-4 flex items-center justify-center px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500/20"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Entry
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default UserProfile;
