import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { ChevronRight, ChevronDown, Users, Download, BarChart3, FileText, Plus, X, Search, User, UserCheck, Copy } from "lucide-react";
import { APP_CONSTANTS } from "./store";
import useAdSearch from "./hooks/useAdSearch"
import ReportCharts from "./ReportCharts"
import CollapsibleGridTable from './CollapsibleGridTable';
import MultiChartBuilder from './MultiChartBuilder'; // Import the new component
import EnhancedCalculatedFieldsEditor from './CalculatedFieldsEditor';
import { toast } from 'react-toastify';



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
    //UPDATED: Replace single chartConfig with multiple chart configurations
    const [chartConfigs, setChartConfigs] = useState([]);
    const [expandedSubmissions, setExpandedSubmissions] = useState([]);
    const { reportId } = useParams(); // <-- this grabs the report ID from the route
    const [chartConfig, setChartConfig] = useState({
        type: "line",
        metrics: []  // now an array
    });
    const [summaryRows, setSummaryRows] = useState([]);


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
    //}, [reportId]);f

    useEffect(() => {
        if (!reportId) return;

        axios.get(`${APP_CONSTANTS.API_BASE_URL}/api/reports/template/${reportId}`).then((res) => {
            const data = res.data;
            console.log(data);

            setTemplateName(data.name);
            setSelectedFormId(data.formId);
            setOptions((prev) => ({
                ...prev,
                includeApprovals: data.includeApprovals ?? false,
                includeRemarks: data.includeRemarks ?? false,
                isShared: !!data.sharedWithRole,
                sharedWithRoles: data.sharedWithRole || [],
            }));
            console.log(data.sharedWithRole)
            if (data.sharedWithRole) {
                try {
                    let parsedUsers;

                    // Check if it's already an object/array
                    if (typeof data.sharedWithRole === 'string') {
                        parsedUsers = JSON.parse(data.sharedWithRole);
                    } else {
                        // It's already parsed (object/array)
                        parsedUsers = data.sharedWithRole;
                    }

                    if (Array.isArray(parsedUsers)) {
                        setSelectedUsers(parsedUsers);
                        console.log('Loaded selected users:', parsedUsers);
                    } else {
                        console.warn('SharedWithRole is not an array:', parsedUsers);
                        setSelectedUsers([]);
                    }
                } catch (error) {
                    console.error('Error parsing SharedWithRole:', error);
                    setSelectedUsers([]);
                }
            } else {
                setSelectedUsers([]);
            }

            // Map fields first and set local state
            const mappedFields = (data.fields || []).map(f => ({
                id: f.fieldId,
                label: f.fieldLabel,
                type: f.type || "text",   // fallback if type missing
                order: f.order
            }));
            setFields(mappedFields);

            // Set selectedFields from mappedFields just by id
            setSelectedFields(mappedFields.map(f => f.id));

            // Map filters after fields state is prepared (use mappedFields directly here)
            const loadedFilters = (data.filters || []).map((f, index) => {
                const matchingField = mappedFields.find(field =>
                    field.id === f.fieldLabel || field.label === f.fieldLabel
                );
                return {
                    id: index + 1,
                    field: matchingField?.id || f.fieldLabel || "",   // fallback to GUID or empty string
                    label: matchingField?.label || f.fieldLabel,
                    type: matchingField?.type || f.type || "text",
                    condition: f.operator || "",
                    value: f.value || ""
                };
            });
            setFilters(loadedFilters);


            setCalculatedFields(data.calculatedFields || []);
            // Normalize chartConfigs handling for backward compatibility
            let charts = [];

            if (data.chartConfig) {
                if (Array.isArray(data.chartConfig)) {
                    // Handle array of charts
                    charts = data.chartConfig.map(chart => ({
                        ...chart,
                        position: {
                            row: chart.position?.Row ?? chart.position?.row ?? 0,
                            col: chart.position?.Col ?? chart.position?.col ?? 0,
                            width: chart.position?.Width ?? chart.position?.width ?? 12,
                            height: chart.position?.Height ?? chart.position?.height ?? 6,
                        }
                    }));
                } else {
                    // Handle single chart object (backward compatibility)
                    charts = [{
                        id: data.chartConfig.id || 1,
                        title: data.chartConfig.title || "Chart 1",
                        type: data.chartConfig.type || "bar",
                        metrics: data.chartConfig.metrics || [],
                        xField: data.chartConfig.xField || null,
                        position: {
                            row: data.chartConfig.position?.Row ?? 0,
                            col: data.chartConfig.position?.Col ?? 0,
                            width: data.chartConfig.position?.Width ?? 12,
                            height: data.chartConfig.position?.Height ?? 6
                        },
                        comboConfig: data.chartConfig.comboConfig || { barMetrics: [], lineMetrics: [] }
                    }];
                }
            }
            // If data.chartConfig is null/undefined, charts remains empty array []

            console.log(charts)
            setChartConfigs(charts);
        });
    }, [reportId]);

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

    const fetchAvailableRoles = async (user) => {
        try {
            // Mock data for now - replace with actual API call
            setAvailableRoles(["Admin", "Manager", "Supervisor", "Analyst", "Viewer"]);
        } catch (err) {
            console.error("Failed to fetch roles:", err);
        }
    };

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

    const updateFilter = (id, updates) => {
        setFilters((prev) =>
            prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
        );
    };;

    const removeFilter = (idToRemove) => {
        setFilters(filters.filter(f => f.id !== idToRemove));
    };

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
        
        //console.log(filters)
        // Check filter validity
        const invalidFilters = filters.filter(f => !f.field || !f.condition);
        if (invalidFilters.length > 0) {
            setError("Please complete all filter criteria or remove incomplete filters");
            return;
        }

        console.log(calculatedFields)
        // Check calculated fields validity
        const invalidCalcs = calculatedFields.filter(c => !c.label || !c.formula);
        if (invalidCalcs.length > 0) {
            setError("Please complete all calculated fields or remove incomplete ones");
            return;
        }

        // Validate charts
        const invalidCharts = chartConfigs.filter(chart => {
            if (!chart.title || chart.metrics.length === 0) return true;
            if (chart.type === "combo" && (!chart.comboConfig.barMetrics?.length && !chart.comboConfig.lineMetrics?.length)) return true;
            return false;
        });

        if (invalidCharts.length > 0) {
            setError("Please complete all chart configurations or remove incomplete ones");
            return;
        }

        const filtersToSave = filters.map(f => {
            const matchedField = fields.find(field => field.id === f.field);
            console.log(matchedField)
            return {
                fieldLabel: matchedField?.id || f.field,    // REQUIRED to match on load
                operator: f.condition,
                value: f.value,
                type: matchedField?.type || f.type || "text"
            };
        });
        //console.log(filtersToSave)
        // Prepare payload
        const payload = {
            Id: reportId ? parseInt(reportId) : 0,
            formId: parseInt(selectedFormId),
            name: templateName,
            createdBy: localStorage.getItem("user")
                ? JSON.parse(localStorage.getItem("user")).username
                : "system",
            includeApprovals: options.includeApprovals,
            includeRemarks: options.includeRemarks,
            isShared: options.isShared,
            sharedWithRole: selectedUsers.length > 0 ? JSON.stringify(selectedUsers) : null,
            fields: selectedFields.map((fieldId, index) => {
                const field = fields.find(f => f.id === fieldId);
                return {
                    fieldId: fieldId,
                    fieldLabel: field?.label || fieldId,
                    order: index
                };
            }),
            filters: filtersToSave,
            calculatedFields: calculatedFields.map(c => ({
                calculationType: c.calculationType || "aggregate",
                description: c.description || "",
                format: c.format || "decimal",
                formula: c.formula,
                functionType: c.functionType || "",
                id: c.id,
                label: c.label,
                precision: c.precision || 2,
                showOneRowPerGroup: c.showOneRowPerGroup || false,
                sortOrder: c.sortOrder,
                sourceFields: c.sourceFields || [],
                windowSize: c.windowSize || 3
            })),
            // UPDATED: Save multiple chart configurations
            chartConfigs: chartConfigs.map(chart => ({
                id: chart.id,
                title: chart.title,
                type: chart.type,
                // Convert field IDs to field labels for storage
                metrics: chart.metrics.map(metricId => {
                    const field = fields.find(f => f.id === metricId);
                    return field ? field.label : metricId;
                }),
                // Convert xField ID to label
                xField: (() => {
                    if (!chart.xField) return null;
                    const field = fields.find(f => f.id === chart.xField);
                    return field ? field.label : chart.xField;
                })(),
                position: chart.position,
                comboConfig: {
                    // Convert combo config IDs to labels
                    barMetrics: (chart.comboConfig?.barMetrics || []).map(metricId => {
                        const field = fields.find(f => f.id === metricId);
                        return field ? field.label : metricId;
                    }),
                    lineMetrics: (chart.comboConfig?.lineMetrics || []).map(metricId => {
                        const field = fields.find(f => f.id === metricId);
                        return field ? field.label : metricId;
                    })
                }
            }))
        };

        const fixedPayload = {
            Id: payload.Id,
            FormId: payload.formId,
            Name: payload.name,
            CreatedBy: payload.createdBy,
            IncludeApprovals: payload.includeApprovals,
            IncludeRemarks: payload.includeRemarks,
            SharedWithRole: payload.sharedWithRole,
            Fields: payload.fields,
            Filters: payload.filters,
            CalculatedFields: payload.calculatedFields,
            ChartConfigs: payload.chartConfigs
        };
        console.log(payload)
        console.log(fixedPayload)
        try {
            const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/Reports/save`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json-patch+json"
                },
                body: JSON.stringify(fixedPayload)
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Reported Saved Successfully")
                setSuccess("Report template saved successfully!");
                toast.success("Report template saved successfully!");
                // Optionally: redirect to the report viewer
                console.log(data)
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

    const calculateFieldValueForPreview = (calcField, submission, fields, allSubmissions = [], currentIndex = 0) => {
        const formula = calcField.formula;
        const precision = calcField.precision ?? 2;

        // Handle different calculation types
        switch (calcField.calculationType) {
            case 'rowwise':
                return calculateRowwiseValue(calcField, submission, fields, precision);

            case 'aggregate':
                return calculateAggregateValue(calcField, allSubmissions, fields, precision);

            case 'columnwise':
                return calculateColumnwiseValue(calcField, allSubmissions, fields, currentIndex, precision);

            case 'grouping':
                return calculateGroupingValue(calcField, submission, fields, precision);

            default:
                return "0";
        }
    };

    const calculateColumnwiseSummary = (calcField, allSubmissions, fields) => {
        const precision = calcField.precision ?? 2;

        switch (calcField.functionType) {
            case "RUNNING_TOTAL":
                // For running total, summary shows the final cumulative value
                const field = fields.find(f => f.label === calcField.formula.match(/"([^"]+)"/)?.[1]);
                if (field) {
                    let total = 0;
                    allSubmissions.forEach(submission => {
                        const fieldData = submission.submissionData.find(d => d.fieldLabel === field.id.split(':')[0]);
                        try {
                            const parsed = JSON.parse(fieldData?.fieldValue || "0");
                            total += parseFloat(parsed) || 0;
                        } catch {
                            total += parseFloat(fieldData?.fieldValue || "0") || 0;
                        }
                    });
                    return Number(total).toFixed(precision);
                }
                return "0";

            case "PERCENT_OF_TOTAL":
                return "100.00"; // Total percentage should always be 100%

            case "RANK":
                return `1-${allSubmissions.length}`; // Show ranking range

            case "CUMULATIVE_AVG":
                // Show final cumulative average
                const avgField = fields.find(f => f.label === calcField.formula.match(/"([^"]+)"/)?.[1]);
                if (avgField) {
                    let sum = 0, count = 0;
                    allSubmissions.forEach(submission => {
                        const fieldData = submission.submissionData.find(d => d.fieldLabel === avgField.id.split(':')[0]);
                        try {
                            const value = parseFloat(JSON.parse(fieldData?.fieldValue || "0")) || 0;
                            if (value !== 0) {
                                sum += value;
                                count++;
                            }
                        } catch {
                            const value = parseFloat(fieldData?.fieldValue || "0") || 0;
                            if (value !== 0) {
                                sum += value;
                                count++;
                            }
                        }
                    });
                    return count > 0 ? Number(sum / count).toFixed(precision) : "0";
                }
                return "0";

            default:
                return "—";
        }
    };

    const calculateColumnwiseValue = (calcField, allSubmissions, fields, currentIndex, precision) => {
        const field = fields.find(f => f.label === calcField.formula.match(/"([^"]+)"/)?.[1]);
        if (!field) return "0";

        switch (calcField.functionType) {
            case "RUNNING_TOTAL":
                let runningTotal = 0;
                for (let i = 0; i <= currentIndex; i++) {
                    const submission = allSubmissions[i];
                    const fieldData = submission.submissionData.find(d => d.fieldLabel === field.id.split(':')[0]);
                    try {
                        const value = parseFloat(JSON.parse(fieldData?.fieldValue || "0")) || 0;
                        runningTotal += value;
                    } catch {
                        const value = parseFloat(fieldData?.fieldValue || "0") || 0;
                        runningTotal += value;
                    }
                }
                return Number(runningTotal).toFixed(precision);

            case "RANK":
                // Calculate rank for current submission
                const currentSubmission = allSubmissions[currentIndex];
                const currentFieldData = currentSubmission.submissionData.find(d => d.fieldLabel === field.id.split(':')[0]);
                const currentValue = parseFloat(JSON.parse(currentFieldData?.fieldValue || "0")) || 0;

                const allValues = allSubmissions.map((sub, idx) => {
                    const fieldData = sub.submissionData.find(d => d.fieldLabel === field.id.split(':')[0]);
                    const value = parseFloat(JSON.parse(fieldData?.fieldValue || "0")) || 0;
                    return { value, index: idx };
                }).sort((a, b) => calcField.sortOrder === 'DESC' ? b.value - a.value : a.value - b.value);

                const rank = allValues.findIndex(item => item.index === currentIndex) + 1;
                return rank.toString();

            case "PERCENT_OF_TOTAL":
                const currentSubmissionPct = allSubmissions[currentIndex];
                const currentFieldDataPct = currentSubmissionPct.submissionData.find(d => d.fieldLabel === field.id.split(':')[0]);
                const currentValuePct = parseFloat(JSON.parse(currentFieldDataPct?.fieldValue || "0")) || 0;

                const totalValue = allSubmissions.reduce((sum, submission) => {
                    const fieldData = submission.submissionData.find(d => d.fieldLabel === field.id.split(':')[0]);
                    const value = parseFloat(JSON.parse(fieldData?.fieldValue || "0")) || 0;
                    return sum + value;
                }, 0);

                const percentage = totalValue !== 0 ? (currentValuePct / totalValue) * 100 : 0;
                return Number(percentage).toFixed(precision);

            default:
                return "0";
        }
    };

    const calculateRowwiseValue = (calcField, submission, fields, precision) => {
        const formula = calcField.formula;
        let computedFormula = formula;

        const functionRegex = /(ADD|SUBTRACT|MULTIPLY|DIVIDE|PERCENTAGE|EFFICIENCY)\(([^)]+)\)/gi;
        let match;

        while ((match = functionRegex.exec(formula)) !== null) {
            const func = match[1].toUpperCase();
            const params = match[2].split(',').map(p => p.trim().replace(/['"]/g, ''));

            let result = 0;

            switch (func) {
                case "ADD":
                case "SUBTRACT":
                case "MULTIPLY":
                case "DIVIDE":
                    const values = params.map(param => {
                        const field = fields.find(f => f.label === param);
                        if (field) {
                            const fieldData = submission.submissionData.find(d => d.fieldLabel === field.id.split(':')[0]);
                            try {
                                const parsed = JSON.parse(fieldData?.fieldValue || "0");
                                if (Array.isArray(parsed)) {
                                    const columnName = field.label.split('→').pop().trim();
                                    return parsed.reduce((sum, row) => sum + (parseFloat(row[columnName]) || 0), 0);
                                }
                                return parseFloat(parsed) || 0;
                            } catch {
                                return parseFloat(fieldData?.fieldValue || "0") || 0;
                            }
                        }
                        return parseFloat(param) || 0;
                    });

                    switch (func) {
                        case "ADD":
                            result = values.reduce((a, b) => a + b, 0);
                            break;
                        case "SUBTRACT":
                            result = values.length > 1 ? values.reduce((a, b) => a - b) : 0;
                            break;
                        case "MULTIPLY":
                            result = values.reduce((a, b) => a * b, 1);
                            break;
                        case "DIVIDE":
                            result = values[1] !== 0 ? values[0] / values[1] : 0;
                            break;
                    }
                    break;

                case "EFFICIENCY":
                    if (params.length >= 3) {
                        const outputField = fields.find(f => f.label === params[0]);
                        const inputField = fields.find(f => f.label === params[1]);
                        const target = parseFloat(params[2]) || 1;

                        if (outputField && inputField) {
                            const outputData = submission.submissionData.find(d => d.fieldLabel === outputField.id.split(':')[0]);
                            const inputData = submission.submissionData.find(d => d.fieldLabel === inputField.id.split(':')[0]);

                            try {
                                let outputValue = 0, inputValue = 1;

                                if (outputData) {
                                    const parsed = JSON.parse(outputData.fieldValue || "0");
                                    if (Array.isArray(parsed)) {
                                        const columnName = outputField.label.split('→').pop().trim();
                                        outputValue = parsed.reduce((sum, row) => sum + (parseFloat(row[columnName]) || 0), 0);
                                    } else {
                                        outputValue = parseFloat(parsed) || 0;
                                    }
                                }

                                if (inputData) {
                                    const parsed = JSON.parse(inputData.fieldValue || "1");
                                    if (Array.isArray(parsed)) {
                                        const columnName = inputField.label.split('→').pop().trim();
                                        inputValue = parsed.reduce((sum, row) => sum + (parseFloat(row[columnName]) || 0), 0) || 1;
                                    } else {
                                        inputValue = parseFloat(parsed) || 1;
                                    }
                                }

                                result = inputValue !== 0 ? (outputValue / inputValue) / target * 100 : 0;
                            } catch {
                                result = 0;
                            }
                        }
                    }
                    break;
            }

            computedFormula = computedFormula.replace(match[0], result);
        }

        try {
            const finalResult = eval(computedFormula);
            return Number(finalResult).toFixed(precision);
        } catch {
            return "0";
        }
    };

    const calculateAggregateValue = (calcField, allSubmissions, fields, precision) => {
        const formula = calcField.formula;
        let computedFormula = formula;

        const functionRegex = /(SUM|AVG|MIN|MAX|COUNT)\(([^)]+)\)/gi;
        let match;

        while ((match = functionRegex.exec(formula)) !== null) {
            const func = match[1].toUpperCase();
            const fieldLabel = match[2].trim().replace(/['"]/g, '');

            const field = fields.find(f => f.label === fieldLabel);
            if (!field) {
                computedFormula = computedFormula.replace(match[0], "0");
                continue;
            }

            const allValues = [];
            allSubmissions.forEach(submission => {
                const baseFieldId = field.id.split(":")[0];
                const fieldData = submission.submissionData.find(d => d.fieldLabel === baseFieldId);

                try {
                    const parsed = JSON.parse(fieldData?.fieldValue || "0");
                    if (Array.isArray(parsed)) {
                        const columnName = field.label.split('→').pop().trim();
                        parsed.forEach(row => {
                            const val = parseFloat(row[columnName]) || 0;
                            if (val !== 0) allValues.push(val);
                        });
                    } else {
                        const val = parseFloat(parsed) || 0;
                        if (val !== 0) allValues.push(val);
                    }
                } catch {
                    const val = parseFloat(fieldData?.fieldValue || "0") || 0;
                    if (val !== 0) allValues.push(val);
                }
            });

            let result = 0;
            switch (func) {
                case "SUM":
                    result = allValues.reduce((a, b) => a + b, 0);
                    break;
                case "AVG":
                    result = allValues.length ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0;
                    break;
                case "MIN":
                    result = allValues.length ? Math.min(...allValues) : 0;
                    break;
                case "MAX":
                    result = allValues.length ? Math.max(...allValues) : 0;
                    break;
                case "COUNT":
                    result = allValues.length;
                    break;
            }

            computedFormula = computedFormula.replace(match[0], result);
        }

        try {
            const finalResult = eval(computedFormula);
            return Number(finalResult).toFixed(precision);
        } catch {
            return "0";
        }
    };

    const calculateGroupingValue = (calcField, submission, fields, precision) => {
        // For preview, just show sample grouping result
        return "Group Total";
    };

    const copyReportDesign = async () => {
        // Validation - ensure there's something to copy
        if (!templateName.trim()) {
            setError("Please enter a template name before copying");
            return;
        }

        if (!selectedFormId) {
            setError("Please select a form before copying");
            return;
        }

        if (selectedFields.length === 0) {
            setError("Please select at least one field before copying");
            return;
        }

        // Clear previous messages
        setError(null);
        setSuccess(null);

        // Prepare payload similar to saveTemplate but for copying
        const filtersToSave = filters.map(f => {
            const matchedField = fields.find(field => field.id === f.field);
            return {
                fieldLabel: matchedField?.id || f.field,
                operator: f.condition,
                value: f.value,
                type: matchedField?.type || f.type || "text"
            };
        });

        const payload = {
            Id: 0, // Always 0 for new copy
            FormId: parseInt(selectedFormId),
            Name: templateName + " (Copy)", // Append (Copy) to distinguish
            CreatedBy: localStorage.getItem("user")
                ? JSON.parse(localStorage.getItem("user")).username
                : "system",
            IncludeApprovals: options.includeApprovals,
            IncludeRemarks: options.includeRemarks,
            SharedWithRole: selectedUsers.length > 0 ? JSON.stringify(selectedUsers) : null,
            Fields: selectedFields.map((fieldId, index) => {
                const field = fields.find(f => f.id === fieldId);
                return {
                    fieldId: fieldId,
                    fieldLabel: field?.label || fieldId,
                    order: index
                };
            }),
            Filters: filtersToSave,
            CalculatedFields: calculatedFields.map(c => ({
                calculationType: c.calculationType || "aggregate",
                description: c.description || "",
                format: c.format || "decimal",
                formula: c.formula,
                functionType: c.functionType || "",
                id: c.id,
                label: c.label,
                precision: c.precision || 2,
                showOneRowPerGroup: c.showOneRowPerGroup || false,
                sortOrder: c.sortOrder,
                sourceFields: c.sourceFields || [],
                windowSize: c.windowSize || 3
            })),
            ChartConfigs: chartConfigs.map(chart => ({
                id: chart.id,
                title: chart.title,
                type: chart.type,
                metrics: chart.metrics.map(metricId => {
                    const field = fields.find(f => f.id === metricId);
                    return field ? field.label : metricId;
                }),
                xField: (() => {
                    if (!chart.xField) return null;
                    const field = fields.find(f => f.id === chart.xField);
                    return field ? field.label : chart.xField;
                })(),
                position: chart.position,
                comboConfig: {
                    barMetrics: (chart.comboConfig?.barMetrics || []).map(metricId => {
                        const field = fields.find(f => f.id === metricId);
                        return field ? field.label : metricId;
                    }),
                    lineMetrics: (chart.comboConfig?.lineMetrics || []).map(metricId => {
                        const field = fields.find(f => f.id === metricId);
                        return field ? field.label : metricId;
                    })
                }
            }))
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
                setSuccess("Report template copied successfully! A new copy has been created.");

                // Optionally: redirect to the new copy for editing
                if (data && data.id) {
                    setTimeout(() => {
                        navigate(`/reports/designer/${data.id}`);
                    }, 1500);
                }
            } else {
                setError("Failed to copy template: " + (data.message || "Unknown error"));
            }
        } catch (err) {
            setError("Failed to copy template: " + (err.message || "Unknown error"));
        }
    };


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
                                {fields.map((field, idx) => (
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
                <div className="border-b">
                    <div
                        className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50"
                        onClick={() => togglePanelSection('charts')}
                    >
                        <h3 className="font-medium flex items-center">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Charts ({chartConfigs.length})
                        </h3>
                        {leftPanelExpanded.charts ?
                            <ChevronDown className="w-4 h-4" /> :
                            <ChevronRight className="w-4 h-4" />
                        }
                    </div>

                    {leftPanelExpanded.charts && (
                        <div className="px-4 pb-4">
                            {chartConfigs.length === 0 ? (
                                <p className="text-gray-500 text-sm italic">No charts configured</p>
                            ) : (
                                <div className="space-y-2">
                                    {chartConfigs.map((chart, idx) => (
                                        <div key={chart.id || idx} className="p-2 bg-blue-50 rounded">
                                            <div className="font-medium text-sm">{chart.title}</div>
                                            <div className="text-xs text-gray-500">{chart.type.toUpperCase()}</div>
                                            <div className="text-xs text-gray-500">{chart.metrics.length} metrics</div>
                                        </div>
                                    ))}
                                </div>
                            )}
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
                                onClick={copyReportDesign}
                                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded flex items-center"
                            >
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate Report
                            </button>
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

                    {/* Enhanced Calculated Fields Editor */}
                    <EnhancedCalculatedFieldsEditor
                        calculatedFields={calculatedFields}
                        setCalculatedFields={setCalculatedFields}
                        selectedFields={selectedFields}
                        fields={fields}
                    />

                    <MultiChartBuilder
                        chartConfigs={chartConfigs}
                        setChartConfigs={setChartConfigs}
                        selectedFields={selectedFields}
                        fields={fields}
                        calculatedFields={calculatedFields}
                        data={submissionData} // Add this line
                    />


                    


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
                                            value={filter.field || ""}
                                            onChange={(e) => {
                                                const selected = fields.find(f => f.id === e.target.value);
                                                updateFilter(filter.id, {
                                                    field: selected.id,
                                                    label: selected.label,
                                                    type: selected.type,
                                                    condition: "", // reset
                                                    value: ""
                                                });
                                            }}
                                        >
                                            <option value="">Select Field</option>
                                            {fields.map(f => (
                                                <option key={f.id} value={f.id}>{f.label}</option>
                                            ))}
                                        </select>



                                        <select
                                            value={filter.condition || ""}
                                            onChange={(e) => updateFilter(filter.id, { condition: e.target.value })}
                                            className="border p-2 rounded"
                                        >
                                            <option value="">Condition</option>
                                            {filter.type === "date" && <option value="between">Between</option>}
                                            <option value="equals">Equals</option>
                                            <option value="contains">Contains</option>
                                            {filter.type !== "text" && (
                                                <>
                                                    <option value="greaterThan">Greater Than</option>
                                                    <option value="lessThan">Less Than</option>
                                                </>
                                            )}
                                        </select>


                                        {filter.condition === "between" ? (
                                            <></>
                                        ) : (
                                            <input
                                                type="text"
                                                placeholder="Value"
                                                value={filter.value || ""}
                                                onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                                                className="border p-2 rounded flex-1"
                                            />
                                        )}


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

                        {/* Chart Preview */}
                        {chartConfig?.metrics?.length > 0 && chartConfig?.type && (
                            <div className="mb-6">
                                <h4 className="font-semibold mb-3">📊 Chart Preview</h4>
                                <ReportCharts
                                    data={submissionData.map(submission => ({
                                        data: submission.submissionData.map(field => ({
                                            fieldLabel: fields.find(f => f.id.split(':')[0] === field.fieldLabel)?.label || field.fieldLabel,
                                            value: field.fieldValue
                                        }))
                                    }))}
                                    metrics={chartConfig.metrics}
                                    type={chartConfig.type}
                                    xField={chartConfig.xField || "Line Name"}
                                    title={chartConfig.title || "Chart Preview"}
                                />
                            </div>
                        )}

                        {/* Table Preview */}
                        {selectedFields.length > 0 ? (
                            <div>
                                <h4 className="font-semibold mb-3">📋 Data Table Preview</h4>
                                <div className="border rounded overflow-hidden">
                                    {/* Table Header */}
                                    <div className="bg-gray-50 border-b">
                                        <div className="grid gap-4 font-semibold text-sm p-3" style={{ gridTemplateColumns: `40px repeat(${selectedFields.length + calculatedFields.length}, 1fr)` }}>
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
                                                <div key={`cf-${i}`} className="text-blue-600">
                                                    {cf.label}
                                                    <div className="text-xs font-normal text-gray-500">
                                                        ({cf.calculationType})
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Table Body */}
                                    <div className="max-h-96 overflow-y-auto">
                                        {submissionData.length === 0 ? (
                                            <p className="text-gray-500 italic p-4">No approved submissions available</p>
                                        ) : (
                                            <>
                                                {/* Regular Data Rows */}
                                                {submissionData.slice(0, 3).map((submission, rowIdx) => {
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
                                                        <div key={rowIdx} className="border-b last:border-b-0">
                                                            {/* Main row */}
                                                            <div
                                                                className="grid gap-4 items-center text-sm p-3 hover:bg-gray-50"
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
                                                                    disabled={!hasGrid}
                                                                >
                                                                    {hasGrid ? (expandedSubmissions.includes(rowIdx) ? "▼" : "▶") : ""}
                                                                </button>

                                                                {/* Normal Fields */}
                                                                {selectedFields.map(fieldId => {
                                                                    const field = fields.find(f => f.id === fieldId);
                                                                    if (!field) return <div key={fieldId}>—</div>;
                                                                    const baseFieldId = fieldId.split(":")[0];
                                                                    const fieldData = submission.submissionData.find(d => d.fieldLabel === baseFieldId);
                                                                    const raw = fieldData?.fieldValue;

                                                                    try {
                                                                        const parsed = JSON.parse(raw);
                                                                        if (Array.isArray(parsed) && typeof parsed[0] === "object") {
                                                                            return <div key={fieldId}>{parsed.length} rows</div>;
                                                                        }
                                                                        return <div key={fieldId}>{parsed || "—"}</div>;
                                                                    } catch {
                                                                        return <div key={fieldId}>{raw || "—"}</div>;
                                                                    }
                                                                })}

                                                                {/* Calculated Fields */}
                                                                {calculatedFields.map((calcField, i) => {
                                                                    const calculatedValue = calculateFieldValueForPreview(calcField, submission, fields, submissionData, rowIdx);
                                                                    const displayValue = calcField.format === 'percentage'
                                                                        ? `${calculatedValue}%`
                                                                        : calculatedValue;

                                                                    return (
                                                                        <div key={`cf-${i}`} className="font-medium text-blue-700">
                                                                            {displayValue}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* Nested grid rows (existing code) */}
                                                            {expandedSubmissions.includes(rowIdx) && (
                                                                <div className="pl-10 pt-2 pb-2 bg-gray-25">
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
                                                })}

                                                {/* Summary Row for Column-wise Calculations */}
                                                {calculatedFields.some(cf => cf.calculationType === 'columnwise') && (
                                                    <div className="bg-blue-50 border-t-2 border-blue-200">
                                                        <div
                                                            className="grid gap-4 items-center text-sm p-3 font-semibold"
                                                            style={{ gridTemplateColumns: `40px repeat(${selectedFields.length + calculatedFields.length}, 1fr)` }}
                                                        >
                                                            <div className="text-blue-600">📊</div>

                                                            {/* Empty cells for regular fields */}
                                                            {selectedFields.map(fieldId => (
                                                                <div key={`summary-${fieldId}`} className="text-gray-400">—</div>
                                                            ))}

                                                            {/* Summary values for calculated fields */}
                                                            {calculatedFields.map((calcField, i) => {
                                                                if (calcField.calculationType === 'columnwise') {
                                                                    // Calculate summary value for column-wise calculations
                                                                    const summaryValue = calculateColumnwiseSummary(calcField, submissionData, fields);
                                                                    const displayValue = calcField.format === 'percentage'
                                                                        ? `${summaryValue}%`
                                                                        : summaryValue;

                                                                    return (
                                                                        <div key={`summary-cf-${i}`} className="text-blue-700 font-bold">
                                                                            {displayValue}
                                                                            <div className="text-xs font-normal text-blue-500">
                                                                                Final {calcField.functionType}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                } else {
                                                                    return <div key={`summary-cf-${i}`} className="text-gray-400">—</div>;
                                                                }
                                                            })}
                                                        </div>
                                                        <div className="px-3 pb-2">
                                                            <p className="text-xs text-blue-600">
                                                                📋 Summary Row: Final results for column-wise calculations
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
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