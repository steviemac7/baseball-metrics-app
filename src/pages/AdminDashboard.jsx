import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { Plus, ChevronRight, User as UserIcon, Trash2, Ruler, List, Upload, Pencil } from 'lucide-react';
import AddUserModal from '../components/AddUserModal';
import EditUserModal from '../components/EditUserModal';
import BulkUserImportModal from '../components/BulkUserImportModal';
import DistanceCalculator from '../components/DistanceCalculator';

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isCalcOpen, setIsCalcOpen] = useState(false);
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teamUsers.map(user => (
                            <Link
                                key={user.id}
                                to={`/user/${user.id}`}
                                className="block bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-blue-500/50 hover:bg-gray-800/80 transition-all group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="bg-gray-700 p-3 rounded-lg group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                                        <UserIcon className="w-6 h-6" />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault(); // Stop navigation
                                                e.stopPropagation();
                                                setEditingUser(user);
                                            }}
                                            className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors z-10"
                                            title="Edit Profile"
                                        >
                                            <Pencil className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteUser(e, user.id)}
                                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors z-10"
                                            title="Delete Profile"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transform group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-white leading-tight">{user.name}</h3>
                                    {user.nickname && (
                                        <p className="text-sm text-blue-400 italic">"{user.nickname}"</p>
                                    )}
                                    <p className="text-sm font-medium text-gray-500 mb-4 mt-1 uppercase tracking-widest font-semibold">{user.team || 'No Team'}</p>
                                </div>

                                <div className="space-y-2 text-sm text-gray-400 border-t border-gray-700/50 pt-4">
                                    <div className="flex justify-between">
                                        <span>Age</span>
                                        <span className="text-white">
                                            {user.biometrics?.dob ? ((new Date() - new Date(user.biometrics.dob)) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(2) : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Height</span>
                                        <span className="text-white">
                                            {user.biometrics?.heightFt}'{user.biometrics?.heightIn}"
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Weight</span>
                                        <span className="text-white">{user.biometrics?.weight} lbs</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
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
        </div >
    );
};

export default AdminDashboard;
