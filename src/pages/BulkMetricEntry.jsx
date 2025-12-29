import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { METRIC_GROUPS } from '../utils/constants';
import { ArrowLeft, Save, Calendar, Filter } from 'lucide-react';

const BulkMetricEntry = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
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
            const allUsers = await dataService.getUsers();
            // Filter for non-admin users only
            const athletes = allUsers.filter(u => u.role !== 'ADMIN');
            // Sort alphabetically
            athletes.sort((a, b) => a.name.localeCompare(b.name));
            setUsers(athletes);
        } catch (error) {
            console.error("Error loading users:", error);
            alert("Failed to load users.");
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
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
                <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Enter Results</h2>
                        <p className="text-sm text-gray-400">
                            {getSelectedMetricLabel()} ({getSelectedMetricUnit()})
                        </p>
                    </div>
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

                <div className="divide-y divide-gray-700">
                    {users.map(user => (
                        <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors">
                            <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-bold mr-3 border border-gray-600">
                                    {user.name.charAt(0)}
                                </div>
                                <span className="font-medium text-gray-200">{user.name}</span>
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

                    {users.length === 0 && (
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
