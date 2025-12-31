import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, BarChart2, User, LogOut, Menu, X, Timer, Ruler, List } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import Stopwatch from './Stopwatch';
import DistanceCalculator from './DistanceCalculator';

const Layout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isStopwatchOpen, setIsStopwatchOpen] = useState(false);
    const [isCalcOpen, setIsCalcOpen] = useState(false);

    // Define navigation items based on role
    const mainNav = [];
    const toolsNav = [];

    if (user?.role === 'ADMIN') {
        const pages = [
            { name: 'Athlete Profiles', path: '/', icon: Users },
            { name: 'Bulk Metric Entry', path: '/admin/bulk-entry', icon: List },
            { name: 'Athlete Comparison', path: '/stats', icon: BarChart2 }
        ];
        mainNav.push(...pages);

        const tools = [
            { name: 'Stopwatch', icon: Timer, action: () => setIsStopwatchOpen(true) },
            { name: 'GPS Tool', icon: Ruler, action: () => setIsCalcOpen(true) }
        ];
        toolsNav.push(...tools);

    } else {
        // Regular user sees their own profile
        mainNav.push({ name: 'My Profile', path: '/', icon: User });
        mainNav.push({ name: 'Athlete Comparison', path: '/stats', icon: BarChart2 });
    }

    const renderNeedItem = (item) => {
        const Icon = item.icon;
        const isActive = item.path && location.pathname === item.path;

        if (item.action) {
            return (
                <button
                    key={item.name}
                    onClick={() => {
                        item.action();
                        setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors text-gray-400 hover:bg-gray-700/50 hover:text-white"
                >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                </button>
            );
        }

        return (
            <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={clsx(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                    isActive
                        ? "bg-blue-600/10 text-blue-400 border border-blue-600/20"
                        : "text-gray-400 hover:bg-gray-700/50 hover:text-white"
                )}
            >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex">
            {/* ... Mobile Button ... */}
            <div className="lg:hidden fixed top-0 left-0 p-4 z-50">
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 rounded-lg bg-gray-800 text-white shadow-lg"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar */}
            <div className={clsx(
                "fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 border-r border-gray-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:block",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-gray-700">
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                            Baseball Metrics
                        </h1>
                        <p className="text-xs text-gray-400 mt-1">Logged in as {user?.role}</p>
                    </div>

                    <nav className="flex-1 px-4 py-6 overflow-y-auto">
                        <div className="space-y-1">
                            {mainNav.map(renderNeedItem)}
                        </div>

                        {toolsNav.length > 0 && (
                            <div className="mt-8">
                                <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Tools
                                </h3>
                                <div className="space-y-1">
                                    {toolsNav.map(renderNeedItem)}
                                </div>
                            </div>
                        )}
                    </nav>

                    <div className="p-4 border-t border-gray-700">
                        <button
                            onClick={logout}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                        >
                            <LogOut className="mr-3 h-4 w-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                <main className="flex-1 overflow-y-auto bg-gray-900 p-4 lg:p-8 pt-16 lg:pt-8">
                    <Outlet />
                </main>
            </div>

            {/* Overlay for mobile */}
            {isMobileMenuOpen && (
                <div
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                />
            )}

            {/* Global Tools */}
            {isStopwatchOpen && (
                <Stopwatch onClose={() => setIsStopwatchOpen(false)} />
            )}
            {isCalcOpen && (
                <DistanceCalculator onClose={() => setIsCalcOpen(false)} />
            )}
        </div>
    );
};

export default Layout;
