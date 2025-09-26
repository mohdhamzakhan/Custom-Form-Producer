import { useEffect, useState, useRef, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useParams } from "react-router-dom";
import { APP_CONSTANTS } from "./store";
import LoadingDots from './LoadingDots';

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
    const updatingLinkedFields = useRef(false);
    const [linkedDataLoading, setLinkedDataLoading] = useState(false);
    const { formId } = useParams();
    const [tableColors, setTableColors] = useState({});
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedImageName, setSelectedImageName] = useState('');

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
                        const rowCount = field.initialRows || field.minRows || 1;
                        const rows = [];
                        for (let i = 0; i < rowCount; i++) {
                            const row = {};
                            field.columns.forEach(col => {
                                if (col.type === "checkbox") {
                                    row[col.name] = col.options ? [] : false;
                                } else if (col.type === "numeric") {
                                    row[col.name] = "";
                                } else if (col.type === "date") {
                                    row[col.name] = null;
                                } else {
                                    row[col.name] = "";
                                }
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

    // Add this before the useEffect
    const keyFieldValues = useMemo(() => {
        if (!formData?.keyFieldMappings?.length) return {};

        const values = {};
        formData.keyFieldMappings.forEach(mapping => {
            values[mapping.currentFormField] = formValues[mapping.currentFormField];
        });
        return values;
    }, [formData?.keyFieldMappings, formValues]);

    const keyFieldValuesString = useMemo(() => {
        return JSON.stringify(keyFieldValues);
    }, [keyFieldValues]);

    useEffect(() => {
        const loadLinkedDataAutomatically = async () => {
            // Prevent infinite loops
            if (updatingLinkedFields.current) return;

            console.log('🚀 loadLinkedDataAutomatically called');

            if (!formData?.linkedFormId || !formData?.keyFieldMappings?.length) {
                return;
            }

            try {
                // Extract key values
                const keyValues = {};
                let hasAllKeyValues = true;

                Object.values(keyValues).forEach(value => {
                    if (!value || value === '') {
                        hasAllKeyValues = false;
                    }
                });

                if (!hasAllKeyValues) {
                    console.log('🧹 Not all key fields filled, clearing linked fields');
                    clearLinkedTextboxFields();
                    return;
                }

                // Fetch linked data
                const linkedSubmissions = await fetchLinkedData(formData.keyFieldMappings);

                // Your existing logic for processing submissions...
                const dataArray = linkedSubmissions.data;

                if (!dataArray || !Array.isArray(dataArray) || dataArray.length === 0) {
                    console.log('🧹 No data array or empty array, clearing fields');
                    clearLinkedTextboxFields();
                    return;
                }

                const config = {
                    gridColumnMappings: linkedSubmissions.gridColumnMappings,
                    fallbackMappings: {},
                    searchFormats: [],
                    enableLogging: true
                };

                const matchingSubmission = findMatchingSubmission(
                    dataArray,
                    keyValues,
                    formData.keyFieldMappings,
                    config
                );

                if (matchingSubmission) {
                    console.log('✅ Found matching submission, populating fields');

                    // Set flag to prevent triggering the effect
                    updatingLinkedFields.current = true;

                    setFormValues(prevValues => {
                        const updatedValues = { ...prevValues };
                        let hasUpdates = false;

                        formData.fields
                            .filter(field => field.type === 'linkedTextbox')
                            .forEach(field => {
                                let linkedFieldRef;
                                if (field.linkedFieldType === 'gridColumn' && field.linkedGridFieldId && field.linkedColumnId) {
                                    linkedFieldRef = `${field.linkedGridFieldId}.${field.linkedColumnId}`;
                                } else if (field.linkedFieldId) {
                                    linkedFieldRef = field.linkedFieldId;
                                }

                                if (linkedFieldRef) {
                                    const linkedValue = extractLinkedFieldValue(matchingSubmission, linkedFieldRef, {
                                        gridColumnMappings: linkedSubmissions.gridColumnMappings,
                                        fallbackMappings: {},
                                        searchFormats: [],
                                        enableLogging: true
                                    });

                                    console.log(`Setting field ${field.id} to: "${linkedValue}"`);

                                    if (linkedValue && linkedValue !== updatedValues[field.id]) {
                                        updatedValues[field.id] = linkedValue;
                                        hasUpdates = true;
                                    }
                                }
                            });

                        // Reset the flag after a short delay
                        setTimeout(() => {
                            updatingLinkedFields.current = false;
                        }, 100);

                        console.log('Has updates to apply:', hasUpdates);
                        return updatedValues;
                    });
                } else {
                    console.log('🧹 No matching record found, clearing fields');
                    clearLinkedTextboxFields();
                }
            } catch (error) {
                console.error('❌ Error in loadLinkedDataAutomatically:', error);
                clearLinkedTextboxFields();
            }
        };

        loadLinkedDataAutomatically();
    }, [
        // Only depend on key field values, not all formValues
        keyFieldValuesString, // Stable string representation
        formData?.linkedFormId,
        formData?.keyFieldMappings?.length
    ]);

    const clearLinkedTextboxFields = () => {
        console.log('🧹 Attempting to clear linked textbox fields');

        // Set flag to prevent triggering the effect
        updatingLinkedFields.current = true;

        setFormValues(prevValues => {
            const updatedValues = { ...prevValues };
            let hasChanges = false;

            formData?.fields
                ?.filter(field => field.type === 'linkedTextbox')
                ?.forEach(field => {
                    const currentValue = updatedValues[field.id];
                    if (currentValue && currentValue !== '') {
                        console.log(`Clearing field ${field.id} (was: "${currentValue}")`);
                        updatedValues[field.id] = '';
                        hasChanges = true;
                    }
                });

            // Reset the flag after a short delay
            setTimeout(() => {
                updatingLinkedFields.current = false;
            }, 100);

            if (hasChanges) {
                console.log('✅ Cleared linked textbox fields');
                return updatedValues;
            } else {
                console.log('ℹ️ No linked textbox fields to clear');
                updatingLinkedFields.current = false; // Reset immediately if no changes
                return prevValues;
            }
        });
    };
    const isBridgeField = (fieldId) => {
        return formData?.keyFieldMappings?.some(
            mapping => mapping.currentFormField === fieldId
        );
    };

    const handleBridgeFieldBlur = (fieldId) => {
        // Only proceed if this is actually a bridge field
        if (!isBridgeField(fieldId)) {
            return;
        }

        console.log(`Bridge field ${fieldId} blurred, checking for auto-load`);

        setTimeout(() => {
            // Check if all key fields have values
            const hasAllKeyValues = formData.keyFieldMappings.every(mapping => {
                const value = formValues[mapping.currentFormField];
                return value && value !== '';
            });

            if (hasAllKeyValues) {
                loadLinkedDataAutomatically();
            } else {
                clearLinkedTextboxFields();
            }
        }, 100);
    };

    const getTableColor = (fieldId) => {
        if (!tableColors[fieldId]) {
            const colors = [
                { bg: 'bg-blue-50', border: 'border-blue-200', hover: 'hover:bg-blue-100', titleBg: 'bg-blue-300' },
                { bg: 'bg-green-50', border: 'border-green-200', hover: 'hover:bg-green-100', titleBg: 'bg-green-300' },
                { bg: 'bg-purple-50', border: 'border-purple-200', hover: 'hover:bg-purple-100', titleBg: 'bg-purple-300' },
                { bg: 'bg-pink-50', border: 'border-pink-200', hover: 'hover:bg-pink-100', titleBg: 'bg-pink-300' },
                { bg: 'bg-yellow-50', border: 'border-yellow-200', hover: 'hover:bg-yellow-100', titleBg: 'bg-yellow-300' },
                { bg: 'bg-indigo-50', border: 'border-indigo-200', hover: 'hover:bg-indigo-100', titleBg: 'bg-indigo-300' },
                { bg: 'bg-red-50', border: 'border-red-200', hover: 'hover:bg-red-100', titleBg: 'bg-red-300' },
                { bg: 'bg-orange-50', border: 'border-orange-200', hover: 'hover:bg-orange-100', titleBg: 'bg-orange-300' },
                { bg: 'bg-teal-50', border: 'border-teal-200', hover: 'hover:bg-teal-100', titleBg: 'bg-teal-300' },
                { bg: 'bg-cyan-50', border: 'border-cyan-200', hover: 'hover:bg-cyan-100', titleBg: 'bg-cyan-300' }
            ];

            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            setTableColors(prev => ({ ...prev, [fieldId]: randomColor }));
            return randomColor;
        }
        return tableColors[fieldId];
    };

    // Add this function in your component
    const renderImageGallery = () => {
        if (!formData?.fields) return null;

        const imageFields = formData.fields.filter(field =>
            field.type === 'image' && field.imageoptions
        );

        if (imageFields.length === 0) return null;

        return (
            <div className="mb-6 bg-gray-50 p-4 rounded-lg border">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Attached Images</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {imageFields.map((field) => {
                        try {
                            const imageOptions = JSON.parse(field.imageoptions);
                            if (!imageOptions.imageUrl) return null;

                            return (
                                <div key={field.id} className="relative group">
                                    <div
                                        className="cursor-pointer border-2 border-gray-200 rounded-lg overflow-hidden hover:border-blue-500 transition-all duration-200 hover:shadow-lg"
                                        onClick={() => openImageModal(imageOptions, field.label)}
                                    >
                                        <img
                                            src={imageOptions.imageUrl}
                                            alt={field.label}
                                            className="w-full h-24 object-cover"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2">
                                            <p className="text-xs font-medium truncate">{field.label}</p>
                                            <p className="text-xs text-gray-300">
                                                {(imageOptions.fileSize / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        } catch (e) {
                            console.error('Error parsing image options for field:', field.id, e);
                            return null;
                        }
                    })}
                </div>
            </div>
        );
    };

    // Generic function to check if key fields have changed
    const checkKeyFieldsChanged = (newFormValues, oldFormValues, keyFieldMappings) => {
        if (!keyFieldMappings?.length) return false;

        return keyFieldMappings.some(mapping => {
            const oldValue = oldFormValues[mapping.currentFormField];
            const newValue = newFormValues[mapping.currentFormField];
            return oldValue !== newValue;
        });
    };

    const openImageModal = (imageOptions, imageName) => {
        setSelectedImage(imageOptions);
        setSelectedImageName(imageName);
        setImageModalOpen(true);
    };

    const closeImageModal = () => {
        setImageModalOpen(false);
        setSelectedImage(null);
        setSelectedImageName('');
    };

    // Add this function to render the image modal
    const renderImageModal = () => {
        if (!imageModalOpen || !selectedImage) return null;

        return (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-75">
                <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-screen overflow-hidden relative">
                    {/* Modal Header */}
                    <div className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-xl font-bold text-gray-800">{selectedImageName}</h2>
                        <button
                            onClick={closeImageModal}
                            className="text-gray-600 hover:text-gray-900 text-2xl font-bold"
                        >
                            ×
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-4">
                        <img
                            src={selectedImage.imageUrl}
                            alt={selectedImageName}
                            className="max-w-full max-h-96 object-contain mx-auto"
                        />

                        {/* Image Details */}
                        <div className="mt-4 bg-gray-50 p-3 rounded">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-semibold text-gray-600">File Name:</span>
                                    <p className="text-gray-800">{selectedImage.fileName}</p>
                                </div>
                                <div>
                                    <span className="font-semibold text-gray-600">File Size:</span>
                                    <p className="text-gray-800">{(selectedImage.fileSize / 1024).toFixed(1)} KB</p>
                                </div>
                                {selectedImage.uploadedAt && (
                                    <div>
                                        <span className="font-semibold text-gray-600">Uploaded:</span>
                                        <p className="text-gray-800">
                                            {new Date(selectedImage.uploadedAt).toLocaleString()}
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <span className="font-semibold text-gray-600">Type:</span>
                                    <p className="text-gray-800">
                                        {selectedImage.allowedTypes?.join(', ') || 'Image'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="flex justify-end p-4 border-t">
                        <button
                            onClick={closeImageModal}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Enhanced handleInputChange to trigger auto-load
    const NewhandleInputChange = (fieldId, value, fieldType, field) => {
        const updatedValues = { ...formValues, [fieldId]: value };
        setFormValues(updatedValues);

        // Check if this field is a key field and trigger auto-load
        if (formData?.keyFieldMappings?.some(mapping => mapping.currentFormField === fieldId)) {
            // Debounce the auto-load to avoid excessive API calls
            if (autoLoadTimeoutRef.current) {
                clearTimeout(autoLoadTimeoutRef.current);
            }

            autoLoadTimeoutRef.current = setTimeout(() => {
                loadLinkedDataAutomatically();
            }, 500); // 500ms delay
        }

        // Handle validation and other logic
        handleValidation(fieldId, value, field);
    };

    // Add this to your component
    const autoLoadTimeoutRef = useRef(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (autoLoadTimeoutRef.current) {
                clearTimeout(autoLoadTimeoutRef.current);
            }
        };
    }, []);


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
                } else if (field.type === "date" && !value) {
                    errors[field.id] = `${field.label} is required`;
                } else if (field.type === "date" && value && !isValidDate(value)) {
                    errors[field.id] = `Please enter a valid date for ${field.label}`;
                }
            }


            if (field.type === "grid" && field.columns?.length > 0) {
                const rows = formValues[field.id] || [];
                rows.forEach((row, rowIndex) => {
                    field.columns.forEach(col => {
                        const value = row[col.name];

                        if (col.required && (value === "" || value === null || value === undefined)) {
                            const errorKey = `${field.id}_${rowIndex}_${col.name}`;
                            errors[errorKey] = `${col.label || col.name} is required in row ${rowIndex + 1}`;
                        }

                        // Date validation for date columns
                        if (col.type === "date" && value !== null && value !== "") {
                            const errorKey = `${field.id}_${rowIndex}_${col.name}`;

                            if (!isValidDate(value)) {
                                errors[errorKey] = `Please enter a valid date in row ${rowIndex + 1}`;
                            }
                        }

                        // Numeric validation for numeric columns
                        if (col.type === "numeric" && value !== "" && value !== null) {
                            const numValue = parseFloat(value);
                            const errorKey = `${field.id}_${rowIndex}_${col.name}`;

                            if (!isNaN(numValue)) {
                                // Check if value is out of range
                                const isOutOfRange = (
                                    (col.min !== null && col.min !== undefined && numValue < col.min) ||
                                    (col.max !== null && col.max !== undefined && numValue > col.max)
                                );

                                // If out of range, remarks are required
                                if (isOutOfRange) {
                                    const remarksKey = `${field.id}_${rowIndex}_${col.name}_remarks`;
                                    const remarks = row[`${col.name}_remarks`];

                                    if (!remarks || remarks.trim() === "") {
                                        errors[remarksKey] = `Remarks required for out-of-range value in row ${rowIndex + 1}`;
                                    }
                                }
                            }
                        }
                    });
                });
            }

            if (field.type === "numeric" && value !== "") {
                const numValue = parseFloat(value);
                if (isNaN(numValue)) {
                    errors[field.id] = "Please enter a valid number";
                } else {
                    // Check decimal constraint
                    if (field.decimal === false && !Number.isInteger(numValue)) {
                        errors[field.id] = "Please enter a whole number";
                    }

                    // Check min/max constraints
                    if (field.min !== null && field.min !== undefined && numValue < field.min) {
                        errors[field.id] = `Value must be at least ${field.min}`;
                    }
                    if (field.max !== null && field.max !== undefined && numValue > field.max) {
                        errors[field.id] = `Value must be at most ${field.max}`;
                    }

                    // Check if remarks are required for out-of-range values
                    const isOutOfRange = (
                        (field.min !== null && field.min !== undefined && numValue < field.min) ||
                        (field.max !== null && field.max !== undefined && numValue > field.max)
                    );

                    if (field.requireRemarksOutOfRange && isOutOfRange) {
                        const remarks = remarks[field.id];
                        if (!remarks || remarks.trim() === "") {
                            errors[`${field.id}_remarks`] = "Remarks required for out-of-range value";
                        }
                    }

                    // Check specific remark triggers
                    if (field.remarkTriggers && field.remarkTriggers.length > 0) {
                        const needsRemarks = field.remarkTriggers.some(trigger => {
                            const triggerValue = parseFloat(trigger.value);
                            switch (trigger.operator) {
                                case "=": return numValue === triggerValue;
                                case ">": return numValue > triggerValue;
                                case "<": return numValue < triggerValue;
                                case ">=": return numValue >= triggerValue;
                                case "<=": return numValue <= triggerValue;
                                default: return false;
                            }
                        });

                        if (needsRemarks) {
                            const fieldRemarks = remarks[field.id];
                            if (!fieldRemarks || fieldRemarks.trim() === "") {
                                errors[`${field.id}_remarks`] = "Remarks required for this value";
                            }
                        }
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

    const isValidDate = (date) => {
        return date instanceof Date && !isNaN(date.getTime());
    };
    //const cleanGridData = (gridData) => {
    //    if (!Array.isArray(gridData)) return gridData;

    //    return gridData.map(row => {
    //        const cleanedRow = {};
    //        Object.keys(row).forEach(key => {
    //            // Only include non-empty values or non-remark fields
    //            if (!key.endsWith('_remarks') || (key.endsWith('_remarks') && row[key] && row[key].trim() !== '')) {
    //                cleanedRow[key] = row[key];
    //            }
    //        });
    //        return cleanedRow;
    //    });
    //};
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

            Object.keys(formValues).forEach(fieldId => {
                let fieldValue = formValues[fieldId];
                const fieldType = fieldTypes[fieldId];

                if (fieldType === "grid" && Array.isArray(fieldValue)) {
                    // Clean grid data before saving
                    fieldValue = JSON.stringify(cleanGridData(fieldValue));
                } else if (Array.isArray(fieldValue)) {
                    // For checkbox groups, join the selected values
                    fieldValue = fieldValue.join(",");
                }

                // Handle different field types
                if (Array.isArray(fieldValue)) {
                    // For checkbox groups, join the selected values
                    fieldValue = fieldValue.join(', ');
                } else if (fieldTypes[fieldId] === 'date' && fieldValue) {
                    // Format date values to ISO string for backend storage
                    if (fieldValue instanceof Date) {
                        const year = fieldValue.getFullYear();
                        const month = String(fieldValue.getMonth() + 1).padStart(2, '0');
                        const day = String(fieldValue.getDate()).padStart(2, '0');
                        fieldValue = `${year}-${month}-${day}`;
                    }
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

    const cleanGridData = (gridData) => {
        if (!Array.isArray(gridData)) return gridData;

        return gridData.map(row => {
            const cleanedRow = {};
            Object.keys(row).forEach(key => {
                // Only include non-empty values or non-remark fields
                if (!key.endsWith('remarks') && key.endsWith('remarks')) {
                    if (row[key] && row[key].trim() !== '') {
                        cleanedRow[key] = row[key];
                    }
                } else {
                    // Handle date values in grid
                    if (row[key] instanceof Date) {
                        const date = row[key];
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        cleanedRow[key] = `${year}-${month}-${day}`;
                    } else if (row[key] !== null && row[key] !== undefined && row[key] !== '') {
                        cleanedRow[key] = row[key];
                    }
                }
            });
            return cleanedRow;
        });
    }


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

        // Ensure date is a Date object
        const dateObj = date instanceof Date ? date : new Date(date);

        // Check if the date is valid
        if (isNaN(dateObj.getTime())) return "";

        return dateObj.toLocaleDateString(undefined, { weekday: "long" });
    };


    const fetchLinkedData = async (keyMappings) => {
        console.log("=== FETCH LINKED DATA DEBUG ===");
        console.log("LinkedFormId:", formData.linkedFormId);
        console.log("KeyMappings being sent:", keyMappings);

        if (!formData.linkedFormId || !keyMappings.length) {
            console.log("Missing linkedFormId or keyMappings");
            return null;
        }

        try {
            setLinkedDataLoading(true); // Start loading

            const url = `${APP_CONSTANTS.API_BASE_URL}/api/forms/linked-data/${formData.linkedFormId}?keyMappings=${encodeURIComponent(JSON.stringify(keyMappings))}`;
            console.log("API URL:", url);

            const response = await fetch(url);
            console.log("Response status:", response.status);
            console.log("Response ok:", response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("API Error:", errorText);
                throw new Error(`API returned ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log("API Response:", result);

            return result.data || result;
        } catch (error) {
            console.error("Error fetching linked data:", error);
            return null;
        } finally {
            setLinkedDataLoading(false); // End loading
        }
    };
    // Replace the existing handleLookupLinkedData function:
    // Usage in your component
    const handleLookupLinkedData = async (field) => {
        const linkedValue = await handleLinkedData(field, formData, formValues, {
            // No hardcoded values - all configurable
            gridColumnMappings: null, // Will use API response
            fallbackMappings: {}, // Can be passed from config
            searchFormats: [], // Can be passed from config
            enableLogging: true,
            onSuccess: (value) => {
                setFormValues(prev => ({ ...prev, [field.id]: value }));
                alert('Linked data loaded successfully!');
            },
            onError: (message) => alert(message)
        });
    };

    // Auto-load linked data
    const loadLinkedDataAutomatically = async () => {
        const fieldsWithLinkedData = formData.fields.filter(f => f.type === 'linkedTextbox');

        for (const field of fieldsWithLinkedData) {
            await handleLinkedData(field, formData, formValues, {
                enableLogging: false,
                onSuccess: (value) => {
                    setFormValues(prev => ({ ...prev, [field.id]: value }));
                },
                onError: (message) => console.warn('Auto-load failed:', message)
            });
        }
    };


    const findMatchingSubmission = (submissions, keyValues, keyMappings, config = {}) => {
        const {
            gridColumnMappings = null,
            fallbackMappings = {},
            searchFormats = [],
            enableLogging = false,
            strictMatch = false
        } = config;

        if (enableLogging) {
            console.log('Finding matching submission with:', { keyValues, keyMappings });
        }

        return submissions.find(submission => {
            return keyMappings.every(mapping => {
                const currentValue = keyValues[mapping.currentFormField];
                const linkedField = mapping.linkedFormField;

                if (enableLogging) {
                    console.log(`Checking mapping: ${mapping.currentFormField} -> ${linkedField}`);
                    console.log(`Current value: "${currentValue}"`);
                }

                // Handle grid column references
                if (linkedField.includes('.')) {
                    const [gridFieldId, columnId] = linkedField.split('.');

                    const gridData = findFieldInSubmission(submission, gridFieldId, searchFormats);
                    if (!gridData) return false;

                    try {
                        const gridRows = JSON.parse(gridData.fieldValue);
                        const columnName = getColumnNameById(columnId, gridFieldId, gridColumnMappings, fallbackMappings);

                        const hasMatch = gridRows.some(row => {
                            const rowValue = row[columnName];
                            return strictMatch
                                ? String(rowValue) === String(currentValue)
                                : normalizeValue(rowValue) === normalizeValue(currentValue);
                        });

                        if (enableLogging) {
                            console.log(`Grid column "${columnName}" match result: ${hasMatch}`);
                        }

                        return hasMatch;
                    } catch (e) {
                        if (enableLogging) console.error('Grid parsing error:', e);
                        return false;
                    }
                } else {
                    // Regular field
                    const fieldData = findFieldInSubmission(submission, linkedField, searchFormats);
                    const linkedValue = fieldData ? fieldData.fieldValue : null;

                    const isMatch = strictMatch
                        ? String(linkedValue) === String(currentValue)
                        : normalizeValue(linkedValue) === normalizeValue(currentValue);

                    if (enableLogging) {
                        console.log(`Field "${linkedField}" value: "${linkedValue}", match: ${isMatch}`);
                    }

                    return isMatch;
                }
            });
        });
    };


    const extractLinkedFieldValue = (submission, linkedFieldReference, config = {}) => {
        const {
            gridColumnMappings = null,
            fallbackMappings = {},
            searchFormats = [],
            extractionStrategy = 'first',
            enableLogging = false
        } = config;

        if (!linkedFieldReference) return '';

        // Handle grid column references
        if (linkedFieldReference.includes('.')) {
            const [gridFieldId, columnId] = linkedFieldReference.split('.');

            if (!gridFieldId || !columnId) return '';

            // Find grid field with flexible formats
            const gridData = findFieldInSubmission(submission, gridFieldId, searchFormats);

            if (gridData) {
                try {
                    const gridRows = JSON.parse(gridData.fieldValue);

                    // Get column name generically
                    const columnName = getColumnNameById(columnId, gridFieldId, gridColumnMappings, fallbackMappings);

                    // Extract values
                    const values = gridRows
                        .map(row => row[columnName])
                        .filter(value => value && String(value).trim() !== '');

                    // Apply extraction strategy
                    switch (extractionStrategy) {
                        case 'all': return values;
                        case 'last': return values.length > 0 ? values[values.length - 1] : '';
                        default: return values.length > 0 ? values[0] : '';
                    }
                } catch (e) {
                    if (enableLogging) console.error('Failed to parse grid data:', e);
                    return '';
                }
            }
            return '';
        } else {
            // Regular field
            const fieldData = findFieldInSubmission(submission, linkedFieldReference, searchFormats);
            return fieldData ? fieldData.fieldValue : '';
        }
    };


    const getColumnNameById = (columnId, gridFieldId, gridColumnMappings = null, fallbackMappings = {}) => {
        if (gridColumnMappings && gridFieldId && gridColumnMappings[gridFieldId]) {
            const columnName = gridColumnMappings[gridFieldId][columnId];
            if (columnName) {
                return columnName;
            }
        }

        // Try fallback mappings
        if (fallbackMappings && fallbackMappings[columnId]) {
            return fallbackMappings[columnId];
        }

        // Return columnId as final fallback
        return columnId;
    };


    const findFieldInSubmission = (submission, fieldId, searchFormats = []) => {
        // Default search formats
        const defaultFormats = [
            fieldId,
            fieldId.toLowerCase(),
            fieldId.toUpperCase()
        ];

        const allFormats = [...defaultFormats, ...searchFormats];

        for (const format of allFormats) {
            const found = submission.submissionData.find(sd => sd.fieldLabel === format);
            if (found) {
                return { fieldLabel: format, fieldValue: found.fieldValue };
            }
        }

        return null;
    };

    const normalizeValue = (value) => {
        if (value === null || value === undefined) return '';
        return String(value).trim().toLowerCase();
    };

    // Generic hex to GUID converter
    const convertHexToGuid = (hexId, options = {}) => {
        const { customConverter = null } = options;

        if (!hexId) return null;
        if (hexId.includes('-')) return hexId; // Already GUID format

        // Use custom converter if provided
        if (customConverter && typeof customConverter === 'function') {
            return customConverter(hexId);
        }

        // Default behavior - return null (no conversion)
        return null;
    };

    const handleLinkedData = async (field, formData, formValues, apiConfig = {}) => {
        const {
            apiBaseUrl = `{APP_CONSTANTS.API_BASE_URL}/api/forms`,
            gridColumnMappings = null,
            fallbackMappings = {},
            searchFormats = [],
            enableLogging = false,
            onSuccess = null,
            onError = null,
            onNoMatch = null // New callback for no match scenario
        } = apiConfig;

        // Extract key values generically
        const keyValues = {};
        let hasAllKeyValues = true;

        formData.keyFieldMappings?.forEach(mapping => {
            const value = formValues[mapping.currentFormField];
            if (!value || value === '') {
                hasAllKeyValues = false;
            }
            keyValues[mapping.currentFormField] = value;
        });

        if (!hasAllKeyValues) {
            if (onNoMatch) onNoMatch(''); // Clear field
            return '';
        }

        try {
            // Fetch and process linked data...
            const url = `${APP_CONSTANTS.API_BASE_URL}/api/forms/linked-data/${formData.linkedFormId}?keyMappings=${encodeURIComponent(JSON.stringify(formData.keyFieldMappings))}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            const result = await response.json();

            if (!result?.data?.length) {
                if (onNoMatch) onNoMatch(''); // Clear field
                return '';
            }

            const config = {
                gridColumnMappings: result.gridColumnMappings || gridColumnMappings,
                fallbackMappings,
                searchFormats,
                enableLogging
            };

            const matchingSubmission = findMatchingSubmission(
                result.data,
                keyValues,
                formData.keyFieldMappings,
                config
            );

            if (!matchingSubmission) {
                if (onNoMatch) onNoMatch(''); // Clear field
                return '';
            }

            // Extract linked field value...
            let linkedFieldRef;
            if (field.linkedFieldType === 'gridColumn' && field.linkedGridFieldId && field.linkedColumnId) {
                linkedFieldRef = `${field.linkedGridFieldId}.${field.linkedColumnId}`;
            } else if (field.linkedFieldId) {
                linkedFieldRef = field.linkedFieldId;
            }

            if (!linkedFieldRef) {
                if (onNoMatch) onNoMatch(''); // Clear field
                return '';
            }

            const linkedFieldValue = extractLinkedFieldValue(matchingSubmission, linkedFieldRef, {
                gridColumnMappings: result.gridColumnMappings || gridColumnMappings,
                fallbackMappings,
                searchFormats,
                enableLogging
            });

            const finalValue = linkedFieldValue || ''; // Ensure empty string if no value
            if (onSuccess) onSuccess(finalValue);
            return finalValue;

        } catch (error) {
            if (enableLogging) console.error('Error in linked data handler:', error);
            if (onNoMatch) onNoMatch(''); // Clear field on error
            return '';
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
                            {field.label}{field.required && <span className="text-red-500">*</span>}
                        </label>
                        <select
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white"
                            value={formValues[field.id] || ""}
                            onChange={(e) => handleInputChange(field.id, e.target.value, field.type, field)}
                        >
                            <option value="">Select {field.label}</option>
                            {field.options?.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                        {formErrors[field.id] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[field.id]}</p>
                        )}
                    </div>
                );


            // In your input rendering, only add onBlur to bridge fields
            case "textbox":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}{field.required && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={formValues[field.id] || ""}
                            onChange={(e) => handleInputChange(field.id, e.target.value, field.type, field)}
                            // Only add onBlur if this field is the bridge field
                            {...(isBridgeField(field.id) && {
                                onBlur: () => handleBridgeFieldBlur(field.id)
                            })}
                            placeholder={`Enter ${field.label}`}
                            rows="1"
                        />
                        {formErrors[field.id] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[field.id]}</p>
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
                            {field.label}
                            {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <div className="flex flex-col gap-1">
                            <DatePicker
                                className="border p-2 w-full"
                                selected={formValues[field.id] || null}
                                onChange={(date) => handleInputChange(field.id, date, field.type, field)}
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
                const colorScheme = getTableColor(field.id);

                return (
                    <div className="mb-4 w-full">
                        <div className={`overflow-x-auto border-2 ${colorScheme.border} rounded-lg`}>
                            <table className="min-w-full bg-white">
                                <thead>
                                    <tr>
                                        <td
                                            colSpan={(field.columns || []).length + 1}
                                            className={`${colorScheme.titleBg} py-2 px-4 border-b ${colorScheme.border}`}
                                        >
                                            <label className="block text-gray-700 text-sm font-bold">
                                                {field.label}
                                            </label>
                                        </td>
                                    </tr>
                                </thead>
                                <thead className={colorScheme.bg}>
                                    <tr>
                                        {(field.columns || []).map((col, idx) => (
                                            <th
                                                key={idx}
                                                className={`py-3 px-4 border-b ${colorScheme.border} text-left font-bold text-gray-700 text-sm`}
                                                style={{ width: col.width || "auto" }}
                                            >
                                                {col.name}
                                            </th>
                                        ))}
                                        <th className={`py-3 px-4 border-b ${colorScheme.border} text-left font-bold text-gray-700 text-sm`} style={{ width: "100px" }}>
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(formValues[field.id] || []).map((row, rowIndex) => (
                                        <tr key={rowIndex} className={`border-b border-gray-200 ${colorScheme.hover}`}>
                                            {(field.columns || []).map((col, colIdx) => (
                                                <td
                                                    key={colIdx}
                                                    className="py-2 px-4 border-b border-gray-200"
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

                                                        if (col.type === "checkbox") {
                                                            // Handle boolean checkbox (single true/false value)
                                                            if (!col.options || col.options.length === 0) {
                                                                return (
                                                                    <div>
                                                                        <input
                                                                            type="checkbox"
                                                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                                            checked={row[col.name] === true || row[col.name] === "true"}
                                                                            onChange={(e) => {
                                                                                const updatedRow = { ...row, [col.name]: e.target.checked };
                                                                                handleGridChange(field.id, rowIndex, col.name, e.target.checked, updatedRow);
                                                                            }}
                                                                            style={{
                                                                                color: col.textColor || "inherit",
                                                                            }}
                                                                        />
                                                                    </div>
                                                                );
                                                            }

                                                            // Handle multi-option checkbox (existing code for checkbox with options)
                                                            return (
                                                                <div>
                                                                    {(col.options || []).map((option) => (
                                                                        <div key={option} className="flex items-center mb-1">
                                                                            <input
                                                                                type="checkbox"
                                                                                id={`${field.id}_${rowIndex}_${col.name}_${option}`}
                                                                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
                                                                                checked={
                                                                                    Array.isArray(row[col.name])
                                                                                        ? row[col.name].includes(option)
                                                                                        : false
                                                                                }
                                                                                onChange={(e) => {
                                                                                    let updatedValues = Array.isArray(row[col.name])
                                                                                        ? [...row[col.name]]
                                                                                        : [];

                                                                                    if (e.target.checked) {
                                                                                        if (!updatedValues.includes(option)) {
                                                                                            updatedValues.push(option);
                                                                                        }
                                                                                    } else {
                                                                                        updatedValues = updatedValues.filter(val => val !== option);
                                                                                    }

                                                                                    const updatedRow = { ...row, [col.name]: updatedValues };
                                                                                    handleGridChange(field.id, rowIndex, col.name, updatedValues, updatedRow);
                                                                                }}
                                                                                style={{
                                                                                    color: col.textColor || "inherit",
                                                                                }}
                                                                            />
                                                                            <label
                                                                                htmlFor={`${field.id}_${rowIndex}_${col.name}_${option}`}
                                                                                className="text-sm text-gray-700 cursor-pointer"
                                                                            >
                                                                                {option}
                                                                            </label>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            );
                                                        }

                                                        if (col.type === "numeric") {
                                                            const currentValue = parseFloat(row[col.name]);
                                                            const isOutOfRange = !isNaN(currentValue) && (
                                                                (col.min !== null && col.min !== undefined && currentValue < col.min) ||
                                                                (col.max !== null && col.max !== undefined && currentValue > col.max)
                                                            );

                                                            return (
                                                                <div>
                                                                    <input
                                                                        type="number"
                                                                        value={row[col.name] || ""}
                                                                        onChange={(e) => {
                                                                            const value = e.target.value;
                                                                            const updatedRow = { ...row, [col.name]: value };

                                                                            // Clear remarks if value is back in range
                                                                            const numValue = parseFloat(value);
                                                                            if (value === "" || isNaN(numValue) ||
                                                                                (col.min === null || col.min === undefined || numValue >= col.min) &&
                                                                                (col.max === null || col.max === undefined || numValue <= col.max)) {
                                                                                updatedRow[`${col.name}_remarks`] = "";
                                                                            }

                                                                            handleGridChange(field.id, rowIndex, col.name, value, updatedRow);
                                                                        }}
                                                                        className={`border rounded px-2 py-1 w-full ${formErrors[`${field.id}_${rowIndex}_${col.name}`] ? "border-red-500" : ""
                                                                            } ${isOutOfRange ? "border-orange-500" : ""}`}
                                                                        style={{
                                                                            color: col.textColor || "inherit",
                                                                            backgroundColor: col.backgroundColor || "inherit",
                                                                        }}
                                                                        step={col.decimal ? "any" : "1"}
                                                                        placeholder={`${col.min !== null ? `Min: ${col.min}` : ""}${col.min !== null && col.max !== null ? ", " : ""
                                                                            }${col.max !== null ? `Max: ${col.max}` : ""}`}
                                                                    />

                                                                    {/* Show out of range warning */}
                                                                    {isOutOfRange && (
                                                                        <div className="text-orange-600 text-xs mt-1">
                                                                            ⚠️ Value outside range ({col.min !== null ? `${col.min}` : ""}
                                                                            {col.min !== null && col.max !== null ? " - " : ""}
                                                                            {col.max !== null ? `${col.max}` : ""}). Remarks required.
                                                                        </div>
                                                                    )}

                                                                    {/* Remarks field for out of range values */}
                                                                    {isOutOfRange && (
                                                                        <textarea
                                                                            placeholder="Please provide remarks for out-of-range value"
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
                                                                            className={`border rounded px-2 py-1 w-full mt-2 text-sm ${formErrors[`${field.id}_${rowIndex}_${col.name}_remarks`] ? "border-red-500" : ""
                                                                                }`}
                                                                            rows="2"
                                                                            required
                                                                        />
                                                                    )}

                                                                    {/* Show constraint info */}
                                                                    {(col.min !== null || col.max !== null || !col.decimal) && !isOutOfRange && (
                                                                        <div className="text-xs text-gray-500 mt-1">
                                                                            {!col.decimal && "Whole number"}
                                                                            {!col.decimal && (col.min !== null || col.max !== null) && ", "}
                                                                            {col.min !== null && col.max !== null
                                                                                ? `Range: ${col.min} - ${col.max}`
                                                                                : col.min !== null
                                                                                    ? `Min: ${col.min}`
                                                                                    : col.max !== null
                                                                                        ? `Max: ${col.max}`
                                                                                        : ""
                                                                            }
                                                                        </div>
                                                                    )}

                                                                    {/* Show validation errors */}
                                                                    {formErrors[`${field.id}_${rowIndex}_${col.name}`] && (
                                                                        <p className="text-red-500 text-xs mt-1">
                                                                            {formErrors[`${field.id}_${rowIndex}_${col.name}`]}
                                                                        </p>
                                                                    )}

                                                                    {/* Show remarks validation error */}
                                                                    {formErrors[`${field.id}_${rowIndex}_${col.name}_remarks`] && (
                                                                        <p className="text-red-500 text-xs mt-1">
                                                                            {formErrors[`${field.id}_${rowIndex}_${col.name}_remarks`]}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            );
                                                        }

                                                        if (col.type === "date") {
                                                            return (
                                                                <div>
                                                                    <div className="flex flex-col gap-1">
                                                                        <DatePicker
                                                                            className="border rounded px-2 py-1 w-full"
                                                                            selected={row[col.name] ? new Date(row[col.name]) : null}
                                                                            onChange={(date) => {
                                                                                const updatedRow = { ...row, [col.name]: date };
                                                                                handleGridChange(field.id, rowIndex, col.name, date, updatedRow);
                                                                            }}
                                                                            dateFormat="dd/MM/yyyy"
                                                                            placeholderText="DD/MM/YYYY"
                                                                            style={{
                                                                                color: col.textColor || "inherit",
                                                                                backgroundColor: col.backgroundColor || "inherit",
                                                                            }}
                                                                        />

                                                                        {/* Show day name below date picker */}
                                                                        <input
                                                                            type="text"
                                                                            className="border rounded px-2 py-1 w-full text-center bg-gray-100 cursor-not-allowed text-xs"
                                                                            value={getDayName(row[col.name])}
                                                                            disabled
                                                                            aria-label="Day of the week"
                                                                        />
                                                                    </div>

                                                                    {/* Show validation error if any */}
                                                                    {formErrors[`${field.id}_${rowIndex}_${col.name}`] && (
                                                                        <p className="text-red-500 text-xs mt-1">
                                                                            {formErrors[`${field.id}_${rowIndex}_${col.name}`]}
                                                                        </p>
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
                                            <td className="py-2 px-4 border-b border-gray-200" style={{ width: "auto" }}>
                                                <button
                                                    type="button"
                                                    onClick={() => removeGridRow(field.id, rowIndex)}
                                                    disabled={(formValues[field.id] || []).length <= (field.min_rows || 0)}
                                                    className={`${(formValues[field.id] || []).length <= (field.min_rows || 0)
                                                        ? 'text-gray-400 cursor-not-allowed'
                                                        : 'text-red-500 hover:text-red-700'
                                                        }`}
                                                    title={
                                                        (formValues[field.id] || []).length <= (field.min_rows || 0)
                                                            ? `Minimum ${field.min_rows} rows required`
                                                            : 'Remove this row'
                                                    }
                                                >
                                                    Remove
                                                </button>
                                            </td>

                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {(formValues[field.id] || []).length < (field.maxRows || Infinity) && (
                            <button
                                type="button"
                                onClick={() => addGridRow(field.id, field.columns)}
                                className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
                                title={`Add Row (${(formValues[field.id] || []).length}/${field.maxRows || '∞'})`}
                            >
                                Add Row {field.maxRows ? `(${(formValues[field.id] || []).length}/${field.maxRows})` : ''}
                            </button>
                        )}

                    </div>
                );

            case "linkedTextbox":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}{" "}
                            {field.required && <span className="text-red-500">*</span>}
                            {linkedDataLoading && (
                                <span className="text-blue-500 text-xs ml-2">
                                    Loading linked data...
                                </span>
                            )}
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-50 ${linkedDataLoading ? 'opacity-60' : ''
                                    }`}
                                value={formValues[field.id] || ""}
                                readOnly={!field.allowManualEntry}
                                onChange={(e) => {
                                    if (field.allowManualEntry) {
                                        NewhandleInputChange(field.id, e.target.value, field.type, field);
                                    }
                                }}
                                placeholder={linkedDataLoading
                                    ? "Loading..."
                                    : `Auto-loaded from ${formData.linkedForm?.name || 'linked form'}`
                                }
                            />

                            {linkedDataLoading && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                </div>
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
        const field = formData.fields.find(f => f.id === fieldId);
        const currentRows = formValues[fieldId] || [];

        if (field.maxRows && currentRows.length >= field.maxRows) {
            alert(`Maximum ${field.maxRows} rows allowed`);
            return;
        }

        const newRow = {};
        columns.forEach(col => {
            if (col.type === "checkbox") {
                if (!col.options || col.options.length === 0) {
                    newRow[col.name] = false;
                } else {
                    newRow[col.name] = [];
                }
            } else if (col.type === "numeric") {
                newRow[col.name] = "";
                newRow[`${col.name}_remarks`] = "";
            } else if (col.type === "date") {
                newRow[col.name] = null; // Initialize as null for date fields
            } else {
                newRow[col.name] = "";
            }
        });

        setFormValues(prev => ({
            ...prev,
            [fieldId]: [...currentRows, newRow]
        }));
    };

    const removeGridRow = (fieldId, rowIndex) => {
        const field = formData.fields.find(f => f.id === fieldId);
        const currentRows = formValues[fieldId] || [];

        // Check if min_rows limit would be violated
        if (field.min_rows && currentRows.length <= field.min_rows) {
            alert(`Minimum ${field.min_rows} rows required`);
            return;
        }

        const updatedRows = currentRows.filter((_, idx) => idx !== rowIndex);
        setFormValues(prev => ({
            ...prev,
            [fieldId]: updatedRows
        }));
    };



    if (loading) return <LoadingDots />;


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
            {renderImageGallery()}
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
                {linkedDataLoading && (
                    <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-3 rounded">
                        <div className="flex items-center">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                            <span className="text-sm">Loading linked data...</span>
                        </div>
                    </div>
                )}
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

            {renderImageModal()}

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
