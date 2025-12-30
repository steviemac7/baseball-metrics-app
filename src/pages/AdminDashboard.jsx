import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { Plus, ChevronRight, User as UserIcon, Trash2, Ruler, List, Upload, Pencil, Timer } from 'lucide-react';
import AddUserModal from '../components/AddUserModal';
import EditUserModal from '../components/EditUserModal';
import BulkUserImportModal from '../components/BulkUserImportModal';
import DistanceCalculator from '../components/DistanceCalculator';
import Stopwatch from '../components/Stopwatch';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isCalcOpen, setIsCalcOpen] = useState(false);
    const [isStopwatchOpen, setIsStopwatchOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        const allUsers = await dataService.getUsers();
        // Filter for non-admin users only
        setUsers(allUsers.filter(u => u.role !== 'ADMIN').sort((a, b) => a.name.localeCompare(b.name)));
    };

    const handleUpdateUser = async (uid, updatedData) => {
        try {
            await dataService.updateUser(uid, updatedData);
            loadUsers();
        } catch (error) {
            alert('Error updating user: ' + error.message);
        }
    };

    const handleAddUser = async (userData) => {
        try {
            const tempPassword = "password123";
            await dataService.createUser({
                ...userData,
                password: tempPassword,
                biometrics: {
                    dob: userData.dob,
                    gender: userData.gender,
                    heightFt: parseInt(userData.heightFt || 0),
                    heightIn: parseInt(userData.heightIn || 0),
                    weight: parseInt(userData.weight || 0)
                }
            });
            loadUsers();
            alert(`Athlete Profile Created!\n\nEmail: ${userData.email}\nTemporary Password: ${tempPassword}\n\nPlease share these credentials with the athlete.`);
        } catch (error) {
            alert("Error creating user: " + error.message);
        }
    };

    const handleDeleteUser = async (e, userId) => {
        e.preventDefault(); // Prevent navigation
        if (window.confirm('Are you sure you want to delete this athlete? This cannot be undone.')) {
            await dataService.deleteUser(userId);
            loadUsers();
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white">Athlete Profiles</h2>
                    <p className="text-gray-400 mt-1">Manage and track athlete metrics</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setIsStopwatchOpen(true)}
                        className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg border border-gray-600 transition-all"
                    >
                        <Timer className="w-5 h-5 mr-2" />
                        Stopwatch
                    </button>
                    <button
                        onClick={() => setIsCalcOpen(true)}
                        className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg border border-gray-600 transition-all"
                    >
                        <Ruler className="w-5 h-5 mr-2" />
                        GPS Tool
                    </button>
                    <Link
                        to="/admin/bulk-entry"
                        className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-500/30 transition-all"
                    >
                        <List className="w-5 h-5 mr-2" />
                        Bulk Metric Entry
                    </Link>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg border border-gray-600 transition-all font-medium"
                    >
                        <Upload className="w-5 h-5 mr-2" />
                        Import Athlete List (CSV)
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/30 transition-all"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Manually Add New Athlete
                    </button>
                </div>
            </div>

            {Object.entries(users.reduce((acc, user) => {
                const team = user.team || 'Unassigned';
                if (!acc[team]) acc[team] = [];
                acc[team].push(user);
                return acc;
            }, {})).sort().map(([team, teamUsers]) => (
                <div key={team} className="mb-10">
                    <h3 className="text-xl font-bold text-white mb-4 pl-3 border-l-4 border-blue-500 bg-gray-800/30 py-1 rounded-r-lg inline-block">
                        {team} <span className="text-gray-500 text-sm ml-2">({teamUsers.length})</span>
                    </h3>

                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto shadow-sm">
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-900/50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Athlete
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Age
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Height
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Weight
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700 bg-gray-800">
                                {teamUsers.map(user => (
                                    <tr
                                        key={user.id}
                                        onClick={() => navigate(`/user/${user.id}`)}
                                        className="hover:bg-gray-700/50 cursor-pointer transition-colors group"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-bold border border-gray-600">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-white">{user.name}</div>
                                                    {user.nickname && <div className="text-sm text-blue-400 italic">"{user.nickname}"</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {user.biometrics?.dob ? ((new Date() - new Date(user.biometrics.dob)) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(2) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {user.biometrics?.heightFt || 0}'{user.biometrics?.heightIn || 0}"
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {user.biometrics?.weight || 0} lbs
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end space-x-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingUser(user);
                                                    }}
                                                    className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                    title="Edit Profile"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteUser(e, user.id);
                                                    }}
                                                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete Profile"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}

            {users.length === 0 && (
                <div className="col-span-full text-center py-12 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
                    <UserIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-white mb-1">No profiles yet</h3>
                    <p className="text-gray-500">Get started by adding a new athlete profile.</p>
                </div>
            )}


            <AddUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddUser}
            />

            <EditUserModal
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                user={editingUser}
                onUpdate={handleUpdateUser}
            />

            <BulkUserImportModal
                isOpen={isUploadModalOpen}
                onClose={() => {
                    setIsUploadModalOpen(false);
                    loadUsers();
                }}
                onImport={handleAddUser}
            />

            {
                isCalcOpen && (
                    <DistanceCalculator onClose={() => setIsCalcOpen(false)} />
                )
            }
            {
                isStopwatchOpen && (
                    <Stopwatch onClose={() => setIsStopwatchOpen(false)} />
                )
            }
        </div >
    );
};

export default AdminDashboard;
