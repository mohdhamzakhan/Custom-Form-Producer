import React, { useState, useEffect, useRef } from "react";
import { Plus, GripVertical, X, Save, User, Users, ChevronUp, ChevronDown, Copy } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Layout from "./Layout"
import { useParams } from 'react-router-dom';
import useAdSearch from "./hooks/useAdSearch";
import { APP_CONSTANTS } from "./store";
import DateFieldDesigner from './DateFieldDesigner';

// Function to generate a GUID
const generateGuid = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

// Define the drag item type
const ITEM_TYPE = "FORM_FIELD";
const APPROVER_ITEM_TYPE = "APPROVER";

const FormBuilder = () => {
    const [formFields, setFormFields] = useState([]);
    const [formName, setFormName] = useState("");
    const [loading, setLoading] = useState(true);
    const [approvers, setApprovers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    /* const [searchResults, setSearchResults] = useState([]);*/
    /*  const [isSearching, setIsSearching] = useState(false);*/
    const [showApprovalConfig, setShowApprovalConfig] = useState(false);
    const [formId, setFormId] = useState(null);
    const { formLink } = useParams();
    const [originalFormLink, setOriginalFormLink] = useState("");
    const { searchResults, isSearching, error, searchAdDirectory } = useAdSearch();


    // New state for copy format feature
    const [showCopyFormat, setShowCopyFormat] = useState(false);
    const [copyFormLink, setCopyFormLink] = useState("");
    const [availableForms, setAvailableForms] = useState([]);
    const [loadingForms, setLoadingForms] = useState(false);



    useEffect(() => {
        fetchFormLayout();
        fetchAvailableForms();
    }, []);

    useEffect(() => {
        const savedForm = localStorage.getItem("formBuilderFields");
        if (savedForm) {
            setFormFields(JSON.parse(savedForm));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("formBuilderFields", JSON.stringify(formFields));
    }, [formFields]);

    useEffect(() => {
        if (searchTerm.length >= 3) {
            searchAdDirectory(searchTerm);
        }
    }, [searchTerm, searchAdDirectory]);


    const fetchAvailableForms = async () => {
        setLoadingForms(true);
        try {
            const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms`);
            if (response.ok) {
                const forms = await response.json();
                setAvailableForms(forms);
            }
        } catch (error) {
            console.error("Error fetching available forms:", error);
        } finally {
            setLoadingForms(false);
        }
    };

    const copyFormatFromForm = async (sourceFormLink) => {
        if (!sourceFormLink) {
            alert("Please enter a form link to copy from.");
            return;
        }

        try {
            const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/form-builder/link/${encodeURIComponent(sourceFormLink)}`);
            let data;

            try {
                data = await response.json();
            } catch (jsonErr) {
                const text = await response.text();
                console.error("Non-JSON error from API:", text);
                alert("Failed to load form format. Check console for details.");
                return;
            }

            // Transform the fields similar to fetchFormLayout but generate new IDs
            const transformedFields = (data.fields || []).map((field, index) => {
                const isGrid = field.type === "grid";

                return {
                    ...field,
                    id: generateGuid(), // Generate new ID to avoid conflicts
                    order: index, // Reset order
                    columns: isGrid
                        ? (field.column || field.columns || []).map(col => ({
                            ...col,
                            type: col.type || "textbox",
                            name: col.name || "",
                            id: generateGuid(), // New ID for columns too
                            width: col.width || "1fr",
                            options: col.options || [],
                            textColor: col.textColor || "#000000",
                            backgroundColor: col.backgroundColor || "#ffffff",
                            formula: col.formula || "",
                            min: col.min ?? null,
                            max: col.max ?? null,
                            decimal: col.decimal ?? null,
                            parentColumn: col.parentColumn || "",
                            dependentOptions: col.dependentOptions || {},
                            startTime: col.startTime || "",
                            endTime: col.endTime || ""
                        }))
                        : undefined,
                    column: undefined,
                    formula: field.formula || "",
                    resultDecimal: field.resultDecimal || false,
                    fieldReferences: field.fieldReferencesJson || [],
                    remarkTriggers: field.remarkTriggers || []
                };
            });

            // Sort fields by their order property
            const sortedFields = transformedFields.sort((a, b) => a.order - b.order);

            // Copy the format but keep current form name and ID
            setFormFields(sortedFields);
            setApprovers(data.approvers || []); // Optionally copy approvers too

            alert(`Successfully copied format from "${data.name}". You can now modify and save as a new form.`);
            setShowCopyFormat(false);
            setCopyFormLink("");

        } catch (error) {
            console.error("Error copying form format:", error);
            alert("Failed to copy form format from server.");
        }
    };

    const moveField = (dragIndex, hoverIndex) => {
        setFormFields((prevFields) => {
            const updatedFields = [...prevFields];
            const [movedField] = updatedFields.splice(dragIndex, 1);
            updatedFields.splice(hoverIndex, 0, movedField);

            // Update order values for all fields to match their new positions
            return updatedFields.map((field, index) => ({
                ...field,
                order: index
            }));
        });
    };

    const moveApprover = (dragIndex, hoverIndex) => {
        setApprovers((prevApprovers) => {
            const updatedApprovers = [...prevApprovers];
            const [movedApprover] = updatedApprovers.splice(dragIndex, 1);
            updatedApprovers.splice(hoverIndex, 0, movedApprover);
            return updatedApprovers;
        });
    };

    const fetchFormLayout = async () => {
        console.log(formLink)
        if (!formLink) {
            const savedForm = localStorage.getItem("formBuilderFields");
            if (savedForm) {
                setFormFields(JSON.parse(savedForm));
            }
            setLoading(false);
            return;
        }

        setOriginalFormLink(formLink); // Store the original form link

        try {
            const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/form-builder/link/${encodeURIComponent(formLink)}`);
            let data;

            try {
                data = await response.json();
                console.log(data)
            } catch (jsonErr) {
                const text = await response.text();
                console.error("Non-JSON error from API:", text);
                alert("Unexpected response from server. Check console for details.");
                setLoading(false);
                return;
            }

            // Store the form ID for updates
            setFormId(data.id || 0);
            setFormName(data.name || "");

            const transformedFields = (data.fields || []).map((field, index) => {
                const isGrid = field.type === "grid";

                return {
                    ...field,
                    id: field.id || generateGuid(), // Ensure ID exists
                    order: field.order !== undefined ? field.order : index, // Preserve or create order
                    columns: isGrid
                        ? (field.column || field.columns || []).map(col => ({
                            ...col,
                            type: col.type || "textbox",
                            name: col.name || "",
                            id: col.id || generateGuid(),
                            width: col.width || "1fr",
                            options: col.options || [],
                            textColor: col.textColor || "#000000",
                            backgroundColor: col.backgroundColor || "#ffffff",
                            formula: col.formula || "",
                            min: col.min ?? null,
                            max: col.max ?? null,
                            decimal: col.decimal ?? null,
                            parentColumn: col.parentColumn || "",
                            dependentOptions: col.dependentOptions || {},
                            startTime: col.startTime || "",
                            endTime: col.endTime || ""
                        }))
                        : undefined,



                    column: undefined, // Remove old key
                    formula: field.formula || "",
                    resultDecimal: field.resultDecimal || false,
                    fieldReferences: field.fieldReferencesJson || [],

                    remarkTriggers: field.remarkTriggers || [] // Ensure this exists
                };
            });

            // Sort fields by their order property
            const sortedFields = transformedFields.sort((a, b) => a.order - b.order);
            setFormFields(sortedFields);
            setApprovers(data.approvers || []);
            setLoading(false);

        } catch (error) {
            console.error("Error loading form layout from link:", error);
            alert("Failed to load form layout from server.");
            setLoading(false);
        }
    };
    const saveForm = async () => {
        if (!formName.trim()) {
            alert("Please enter a form name.");
            return;
        }

        const currentUtc = "2025-04-24 07:55:02";
        const currentUser = "mohdhamzakhan";

        try {
            // If updating, first fetch the current form to get the RowVersion
            let existingRowVersion = null;
            if (formId) {
                const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/${formId}`);
                if (response.ok) {
                    const currentForm = await response.json();
                    existingRowVersion = currentForm.rowVersion;
                }
            }

            // Base form object with RowVersion
            const baseForm = {
                id: formId || 0,
                name: formName,
                formLink: originalFormLink || formName.toLowerCase().replace(/\s+/g, "-"),
                createdBy: currentUser,
                createdAt: currentUtc,
                updatedBy: currentUser,
                updatedAt: currentUtc,
                rowVersion: existingRowVersion || "", // Include RowVersion if it exists
            };

            console.log(approvers)
            // Construct form data payload
            const formData = {
                ...baseForm,
                form: baseForm,
                approvers: approvers.map((a) => ({
                    adObjectId: a.name,
                    name: a.name,
                    email: a.email,
                    type: a.type,
                    level: a.level,
                    formId: baseForm.id
                })),
                fields: formFields.map((field) => {
                    const fieldObj = {
                        ...field,
                        formId: baseForm.id,
                        Form: {  // Capital F version
                            ...baseForm,
                            rowVersion: existingRowVersion || "" // Include RowVersion in Form
                        },
                        form: {  // Lowercase f version
                            ...baseForm,
                            rowVersion: existingRowVersion || "" // Include RowVersion in form
                        },
                        // Handle arrays properly
                        fieldReferences: null,
                        options: Array.isArray(field.options) ? field.options : [],
                        requireRemarks: Array.isArray(field.requireRemarks) ? field.requireRemarks : [],
                        remarkTriggers: Array.isArray(field.remarkTriggers)
                            ? field.remarkTriggers.map(trigger => ({
                                ...trigger,
                                formFieldId: field.id,
                                formField: {
                                    id: field.id,
                                    type: field.type,
                                    label: field.label || field.name,
                                    width: field.width,
                                    form: {
                                        id: baseForm.id,
                                        name: baseForm.name,
                                        formLink: baseForm.formLink,
                                        rowVersion: baseForm.rowVersion
                                    }
                                }
                            }))
                            : [],


                    };

                    // Handle grid type
                    if (field.type === "grid" && field.columns) {
                        fieldObj.columns = field.columns;
                        fieldObj.columnsJson = JSON.stringify(field.columns);
                    }

                    // Handle calculation type
                    if (field.type === "calculation") {
                        fieldObj.formula = field.formula.replace(/\{([^}]+)\}/g, (match, fieldName) => {
                            const referencedField = formFields.find(f => f.name === fieldName);
                            return referencedField ? referencedField.id : match;
                        });
                    }

                    return fieldObj;
                })
            };

            console.log("Payload being sent to the backend:", JSON.stringify(formData, null, 2));

            const url = formId
                ? `${APP_CONSTANTS.API_BASE_URL}/api/forms/${formId}`
                : `${APP_CONSTANTS.API_BASE_URL}/api/forms`;

            const method = formId ? "PUT" : "POST";

            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "If-Match": existingRowVersion ? `"${existingRowVersion}"` : "*"
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Server response:", errorText);

                // Handle concurrency conflicts
                if (response.status === 409) {
                    const shouldRetry = window.confirm(
                        "The form has been modified by another user. Would you like to:\n\n" +
                        "• Click 'OK' to reload the latest version and retry your changes\n" +
                        "• Click 'Cancel' to cancel your changes"
                    );

                    if (shouldRetry) {
                        window.location.reload();
                        return;
                    }
                }

                throw new Error(`Failed to save form: ${response.status} - ${errorText}`);
            }

            const responseBody = await response.json();
            console.log("Form saved successfully:", responseBody);
            alert(`Form saved successfully! Link: ${window.location.origin}/form/${responseBody.formLink}`);

        } catch (error) {
            console.error("Error saving form:", error);
            alert(`An error occurred while saving the form: ${error.message}`);
        }
    };

    const addField = (type) => {
        const newField = {
            id: generateGuid(),
            type,
            label: `New ${type}`,
            required: false,
            width: "w-1/2",
            order: formFields.length, // Add explicit order tracking
            options: [],
            requiresRemarks: [],
            ...(type === "numeric" && {
                min: 0,
                max: 100,
                decimal: false,
                requireRemarksOutOfRange: false,
                remarkTriggers: [],
            }),
            ...(type === "calculation" && {
                formula: "",
                fieldReferences: [],
                resultDecimal: true,
            }),
            ...(type === "grid" && {
                columns: [
                    { id: generateGuid(), name: "Column 1", type: "textbox", width: "1fr" },
                    { id: generateGuid(), name: "Column 2", type: "textbox", width: "1fr" }
                ],
                minRows: 1,
                maxRows: 10,
                initialRows: 3,
            }),
            ...(type === "date" && {
                showDayInTextbox: false, // user-controlled option
            }),
        };
        setFormFields([...formFields, newField]);
    };

    const updateField = (index, updates) => {
        setFormFields((prevFields) =>
            prevFields.map((field, i) =>
                i === index ? { ...field, ...updates } : field
            )
        );
    };

    const removeField = (index) => {
        setFormFields((prevFields) => prevFields.filter((_, i) => i !== index));
    }


    const addApprover = (item) => {
        if (approvers.some(a => a.id === item.id)) {
            alert("This approver has already been added.");
            return;
        }
        setApprovers([...approvers, { ...item, level: approvers.length + 1 }]);
        setSearchTerm("");
        setSearchResults([]);
    };

    const removeApprover = (index) => {
        setApprovers(approvers.filter((_, i) => i !== index));
    };

    if (loading) return <div className="p-4">Loading form builder...</div>;

    return (
        <Layout>

            <DndProvider backend={HTML5Backend}>

                <div className="max-w-6xl mx-auto p-4">
                    <div className="mb-6 flex justify-between items-center">
                        <h1 className="text-2xl font-bold">Form Builder</h1>
                        <div className="flex items-center gap-4">
                            <input
                                type="text"
                                placeholder="Enter the Form Name"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                className="w-1/2 py-2 px-3 border rounded text-lg"
                            />

                            <button
                                onClick={() => setShowCopyFormat(!showCopyFormat)}
                                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                            >
                                <Copy size={16} />
                                Copy Format
                            </button>
                            <button
                                onClick={saveForm}
                                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                            >
                                <Save size={16} />
                                Save Layout
                            </button>
                        </div>
                    </div>

                    {/* Copy Format Section */}
                    {showCopyFormat && (
                        <div className="mb-6 bg-green-50 p-4 rounded border">
                            <h3 className="text-lg font-semibold mb-3">Copy Format from Existing Form</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Enter Form Link:</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={copyFormLink}
                                            onChange={(e) => setCopyFormLink(e.target.value)}
                                            placeholder="Enter form link or form name"
                                            className="flex-1 px-3 py-2 border rounded"
                                        />
                                        <button
                                            onClick={() => copyFormatFromForm(copyFormLink)}
                                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>

                                {/* Available Forms Dropdown */}
                                {availableForms.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Or select from existing forms:</label>
                                        <select
                                            value=""
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    setCopyFormLink(e.target.value);
                                                }
                                            }}
                                            className="w-full px-3 py-2 border rounded"
                                        >
                                            <option value="">Select a form to copy...</option>
                                            {availableForms.map(form => (
                                                <option key={form.id} value={form.formLink}>
                                                    {form.name} ({form.formLink})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="text-sm text-gray-600">
                                    <strong>Note:</strong> This will copy the field structure and configuration from another form.
                                    Your current fields will be replaced. The form name and ID will remain unchanged.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Approval Hierarchy Section */}
                    <div className="mb-6">
                        <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => setShowApprovalConfig(!showApprovalConfig)}
                        >
                            <h2 className="text-xl font-semibold">Approval Hierarchy</h2>
                            {showApprovalConfig ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>

                        {showApprovalConfig && (
                            <div className="bg-gray-50 p-4 rounded border mt-2">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Search Users or Groups:</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search Active Directory..."
                                            className="w-full px-3 py-2 border rounded"
                                        />
                                        {isSearching && <div className="absolute right-3 top-2">Searching...</div>}
                                    </div>
                                </div>

                                {searchResults.length > 0 && (
                                    <div className="max-h-40 overflow-y-auto mb-4 border rounded bg-white">
                                        {searchResults.map(item => (
                                            <div
                                                key={item.id}
                                                className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={() => addApprover(item)}
                                            >
                                                {item.type === 'user'
                                                    ? <User size={16} className="text-gray-600" />
                                                    : <Users size={16} className="text-gray-600" />
                                                }
                                                <div>
                                                    <div className="font-medium">{item.name}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {item.type === 'user' ? item.email : `Group (${item.members?.length || 0} members)`}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-4">
                                    <h3 className="font-medium mb-2">Approval Flow (Ordered by Level):</h3>
                                    {approvers.length === 0 ? (
                                        <div className="text-gray-500 italic">No approvers added yet. Search and add approvers above.</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {approvers.map((approver, index) => (
                                                <ApproverItem
                                                    key={approver.id}
                                                    approver={approver}
                                                    index={index}
                                                    moveApprover={moveApprover}
                                                    removeApprover={() => removeApprover(index)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mb-6 flex gap-2 flex-wrap">
                        {["textbox", "numeric", "dropdown", "checkbox", "radio", "date", "calculation", "grid"].map(
                            (type) => (
                                <button
                                    key={type}
                                    onClick={() => addField(type)}
                                    className="bg-gray-100 px-4 py-2 rounded hover:bg-gray-200"
                                >
                                    Add {type.charAt(0).toUpperCase() + type.slice(1)}
                                </button>
                            )
                        )}
                    </div>

                    <div className="flex flex-wrap -mx-2">
                        {formFields.map((field, index) => (
                            <div key={field.id} className={`p-2 ${field.width}`}>
                                <FormField
                                    field={field}
                                    index={index}
                                    allFields={formFields} // Pass all fields as a prop
                                    moveField={moveField}
                                    updateField={(updates) => updateField(index, updates)}
                                    removeField={() => removeField(index)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </DndProvider>
        </Layout>
    );
};

const ApproverItem = ({ approver, index, moveApprover, removeApprover }) => {
    const ref = useRef(null);

    const [{ isDragging }, drag] = useDrag({
        type: APPROVER_ITEM_TYPE,
        item: { index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [, drop] = useDrop({
        accept: APPROVER_ITEM_TYPE,
        hover: (draggedItem) => {
            if (draggedItem.index !== index) {
                moveApprover(draggedItem.index, index);
                draggedItem.index = index;
            }
        },
    });

    drag(drop(ref));

    return (
        <div
            ref={ref}
            className={`flex items-center gap-3 p-3 bg-white rounded border ${isDragging ? "opacity-50" : ""
                }`}
        >
            <GripVertical className="text-gray-400 cursor-move" />
            <div className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full">
                {index + 1}
            </div>
            <div className="flex items-center gap-2 flex-1">
                {approver.type === 'user'
                    ? <User size={16} className="text-gray-600" />
                    : <Users size={16} className="text-gray-600" />
                }
                <div>
                    <div className="font-medium">{approver.name}</div>
                    <div className="text-xs text-gray-500">
                        {approver.type === 'user' ? approver.email : `Group (${approver.members?.length || 0} members)`}
                    </div>
                </div>
            </div>
            <button
                onClick={removeApprover}
                className="text-red-500 hover:text-red-600"
            >
                <X size={16} />
            </button>
        </div>
    );
};

const FormField = ({ field, index, allFields, moveField, updateField, removeField }) => {
    const [previewParentValue, setPreviewParentValue] = useState("");
    const [previewChildOptions, setPreviewChildOptions] = useState([]);



    useEffect(() => {
        const dependentDropdownCol = field.columns?.find(col => col.type === "dependentDropdown");

        if (dependentDropdownCol?.parentColumn) {
            const parentCol = field.columns.find(c => c.name === dependentDropdownCol.parentColumn);
            const firstOption = parentCol?.options?.[0];

            setPreviewParentValue(firstOption || "");
            setPreviewChildOptions(
                dependentDropdownCol.dependentOptions?.[firstOption] || []
            );
        }
    }, [field.columns]);



    const ref = useRef(null);
    const [availableFields, setAvailableFields] = useState([]);
    const [{ isDragging }, drag] = useDrag({
        type: ITEM_TYPE,
        item: { index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });
    useEffect(() => {
        // Now "field" and "allFields" are properly defined here
        const fields = allFields
            .filter(f => f.id !== field.id)
            .filter(f => ["textbox", "numeric", "dropdown", "calculation"].includes(f.type))
            .map(f => ({ id: f.id, label: f.label }));

        setAvailableFields(fields);
    }, [allFields, field.id]);

    const [, drop] = useDrop({
        accept: ITEM_TYPE,
        hover: (draggedItem) => {
            if (draggedItem.index !== index) {
                moveField(draggedItem.index, index);
                draggedItem.index = index;
            }
        },
    });

    drag(drop(ref));

    const [newOption, setNewOption] = useState("");
    const [tempDropdownOptions, setTempDropdownOptions] = useState("");
    const [newRemarkTrigger, setNewRemarkTrigger] = useState({
        value: "",
        operator: "=",
    });

    const addOption = () => {
        if (!newOption.trim()) return;
        const updatedOptions = [...(field.options || []), newOption.trim()];
        updateField({ options: updatedOptions });
        setNewOption("");
    };

    const removeOption = (optionIndex) => {
        const updatedOptions = field.options.filter((_, i) => i !== optionIndex);

        let updatedRequiresRemarks = [...(field.requiresRemarks || [])];
        if (updatedRequiresRemarks.includes(field.options[optionIndex])) {
            updatedRequiresRemarks = updatedRequiresRemarks.filter(
                (option) => option !== field.options[optionIndex]
            );
        }

        updateField({
            options: updatedOptions,
            requiresRemarks: updatedRequiresRemarks,
        });
    };

    const toggleRequiresRemarks = (option) => {
        const requiresRemarks = [...(field.requiresRemarks || [])];
        if (requiresRemarks.includes(option)) {
            updateField({
                requiresRemarks: requiresRemarks.filter((item) => item !== option),
            });
        } else {
            updateField({
                requiresRemarks: [...requiresRemarks, option],
            });
        }
    };

    const addRemarkTrigger = () => {
        if (!newRemarkTrigger.value.trim()) return;

        const parsedValue = field.decimal
            ? parseFloat(newRemarkTrigger.value)
            : parseInt(newRemarkTrigger.value);

        if (isNaN(parsedValue)) return;

        const newTrigger = {
            value: parsedValue,
            operator: newRemarkTrigger.operator,
        };

        const updatedTriggers = [...(field.remarkTriggers || []), newTrigger];
        updateField({ remarkTriggers: updatedTriggers });
        setNewRemarkTrigger({ value: "", operator: "=" });
    };

    const removeRemarkTrigger = (triggerIndex) => {
        const updatedTriggers = (field.remarkTriggers || []).filter(
            (_, i) => i !== triggerIndex
        );
        updateField({ remarkTriggers: updatedTriggers });
    };



    return (
        <div
            ref={ref}
            className={`bg-white p-4 rounded border h-full ${isDragging ? "opacity-50" : ""
                }`}
        >
            <div className="flex items-center gap-4 mb-4">
                <GripVertical className="text-gray-400" />
                <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField({ label: e.target.value })}
                    className="flex-1 px-2 py-1 border rounded"
                />
                <select
                    value={field.width}
                    onChange={(e) => updateField({ width: e.target.value })}
                    className="px-2 py-1 border rounded"
                >
                    <option value="w-full">Full</option>
                    <option value="w-1/2">Half</option>
                    <option value="w-1/3">Third</option>
                    <option value="w-1/4">Quarter</option>
                </select>
                <button
                    onClick={removeField}
                    className="text-red-500 hover:text-red-600"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
                <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField({ required: e.target.checked })}
                    className="h-4 w-4"
                />
                <label className="text-sm text-gray-600">Required</label>
            </div>

            {field.type === "calculation" && (
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Formula</label>
                    <input
                        type="text"
                        value={field.formula || ""}
                        onChange={(e) => updateField({ formula: e.target.value })}
                        placeholder="Example: {field1} + {field2} * 2"
                        className="w-full px-2 py-1 border rounded"
                    />

                    <div className="mt-2">
                        <label className="block text-xs font-medium mb-1 text-gray-500">Available Fields:</label>
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                            {availableFields.map(f => (
                                <div key={f.id} className="mb-1">
                                    {f.label}: <code className="bg-gray-100 px-1 rounded">{`{${f.id}}`}</code>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                        <input
                            type="checkbox"
                            checked={field.resultDecimal || false}
                            onChange={(e) => updateField({ resultDecimal: e.target.checked })}
                            className="h-4 w-4"
                        />
                        <label className="text-sm text-gray-600">Allow Decimal Results</label>
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                        Use field IDs wrapped in curly braces to reference other fields.
                        Example: <code className="bg-gray-100 px-1 rounded">{"{fieldId1} + {fieldId2} * 2"}</code>
                    </p>
                </div>
            )}

           

            {field.type === "grid" && (
                <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-2">Grid Configuration</h4>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Initial Rows</label>
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={field.initialRows || 3}
                                onChange={(e) => updateField({ initialRows: parseInt(e.target.value) || 3 })}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Min Rows</label>
                            <input
                                type="number"
                                min="0"
                                max="20"
                                value={field.minRows || 1}
                                onChange={(e) => updateField({ minRows: parseInt(e.target.value) || 1 })}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Max Rows</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={field.maxRows || 10}
                                onChange={(e) => updateField({ maxRows: parseInt(e.target.value) || 10 })}
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded border mb-4">
                        <h4 className="text-sm font-semibold mb-2">Columns</h4>

                        {(field.columns || []).map((column, colIndex) => (
                            <div key={column.id || colIndex} className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                                <div className="w-full md:w-1/3 mb-2 md:mb-0">
                                    <label className="block text-xs text-gray-500 mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={column.name || ""}
                                        onChange={(e) => {
                                            const updatedColumns = [...(field.columns || [])];
                                            updatedColumns[colIndex].name = e.target.value;
                                            updateField({ ...field, columns: updatedColumns });
                                        }}
                                        className="w-full px-2 py-1 border rounded"
                                    />
                                </div>
                                <div className="w-full md:w-1/4 mb-2">
                                    <label className="block text-xs text-gray-500 mb-1">Text Color</label>
                                    <input
                                        type="color"
                                        value={column.textColor || "#000000"}
                                        onChange={(e) => {
                                            const updatedColumns = [...field.columns];
                                            updatedColumns[colIndex].textColor = e.target.value;
                                            updateField({ ...field, columns: updatedColumns });
                                        }}
                                        className="w-full h-10 border rounded"
                                    />
                                </div>

                                <div className="w-full md:w-1/4 mb-2">
                                    <label className="block text-xs text-gray-500 mb-1">Background Color</label>
                                    <input
                                        type="color"
                                        value={column.backgroundColor || "#ffffff"}
                                        onChange={(e) => {
                                            const updatedColumns = [...field.columns];
                                            updatedColumns[colIndex].backgroundColor = e.target.value;
                                            updateField({ ...field, columns: updatedColumns });
                                        }}
                                        className="w-full h-10 border rounded"
                                    />
                                </div>


                                <div className="w-full md:w-1/4 mb-2 md:mb-0">
                                    <label className="block text-xs text-gray-500 mb-1">Type</label>
                                    <select
                                        value={column.type || "textbox"}
                                        onChange={(e) => {
                                            const updatedColumns = [...(field.columns || [])];
                                            updatedColumns[colIndex].type = e.target.value;
                                            updateField({ ...field, columns: updatedColumns });
                                        }}
                                        className="w-full px-2 py-1 border rounded"
                                    >
                                        <option value="textbox">Text</option>
                                        <option value="numeric">Number</option>
                                        <option value="dropdown">Dropdown</option>
                                        <option value="checkbox">Checkbox</option>
                                        <option value="calculation">Calculation</option>
                                        <option value="time">Time</option>
                                        <option value="timecalculation">Time Calculation</option>
                                        <option value="dependentDropdown">Dependent Dropdown</option> {/* 👈 New */}
                                    </select>
                                </div>

                                <div className="w-full md:w-1/6 mb-2 md:mb-0">
                                    <label className="block text-xs text-gray-500 mb-1">Width</label>
                                    <input
                                        type="text"
                                        value={column.width || "1fr"}
                                        onChange={(e) => {
                                            const updatedColumns = [...(field.columns || [])];
                                            updatedColumns[colIndex].width = e.target.value;
                                            updateField({ ...field, columns: updatedColumns });
                                        }}
                                        className="w-full px-2 py-1 border rounded"
                                        placeholder="1fr"
                                    />
                                </div>

                                {column.type === "calculation" && (
                                    <div className="w-full mt-2">
                                        <label className="block text-xs text-gray-500 mb-1">Formula</label>
                                        <input
                                            type="text"
                                            value={column.formula || ""}
                                            onChange={(e) => {
                                                const updatedColumns = [...(field.columns || [])];
                                                updatedColumns[colIndex].formula = e.target.value;
                                                updateField({ ...field, columns: updatedColumns });
                                            }}
                                            className="w-full px-2 py-1 border rounded"
                                            placeholder="col1 + col2"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Use column IDs to create calculations (e.g., col1 * col2)
                                        </p>
                                    </div>
                                )}

                                {column.type === "dropdown" && (
                                    <div className="w-full mt-2">
                                        <label className="block text-xs text-gray-500 mb-1">Options (comma separated)</label>
                                        <input
                                            type="text"
                                            value={tempDropdownOptions}
                                            onChange={(e) => setTempDropdownOptions(e.target.value)}
                                            onBlur={() => {
                                                const options = tempDropdownOptions
                                                    .split(",")
                                                    .map((opt) => opt.trim())
                                                    .filter(Boolean);

                                                const updatedColumns = [...(field.columns || [])];
                                                updatedColumns[colIndex].options = options;
                                                updateField({ ...field, columns: updatedColumns });
                                            }}
                                            onFocus={() => {
                                                // Populate temp input with current options when editing starts
                                                setTempDropdownOptions((column.options || []).join(", "));
                                            }}
                                            className="w-full px-2 py-1 border rounded"
                                            placeholder="Option 1, Option 2, Option 3"
                                        />

                                    </div>
                                )}
                                // Inside the FormField component, in the grid configuration section

                                {column.type === "dependentDropdown" && (
                                    <div className="w-full space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Parent Column</label>
                                            <select
                                                value={column.parentColumn || ""}
                                                onChange={(e) => {
                                                    const updatedColumns = [...field.columns];
                                                    updatedColumns[colIndex] = {
                                                        ...updatedColumns[colIndex],
                                                        parentColumn: e.target.value,
                                                        dependentOptions: {}
                                                    };
                                                    updateField({ columns: updatedColumns });
                                                }}
                                                className="w-full border rounded p-2"
                                            >
                                                <option value="">Select Parent Column</option>
                                                {field.columns
                                                    .filter(c => c.type === "dropdown" && c.id !== column.id)
                                                    .map(parentCol => (
                                                        <option key={parentCol.id} value={parentCol.name}>
                                                            {parentCol.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>

                                        {/* Child options configuration */}
                                        {column.parentColumn && (
                                            <div className="space-y-2">
                                                {field.columns
                                                    .find(c => c.name === column.parentColumn)
                                                    ?.options?.map(parentOption => (
                                                        <div key={parentOption} className="border p-2 rounded">
                                                            <div className="font-medium mb-2">When {column.parentColumn} is "{parentOption}"</div>
                                                            <textarea
                                                                value={(column.dependentOptions?.[parentOption] || []).join(",")}
                                                                onChange={(e) => {
                                                                    const values = e.target.value.split(",").map(v => v.trim());
                                                                    const updatedColumns = [...field.columns];
                                                                    updatedColumns[colIndex].dependentOptions[parentOption] = values;
                                                                    updateField({ columns: updatedColumns });
                                                                }}
                                                                placeholder="Enter comma-separated options"
                                                                className="w-full border rounded p-2"
                                                            />
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {column.type === "numeric" && (
                                    <div className="w-full grid grid-cols-3 gap-3 mt-2">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Min</label>
                                            <input
                                                type="number"
                                                value={column.min || 0}
                                                onChange={(e) => {
                                                    const updatedColumns = [...(field.columns || [])];
                                                    updatedColumns[colIndex].min = parseFloat(e.target.value) || 0;
                                                    updateField({ ...field, columns: updatedColumns });
                                                }}
                                                className="w-full px-2 py-1 border rounded"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Max</label>
                                            <input
                                                type="number"
                                                value={column.max || 100}
                                                onChange={(e) => {
                                                    const updatedColumns = [...(field.columns || [])];
                                                    updatedColumns[colIndex].max = parseFloat(e.target.value) || 100;
                                                    updateField({ ...field, columns: updatedColumns });
                                                }}
                                                className="w-full px-2 py-1 border rounded"
                                            />
                                        </div>
                                        <div className="flex items-end mb-1">
                                            <label className="flex items-center gap-1">
                                                <input
                                                    type="checkbox"
                                                    checked={column.decimal || false}
                                                    onChange={(e) => {
                                                        const updatedColumns = [...(field.columns || [])];
                                                        updatedColumns[colIndex].decimal = e.target.checked;
                                                        updateField({ ...field, columns: updatedColumns });
                                                    }}
                                                    className="h-4 w-4"
                                                />
                                                <span className="text-xs text-gray-500">Decimal</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {column.type === "timecalculation" && (
                                    <div className="flex space-x-2 mt-2">
                                        <div className="w-1/2">
                                            <label className="block text-xs font-semibold text-gray-600">Start Time Column</label>
                                            <select
                                                className="border rounded w-full p-1"
                                                value={column.startTime || ""}
                                                onChange={(e) => {
                                                    const updatedColumns = [...field.columns];
                                                    updatedColumns[colIndex].startTime = e.target.value;

                                                    // If both selected, auto-generate formula
                                                    if (updatedColumns[colIndex].startTime && updatedColumns[colIndex].endTime) {
                                                        updatedColumns[colIndex].formula = `{${updatedColumns[colIndex].endTime}} - {${updatedColumns[colIndex].startTime}}`;
                                                    }

                                                    updateField({ ...field, columns: updatedColumns });
                                                }}
                                            >
                                                <option value="">Select start</option>
                                                {field.columns.filter(c => c.type === "time").map((col) => (
                                                    <option key={col.name} value={col.name}>{col.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="w-1/2">
                                            <label className="block text-xs font-semibold text-gray-600">End Time Column</label>
                                            <select
                                                className="border rounded w-full p-1"
                                                value={column.endTime || ""}
                                                onChange={(e) => {
                                                    const updatedColumns = [...field.columns];
                                                    updatedColumns[colIndex].endTime = e.target.value;

                                                    if (updatedColumns[colIndex].startTime && updatedColumns[colIndex].endTime) {
                                                        updatedColumns[colIndex].formula = `{${updatedColumns[colIndex].endTime}} - {${updatedColumns[colIndex].startTime}}`;
                                                    }

                                                    updateField({ ...field, columns: updatedColumns });
                                                }}
                                            >
                                                <option value="">Select end</option>
                                                {field.columns.filter(c => c.type === "time").map((col) => (
                                                    <option key={col.name} value={col.name}>{col.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}





                                <div className="w-full flex justify-end">
                                    <button
                                        onClick={() => {
                                            const updatedColumns = (field.columns || []).filter((_, i) => i !== colIndex);
                                            updateField({ ...field, columns: updatedColumns });
                                        }}
                                        className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                                    >
                                        <X size={14} /> Remove
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={() => {
                                const newColumn = {
                                    id: generateGuid(),
                                    name: `Column ${(field.columns || []).length + 1}`,
                                    type: "textbox",
                                    width: "1fr"
                                };
                                updateField({ columns: [...(field.columns || []), newColumn] });
                            }}
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 flex items-center gap-1 text-sm"
                        >
                            <Plus size={14} /> Add Column
                        </button>
                    </div>

                    <div className="bg-gray-50 p-3 rounded border">
                        <h4 className="text-sm font-semibold mb-2">Grid Preview</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        {(field.columns || []).map((col, i) => (
                                            <th key={col.id || i} className="border border-gray-300 bg-gray-100 p-2 text-sm text-left"
                                                style={{ width: col.width }}>
                                                {col.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...Array(Math.min(3, field.initialRows || 3))].map((_, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {(field.columns || []).map((col, colIndex) => (
                                                <td key={`${rowIndex}-${colIndex}`} className="border border-gray-300 p-2">
                                                    {col.type === "textbox" && (
                                                        <input type="text" disabled className="w-full bg-gray-50 border px-2 py-1 opacity-50" />
                                                    )}
                                                    {col.type === "numeric" && (
                                                        <input type="number" disabled className="w-full bg-gray-50 border px-2 py-1 opacity-50" />
                                                    )}
                                                    {col.type === "dropdown" && (
                                                        <select className="w-full bg-gray-50 border px-2 py-1 opacity-50">
                                                            <option>Select...</option>
                                                            {(col.options || []).map((opt, o) => (
                                                                <option key={o}>{opt}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    {col.type === "checkbox" && (
                                                        <input type="checkbox" disabled className="h-4 w-4 opacity-50" />
                                                    )}
                                                    {col.type === "calculation" && (
                                                        <input type="text" disabled placeholder="Calculated value"
                                                            className="w-full bg-gray-50 border px-2 py-1 opacity-50" />
                                                    )}
                                                    {col.type === "time" && (
                                                        <input type="time" disabled className="w-full bg-gray-50 border px-2 py-1 opacity-50" />
                                                    )}
                                                    {col.type === "timecalculation" && (
                                                        <input type="text" disabled placeholder="Calculated duration" className="w-full bg-gray-50 border px-2 py-1 opacity-50" />
                                                    )}

                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {field.type === "numeric" && (
                <div className="mb-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">
                                Min Value
                            </label>
                            <input
                                type="number"
                                step={field.decimal ? "0.01" : "1"}
                                value={field.min || 0}
                                onChange={(e) =>
                                    updateField({
                                        min: field.decimal
                                            ? parseFloat(e.target.value) || 0
                                            : parseInt(e.target.value) || 0,
                                    })
                                }
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">
                                Max Value
                            </label>
                            <input
                                type="number"
                                step={field.decimal ? "0.01" : "1"}
                                value={field.max || 100}
                                onChange={(e) =>
                                    updateField({
                                        max: field.decimal
                                            ? parseFloat(e.target.value) || 100
                                            : parseInt(e.target.value) || 100,
                                    })
                                }
                                className="w-full px-2 py-1 border rounded"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                        <input
                            type="checkbox"
                            checked={field.decimal || false}
                            onChange={(e) => updateField({ decimal: e.target.checked })}
                            className="h-4 w-4"
                        />
                        <label className="text-sm text-gray-600">
                            Allow Decimal Numbers
                        </label>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                        <input
                            type="checkbox"
                            checked={field.requireRemarksOutOfRange || false}
                            onChange={(e) =>
                                updateField({ requireRemarksOutOfRange: e.target.checked })
                            }
                            className="h-4 w-4"
                        />
                        <label className="text-sm text-gray-600">
                            Require Remarks For Out-of-Range Values
                        </label>
                    </div>

                    <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">
                            Require Remarks for Specific Values:
                        </h4>
                        <div className="flex gap-2 mb-2">
                            <select
                                value={newRemarkTrigger.operator}
                                onChange={(e) =>
                                    setNewRemarkTrigger({
                                        ...newRemarkTrigger,
                                        operator: e.target.value,
                                    })
                                }
                                className="px-2 py-1 border rounded"
                            >
                                <option value="=">=</option>
                                <option value=">">&gt;</option>
                                <option value="<">&lt;</option>
                                <option value=">=">&gt;=</option>
                                <option value="<=">&lt;=</option>
                            </select>
                            <input
                                type="number"
                                step={field.decimal ? "0.01" : "1"}
                                value={newRemarkTrigger.value}
                                onChange={(e) =>
                                    setNewRemarkTrigger({
                                        ...newRemarkTrigger,
                                        value: e.target.value,
                                    })
                                }
                                placeholder="Enter value"
                                className="flex-1 px-2 py-1 border rounded"
                            />
                            <button
                                onClick={addRemarkTrigger}
                                className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        <div className="mt-2">
                            {(field.remarkTriggers || []).map((trigger, triggerIndex) => (
                                <div
                                    key={triggerIndex}
                                    className="flex items-center gap-2 mb-2"
                                >
                                    <span>
                                        Require remarks when value is {trigger.operator}{" "}
                                        {trigger.value}
                                    </span>
                                    <button
                                        onClick={() => removeRemarkTrigger(triggerIndex)}
                                        className="text-red-500 hover:text-red-600 ml-2"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {field.type === "date" && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <input
                            type="checkbox"
                            checked={field.showDayInTextbox || false}
                            onChange={(e) => updateField({ showDayInTextbox: e.target.checked })}
                            className="h-4 w-4"
                        />
                        <label className="text-sm text-gray-600">
                            Show day in textbox
                        </label>
                    </div>
                </div>
            )}


            {(field.type === "dropdown" ||
                field.type === "checkbox" ||
                field.type === "radio") && (
                    <div className="mt-4">
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={newOption}
                                onChange={(e) => setNewOption(e.target.value)}
                                placeholder="Add new option"
                                className="flex-1 px-2 py-1 border rounded"
                            />
                            <button
                                onClick={addOption}
                                className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        <div className="mt-2">
                            <h4 className="text-sm font-medium mb-2">Options:</h4>
                            {(field.options || []).map((option, optionIndex) => (
                                <div key={optionIndex} className="flex items-center gap-2 mb-2">
                                    <span className="flex-1">{option}</span>

                                    <div className="flex items-center gap-1">
                                        <input
                                            type="checkbox"
                                            checked={(field.requiresRemarks || []).includes(option)}
                                            onChange={() => toggleRequiresRemarks(option)}
                                            className="h-4 w-4"
                                        />
                                        <label className="text-xs text-gray-600">Remarks</label>
                                    </div>

                                    <button
                                        onClick={() => removeOption(optionIndex)}
                                        className="text-red-500 hover:text-red-600 ml-2"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {field.options && field.options.length > 0 && (
                            <div className="mt-4 p-3 bg-gray-50 rounded border">
                                <h4 className="text-sm font-medium mb-2">Preview:</h4>
                                {field.type === "radio" &&
                                    field.options.map((option, idx) => (
                                        <div key={idx} className="flex items-center gap-2 mb-1">
                                            <input
                                                type="radio"
                                                name={`preview-${field.id}`}
                                                className="h-4 w-4"
                                            />
                                            <label className="text-sm">{option}</label>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                )}
        </div>
    );
};

export default FormBuilder;