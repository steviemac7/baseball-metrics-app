import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { METRIC_GROUPS } from '../utils/constants';
import { ArrowLeft, Save, Calendar, Filter, X, Check, Mic, MicOff, AlertCircle } from 'lucide-react';

const BulkMetricEntry = () => {
    const navigate = useNavigate();
    const [allUsers, setAllUsers] = useState([]);
    const [selectedTeams, setSelectedTeams] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(Object.keys(METRIC_GROUPS)[0]);
    const [selectedMetricId, setSelectedMetricId] = useState(METRIC_GROUPS[Object.keys(METRIC_GROUPS)[0]][0].id);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [values, setValues] = useState({});
    const [saving, setSaving] = useState(false);

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

    const [values, setValues] = useState({});
    const [saving, setSaving] = useState(false);

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
        // Expected format: "Name Value" e.g. "Pat 85" or "Patrick 88.5"
        // Regex: Last part matches number (integer or decimal), rest is name
        const match = transcript.match(/(.*)\s+(\d+(\.\d+)?)$/);

        if (!match) {
            setVoiceFeedback({ type: 'error', message: `Could not parse: "${transcript}"` });
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
        setValues(prev => ({
            ...prev,
            [userId]: value
        }));
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

            // Iterate through all users who have a value entered
            for (const [userId, value] of Object.entries(values)) {
                if (value && value.trim() !== '') {
                    promises.push(dataService.addMetric({
                        userId,
                        date,
                        metricId: selectedMetricId,
                        value: parseFloat(value)
                    }));
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

    return (
        <div className="max-w-4xl mx-auto p-4">
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
                                type="number"
                                step="any"
                                placeholder={getSelectedMetricUnit()}
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
        </div>
    );
};

export default BulkMetricEntry;
