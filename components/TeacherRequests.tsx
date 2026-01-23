import React, { useEffect, useState, useMemo } from 'react';
import { User } from '../types';
import { getTeacherRequests, approveTeacherRequest, rejectTeacherRequest, getUsers } from '../services/api';
import { useToast } from '../context/ToastContext';

type Tab = 'pending' | 'approved' | 'rejected' | 'teachers' | 'students';

export const TeacherRequests: React.FC = () => {
    const [requests, setRequests] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('pending');

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [districtFilter, setDistrictFilter] = useState('');
    const [subDistrictFilter, setSubDistrictFilter] = useState('');
    const [schoolFilter, setSchoolFilter] = useState('');

    const { showToast } = useToast();

    const fetchData = async () => {
        try {
            setLoading(true);
            const [requestsData, usersData] = await Promise.all([
                getTeacherRequests(),
                getUsers()
            ]);
            setRequests(requestsData);
            setAllUsers(usersData);
        } catch (error) {
            console.error('Error fetching data:', error);
            showToast('Failed to fetch data', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleApprove = async (userId: string) => {
        try {
            await approveTeacherRequest(userId);
            showToast('User approved as teacher', 'success');
            fetchData();
        } catch (error: any) {
            console.log(error);
            showToast(error.message || 'Failed to approve', 'error');
        }
    };

    const handleReject = async (userId: string) => {
        if (!window.confirm('Are you sure you want to reject this request?')) return;
        try {
            await rejectTeacherRequest(userId);
            showToast('Request rejected', 'info');
            fetchData();
        } catch (error: any) {
            console.log(error);
            showToast(error.message || 'Failed to reject', 'error');
        }
    };

    const filteredData = useMemo(() => {
        let data: User[] = [];

        // 1. Select Source Data based on Tab
        if (['pending', 'approved', 'rejected'].includes(activeTab)) {
            data = requests.filter(user => {
                if (activeTab === 'pending') return user.requestRole === 'teacher';
                if (activeTab === 'approved') return user.requestRole === 'approved';
                if (activeTab === 'rejected') return user.requestRole === 'rejected';
                return false;
            });
        } else if (activeTab === 'teachers') {
            data = allUsers.filter(user => user.role === 'teacher');
        } else if (activeTab === 'students') {
            data = allUsers.filter(user => user.role === 'student');
        }

        // 2. Apply Filters (only for Teachers and Students tabs as per requirement, but useful for all)
        // Check if we should apply extended filters
        const applyExtendedFilters = ['teachers', 'students'].includes(activeTab);

        return data.filter(user => {
            // Text Search (Mobile, Email - and Name for convenience)
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    (user.mobileNumber && user.mobileNumber.toLowerCase().includes(query)) ||
                    (user.email && user.email.toLowerCase().includes(query)) ||
                    (user.name && user.name.toLowerCase().includes(query));

                if (!matchesSearch) return false;
            }

            // District/School Filters (Strictly for teachers/students usually, but safe to apply if fields exist)
            if (applyExtendedFilters) {
                if (districtFilter && (!user.district || !user.district.toLowerCase().includes(districtFilter.toLowerCase()))) return false;
                if (subDistrictFilter && (!user.subDistrict || !user.subDistrict.toLowerCase().includes(subDistrictFilter.toLowerCase()))) return false;
                if (schoolFilter && (!user.school || !user.school.toLowerCase().includes(schoolFilter.toLowerCase()))) return false;
            }

            return true;
        });
    }, [activeTab, requests, allUsers, searchQuery, districtFilter, subDistrictFilter, schoolFilter]);

    if (loading && requests.length === 0 && allUsers.length === 0) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>;

    const showFilters = ['teachers', 'students'].includes(activeTab);

    return (
        <div className="p-6 max-w-7xl mx-auto h-full overflow-y-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">User & Request Management</h1>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 mb-6 pb-2 overflow-x-auto">
                {[
                    { id: 'pending', label: 'New Requests', count: requests.filter(u => u.requestRole === 'teacher').length, color: 'blue' },
                    { id: 'approved', label: 'Approved Requests', color: 'green' },
                    { id: 'rejected', label: 'Rejected Requests', color: 'red' },
                    { id: 'teachers', label: 'Teachers List', color: 'indigo' },
                    { id: 'students', label: 'Students List', color: 'purple' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`px-4 py-2 rounded-md font-medium text-sm transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? `bg-${tab.color}-100 text-${tab.color}-700 dark:bg-${tab.color}-900 dark:text-${tab.color}-300 ring-1 ring-${tab.color}-500`
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                    >
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs bg-${tab.color}-200 text-${tab.color}-800`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Filter Bar */}
            {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <input
                        type="text"
                        placeholder="Search Name, Email, Mobile..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <input
                        type="text"
                        placeholder="Filter by District"
                        value={districtFilter}
                        onChange={(e) => setDistrictFilter(e.target.value)}
                        className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <input
                        type="text"
                        placeholder="Filter by Sub-District"
                        value={subDistrictFilter}
                        onChange={(e) => setSubDistrictFilter(e.target.value)}
                        className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <input
                        type="text"
                        placeholder="Filter by School"
                        value={schoolFilter}
                        onChange={(e) => setSchoolFilter(e.target.value)}
                        className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>
            )}
            {/* Simple Search for other tabs */}
            {!showFilters && (
                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-md w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Details</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                {['pending', 'approved', 'rejected'].includes(activeTab) && (
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No users found matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map(user => (
                                    <tr key={user._id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">@{user.username}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 dark:text-white">{user.email}</div>
                                            {user.mobileNumber && <div className="text-sm text-gray-500">{user.mobileNumber}</div>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                            {user.district && <div>{user.district}</div>}
                                            {user.subDistrict && <div className="text-xs">{user.subDistrict}</div>}
                                            {user.school && <div className="text-xs italic">{user.school}</div>}
                                            {!user.district && !user.subDistrict && !user.school && <span className="text-gray-400">-</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                    user.role === 'teacher' ? 'bg-indigo-100 text-indigo-800' :
                                                        'bg-gray-100 text-gray-800'}`}>
                                                {user.role}
                                            </span>
                                            {user.requestRole && (
                                                <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${user.requestRole === 'approved' ? 'bg-green-100 text-green-800' :
                                                        user.requestRole === 'rejected' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'}`}>
                                                    Request: {user.requestRole === 'teacher' ? 'Pending' : user.requestRole}
                                                </span>
                                            )}
                                        </td>

                                        {['pending', 'approved', 'rejected'].includes(activeTab) && (
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                {/* Pending Tab Actions */}
                                                {activeTab === 'pending' && (
                                                    <>
                                                        <button onClick={() => handleApprove(user._id)} className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md text-xs shadow-sm">Approve</button>
                                                        <button onClick={() => handleReject(user._id)} className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md text-xs shadow-sm">Reject</button>
                                                    </>
                                                )}

                                                {/* Approved Tab Actions */}
                                                {activeTab === 'approved' && (
                                                    <button onClick={() => handleReject(user._id)} className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md text-xs shadow-sm">Reject</button>
                                                )}

                                                {/* Rejected Tab Actions */}
                                                {activeTab === 'rejected' && (
                                                    <button onClick={() => handleApprove(user._id)} className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md text-xs shadow-sm">Approve</button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
