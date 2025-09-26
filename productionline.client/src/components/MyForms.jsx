import React, { useState, useEffect } from "react";
import { Plus, Edit, Copy, Trash, Calendar, User, ExternalLink } from "lucide-react";
import Layout from "./Layout";
import { APP_CONSTANTS } from "./store";
import { useNavigate } from 'react-router-dom';
import LoadingDots from './LoadingDots';

const MyForms = () => {
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState("");
    const [currentUserGroup, setcurrentUserGroup] = useState("");
    const navigate = useNavigate();

    // Get current user (you may need to adjust this based on your auth system)
    useEffect(() => {
        const storedUserData = localStorage.getItem("user");
        console.log(storedUserData)
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
                setcurrentUserGroup(storedUser.groups)
            }
        } else {
            navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
        }
    }, [navigate]);

    // Fetch forms created by current user
    // In MyForms.js, update the fetchMyForms function
    const fetchMyForms = async () => {
        if (!currentUser && !currentUserGroup) return;

        console.log(currentUser)

        try {
            setLoading(true);

            // Check if user is admin
            const isAdmin = currentUserGroup.includes('SANAND-IT') || currentUserGroup.includes('MEAI-IT');

            // Use different endpoint for admin vs regular users
            const endpoint = isAdmin
                ? `${APP_CONSTANTS.API_BASE_URL}/api/forms/all-forms`
                : `${APP_CONSTANTS.API_BASE_URL}/api/forms/my-forms/${encodeURIComponent(currentUser)}`;

            const response = await fetch(endpoint);

            if (response.ok) {
                const data = await response.json();
                setForms(data);
            } else {
                console.error("Failed to fetch forms");
            }
        } catch (error) {
            console.error("Error fetching forms:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) {
            fetchMyForms();
        }
    }, [currentUser]);

    const handleEditForm = (form) => {
        navigate(`/formbuilder/${form.formLink}`);
    };

    const handleCopyForm = async (form) => {
        try {
            const response = await fetch(
                `${APP_CONSTANTS.API_BASE_URL}/api/forms/${form.id}/duplicate`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        newName: `${form.name} (Copy)`,
                        createdBy: currentUser
                    })
                }
            );

            if (response.ok) {
                const newForm = await response.json();
                alert(`Form duplicated successfully! New form: ${newForm.name}`);
                fetchMyForms(); // Refresh the list
            } else {
                throw new Error('Failed to duplicate form');
            }
        } catch (error) {
            console.error("Error duplicating form:", error);
            alert("Failed to duplicate form");
        }
    };

    const handleDeleteForm = async (form) => {
        if (!window.confirm(`Are you sure you want to delete "${form.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(
                `${APP_CONSTANTS.API_BASE_URL}/api/forms/${form.id}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (response.ok) {
                alert("Form deleted successfully");
                fetchMyForms(); // Refresh the list
            } else {
                throw new Error('Failed to delete form');
            }
        } catch (error) {
            console.error("Error deleting form:", error);
            alert("Failed to delete form");
        }
    };

    const handleViewForm = (formLink) => {
        const formUrl = `${window.location.origin}/form/${formLink}`;
        window.open(formUrl, '_blank');
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) return <LoadingDots />;


    return (
        <Layout>
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Forms Created By You</h1>
                        <p className="text-gray-600 mt-1">
                            Manage and edit the forms you've created
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/formbuilder')}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Create New Form
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <User className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Forms</p>
                                <p className="text-2xl font-bold text-gray-900">{forms.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Calendar className="h-6 w-6 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Last Created</p>
                                <p className="text-sm font-bold text-gray-900">
                                    {forms.length > 0
                                        ? formatDate(Math.max(...forms.map(f => new Date(f.createdAt))))
                                        : 'No forms yet'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                        <div className="flex items-center">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <ExternalLink className="h-6 w-6 text-purple-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Published</p>
                                <p className="text-2xl font-bold text-gray-900">{forms.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Forms List */}
                {forms.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No forms yet</h3>
                        <p className="text-gray-500 mb-6">Get started by creating your first form</p>
                        <button
                            onClick={() => navigate('/formbuilder')}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Create Your First Form
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {forms.map((form) => (
                            <div key={form.id} className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                                <div className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                                {form.name}
                                            </h3>
                                            <div className="flex items-center text-sm text-gray-500 space-x-4 mb-3">
                                                <span>Form Link: {form.formLink}</span>
                                                <span>•</span>
                                                <span>Created: {formatDate(form.createdAt)}</span>
                                            </div>
                                            <div className="flex items-center text-sm text-gray-600">
                                                <span className="bg-gray-100 px-2 py-1 rounded-full">
                                                    {form.fieldCount || 0} fields
                                                </span>
                                                {form.linkedFormId && (
                                                    <span className="ml-2 bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                                        Linked Form
                                                    </span>
                                                )}
                                                {form.approverCount > 0 && (
                                                    <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                                        {form.approverCount} approver(s)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <button
                                                onClick={() => handleViewForm(form.formLink)}
                                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="View Form"
                                            >
                                                <ExternalLink size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleEditForm(form)}
                                                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="Edit Form"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            {/*<button*/}
                                            {/*    onClick={() => handleCopyForm(form)}*/}
                                            {/*    className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"*/}
                                            {/*    title="Duplicate Form"*/}
                                            {/*>*/}
                                            {/*    <Copy size={18} />*/}
                                            {/*</button>*/}
                                            {/*<button*/}
                                            {/*    onClick={() => handleDeleteForm(form)}*/}
                                            {/*    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"*/}
                                            {/*    title="Delete Form"*/}
                                            {/*>*/}
                                            {/*    <Trash size={18} />*/}
                                            {/*</button>*/}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default MyForms;