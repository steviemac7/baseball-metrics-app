import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import TrendChart from '../components/TrendChart';
import DistanceCalculator from '../components/DistanceCalculator';
import Stopwatch from '../components/Stopwatch';
import { Plus, Table, TrendingUp, Trash2, Ruler, Timer, X } from 'lucide-react';
import clsx from 'clsx';
import { METRIC_GROUPS } from '../utils/constants';



const UserProfile = () => {
    const { id } = useParams();
    const { user: currentUser } = useAuth();
    const [profileUser, setProfileUser] = useState(null);
    const [allMetrics, setAllMetrics] = useState([]);
    const [activeTab, setActiveTab] = useState('Biometric Data');

    // Input state
    const [inputState, setInputState] = useState({});
    const [showGpsModal, setShowGpsModal] = useState(false);
    const [gpsTargetMetric, setGpsTargetMetric] = useState(null);
    const [isStopwatchOpen, setIsStopwatchOpen] = useState(false);
    const [selectedDataPoint, setSelectedDataPoint] = useState(null);

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

    const handleAddMetric = async (metricId, value) => {
        if (!value) return;

        await dataService.addMetric({
            userId: profileUser.id,
            date: new Date().toISOString().split('T')[0], // Today
            metricId,
            value: parseFloat(value)
        });

        // Clear input
        setInputState({ ...inputState, [metricId]: '' });
        loadData();
    };

    const handleDeleteMetric = async (metricId) => {
        if (window.confirm('Delete this entry?')) {
            await dataService.deleteMetric(metricId);
            loadData();
        }
    };

    const getMetricHistory = (metricId) => {
        return allMetrics
            .filter(m => m.metricId === metricId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const renderMetricInput = (metric, group) => {
        if (!isAdmin) return null;

        return (
            <div className="flex items-center space-x-2 mt-2">
                <input
                    type="date"
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    id={`date-${metric.id}`}
                />
                <input
                    type="number"
                    step="0.01"
                    placeholder={`${metric.unit}`}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white w-24"
                    value={inputState[metric.id] || ''}
                    onChange={(e) => setInputState({ ...inputState, [metric.id]: e.target.value })}
                />

                {metric.id === 'dist_tee' && (
                    <button
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
                        onClick={() => setIsStopwatchOpen(true)}
                        className="p-1 px-2 bg-gray-700 border border-gray-600 text-green-400 hover:bg-gray-600 rounded flex items-center"
                        title="Open Stopwatch"
                    >
                        <Timer size={16} />
                    </button>
                )}
                <button
                    onClick={async () => {
                        const date = document.getElementById(`date-${metric.id}`).value;
                        await dataService.addMetric({
                            userId: profileUser.id,
                            date,
                            metricId: metric.id,
                            value: parseFloat(inputState[metric.id])
                        });
                        setInputState({ ...inputState, [metric.id]: '' });
                        loadData();
                    }}
                    className="p-1 bg-blue-600 rounded text-white hover:bg-blue-700"
                >
                    <Plus size={16} />
                </button>
            </div>
        );
    };

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
                {['Biometric Data', ...Object.keys(METRIC_GROUPS)].map(tab => (
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
                                <p className="text-lg font-semibold text-white">{profileUser.biometrics?.weight} lbs</p>
                            </div>
                            <div className="p-4 bg-gray-700/50 rounded-lg">
                                <p className="text-sm text-gray-400">Gender</p>
                                <p className="text-lg font-semibold text-white">{profileUser.biometrics?.gender}</p>
                            </div>
                        </div>
                        {isAdmin && (
                            <p className="mt-4 text-sm text-gray-500 italic">Editing biometrics coming in v2 (please recreate user to fix)</p>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {METRIC_GROUPS[activeTab].map(metric => {
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
                    </div>
                )}
            </div>

            {showGpsModal && (
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
            )}
            {isStopwatchOpen && (
                <Stopwatch onClose={() => setIsStopwatchOpen(false)} />
            )}

            {/* Metric Detail Modal */}
            {selectedDataPoint && (
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
            )}
        </div>
    );
};

export default UserProfile;
