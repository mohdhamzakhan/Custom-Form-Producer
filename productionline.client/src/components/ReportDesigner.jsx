import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import CalculatedFieldsEditor from "./CalculatedFieldsEditor";
import {APP_CONSTANTS} from "./store";

export default function ReportDesigner() {
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
        sharedWithRoles: []
    });
    const [calculatedFields, setCalculatedFields] = useState([]);
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [availableRoles, setAvailableRoles] = useState([]);
    const navigate = useNavigate();
    const { reportId } = useParams();  // In component

    useEffect(() => {
        if (reportId) {
            fetch(`${APP_CONSTANTS.API_BASE_URL}/api/reports/template/${reportId}`)
                .then(res => res.json())
                .then(data => {
                    setTemplateName(data.name);
                    setSelectedFormId(data.formId);
                    setSelectedFields(data.fields.map(f => f.fieldId));
                    setFilters(data.filters);
                    setCalculatedFields(data.calculatedFields || []);
                    setOptions(prev => ({
                        ...prev,
                        sharedWithRoles: data.sharedWithRole || []
                    }));
                });
        }
    }, [reportId]);

    useEffect(() => {
        const storedUserData = localStorage.getItem("user");

        if (storedUserData && storedUserData !== "undefined") {
            const storedUser = JSON.parse(storedUserData);

            // ⏳ Check if session has expired
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
    }, [navigate, location]);

    const fetchAvailableRoles = async (user) => {
        // This is a placeholder - you'll need to implement the actual API
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

    const toggleField = (fieldId) => {
        setSelectedFields(prev =>
            prev.includes(fieldId) ? prev.filter(f => f !== fieldId) : [...prev, fieldId]
        );
    };

    const addFilter = () => {
        setFilters([...filters, {
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

    const removeFilter = (index) => {
        setFilters(filters.filter((_, i) => i !== index));
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

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Report Designer</h1>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded mb-4">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 text-green-600 p-4 rounded mb-4">
                    {success}
                </div>
            )}

            <div className="mb-4">
                <label className="block mb-1 font-medium">Select Form</label>
                <select
                    value={selectedFormId}
                    onChange={handleFormChange}
                    className="w-full border p-2 rounded"
                >
                    <option value="">-- Choose a form --</option>
                    {Array.isArray(forms) && forms.map(form => (
                        <option key={form.id} value={form.id}>{form.name}</option>
                    ))}
                </select>
            </div>

            {fields.length > 0 && (
                <>
                    <div className="mb-6 bg-white p-4 border rounded">
                        <label className="block mb-3 font-semibold">Select Fields to Include</label>
                        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2">
                            {fields.map(field => (
                                <label key={field.id} className="flex items-center p-1 hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        value={field.id}
                                        checked={selectedFields.includes(field.id)}
                                        onChange={() => toggleField(field.id)}
                                        className="mr-2"
                                    />
                                    <div>
                                        <span>{field.label}</span>
                                        <span className="text-xs text-gray-500 ml-2">({field.type})</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <CalculatedFieldsEditor
                        calculatedFields={calculatedFields}
                        setCalculatedFields={setCalculatedFields}
                        selectedFields={selectedFields}
                        fields={fields}
                    />

                    <div className="mb-6 bg-white p-4 border rounded">
                        <h3 className="font-semibold mb-3">Filters</h3>
                        {filters.length === 0 && (
                            <p className="text-gray-500 italic mb-2">No filters added yet</p>
                        )}

                        {filters.map((filter, index) => (
                            <div key={index} className="flex gap-2 mb-3 items-center">
                                <select
                                    value={filter.field}
                                    onChange={(e) => updateFilter(index, "field", e.target.value)}
                                    className="border p-2 rounded w-1/3"
                                >
                                    <option value="">Select Field</option>
                                    {fields.map(field => (
                                        <option key={field.id} value={field.id}>{field.label}</option>
                                    ))}
                                </select>

                                <select
                                    value={filter.condition}
                                    onChange={(e) => updateFilter(index, "condition", e.target.value)}
                                    className="border p-2 rounded w-1/4"
                                >
                                    <option value="">Condition</option>
                                    <option value="equals">Equals</option>
                                    <option value="notEquals">Not Equals</option>
                                    <option value="contains">Contains</option>
                                    <option value="notContains">Not Contains</option>
                                    <option value="startsWith">Starts With</option>
                                    <option value="endsWith">Ends With</option>
                                    <option value="greaterThan">Greater Than</option>
                                    <option value="greaterThanEqual">Greater Than or Equal</option>
                                    <option value="lessThan">Less Than</option>
                                    <option value="lessThanEqual">Less Than or Equal</option>
                                    {(filter.type === "date" || filter.type === "datetime") && (
                                        <option value="between">Between</option>
                                    )}
                                </select>

                                {filter.condition === "between" &&
                                    (filter.type === "date" || filter.type === "datetime") ? (
                                    <div className="flex gap-1 w-1/3">
                                        <span className="text-xs text-gray-500">
                                            Date range will be set by the user at runtime
                                        </span>
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        placeholder="Default Value (optional)"
                                        value={filter.value}
                                        onChange={(e) => updateFilter(index, "value", e.target.value)}
                                        className="border p-2 rounded w-1/4"
                                    />
                                )}

                                <button
                                    onClick={() => removeFilter(index)}
                                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                                    title="Remove filter"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}

                        <button
                            onClick={addFilter}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                        >
                            + Add Filter
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-white p-4 border rounded">
                            <label className="block mb-1 font-medium">Template Name</label>
                            <input
                                type="text"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                className="w-full border p-2 rounded"
                                placeholder="Give your report template a name"
                            />
                        </div>

                        <div className="bg-white p-4 border rounded">
                            <h3 className="font-medium mb-3">Options</h3>

                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={options.includeApprovals}
                                        onChange={(e) => setOptions({
                                            ...options,
                                            includeApprovals: e.target.checked
                                        })}
                                        className="mr-2"
                                    />
                                    Include Approvals
                                </label>

                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={options.includeRemarks}
                                        onChange={(e) => setOptions({
                                            ...options,
                                            includeRemarks: e.target.checked
                                        })}
                                        className="mr-2"
                                    />
                                    Include Remarks
                                </label>

                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={options.isShared}
                                        onChange={(e) => setOptions({
                                            ...options,
                                            isShared: e.target.checked
                                        })}
                                        className="mr-2"
                                    />
                                    Share with other roles
                                </label>

                                {options.isShared && (
                                    <div className="ml-6 mt-2">
                                        <label className="block text-sm mb-1">Select roles:</label>
                                        <select
                                            multiple
                                            className="w-full border p-2 rounded h-24"
                                            value={options.sharedWithRoles}
                                            onChange={(e) => {
                                                const selected = Array.from(
                                                    e.target.selectedOptions,
                                                    option => option.value
                                                );
                                                setOptions({
                                                    ...options,
                                                    sharedWithRoles: selected
                                                });
                                            }}
                                        >
                                            {availableRoles.map(role => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Hold Ctrl/Cmd to select multiple roles
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={saveTemplate}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
                        >
                            Save Template
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}