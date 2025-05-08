import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "./Layout";
import axios from "axios"

export default function ReportDesigner() {
    const [forms, setForms] = useState([]);
    const [selectedFormId, setSelectedFormId] = useState("");
    const [fields, setFields] = useState([]);
    const [selectedFields, setSelectedFields] = useState([]);
    const [templateName, setTemplateName] = useState("");
    const [filters, setFilters] = useState([]);
    const [options, setOptions] = useState({ includeApprovals: false, includeRemarks: false });
    const [calculatedFields, setCalculatedFields] = useState([]);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUserData = localStorage.getItem("user");
        if (storedUserData && storedUserData !== "undefined") {
            const storedUser = JSON.parse(storedUserData);
            const names = [storedUser.username, ...storedUser.groups]; // Combine user + groups
            setUser(names);
        } else {
            navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
        }
    }, [navigate, location]);  // <-- Add navigate and location here


    useEffect(() => {
        const fetchForms = async () => {
            if (!user) return;  // wait until user is loaded

            try {
                const response = await fetch(`http://localhost:5182/api/forms/GetALLForm`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(user)
                });

                const data = await response.json();
                setForms(data);
            } catch (err) {
                setError(err.message || "Failed to load forms");
            }
        };

        fetchForms();
    }, [user]);  // <-- run when user is set

    const handleFormChange = async (e) => {
        const formId = e.target.value;
        setSelectedFormId(formId);
        const res = await axios.get(`http://localhost:5182/api/forms/${formId}/fields`);

        const expandedFields = [];
        res.data.forEach((field) => {
            if (field.columnJson) {
                try {
                    const columns = JSON.parse(field.columnJson);
                    columns.forEach((col) => {
                        expandedFields.push({
                            id: `${field.id}:${col.id}`,
                            label: `${field.label} → ${col.name}`
                        });
                    });
                } catch (err) {
                    console.error("Invalid columnJson in field:", field.label);
                }
            } else {
                expandedFields.push({ id: field.id, label: field.label });
            }
        });

        setFields(expandedFields);
        setSelectedFields([]);
        setFilters([]);
        setCalculatedFields([]);
    };


    const toggleField = (fieldId) => {
        setSelectedFields(prev =>
            prev.includes(fieldId) ? prev.filter(f => f !== fieldId) : [...prev, fieldId]
        );
    };

    const addFilter = () => {
        setFilters([...filters, { field: "", condition: "", value: "" }]);
    };

    const updateFilter = (index, key, value) => {
        const updated = [...filters];
        updated[index][key] = value;
        setFilters(updated);
    };

    const removeFilter = (index) => {
        setFilters(filters.filter((_, i) => i !== index));
    };

    const addCalculation = () => {
        setCalculatedFields([...calculatedFields, { label: "", formula: "" }]);
    };

    const updateCalculation = (index, key, value) => {
        const updated = [...calculatedFields];
        updated[index][key] = value;
        setCalculatedFields(updated);
    };

    const removeCalculation = (index) => {
        setCalculatedFields(calculatedFields.filter((_, i) => i !== index));
    };

    const saveTemplate = async () => {
        if (!templateName || selectedFields.length === 0) {
            return alert("Please enter a template name and select fields.");
        }
        const payload = {
            formId: selectedFormId,
            name: templateName,
            fields: selectedFields,
            filters,
            options,
            calculations: calculatedFields
        };
        try {
            await axios.post("/api/reportTemplates/save", payload);
            alert("Template saved successfully!");
        } catch (error) {
            alert("Failed to save template");
        }
    };

    return (
        <Layout>
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Report Designer</h1>

            <div className="mb-4">
                <label className="block mb-1">Select Form</label>
                <select value={selectedFormId} onChange={handleFormChange} className="w-full border p-2 rounded">
                    <option value="">-- Choose a form --</option>
                    {forms.map(form => (
                        <option key={form.id} value={form.id}>{form.name}</option>
                    ))}
                </select>
            </div>

            {fields.length > 0 && (
                <>
                    <div className="mb-4">
                        <label className="block mb-1 font-semibold">Select Fields to Include</label>
                        <div className="grid grid-cols-2 gap-2">
                            {fields.map(field => (
                                <label key={field.id} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        value={field.id}
                                        checked={selectedFields.includes(field.id)}
                                        onChange={() => toggleField(field.id)}
                                        className="mr-2"
                                    />
                                    {field.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="font-semibold mb-2">Add Calculated Fields</h3>
                        {calculatedFields.map((calc, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    placeholder="Label"
                                    value={calc.label}
                                    onChange={(e) => updateCalculation(index, "label", e.target.value)}
                                    className="border p-2 rounded w-1/3"
                                />
                                <input
                                    type="text"
                                    placeholder="Formula (e.g., {field1} + {field2})"
                                    value={calc.formula}
                                    onChange={(e) => updateCalculation(index, "formula", e.target.value)}
                                    className="border p-2 rounded w-2/3"
                                />
                                <button
                                    onClick={() => removeCalculation(index)}
                                    className="bg-red-500 text-white px-2 py-1 rounded"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        <button onClick={addCalculation} className="bg-blue-500 text-white px-4 py-2 rounded">
                            + Add Calculation
                        </button>
                    </div>

                    <div className="mb-4">
                        <h3 className="font-semibold mb-2">Filters</h3>
                        {filters.map((filter, index) => (
                            <div key={index} className="flex gap-2 mb-2 items-center">
                                <input
                                    type="text"
                                    placeholder="Field"
                                    value={filter.field}
                                    onChange={(e) => updateFilter(index, "field", e.target.value)}
                                    className="border p-2 rounded w-1/4"
                                />
                                <select
                                    value={filter.condition}
                                    onChange={(e) => updateFilter(index, "condition", e.target.value)}
                                    className="border p-2 rounded w-1/4"
                                >
                                    <option value="">Condition</option>
                                    <option value="equals">Equals</option>
                                    <option value="contains">Contains</option>
                                    <option value=">">Greater Than</option>
                                    <option value="<">Less Than</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Value"
                                    value={filter.value}
                                    onChange={(e) => updateFilter(index, "value", e.target.value)}
                                    className="border p-2 rounded w-1/4"
                                />
                                <button
                                    onClick={() => removeFilter(index)}
                                    className="bg-red-500 text-white px-2 py-1 rounded"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        <button onClick={addFilter} className="bg-gray-500 text-white px-4 py-2 rounded">
                            + Add Filter
                        </button>
                    </div>

                    <div className="mb-4">
                        <label className="block mb-1">Template Name</label>
                        <input
                            type="text"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            className="w-full border p-2 rounded"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="inline-flex items-center mr-4">
                            <input
                                type="checkbox"
                                checked={options.includeApprovals}
                                onChange={(e) => setOptions({ ...options, includeApprovals: e.target.checked })}
                                className="mr-2"
                            />
                            Include Approvals
                        </label>
                        <label className="inline-flex items-center">
                            <input
                                type="checkbox"
                                checked={options.includeRemarks}
                                onChange={(e) => setOptions({ ...options, includeRemarks: e.target.checked })}
                                className="mr-2"
                            />
                            Include Remarks
                        </label>
                    </div>

                    <button
                        onClick={saveTemplate}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
                    >
                        Save Template
                    </button>
                </>
            )}
            </div>
        </Layout>
    );
}
