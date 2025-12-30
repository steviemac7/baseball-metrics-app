import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { METRIC_GROUPS } from '../utils/constants';
import Stopwatch from '../components/Stopwatch';
import DistanceCalculator from '../components/DistanceCalculator';
import { ArrowLeft, Save, Calendar, Filter, X, Check, Mic, MicOff, AlertCircle, Timer, Ruler } from 'lucide-react';

const BulkMetricEntry = () => {
    const navigate = useNavigate();
    const [allUsers, setAllUsers] = useState([]);
    const [selectedTeams, setSelectedTeams] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(Object.keys(METRIC_GROUPS)[0]);
    const [selectedMetricId, setSelectedMetricId] = useState(METRIC_GROUPS[Object.keys(METRIC_GROUPS)[0]][0].id);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [values, setValues] = useState({});
    const [saving, setSaving] = useState(false);
    const [isStopwatchOpen, setIsStopwatchOpen] = useState(false);
    const [isGpsOpen, setIsGpsOpen] = useState(false);

    const STOPWATCH_METRICS = [
        'dash_60', 'dash_30', 'home_to_2b', 'steal_2b', // Foot Speed
        'pop_2b', 'pop_3b' // Pop Times
    ];

    useEffect(() => {
        loadUsers();
    }, []);

    // When group changes, default to first metric in that group
    useEffect(() => {
        const firstMetricInGroup = METRIC_GROUPS[selectedGroup][0];
        if (firstMetricInGroup) {
            setSelectedMetricId(firstMetricInGroup.id);
        }
    }, [selectedGroup]);

    const loadUsers = async () => {
        try {
            const usersData = await dataService.getUsers();
            // Filter for non-admin users only
            const athletes = usersData.filter(u => u.role !== 'ADMIN');
            // Sort alphabetically
            athletes.sort((a, b) => a.name.localeCompare(b.name));
            setAllUsers(athletes);
        } catch (error) {
            console.error("Error loading users:", error);
            alert("Failed to load users.");
        }
    };

    const uniqueTeams = useMemo(() => {
        const teams = new Set(allUsers.map(u => u.team || 'Unassigned').filter(Boolean));
        return Array.from(teams).sort();
    }, [allUsers]);

    const filteredUsers = useMemo(() => {
        if (selectedTeams.length === 0) return allUsers;
        return allUsers.filter(u => selectedTeams.includes(u.team || 'Unassigned'));
    }, [allUsers, selectedTeams]);

    const toggleTeam = (team) => {
        if (selectedTeams.includes(team)) {
            setSelectedTeams(prev => prev.filter(t => t !== team));
        } else {
            setSelectedTeams(prev => [...prev, team]);
        }
    };



    // Voice Entry State
    const [isListening, setIsListening] = useState(false);
    const [voiceFeedback, setVoiceFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

    const recognition = useMemo(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return null;

        const reco = new SpeechRecognition();
        reco.continuous = true; // Keep listening
        reco.interimResults = false;
        reco.lang = 'en-US';
        return reco;
    }, []);

    useEffect(() => {
        if (!recognition) return;

        recognition.onresult = (event) => {
            const lastResult = event.results[event.results.length - 1];
            if (lastResult.isFinal) {
                const transcript = lastResult[0].transcript.trim();
                handleVoiceCommand(transcript);
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
            setVoiceFeedback({ type: 'error', message: 'Mic Error: ' + event.error });
        };

        recognition.onend = () => {
            // If we intended to listen, restart? For now, let's auto-stop to be safe or just sync state
            if (isListening) {
                // recognition.start(); // continuous mode might stop on silence
                setIsListening(false);
            }
        };

        return () => {
            recognition.stop();
        };
    }, [recognition, filteredUsers]); // Dependency on filteredUsers for matching logic (indirectly via handleVoiceCommand if not memoized elsewhere)

    const handleVoiceCommand = (transcript) => {
        // Expected format: "Name Value Number" e.g. "Pat Value 85"
        // Cleanup: Remove common punctuation
        const cleanTranscript = transcript.replace(/[.,;]/g, '').toLowerCase();

        // Regex: (Name) "value" (Number)
        const match = cleanTranscript.match(/(.*)\s+value\s+(\d+(\.\d+)?)$/);

        if (!match) {
            setVoiceFeedback({ type: 'error', message: `Say "Name VALUE Number"` });
            return;
        }

        const rawName = match[1].trim().toLowerCase();
        const value = match[2];

        // Find user in FILTERED list
        // 1. Exact Name Match
        // 2. Exact Nickname Match
        // 3. First Name Match (if unique in filtered list)

        const candidates = filteredUsers.filter(u => {
            const name = u.name.toLowerCase();
            const nickname = (u.nickname || '').toLowerCase();
            const firstName = name.split(' ')[0];

            return name === rawName || nickname === rawName || firstName === rawName;
        });

        if (candidates.length === 0) {
            setVoiceFeedback({ type: 'error', message: `Athlete not found: "${rawName}"` });
        } else if (candidates.length > 1) {
            // Check for exact full name match to resolve ambiguity?
            const exactMatch = candidates.find(u => u.name.toLowerCase() === rawName || (u.nickname || '').toLowerCase() === rawName);
            if (exactMatch) {
                updateUserValue(exactMatch.id, exactMatch.name, value);
            } else {
                setVoiceFeedback({ type: 'error', message: `Multiple matches for "${rawName}"` });
            }
        } else {
            // Single match
            updateUserValue(candidates[0].id, candidates[0].name, value);
        }
    };

    const updateUserValue = (userId, userName, value) => {
        setValues(prev => {
            const existingValue = prev[userId];
            // If there's an existing value and it's for a multi-entry metric (mph or distance), append it
            // For now, let's assume if it's not empty, we append, or simpler: just check metric type?
            // User requested appending for GPS, which implies text handling.

            // Actually, we should probably only append if it's appropriate. 
            // But for GPS usage, the user specifically asked "If the user assigns multiple values... keep appending"

            let newValue = value;
            if (existingValue && String(existingValue).trim() !== '') {
                newValue = `${existingValue} ${value}`;
            }

            return {
                ...prev,
                [userId]: newValue
            };
        });
        setVoiceFeedback({ type: 'success', message: `Set ${userName}: ${value}` });

        // Clear feedback after 3s
        setTimeout(() => setVoiceFeedback(null), 3000);
    };

    const toggleListening = () => {
        if (!recognition) {
            alert("Voice recognition not supported in this browser.");
            return;
        }

        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            try {
                recognition.start();
                setIsListening(true);
                setVoiceFeedback({ type: 'info', message: 'Listening... (Say "Name Value")' });
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleValueChange = (userId, value) => {
        setValues(prev => ({
            ...prev,
            [userId]: value
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const promises = [];
            // const isMph = getSelectedMetricUnit() === 'mph'; // Removed in favor of dynamic check inside loop or helper

            // Iterate through all users who have a value entered
            for (const [userId, value] of Object.entries(values)) {
                // Ensure value is handled as a string for validation, but keep original type for saving if needed
                if (value !== null && value !== undefined && String(value).trim() !== '') {
                    // Check for multi-value types: mph or feet
                    const unit = getSelectedMetricUnit();
                    const isMultiValue = unit === 'mph' || unit === 'ft' || unit === 'feet';

                    if (isMultiValue) {
                        // Split by comma or space
                        const parts = String(value).split(/[\s,]+/).filter(v => v.trim() !== '');
                        parts.forEach(part => {
                            const floatVal = parseFloat(part);
                            if (!isNaN(floatVal)) {
                                promises.push(dataService.addMetric({
                                    userId,
                                    date,
                                    metricId: selectedMetricId,
                                    value: floatVal
                                }));
                            }
                        });
                    } else {
                        promises.push(dataService.addMetric({
                            userId,
                            date,
                            metricId: selectedMetricId,
                            value: parseFloat(value)
                        }));
                    }
                }
            }

            if (promises.length === 0) {
                alert("No values to save.");
                setSaving(false);
                return;
            }

            await Promise.all(promises);

            alert(`Successfully saved ${promises.length} entries!`);
            // Clear values after save
            setValues({});
        } catch (error) {
            console.error("Error saving metrics:", error);
            alert("Error saving metrics: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const getSelectedMetricLabel = () => {
        const group = METRIC_GROUPS[selectedGroup];
        const metric = group.find(m => m.id === selectedMetricId);
        return metric ? metric.label : '';
    };

    const getSelectedMetricUnit = () => {
        const group = METRIC_GROUPS[selectedGroup];
        const metric = group.find(m => m.id === selectedMetricId);
        return metric ? metric.unit : '';
    };

    // Stopwatch Assignment State
    const [assignedSplitMap, setAssignedSplitMap] = useState({}); // { 0: "Name", 1: "Name" }
    const [assigningSplit, setAssigningSplit] = useState(null); // { index: 0, value: 12.34 }

    const handleAssignSplit = (index, value) => {
        if (index === 'RESET') {
            setAssignedSplitMap({});
            return;
        }
        setAssigningSplit({ index, value });
    };

    const handleUseGpsDistance = (distance) => {
        setAssigningSplit({ index: 'GPS', value: distance });
    };

    const handleSelectAthlete = (userId, userName) => {
        if (!assigningSplit) return;

        // 1. Update the metric value
        updateUserValue(userId, userName, assigningSplit.value);

        // 2. Mark this split as assigned
        setAssignedSplitMap(prev => ({
            ...prev,
            [assigningSplit.index]: userName
        }));

        // 3. Close modal
        setAssigningSplit(null);
    };

    return (
        <div className="max-w-4xl mx-auto p-4 relative">
            {/* ... existing header/filter code ... */}

            {/* ... existing main content ... */}
            {/* WRAP existing content logic or just inject modal at end */}

            <div className="mb-6 flex items-center justify-between">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Dashboard
                </button>
                <h1 className="text-2xl font-bold text-white">Bulk Metric Entry</h1>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-8 shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Date Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                            <Calendar className="w-4 h-4 mr-2" /> Date
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Group Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                            <Filter className="w-4 h-4 mr-2" /> Category
                        </label>
                        <select
                            value={selectedGroup}
                            onChange={(e) => setSelectedGroup(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {Object.keys(METRIC_GROUPS).map(group => (
                                <option key={group} value={group}>{group}</option>
                            ))}
                        </select>
                    </div>

                    {/* Metric Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Metric
                        </label>
                        <select
                            value={selectedMetricId}
                            onChange={(e) => setSelectedMetricId(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {METRIC_GROUPS[selectedGroup].map(metric => (
                                <option key={metric.id} value={metric.id}>{metric.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Team Filter */}
                <div className="mt-6 pt-6 border-t border-gray-700">
                    <label className="block text-sm font-medium text-gray-400 mb-3">
                        Filter by Team
                    </label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedTeams([])}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${selectedTeams.length === 0
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                                }`}
                        >
                            All Teams
                        </button>
                        {uniqueTeams.map(team => (
                            <button
                                key={team}
                                onClick={() => toggleTeam(team)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border flex items-center ${selectedTeams.includes(team)
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                                    }`}
                            >
                                {selectedTeams.includes(team) && <Check className="w-3 h-3 mr-1" />}
                                {team}
                            </button>
                        ))}
                    </div>
                    {selectedTeams.length > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                            Showing {filteredUsers.length} of {allUsers.length} athletes
                        </p>
                    )}
                </div>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
                <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Enter Results</h2>
                        <p className="text-sm text-gray-400">
                            {getSelectedMetricLabel()} ({getSelectedMetricUnit()})
                        </p>
                    </div>

                    <div className="flex items-center space-x-3">
                        {voiceFeedback && (
                            <div className={`text-sm px-3 py-1 rounded flex items-center ${voiceFeedback.type === 'error' ? 'bg-red-500/10 text-red-400' :
                                voiceFeedback.type === 'success' ? 'bg-green-500/10 text-green-400' :
                                    'bg-blue-500/10 text-blue-400'
                                }`}>
                                {voiceFeedback.type === 'error' && <AlertCircle className="w-4 h-4 mr-2" />}
                                {voiceFeedback.message}
                            </div>
                        )}

                        <button
                            onClick={toggleListening}
                            className={`p-2 rounded-lg transition-all ${isListening
                                ? 'bg-red-500/20 text-red-500 animate-pulse border border-red-500/50'
                                : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'
                                }`}
                            title={isListening ? "Stop Voice Entry" : "Start Voice Entry"}
                        >
                            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>

                        {STOPWATCH_METRICS.includes(selectedMetricId) && (
                            <button
                                onClick={() => setIsStopwatchOpen(true)}
                                className="p-2 rounded-lg bg-gray-700 text-green-400 hover:text-white hover:bg-gray-600 transition-all border border-green-500/20"
                                title="Open Stopwatch"
                            >
                                <Timer className="w-5 h-5" />
                            </button>
                        )}

                        {selectedMetricId === 'dist_tee' && (
                            <button
                                onClick={() => setIsGpsOpen(!isGpsOpen)}
                                className={`p-2 rounded-lg transition-all border ${isGpsOpen
                                    ? 'bg-blue-600 text-white border-blue-500'
                                    : 'bg-gray-700 text-blue-400 hover:bg-gray-600 border-blue-500/20'}`}
                                title="Open GPS Rangefinder"
                            >
                                <Ruler className="w-5 h-5" />
                            </button>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${saving
                                ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                                }`}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? 'Saving...' : 'Save All Entries'}
                        </button>
                    </div>
                </div>

                <div className="divide-y divide-gray-700">
                    {filteredUsers.map(user => (
                        <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors">
                            <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-bold mr-3 border border-gray-600">
                                    {user.name.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium text-gray-200">{user.name}</span>
                                    {user.nickname && <span className="text-xs text-blue-400 italic">"{user.nickname}"</span>}
                                </div>
                            </div>
                            <input
                                type={['mph', 'ft', 'feet'].includes(getSelectedMetricUnit()) ? 'text' : 'number'}
                                step="any"
                                placeholder={['mph', 'ft', 'feet'].includes(getSelectedMetricUnit()) ? "e.g. 90 85 88" : getSelectedMetricUnit()}
                                value={values[user.id] || ''}
                                onChange={(e) => handleValueChange(user.id, e.target.value)}
                                onWheel={(e) => e.target.blur()} // Prevent accidentally changing value while scrolling
                                className="w-32 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-right focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-600"
                            />
                        </div>
                    ))}

                    {filteredUsers.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            No athletes found.
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-700 bg-gray-900/50 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`flex items-center px-6 py-2 rounded-lg font-medium transition-all ${saving
                            ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                            : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20'
                            }`}
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : 'Save All Entries'}
                    </button>
                </div>
            </div>
            {isStopwatchOpen && (
                <div className="mt-8">
                    <Stopwatch
                        onClose={() => setIsStopwatchOpen(false)}
                        embedded={true}
                        onAssignSplit={handleAssignSplit}
                        assignedSplits={assignedSplitMap}
                    />
                </div>
            )}
            {isGpsOpen && (
                <div className="mt-8">
                    <DistanceCalculator
                        onClose={() => setIsGpsOpen(false)}
                        embedded={true}
                        onSelect={handleUseGpsDistance}
                    />
                </div>
            )}

            {/* Assignment Modal */}
            {assigningSplit && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-white">Assign Time: {assigningSplit.value}s</h3>
                            <button onClick={() => setAssigningSplit(null)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <div className="p-2 overflow-y-auto flex-1">
                            <p className="text-gray-400 text-sm px-2 mb-2">Select athlete to assign this time to:</p>
                            {filteredUsers.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => handleSelectAthlete(user.id, user.name)}
                                    className="w-full text-left p-3 hover:bg-gray-700 rounded-lg flex items-center justify-between group"
                                >
                                    <span className="text-gray-200 font-medium group-hover:text-white">{user.name}</span>
                                    {user.nickname && <span className="text-xs text-gray-500 italic">{user.nickname}</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default BulkMetricEntry;
