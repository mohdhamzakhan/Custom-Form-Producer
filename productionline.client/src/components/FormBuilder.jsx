import React, { useState, useEffect, useRef } from "react";
import { Plus, GripVertical, X, Save, User, Users, ChevronUp, ChevronDown } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

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
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showApprovalConfig, setShowApprovalConfig] = useState(false);

    useEffect(() => {
        fetchFormLayout();
    }, []);

    useEffect(() => {
        if (searchTerm.length >= 3) {
            searchAdDirectory(searchTerm);
        } else {
            setSearchResults([]);
        }
    }, [searchTerm]);

    const searchAdDirectory = async (term) => {
        setIsSearching(true);
        try {
            const response = await fetch(`http://localhost:5182/api/forms/ad-search?term=${term}`);

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error("Invalid JSON returned from server:", jsonError);
                throw new Error("Invalid JSON response");
            }

            if (!response.ok) {
                // Server returned an error (status 500 etc.)
                console.error("Server error:", data.error || "Unknown error");
                throw new Error(data.error || "Unknown server error");
            }

            setSearchResults(data);
        } catch (error) {
            console.error("Error searching AD:", error);
            // Provide dummy data for testing
            setSearchResults([
                { id: "user1", name: "John Doe", type: "user", email: "john.doe@example.com" },
                { id: "user2", name: "Jane Smith", type: "user", email: "jane.smith@example.com" },
                { id: "group1", name: "Finance Department", type: "group", members: ["user1", "user3"] },
                { id: "group2", name: "HR Team", type: "group", members: ["user2", "user4"] }
            ]);
        } finally {
            setIsSearching(false);
        }
    };


    const moveField = (dragIndex, hoverIndex) => {
        setFormFields((prevFields) => {
            const updatedFields = [...prevFields];
            const [movedField] = updatedFields.splice(dragIndex, 1);
            updatedFields.splice(hoverIndex, 0, movedField);
            return updatedFields;
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
        try {
            const response = await fetch("http://localhost:5182/api/form-layout");
            const data = await response.json();

            setFormName(data.name || "");
            setFormFields(data.fields || []);
            setApprovers(data.approvers || []);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching form layout:", error);
            setLoading(false);
        }
    };

    const saveForm = async () => {
        if (!formName.trim()) {
            alert("Please enter a form name.");
            return;
        }

        const baseForm = {
            id: 1,
            name: formName,
            formLink: formName.toLowerCase().replace(/\s+/g, "-"),
            approvers: [], // 👈 MUST ADD this!
        };

        // Create form object with the structure matching your API requirements
        const formData = {
            id: 0,
            name: formName,
            formLink: formName.toLowerCase().replace(/\s+/g, "-"),
            approvers: approvers.map((approver, index) => ({
                id: 0,
                adObjectId: approver.id,
                name: approver.name,
                email: approver.email,
                type: approver.type,
                level: index + 1,
                formId: 1,
                form: baseForm // 👈 use baseForm here
            })),
            fields: formFields.map((field) => {
                const mappedField = {
                    id: field.id,
                    type: field.type,
                    label: field.label,
                    required: field.required,
                    width: field.width,
                    options: field.options || [],
                    requiresRemarks: field.requiresRemarks || [],
                    formId: 1,
                    form: baseForm // 👈 use baseForm here
                };

                if (field.type === "numeric") {
                    mappedField.min = field.min || 0;
                    mappedField.max = field.max || 100;
                    mappedField.decimal = field.decimal || false;
                    mappedField.requireRemarksOutOfRange =
                        field.requireRemarksOutOfRange || false;

                    mappedField.remarkTriggers = (field.remarkTriggers || []).map(
                        (trigger) => ({
                            id: 0,
                            operator: trigger.operator,
                            value: trigger.value,
                            formFieldId: field.id,
                            formField: {
                                id: field.id,
                                type: field.type,
                                label: field.label,
                                width: field.width,
                                form: baseForm // 👈 use baseForm here
                            },
                        })
                    );
                }

                return mappedField;
            }),
        };

        try {
            console.log("Sending payload:", JSON.stringify(formData));

            const response = await fetch("http://localhost:5182/api/forms", {
                method: "POST",
                headers: { "Content-Type": "application/json-patch+json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorMessage = await response.text();
                throw new Error(
                    `Failed to save form layout: ${response.status} - ${errorMessage}`
                );
            }

            const responseBody = await response.json(); // Now it's safe
            console.log("Form saved successfully:", responseBody);

            alert(
                `Form Saved! Link: ${window.location.origin}/form/${responseBody.formLink}`
            );
            window.location.reload();
        } catch (error) {
            console.error("Error saving form layout:", error);
            alert("Error saving form layout. Check the console for details.");
        }

    };

    const addField = (type) => {
        const newField = {
            id: generateGuid(),
            type,
            label: `New ${type}`,
            required: false,
            width: "w-1/2",
            options: [],
            requiresRemarks: [],
            ...(type === "numeric" && {
                min: 0,
                max: 100,
                decimal: false,
                requireRemarksOutOfRange: false,
                remarkTriggers: [],
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
    };

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
                            onClick={saveForm}
                            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                            <Save size={16} />
                            Save Layout
                        </button>
                    </div>
                </div>

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
                    {["textbox", "numeric", "dropdown", "checkbox", "radio", "date"].map(
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
                                moveField={moveField}
                                updateField={(updates) => updateField(index, updates)}
                                removeField={() => removeField(index)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </DndProvider>
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

const FormField = ({ field, index, moveField, updateField, removeField }) => {
    const ref = useRef(null);

    const [{ isDragging }, drag] = useDrag({
        type: ITEM_TYPE,
        item: { index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

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