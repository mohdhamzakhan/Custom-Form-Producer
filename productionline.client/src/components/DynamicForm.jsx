import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useParams } from "react-router-dom";
import { APP_CONSTANTS } from "./store";

export default function DynamicForm() {
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formValues, setFormValues] = useState({});
    const [remarks, setRemarks] = useState({});
    const [formErrors, setFormErrors] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [recentSubmissions, setRecentSubmissions] = useState([]);
    const [editingSubmissionId, setEditingSubmissionId] = useState(null);
    const [fontSize, setFontSize] = useState(16); // default 16px

    const { formId } = useParams();


    useEffect(() => {
        // In a real application, this would be an actual API call
        const fetchFormData = async () => {
            try {
                // Simulating API response - replace with actual fetch in production
                const response = await fetch(
                    `${APP_CONSTANTS.API_BASE_URL}/api/forms/link/${formId}`
                );
                if (!response.ok) throw new Error("Failed to fetch form data");
                const data = await response.json();
                console.log(data)

                data.fields.forEach(field => {
                    // Fix column → columns for grid fields
                    if (field.type === "grid" && !field.columns && field.column) {
                        field.columns = field.column;
                    }
                    field.columns = (field.columns || []).map(col => ({
                        ...col,
                        dependentOptions: col.dependentOptions || {}
                    }));
                });
                // Using mock data for demonstration

                setFormData(data);

                // Initialize form values and remarks based on field types
                const initialValues = {};
                const initialRemarks = {};

                data.fields.forEach((field) => {
                    if (field.type === "checkbox") {
                        initialValues[field.id] = [];
                    } else if (field.type === "radio") {
                        initialValues[field.id] = "";
                    } else if (field.type === "numeric") {
                        initialValues[field.id] = "";
                    } else if (field.type === "date") {
                        initialValues[field.id] = "";
                    } else if (field.type === "dropdown") {
                        initialValues[field.id] = "";
                    } else if (field.type === "grid") {
                        // Ensure columns is properly set
                        field.columns = field.columns || [];

                        // Initialize grid with empty rows
                        const rowCount = field.initialRows || 3;
                        const rows = [];

                        for (let i = 0; i < rowCount; i++) {
                            const row = {};
                            field.columns.forEach(col => {
                                row[col.name] = "";
                            });
                            rows.push(row);
                        }

                        initialValues[field.id] = rows;
                    }
                });

                setFormValues(initialValues);
                setRemarks(initialRemarks);
                setLoading(false);

                await fetchRecentSubmissions();

            } catch (err) {
                setError(err.message || "Failed to fetch form data");
                setLoading(false);
            }
        };

        fetchFormData();
    }, []);

    useEffect(() => {
        if (!formData) return;

        const updatedValues = { ...formValues };
        let changed = false;

        formData.fields.forEach((field) => {
            if (field.type === "calculation") {
                const result = evaluateFormula(field.formula);
                if (formValues[field.id] !== result) {
                    updatedValues[field.id] = result;
                    changed = true;
                }
            }
        });

        if (changed) {
            setFormValues(updatedValues);
        }
    }, [formData]);
    // Add this useEffect to handle automatic linked data loading
    useEffect(() => {
        const loadLinkedDataAutomatically = async () => {
            if (!formData?.keyFieldMappings?.length) return;

            // Check if all key fields have values
            const keyValues = {};
            let hasAllKeyValues = true;

            formData.keyFieldMappings.forEach(mapping => {
                const currentValue = formValues[mapping.currentFormField];
                if (!currentValue) {
                    hasAllKeyValues = false;
                    return;
                }
                keyValues[mapping.currentFormField] = currentValue;
            });

            if (hasAllKeyValues) {
                const linkedSubmissions = await fetchLinkedData(formData.keyFieldMappings);
                if (linkedSubmissions) {
                    const matchingSubmission = findMatchingSubmission(linkedSubmissions, keyValues, formData.keyFieldMappings);

                    if (matchingSubmission) {
                        // Auto-populate all linked fields
                        const updatedValues = { ...formValues };

                        formData.fields.forEach(field => {
                            if (field.type === "linkedTextbox" && field.linkedFieldId) {
                                const linkedValue = extractLinkedFieldValue(matchingSubmission, field.linkedFieldId);
                                updatedValues[field.id] = linkedValue || "";
                            }
                        });

                        setFormValues(updatedValues);
                    }
                }
            }
        };

        loadLinkedDataAutomatically();
    }, [formValues, formData]); // Trigger when form values change


    // Update handleGridChange to clear dependent values
    const handleGridChange = (fieldId, rowIndex, columnName, value, entireRow = null) => {
        setFormValues(prev => {
            const updatedRows = [...(prev[fieldId] || [])];
            const field = formData.fields.find(f => f.id === fieldId);

            if (entireRow) {
                updatedRows[rowIndex] = entireRow;
            } else {
                updatedRows[rowIndex] = {
                    ...updatedRows[rowIndex],
                    [columnName]: value
                };

                // Clear dependent fields when parent changes
                if (field) {
                    field.columns.forEach(col => {
                        if (col.type === "dependentDropdown" && col.parentColumn === columnName) {
                            updatedRows[rowIndex][col.name] = "";
                        }
                    });
                }
            }

            return { ...prev, [fieldId]: updatedRows };
        });
    };


    // Check if a remark is required for the current field value
    const needsRemark = (field, value) => {
        if (!field.requireRemarks || field.requireRemarks.length === 0) {
            return false;
        }

        if (field.type === "checkbox") {
            return (
                Array.isArray(value) &&
                value.some((val) => field.requireRemarks.includes(val))
            );
        } else {
            return field.requireRemarks.includes(value);
        }
    };

    const handleEditSubmission = async (submissionId) => {
        setIsModalOpen(false);
        setEditingSubmissionId(submissionId);

        try {
            const res = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/submissions/${submissionId}`);
            if (!res.ok) throw new Error("Failed to load submission");

            const json = await res.json();

            const submission = json.submission;
            const submissionData = submission.submissionData;
            const formDefinition = json.formDefinition;

            // Optional: update form structure if needed
            setFormData(formDefinition);

            const updatedValues = {};
            const updatedRemarks = {};

            for (const item of submissionData) {
                if (item.fieldLabel.endsWith("(Remark)")) {
                    const baseLabel = item.fieldLabel.replace(" (Remark)", "");
                    updatedRemarks[baseLabel] = item.fieldValue;
                } else {
                    updatedValues[item.fieldLabel] = parseFieldValue(item.fieldLabel, item.fieldValue);
                }
            }

            setFormValues(updatedValues);
            setRemarks(updatedRemarks);
        } catch (err) {
            console.error("Error loading submission:", err);
            alert("Failed to load submission for editing.");
        }
    };

    const parseFieldValue = (fieldId, rawValue) => {
        const field = formData?.fields?.find(f => f.id === fieldId);
        if (!field) return rawValue;

        if (field.type === "checkbox") {
            return rawValue.split(",").map(s => s.trim());
        }

        if (field.type === "grid") {
            try {
                return JSON.parse(rawValue);
            } catch {
                return [];
            }
        }

        if (field.type === "numeric") {
            return rawValue === "" ? "" : parseFloat(rawValue);
        }

        return rawValue;
    };

    // Fetch recent submissions
    const fetchRecentSubmissions = async () => {
        const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/${formId}/lastsubmissions`);
        if (!response.ok) throw new Error("Failed to fetch submissions");
        const submissions = await response.json();
        console.log(submissions)
        setRecentSubmissions(submissions.slice(0, 10)); // Take only last 10
    };

    // Check if a remark should be triggered based on numeric value
    const checkRemarkTriggers = (field, value) => {
        if (!field.remarkTriggers || field.remarkTriggers.length === 0)
            return false;

        const numValue = parseFloat(value);
        if (isNaN(numValue)) return false;

        return field.remarkTriggers.some((trigger) => {
            switch (trigger.operator) {
                case ">":
                    return numValue > trigger.value;
                case "<":
                    return numValue < trigger.value;
                case ">=":
                    return numValue >= trigger.value;
                case "<=":
                    return numValue <= trigger.value;
                case "=":
                case "==":
                    return numValue === trigger.value;
                default:
                    return false;
            }
        });
    };

    // Handle input change for text and numeric fields
    const handleInputChange = (fieldId, value, fieldType, field) => {
        // For numeric fields, validate and format the input
        if (fieldType === "numeric") {
            // Allow empty values for now (required validation happens on submit)
            if (value === "") {
                setFormValues((prev) => ({ ...prev, [fieldId]: value }));

                // Clear errors when field is emptied
                setFormErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[fieldId];
                    delete newErrors[`${fieldId}_remark`];
                    return newErrors;
                });

                return;
            }

            const numValue = parseFloat(value);

            // Validate min/max if specified
            if (!isNaN(numValue)) {
                if (field.min !== null && numValue < field.min) {
                    setFormErrors((prev) => ({
                        ...prev,
                        [fieldId]: `Value must be at least ${field.min}`,
                    }));
                } else if (field.max !== null && numValue > field.max) {
                    setFormErrors((prev) => ({
                        ...prev,
                        [fieldId]: `Value must be at most ${field.max}`,
                    }));
                } else {
                    // Clear validation errors if value is valid
                    setFormErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors[fieldId];
                        return newErrors;
                    });
                }

                // For non-decimal fields, ensure the value is an integer
                if (field.isDecimal === false && !Number.isInteger(numValue)) {
                    value = Math.floor(numValue); // Force integer value
                }
            }
        }

        setFormValues((prev) => ({
            ...prev,
            [fieldId]: value,
        }));

        // Check if remark is needed based on the new value
        if (fieldType === "numeric" && checkRemarkTriggers(field, value)) {
            if (!remarks[fieldId] || remarks[fieldId].trim() === "") {
                setFormErrors((prev) => ({
                    ...prev,
                    [`${fieldId}_remark`]: "Remark is required for this value",
                }));
            }
        } else if (
            (fieldType === "dropdown" || fieldType === "radio") &&
            needsRemark(field, value)
        ) {
            if (!remarks[fieldId] || remarks[fieldId].trim() === "") {
                setFormErrors((prev) => ({
                    ...prev,
                    [`${fieldId}_remark`]: "Remark is required for this selection",
                }));
            }
        }
    };

    // Handle checkbox change
    const handleCheckboxChange = (fieldId, option, field) => {
        setFormValues((prev) => {
            const currentValues = [...(prev[fieldId] || [])];
            const newValues = currentValues.includes(option)
                ? currentValues.filter((val) => val !== option)
                : [...currentValues, option];

            // Check if remark is needed based on the new selection
            if (needsRemark(field, newValues)) {
                if (!remarks[fieldId] || remarks[fieldId].trim() === "") {
                    setFormErrors((prev) => ({
                        ...prev,
                        [`${fieldId}_remark`]: "Remark is required for selected option(s)",
                    }));
                }
            } else {
                // Clear remark error if no longer needed
                setFormErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[`${fieldId}_remark`];
                    return newErrors;
                });
            }

            return {
                ...prev,
                [fieldId]: newValues,
            };
        });

        // Clear field error
        setFormErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[fieldId];
            return newErrors;
        });
    };

    // Handle radio button change
    const handleRadioChange = (fieldId, option, field) => {
        setFormValues((prev) => ({
            ...prev,
            [fieldId]: option,
        }));

        // Clear field error
        setFormErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[fieldId];
            return newErrors;
        });

        // Check if remark is needed based on the selection
        if (field.requireRemarks && field.requireRemarks.includes(option)) {
            if (!remarks[fieldId] || remarks[fieldId].trim() === "") {
                setFormErrors((prev) => ({
                    ...prev,
                    [`${fieldId}_remark`]: "Remark is required for this selection",
                }));
            }
        } else {
            // Clear remark error if no longer needed
            setFormErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[`${fieldId}_remark`];
                return newErrors;
            });
        }
    };

    // Handle remark change
    const handleRemarkChange = (fieldId) => (e) => {
        const value = e.target.value;
        setRemarks((prev) => ({
            ...prev,
            [fieldId]: value,
        }));

        // Clear remark error if value is provided
        if (value.trim()) {
            setFormErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[`${fieldId}_remark`];
                return newErrors;
            });
        }
    };

    function validateRows(rows, columns) {
        for (const row of rows) {
            for (const col of columns) {
                if (
                    col.type === "dropdown" &&
                    col.remarksOptions?.includes(row[col.name]) &&
                    !row[`${col.name}_remarks`]
                ) {
                    return { valid: false, message: `Remarks required for ${col.name}` };
                }
            }
        }
        return { valid: true };
    }


    const evaluateFormula = (formula) => {
        console.log(formula)
        if (!formula) return "";
        try {
            let expression = formula;
            formData.fields.forEach((field) => {
                const value = parseFloat(formValues[field.id]) || 0;

                // Replace by both ID and label (label fallback is optional)
                expression = expression.replaceAll(`{${field.id}}`, value);
                expression = expression.replaceAll(`{${field.label}}`, value);
            });

            return eval(expression); // ⚠️ evaluated as JavaScript math
        } catch (error) {
            console.error("Formula evaluation error:", error);
            return "";
        }
    };

    // Validate the form
    const validateForm = () => {
        const errors = {};
        if (!formData) return errors;

        formData.fields.forEach((field) => {
            const value = formValues[field.id];

            // General required field validation
            if (field.required) {
                if (field.type === "checkbox" && (!Array.isArray(value) || value.length === 0)) {
                    errors[field.id] = `${field.label} is required`;
                } else if (field.type === "radio" && (!value || value.trim() === "")) {
                    errors[field.id] = `${field.label} is required`;
                } else if ((field.type === "dropdown" || field.type === "textbox") && (!value || value.trim() === "")) {
                    errors[field.id] = `${field.label} is required`;
                } else if (field.type === "numeric" && value === "") {
                    errors[field.id] = `${field.label} is required`;
                } else if (field.type === "date" && !value) {
                    errors[field.id] = `${field.label} is required`;
                }
            }

            // Grid column-level required validation
            if (field.type === "grid" && field.columns?.length > 0) {
                const rows = formValues[field.id] || [];
                rows.forEach((row, rowIndex) => {
                    field.columns.forEach((col) => {
                        if (col.required && (!row[col.name] || row[col.name].toString().trim() === "")) {
                            const errorKey = `${field.id}_${rowIndex}_${col.name}`;
                            errors[errorKey] = `${col.label || col.name} is required in row ${rowIndex + 1}`;
                        }
                    });
                });
            }

            // Numeric constraints
            if (field.type === "numeric" && value !== "") {
                const numValue = parseFloat(value);
                if (isNaN(numValue)) {
                    errors[field.id] = "Please enter a valid number";
                } else {
                    if (field.isDecimal === false && !Number.isInteger(numValue)) {
                        errors[field.id] = "Please enter a whole number";
                    }
                    if (field.min !== null && numValue < field.min) {
                        errors[field.id] = `Value must be at least ${field.min}`;
                    }
                    if (field.max !== null && numValue > field.max) {
                        errors[field.id] = `Value must be at most ${field.max}`;
                    }
                }
            }

            // Remarks validation (as already handled)
            if (checkRemarkTriggers(field, value) && (!remarks[field.id] || remarks[field.id].trim() === "")) {
                errors[`${field.id}_remark`] = "Remark is required for this value";
            }
            if (needsRemark(field, value) && (!remarks[field.id] || remarks[field.id].trim() === "")) {
                errors[`${field.id}_remark`] = "Remark is required for selected option(s)";
            }
        });

        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationErrors = validateForm();
        setFormErrors(validationErrors);
        setSubmitted(true);

        if (Object.keys(validationErrors).length === 0) {
            const submissionData = {
                formId: formData.id,
                submissionId: editingSubmissionId, // 👈 include if editing
                submissionData: []
            };

            // Find and collect form fields by type from formData
            const fieldTypes = {};
            formData.fields.forEach(field => {
                fieldTypes[field.id] = field.type;
            });

            Object.keys(formValues).forEach((fieldId) => {
                let fieldValue = formValues[fieldId];
                const fieldType = fieldTypes[fieldId];

                if (fieldType === 'grid' && Array.isArray(fieldValue)) {
                    // For grid fields, convert the array of row objects to JSON string
                    fieldValue = JSON.stringify(fieldValue);
                } else if (Array.isArray(fieldValue)) {
                    // For checkbox groups, join the selected values
                    fieldValue = fieldValue.join(', ');
                }

                // Handle different field types
                if (Array.isArray(fieldValue)) {
                    // For checkbox groups, join the selected values
                    fieldValue = fieldValue.join(', ');
                } else if (fieldTypes[fieldId] === 'date' && fieldValue) {
                    // Format date values to ISO string for backend storage
                    fieldValue = new Date(fieldValue).toISOString();
                } else if (fieldValue === null || fieldValue === undefined) {
                    // Handle null/undefined values
                    fieldValue = "";
                } else {
                    // Convert all other values to string
                    fieldValue = String(fieldValue);
                }

                submissionData.submissionData.push({
                    fieldLabel: fieldId,
                    fieldValue: fieldValue
                });

                // Add remarks as separate entries if present
                if (remarks[fieldId] && remarks[fieldId].trim() !== "") {
                    submissionData.submissionData.push({
                        fieldLabel: `${fieldId} (Remark)`,
                        fieldValue: remarks[fieldId]
                    });
                }
            });

            try {
                console.log("Submitting JSON:", JSON.stringify(submissionData, null, 2));

                const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/${formData.id}/submit`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(submissionData),
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log("Form submitted successfully:", result);
                    alert("Form submitted successfully!");

                    // Optional: Reset form or redirect
                    resetForm(); // You would need to implement this function
                    // Or redirect: window.location.href = "/success";
                } else {
                    const errorText = await response.text();
                    console.error("Submission failed:", errorText);
                    alert("Error submitting form: " + errorText);
                }
            } catch (error) {
                console.error("Request failed:", error);
                alert("Network error. Please try again.");
            }
        }
    };

    const resetForm = () => {
        if (!formData) return;

        const initialValues = {};
        const initialRemarks = {};

        formData.fields.forEach((field) => {
            if (field.type === "checkbox") {
                initialValues[field.id] = [];
            } else if (field.type === "radio" || field.type === "dropdown") {
                initialValues[field.id] = "";
            } else if (field.type === "numeric" || field.type === "textbox" || field.type === "date") {
                initialValues[field.id] = "";
            } else if (field.type === "grid") {
                const rows = [];
                const rowCount = field.initialRows || 3;
                for (let i = 0; i < rowCount; i++) {
                    const row = {};
                    (field.columns || []).forEach((col) => {
                        row[col.name] = "";
                    });
                    rows.push(row);
                }
                initialValues[field.id] = rows;
            }
        });

        setFormValues(initialValues);
        setRemarks(initialRemarks);
        setFormErrors({});
        setSubmitted(false);
        setEditingSubmissionId(null);
    };

    const getDayName = (date) => {
        if (!date) return "";
        return date.toLocaleDateString(undefined, { weekday: "long" });
    };

    const fetchLinkedData = async (keyMappings) => {
        if (!formData.linkedFormId || !keyMappings.length) return null;

        try {
            const response = await fetch(
                `${APP_CONSTANTS.API_BASE_URL}/api/forms/linked-data/${formData.linkedFormId}?keyMappings=${encodeURIComponent(JSON.stringify(keyMappings))}`
            );

            if (!response.ok) throw new Error("Failed to fetch linked data");

            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error("Error fetching linked data:", error);
            return null;
        }
    };

    const handleLookupLinkedData = async (field) => {
        if (!formData.keyFieldMappings || !formData.keyFieldMappings.length) {
            alert("No key field mappings configured for this form");
            return;
        }

        // Get current form values for key fields
        const keyValues = {};
        let hasAllKeyValues = true;

        formData.keyFieldMappings.forEach(mapping => {
            const currentValue = formValues[mapping.currentFormField];
            if (!currentValue) {
                hasAllKeyValues = false;
                return;
            }
            keyValues[mapping.currentFormField] = currentValue;
        });

        if (!hasAllKeyValues) {
            alert("Please fill in all key fields before looking up linked data");
            return;
        }

        // Fetch linked data
        const linkedSubmissions = await fetchLinkedData(formData.keyFieldMappings);
        if (!linkedSubmissions || !linkedSubmissions.length) {
            alert("No matching linked data found");
            return;
        }

        // Find matching submission based on key mappings
        const matchingSubmission = findMatchingSubmission(linkedSubmissions, keyValues, formData.keyFieldMappings);

        if (matchingSubmission) {
            // Extract the specific field value
            const linkedFieldValue = extractLinkedFieldValue(matchingSubmission, field.linkedFieldId);

            setFormValues(prev => ({
                ...prev,
                [field.id]: linkedFieldValue || ""
            }));

            alert("Linked data loaded successfully!");
        } else {
            alert("No matching record found in linked form");
        }
    };

    const findMatchingSubmission = (submissions, keyValues, keyMappings) => {
        return submissions.find(submission => {
            return keyMappings.every(mapping => {
                const currentValue = keyValues[mapping.currentFormField];
                const linkedField = mapping.linkedFormField;

                // Handle grid column references
                if (linkedField.includes('.')) {
                    const [gridFieldId, columnId] = linkedField.split('.');
                    const gridData = submission.submissionData.find(sd => sd.fieldLabel === gridFieldId);
                    if (gridData) {
                        try {
                            const gridRows = JSON.parse(gridData.fieldValue);
                            const columnName = getColumnNameById(columnId); // You'll need to implement this
                            return gridRows.some(row => row[columnName] === currentValue);
                        } catch (e) {
                            return false;
                        }
                    }
                    return false;
                } else {
                    // Regular field
                    const linkedData = submission.submissionData.find(sd => sd.fieldLabel === linkedField);
                    return linkedData && linkedData.fieldValue === currentValue;
                }
            });
        });
    };

    // Helper function to extract linked field value
    const extractLinkedFieldValue = (submission, linkedFieldId) => {
        if (!linkedFieldId) return "";

        // Handle grid column references
        if (linkedFieldId.includes('.')) {
            const [gridFieldId, columnId] = linkedFieldId.split('.');
            const gridData = submission.submissionData.find(sd => sd.fieldLabel === gridFieldId);
            if (gridData) {
                try {
                    const gridRows = JSON.parse(gridData.fieldValue);
                    const columnName = getColumnNameById(columnId);
                    // Return the first matching row's value or combine multiple rows
                    const values = gridRows.map(row => row[columnName]).filter(Boolean);
                    return values.join(', ');
                } catch (e) {
                    return "";
                }
            }
            return "";
        } else {
            // Regular field
            const linkedData = submission.submissionData.find(sd => sd.fieldLabel === linkedFieldId);
            return linkedData ? linkedData.fieldValue : "";
        }
    };

    // Helper function to get column name by ID (you'll need to implement this based on your form structure)
    const getColumnNameById = (columnId) => {
        // This should look up the column name from the linked form's field definition
        // For now, return the columnId as fallback
        return columnId;
    };

    // Render different field types
    const renderField = (field) => {
        switch (field.type) {
            case "checkbox":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}{" "}
                            {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <div className="mt-2">
                            {field.options.map((option) => (
                                <div key={option} className="flex items-center mb-2">
                                    <input
                                        id={`${field.id}-${option}`}
                                        type="checkbox"
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        checked={(formValues[field.id] || []).includes(option)}
                                        onChange={() =>
                                            handleCheckboxChange(field.id, option, field)
                                        }
                                    />
                                    <label
                                        htmlFor={`${field.id}-${option}`}
                                        className="ml-2 block text-sm text-gray-700"
                                    >
                                        {option}
                                    </label>
                                </div>
                            ))}
                        </div>
                        {formErrors[field.id] && (
                            <p className="text-red-500 text-xs mt-1">
                                {formErrors[field.id]}
                            </p>
                        )}

                        {/* Render remark field if needed */}
                        {needsRemark(field, formValues[field.id] || []) && (
                            <div className="mt-2">
                                <label className="block text-gray-700 text-sm font-bold mb-2">
                                    Remarks{" "}
                                    {field.requireRemarks && (
                                        <span className="text-red-500">*</span>
                                    )}
                                </label>
                                <textarea
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={remarks[field.id] || ""}
                                    onChange={handleRemarkChange(field.id)}
                                    placeholder="Enter remarks"
                                    rows={1}
                                />
                                {formErrors[`${field.id}_remark`] && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {formErrors[`${field.id}_remark`]}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                );

            case "numeric":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}{" "}
                            {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                            type="number"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={formValues[field.id] || ""}
                            onChange={(e) =>
                                handleInputChange(field.id, e.target.value, field.type, field)
                            }
                            placeholder={`Enter ${field.label}`}
                            min={field.min !== null ? field.min : undefined}
                            max={field.max !== null ? field.max : undefined}
                            step={field.isDecimal === false ? "1" : "any"}
                        />
                        {(field.min !== null || field.max !== null) && (
                            <p className="text-xs text-gray-500 mt-1">
                                {field.isDecimal === false ? "Whole number" : "Decimal number"}
                                {field.min !== null && field.max !== null
                                    ? ` between ${field.min} and ${field.max}`
                                    : field.min !== null
                                        ? ` (min: ${field.min})`
                                        : field.max !== null
                                            ? ` (max: ${field.max})`
                                            : ""}
                            </p>
                        )}
                        {formErrors[field.id] && (
                            <p className="text-red-500 text-xs mt-1">
                                {formErrors[field.id]}
                            </p>
                        )}

                        {/* Show remark field if triggered */}
                        {checkRemarkTriggers(field, formValues[field.id]) && (
                            <div className="mt-2">
                                <label className="block text-gray-700 text-sm font-bold mb-2">
                                    Remarks <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={remarks[field.id] || ""}
                                    onChange={handleRemarkChange(field.id)}
                                    placeholder="Enter remarks"
                                    rows={1}
                                />
                                {formErrors[`${field.id}_remark`] && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {formErrors[`${field.id}_remark`]}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                );

            case "dropdown":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}{" "}
                            {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <select
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white"
                            value={formValues[field.id] || ""}
                            onChange={(e) =>
                                handleInputChange(field.id, e.target.value, field.type, field)
                            }
                        >
                            <option value="">Select {field.label}</option>
                            {field.options.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                        {formValues[field.id] && (
                            <div className="text-sm text-gray-600 mt-1">
                                You selected: <span className="font-semibold">{formValues[field.id]}</span>
                            </div>
                        )}

                        {formErrors[field.id] && (
                            <p className="text-red-500 text-xs mt-1">
                                {formErrors[field.id]}
                            </p>
                        )}

                        {/* Render remark field if needed */}
                        {needsRemark(field, formValues[field.id]) && (
                            <div className="mt-2">
                                <label className="block text-gray-700 text-sm font-bold mb-2">
                                    Remarks <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={remarks[field.id] || ""}
                                    onChange={handleRemarkChange(field.id)}
                                    placeholder="Enter remarks"
                                    rows={1}
                                />
                                {formErrors[`${field.id}_remark`] && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {formErrors[`${field.id}_remark`]}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                );

            case "textbox":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}{" "}
                            {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={formValues[field.id] || ""}
                            onChange={(e) =>
                                handleInputChange(field.id, e.target.value, field.type, field)
                            }
                            placeholder={`Enter ${field.label}`}
                            rows={1}
                        />
                        {formErrors[field.id] && (
                            <p className="text-red-500 text-xs mt-1">
                                {formErrors[field.id]}
                            </p>
                        )}
                    </div>
                );

            case "time":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}{" "}
                            {field.required && <span className="text-red-500">*</span>}
                        </label>

                        {/* Wrap timepicker and optional textbox in a vertical flex container */}
                        <div className="flex flex-col gap-1">
                            <input
                                type="time"
                                className="border p-2 w-full"
                                value={formValues[field.id] || ""}
                                onChange={(e) =>
                                    handleInputChange(field.id, e.target.value, field.type, field)
                                }
                            />
                        </div>

                        {formErrors[field.id] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[field.id]}</p>
                        )}
                    </div>
                );

            case "date":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}{" "}
                            {field.required && <span className="text-red-500">*</span>}
                        </label>

                        {/* Wrap datepicker and day textbox in a vertical flex container */}
                        <div className="flex flex-col gap-1">
                            <DatePicker
                                className="border p-2 w-full"
                                selected={formValues[field.id] || null}
                                onChange={(date) =>
                                    handleInputChange(field.id, date, field.type, field)
                                }
                                dateFormat="dd/MM/yyyy"
                                placeholderText="DD/MM/YYYY"
                            />

                            <input
                                type="text"
                                className="border p-1 w-24 text-center bg-gray-100 cursor-not-allowed text-sm"
                                value={getDayName(formValues[field.id])}
                                disabled
                                aria-label="Day of the week"
                            />
                        </div>

                        {formErrors[field.id] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[field.id]}</p>
                        )}
                    </div>
                );

            case "radio":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}{" "}
                            {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <div className="mt-2">
                            {field.options.map((option) => (
                                <div key={option} className="flex items-center mb-2">
                                    <input
                                        id={`${field.id}-${option}`}
                                        type="radio"
                                        name={field.id}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded-full focus:ring-blue-500"
                                        checked={formValues[field.id] === option}
                                        onChange={() => handleRadioChange(field.id, option, field)}
                                    />
                                    <label
                                        htmlFor={`${field.id}-${option}`}
                                        className="ml-2 block text-sm text-gray-700"
                                    >
                                        {option}
                                    </label>
                                </div>
                            ))}
                        </div>
                        {formErrors[field.id] && (
                            <p className="text-red-500 text-xs mt-1">
                                {formErrors[field.id]}
                            </p>
                        )}

                        {/* Render remark field if needed */}
                        {needsRemark(field, formValues[field.id]) && (
                            <div className="mt-2">
                                <label className="block text-gray-700 text-sm font-bold mb-2">
                                    Remarks{" "}
                                    {field.requireRemarks && (
                                        <span className="text-red-500">*</span>
                                    )}
                                </label>
                                <textarea
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={remarks[field.id] || ""}
                                    onChange={handleRemarkChange(field.id)}
                                    placeholder="Enter remarks"
                                    rows={1}
                                />
                                {formErrors[`${field.id}_remark`] && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {formErrors[`${field.id}_remark`]}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                );

            case "calculation":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">{field.label}</label>
                        <input
                            type="text"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 bg-gray-100 cursor-not-allowed"
                            value={evaluateFormula(field.formula)}  // 👈 Result is computed here
                            readOnly
                        />
                    </div>
                );

            case "grid":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">{field.label}</label>
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-300">
                                <thead>
                                    <tr>
                                        {(field.columns || []).map((col, idx) => (
                                            <th
                                                key={idx}
                                                className="py-2 px-4 border-b"
                                                style={{ width: col.width || "auto" }} 
                                            >
                                                {col.name}
                                            </th>
                                        ))}
                                        <th className="py-2 px-4 border-b" style={{ width: "100px" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(formValues[field.id] || []).map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {(field.columns || []).map((col, colIdx) => (
                                                <td
                                                    key={colIdx}
                                                    className="py-2 px-4 border-b"
                                                    style={{ width: col.width || "auto" }} 
                                                >
                                                    {(() => {
                                                        const style = {
                                                            color: col.textColor || "inherit",
                                                            backgroundColor: col.backgroundColor || "inherit",
                                                        };

                                                        if (col.type === "calculation") {
                                                            const calculatedValue = evaluateRowFormula(col.formula, row);
                                                            if (row[col.name] !== calculatedValue) {
                                                                row[col.name] = calculatedValue;
                                                            }
                                                            return (
                                                                <input
                                                                    type="text"
                                                                    value={calculatedValue}
                                                                    className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed"
                                                                    readOnly
                                                                    style={style}
                                                                />
                                                            );
                                                        }

                                                        if (col.type === "time") {
                                                            return (
                                                                <input
                                                                    type="time"
                                                                    value={row[col.name] || ""}
                                                                    onChange={(e) =>
                                                                        handleGridChange(field.id, rowIndex, col.name, e.target.value)
                                                                    }
                                                                    className="border rounded px-2 py-1 w-full"
                                                                    style={style}
                                                                />
                                                            );
                                                        }

                                                        if (col.type === "timecalculation") {
                                                            const formula = col.formula || "";
                                                            const matches = formula.match(/\{(.*?)\}/g);
                                                            let time1 = "", time2 = "", diff = "";

                                                            if (matches && matches.length === 2) {
                                                                time1 = row[matches[0].replace(/[{}]/g, "")] || "";
                                                                time2 = row[matches[1].replace(/[{}]/g, "")] || "";
                                                                diff = calculateTimeDifference(time1, time2);
                                                            }
                                                            if (row[col.name] !== diff) {
                                                                row[col.name] = diff;
                                                            }

                                                            return (
                                                                <input
                                                                    type="text"
                                                                    value={diff}
                                                                    readOnly
                                                                    className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed"
                                                                    style={style}
                                                                />
                                                            );
                                                        }

                                                        if (col.type === "dependentDropdown") {
                                                            const parentValue = row[col.parentColumn] || "";
                                                            const dependentOptions = parentValue ? (col.dependentOptions?.[parentValue] || []) : [];

                                                            return (
                                                                <div>
                                                                    <select
                                                                        value={row[col.name] || ""}
                                                                        onChange={(e) => {
                                                                            const newValue = e.target.value;
                                                                            const updatedRow = { ...row, [col.name]: newValue };
                                                                            handleGridChange(field.id, rowIndex, col.name, newValue, updatedRow);
                                                                        }}
                                                                        disabled={!parentValue}
                                                                        className="border rounded px-2 py-1 w-full"
                                                                        style={{
                                                                            color: col.textColor || "inherit",
                                                                            backgroundColor: col.backgroundColor || "inherit"
                                                                        }}
                                                                    >
                                                                        <option value="">Select {col.name}</option>
                                                                        {dependentOptions.map((opt, i) => (
                                                                            <option key={i} value={opt}>
                                                                                {opt}
                                                                            </option>
                                                                        ))}
                                                                    </select>

                                                                    {row[col.name] && (
                                                                        <div className="text-xs text-gray-600 mt-1">
                                                                            You selected: <span className="font-semibold">{row[col.name]}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        }

                                                        if (col.type === "dropdown") {
                                                            return (
                                                                <div>
                                                                    <select
                                                                        value={row[col.name] || ""}
                                                                        onChange={(e) => {
                                                                            const newValue = e.target.value;
                                                                            const updatedRow = { ...row, [col.name]: newValue };

                                                                            // Clear dependent fields
                                                                            field.columns.forEach(depCol => {
                                                                                if (
                                                                                    depCol.type === "dependentDropdown" &&
                                                                                    depCol.parentColumn === col.name
                                                                                ) {
                                                                                    updatedRow[depCol.name] = "";
                                                                                }
                                                                            });

                                                                            // If the new value is not in remarksOptions, clear remarks
                                                                            if (!(col.remarksOptions || []).includes(newValue)) {
                                                                                updatedRow[`${col.name}_remarks`] = "";
                                                                            }

                                                                            handleGridChange(field.id, rowIndex, col.name, newValue, updatedRow);
                                                                        }}
                                                                        className="border rounded px-2 py-1 w-full"
                                                                        style={{
                                                                            color: col.textColor || "inherit",
                                                                            backgroundColor: col.backgroundColor || "inherit",
                                                                        }}
                                                                    >
                                                                        <option value="">Select {col.name}</option>
                                                                        {(col.options || []).map((opt, i) => (
                                                                            <option key={i} value={opt}>
                                                                                {opt}
                                                                            </option>
                                                                        ))}
                                                                    </select>

                                                                    {/* ✅ Remarks field appears only if selected option requires it */}
                                                                    {console.log(col)}
                                                                    {col.remarksOptions?.includes(row[col.name]) && (
                                                                        <input
                                                                            type="text"
                                                                            required   // <-- mandatory
                                                                            placeholder={`Enter remarks for ${row[col.name]}`}
                                                                            value={row[`${col.name}_remarks`] || ""}
                                                                            onChange={(e) => {
                                                                                const updatedRow = {
                                                                                    ...row,
                                                                                    [`${col.name}_remarks`]: e.target.value,
                                                                                };
                                                                                handleGridChange(
                                                                                    field.id,
                                                                                    rowIndex,
                                                                                    `${col.name}_remarks`,
                                                                                    e.target.value,
                                                                                    updatedRow
                                                                                );
                                                                            }}
                                                                            className="border rounded px-2 py-1 w-full mt-2"
                                                                        />
                                                                    )}

                                                                    {row[col.name] && (
                                                                        <div className="text-xs text-gray-600 mt-1">
                                                                            You selected: <span className="font-semibold">{row[col.name]}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        }


                                                        return (
                                                            <div>
                                                                <input
                                                                    type="text"
                                                                    value={row[col.name] || ""}
                                                                    onChange={(e) => handleGridChange(field.id, rowIndex, col.name, e.target.value)}
                                                                    className={`border rounded px-2 py-1 w-full ${formErrors[`${field.id}_${rowIndex}_${col.name}`] ? "border-red-500" : ""
                                                                        }`}
                                                                    style={style}
                                                                />
                                                                {formErrors[`${field.id}_${rowIndex}_${col.name}`] && (
                                                                    <p className="text-red-500 text-xs mt-1">
                                                                        {formErrors[`${field.id}_${rowIndex}_${col.name}`]}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                            ))}
                                            <td className="py-2 px-4 border-b" style={{ width: "auto" }}>
                                                <button
                                                    type="button"
                                                    onClick={() => removeGridRow(field.id, rowIndex)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <button
                            type="button"
                            onClick={() => addGridRow(field.id, field.columns)}
                            className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
                        >
                            Add Row
                        </button>
                    </div>
                );

            case "linkedTextbox":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}{" "}
                            {field.required && <span className="text-red-500">*</span>}
                        </label>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="shadow appearance-none border rounded flex-1 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-50"
                                value={formValues[field.id] || ""}
                                readOnly={!field.allowManualEntry}
                                onChange={(e) => {
                                    if (field.allowManualEntry) {
                                        handleInputChange(field.id, e.target.value, field.type, field);
                                    }
                                }}
                                placeholder={`Linked data from ${formData.linkedForm?.name || 'linked form'}`}
                            />

                            {field.showLookupButton && (
                                <button
                                    type="button"
                                    onClick={() => handleLookupLinkedData(field)}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                                >
                                    Lookup
                                </button>
                            )}
                        </div>

                        {formErrors[field.id] && (
                            <p className="text-red-500 text-xs mt-1">
                                {formErrors[field.id]}
                            </p>
                        )}
                    </div>
                );


            default:
                return null;
        }
    };

    // Add this function next to your evaluateFormula function
    const evaluateRowFormula = (formula, row) => {
        if (!formula) return "";
        try {
            let expression = formula;
            Object.keys(row).forEach((colName) => {
                const value = parseFloat(row[colName]) || 0;
                expression = expression.replaceAll(`{${colName}}`, value);
                expression = expression.replaceAll(colName, value);
            });
            return eval(expression);
        } catch (error) {
            console.error("Row formula evaluation error:", error);
            return "";
        }
    };

    const addGridRow = (fieldId, columns) => {
        const newRow = {};
        (columns || []).forEach((col) => {
            newRow[col.name] = "";
        });
        setFormValues((prev) => ({
            ...prev,
            [fieldId]: [...(prev[fieldId] || []), newRow],
        }));
    };

    const removeGridRow = (fieldId, rowIndex) => {
        const updatedRows = (formValues[fieldId] || []).filter((_, idx) => idx !== rowIndex);
        setFormValues((prev) => ({ ...prev, [fieldId]: updatedRows }));
    };


    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                Loading form...
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500">Error: {error}</div>;
    }

    if (!formData) {
        return <div>No form data available</div>;
    }


    function calculateTimeDifference(start, end) {
        if (!start || !end) return "";

        const [h1, m1] = start.split(":").map(Number);
        const [h2, m2] = end.split(":").map(Number);

        const totalStart = h1 * 60 + m1;
        const totalEnd = h2 * 60 + m2;
        const diff = totalEnd - totalStart;

        return diff >= 0 ? `${diff}` : "Invalid";
    }

    return (
        <div className="max-w-1xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold mb-6">{formData.name}</h1>

            <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-medium">Font size:</span>
                <button onClick={() => setFontSize((size) => Math.max(10, size - 1))} className="px-2 py-1 border rounded">A-</button>
                <button onClick={() => setFontSize(16)} className="px-2 py-1 border rounded">Reset</button>
                <button onClick={() => setFontSize((size) => Math.min(32, size + 1))} className="px-2 py-1 border rounded">A+</button>
            </div>

            {submitted && Object.keys(formErrors).length === 0 && (
                <div
                    className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4"
                    role="alert"
                >
                    <p>Form submitted successfully!</p>
                </div>
            )}

            {editingSubmissionId && (
                <div className="mb-4 text-yellow-600 font-semibold">
                    Editing Submission #{editingSubmissionId}
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <div style={{ fontSize: `${fontSize}px` }}>
                    <div className="flex flex-wrap -mx-2">
                        {formData.fields.map((field) => (
                            <div key={field.id} className={`px-2 ${field.width}`}>
                                {renderField(field)}
                            </div>
                        ))}
                    </div>


                    <div className="mt-6">
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                            Submit
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="ml-4 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                            View Last 10 Submissions
                        </button>
                    </div>
                </div>
            </form>

            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-11/12 max-w-3xl relative">
                        <h2 className="text-2xl font-bold mb-4">Last 10 Submissions</h2>

                        {/* Table */}
                        {recentSubmissions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white border border-gray-300">
                                    <thead>
                                        <tr>
                                            <th className="py-2 px-4 border-b">ID</th>
                                            <th className="py-2 px-4 border-b">Submitted At</th>
                                            <th className="py-2 px-4 border-b">Status</th>
                                            <th className="py-2 px-4 border-b">Actions</th> {/* NEW COLUMN */}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentSubmissions.map((submission) => (
                                            <tr key={submission.id}>
                                                <td className="py-2 px-4 border-b">{submission.id}</td>
                                                <td className="py-2 px-4 border-b">{new Date(submission.submittedAt).toLocaleString()}</td>
                                                <td className="py-2 px-4 border-b">
                                                    <span className={`
                      ${submission.status === "Approved" ? "text-green-600" : ""}
                      ${submission.status === "Pending" ? "text-yellow-600" : ""}
                      ${submission.status === "Rejected" ? "text-red-600" : ""}
                      font-semibold
                    `}>
                                                        {submission.status}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-4 border-b">
                                                    {console.log(submission.form?.approvers?.length)}
                                                    {submission.status === "Pending" && (
                                                        <button
                                                            className="text-blue-500 hover:underline"
                                                            onClick={() => handleEditSubmission(submission.id)}
                                                        >
                                                            Edit
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p>No submissions available.</p>
                        )}

                        {/* Close Button */}
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-2xl font-bold"
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}


        </div>
    );
}
