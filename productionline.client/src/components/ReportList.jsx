import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { APP_CONSTANTS } from "./store";
import Layout from "./Layout"
import LoadingDots from './LoadingDots';

export default function ReportsList() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const storedUserData = localStorage.getItem("user");
        if (storedUserData && storedUserData !== "undefined") {
            const storedUser = JSON.parse(storedUserData);
            // Check if session has expired
            if (storedUser.expiry && Date.now() > storedUser.expiry) {
                // Session expired
                localStorage.removeItem("user");
                localStorage.removeItem("meaiFormToken");
                navigate(`/login?expired=true`);
            } else {
                setCurrentUser(storedUser.username);
            }
        } else {
            navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
        }
    }, [navigate]);

    // Update your fetchReports function
    const fetchReports = async () => {
        if (!currentUser) return; // Don't fetch if no user is set yet

        try {
            setLoading(true);
            const res = await axios.get(`${APP_CONSTANTS.API_BASE_URL}/api/reports/list`, {
                params: {
                    username: currentUser, // Use dynamic user
                    includeShared: true
                }
            });
            setReports(res.data);
            setLoading(false);
        } catch (err) {
            setError("Failed to load reports: " + (err.message || "Unknown error"));
            setLoading(false);
        }
    };

    // Update your existing useEffect to depend on currentUser
    useEffect(() => {
        if (currentUser) {
            fetchReports();
        }
    }, [currentUser]); // Add currentUser as dependency

    const handleDelete = async (reportId) => {
        // Show confirmation dialog
        if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await axios.delete(`${APP_CONSTANTS.API_BASE_URL}/api/reports/delete/${reportId}`);

            if (response.status === 200) {
                // Remove the deleted report from state
                setReports(prevReports => prevReports.filter(report => report.id !== reportId));

                // Optional: Show success message
                alert('Report deleted successfully!');
            }
        } catch (error) {
            console.error('Error deleting report:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to delete report';
            alert('Error deleting report: ' + errorMessage);
        }
    };


    const filteredReports = reports.filter(report =>
        report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <LoadingDots />;


    return (
        <Layout>
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">Reports</h1>
                    <button
                        onClick={() => navigate('/reports/new')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    >
                        Create New Report
                    </button>
                </div>
            </div>

            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border p-2 rounded"
                />
            </div>

            {filteredReports.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded border">
                    <p className="text-gray-500">
                        {searchTerm ? "No reports match your search" : "No reports found"}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredReports.map(report => (
                        <div
                            key={report.id}
                            className="border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-semibold">{report.name}</h3>
                                </div>

                                {report.description && (
                                    <p className="text-gray-600 text-sm mb-4">{report.description}</p>
                                )}

                                <div className="text-sm text-gray-500 mb-4">
                                    <p>Created by: {report.createdBy}</p>
                                    <p>Created at: {report.createdAt}</p>
                                    <p>Last updated: {report.updatedAt}</p>
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => navigate(`/reports/view/${report.id}`)}
                                        className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
                                    >
                                        View
                                    </button>
                                    {report.createdBy === currentUser && (
                                        <>
                                            <button
                                                onClick={() => navigate(`/reports/edit/${report.id}`)}
                                                className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(report.id)}
                                                className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded"
                                            >
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </div>
            </Layout>
    );
}