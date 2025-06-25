import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { ChevronRight, ChevronDown, Users, Download, BarChart3, FileText, Plus, X, Search, User, UserCheck } from "lucide-react";
import { APP_CONSTANTS } from "./store";
import useAdSearch from "./hooks/useAdSearch"
import ReportCharts from "./ReportCharts"
import CollapsibleGridTable from './CollapsibleGridTable';

// Mock calculated fields editor
const CalculatedFieldsEditor = ({ calculatedFields, setCalculatedFields, selectedFields, fields }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const addCalculatedField = () => {
        setCalculatedFields([...calculatedFields, {
            id: Date.now(),
            label: "",
            formula: "",
            description: "",
            format: "decimal",
            precision: 2
        }]);
    };

    const updateCalculatedField = (id, key, value) => {
        setCalculatedFields(prev => prev.map(field =>
            field.id === id ? { ...field, [key]: value } : field
        ));
    };

    const removeCalculatedField = (id) => {
        setCalculatedFields(prev => prev.filter(field => field.id !== id));
    };

    return (
        <div className="mb-6 bg-white border rounded">
            <div
                className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h3 className="font-semibold flex items-center">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Calculated Fields ({calculatedFields.length})
                </h3>
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>

            {isExpanded && (
                <div className="p-4 border-t">
                    {calculatedFields.length === 0 && (
                        <p className="text-gray-500 italic mb-4">No calculated fields added yet</p>
                    )}

                    {calculatedFields.map(field => (
                        <div key={field.id} className="mb-4 p-3 border rounded bg-gray-50">
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <input
                                    type="text"
                                    placeholder="Field Label"
                                    value={field.label}
                                    onChange={(e) => updateCalculatedField(field.id, "label", e.target.value)}
                                    className="border p-2 rounded"
                                />
                                <select
                                    value={field.format}
                                    onChange={(e) => updateCalculatedField(field.id, "format", e.target.value)}
                                    className="border p-2 rounded"
                                >
                                    <option value="decimal">Decimal</option>
                                    <option value="currency">Currency</option>
                                    <option value="percentage">Percentage</option>
                                    <option value="integer">Integer</option>
                                </select>
                            </div>

                            <textarea
                                placeholder="Formula (e.g., SUM(field1) + AVG(field2))"
                                value={field.formula}
                                onChange={(e) => updateCalculatedField(field.id, "formula", e.target.value)}
                                className="w-full border p-2 rounded mb-2"
                                rows="2"
                            />

                            <div className="flex justify-between items-center">
                                <input
                                    type="text"
                                    placeholder="Description (optional)"
                                    value={field.description}
                                    onChange={(e) => updateCalculatedField(field.id, "description", e.target.value)}
                                    className="border p-2 rounded flex-1 mr-2"
                                />
                                <button
                                    onClick={() => removeCalculatedField(field.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={addCalculatedField}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Calculated Field
                    </button>
                </div>
            )}
        </div>
    );
};

// AD Search component
const AdSearchComponent = ({ selectedUsers, setSelectedUsers }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const { searchResults, isSearching, error, searchAdDirectory } = useAdSearch();

    const handleSearch = async (term) => {
        if (term.length >= 2) {
            await searchAdDirectory(term);
        }
    };

    const toggleUser = (user) => {
        setSelectedUsers(prev => {
            const exists = prev.find(u => u.id === user.id);
            if (exists) {
                return prev.filter(u => u.id !== user.id);
            } else {
                return [...prev, user];
            }
        });
    };

    const removeUser = (userId) => {
        setSelectedUsers(prev => prev.filter(u => u.id !== userId));
    };

    return (
        <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Share with Users/Groups</label>

            {/* Selected users display */}
            {selectedUsers.length > 0 && (
                <div className="mb-3 p-2 border rounded bg-gray-50">
                    <div className="flex flex-wrap gap-2">
                        {selectedUsers.map(user => (
                            <span
                                key={user.id}
                                className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"
                            >
                                {user.type === 'user' ? <User className="w-3 h-3 mr-1" /> : <Users className="w-3 h-3 mr-1" />}
                                {user.name}
                                <button
                                    onClick={() => removeUser(user.id)}
                                    className="ml-1 text-blue-600 hover:text-blue-800"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Search input */}
            <div className="relative">
                <div className="flex">
                    <input
                        type="text"
                        placeholder="Search users or groups..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            handleSearch(e.target.value);
                        }}
                        onFocus={() => setIsOpen(true)}
                        className="flex-1 border p-2 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="button"
                        className="bg-gray-200 border border-l-0 px-3 rounded-r hover:bg-gray-300"
                        onClick={() => handleSearch(searchTerm)}
                    >
                        <Search className="w-4 h-4" />
                    </button>
                </div>

                {/* Search results dropdown */}
                {isOpen && searchTerm.length >= 2 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                        {isSearching && (
                            <div className="p-3 text-center text-gray-500">Searching...</div>
                        )}

                        {!isSearching && searchResults.length === 0 && (
                            <div className="p-3 text-center text-gray-500">No results found</div>
                        )}

                        {!isSearching && searchResults.map(user => (
                            <div
                                key={user.id}
                                className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                onClick={() => toggleUser(user)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        {user.type === 'user' ?
                                            <User className="w-4 h-4 mr-2 text-blue-500" /> :
                                            <Users className="w-4 h-4 mr-2 text-green-500" />
                                        }
                                        <div>
                                            <div className="font-medium">{user.name}</div>
                                            {user.email && (
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            )}
                                            {user.department && (
                                                <div className="text-xs text-gray-400">{user.department}</div>
                                            )}
                                        </div>
                                    </div>
                                    {selectedUsers.find(u => u.id === user.id) && (
                                        <UserCheck className="w-4 h-4 text-green-500" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Click outside to close */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-5"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

export default function EnhancedReportDesigner() {
    // Your original state variables
    const [forms, setForms] = useState([]);
    const [selectedFormId, setSelectedFormId] = useState("");
    const [fields, setFields] = useState([]);
    const [selectedFields, setSelectedFields] = useState([]);
    const [templateName, setTemplateName] = useState("");
    const [filters, setFilters] = useState([]);
    const [options, setOptions] = useState({
        includeApprovals: false,
        includeRemarks: false,
        isShared: false,
        sharedWithRoles: [],
        enableCharts: true,
        exportFormats: ['excel', 'pdf']
    });
    const [calculatedFields, setCalculatedFields] = useState([]);
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [availableRoles, setAvailableRoles] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [submissionData, setSubmissionData] = useState([]);
    const [chartConfig, setChartConfig] = useState({
        type: "line",
        metrics: []  // now an array
    });
    const [expandedSubmissions, setExpandedSubmissions] = useState([]);
    const { reportId } = useParams(); // <-- this grabs the report ID from the route


    // UI state for left panel
    const [leftPanelExpanded, setLeftPanelExpanded] = useState({
        availableFields: true,
        selectedFields: true,
        calculatedFields: false,
        filters: false,
        sharing: false
    });

    const toggleExpand = (rowIdx) => {
        setExpandedSubmissions((prev) =>
            prev.includes(rowIdx)
                ? prev.filter((idx) => idx !== rowIdx)
                : [...prev, rowIdx]
        );
    };

    const navigate = useNavigate();

    // Your original useEffect for loading existing report
    //useEffect(() => {
    //    if (reportId) {
    //        fetch(`${APP_CONSTANTS.API_BASE_URL}/api/reports/template/${reportId}`)
    //            .then(res => res.json())
    //            .then(data => {
    //                // This loads the existing report into the editor
    //                setTemplateName(data.name);
    //                setSelectedFormId(data.formId);
    //                setSelectedFields(data.fields.map(f => f.fieldId));
    //                setFilters(data.filters);
    //                setCalculatedFields(data.calculatedFields || []);
    //                setOptions(prev => ({
    //                    ...prev,
    //                    sharedWithRoles: data.sharedWithRole || []
    //                }));
    //            });
    //    }
    //}, [reportId]);

    useEffect(() => {
        if (!reportId) return;

        axios.get(`${APP_CONSTANTS.API_BASE_URL}/api/reports/template/${reportId}`).then((res) => {
            const data = res.data;

            setTemplateName(data.name);
            setSelectedFormId(data.formId);
            setOptions((prev) => ({
                ...prev,
                includeApprovals: data.includeApprovals ?? false,
                includeRemarks: data.includeRemarks ?? false,
                isShared: !!data.sharedWithRole,
                sharedWithRoles: data.sharedWithRole || [],
            }));

            setSelectedFields(data.fields.map(f => f.fieldId));
            setFields(data.fields.map(f => ({
                id: f.fieldId,
                label: f.fieldLabel,
                type: f.type,
                order: f.order,
            })));

            setFilters(data.filters || []);
            setCalculatedFields(data.calculatedFields || []);
            setChartConfig(data.chartConfig || null);
        });
    }, [reportId]);

    // Your original user authentication logic
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
                const names = [storedUser.username, ...storedUser.groups];
                setUser(names);
                fetchAvailableRoles(storedUser);
            }
        } else {
            navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
        }
    }, [navigate]);

    // Your original fetchAvailableRoles function
    const fetchAvailableRoles = async (user) => {
        try {
            // Mock data for now - replace with actual API call
            setAvailableRoles(["Admin", "Manager", "Supervisor", "Analyst", "Viewer"]);
        } catch (err) {
            console.error("Failed to fetch roles:", err);
        }
    };

    // Your original forms fetching logic
    useEffect(() => {
        const fetchForms = async () => {
            if (!user) return;
            try {
                const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/GetALLForm`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(user)
                });
                const data = await response.json();
                setForms(Array.isArray(data) ? data : []); // Defensive assignment
            } catch (err) {
                setError(err.message || "Failed to load forms");
            }
        };
        fetchForms();
    }, [user]);

    // When selectedFormId changes, load fields for that form
    useEffect(() => {
        if (!selectedFormId) return;

        const loadFormFields = async () => {
            try {
                const res = await axios.get(`${APP_CONSTANTS.API_BASE_URL}/api/forms/${selectedFormId}/fields`);
                const fieldList = Array.isArray(res.data)
                    ? res.data
                    : Array.isArray(res.data.fields)
                        ? res.data.fields
                        : [];

                const expandedFields = [];
                fieldList.forEach((field) => {
                    if (field.columnJson) {
                        try {
                            const columns = JSON.parse(field.columnJson);
                            columns.forEach((col) => {
                                expandedFields.push({
                                    id: `${field.id}:${col.id}`,
                                    label: `${field.label} → ${col.name}`,
                                    type: col.type || "text"
                                });
                            });
                        } catch (err) {
                            console.error("Invalid columnJson in field:", field.label);
                        }
                    } else {
                        expandedFields.push({
                            id: field.id,
                            label: field.label,
                            type: field.type
                        });
                    }
                });

                setFields(expandedFields);
            } catch (err) {
                setError("Failed to load form fields: " + (err.message || "Unknown error"));
            }
        };

        loadFormFields();
    }, [selectedFormId]);

     //Your original handleFormChange function
    const handleFormChange = async (e) => {
        const formId = e.target.value;
        setSelectedFormId(formId);

        try {
            const res = await axios.get(`${APP_CONSTANTS.API_BASE_URL}/api/forms/${formId}/fields`);
            const fieldList = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data.fields)
                    ? res.data.fields
                    : [];

            const expandedFields = [];
            fieldList.forEach((field) => {
                if (field.columnJson) {
                    try {
                        const columns = JSON.parse(field.columnJson);
                        columns.forEach((col) => {
                            expandedFields.push({
                                id: `${field.id}:${col.id}`,
                                label: `${field.label} → ${col.name}`,
                                type: col.type || "text"
                            });
                        });
                    } catch (err) {
                        console.error("Invalid columnJson in field:", field.label);
                    }
                } else {
                    expandedFields.push({
                        id: field.id,
                        label: field.label,
                        type: field.type
                    });
                }
            });

            setFields(expandedFields);
            setSelectedFields([]);
            setFilters([]);
            setCalculatedFields([]);

            // Reset any messages
            setError(null);
            setSuccess(null);
        } catch (err) {
            setError("Failed to load form fields: " + (err.message || "Unknown error"));
        }
    };

     //Your original filter functions
    const addFilter = () => {
        setFilters([...filters, {
            id: Date.now(),  // <-- Unique ID
            field: "",
            condition: "",
            value: "",
            type: "text",
            label: ""
        }]);
    };


    const updateFilter = (index, key, value) => {
        const updated = [...filters];
        updated[index][key] = value;

        // Update type and label when field changes
        if (key === "field") {
            const fieldMeta = fields.find(f => f.id === value);
            updated[index].type = fieldMeta?.type || "text";
            updated[index].label = fieldMeta?.label || "";
        }

        setFilters(updated);
    };

    const removeFilter = (idToRemove) => {
        setFilters(filters.filter(f => f.id !== idToRemove));
    };


    // UI helper functions
    const toggleField = (fieldId) => {
        setSelectedFields(prev =>
            prev.includes(fieldId) ? prev.filter(f => f !== fieldId) : [...prev, fieldId]
        );
    };

    const togglePanelSection = (section) => {
        setLeftPanelExpanded(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const previewReport = () => {
        // Mock preview functionality
        alert("Opening report preview...");
    };
    const saveTemplate = async () => {
        // Validation
        if (!templateName.trim()) {
            setError("Please enter a template name");
            return;
        }

        if (selectedFields.length === 0) {
            setError("Please select at least one field");
            return;
        }

        // Clear previous messages
        setError(null);
        setSuccess(null);

        // Check filter validity
        const invalidFilters = filters.filter(f => !f.field || !f.condition);
        if (invalidFilters.length > 0) {
            setError("Please complete all filter criteria or remove incomplete filters");
            return;
        }

        // Check calculated fields validity
        const invalidCalcs = calculatedFields.filter(c => !c.label || !c.formula);
        if (invalidCalcs.length > 0) {
            setError("Please complete all calculated fields or remove incomplete ones");
            return;
        }

        // Prepare payload
        const payload = {
            formId: parseInt(selectedFormId),
            name: templateName,
            createdBy: localStorage.getItem("user")
                ? JSON.parse(localStorage.getItem("user")).username
                : "system",
            includeApprovals: options.includeApprovals,
            includeRemarks: options.includeRemarks,
            isShared: options.isShared,
            sharedWithRole: options.isShared ? options.sharedWithRoles : null,
            fields: selectedFields.map((fieldId, index) => {
                const field = fields.find(f => f.id === fieldId);
                return {
                    fieldId: fieldId,
                    fieldLabel: field?.label || fieldId,
                    order: index
                };
            }),
            filters: filters.map(f => ({
                fieldId: f.field,
                fieldLabel: f.label,
                operator: f.condition,
                value: f.value,
                type: f.type
            })),
            calculatedFields: calculatedFields.map(c => ({
                label: c.label,
                formula: c.formula,
                description: c.description || "",
                format: c.format || "decimal",
                precision: c.precision || 2
            })),
            chartConfig: chartConfig.metrics?.length > 0 ? chartConfig : null
        };
        
        try {
            const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/Reports/save`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json-patch+json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess("Report template saved successfully!");

                // Optionally: redirect to the report viewer
                if (data && data.id) {
                    setTimeout(() => {
                        navigate(`/reports/view/${data.id}`);
                    }, 1500);
                }
            } else {
                setError("Failed to save template: " + (data.message || "Unknown error"));
            }
        } catch (err) {
            setError("Failed to save template: " + (err.message || "Unknown error"));
        }
    };

    useEffect(() => {
    const fetchApprovedSubmissions = async () => {
        if (!selectedFormId) return;

        try {
            const res = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/${selectedFormId}/submissions`);
            const data = await res.json();

            const approvedOnly = data.filter(s =>
                s.approvals && s.approvals.every(a => a.status === "Approved")
            );
            setSubmissionData(approvedOnly);
        } catch (err) {
            console.error("Error fetching submissions", err);
        }
    };

    fetchApprovedSubmissions();
    }, [selectedFormId]);

    // Helper to group selected fields by their grid parent
    function groupGridColumns(fields, selectedFields) {
        const gridGroups = {};
        selectedFields.forEach(fieldId => {
            const field = fields.find(f => f.id === fieldId);
            if (!field) return;
            // grid field ids look like: parentFieldId:colId
            const [parentId, colId] = fieldId.split(":");
            if (colId) {
                if (!gridGroups[parentId]) gridGroups[parentId] = [];
                gridGroups[parentId].push({ ...field, colId });
            }
        });
        return gridGroups;
    }

    function groupGridColumns(fields, selectedFields) {
        const gridGroups = {};
        selectedFields.forEach(fieldId => {
            const field = fields.find(f => f.id === fieldId);
            if (!field) return;
            const [parentId, colId] = fieldId.split(":");
            if (colId) {
                if (!gridGroups[parentId]) gridGroups[parentId] = [];
                gridGroups[parentId].push({ ...field, colId });
            }
        });
        return gridGroups;
    }


    return (
        <div className="flex h-screen bg-gray-100">
            {/* Left Panel */}
            <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
                <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold">Report Designer</h2>
                </div>

                {/* Available Fields */}
                <div className="border-b">
                    <div
                        className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50"
                        onClick={() => togglePanelSection('availableFields')}
                    >
                        <h3 className="font-medium flex items-center">
                            <FileText className="w-4 h-4 mr-2" />
                            Available Fields
                        </h3>
                        {leftPanelExpanded.availableFields ?
                            <ChevronDown className="w-4 h-4" /> :
                            <ChevronRight className="w-4 h-4" />
                        }
                    </div>

                    {leftPanelExpanded.availableFields && (
                        <div className="px-4 pb-4">
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {fields.map((field,idx) => (
                                    <label
                                        key={field.id || idx}
                                        className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedFields.includes(field.id)}
                                            onChange={() => toggleField(field.id)}
                                            className="mr-3"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{field.label}</div>
                                            <div className="text-xs text-gray-500">{field.type}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Selected Fields */}
                <div className="border-b">
                    <div
                        className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50"
                        onClick={() => togglePanelSection('selectedFields')}
                    >
                        <h3 className="font-medium flex items-center">
                            <UserCheck className="w-4 h-4 mr-2" />
                            Selected Fields ({selectedFields.length})
                        </h3>
                        {leftPanelExpanded.selectedFields ?
                            <ChevronDown className="w-4 h-4" /> :
                            <ChevronRight className="w-4 h-4" />
                        }
                    </div>

                    {leftPanelExpanded.selectedFields && (
                        <div className="px-4 pb-4">
                            {selectedFields.length === 0 ? (
                                <p className="text-gray-500 text-sm italic">No fields selected</p>
                            ) : (
                                <div className="space-y-1">
                                        {selectedFields.map((fieldId) => {
                                            const field = fields.find(f => f.id === fieldId);
                                            if (!field) return null;
                                            return (
                                                <div key={fieldId} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                                                    <div>
                                                        <div className="font-medium text-sm">{field.label}</div>
                                                        <div className="text-xs text-gray-500">{field.type}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => toggleField(fieldId)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Calculated Fields */}
                <div className="border-b">
                    <div
                        className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50"
                        onClick={() => togglePanelSection('calculatedFields')}
                    >
                        <h3 className="font-medium flex items-center">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Calculated Fields ({calculatedFields.length})
                        </h3>
                        {leftPanelExpanded.calculatedFields ?
                            <ChevronDown className="w-4 h-4" /> :
                            <ChevronRight className="w-4 h-4" />
                        }
                    </div>

                    {leftPanelExpanded.calculatedFields && (
                        <div className="px-4 pb-4">
                            <button
                                onClick={() => {
                                    setCalculatedFields([...calculatedFields, {
                                        id: Date.now(),
                                        label: "",
                                        formula: "",
                                        description: "",
                                        format: "decimal",
                                        precision: 2
                                    }]);
                                }}
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm flex items-center justify-center"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Add Calculated Field
                            </button>

                            {calculatedFields.map((field, idx) => (
                                <div key={field.id ?? idx} className="mt-2 p-2 border rounded">
                                    <div className="font-medium text-sm">{field.label || "Untitled"}</div>
                                    <div className="text-xs text-gray-500 truncate">{field.formula}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                


                {/* Filters */}
                <div className="border-b">
                    <div
                        className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50"
                        onClick={() => togglePanelSection('filters')}
                    >
                        <h3 className="font-medium flex items-center">
                            <Search className="w-4 h-4 mr-2" />
                            Filters ({filters.length})
                        </h3>
                        {leftPanelExpanded.filters ?
                            <ChevronDown className="w-4 h-4" /> :
                            <ChevronRight className="w-4 h-4" />
                        }
                    </div>

                    {leftPanelExpanded.filters && (
                        <div className="px-4 pb-4">
                            <button
                                onClick={addFilter}
                                className="w-full bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm flex items-center justify-center"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Add Filter
                            </button>

                            {filters.map(filter => (
                                <div key={filter.id} className="mt-2 p-2 border rounded">
                                    <div className="font-medium text-sm">{filter.label || "Untitled Filter"}</div>
                                    <div className="text-xs text-gray-500">{filter.condition}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sharing */}
                <div className="border-b">
                    <div
                        className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50"
                        onClick={() => togglePanelSection('sharing')}
                    >
                        <h3 className="font-medium flex items-center">
                            <Users className="w-4 h-4 mr-2" />
                            Sharing ({selectedUsers.length})
                        </h3>
                        {leftPanelExpanded.sharing ?
                            <ChevronDown className="w-4 h-4" /> :
                            <ChevronRight className="w-4 h-4" />
                        }
                    </div>

                    {leftPanelExpanded.sharing && (
                        <div className="px-4 pb-4">
                            <AdSearchComponent
                                selectedUsers={selectedUsers}
                                setSelectedUsers={setSelectedUsers}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold">Report Designer</h1>
                            <p className="text-gray-600">Create and customize your reports</p>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={previewReport}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Preview
                            </button>
                            <button
                                onClick={saveTemplate}
                                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Save Template
                            </button>
                        </div>
                    </div>

                    {/* Form Selection */}
                    <div className="mb-6 bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-4">Basic Settings</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Select Form</label>
                                <select
                                    value={selectedFormId}
                                    onChange={(e) => {
                                        handleFormChange(e); // <--- Add this line to trigger field loading
                                    }}
                                    className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >

                                    <option value="">-- Choose a form --</option>
                                    {forms.map(form => (
                                        <option key={form.id} value={form.id}>{form.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Template Name</label>
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter template name"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Calculated Fields Editor */}
                    <CalculatedFieldsEditor
                        calculatedFields={calculatedFields}
                        setCalculatedFields={setCalculatedFields}
                        selectedFields={selectedFields}
                        fields={fields}
                    />

                    <div className="mb-6 bg-white p-4 border rounded">
                        <h3 className="font-semibold mb-3">Chart Builder</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm mb-1">Chart Type</label>
                                <select
                                    className="w-full border p-2 rounded"
                                    value={chartConfig?.type}
                                    onChange={(e) => setChartConfig({ ...chartConfig, type: e.target.value })}
                                >
                                    <option value="bar">Bar</option>
                                    <option value="line">Line</option>
                                    <option value="pie">Pie</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm mb-1">Chart Metrics (Multiple Allowed)</label>
                                <select
                                    multiple
                                    className="w-full border p-2 rounded h-32"
                                    value={chartConfig?.metrics}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                                        setChartConfig({ ...chartConfig, metrics: selected });
                                    }}
                                >
                                    {selectedFields.map(fid => {
                                        const field = fields.find(f => f.id === fid);
                                        if (!field) return null;
                                        return <option key={fid} value={field?.label}>{field?.label}</option>;
                                    })}
                                    {calculatedFields.map((cf, idx) => (
                                        <option key={`cf-${idx}`} value={cf.label}>{cf.label}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Hold Ctrl (Windows) or Cmd (Mac) to select multiple</p>
                            </div>

                        </div>
                    </div>

                    {/* Filters Section */}
                    <div className="mb-6 bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-4">Filters</h3>
                        {filters.length === 0 ? (
                            <p className="text-gray-500 italic">No filters added yet. Use the left panel to add filters.</p>
                        ) : (
                            <div className="space-y-4">
                                {filters.map((filter) => (
                                    <div key={filter.id} className="flex gap-3 items-center p-3 border rounded">
                                        <select
                                            value={filter.field}
                                            onChange={(e) => updateFilter(filter.id, "field", e.target.value)}
                                            className="border p-2 rounded flex-1"
                                        >
                                            <option value="">Select Field</option>
                                            {fields.map(field => (
                                                <option key={field.id} value={field.id}>{field.label}</option>
                                            ))}
                                        </select>

                                        <select
                                            value={filter.condition}
                                            onChange={(e) => updateFilter(filter.id, "condition", e.target.value)}
                                            className="border p-2 rounded"
                                        >
                                            <option value="">Condition</option>
                                            <option value="equals">Equals</option>
                                            <option value="contains">Contains</option>
                                            <option value="greaterThan">Greater Than</option>
                                            <option value="lessThan">Less Than</option>
                                        </select>

                                        <input
                                            type="text"
                                            placeholder="Value"
                                            value={filter.value}
                                            onChange={(e) => updateFilter(filter.id, "value", e.target.value)}
                                            className="border p-2 rounded flex-1"
                                        />

                                        <button
                                            onClick={() => removeFilter(filter.id)}
                                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Export & Chart Options */}
                    <div className="mb-6 bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-4">Export & Display Options</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-3">Export Formats</label>
                                <div className="space-y-2">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={options.exportFormats.includes('excel')}
                                            onChange={(e) => {
                                                const formats = e.target.checked
                                                    ? [...options.exportFormats, 'excel']
                                                    : options.exportFormats.filter(f => f !== 'excel');
                                                setOptions({ ...options, exportFormats: formats });
                                            }}
                                            className="mr-2"
                                        />
                                        Excel (.xlsx)
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={options.exportFormats.includes('pdf')}
                                            onChange={(e) => {
                                                const formats = e.target.checked
                                                    ? [...options.exportFormats, 'pdf']
                                                    : options.exportFormats.filter(f => f !== 'pdf');
                                                setOptions({ ...options, exportFormats: formats });
                                            }}
                                            className="mr-2"
                                        />
                                        PDF (.pdf)
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={options.exportFormats.includes('csv')}
                                            onChange={(e) => {
                                                const formats = e.target.checked
                                                    ? [...options.exportFormats, 'csv']
                                                    : options.exportFormats.filter(f => f !== 'csv');
                                                setOptions({ ...options, exportFormats: formats });
                                            }}
                                            className="mr-2"
                                        />
                                        CSV (.csv)
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-3">Display Options</label>
                                <div className="space-y-2">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={options.enableCharts}
                                            onChange={(e) => setOptions({ ...options, enableCharts: e.target.checked })}
                                            className="mr-2"
                                        />
                                        Enable Charts & Visualizations
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={options.includeApprovals}
                                            onChange={(e) => setOptions({ ...options, includeApprovals: e.target.checked })}
                                            className="mr-2"
                                        />
                                        Include Approvals
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={options.includeRemarks}
                                            onChange={(e) => setOptions({ ...options, includeRemarks: e.target.checked })}
                                            className="mr-2"
                                        />
                                        Include Remarks
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Report Preview */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-4">Report Preview</h3>
                        {selectedFields.length > 0 ? (
                            <div className="border rounded overflow-hidden">
                                <div className="bg-gray-50 border-b">
                                    <div className="grid gap-4 font-semibold text-sm mb-2" style={{ gridTemplateColumns: `40px repeat(${selectedFields.length + calculatedFields.length}, 1fr)` }}>
                                        <div></div>
                                        {selectedFields.map(fieldId => {
                                            const field = fields.find(f => f.id === fieldId);
                                            const displayLabel = field?.label?.includes("→")
                                                ? field.label.split("→").pop().trim()
                                                : field?.label;
                                            return (
                                                <div key={fieldId}>{displayLabel}</div>
                                            );
                                        })}
                                        {calculatedFields.map((cf, i) => (
                                            <div key={`cf-${i}`}>{cf.label}</div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-4">
                                    {submissionData.length === 0 ? (
                                        <p className="text-gray-500 italic">No approved submissions available</p>
                                    ) : (
                                        submissionData.slice(0, 3).map((submission, rowIdx) => {
                                            // Determine if this row has any grid data fields
                                            const hasGrid = selectedFields.some(fieldId => {
                                                const field = fields.find(f => f.id === fieldId);
                                                if (!field) return false;
                                                const baseFieldId = fieldId.split(":")[0];
                                                const fieldData = submission.submissionData.find(d => d.fieldLabel === baseFieldId);
                                                try {
                                                    const parsed = JSON.parse(fieldData?.fieldValue || "");
                                                    return Array.isArray(parsed) && typeof parsed[0] === "object";
                                                } catch {
                                                    return false;
                                                }
                                            });

                                            return (
                                                <div key={rowIdx} className="mb-2">
                                                    {/* Main row */}
                                                    <div
                                                        className="grid gap-4 items-center text-sm"
                                                        style={{ gridTemplateColumns: `40px repeat(${selectedFields.length + calculatedFields.length}, 1fr)` }}
                                                    >
                                                        <button
                                                            className="text-blue-500 hover:underline focus:outline-none"
                                                            onClick={() => hasGrid && toggleExpand(rowIdx)}
                                                            style={{
                                                                background: "none",
                                                                border: "none",
                                                                cursor: hasGrid ? "pointer" : "default",
                                                                opacity: hasGrid ? "1" : "0.4"
                                                            }}
                                                            aria-label={expandedSubmissions.includes(rowIdx) ? "Collapse" : "Expand"}
                                                            tabIndex={hasGrid ? 0 : -1}
                                                            disabled={!hasGrid}
                                                        >
                                                            {hasGrid ? (expandedSubmissions.includes(rowIdx) ? "▼" : "▶") : ""}
                                                        </button>
                                                        {/* Normal Fields */}
                                                        {selectedFields.map(fieldId => {
                                                            const field = fields.find(f => f.id === fieldId);
                                                            if (!field) return <div key={fieldId}>—</div>;
                                                            const baseFieldId = fieldId.split(":")[0];
                                                            const columnName = field.label?.includes("→")
                                                                ? field.label.split("→").pop().trim()
                                                                : field.label;
                                                            const fieldData = submission.submissionData.find(d => d.fieldLabel === baseFieldId);
                                                            const raw = fieldData?.fieldValue;

                                                            try {
                                                                const parsed = JSON.parse(raw);
                                                                if (Array.isArray(parsed) && typeof parsed[0] === "object") {
                                                                    // Show summary: count of rows
                                                                    return <div key={fieldId}>{parsed.length} rows</div>;
                                                                }
                                                                return <div key={fieldId}>{parsed || "—"}</div>;
                                                            } catch {
                                                                return <div key={fieldId}>{raw || "—"}</div>;
                                                            }
                                                        })}

                                                        {/* Calculated Fields */}
                                                        {calculatedFields.map((calcField, i) => {
                                                            // ... your existing calculated field logic here ...
                                                            // (unchanged)
                                                            const formula = calcField.formula;
                                                            const precision = calcField.precision ?? 2;
                                                            let computedFormula = formula;

                                                            const functionRegex = /(SUM|AVG|MIN|MAX)\(([^)]+)\)/gi;
                                                            let match;

                                                            while ((match = functionRegex.exec(formula)) !== null) {
                                                                const func = match[1].toUpperCase();
                                                                const fullLabel = match[2].trim();

                                                                const field = fields.find(f => f.label === fullLabel);
                                                                if (!field) {
                                                                    computedFormula = computedFormula.replace(match[0], "0");
                                                                    continue;
                                                                }

                                                                const baseFieldId = field.id.split(":")[0];
                                                                const columnName = fullLabel.split("→").pop().trim();
                                                                const fieldData = submission.submissionData.find(d => d.fieldLabel === baseFieldId);

                                                                try {
                                                                    const parsed = JSON.parse(fieldData?.fieldValue || "[]");
                                                                    const values = Array.isArray(parsed)
                                                                        ? parsed.map(row => Number(row[columnName]) || 0)
                                                                        : [];

                                                                    let result = 0;
                                                                    switch (func) {
                                                                        case "SUM":
                                                                            result = values.reduce((a, b) => a + b, 0);
                                                                            break;
                                                                        case "AVG":
                                                                            result = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                                                                            break;
                                                                        case "MIN":
                                                                            result = values.length ? Math.min(...values) : 0;
                                                                            break;
                                                                        case "MAX":
                                                                            result = values.length ? Math.max(...values) : 0;
                                                                            break;
                                                                    }

                                                                    computedFormula = computedFormula.replace(match[0], result);
                                                                } catch {
                                                                    computedFormula = computedFormula.replace(match[0], "0");
                                                                }
                                                            }

                                                            try {
                                                                const result = eval(computedFormula);
                                                                return (
                                                                    <div key={`cf-${i}`}>
                                                                        {Number(result).toFixed(precision)}
                                                                    </div>
                                                                );
                                                            } catch {
                                                                return (
                                                                    <div key={`cf-${i}`} className="text-red-500">Err</div>
                                                                );
                                                            }
                                                        })}
                                                    </div>
                                                    {/* Nested grid rows */}
                                                    {expandedSubmissions.includes(rowIdx) && (
                                                        <div className="pl-10 pt-2">
                                                            {(() => {
                                                                const gridGroups = groupGridColumns(fields, selectedFields);
                                                                return Object.entries(gridGroups).map(([parentId, columns]) => {
                                                                    const parentField = fields.find(f => f.id === parentId);
                                                                    const parentLabel = parentField ? parentField.label : parentId;
                                                                    const fieldData = submission.submissionData.find(d => d.fieldLabel === parentId);
                                                                    let gridRows = [];
                                                                    try {
                                                                        gridRows = JSON.parse(fieldData?.fieldValue || "[]");
                                                                        if (!Array.isArray(gridRows)) gridRows = [];
                                                                    } catch {
                                                                        gridRows = [];
                                                                    }
                                                                    if (gridRows.length === 0) return null;
                                                                    return (
                                                                        <CollapsibleGridTable
                                                                            key={parentId}
                                                                            label={parentLabel}
                                                                            columns={columns}
                                                                            rows={gridRows}
                                                                            maxPreviewRows={3}
                                                                        />
                                                                    );
                                                                });
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Select fields from the left panel to preview your report</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}