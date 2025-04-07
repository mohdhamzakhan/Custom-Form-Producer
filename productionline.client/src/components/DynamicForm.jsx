import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function DynamicForm() {
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formValues, setFormValues] = useState({});
    const [remarks, setRemarks] = useState({});
    const [formErrors, setFormErrors] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const { formId } = useParams();

    useEffect(() => {
        // In a real application, this would be an actual API call
        const fetchFormData = async () => {
            try {
                // Simulating API response - replace with actual fetch in production
                const response = await fetch(
                    `http://localhost:5182/api/forms/link/${formId}`
                );
                if (!response.ok) throw new Error("Failed to fetch form data");
                const data = await response.json();

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
                    } else {
                        initialValues[field.id] = "";
                    }
                    initialRemarks[field.id] = "";
                });

                setFormValues(initialValues);
                setRemarks(initialRemarks);
                setLoading(false);
            } catch (err) {
                setError(err.message || "Failed to fetch form data");
                setLoading(false);
            }
        };

        fetchFormData();
    }, []);

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

    // Validate the form
    const validateForm = () => {
        const errors = {};

        if (!formData) return errors;

        formData.fields.forEach((field) => {
            const value = formValues[field.id];

            // Check required fields
            if (field.required) {
                if (
                    field.type === "checkbox" &&
                    (!Array.isArray(value) || value.length === 0)
                ) {
                    errors[field.id] = `${field.label} is required`;
                } else if (field.type === "radio" && (!value || value.trim() === "")) {
                    errors[field.id] = `${field.label} is required`;
                } else if (
                    (field.type === "dropdown" || field.type === "textbox") &&
                    (!value || value.trim() === "")
                ) {
                    errors[field.id] = `${field.label} is required`;
                } else if (field.type === "numeric" && value === "") {
                    errors[field.id] = `${field.label} is required`;
                }
            }

            // Validate numeric fields
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

                // Check remark triggers for numeric fields
                if (
                    checkRemarkTriggers(field, value) &&
                    (!remarks[field.id] || remarks[field.id].trim() === "")
                ) {
                    errors[`${field.id}_remark`] = "Remark is required for this value";
                }
            }

            // Check if remarks are required for selected values
            if (
                needsRemark(field, value) &&
                (!remarks[field.id] || remarks[field.id].trim() === "")
            ) {
                errors[`${field.id}_remark`] =
                    "Remark is required for selected option(s)";
            }
        });

        return errors;
    };

    // Handle form submission
    //const handleSubmit = (e) => {
    //    e.preventDefault();

    //    const validationErrors = validateForm();
    //    setFormErrors(validationErrors);
    //    setSubmitted(true);

    //    if (Object.keys(validationErrors).length === 0) {
    //        // Form is valid, prepare data for submission
    //        const submissionData = {
    //            formId: formData.id,
    //            values: {},
    //            remarks: {},
    //        };

    //        // Extract values and remarks
    //        Object.keys(formValues).forEach((fieldId) => {
    //            submissionData.values[fieldId] = formValues[fieldId];
    //            if (remarks[fieldId] && remarks[fieldId].trim() !== "") {
    //                submissionData.remarks[fieldId] = remarks[fieldId];
    //            }
    //        });

    //        // Here you would send the data to your backend
    //        console.log("Form submitted:", submissionData);
    //        alert("Form submitted successfully!");
    //    }
    //};

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationErrors = validateForm();
        setFormErrors(validationErrors);
        setSubmitted(true);

        if (Object.keys(validationErrors).length === 0) {
            const submissionData = {
                formId: formData.id,
                submissionData: []
            };

            // Find and collect form fields by type from formData
            const fieldTypes = {};
            formData.fields.forEach(field => {
                fieldTypes[field.id] = field.type;
            });

            Object.keys(formValues).forEach((fieldId) => {
                let fieldValue = formValues[fieldId];

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

                const response = await fetch(`http://localhost:5182/api/forms/${formData.id}/submit`, {
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
                    // resetForm(); // You would need to implement this function
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

            case "date":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}{" "}
                            {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <DatePicker
                            className="border p-2 w-full"
                            selected={formValues[field.id] || null}
                            onChange={(date) =>
                                handleInputChange(field.id, date, field.type, field)
                            }
                            dateFormat="dd/MM/yyyy"
                            placeholderText="DD/MM/YYYY"
                        />
                        {formErrors[field.id] && (
                            <p className="text-red-500 text-xs mt-1">
                                {formErrors[field.id]}
                            </p>
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

            default:
                return null;
        }
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

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold mb-6">{formData.name}</h1>

            {submitted && Object.keys(formErrors).length === 0 && (
                <div
                    className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4"
                    role="alert"
                >
                    <p>Form submitted successfully!</p>
                </div>
            )}

            <form onSubmit={handleSubmit}>
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
                </div>
            </form>
        </div>
    );
}
