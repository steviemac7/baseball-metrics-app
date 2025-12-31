import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { ALL_METRICS, METRIC_GROUPS } from '../utils/constants';
import { Filter, User } from 'lucide-react';
import clsx from 'clsx';

const SummaryStats = () => {
    const { user: currentUser } = useAuth();
    // State
    const [users, setUsers] = useState([]);
    const [metrics, setMetrics] = useState([]);
    const [selectedMetricId, setSelectedMetricId] = useState(ALL_METRICS?.[0]?.id || '');

    // Debug logging
    useEffect(() => {
        console.log('ALL_METRICS:', ALL_METRICS);
        console.log('Selected Metric ID:', selectedMetricId);
    }, [selectedMetricId]);

    // Filters
    const [filters, setFilters] = useState({
        gender: 'All',
        team: 'All',
        minAge: '',
        maxAge: '',
        minHeight: '', // in inches
        maxHeight: '',
        minWeight: '',
        maxWeight: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        // Load all data
        const load = async () => {
            const allUsers = await dataService.getUsers();
            const allMetrics = await dataService.getMetrics();
            setUsers(allUsers.filter(u => u.role !== 'ADMIN'));
            setMetrics(allMetrics);
        };
        load();
    }, []);

    const uniqueTeams = useMemo(() => {
        const teams = new Set(users.map(u => u.team || '').filter(Boolean));
        return Array.from(teams).sort();
    }, [users]);

    // Filtered Users
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const bio = user.biometrics || {};
            const age = bio.dob ? new Date().getFullYear() - new Date(bio.dob).getFullYear() : null;
            const heightInches = (parseInt(bio.heightFt || 0) * 12) + parseInt(bio.heightIn || 0);


            if (filters.gender !== 'All' && bio.gender !== filters.gender) return false;
            if (filters.team !== 'All' && (user.team || 'Unassigned') !== filters.team) return false;
            if (filters.minAge && age < parseInt(filters.minAge)) return false;
            if (filters.maxAge && age > parseInt(filters.maxAge)) return false;
            if (filters.minWeight && bio.weight < parseInt(filters.minWeight)) return false;
            if (filters.maxWeight && bio.weight > parseInt(filters.maxWeight)) return false;
            if (filters.minHeight && heightInches < parseInt(filters.minHeight)) return false;
            if (filters.maxHeight && heightInches > parseInt(filters.maxHeight)) return false;

            return true;
        });
    }, [users, filters]);

    // Aggregate Data for Selected Metric
    const metricData = useMemo(() => {
        // For each filtered user, get their LATEST value for the selected metric
        // For each filtered user, calculate the AVERAGE value for the selected metric in the date range
        const dataPoints = filteredUsers.map(user => {
            const userMetrics = metrics
                .filter(m => {
                    if (m.userId !== user.id || m.metricId !== selectedMetricId) return false;

                    // Date Range Check
                    if (filters.startDate && new Date(m.date) < new Date(filters.startDate)) return false;
                    if (filters.endDate && new Date(m.date) > new Date(filters.endDate)) return false;

                    return true;
                });

            if (userMetrics.length === 0) return null;

            // Calculate Average, Min, Max of all points
            const values = userMetrics.map(m => Number(m.value));
            const total = values.reduce((sum, v) => sum + v, 0);
            const average = total / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);

            // Get latest date for display purposes
            const sortedByDate = [...userMetrics].sort((a, b) => {
                const dDiff = new Date(b.date) - new Date(a.date);
                if (dDiff !== 0) return dDiff;
                return new Date(b.timestamp) - new Date(a.timestamp);
            });
            const latestDate = sortedByDate[0].date;

            return {
                user,
                value: Number(average.toFixed(2)),
                date: latestDate,
                count: userMetrics.length,
                min: min,
                max: max
            };
        }).filter(Boolean);

        // Sort by value (descending usually, unless 'time' metric which is ascending)
        // Check if unit is 'sec' (lower is better usually for speed)
        const selectedMetricDef = ALL_METRICS.find(m => m.id === selectedMetricId);
        const isTime = selectedMetricDef?.unit === 'sec';

        dataPoints.sort((a, b) => isTime ? a.value - b.value : b.value - a.value);

        return dataPoints;
    }, [filteredUsers, metrics, selectedMetricId, filters.startDate, filters.endDate]);

    // Statistics
    const stats = useMemo(() => {
        if (metricData.length === 0) return null;
        const values = metricData.map(d => d.value);
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;

        // Median
        const mid = Math.floor(values.length / 2);
        const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;

        const min = Math.min(...values);
        const max = Math.max(...values);

        return { mean, median, min, max, count: values.length };
    }, [metricData]);

    const selectedMetricDef = ALL_METRICS.find(m => m.id === selectedMetricId);

    // Helper for safe formatting
    const formatValue = (val) => {
        if (val === null || val === undefined || isNaN(val)) return '-';
        return Number(val).toFixed(2);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl font-bold text-white">Athlete Comparison</h2>
            </div>

            {/* Controls */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4">
                <div className="flex items-center space-x-2 text-blue-400 mb-2">
                    <Filter size={20} />
                    <span className="font-semibold">Filters & Metric Selection</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Metric to Analyze</label>
                        <select
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                            value={selectedMetricId}
                            onChange={(e) => setSelectedMetricId(e.target.value)}
                        >
                            {Object.keys(METRIC_GROUPS).map(group => (
                                <optgroup label={group} key={group}>
                                    {METRIC_GROUPS[group].map(m => (
                                        <option key={m.id} value={m.id}>{m.label} ({m.unit})</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Gender</label>
                        <select
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                            value={filters.gender}
                            onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                        >
                            <option value="All">All Items</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Team</label>
                        <select
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                            value={filters.team}
                            onChange={(e) => setFilters({ ...filters, team: e.target.value })}
                        >
                            <option value="All">All Teams</option>
                            {uniqueTeams.map(team => (
                                <option key={team} value={team}>{team}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex space-x-2">
                        <div className="flex-1">
                            <label className="block text-sm text-gray-400 mb-1">Min Age</label>
                            <input
                                type="number"
                                placeholder="0"
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                value={filters.minAge}
                                onChange={(e) => setFilters({ ...filters, minAge: e.target.value })}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm text-gray-400 mb-1">Max Age</label>
                            <input
                                type="number"
                                placeholder="100"
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                value={filters.maxAge}
                                onChange={(e) => setFilters({ ...filters, maxAge: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex space-x-2">
                        <div className="flex-1">
                            <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                            <input
                                type="date"
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm text-gray-400 mb-1">End Date</label>
                            <input
                                type="date"
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* More filters could go here (wgt/hgt) */}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stats Card */}
                <div className="lg:col-span-1 bg-gray-800 rounded-xl p-6 border border-gray-700 h-fit">
                    <h3 className="text-xl font-bold text-white mb-4">Summary Statistics</h3>
                    {stats ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                                <span className="text-gray-400">Mean (Avg)</span>
                                <span className="text-xl font-bold text-blue-400">
                                    {formatValue(stats.mean)} {selectedMetricDef?.unit}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                                <span className="text-gray-400">Median</span>
                                <span className="text-xl font-bold text-blue-400">
                                    {formatValue(stats.median)} {selectedMetricDef?.unit}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                                <span className="text-gray-400">Sample Size</span>
                                <span className="text-white">{stats.count} Athletes</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 px-1">
                                <span>Min: {stats.min}</span>
                                <span>Max: {stats.max}</span>
                            </div>
                        </div>

                    ) : (
                        <p className="text-gray-500 text-center py-4">No data matches filters</p>
                    )}
                </div>

                {/* Ranked Table */}
                <div className="lg:col-span-2 bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                    <div className="p-4 bg-gray-700/50 border-b border-gray-700">
                        <h3 className="font-bold text-white">Ranked Leaderboard</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-gray-900/50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-2 py-3 sticky left-0 z-20 bg-gray-900 w-12 text-center">Rank</th>
                                    <th className="px-6 py-3 sticky left-12 z-20 bg-gray-900">Athlete</th>
                                    <th className="px-6 py-3">Team</th>
                                    <th className="px-6 py-3">Age</th>
                                    <th className="px-6 py-3 text-right">Avg Value ({selectedMetricDef?.unit})</th>
                                    <th className="px-6 py-3 text-right">Min</th>
                                    <th className="px-6 py-3 text-right">Max</th>
                                    <th className="px-6 py-3 text-right">Samples</th>
                                    <th className="px-6 py-3 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {metricData.map((data, idx) => {
                                    const isMe = currentUser?.id === data.user.id;
                                    const isAdmin = currentUser?.role === 'ADMIN';
                                    const showName = isAdmin || isMe;

                                    const bio = data.user.biometrics || {};
                                    let age = '-';
                                    if (bio.dob) {
                                        const ageDiffMs = new Date() - new Date(bio.dob);
                                        const ageDate = new Date(ageDiffMs); // miliseconds from epoch
                                        // A slightly more precise way:
                                        // (diff / 31557600000) for regular years, but let's stick to simple year diff or better math
                                        // Correct precise age:
                                        const years = ageDiffMs / (1000 * 60 * 60 * 24 * 365.25);
                                        age = years.toFixed(2);
                                    }

                                    return (
                                        <tr key={data.user.id} className={clsx("transition-colors group", isMe ? "bg-blue-500/10 hover:bg-blue-500/20" : "hover:bg-gray-700/30")}>
                                            <td className="px-2 py-4 font-mono text-gray-500 sticky left-0 z-10 bg-gray-800 group-hover:bg-gray-700 transition-colors w-12 text-center">#{idx + 1}</td>
                                            <td className="px-6 py-4 flex items-center font-medium sticky left-12 z-10 bg-gray-800 group-hover:bg-gray-700 transition-colors text-white">
                                                <User className={clsx("w-4 h-4 mr-2", isMe ? "text-blue-400" : "text-gray-600")} />
                                                {showName ? data.user.name : `Athlete ${idx + 1}`}
                                                {isMe && <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">You</span>}
                                            </td>
                                            <td className="px-6 py-4 text-gray-400">{data.user.team || '-'}</td>
                                            <td className="px-6 py-4 text-gray-400">{age}</td>
                                            <td className="px-6 py-4 text-right text-lg font-bold text-blue-400">
                                                {data.value}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-400">{data.min}</td>
                                            <td className="px-6 py-4 text-right text-gray-400">{data.max}</td>
                                            <td className="px-6 py-4 text-right text-gray-400">{data.count}</td>
                                            <td className="px-6 py-4 text-right">
                                                {new Date(data.date + 'T12:00:00').toLocaleDateString()}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {metricData.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                            No results found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SummaryStats;
