import { useEffect, useState, useRef, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useParams } from "react-router-dom";
import { APP_CONSTANTS } from "./store";
import LoadingDots from './LoadingDots';
import { useNavigate } from "react-router-dom";
import SignatureCanvas from 'react-signature-canvas';

export default function DynamicForm() {
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formValues, setFormValues] = useState({});
    const [remarks, setRemarks] = useState({});
    const [formErrors, setFormErrors] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [drafts, setDrafts] = useState([]);
    const [rejected, setRejected] = useState([]);
    const [activeTab, setActiveTab] = useState("submitted");
    const [recentSubmissions, setRecentSubmissions] = useState([]);
    const [editingSubmissionId, setEditingSubmissionId] = useState(null);
    const [fontSize, setFontSize] = useState(16); // default 16px
    const updatingLinkedFields = useRef(false);
    const [linkedDataLoading, setLinkedDataLoading] = useState(false);
    const { formId, submissionID } = useParams();
    const [tableColors, setTableColors] = useState({});
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedImageName, setSelectedImageName] = useState('');
    const [userNames, setUserNames] = useState([]);
    const isEditMode = useRef(false); // Add this new ref
    const navigate = useNavigate();
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [activeSignature, setActiveSignature] = useState(null);
    const signaturePadRef = useRef(null);


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

    const submittedSubmissions = recentSubmissions.filter(
        s => s.status !== "Draft"
    );

    const draftSubmissions = recentSubmissions.filter(
        s => s.status === "Draft"
    );

    useEffect(() => {
        console.log("🔐 Authorization check triggered");

        if (!formData) return;

        const allowedAccess = formData.allowToAccess || [];
        console.log("allowToAccess:", allowedAccess);
        console.log("userNames:", userNames);

        // 🔐 If restricted & no user → redirect
        if (allowedAccess.length > 0 && (!userNames || userNames.length === 0)) {
            navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
            return;
        }

        // 🌐 If unrestricted → allow everyone
        if (allowedAccess.length === 0) return;

        const isAuthorized = userNames.some(u =>
            allowedAccess.some(a =>
                a.name?.toLowerCase() === u.toLowerCase()
            )
        );

        if (!isAuthorized) {
            alert("You are not authorized to access this form.");
            navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
        }

    }, [formData, userNames, navigate]);
    useEffect(() => {
        if (showSignatureModal && activeSignature && signaturePadRef.current) {
            // Wait for modal to render
            setTimeout(() => {
                const existing = formValues?.[activeSignature.fieldId]?.[activeSignature.rowIndex]?.[activeSignature.colName];

                if (existing && signaturePadRef.current) {
                    try {
                        signaturePadRef.current.fromDataURL(existing);
                    } catch (err) {
                        console.error("Failed to load signature:", err);
                        signaturePadRef.current.clear();
                    }
                } else if (signaturePadRef.current) {
                    signaturePadRef.current.clear();
                }
            }, 100);
        }
    }, [showSignatureModal, activeSignature]);

    useEffect(() => {
        const fetchFormData = async () => {
            try {
                const response = await fetch(
                    `${APP_CONSTANTS.API_BASE_URL}/api/forms/link/${formId}`
                );
                if (!response.ok) throw new Error("Failed to fetch form data");
                const data = await response.json();
                console.log("Fetched form data:", data);

                // FIX: Process fields BEFORE setting formData
                data.fields.forEach(field => {
                    // Fix column → columns for BOTH grid AND questionGrid
                    if ((field.type === "grid" || field.type === "questionGrid") && !field.columns && field.column) {
                        console.log(`Fixing columns for ${field.type} field:`, field.id);
                        field.columns = field.column;
                        delete field.column; // Remove old property
                    }
                    // Ensure columns is an array with labels
                    if (field.columns) {
                        field.columns = (field.columns || []).map(col => ({
                            ...col,
                            label: col.label || col.name || "",
                            dependentOptions: col.dependentOptions || {}
                        }));
                    }

                    // Parse defaultRows for questionGrid
                    if (field.type === "questionGrid") {
                        if (field.defaultRowsJson && typeof field.defaultRowsJson === 'string') {
                            try {
                                field.defaultRows = JSON.parse(field.defaultRowsJson);
                                console.log("Parsed defaultRows:", field.defaultRows);
                            } catch (e) {
                                console.error("Failed to parse defaultRowsJson:", e);
                                field.defaultRows = [];
                            }
                        } else if (!field.defaultRows) {
                            field.defaultRows = [];
                        }
                    }
                });

                setFormData(data);

                // NOW initialize form values with the corrected data
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
                    } else if (field.type === "grid" || field.type === "questionGrid") {
                        const rows = [];

                        // FOR QUESTIONGRID: Use defaultRows if available
                        if (field.type === "questionGrid" && field.defaultRows && field.defaultRows.length > 0) {
                            console.log("Initializing questionGrid with defaultRows:", field.defaultRows);

                            field.defaultRows.forEach(defaultRow => {
                                const row = {};

                                field.columns.forEach(col => {
                                    // Question column - use fixed:true OR name:"question" as fallback
                                    if (col.fixed === true || col.name === "question") {
                                        row[col.name] = defaultRow.question || "";
                                        console.log(`Setting question column ${col.name} = "${defaultRow.question}"`);
                                    } else if (col.type === "serialNumber") {
                                        // Serial number (calculated dynamically)
                                        row[col.name] = "";
                                    } else if (col.type === "fixedValue") {
                                        // Row-specific fixed value
                                        row[col.name] = (defaultRow.fixedValues && defaultRow.fixedValues[col.name]) || col.labelText || "";
                                        console.log(`Setting fixedValue column ${col.name} = "${row[col.name]}"`);
                                    } else if (col.type === "checkbox") {
                                        row[col.name] = false;
                                    } else if (col.type === "numeric") {
                                        row[col.name] = "";
                                    } else if (col.type === "date") {
                                        row[col.name] = null;
                                    } else {
                                        row[col.name] = "";
                                    }
                                });

                                console.log("Created row:", row);
                                rows.push(row);
                            });

                            console.log("Final initialized rows:", rows);
                        } else {
                            // FOR REGULAR GRID or empty questionGrid: Create empty rows
                            const rowCount = field.initialRows || field.minRows || 1;
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
                        }

                        initialValues[field.id] = rows;
                        console.log(`Initialized ${field.type} with ${rows.length} rows:`, rows);
                    }
                });

                setFormValues(initialValues);
                setRemarks(initialRemarks);
                setLoading(false);

                await fetchRecentSubmissions();
                await loadDrafts();
                await loadRejected();


            } catch (err) {
                setError(err.message || "Failed to fetch form data");
                setLoading(false);
            }
        };

        fetchFormData();
    }, []);

    // Add this new useEffect right after your existing one
    useEffect(() => {
        // Check if submissionID exists in the URL path and formData is loaded

        console.log("Data ", submissionID, formData, editingSubmissionId)
        if (submissionID && formData && !editingSubmissionId) {
            // Only call if we're not already editing a submission
            handleEditSubmission(submissionID);
        }
    }, [submissionID, formData]); // Depend on both submissionID and formData

    useEffect(() => {
        const loadLinkedDataAutomatically = async () => {
            // Prevent infinite loops
            if (updatingLinkedFields.current) return;

            console.log('loadLinkedDataAutomatically called');

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
                    console.log('ðŸ§¹ Not all key fields filled, clearing linked fields');
                    clearLinkedTextboxFields();
                    return;
                }

                // Fetch linked data
                const linkedSubmissions = await fetchLinkedData(formData.keyFieldMappings);

                // Your existing logic for processing submissions...
                const dataArray = linkedSubmissions.data;

                if (!dataArray || !Array.isArray(dataArray) || dataArray.length === 0) {
                    console.log('ðŸ§¹ No data array or empty array, clearing fields');
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
                    console.log('âœ… Found matching submission, populating fields');

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
                    console.log('ðŸ§¹ No matching record found, clearing fields');
                    clearLinkedTextboxFields();
                }
            } catch (error) {
                console.error('âŒ Error in loadLinkedDataAutomatically:', error);
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

    useEffect(() => {
        if (!formData) return;

        setFormValues(prevValues => {
            const updatedValues = { ...prevValues };
            let changed = false;

            formData.fields.forEach((field) => {
                if (field.type === "calculation") {
                    const result = evaluateFormula(field.formula, prevValues);
                    // CRITICAL: Only update if value actually changed
                    if (prevValues[field.id] !== result) {
                        updatedValues[field.id] = result;
                        changed = true;
                    }
                }
                else if (field.type === "grid" && Array.isArray(prevValues[field.id])) {
                    const gridRows = prevValues[field.id].map((row, rowIndex) => {
                        let rowChanged = false;
                        const newRow = { ...row };

                        field.columns.forEach((col) => {
                            if (col.type === "calculation" && col.formula) {
                                const calculatedValue = evaluateRowFormula(col.formula, row);

                                // CRITICAL FIX: Handle NaN and prevent unnecessary updates
                                const currentValue = row[col.name];
                                const isCurrentNaN = typeof currentValue === 'number' && isNaN(currentValue);
                                const isCalculatedNaN = typeof calculatedValue === 'number' && isNaN(calculatedValue);

                                // Only update if values differ (accounting for NaN)
                                if (isCurrentNaN && isCalculatedNaN) {
                                    // Both NaN - no change needed
                                } else if (currentValue !== calculatedValue) {
                                    console.log(`Updating grid calculation: ${col.name} = ${calculatedValue}`);
                                    newRow[col.name] = calculatedValue;
                                    rowChanged = true;
                                }
                            }
                        });

                        return rowChanged ? newRow : row; // Return original if unchanged
                    });

                    // Check if any row actually changed
                    const gridChanged = gridRows.some((row, idx) => row !== prevValues[field.id][idx]);

                    if (gridChanged) {
                        updatedValues[field.id] = gridRows;
                        changed = true;
                    }
                }
            });

            // CRITICAL: Only return new object if something changed
            if (changed) {
                console.log("Updating form values with calculations");
                return updatedValues;
            }

            return prevValues; // Return same reference to prevent re-render
        });
    }, [formData]); // ONLY depend on formData

    // Add this before the useEffect
    useEffect(() => {
        if (!isModalOpen) return;

        const loadData = async () => {
            await loadDrafts();
            await loadRejected();
            await fetchRecentSubmissions();
        };

        loadData();
    }, [isModalOpen]);


    const loadDrafts = async () => {
        const res = await fetch(
            `${APP_CONSTANTS.API_BASE_URL}/api/forms/${formId}/drafts`
        );
        const data = await res.json();

        console.log("DRAFT API RESPONSE:", data);

        setDrafts(data);
    };

    const loadRejected = async () => {
        const res = await fetch(
            `${APP_CONSTANTS.API_BASE_URL}/api/forms/${formId}/rejected`
        );
        const data = await res.json();

        console.log("DRAFT API RESPONSE:", data);

        setRejected(data);
    };

    const clearLinkedTextboxFields = () => {
        console.log('ðŸ§¹ Attempting to clear linked textbox fields');

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
                console.log('âœ… Cleared linked textbox fields');
                return updatedValues;
            } else {
                console.log('â„¹ï¸ No linked textbox fields to clear');
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
                            Ã—
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
    //const handleGridChange = (fieldId, rowIndex, columnName, value, entireRow = null) => {
    //    setFormValues(prev => {
    //        const updatedRows = [...(prev[fieldId] || [])];
    //        const field = formData.fields.find(f => f.id === fieldId);

    //        if (entireRow) {
    //            updatedRows[rowIndex] = entireRow;
    //        } else {
    //            updatedRows[rowIndex] = {
    //                ...updatedRows[rowIndex],
    //                [columnName]: value
    //            };

    //            // Clear dependent fields when parent changes
    //            if (field) {
    //                field.columns.forEach(col => {
    //                    if (col.type === "dependentDropdown" && col.parentColumn === columnName) {
    //                        updatedRows[rowIndex][col.name] = "";
    //                    }
    //                });
    //            }
    //        }


    //        return { ...prev, [fieldId]: updatedRows };
    //    });
    //};

    const handleGridChange = (fieldId, rowIndex, columnName, value, entireRow = null) => {
        setFormValues(prev => {
            const updatedRows = [...(prev[fieldId] || [])];
            const field = formData.fields.find(f => f.id === fieldId);

            if (entireRow) {
                updatedRows[rowIndex] = entireRow;
            } else {
                if (!updatedRows[rowIndex]) {
                    updatedRows[rowIndex] = {};
                }

                updatedRows[rowIndex] = {
                    ...updatedRows[rowIndex],
                    [columnName]: value
                };

                // Handle dependent dropdowns if needed
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
        console.log("Submission ID is ", submissionId)
        setEditingSubmissionId(submissionId);

        try {
            const res = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/submissions/${submissionId}`);
            if (!res.ok) throw new Error("Failed to load submission");
            console.log("Result", res)
            const json = await res.json();
            console.log("Data After Loading ", json)
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

    const handleViewSubmission = (submissionId) => {
        window.open(`/submissions/${submissionId}`, '_blank');
    }

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
        setRecentSubmissions(submissions.slice(0, 20)); // Take only last 10
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
        console.log(formula);
        if (!formula) return "";
        try {
            let expression = formula;
            formData.fields.forEach((field) => {
                const fieldValue = formValues[field.id];
                // Better handling of empty/null values
                let value = 0;
                if (fieldValue !== null && fieldValue !== undefined && fieldValue !== "") {
                    const parsedValue = parseFloat(fieldValue);
                    value = isNaN(parsedValue) ? 0 : parsedValue;
                }

                // Replace by both ID and label (your current approach)
                expression = expression.replaceAll(`{${field.id}}`, value);
                expression = expression.replaceAll(`{${field.label}}`, value);
            });

            return eval(expression);
        } catch (error) {
            console.error("Formula evaluation error:", error);
            return "";
        }
    };

    const evaluateRowFormula = (formula, row) => {
        console.log("evaluateRowFormula called with:", { formula, row });

        if (!formula) return "";

        try {
            let expression = formula;

            // Extract all placeholders from the formula
            const placeholders = formula.match(/\{[^}]+\}/g) || [];
            console.log("Found placeholders:", placeholders);

            // Replace each placeholder
            placeholders.forEach(placeholder => {
                const columnName = placeholder.slice(1, -1); // Remove { and }
                console.log(`Processing placeholder: ${placeholder}, column: ${columnName}`);

                const fieldValue = row[columnName];
                console.log(`Column value:`, fieldValue);

                let value = 0;
                if (fieldValue !== null && fieldValue !== undefined && fieldValue !== "") {
                    const parsedValue = parseFloat(fieldValue);
                    value = isNaN(parsedValue) ? 0 : parsedValue;
                }

                console.log(`Replacing ${placeholder} with ${value}`);
                expression = expression.replaceAll(placeholder, value);
            });

            console.log(`Final expression: ${expression}`);
            const result = eval(expression);
            console.log(`Result: ${result}`);
            return result;
        } catch (error) {
            console.error("Row formula evaluation error:", error);
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
                } else if ((field.type === "dropdown") && (!value || value.trim() === "")) {
                    errors[field.id] = `${field.label} is required`;
                } else if (field.type === "textbox" && (!value || value.trim() === "")) {
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

                        if (col.type === "textbox" && value && typeof value === "string") {
                            const errorKey = `${field.id}_${rowIndex}_${col.name}`;

                            if (col.minLength && value.length < col.minLength) {
                                errors[errorKey] = col.lengthValidationMessage ||
                                    `Minimum ${col.minLength} characters required in row ${rowIndex + 1}`;
                            } else if (col.maxLength && value.length > col.maxLength) {
                                errors[errorKey] = col.lengthValidationMessage ||
                                    `Maximum ${col.maxLength} characters allowed in row ${rowIndex + 1}`;
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
            if (field.type === "textbox" && value && typeof value === "string") {
                if (field.minLength && value.length < field.minLength) {
                    errors[field.id] = field.lengthValidationMessage ||
                        `${field.label} must be at least ${field.minLength} characters`;
                } else if (field.maxLength && value.length > field.maxLength) {
                    errors[field.id] = field.lengthValidationMessage ||
                        `${field.label} must not exceed ${field.maxLength} characters`;
                }
            }
            // Add this check in the validateForm function
            if (field.type === "signature" && field.required) {
                if (!value || value === "") {
                    errors[field.id] = `${field.label} is required`;
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

    const isValidDate = (dateString) => {
        if (!dateString) return false;

        // If it's already a Date object
        if (dateString instanceof Date) {
            return !isNaN(dateString.getTime());
        }

        // If it's a string, try to parse it
        const date = new Date(dateString);
        return !isNaN(date.getTime());
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
    const handleSubmit = async (e, status = "Submitted") => {
        if (e) {
            e.preventDefault();
        }


        const validationErrors = status === "Submitted" ? validateForm() : {};
        setFormErrors(validationErrors);
        setSubmitted(true);

        if (Object.keys(validationErrors).length > 0) return;

        const submissionData = {
            formId: formData.id,
            submissionId: editingSubmissionId,
            submissionData: [],
            status
        };

        const fieldTypes = {};
        formData.fields.forEach(field => {
            fieldTypes[field.id] = field.type;
        });

        Object.keys(formValues).forEach(fieldId => {
            let fieldValue = formValues[fieldId];
            const fieldType = fieldTypes[fieldId];

            // Clean DOM references
            if (fieldValue && typeof fieldValue === "object" && "nodeName" in fieldValue) {
                fieldValue = fieldValue.value || fieldValue.textContent;
            }

            // Process different field types
            if (fieldType === "grid" || fieldType === "questionGrid") {
                if (Array.isArray(fieldValue)) {
                    fieldValue = JSON.stringify(cleanGridData(fieldValue));
                }
            } else if (Array.isArray(fieldValue)) {
                fieldValue = fieldValue.join(", ");
            } else if (fieldTypes[fieldId] === "date" && fieldValue) {
                if (fieldValue instanceof Date) {
                    const year = fieldValue.getFullYear();
                    const month = String(fieldValue.getMonth() + 1).padStart(2, "0");
                    const day = String(fieldValue.getDate()).padStart(2, "0");
                    fieldValue = `${year}-${month}-${day}`;
                } else if (fieldValue === null || fieldValue === undefined) {
                    fieldValue = "";
                } else {
                    fieldValue = String(fieldValue);
                }
            }

            submissionData.submissionData.push({
                fieldLabel: fieldId,
                fieldValue: fieldValue
            });

            if (remarks[fieldId] && remarks[fieldId].trim() !== "") {
                submissionData.submissionData.push({
                    fieldLabel: `${fieldId} Remark`,
                    fieldValue: remarks[fieldId]
                });
            }
        });

        try {
            const payload = JSON.stringify(submissionData);

            // 🔍 DEBUG: Log everything before submitting
            const url = `${APP_CONSTANTS.API_BASE_URL}/api/forms/${formData.id}/submit`;
            console.log("=== SUBMIT DEBUG ===");
            console.log("URL:", url);
            console.log("Payload:", payload);
            console.log("==================");

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: payload,
            });

            // 🔍 DEBUG: Log response details
            console.log("Response Status:", response.status);
            console.log("Response OK:", response.ok);
            console.log("Response Headers:", [...response.headers.entries()]);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("❌ Server Error:", errorText);
                alert(`Error: ${errorText}`);
                return;
            }

            const result = await response.json();
            console.log("✅ Success:", result);
            alert("Form submitted successfully!");
            resetForm();

        } catch (error) {
            console.error("❌ Network Error:", error);
            console.error("Error Name:", error.name);
            console.error("Error Message:", error.message);
            console.error("Error Stack:", error.stack);

            // Better error message
            alert(`Network error. Please check:\n1. Server is running at ${APP_CONSTANTS.API_BASE_URL}\n2. CORS is configured\n3. Check browser console for details`);
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

            case "signature":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}{" "}
                            {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <div className="border-2 border-gray-300 rounded">
                            <SignatureCanvas
                                ref={(ref) => {
                                    if (!window.signaturePads) window.signaturePads = {};
                                    window.signaturePads[field.id] = ref;
                                }}
                                canvasProps={{
                                    width: field.signatureWidth || 400,
                                    height: field.signatureHeight || 200,
                                    className: 'signature-canvas',
                                    style: { backgroundColor: field.backgroundColor || '#ffffff' }
                                }}
                                penColor={field.penColor || '#000000'}
                                onEnd={() => {
                                    const dataUrl = window.signaturePads[field.id]?.toDataURL();
                                    if (dataUrl) {
                                        handleInputChange(field.id, dataUrl, field.type, field);
                                    }
                                }}
                            />
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    window.signaturePads[field.id]?.clear();
                                    handleInputChange(field.id, "", field.type, field);
                                }}
                                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded text-sm"
                            >
                                Clear
                            </button>
                        </div>
                        {formErrors[field.id] && (
                            <p className="text-red-500 text-xs mt-1">
                                {formErrors[field.id]}
                            </p>
                        )}
                    </div>
                );

            // In your input rendering, only add onBlur to bridge fields
            case "textbox":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}
                            {field.required && <span className="text-red-500">*</span>}
                        </label>

                        <textarea
                            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${formErrors[field.id] ? "border-red-500" : ""
                                }`}
                            value={formValues[field.id] || ""}
                            onChange={(e) => {
                                const value = e.target.value;

                                // Handle character length validation
                                let errorMessage = "";

                                if (field.minLength && value.length < field.minLength) {
                                    errorMessage = field.lengthValidationMessage ||
                                        `Minimum ${field.minLength} characters required`;
                                } else if (field.maxLength && value.length > field.maxLength) {
                                    errorMessage = field.lengthValidationMessage ||
                                        `Maximum ${field.maxLength} characters allowed`;
                                }

                                // Update form values
                                handleInputChange(field.id, value, field.type, field);

                                // Set or clear validation error
                                if (errorMessage) {
                                    setFormErrors(prev => ({ ...prev, [field.id]: errorMessage }));
                                } else {
                                    setFormErrors(prev => {
                                        const newErrors = { ...prev };
                                        delete newErrors[field.id];
                                        return newErrors;
                                    });
                                }
                            }}
                            // Only add onBlur if this is a bridge field
                            {...(isBridgeField(field.id) && {
                                onBlur: () => handleBridgeFieldBlur(field.id)
                            })}
                            placeholder={
                                field.minLength || field.maxLength
                                    ? `${field.minLength || 0}-${field.maxLength || 'âˆž'} characters`
                                    : `Enter ${field.label}`
                            }
                            rows="1"
                            minLength={field.minLength || undefined}
                            maxLength={field.maxLength || undefined}
                        />

                        {/* Character count display */}
                        {(field.minLength || field.maxLength) && (
                            <div className="text-xs text-gray-500 mt-1 flex justify-between">
                                <span>
                                    Characters: {(formValues[field.id] || "").length}
                                    {field.maxLength ? `/${field.maxLength}` : ''}
                                </span>
                                {field.minLength && (
                                    <span>
                                        Minimum: {field.minLength}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Show validation error */}
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
                            value={evaluateFormula(field.formula)}  // ðŸ‘ˆ Result is computed here
                            readOnly
                        />
                    </div>
                );

            case "grid":
                const colorScheme = getTableColor(field.id);

                // Filter to get only visible columns
                const visibleColumns = (field.columns || []).filter(col => col.visible !== false);

                console.log("Visible Columns", visibleColumns);

                return (
                    <div className="mb-4 w-full">
                        <div className={`overflow-x-auto border-2 ${colorScheme.border} rounded-lg`}>
                            <table className="min-w-full bg-white">
                                <thead>
                                    <tr>
                                        <td
                                            colSpan={visibleColumns.length + 1}
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
                                        {visibleColumns.map((col, idx) => (
                                            <th
                                                key={idx}
                                                className={`py-3 px-4 border-b ${colorScheme.border} text-left font-bold text-gray-700 text-sm`}
                                                style={{ width: col.width || "auto" }}
                                            >
                                                {col.name}
                                            </th>
                                        ))}
                                        {visibleColumns.length > 0 && (
                                            <th className={`py-3 px-4 border-b ${colorScheme.border} text-left font-bold text-gray-700 text-sm`} style={{ width: "100px" }}>
                                                Actions
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(formValues[field.id] || []).map((row, rowIndex) => {
                                        // Auto-populate hidden/disabled columns before rendering
                                        (field.columns || []).forEach(col => {
                                            if (col.visible === false || col.disabled === true) {
                                                if (col.type === "dropdown" && (col.options || []).length > 0 && !row[col.name]) {
                                                    row[col.name] = col.options[0];
                                                } else if (col.type === "dependentDropdown") {
                                                    const parentValue = row[col.parentColumn] || "";
                                                    const dependentOptions = parentValue ? (col.dependentOptions?.[parentValue] || []) : [];
                                                    if (dependentOptions.length > 0 && !row[col.name]) {
                                                        row[col.name] = dependentOptions[0];
                                                    }
                                                }
                                            }
                                        });

                                        return (
                                            <tr key={rowIndex} className={`border-b border-gray-200 ${colorScheme.hover}`}>
                                                {visibleColumns.map((col, colIdx) => (
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

                                                            const isDisabled = col.disabled === true;

                                                            if (col.type === "calculation") {
                                                                console.log(`Calculating field: ${col.name}`);
                                                                console.log(`Formula: ${col.formula}`);
                                                                console.log(`Row data:`, row);
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

                                                            if (col.type === "label") {
                                                                return (
                                                                    <div
                                                                        className={`w-full p-2 min-h-[36px] flex items-center ${col.labelStyle === 'bold' ? 'font-bold' :
                                                                            col.labelStyle === 'italic' ? 'italic' :
                                                                                col.labelStyle === 'underline' ? 'underline' :
                                                                                    'font-normal'
                                                                            } ${col.textAlign === 'center' ? 'justify-center' :
                                                                                col.textAlign === 'right' ? 'justify-end' :
                                                                                    'justify-start'
                                                                            }`}
                                                                        style={{
                                                                            color: col.textColor || 'inherit',
                                                                            backgroundColor: col.backgroundColor || 'inherit'
                                                                        }}
                                                                    >
                                                                        {col.labelText || 'Label Text'}
                                                                    </div>
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

                                                            if (col.type === "textbox") {
                                                                return (
                                                                    <div>
                                                                        <input
                                                                            type="text"
                                                                            value={row[col.name] || ""}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value;

                                                                                // Check character length validation
                                                                                let isValid = true;
                                                                                let errorMessage = "";

                                                                                if (col.minLength && value.length < col.minLength) {
                                                                                    isValid = false;
                                                                                    errorMessage = col.lengthValidationMessage ||
                                                                                        `Minimum ${col.minLength} characters required`;
                                                                                } else if (col.maxLength && value.length > col.maxLength) {
                                                                                    isValid = false;
                                                                                    errorMessage = col.lengthValidationMessage ||
                                                                                        `Maximum ${col.maxLength} characters allowed`;
                                                                                }

                                                                                // Update the value
                                                                                handleGridChange(field.id, rowIndex, col.name, value);

                                                                                // Set validation error if needed
                                                                                if (!isValid) {
                                                                                    setFormErrors(prev => ({
                                                                                        ...prev,
                                                                                        [`${field.id}_${rowIndex}_${col.name}`]: errorMessage
                                                                                    }));
                                                                                } else {
                                                                                    // Clear validation error
                                                                                    setFormErrors(prev => {
                                                                                        const newErrors = { ...prev };
                                                                                        delete newErrors[`${field.id}_${rowIndex}_${col.name}`];
                                                                                        return newErrors;
                                                                                    });
                                                                                }
                                                                            }}
                                                                            disabled={isDisabled}
                                                                            className={`border rounded px-2 py-1 w-full ${formErrors[`${field.id}_${rowIndex}_${col.name}`] ? "border-red-500" : ""
                                                                                } ${isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                                                                            style={{
                                                                                color: col.textColor || "inherit",
                                                                                backgroundColor: isDisabled ? '#f3f4f6' : (col.backgroundColor || "inherit"),
                                                                            }}
                                                                            minLength={col.minLength || undefined}
                                                                            maxLength={col.maxLength || undefined}
                                                                            placeholder={
                                                                                col.minLength || col.maxLength
                                                                                    ? `${col.minLength || 0}-${col.maxLength || '∞'} chars`
                                                                                    : `Enter ${col.name}`
                                                                            }
                                                                        />

                                                                        {/* Character count display */}
                                                                        {(col.minLength || col.maxLength) && (
                                                                            <div className="text-xs text-gray-500 mt-1">
                                                                                {(row[col.name] || "").length}/{col.maxLength || '∞'} characters
                                                                                {col.minLength && (
                                                                                    <span className="ml-2">
                                                                                        (Min: {col.minLength})
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* Show validation error */}
                                                                        {formErrors[`${field.id}_${rowIndex}_${col.name}`] && (
                                                                            <p className="text-red-500 text-xs mt-1">
                                                                                {formErrors[`${field.id}_${rowIndex}_${col.name}`]}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            }

                                                            if (col.type === "dependentDropdown") {
                                                                const parentValue = row[col.parentColumn] || "";
                                                                const dependentOptions = parentValue ? (col.dependentOptions?.[parentValue] || []) : [];

                                                                // Auto-select first value when field has options
                                                                if (dependentOptions.length > 0 && !row[col.name]) {
                                                                    setTimeout(() => {
                                                                        const firstValue = dependentOptions[0];
                                                                        const updatedRow = { ...row, [col.name]: firstValue };
                                                                        handleGridChange(field.id, rowIndex, col.name, firstValue, updatedRow);
                                                                    }, 0);
                                                                }

                                                                // Check if the selected option requires remarks
                                                                const selectedValue = row[col.name] || "";
                                                                const remarksKey = `${parentValue}:${selectedValue}`;
                                                                const requiresRemarks = selectedValue && (col.remarksOptions || []).includes(remarksKey);
                                                                const remarksFieldName = `${col.name}_remarks`;

                                                                return (
                                                                    <div>
                                                                        <select
                                                                            value={selectedValue}
                                                                            onChange={(e) => {
                                                                                const newValue = e.target.value;
                                                                                const updatedRow = { ...row, [col.name]: newValue };
                                                                                // Clear remarks if the new selection doesn't require it
                                                                                const newRemarksKey = `${parentValue}:${newValue}`;
                                                                                if (!(col.remarksOptions || []).includes(newRemarksKey)) {
                                                                                    updatedRow[remarksFieldName] = "";
                                                                                }
                                                                                handleGridChange(field.id, rowIndex, col.name, newValue, updatedRow);
                                                                            }}
                                                                            disabled={!parentValue || isDisabled}
                                                                            className={`border rounded px-2 py-1 w-full ${isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                                                                                }`}
                                                                            style={{
                                                                                color: col.textColor || "inherit",
                                                                                backgroundColor: isDisabled ? '#f3f4f6' : (col.backgroundColor || "inherit")
                                                                            }}
                                                                        >
                                                                            <option value="">Select {col.name}</option>
                                                                            {dependentOptions.map((opt, i) => (
                                                                                <option key={i} value={opt}>
                                                                                    {opt}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                        {selectedValue && (
                                                                            <div className="text-xs text-gray-600 mt-1">
                                                                                You selected: <span className="font-semibold">{selectedValue}</span>
                                                                            </div>
                                                                        )}
                                                                        {requiresRemarks && (
                                                                            <div className="mt-2">
                                                                                <label className="block text-xs text-gray-700 mb-1">
                                                                                    Remarks <span className="text-red-500">*</span>
                                                                                </label>
                                                                                <textarea
                                                                                    value={row[remarksFieldName] || ""}
                                                                                    onChange={(e) => {
                                                                                        const remarksValue = e.target.value;
                                                                                        const updatedRow = { ...row, [remarksFieldName]: remarksValue };
                                                                                        handleGridChange(field.id, rowIndex, remarksFieldName, remarksValue, updatedRow);
                                                                                    }}
                                                                                    placeholder="Enter remarks..."
                                                                                    disabled={isDisabled}
                                                                                    required
                                                                                    className={`border rounded px-2 py-1 w-full text-sm ${isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                                                                                        }`}
                                                                                    rows="2"
                                                                                />
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
                                                                            disabled={isDisabled}
                                                                            className={`border rounded px-2 py-1 w-full ${isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                                                                                }`}
                                                                            style={{
                                                                                color: col.textColor || "inherit",
                                                                                backgroundColor: isDisabled ? '#f3f4f6' : (col.backgroundColor || "inherit"),
                                                                            }}
                                                                        >
                                                                            <option value="">Select {col.name}</option>
                                                                            {(col.options || []).map((opt, i) => (
                                                                                <option key={i} value={opt}>
                                                                                    {opt}
                                                                                </option>
                                                                            ))}
                                                                        </select>

                                                                        {/* Remarks field appears only if selected option requires it */}
                                                                        {col.remarksOptions?.includes(row[col.name]) && (
                                                                            <input
                                                                                type="text"
                                                                                required
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
                                                                                disabled={isDisabled}
                                                                                className={`border rounded px-2 py-1 w-full mt-2 ${isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                                                                                    }`}
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

                                                            if (col.type === "signature") {
                                                                return (
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        {row[col.name] ? (
                                                                            <img
                                                                                src={row[col.name]}
                                                                                alt="signature"
                                                                                className="h-16 border rounded"
                                                                            />
                                                                        ) : (
                                                                            <span className="text-gray-400 text-xs">No Signature</span>
                                                                        )}

                                                                        <button
                                                                            type="button"
                                                                            className="text-blue-600 text-xs underline"
                                                                            onClick={(e) => {
                                                                                e.preventDefault(); // Prevent form submission
                                                                                e.stopPropagation(); // Stop event bubbling
                                                                                setActiveSignature({
                                                                                    fieldId: field.id,
                                                                                    rowIndex,
                                                                                    colName: col.name
                                                                                });
                                                                                setShowSignatureModal(true);
                                                                            }}
                                                                        >
                                                                            {row[col.name] ? "Edit" : "Sign"}
                                                                        </button>
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
                                                                                disabled={isDisabled}
                                                                                style={{
                                                                                    color: col.textColor || "inherit",
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    );
                                                                }

                                                                // Handle multi-option checkbox
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
                                                                                    disabled={isDisabled}
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
                                                                            disabled={isDisabled}
                                                                            className={`border rounded px-2 py-1 w-full ${formErrors[`${field.id}_${rowIndex}_${col.name}`] ? "border-red-500" : ""
                                                                                } ${isOutOfRange ? "border-orange-500" : ""} ${isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                                                                                }`}
                                                                            style={{
                                                                                color: col.textColor || "inherit",
                                                                                backgroundColor: isDisabled ? '#f3f4f6' : (col.backgroundColor || "inherit"),
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
                                                                                disabled={isDisabled}
                                                                                className={`border rounded px-2 py-1 w-full mt-2 text-sm ${formErrors[`${field.id}_${rowIndex}_${col.name}_remarks`] ? "border-red-500" : ""
                                                                                    } ${isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
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
                                                                                disabled={isDisabled}
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
                                                                        disabled={isDisabled}
                                                                        className={`border rounded px-2 py-1 w-full ${formErrors[`${field.id}_${rowIndex}_${col.name}`] ? "border-red-500" : ""
                                                                            } ${isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
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
                                                )
                                                )}
                                                {visibleColumns.length > 0 && (
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
                                                )}
                                            </tr>
                                        );
                                    })}
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

            case "questionGrid": {
                const colorScheme = getTableColor(field.id);

                console.log("=== QUESTIONGRID DEBUG ===");
                console.log("allowEditQuestions:", field.allowEditQuestions);
                console.log("Columns:", field.columns);
                console.log("Fixed columns:", field.columns.filter(c => c.fixed === true));
                console.log("Question columns (by name):", field.columns.filter(c => c.name === "question"));
                console.log("DefaultRows:", field.defaultRows);
                console.log("formValues for this field:", formValues[field.id]);

                return (
                    <div
                        key={field.id}
                        className={`mb-4 ${field.width || "w-full"}`}
                        style={{ fontSize: `${fontSize}px` }}
                    >
                        <div className={`overflow-x-auto border-2 ${colorScheme.border} rounded-lg`}>
                            <table className="min-w-full bg-white">
                                {/* Title Row */}
                                <thead>
                                    <tr>
                                        <td
                                            colSpan={field.columns.length + (field.allowAddRows === true ? 1 : 0)}
                                            className={`${colorScheme.titleBg} py-2 px-4 border-b ${colorScheme.border}`}
                                        >
                                            <label className="block text-gray-700 text-sm font-bold">
                                                {field.label}
                                                {field.required && <span className="text-red-500 ml-1">*</span>}
                                            </label>
                                        </td>
                                    </tr>
                                </thead>

                                {/* Column Headers */}
                                <thead className={colorScheme.bg}>
                                    <tr>
                                        {field.columns.map((col, idx) => (
                                            <th
                                                key={idx}
                                                className={`py-3 px-4 border-b ${colorScheme.border} text-left font-bold text-gray-700 text-sm`}
                                                style={{ width: col.width || "auto" }}
                                            >
                                                {col.label || col.name}
                                                {col.required && <span className="text-red-500 ml-1">*</span>}
                                            </th>
                                        ))}
                                        {field.allowAddRows === true && (
                                            <th className={`py-3 px-4 border-b ${colorScheme.border} text-center font-bold text-gray-700 text-sm w-24`}>
                                                Actions
                                            </th>
                                        )}
                                    </tr>
                                </thead>

                                {/* Data Rows */}
                                <tbody>
                                    {(formValues[field.id] || []).map((row, rowIndex) => (
                                        <tr key={rowIndex} className={`border-b border-gray-200 ${colorScheme.hover}`}>
                                            {field.columns.map((col, colIdx) => (
                                                <td
                                                    key={colIdx}
                                                    className="py-2 px-4 border-b border-gray-200"
                                                    style={{ width: col.width || "auto" }}
                                                >
                                                    {/* SERIAL NUMBER - Auto-generated */}
                                                    {col.type === "serialNumber" && (
                                                        <div className="px-2 py-1 text-center font-medium text-gray-700 bg-gray-50 rounded">
                                                            {rowIndex + 1}
                                                        </div>
                                                    )}

                                                    {/* FIXED VALUE - From row data or column default */}
                                                    {col.type === "fixedValue" && (
                                                        <div className="px-2 py-1 font-medium text-gray-700 bg-blue-50 rounded border border-blue-200">
                                                            {row[col.name] || col.labelText || ""}
                                                        </div>
                                                    )}

                                                    {/* QUESTION COLUMN - Use fixed:true OR name:"question" as fallback */}
                                                    {(col.fixed === true || col.name === "question") && col.type === "textbox" && (
                                                        field.allowEditQuestions === false ? (
                                                            <div className="px-3 py-2 bg-yellow-50 rounded border border-yellow-300">
                                                                <span className="text-gray-800 font-medium">{row[col.name] || ""}</span>
                                                            </div>
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={row[col.name] || ""}
                                                                onChange={(e) => handleGridChange(field.id, rowIndex, col.name, e.target.value)}
                                                                placeholder="Enter question..."
                                                                className="border rounded px-2 py-1 w-full"
                                                                required={col.required}
                                                            />
                                                        )
                                                    )}

                                                    {/* TEXTBOX COLUMN - NOT the question column */}
                                                    {col.fixed !== true && col.name !== "question" && col.type === "textbox" && (
                                                        col.disable ? (
                                                            <div className="px-2 py-1 bg-gray-50 rounded border text-gray-700">
                                                                {row[col.name] || col.labelText || ""}
                                                            </div>
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={row[col.name] || ""}
                                                                onChange={(e) => handleGridChange(field.id, rowIndex, col.name, e.target.value)}
                                                                placeholder="Enter text..."
                                                                className="border rounded px-2 py-1 w-full"
                                                                required={col.required}
                                                                disabled={col.disable}
                                                            />
                                                        )
                                                    )}

                                                    {/* NUMERIC COLUMN */}
                                                    {col.type === "numeric" && (
                                                        <input
                                                            type="number"
                                                            value={row[col.name] || ""}
                                                            onChange={(e) => handleGridChange(field.id, rowIndex, col.name, e.target.value)}
                                                            min={col.min}
                                                            max={col.max}
                                                            step={col.decimal ? "0.01" : "1"}
                                                            placeholder="Enter number..."
                                                            className="border rounded px-2 py-1 w-full"
                                                            required={col.required}
                                                            disabled={col.disable}
                                                        />
                                                    )}

                                                    {col.type === "signature" && (
                                                        <div className="flex flex-col items-center gap-1">

                                                            {row[col.name] ? (
                                                                <img
                                                                    src={row[col.name]}
                                                                    alt="signature"
                                                                    className="h-16 border rounded"
                                                                />
                                                            ) : (
                                                                <span className="text-gray-400 text-xs">No Signature</span>
                                                            )}

                                                            <button
                                                                type="button"
                                                                className="text-blue-600 text-xs underline"
                                                                onClick={() => {
                                                                    setActiveSignature({
                                                                        fieldId: field.id,
                                                                        rowIndex,
                                                                        colName: col.name
                                                                    });
                                                                    setShowSignatureModal(true);
                                                                }}
                                                            >
                                                                {row[col.name] ? "Edit" : "Sign"}
                                                            </button>

                                                        </div>
                                                    )}



                                                    {/* DROPDOWN COLUMN */}
                                                    {col.type === "dropdown" && (
                                                        <select
                                                            value={row[col.name] || ""}
                                                            onChange={(e) => handleGridChange(field.id, rowIndex, col.name, e.target.value)}
                                                            className="border rounded px-2 py-1 w-full text-sm"
                                                            required={col.required}
                                                            disabled={col.disable}
                                                        >
                                                            <option value="">Select...</option>
                                                            {(col.options || []).map((option, optIdx) => (
                                                                <option key={optIdx} value={option}>{option}</option>
                                                            ))}
                                                        </select>
                                                    )}

                                                    {/* CHECKBOX COLUMN */}
                                                    {col.type === "checkbox" && (
                                                        <div className="flex justify-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={row[col.name] === true || row[col.name] === "true"}
                                                                onChange={(e) => handleGridChange(field.id, rowIndex, col.name, e.target.checked)}
                                                                disabled={col.disable}
                                                                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* DATE COLUMN */}
                                                    {col.type === "date" && (
                                                        <DatePicker
                                                            selected={row[col.name] ? new Date(row[col.name]) : null}
                                                            onChange={(date) => handleGridChange(field.id, rowIndex, col.name, date)}
                                                            dateFormat="dd/MM/yyyy"
                                                            placeholderText="Select date"
                                                            className="border rounded px-2 py-1 w-full"
                                                            required={col.required}
                                                            disabled={col.disable}
                                                        />
                                                    )}

                                                    {/* TIME COLUMN */}
                                                    {col.type === "time" && (
                                                        <input
                                                            type="time"
                                                            value={row[col.name] || ""}
                                                            onChange={(e) => handleGridChange(field.id, rowIndex, col.name, e.target.value)}
                                                            className="border rounded px-2 py-1 w-full"
                                                            required={col.required}
                                                            disabled={col.disable}
                                                        />
                                                    )}
                                                </td>
                                            ))}

                                            {/* Actions Column */}
                                            {field.allowAddRows === true && (
                                                <td className="py-2 px-4 border-b border-gray-200 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeGridRow(field.id, rowIndex)}
                                                        disabled={(formValues[field.id] || []).length <= (field.minRows || 1)}
                                                        className={`${(formValues[field.id] || []).length <= (field.minRows || 1)
                                                            ? "text-gray-400 cursor-not-allowed"
                                                            : "text-red-500 hover:text-red-700"
                                                            } text-sm font-medium`}
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Add Question Button */}
                        {field.allowAddRows === true &&
                            (formValues[field.id] || []).length < (field.maxRows || Infinity) && (
                                <button
                                    type="button"
                                    onClick={() => addGridRow(field.id, field.columns)}
                                    className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm"
                                >
                                    Add Question ({(formValues[field.id] || []).length}/{field.maxRows || "∞"})
                                </button>
                            )}

                        {formErrors[field.id] && (
                            <span className="text-red-500 text-xs mt-1">{formErrors[field.id]}</span>
                        )}
                    </div>
                );
            }

            default:
                return null;
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
            } else if (col.type === "label") {
                // Labels don't need initialization as they display static text
                newRow[col.name] = "";
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


                    <div className="mt-8 flex flex-wrap items-center gap-4">
                        {/* Primary Action */}
                        <button
                            type="submit"
                            className="
            bg-blue-600 hover:bg-blue-700
            text-white font-semibold
            py-2.5 px-6 rounded-md
            shadow-sm
            focus:outline-none focus:ring-2 focus:ring-blue-400
        "
                        >
                            Submit
                        </button>

                        {/* Secondary Action */}
                        <button
                            type="button"
                            onClick={() => handleSubmit(null, "Draft")}
                            className="
            bg-gray-100 hover:bg-gray-200
            text-gray-800 font-medium
            py-2.5 px-6 rounded-md
            border border-gray-300
            focus:outline-none focus:ring-2 focus:ring-gray-300
        "
                        >
                            Save Draft
                        </button>

                        {/* Utility Action */}
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="
            bg-green-600 hover:bg-green-700
            text-white font-medium
            py-2.5 px-6 rounded-md
            shadow-sm
            focus:outline-none focus:ring-2 focus:ring-green-400
        "
                        >
                            View Last 20 Submissions
                        </button>
                    </div>
                </div>
            </form>

            {renderImageModal()}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-4xl relative">

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h2 className="text-xl font-semibold">Submissions</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-500 hover:text-gray-800 text-2xl font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b px-6">
                            <button
                                onClick={() => setActiveTab("submitted")}
                                className={`py-2 px-4 font-medium border-b-2 transition
                        ${activeTab === "submitted"
                                        ? "border-blue-600 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700"}
                    `}
                            >
                                Submitted
                            </button>

                            <button
                                onClick={() => setActiveTab("draft")}
                                className={`py-2 px-4 font-medium border-b-2 transition
                        ${activeTab === "draft"
                                        ? "border-blue-600 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700"}
                    `}
                            >
                                Drafts
                            </button>

                            <button
                                onClick={() => setActiveTab("rejected")}
                                className={`py-2 px-4 font-medium border-b-2 transition
                        ${activeTab === "rejected"
                                        ? "border-blue-600 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700"}
                    `}
                            >
                                Rejected
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 max-h-[70vh] overflow-y-auto">

                            {/* ---------------- SUBMITTED TAB ---------------- */}
                            {activeTab === "submitted" && (
                                submittedSubmissions.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full border border-gray-300">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="py-2 px-4 border-b">ID</th>
                                                    <th className="py-2 px-4 border-b">Submitted At</th>
                                                    <th className="py-2 px-4 border-b">Status</th>
                                                    <th className="py-2 px-4 border-b">Actions</th>
                                                    <th className="py-2 px-4 border-b">View</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {submittedSubmissions.map(submission => (
                                                    <tr key={submission.id} className="hover:bg-gray-50">
                                                        <td className="py-2 px-4 border-b">{submission.id}</td>
                                                        <td className="py-2 px-4 border-b">
                                                            {new Date(submission.submittedAt).toLocaleString()}
                                                        </td>
                                                        <td className="py-2 px-4 border-b font-semibold">
                                                            <span
                                                                className={
                                                                    submission.status === "Approved"
                                                                        ? "text-green-600"
                                                                        : submission.status === "Pending"
                                                                            ? "text-yellow-600"
                                                                            : "text-red-600"
                                                                }
                                                            >
                                                                {submission.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-4 border-b">
                                                            {submission.status === "Pending" && (
                                                                <button
                                                                    className="text-blue-600 hover:underline"
                                                                    onClick={() => handleEditSubmission(submission.id)}
                                                                >
                                                                    Edit
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-4 border-b">
                                                            <button
                                                                className="text-blue-600 hover:underline"
                                                                onClick={() => handleViewSubmission(submission.id)}
                                                            >
                                                                View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center">
                                        No submitted submissions.
                                    </p>
                                )
                            )}

                            {/* ---------------- DRAFT TAB ---------------- */}
                            {activeTab === "draft" && (
                                drafts.length > 0 ? (
                                    <table className="min-w-full border border-gray-300">
                                        <thead>
                                            <tr>
                                                <th className="py-2 px-4 border-b">Draft ID</th>
                                                <th className="py-2 px-4 border-b">Last Saved</th>
                                                <th className="py-2 px-4 border-b">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {drafts.map(draft => (
                                                <tr key={draft.id}>
                                                    <td className="py-2 px-4 border-b">{draft.id}</td>
                                                    <td className="py-2 px-4 border-b">
                                                        {new Date(draft.submittedAt).toLocaleString()}
                                                    </td>
                                                    <td className="py-2 px-4 border-b">
                                                        <button
                                                            className="text-blue-600 hover:underline"
                                                            onClick={() => {
                                                                handleEditSubmission(draft.id);
                                                                setIsModalOpen(false);
                                                            }}
                                                        >
                                                            Resume
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-gray-500 text-center">No drafts available.</p>
                                )
                            )}

                            {/* ---------------- Rejected TAB ---------------- */}
                            {activeTab === "rejected" && (
                                rejected.length > 0 ? (
                                    <table className="min-w-full border border-gray-300">
                                        <thead>
                                            <tr>
                                                <th className="py-2 px-4 border-b">Draft ID</th>
                                                <th className="py-2 px-4 border-b">Last Saved</th>
                                                <th className="py-2 px-4 border-b">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rejected.map(rejected => (
                                                <tr key={rejected.id}>
                                                    <td className="py-2 px-4 border-b">{rejected.id}</td>
                                                    <td className="py-2 px-4 border-b">
                                                        {new Date(rejected.submittedAt).toLocaleString()}
                                                    </td>
                                                    <td className="py-2 px-4 border-b">
                                                        <button
                                                            className="text-blue-600 hover:underline"
                                                            onClick={() => {
                                                                handleEditSubmission(rejected.id);
                                                                setIsModalOpen(false);
                                                            }}
                                                        >
                                                            Edit
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                        <p className="text-gray-500 text-center">No rejected available.</p>
                                )
                            )}

                        </div>
                    </div>
                </div>
            )}

            {showSignatureModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">

                    <div className="bg-white rounded-lg p-4 w-[400px]">

                        <h2 className="text-lg font-semibold mb-2">
                            Sign Below
                        </h2>

                        <div className="border">

                            <SignatureCanvas
                                ref={signaturePadRef}
                                penColor="black"
                                canvasProps={{
                                    width: 360,
                                    height: 180,
                                    className: "w-full"
                                }}
                            />

                        </div>

                        <div className="flex justify-between mt-3">

                            <button
                                onClick={() => signaturePadRef.current.clear()}
                                className="text-gray-600"
                            >
                                Clear
                            </button>

                            <div className="flex gap-2">

                                <button
                                    onClick={() => setShowSignatureModal(false)}
                                    className="px-3 py-1 border rounded"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={() => {
                                        const dataUrl =
                                            signaturePadRef.current.toDataURL();

                                        handleGridChange(
                                            activeSignature.fieldId,
                                            activeSignature.rowIndex,
                                            activeSignature.colName,
                                            dataUrl
                                        );

                                        setShowSignatureModal(false);
                                    }}
                                    className="px-3 py-1 bg-blue-600 text-white rounded"
                                >
                                    Save
                                </button>

                            </div>

                        </div>
                    </div>

                </div>
            )}

        </div>
    );
}