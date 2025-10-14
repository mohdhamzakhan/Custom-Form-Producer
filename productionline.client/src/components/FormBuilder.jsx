import React, { useState, useEffect, useRef } from "react";
import { Plus, GripVertical, X, Save, User, Users, ChevronUp, ChevronDown, Copy, Trash } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Layout from "./Layout"
import { useNavigate, useParams } from "react-router-dom";
import useAdSearch from "./hooks/useAdSearch";
import { APP_CONSTANTS } from "./store";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from 'react-toastify';
import LoadingDots from './LoadingDots';

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
const COLUMNITEMTYPE = 'COLUMN'


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
    const [user, setUser] = useState(null);


    // New state for copy format feature
    const [showCopyFormat, setShowCopyFormat] = useState(false);
    const [copyFormLink, setCopyFormLink] = useState("");
    const [availableForms, setAvailableForms] = useState([]);
    const [loadingForms, setLoadingForms] = useState(false);
    const [linkedFieldData, setLinkedFieldData] = useState({});


    // Add these new state variables after the existing ones
    const [linkedForm, setLinkedForm] = useState(null);
    const [keyFields, setKeyFields] = useState([]);
    const [linkedFormFields, setLinkedFormFields] = useState([]);

    // Access control state
    const [allowedUsers, setAllowedUsers] = useState([]);
    const [accessSearchTerm, setAccessSearchTerm] = useState("");
    const [accessSearchResults, setAccessSearchResults] = useState([]);
    const [showAccessConfig, setShowAccessConfig] = useState(false);


    // Add this function to fetch linked form details
    // Replace your fetchLinkedFormDetails function with this safe version
    const fetchLinkedFormDetails = async (formId) => {
        console.log("=== fetchLinkedFormDetails called with formId:", formId);

        if (!formId) {
            console.log("No formId provided, clearing linked form data");
            setLinkedForm(null);
            setLinkedFormFields([]);
            setKeyFields([]); // Also clear key fields when no form is linked
            return;
        }

        try {
            console.log("Fetching form details from API...");
            const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/${formId}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const formData = await response.json();

            console.log("=== RAW LINKED FORM DATA ===");
            console.log(formData);

            // Set the linked form
            setLinkedForm(formData);

            // Safely process the fields
            const fields = formData.fields || [];
            console.log("Raw fields from API:", fields);

            if (!Array.isArray(fields)) {
                console.error("Fields is not an array:", fields);
                setLinkedFormFields([]);
                return;
            }

            // Process each field safely
            const processedFields = fields.map((field, index) => {
                console.log(`=== PROCESSING LINKED FIELD ${index} ===`);
                console.log("Field:", field);

                if (!field) {
                    console.warn(`Field at index ${index} is null/undefined`);
                    return null;
                }

                // Create a safe copy of the field
                const processedField = {
                    ...field,
                    id: field.id || `field_${index}`,
                    label: field.label || field.name || `Field ${index}`,
                    type: field.type || 'textbox'
                };

                // Handle grid fields specially
                if (field.type === "grid") {
                    console.log("=== PROCESSING GRID FIELD ===");
                    console.log("columnsJson:", field.columnsJson);
                    console.log("columns:", field.columns);
                    console.log("column:", field.column);

                    let columns = [];

                    // Try multiple ways to get columns
                    if (field.columnsJson) {
                        try {
                            if (typeof field.columnsJson === 'string') {
                                columns = JSON.parse(field.columnsJson);
                                console.log("Parsed columnsJson successfully:", columns);
                            } else if (Array.isArray(field.columnsJson)) {
                                columns = field.columnsJson;
                                console.log("Using columnsJson as array:", columns);
                            } else {
                                console.warn("columnsJson is not string or array:", typeof field.columnsJson);
                            }
                        } catch (e) {
                            console.error("Failed to parse columnsJson:", e);
                            console.log("Raw columnsJson:", field.columnsJson);
                        }
                    }

                    // Fallback to columns property
                    if ((!columns || columns.length === 0) && field.columns && Array.isArray(field.columns)) {
                        columns = field.columns;
                        console.log("Using field.columns as fallback:", columns);
                    }

                    // Fallback to column property (old format)
                    if ((!columns || columns.length === 0) && field.column && Array.isArray(field.column)) {
                        columns = field.column;
                        console.log("Using field.column as fallback:", columns);
                    }

                    // Ensure columns is always an array
                    if (!Array.isArray(columns)) {
                        console.warn("columns is not an array, using empty array");
                        columns = [];
                    }

                    // Validate and clean up columns
                    const validColumns = columns.filter((col, colIndex) => {
                        if (!col) {
                            console.warn(`Column at index ${colIndex} is null/undefined`);
                            return false;
                        }
                        if (!col.id) {
                            console.warn(`Column at index ${colIndex} has no id:`, col);
                            col.id = `col_${colIndex}`; // Generate ID if missing
                        }
                        if (!col.name) {
                            console.warn(`Column at index ${colIndex} has no name:`, col);
                            col.name = `Column ${colIndex}`;
                        }
                        return true;
                    });

                    console.log("Valid columns after processing:", validColumns);

                    processedField.columns = validColumns;
                }

                return processedField;
            }).filter(Boolean); // Remove any null fields

            console.log("=== FINAL PROCESSED LINKED FIELDS ===");
            console.log(processedFields);

            setLinkedFormFields(processedFields);

        } catch (error) {
            console.error("Error fetching linked form:", error);
            alert(`Error loading linked form: ${error.message}`);
            setLinkedForm(null);
            setLinkedFormFields([]);
        }
    };
    const navigate = useNavigate();

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
                fetchFormLayout();
                fetchAvailableForms();
            }
        } else {
            navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
        }
    }, [navigate]);

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

    useEffect(() => {
        if (accessSearchTerm.length >= 3) {
            searchAdDirectory(accessSearchTerm).then(results => {
                setAccessSearchResults(results || []);
            });
        } else {
            setAccessSearchResults([]);
        }
    }, [accessSearchTerm, searchAdDirectory]);


    const fetchAvailableForms = async () => {
        setLoadingForms(true);
        try {
            const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms?includeFields=true`);
            if (response.ok) {
                const forms = await response.json();
                // Process forms to include parsed grid columns
                const processedForms = forms.map(form => ({
                    ...form,
                    fields: (form.fields || []).map(field => {
                        if (field.type === "grid" && field.columnsJson) {
                            try {
                                field.columns = typeof field.columnsJson === 'string'
                                    ? JSON.parse(field.columnsJson)
                                    : field.columnsJson;
                            } catch (e) {
                                console.warn('Failed to parse columnsJson for form', form.id, 'field', field.id);
                                field.columns = [];
                            }
                        }
                        return field;
                    })
                }));
                setAvailableForms(processedForms);
            }
        } catch (error) {
            console.error("Error fetching available forms:", error);
        } finally {
            setLoadingForms(false);
        }
    };

    const handleClearForm = () => {
        localStorage.removeItem("formBuilderFields");
        setFormFields([]); // Optional: Reset state if needed
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

            console.log("=== COPY FORMAT DEBUG - SOURCE DATA ===");
            console.log("Original fields:", data.fields);

            // Transform the fields with COMPLETE property mapping
            const transformedFields = (data.fields || []).map((field, index) => {
                console.log(`=== COPYING FIELD ${index} ===`);
                console.log("Original field:", field);

                const isGrid = field.type === "grid";
                const isLinked = field.type === "linkedTextbox";

                // CRITICAL: Copy ALL properties from the original field
                const copiedField = {
                    id: generateGuid(), // Generate new ID to avoid conflicts
                    type: field.type,
                    label: field.label || field.name || `Field ${index}`,
                    name: field.name || field.label || `Field ${index}`,
                    required: field.required || false,
                    width: field.width || "w-full",
                    order: field.order !== undefined ? field.order : index,

                    // Copy ALL dropdown-specific properties
                    options: Array.isArray(field.options) ? [...field.options] : [],
                    requireRemarks: Array.isArray(field.requireRemarks)
                        ? [...field.requireRemarks]
                        : (Array.isArray(field.remarksOptions) ? [...field.remarksOptions] : []),

                    // Copy numeric field properties
                    min: field.min !== undefined ? field.min : null,
                    max: field.max !== undefined ? field.max : null,
                    decimal: field.decimal !== undefined ? field.decimal : null,
                    requireRemarksOutOfRange: field.requireRemarksOutOfRange || false,

                    // Copy calculation properties
                    formula: field.formula || "",
                    resultDecimal: field.resultDecimal || false,
                    fieldReferences: field.fieldReferencesJson ?
                        JSON.parse(field.fieldReferencesJson) : (field.fieldReferences || []),

                    // Copy remark triggers
                    remarkTriggers: Array.isArray(field.remarkTriggers) ?
                        [...field.remarkTriggers] : [],

                    // Copy visual properties
                    textColor: field.textColor || "#000000",
                    backgroundColor: field.backgroundColor || "#ffffff",

                    // Copy grid-specific properties
                    parentColumn: field.parentColumn || "",
                    dependentOptions: field.dependentOptions || {},
                    startTime: field.startTime || "",
                    endTime: field.endTime || "",

                    // Copy date properties
                    showDayInTextbox: field.showDayInTextbox || false,

                    // Copy image properties
                    IMAGEOPTIONS: field.IMAGEOPTIONS || null,
                    imageFile: null, // Don't copy the actual file
                    maxFileSize: field.maxFileSize || 5242880,

                    // CRITICAL: Copy ALL linked field properties
                    linkedFormId: field.linkedFormId || null,
                    linkedFieldId: field.linkedFieldId || null,
                    linkedFieldType: field.linkedFieldType || null,
                    linkedGridFieldId: field.linkedGridFieldId || null,
                    linkedColumnId: field.linkedColumnId || null,
                    displayMode: field.displayMode || null,
                    displayFormat: field.displayFormat || null,
                    allowManualEntry: field.allowManualEntry || null,
                    showLookupButton: field.showLookupButton || null,
                    keyFieldMappingsJson: field.keyFieldMappingsJson || null,
                    keyFieldMappings: field.keyFieldMappings || []
                };

                // Handle grid fields with complete column copying
                if (isGrid) {
                    console.log("=== COPYING GRID FIELD ===");
                    console.log("Original columns:", field.columns);

                    let columns = [];

                    // Try multiple ways to get columns (like in fetchFormLayout)
                    if (field.columnsJson) {
                        try {
                            if (typeof field.columnsJson === 'string') {
                                columns = JSON.parse(field.columnsJson);
                            } else if (Array.isArray(field.columnsJson)) {
                                columns = field.columnsJson;
                            }
                        } catch (e) {
                            console.error("Failed to parse columnsJson:", e);
                        }
                    }

                    // Fallback to columns property
                    if ((!columns || columns.length === 0) && field.columns && Array.isArray(field.columns)) {
                        columns = field.columns;
                    }

                    // Fallback to column property (old format)
                    if ((!columns || columns.length === 0) && field.column && Array.isArray(field.column)) {
                        columns = field.column;
                    }

                    // Copy columns with ALL their properties
                    copiedField.columns = (columns || []).map(col => ({
                        id: generateGuid(), // New ID for column
                        name: col.name || "",
                        type: col.type || "textbox",
                        width: col.width || "1fr",
                        required: col.required || false,

                        // CRITICAL: Copy ALL column properties
                        options: Array.isArray(col.options) ? [...col.options] : [],
                        textColor: col.textColor || "#000000",
                        backgroundColor: col.backgroundColor || "#ffffff",
                        formula: col.formula || "",
                        min: col.min !== undefined ? col.min : null,
                        max: col.max !== undefined ? col.max : null,
                        decimal: col.decimal !== undefined ? col.decimal : null,
                        parentColumn: col.parentColumn || "",
                        dependentOptions: col.dependentOptions || {},
                        startTime: col.startTime || "",
                        endTime: col.endTime || "",
                        remarksOptions: Array.isArray(col.remarksOptions) ? col.remarksOptions : [],
                        // Copy linked properties for grid columns
                        linkedFormId: col.linkedFormId || null,
                        linkedFieldId: col.linkedFieldId || null,
                        linkedFieldType: col.linkedFieldType || null,
                        linkedGridFieldId: col.linkedGridFieldId || null,
                        linkedColumnId: col.linkedColumnId || null,
                        displayMode: col.displayMode || null,
                        displayFormat: col.displayFormat || null,
                        allowManualEntry: col.allowManualEntry || null,
                        showLookupButton: col.showLookupButton || null,
                        keyFieldMappingsJson: col.keyFieldMappingsJson || null,
                        keyFieldMappings: col.keyFieldMappings || []
                    }));

                    // Copy grid settings
                    copiedField.initialRows = field.initialRows || 3;
                    copiedField.minRows = field.minRows || 1;
                    copiedField.maxRows = field.maxRows || 10;
                }

                // Handle linked field mappings
                if (isLinked && field.keyFieldMappingsJson) {
                    try {
                        const mappings = JSON.parse(field.keyFieldMappingsJson);
                        copiedField.keyFieldMappings = mappings.map(mapping => ({
                            currentField: mapping.currentFormField || mapping.currentField,
                            linkedField: mapping.linkedFormField || mapping.linkedField
                        }));
                    } catch (e) {
                        console.warn("Failed to parse keyFieldMappingsJson:", e);
                    }
                }

                console.log("=== COPIED FIELD RESULT ===");
                console.log("Copied field:", copiedField);

                return copiedField;
            });

            console.log("=== FINAL TRANSFORMED FIELDS ===");
            console.log("Transformed fields:", transformedFields);

            // Sort fields by their order property
            const sortedFields = transformedFields.sort((a, b) => a.order - b.order);

            // Copy the format but keep current form name and ID
            setFormFields(sortedFields);
            setApprovers(data.approvers || []); // Optionally copy approvers too
            setAllowedUsers(data.allowedUsers || []);

            // Handle linked form
            if (data.linkedFormId) {
                fetchLinkedFormDetails(data.linkedFormId);
            }

            // Handle key fields
            if (data.keyFields && data.keyFields.length > 0) {
                const reconstructedKeyFields = data.keyFields.map(kf => ({
                    currentFormField: kf.currentFieldType === 'gridColumn'
                        ? `${kf.currentParentFieldId}.${kf.currentColumnId}`
                        : kf.currentFormField,
                    linkedFormField: kf.linkedFieldType === 'gridColumn'
                        ? `${kf.linkedParentFieldId}.${kf.linkedColumnId}`
                        : kf.linkedFormField
                }));
                setKeyFields(reconstructedKeyFields);
            }

            alert(`Successfully copied format from "${data.name}". All field properties have been preserved.`);
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
        setOriginalFormLink(formLink);

        try {
            const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/form-builder/link/${encodeURIComponent(formLink)}`);


            let data;

            try {
                data = await response.json();

                console.log('API Response:', data);
                data.fields?.forEach(field => {
                    if (field.type === 'image') {
                        console.log(`Image field ${field.id} IMAGEOPTIONS:`, field.IMAGEOPTIONS);
                    }
                });
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

            // Restore linked form data
            // Around line 350-380, update the key fields restoration:
            if (data.linkedFormId) {
                await fetchLinkedFormDetails(data.linkedFormId);

                // Convert the keyFieldMappings to the expanded format expected by frontend
                const expandedKeyFields = (data.keyFieldMappings || []).map(keyField => ({
                    currentFormField: keyField.currentFormField,
                    linkedFormField: keyField.linkedFormField,
                    // Parse grid column references
                    currentFieldType: keyField.currentFormField?.includes('.') ? 'gridColumn' : 'field',
                    linkedFieldType: keyField.linkedFormField?.includes('.') ? 'gridColumn' : 'field',
                    linkedFieldId: keyField.linkedFieldId || null,
                    linkedGridFieldId: keyField.linkedGridFieldId || null,
                    linkedFieldReference: keyField.linkedFormField?.includes('.') && keyField.linkedGridFieldId && keyField.linkedColumnId
                        ? `${keyField.linkedGridFieldId}.${keyField.linkedColumnId}`
                        : keyField.linkedFieldId || "",
                    // Extract parent field ID and column ID for grid columns
                    currentParentFieldId: keyField.currentFormField?.includes('.')
                        ? keyField.currentFormField.split('.')[0]
                        : null,
                    currentColumnId: keyField.currentFormField?.includes('.')
                        ? keyField.currentFormField.split('.')[1]
                        : null,
                    linkedParentFieldId: keyField.linkedFormField?.includes('.')
                        ? keyField.linkedFormField.split('.')[0]
                        : null,
                    linkedColumnId: keyField.linkedFormField?.includes('.')
                        ? keyField.linkedFormField.split('.')[1]
                        : null,
                }));

                setKeyFields(expandedKeyFields);
            }
            console.log("Data ", data)
            // Transform the fields similar to before

            const transformedFields = (data.fields || []).map((field, index) => {
                const isGrid = field.type === "grid";
                const isLinkedField = field.type === "linkedTextbox";

                const transformedField = {
                    ...field,
                    id: field.id || generateGuid(),
                    order: field.order !== undefined ? field.order : index,
                    decimal: field.decimal !== undefined ? field.decimal : (field.isDecimal || false),
                    requireRemarksOutOfRange: field.requireRemarksOutOfRange !== undefined
                        ? field.requireRemarksOutOfRange
                        : false,

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
                            decimal: col.isDecimal ?? true,
                            parentColumn: col.parentColumn || "",
                            dependentOptions: col.dependentOptions || {},
                            startTime: col.startTime || "",
                            endTime: col.endTime || "",
                            remarksOptions: Array.isArray(col.remarksOptions) ? col.remarksOptions : [],
                            requireRemarks: Array.isArray(col.requireRemarks) ? col.requireRemarks : [],
                            // Handle linked textbox columns in grids
                            ...(col.type === "linkedTextbox" && {
                                linkedFormId: col.linkedFormId || (linkedForm?.id || null),
                                linkedFieldId: col.linkedFieldId,
                                linkedFieldType: col.linkedFieldType || "field",
                                linkedGridFieldId: col.linkedGridFieldId,
                                linkedColumnId: col.linkedColumnId,
                                linkedFieldReference: col.linkedFieldType === "gridColumn" && col.linkedGridFieldId && col.linkedColumnId
                                    ? `${col.linkedGridFieldId}.${col.linkedColumnId}`
                                    : col.linkedFieldId || "",
                                displayMode: col.displayMode || "readonly",
                                displayFormat: col.displayFormat || "{value}",
                                allowManualEntry: col.allowManualEntry || false,
                                showLookupButton: col.showLookupButton !== false,
                                keyFieldMappings: col.keyFieldMappingsJson ?
                                    JSON.parse(col.keyFieldMappingsJson).map(mapping => ({
                                        currentField: mapping.currentFormField,
                                        linkedField: mapping.linkedFormField
                                    })) : []
                            })
                        }))
                        : undefined,
                    column: undefined,
                    formula: field.formula || "",
                    resultDecimal: field.resultDecimal || false,
                    fieldReferences: field.fieldReferencesJson || [],
                    remarkTriggers: field.remarkTriggers || [],

                    // Preserve linked field properties
                    linkedFormId: field.linkedFormId || null,
                    IMAGEOPTIONS: field.IMAGEOPTIONS,
                };

                // Handle linked field specific properties
                if (isLinkedField) {
                    transformedField.linkedFormId = field.linkedFormId || (linkedForm?.id || null);
                    transformedField.linkedFieldId = field.linkedFieldId;
                    transformedField.linkedFieldType = field.linkedFieldType || "field";
                    transformedField.linkedGridFieldId = field.linkedGridFieldId;
                    transformedField.linkedColumnId = field.linkedColumnId;

                    // Set linkedFieldReference based on field type
                    transformedField.linkedFieldReference = field.linkedFieldType === "gridColumn" && field.linkedGridFieldId && field.linkedColumnId
                        ? `${field.linkedGridFieldId}.${field.linkedColumnId}`
                        : field.linkedFieldId || "";

                    transformedField.displayMode = field.displayMode || "readonly";
                    transformedField.displayFormat = field.displayFormat || "{value}";
                    transformedField.allowManualEntry = field.allowManualEntry || false;
                    transformedField.showLookupButton = field.showLookupButton !== false;

                    // Parse key field mappings and convert property names
                    if (field.keyFieldMappingsJson) {
                        try {
                            const mappings = JSON.parse(field.keyFieldMappingsJson);
                            transformedField.keyFieldMappings = mappings.map(mapping => ({
                                currentField: mapping.currentFormField,  // Convert from backend property name
                                linkedField: mapping.linkedFormField    // Convert from backend property name
                            }));
                        } catch (e) {
                            console.warn('Failed to parse keyFieldMappingsJson:', e);
                            transformedField.keyFieldMappings = [];
                        }
                    } else if (field.keyFieldMappings) {
                        // Handle if keyFieldMappings is already parsed
                        transformedField.keyFieldMappings = field.keyFieldMappings.map(mapping => ({
                            currentField: mapping.currentFormField || mapping.currentField,
                            linkedField: mapping.linkedFormField || mapping.linkedField
                        }));
                    } else {
                        transformedField.keyFieldMappings = [];
                    }
                }

                return transformedField;
            });

            const sortedFields = transformedFields.sort((a, b) => a.order - b.order);
            setFormFields(sortedFields);
            setApprovers(data.approvers || []);
            setAllowedUsers(data.allowedUsers || []);
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

        const currentUtc = new Date();
        const currentUser = user[0].toLowerCase();

        try {
            // Handle image uploads first
            console.log('=== DEBUGGING IMAGE UPLOAD ===');
            console.log('Total formFields:', formFields.length);

            for (let i = 0; i < formFields.length; i++) {
                const field = formFields[i];

                if (field.type === 'image' && field.imageFile) {
                    console.log('Uploading image:', field.imageFile.name);

                    const imageFormData = new FormData();
                    imageFormData.append('image', field.imageFile);

                    const uploadResponse = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/Image/upload-image`, {
                        method: 'POST',
                        body: imageFormData
                    });

                    if (uploadResponse.ok) {
                        const result = await uploadResponse.json();

                        // Store image data as a JSON STRING, not an object
                        const imageOptionsData = {
                            imageUrl: result.url,
                            fileName: result.filename,
                            fileSize: result.size,
                            maxFileSize: 5242880,
                            allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
                            uploadedAt: new Date().toISOString()
                        };

                        // CRITICAL: Store as JSON string to prevent array parsing issues
                        formFields[i] = {
                            ...formFields[i],
                            IMAGEOPTIONS: JSON.stringify(imageOptionsData)
                        };

                        // Remove file object to prevent serialization issues
                        delete formFields[i].imageFile;
                        console.log('Image uploaded successfully:', result.url);
                    } else {
                        throw new Error('Image upload failed');
                    }
                }
            }

            // Get existing row version for updates - CRITICAL FIX
            let existingRowVersion = "";
            if (formId) {
                const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/${formId}`);
                if (response.ok) {
                    const currentForm = await response.json();
                    existingRowVersion = currentForm.rowVersion || "";
                }
            }

            // For new forms, set a default empty string for rowVersion
            if (!existingRowVersion && !formId) {
                existingRowVersion = "";
            }

            // Base form object - SIMPLIFIED to avoid circular references
            const baseForm = {
                id: formId || 0,
                name: formName,
                formLink: originalFormLink || formName.toLowerCase().replace(/\s+/g, "-"),
                createdBy: currentUser,
                createdAt: currentUtc,
                updatedBy: currentUser,
                updatedAt: currentUtc,
                // CRITICAL: Always provide rowVersion, even if empty string
                rowVersion: existingRowVersion,
                linkedFormId: linkedForm?.id || null
            };

            // Construct form data payload - CLEAN VERSION
            const formData = {
                ...baseForm,
                // CRITICAL: Add required form property at root level
                form: baseForm,

                // Process key fields
                keyFields: keyFields.map(keyField => ({
                    currentFormField: keyField.currentFormField,
                    linkedFormField: keyField.linkedFormField,
                    currentFieldType: keyField.currentFormField?.includes('.') ? 'gridColumn' : 'field',
                    linkedFieldType: keyField.linkedFormField?.includes('.') ? 'gridColumn' : 'field',
                    currentParentFieldId: keyField.currentFormField?.includes('.') ?
                        keyField.currentFormField.split('.')[0] : null,
                    currentColumnId: keyField.currentFormField?.includes('.') ?
                        keyField.currentFormField.split('.')[1] : null,
                    linkedParentFieldId: keyField.linkedFormField?.includes('.') ?
                        keyField.linkedFormField.split('.')[0] : null,
                    linkedColumnId: keyField.linkedFormField?.includes('.') ?
                        keyField.linkedFormField.split('.')[1] : null,
                })),
                keyFieldMappingsJson: JSON.stringify(keyFields.map(keyField => ({
                    currentFormField: keyField.currentFormField,
                    linkedFormField: keyField.linkedFormField,
                    currentFieldType: keyField.currentFormField?.includes('.') ? 'gridColumn' : 'field',
                    linkedFieldType: keyField.linkedFormField?.includes('.') ? 'gridColumn' : 'field',
                    currentParentFieldId: keyField.currentFormField?.includes('.') ?
                        keyField.currentFormField.split('.')[0] : null,
                    currentColumnId: keyField.currentFormField?.includes('.') ?
                        keyField.currentFormField.split('.')[1] : null,
                    linkedParentFieldId: keyField.linkedFormField?.includes('.') ?
                        keyField.linkedFormField.split('.')[0] : null,
                    linkedColumnId: keyField.linkedFormField?.includes('.') ?
                        keyField.linkedFormField.split('.')[1] : null,
                }))),

                // Process approvers
                approvers: approvers.map((a) => ({
                    adObjectId: a.name,
                    name: a.name,
                    email: a.email,
                    type: a.type,
                    level: a.level,
                    formId: baseForm.id
                })),

                // Process allowed users for access control
                allowedUsers: allowedUsers.map((u) => ({
                    adObjectId: u.id || u.adObjectId,
                    name: u.name,
                    email: u.email,
                    type: u.type,
                    formId: baseForm.id
                })),

                // CRITICAL: Clean field processing with proper RowVersion handling
                fields: formFields.map((field) => {
                    // Create a clean field object without circular references
                    const cleanField = {
                        id: field.id,
                        type: field.type,
                        label: field.label,
                        name: field.name,
                        required: field.required || false,
                        width: field.width,
                        formId: baseForm.id,
                        order: field.order,

                        // CRITICAL: Provide form reference WITH rowVersion
                        form: {
                            id: baseForm.id,
                            name: baseForm.name,
                            formLink: baseForm.formLink,
                            // FIX: Include rowVersion in each field's form reference
                            rowVersion: existingRowVersion,
                            createdBy: currentUser,
                            createdAt: currentUtc,
                            updatedBy: currentUser,
                            updatedAt: currentUtc,
                            linkedFormId: linkedForm?.id || null
                        },

                        // Handle field-specific properties safely
                        options: Array.isArray(field.options) ? field.options : [],
                        remarksOptions: Array.isArray(field.remarksOptions) ? field.remarksOptions : [],
                        requiresRemarks: Array.isArray(field.requireRemarks)
                            ? [...field.requireRemarks]
                            : (Array.isArray(field.remarksOptions) ? [...field.remarksOptions] : []),

                        ...(field.type === 'textbox' && {
                            minLength: field.minLength || null,
                            maxLength: field.maxLength || null,
                            lengthValidationMessage: field.lengthValidationMessage || ''
                        }),

                        ...(field.type === 'numeric' && {
                            min: field.min ?? null,
                            max: field.max ?? null,
                            decimal: field.decimal ?? false,
                            requireRemarksOutOfRange: field.requireRemarksOutOfRange ?? false
                        }),

                        // Handle image options safely - ensure it's a string or null
                        IMAGEOPTIONS: field.IMAGEOPTIONS && typeof field.IMAGEOPTIONS === 'string'
                            ? field.IMAGEOPTIONS
                            : (field.IMAGEOPTIONS ? JSON.stringify(field.IMAGEOPTIONS) : null),

                        // Handle numeric fields
                        min: field.min ?? null,
                        max: field.max ?? null,
                        decimal: field.decimal ?? false,
                        requireRemarksOutOfRange: field.requireRemarksOutOfRange ?? false,

                        // Handle calculation fields
                        formula: field.formula || "",
                        resultDecimal: field.resultDecimal ?? false,

                        // Handle field references - set to null to avoid circular reference issues
                        // Handle field references - set to null to avoid circular reference issues
                        fieldReferences: null,

                        // Handle remark triggers - WITH REQUIRED FormField REFERENCE
                        remarkTriggers: Array.isArray(field.remarkTriggers) && field.remarkTriggers.length > 0
                            ? field.remarkTriggers.map(trigger => ({
                                id: trigger.id || 0,
                                operator: trigger.condition || trigger.operator || "equals",
                                value: trigger.value || "",
                                message: trigger.message || "",
                                formFieldId: field.id || 0,

                                // API VALIDATION REQUIREMENT: Include FormField reference
                                formField: {
                                    id: field.id || 0,
                                    name: field.name,
                                    type: field.type,
                                    label: field.label,
                                    required: field.required || false,
                                    width: field.width,
                                    formId: baseForm.id,
                                    order: field.order,

                                    // Include essential field properties
                                    options: Array.isArray(field.options) ? field.options : [],
                                    min: field.min ?? null,
                                    max: field.max ?? null,
                                    decimal: field.decimal ?? false,
                                    formula: field.formula || "",

                                    // Minimal form reference without circular dependencies
                                    form: {
                                        id: baseForm.id,
                                        name: baseForm.name,
                                        formLink: baseForm.formLink,
                                        rowVersion: existingRowVersion,
                                        createdBy: currentUser,
                                        createdAt: currentUtc,
                                        updatedBy: currentUser,
                                        updatedAt: currentUtc,
                                        linkedFormId: linkedForm?.id || null
                                    }
                                    // IMPORTANT: Do NOT include remarkTriggers here to prevent circular reference
                                }
                            }))
                            : []

                    };

                    // Handle linked textbox fields
                    if (field.type === "linkedTextbox") {
                        cleanField.linkedFormId = field.linkedFormId || linkedForm?.id || null;
                        cleanField.displayMode = field.displayMode || "readonly";
                        cleanField.displayFormat = field.displayFormat || "{value}";
                        cleanField.allowManualEntry = field.allowManualEntry || false;
                        cleanField.showLookupButton = field.showLookupButton !== false;

                        // Handle linked field references
                        if (field.linkedFieldReference) {
                            if (field.linkedFieldReference.includes('.')) {
                                const [gridFieldId, columnId] = field.linkedFieldReference.split('.');
                                cleanField.linkedFieldId = null;
                                cleanField.linkedFieldType = "gridColumn";
                                cleanField.linkedGridFieldId = gridFieldId;
                                cleanField.linkedColumnId = columnId;
                            } else {
                                cleanField.linkedFieldId = field.linkedFieldReference;
                                cleanField.linkedFieldType = "field";
                                cleanField.linkedGridFieldId = null;
                                cleanField.linkedColumnId = null;
                            }
                        } else {
                            cleanField.linkedFieldId = field.linkedFieldId || null;
                            cleanField.linkedFieldType = field.linkedFieldType || null;
                            cleanField.linkedGridFieldId = field.linkedGridFieldId || null;
                            cleanField.linkedColumnId = field.linkedColumnId || null;
                        }

                        // Handle key field mappings - clean format
                        const mappings = (field.keyFieldMappings || []).map(mapping => ({
                            currentFormField: mapping.currentField,
                            linkedFormField: mapping.linkedField,
                            currentFieldType: mapping.currentField?.includes('.') ? 'gridColumn' : 'field',
                            linkedFieldType: mapping.linkedField?.includes('.') ? 'gridColumn' : 'field',
                            currentParentFieldId: mapping.currentField?.includes('.')
                                ? mapping.currentField.split('.')[0] : null,
                            currentColumnId: mapping.currentField?.includes('.')
                                ? mapping.currentField.split('.')[1] : null,
                            linkedParentFieldId: mapping.linkedField?.includes('.')
                                ? mapping.linkedField.split('.')[0] : null,
                            linkedColumnId: mapping.linkedField?.includes('.')
                                ? mapping.linkedField.split('.')[1] : null,
                        }));

                        cleanField.keyFieldMappings = mappings;
                        cleanField.keyFieldMappingsJson = JSON.stringify(mappings);
                    }

                    // Handle grid fields
                    if (field.type === "grid" && field.columns) {
                        const cleanColumns = field.columns.map(column => {
                            // In the saveForm function, update the cleanColumn creation (around line 800-900):

                            const cleanColumn = {
                                id: column.id,
                                name: column.name,
                                type: column.type,
                                width: column.width,
                                required: column.required || false,
                                options: Array.isArray(column.options) ? column.options : [],
                                labelText: column.labelText || '',
                                labelStyle: column.labelStyle || 'normal',
                                textAlign: column.textAlign || 'left',
                                textColor: column.textColor || "000000",
                                backgroundColor: column.backgroundColor || "ffffff",
                                minLength: column.minLength || null,
                                maxLength: column.maxLength || null,
                                lengthValidationMessage: column.lengthValidationMessage || '',

                                // CRITICAL FIX: Add formula for calculation columns
                                formula: column.formula || "",  // <-- ADD THIS LINE

                                // Also add other numeric and calculation-related fields
                                min: column.min ?? null,
                                max: column.max ?? null,
                                decimal: column.decimal ?? null,
                                parentColumn: column.parentColumn || "",
                                dependentOptions: column.dependentOptions || {},
                                startTime: column.startTime || "",
                                endTime: column.endTime || "",
                                /*remarksOptions: Array.isArray(column.remarksOptions) ? column.remarksOptions : [],*/
                                remarksOptions: Array.isArray(column.remarksOptions) ? column.remarksOptions : [],

                                // Handle linkedTextbox columns in grids
                                ...(column.type === "linkedTextbox" && {
                                    linkedFormId: column.linkedFormId || (linkedForm?.id) || null,
                                    linkedFieldId: column.linkedFieldId,
                                    displayMode: column.displayMode || "readonly",
                                    displayFormat: column.displayFormat || "value",
                                    allowManualEntry: column.allowManualEntry || false,
                                    showLookupButton: column.showLookupButton !== false,

                                    // Clean key field mappings for columns
                                    keyFieldMappings: (column.keyFieldMappings || []).map(mapping => ({
                                        currentFormField: mapping.currentField,
                                        linkedFormField: mapping.linkedField,
                                        currentFieldType: mapping.currentField?.includes(".") ? "gridColumn" : "field",
                                        linkedFieldType: mapping.linkedField?.includes(".") ? "gridColumn" : "field",
                                        currentParentFieldId: mapping.currentField?.includes(".") ? mapping.currentField.split(".")[0] : null,
                                        currentColumnId: mapping.currentField?.includes(".") ? mapping.currentField.split(".")[1] : null,
                                        linkedParentFieldId: mapping.linkedField?.includes(".") ? mapping.linkedField.split(".")[0] : null,
                                        linkedColumnId: mapping.linkedField?.includes(".") ? mapping.linkedField.split(".")[1] : null,
                                    })),
                                    keyFieldMappingsJson: JSON.stringify(columnMappings)
                                })
                            };


                            // Handle linkedTextbox columns in grids
                            if (column.type === "linkedTextbox") {
                                cleanColumn.linkedFormId = column.linkedFormId || linkedForm?.id || null;
                                cleanColumn.linkedFieldId = column.linkedFieldId;
                                cleanColumn.displayMode = column.displayMode || "readonly";
                                cleanColumn.displayFormat = column.displayFormat || "{value}";
                                cleanColumn.allowManualEntry = column.allowManualEntry || false;
                                cleanColumn.showLookupButton = column.showLookupButton !== false;

                                // Clean key field mappings for columns
                                const columnMappings = (column.keyFieldMappings || []).map(mapping => ({
                                    currentFormField: mapping.currentField,
                                    linkedFormField: mapping.linkedField,
                                    currentFieldType: mapping.currentField?.includes('.') ? 'gridColumn' : 'field',
                                    linkedFieldType: mapping.linkedField?.includes('.') ? 'gridColumn' : 'field',
                                    currentParentFieldId: mapping.currentField?.includes('.')
                                        ? mapping.currentField.split('.')[0] : null,
                                    currentColumnId: mapping.currentField?.includes('.')
                                        ? mapping.currentField.split('.')[1] : null,
                                    linkedParentFieldId: mapping.linkedField?.includes('.')
                                        ? mapping.linkedField.split('.')[0] : null,
                                    linkedColumnId: mapping.linkedField?.includes('.')
                                        ? mapping.linkedField.split('.')[1] : null,
                                }));

                                cleanColumn.keyFieldMappings = columnMappings;
                                cleanColumn.keyFieldMappingsJson = JSON.stringify(columnMappings);
                            }

                            return cleanColumn;
                        });

                        cleanField.columns = cleanColumns;
                        cleanField.columnsJson = JSON.stringify(cleanColumns);
                        cleanField.initialRows = field.initialRows || 3;
                        cleanField.minRows = field.minRows || 1;
                        cleanField.maxRows = field.maxRows || 10;
                    }

                    if (field.type === "calculation") {
                        fieldObj.formula = field.formula.replace(/\{([^}]+)\}/g, (match, fieldName) => {
                            const referencedField = formFields.find(f => f.name === fieldName);
                            return referencedField ? referencedField.id : match;
                        });
                    }

                    return cleanField;
                })
            };

            console.log("=== CLEAN PAYLOAD WITH ROWVERSION DEBUG ===");
            console.log("existingRowVersion:", existingRowVersion);
            console.log("baseForm.rowVersion:", baseForm.rowVersion);
            console.log("Sample field form rowVersion:", formData.fields[0]?.form?.rowVersion);
            console.log("Payload being sent to backend:", JSON.stringify(formData, null, 2));
            console.log("BRIDGE FIELD SAVE DEBUG:");
            formFields.forEach((field, index) => {
                if (field.type === 'linkedTextbox') {
                    console.log(`LinkedTextbox Field ${index}:`, {
                        id: field.id,
                        label: field.label,
                        linkedFormId: field.linkedFormId,
                        linkedFieldId: field.linkedFieldId,
                        linkedFieldReference: field.linkedFieldReference,
                        keyFieldMappings: field.keyFieldMappings,
                        keyFieldMappingsJson: field.keyFieldMappingsJson
                    });
                }
                if (field.type === 'dropdown' || field.type === 'checkbox') {
                    console.log(`Field ${index} (${field.type}):`, {
                        label: field.label,
                        options: field.options,
                        requireRemarks: field.requireRemarks,
                        remarksOptions: field.remarksOptions
                    });
                }
                if (field.type === 'grid' && field.columns) {
                    field.columns.forEach((column, colIndex) => {
                        if (column.type === 'linkedTextbox') {
                            console.log(`Grid Column LinkedTextbox ${index}-${colIndex}:`, {
                                columnId: column.id,
                                columnName: column.name,
                                linkedFormId: column.linkedFormId,
                                linkedFieldReference: column.linkedFieldReference,
                                keyFieldMappings: column.keyFieldMappings,
                                keyFieldMappingsJson: column.keyFieldMappingsJson
                            });
                        }
                    });
                }
            });

            const url = formId
                ? `${APP_CONSTANTS.API_BASE_URL}/api/forms/${formId}`
                : `${APP_CONSTANTS.API_BASE_URL}/api/forms`;

            const method = formId ? "PUT" : "POST";

            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    // CRITICAL: Include If-Match header for concurrency control
                    "If-Match": existingRowVersion ? `"${existingRowVersion}"` : "*"
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Server response:", errorText);

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
            toast.success("Form template saved successfully!");
            navigate(`/formbuilder/${responseBody.formLink}`);

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
            requireRemarks: [],
            remarksOptions: [],
            ...(type === "linkedTextbox" && {
                linkedFormId: linkedForm?.id || null,
                linkedFieldId: null,
                linkedFieldType: "field",
                linkedGridFieldId: null,
                linkedColumnId: null,
                linkedFieldReference: "",
                displayMode: "readonly",
                displayFormat: "{value}",
                allowManualEntry: false,
                showLookupButton: true,
                keyFieldMappings: [],
            }),
            ...(type === 'textbox' && {
                minLength: null,
                maxLength: null,
                lengthValidationMessage: ''
            }),
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
            ...(type === "linkedTextbox" && {
                // Linked field specific properties
                linkedFormId: linkedForm?.id || null,
                linkedFieldId: "", // Which field from the linked form to display
                displayMode: "readonly", // "readonly", "editable", "lookup"
                keyFieldMappings: [], // How to match records between forms
                displayFormat: "{value}", // How to format the displayed value
                allowManualEntry: false, // Whether user can type directly
                showLookupButton: true, // Whether to show a lookup/search button
            }),
            ...(type === "image" && {
                IMAGEOPTIONS: null,
                imageFile: null,
                maxFileSize: 5242880
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

    const moveApprover = (fromIndex, toIndex) => {
        setApprovers(prev => {
            if (fromIndex === toIndex) return prev;
            if (toIndex < 0 || toIndex >= prev.length) return prev; // out of bounds
            const next = [...prev];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return next;
        });
    };

    // Access control functions
    const addAllowedUser = (item) => {
        if (allowedUsers.some(u => u.id === item.id)) {
            alert("This user/group has already been added.");
            return;
        }
        setAllowedUsers([...allowedUsers, item]);
        setAccessSearchTerm("");
        setAccessSearchResults([]);
    };

    const removeAllowedUser = (index) => {
        setAllowedUsers(allowedUsers.filter((_, i) => i !== index));
    };

    const getAllFormFieldsWithGridColumns = (fields) => {
        const allFields = [];

        fields.forEach(field => {
            if (field.type === "grid" && field.columns) {
                // Add grid columns as selectable fields
                field.columns.forEach(column => {
                    allFields.push({
                        id: `${field.id}.${column.id}`, // Use dot notation for grid column reference
                        label: `${field.label} > ${column.name}`, // Show hierarchy
                        type: column.type,
                        isGridColumn: true,
                        parentFieldId: field.id,
                        columnId: column.id
                    });
                });
            } else if (["textbox", "numeric", "dropdown", "calculation"].includes(field.type)) {
                // Add regular fields
                allFields.push({
                    id: field.id,
                    label: field.label,
                    type: field.type,
                    isGridColumn: false
                });
            }
        });

        return allFields;
    };


    const KeyFieldsConfigurationSection = () => {
        const currentFormFields = getAllFormFieldsWithGridColumns(formFields);
        const linkedFormAllFields = getAllFormFieldsWithGridColumns(linkedFormFields);

        // Debug output
        console.log("=== KEY FIELDS UI DEBUG ===");
        console.log("Current form fields:", currentFormFields);
        console.log("Linked form fields:", linkedFormAllFields);

        return (
            <div className="mt-4 p-3 bg-white rounded border">
                <h3 className="text-sm font-semibold mb-2">Configure Bridge/Key Fields</h3>
                <p className="text-xs text-gray-600 mb-3">
                    Select fields that will be used to match records between forms. Grid columns are shown as "Grid Name Column Name"
                </p>

                {/* Debug info */}
                <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <h4 className="text-xs font-semibold text-yellow-800 mb-1">Debug Info:</h4>
                    <div className="text-xs text-yellow-700">
                        <div>Current form fields: {currentFormFields.length} total</div>
                        <div>- Regular fields: {currentFormFields.filter(f => !f.isGridColumn).length}</div>
                        <div>- Grid columns: {currentFormFields.filter(f => f.isGridColumn).length}</div>
                        <div>  Linked form fields: {linkedFormAllFields.length} total</div>
                        <div>- Regular fields: {linkedFormAllFields.filter(f => !f.isGridColumn).length}</div>
                        <div>- Grid columns: {linkedFormAllFields.filter(f => f.isGridColumn).length}</div>
                    </div>
                </div>

                <div className="space-y-2">
                    {keyFields.map((keyField, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <select
                                value={keyField.currentFormField || ""}
                                onChange={(e) => {
                                    const updated = [...keyFields];
                                    updated[index].currentFormField = e.target.value;
                                    setKeyFields(updated);
                                    console.log("Selected current form field:", e.target.value);
                                }}
                                className="flex-1 px-2 py-1 border rounded text-sm"
                            >
                                <option value="">Select field from current form</option>
                                <optgroup label="Regular Fields">
                                    {currentFormFields
                                        .filter(f => !f.isGridColumn)
                                        .map(field => (
                                            <option key={field.id} value={field.id}>
                                                {field.label}
                                            </option>
                                        ))}
                                </optgroup>
                                {currentFormFields.filter(f => f.isGridColumn).length > 0 && (
                                    <optgroup label="Grid Columns">
                                        {currentFormFields
                                            .filter(f => f.isGridColumn)
                                            .map(field => (
                                                <option key={field.id} value={field.id}>
                                                    {field.label}
                                                </option>
                                            ))}
                                    </optgroup>
                                )}
                            </select>

                            <span className="text-gray-500">=</span>

                            <select
                                value={keyField.linkedFormField || ""}
                                onChange={(e) => {
                                    const updated = [...keyFields];
                                    updated[index].linkedFormField = e.target.value;
                                    setKeyFields(updated);
                                    console.log("Selected linked form field:", e.target.value);
                                }}
                                className="flex-1 px-2 py-1 border rounded text-sm"
                            >
                                <option value="">Select field from {linkedForm.name}</option>
                                <optgroup label="Regular Fields">
                                    {linkedFormAllFields
                                        .filter(f => !f.isGridColumn)
                                        .map(field => (
                                            <option key={field.id} value={field.id}>
                                                {field.label}
                                            </option>
                                        ))}
                                </optgroup>
                                {linkedFormAllFields.filter(f => f.isGridColumn).length > 0 && (
                                    <optgroup label="Grid Columns">
                                        {linkedFormAllFields
                                            .filter(f => f.isGridColumn)
                                            .map(field => (
                                                <option key={field.id} value={field.id}>
                                                    {field.label}
                                                </option>
                                            ))}
                                    </optgroup>
                                )}
                            </select>

                            <button
                                onClick={() => {
                                    const updated = keyFields.filter((_, i) => i !== index);
                                    setKeyFields(updated);
                                }}
                                className="text-red-500 hover:text-red-600"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={() => setKeyFields([...keyFields, { currentFormField: "", linkedFormField: "" }])}
                        className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                    >
                        <Plus size={14} /> Add Key Field Pair
                    </button>
                </div>

                {/* Enhanced preview */}
                {keyFields.length > 0 && (
                    <div className="mt-4 p-2 bg-gray-50 rounded border">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Bridge Configuration Summary:</h4>
                        <div className="space-y-1">
                            {keyFields.map((keyField, index) => {
                                if (keyField.currentFormField && keyField.linkedFormField) {
                                    const currentField = currentFormFields.find(f => f.id === keyField.currentFormField);
                                    const linkedField = linkedFormAllFields.find(f => f.id === keyField.linkedFormField);

                                    return (
                                        <div key={index} className="text-xs text-gray-600">
                                            <span className="font-medium">{currentField?.label || 'Unknown'}</span>
                                            <span className="text-gray-400"> ↔ </span>
                                            <span className="font-medium">{linkedField?.label || 'Unknown'}</span>
                                            {currentField?.isGridColumn && <span className="ml-2 px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Grid Column</span>}
                                            {linkedField?.isGridColumn && <span className="ml-2 px-1 py-0.5 bg-green-100 text-green-700 rounded text-xs">Linked Grid Column</span>}
                                        </div>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    </div>
                )}

                {/* Raw data dump for debugging */}
                <details className="mt-4">
                    <summary className="text-xs text-gray-500 cursor-pointer">Show raw data (for debugging)</summary>
                    <div className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                        <div className="mb-2">
                            <strong>Linked Form Fields:</strong>
                            <pre>{JSON.stringify(linkedFormFields, null, 2)}</pre>
                        </div>
                        <div>
                            <strong>Processed Fields:</strong>
                            <pre>{JSON.stringify(linkedFormAllFields, null, 2)}</pre>
                        </div>
                    </div>
                </details>
            </div>
        );
    };

    const handleImageUpload = (event, fieldId) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file size (e.g., max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        // Create preview URL
        const imageUrl = URL.createObjectURL(file);

        // Find and update the field
        const fieldIndex = formFields.findIndex(f => f.id === fieldId);
        if (fieldIndex !== -1) {
            updateField(fieldIndex, {
                imageUrl: imageUrl,
                imageFile: file,
                fileName: file.name
            });
        }
    };


    // Temporary debug component - add this to your FormBuilder component
    const GridDebugComponent = () => {
        KeyFieldsConfigurationSection()
        return (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
                <h3 className="text-lg font-semibold mb-3 text-red-800">Grid Debug Information</h3>

                <div className="space-y-4">
                    <div>
                        <h4 className="font-medium text-red-700">Current Form Fields:</h4>
                        <div className="mt-2 p-2 bg-white rounded border max-h-60 overflow-auto">
                            {formFields.map((field, index) => (
                                <div key={field.id} className="mb-3 p-2 border-b border-gray-200">
                                    <div className="text-sm font-medium">Field {index}: {field.label} ({field.type})</div>
                                    {field.type === "grid" && (
                                        <div className="ml-4 mt-1 text-xs">
                                            <div>Columns property: {field.columns ? 'EXISTS' : 'MISSING'}</div>
                                            <div>ColumnsJson property: {field.columnsJson ? 'EXISTS' : 'MISSING'}</div>
                                            <div>Column property: {field.column ? 'EXISTS' : 'MISSING'}</div>
                                            {field.columns && (
                                                <div className="mt-1">
                                                    <div>Columns count: {Array.isArray(field.columns) ? field.columns.length : 'NOT ARRAY'}</div>
                                                    {Array.isArray(field.columns) && field.columns.map((col, colIndex) => (
                                                        <div key={colIndex} className="ml-2 text-gray-600">
                                                            - {col.name} ({col.type}) [ID: {col.id}]
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {field.columnsJson && (
                                                <div className="mt-1">
                                                    <div>ColumnsJson type: {typeof field.columnsJson}</div>
                                                    <details>
                                                        <summary className="cursor-pointer">Show columnsJson</summary>
                                                        <pre className="text-xs bg-gray-100 p-1 mt-1 rounded overflow-auto max-h-32">
                                                            {JSON.stringify(field.columnsJson, null, 2)}
                                                        </pre>
                                                    </details>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {linkedForm && (
                        <div>
                            <h4 className="font-medium text-red-700">Linked Form Fields:</h4>
                            <div className="mt-2 p-2 bg-white rounded border max-h-60 overflow-auto">
                                {linkedFormFields.map((field, index) => (
                                    <div key={field.id || index} className="mb-3 p-2 border-b border-gray-200">
                                        <div className="text-sm font-medium">Field {index}: {field.label} ({field.type})</div>
                                        {field.type === "grid" && (
                                            <div className="ml-4 mt-1 text-xs">
                                                <div>Columns property: {field.columns ? 'EXISTS' : 'MISSING'}</div>
                                                <div>ColumnsJson property: {field.columnsJson ? 'EXISTS' : 'MISSING'}</div>
                                                {field.columns && (
                                                    <div className="mt-1">
                                                        <div>Columns count: {Array.isArray(field.columns) ? field.columns.length : 'NOT ARRAY'}</div>
                                                        {Array.isArray(field.columns) && field.columns.map((col, colIndex) => (
                                                            <div key={colIndex} className="ml-2 text-gray-600">
                                                                - {col.name} ({col.type}) [ID: {col.id}]
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h4 className="font-medium text-red-700">Available Fields for Bridge:</h4>
                        <div className="mt-2 p-2 bg-white rounded border">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm font-medium mb-2">Current Form:</div>
                                    {getAllFormFieldsWithGridColumns(formFields).map((field, index) => (
                                        <div key={index} className="text-xs mb-1">
                                            {field.isGridColumn ? '📊' : '📝'} {field.label}
                                            <span className="ml-2 text-gray-500">({field.id})</span>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <div className="text-sm font-medium mb-2">Linked Form:</div>
                                    {getAllFormFieldsWithGridColumns(linkedFormFields).map((field, index) => (
                                        <div key={index} className="text-xs mb-1">
                                            {field.isGridColumn ? '📊' : '📝'} {field.label}
                                            <span className="ml-2 text-gray-500">({field.id})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => {
                        console.log("=== MANUAL DEBUG TRIGGER ===");
                        console.log("formFields:", formFields);
                        console.log("linkedFormFields:", linkedFormFields);
                        console.log("linkedForm:", linkedForm);
                    }}
                    className="mt-3 bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                >
                    Log Data to Console
                </button>
            </div>
        );
    };

    // Add this component to your FormBuilder return statement, right after the form name section:
    // <GridDebugComponent />

    if (loading) return <LoadingDots />;



    return (
        <Layout>

            <DndProvider backend={HTML5Backend}>
                <div className="max-w-8xl mx-auto p-2">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold mb-4">Form Builder</h1>

                        {/* Form Name and Linking Configuration */}
                        <div className="bg-gray-50 p-4 rounded border mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Form Name</label>
                                    <input
                                        type="text"
                                        placeholder="Enter the Form Name"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        className="w-full py-2 px-3 border rounded"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Link to Form (Optional)</label>
                                    <select
                                        value={linkedForm?.id || ""}
                                        onChange={(e) => {
                                            const selectedFormId = e.target.value;
                                            if (selectedFormId) {
                                                fetchLinkedFormDetails(selectedFormId).then(() => {
                                                    // Force re-render of bridge field options
                                                    console.log("Linked form loaded, bridge fields should now be available");
                                                });
                                            } else {
                                                setLinkedForm(null);
                                                setLinkedFormFields([]);
                                                setKeyFields([]);
                                            }
                                        }}
                                        className="w-full py-2 px-3 border rounded"
                                    >
                                        <option value="">Select a form to link...</option>
                                        {availableForms.map(form => (
                                            <option key={form.id} value={form.id}>
                                                {form.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Key Fields Configuration */}
                            {linkedForm && (
                                <div className="mt-4 p-3 bg-white rounded border">
                                    <h3 className="text-sm font-semibold mb-2">Configure Bridge/Key Fields</h3>
                                    <p className="text-xs text-gray-600 mb-3">
                                        Select fields that will be used to match records between forms. Grid columns are shown as "Grid Name  Column Name"
                                    </p>

                                    <div className="space-y-2">
                                        {keyFields.map((keyField, index) => {
                                            // Get available fields for current form (including grid columns)
                                            const currentFormFields = getAllFormFieldsWithGridColumns(formFields);
                                            // Get available fields for linked form (including grid columns)
                                            const linkedFormFields2 = getAllFormFieldsWithGridColumns(linkedFormFields);

                                            return (
                                                <div key={index} className="flex items-center gap-2">
                                                    <select
                                                        value={keyField.currentFormField || ""}
                                                        onChange={(e) => {
                                                            const updated = [...keyFields];
                                                            updated[index].currentFormField = e.target.value;
                                                            setKeyFields(updated);
                                                        }}
                                                        className="flex-1 px-2 py-1 border rounded text-sm"
                                                    >
                                                        <option value="">Select field from current form</option>
                                                        <optgroup label="Regular Fields">
                                                            {currentFormFields
                                                                .filter(f => !f.isGridColumn)
                                                                .map(field => (
                                                                    <option key={field.id} value={field.id}>
                                                                        {field.label}
                                                                    </option>
                                                                ))}
                                                        </optgroup>
                                                        <optgroup label="Grid Columns">
                                                            {currentFormFields
                                                                .filter(f => f.isGridColumn)
                                                                .map(field => (
                                                                    <option key={field.id} value={field.id}>
                                                                        {field.label}
                                                                    </option>
                                                                ))}
                                                        </optgroup>
                                                    </select>

                                                    <span className="text-gray-500">=</span>

                                                    <select
                                                        value={keyField.linkedFormField || ""}
                                                        onChange={(e) => {
                                                            const updated = [...keyFields];
                                                            updated[index].linkedFormField = e.target.value;
                                                            setKeyFields(updated);
                                                        }}
                                                        className="flex-1 px-2 py-1 border rounded text-sm"
                                                    >
                                                        <option value="">Select field from {linkedForm.name}</option>
                                                        <optgroup label="Regular Fields">
                                                            {linkedFormFields2
                                                                .filter(f => !f.isGridColumn)
                                                                .map(field => (
                                                                    <option key={field.id} value={field.id}>
                                                                        {field.label}
                                                                    </option>
                                                                ))}
                                                        </optgroup>
                                                        <optgroup label="Grid Columns">
                                                            {linkedFormFields2
                                                                .filter(f => f.isGridColumn)
                                                                .map(field => (
                                                                    <option key={field.id} value={field.id}>
                                                                        {field.label}
                                                                    </option>
                                                                ))}
                                                        </optgroup>
                                                    </select>


                                                    <button
                                                        onClick={() => {
                                                            const updated = keyFields.filter((_, i) => i !== index);
                                                            setKeyFields(updated);
                                                        }}
                                                        className="text-red-500 hover:text-red-600"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        <button
                                            onClick={() => setKeyFields([...keyFields, { currentFormField: "", linkedFormField: "" }])}
                                            className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                                        >
                                            <Plus size={14} /> Add Key Field Pair
                                        </button>
                                    </div>

                                    {/* Preview of selected bridge fields */}
                                    {keyFields.length > 0 && (
                                        <div className="mt-4 p-2 bg-gray-50 rounded border">
                                            <h4 className="text-xs font-semibold text-gray-700 mb-2">Bridge Configuration Summary:</h4>
                                            <div className="space-y-1">
                                                {keyFields.map((keyField, index) => {
                                                    if (keyField.currentFormField && keyField.linkedFormField) {
                                                        const currentField = getAllFormFieldsWithGridColumns(formFields)
                                                            .find(f => f.id === keyField.currentFormField);
                                                        const linkedField = getAllFormFieldsWithGridColumns(linkedFormFields)
                                                            .find(f => f.id === keyField.linkedFormField);

                                                        return (
                                                            <div key={index} className="text-xs text-gray-600">
                                                                <span className="font-medium">{currentField?.label || 'Unknown'}</span>
                                                                <span className="text-gray-400"> ↔ </span>
                                                                <span className="font-medium">{linkedField?.label || 'Unknown'}</span>
                                                                {currentField?.isGridColumn && <span className="ml-2 px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Grid Column</span>}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowCopyFormat(!showCopyFormat)}
                                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                            >
                                <Copy size={16} />
                                Copy
                            </button>
                            <button
                                onClick={saveForm}
                                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                            >
                                <Save size={16} />
                                Save
                            </button>
                            <button
                                onClick={handleClearForm}
                                className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                            >
                                <Trash size={16} />
                                Clear
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

                    {/* Access Control Section */}
                    <div className="mb-6">
                        <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => setShowAccessConfig(!showAccessConfig)}
                        >
                            <h2 className="text-xl font-semibold">Form Access Control</h2>
                            {showAccessConfig ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>

                        {showAccessConfig && (
                            <div className="bg-blue-50 p-4 rounded border mt-2">
                                <div className="mb-3 text-sm text-gray-700">
                                    <strong>Note:</strong> Only users and groups added here will be able to access and fill out this form.
                                    If no users are specified, the form will be accessible to everyone.
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Search Users or Groups:</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={accessSearchTerm}
                                            onChange={(e) => setAccessSearchTerm(e.target.value)}
                                            placeholder="Search Active Directory for access control..."
                                            className="w-full px-3 py-2 border rounded"
                                        />
                                        {accessSearchTerm.length >= 3 && accessSearchResults.length === 0 && (
                                            <div className="absolute right-3 top-2 text-sm text-gray-500">No results</div>
                                        )}
                                    </div>
                                </div>

                                {accessSearchResults.length > 0 && (
                                    <div className="max-h-40 overflow-y-auto mb-4 border rounded bg-white">
                                        {accessSearchResults.map(item => (
                                            <div
                                                key={item.id}
                                                className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={() => addAllowedUser(item)}
                                            >
                                                {item.type === 'user'
                                                    ? <User size={16} className="text-blue-600" />
                                                    : <Users size={16} className="text-blue-600" />
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
                                    <h3 className="font-medium mb-2">Allowed Users & Groups:</h3>
                                    {allowedUsers.length === 0 ? (
                                        <div className="text-gray-500 italic p-3 bg-white rounded border">
                                            No access restrictions set. Form will be accessible to all users.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {allowedUsers.map((user, index) => (
                                                <div
                                                    key={user.id || index}
                                                    className="flex items-center justify-between p-3 bg-white rounded border"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {user.type === 'user'
                                                            ? <User size={18} className="text-blue-600" />
                                                            : <Users size={18} className="text-blue-600" />
                                                        }
                                                        <div>
                                                            <div className="font-medium">{user.name}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {user.type === 'user' ? user.email : 'Group'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeAllowedUser(index)}
                                                        className="text-red-500 hover:text-red-600"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>


                    <div className="mb-6 flex gap-2 flex-wrap sticky top-0 z-50 bg-white p-4 border-b border-gray-200">
                        {["textbox", "numeric", "dropdown", "checkbox", "radio", "date", "calculation", "time", "grid", "image"].map(
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
                        {linkedForm && (
                            <button
                                onClick={() => addField("linkedTextbox")}
                                className="bg-purple-100 px-4 py-2 rounded hover:bg-purple-200 text-purple-800"
                            >
                                Add Linked Field
                            </button>
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
                                    linkedForm={linkedForm}
                                    linkedFormFields={linkedFormFields}
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

const FormField = ({ field, index, allFields, moveField, updateField, removeField, linkedForm, linkedFormFields }) => {
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
    const [tempDropdownOptions, setTempDropdownOptions] = useState({});
    const [draggedColumnIndex, setDraggedColumnIndex] = useState(null);
    const [dragOverColumnIndex, setDragOverColumnIndex] = useState(null);
    const [newRemarkTrigger, setNewRemarkTrigger] = useState({
        value: "",
        operator: "=",
    });

    const getAllFormFieldsWithGridColumns = (fields) => {
        if (!fields || !Array.isArray(fields)) {
            return [];
        }

        const allFieldsWithColumns = [];

        fields.forEach((fieldItem) => {
            if (!fieldItem) return;

            if (fieldItem.type === "grid" && fieldItem.columns && Array.isArray(fieldItem.columns)) {
                fieldItem.columns.forEach((column) => {
                    if (column && column.id && column.name) {
                        allFieldsWithColumns.push({
                            id: `${fieldItem.id}.${column.id}`,
                            label: `${fieldItem.label || 'Grid'} > ${column.name}`,
                            type: column.type || 'textbox',
                            isGridColumn: true,
                            parentFieldId: fieldItem.id,
                            columnId: column.id
                        });
                    }
                });
            } else if (["textbox", "numeric", "dropdown", "calculation"].includes(fieldItem.type)) {
                allFieldsWithColumns.push({
                    id: fieldItem.id,
                    label: fieldItem.label || `${fieldItem.type} field`,
                    type: fieldItem.type,
                    isGridColumn: false
                });
            }
        });

        return allFieldsWithColumns;
    };


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
            requireRemarks: updatedRequiresRemarks,
        });
    };

    const toggleRequiresRemarks = (option) => {
        const requireRemarks = [...(field.requireRemarks || [])];
        if (requireRemarks.includes(option)) {
            updateField({
                requireRemarks: requireRemarks.filter((item) => item !== option),
            });
        } else {
            updateField({
                requireRemarks: [...requireRemarks, option],
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

    // Reorder columns function
    const reorderColumns = (fromIndex, toIndex) => {
        if (fromIndex === toIndex) return;

        const newColumns = [...field.columns];
        const [movedColumn] = newColumns.splice(fromIndex, 1);
        newColumns.splice(toIndex, 0, movedColumn);

        updateField({ columns: newColumns });
    };

    // Drag handlers for table headers
    const handleHeaderDragStart = (e, columnIndex) => {
        // Stop propagation to prevent grid drag
        e.stopPropagation();

        setDraggedColumnIndex(columnIndex);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', columnIndex.toString());

        // Add visual feedback
        setTimeout(() => {
            if (e.target) {
                e.target.style.opacity = '0.5';
            }
        }, 0);
    };

    const handleHeaderDragEnd = (e) => {
        e.stopPropagation();

        if (e.target) {
            e.target.style.opacity = '';
        }
        setDraggedColumnIndex(null);
        setDragOverColumnIndex(null);
    };

    const handleHeaderDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleHeaderDragEnter = (e, columnIndex) => {
        e.preventDefault();
        e.stopPropagation();

        if (draggedColumnIndex !== null && draggedColumnIndex !== columnIndex) {
            setDragOverColumnIndex(columnIndex);
        }
    };

    const handleHeaderDragLeave = (e) => {
        // Only clear if we're leaving the header entirely
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            setDragOverColumnIndex(null);
        }
    };

    const handleHeaderDrop = (e, dropColumnIndex) => {
        e.preventDefault();
        e.stopPropagation();

        if (draggedColumnIndex !== null && draggedColumnIndex !== dropColumnIndex) {
            reorderColumns(draggedColumnIndex, dropColumnIndex);
        }

        setDraggedColumnIndex(null);
        setDragOverColumnIndex(null);
    };

    return (
        <div
            ref={ref}
            className={`bg-white p-4 rounded border h-full ${isDragging ? "opacity-50" : ""
                }`}
        >
            <div className="flex flex-col gap-2 mb-4">
                <div className="flex items-center gap-4">
                    <GripVertical className="text-gray-400" />
                    <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField({ label: e.target.value })}
                        className="flex-1 px-2 py-1 border rounded"
                    />
                    <button
                        onClick={removeField}
                        className="text-red-500 hover:text-red-600"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* small dropdown */}
                <select
                    value={field.width}
                    onChange={(e) => updateField({ width: e.target.value })}
                    className="px-2 py-1 border rounded w-32"
                >
                    <option value="w-full">Full</option>
                    <option value="w-2/3">75%</option>
                    <option value="w-1/2">Half</option>
                    <option value="w-1/3">Third</option>
                    <option value="w-1/4">Quarter</option>
                    <option value="w-1/5">Fifth</option>
                    <option value="w-1/6">Sixth</option>
                    <option value="w-1/7">Seventh</option>
                    <option value="w-1/8">Eighth</option>
                </select>
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
            {field.type === "linkedTextbox" && (
                <div className="mb-4">
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Select Field from {linkedForm?.name || 'Linked Form'}</label>
                            <select
                                value={field.linkedFieldReference || ""}
                                onChange={(e) => {
                                    const selectedValue = e.target.value;
                                    console.log("=== LINKEDTEXTBOX FIELD SELECTED ===");
                                    console.log("selectedValue:", selectedValue);
                                    console.log("Available linked form fields:", linkedFormFields);
                                    console.log("Bridge field selection:", selectedValue);

                                    if (selectedValue.includes('.')) {
                                        const [gridFieldId, columnId] = selectedValue.split('.');
                                        updateField({
                                            linkedFieldId: null,
                                            linkedFieldType: "gridColumn",
                                            linkedGridFieldId: gridFieldId,
                                            linkedColumnId: columnId,
                                            linkedFieldReference: selectedValue,
                                            linkedFormId: linkedForm?.id || null
                                        });
                                    } else {
                                        updateField({
                                            linkedFieldId: selectedValue,
                                            linkedFieldType: "field",
                                            linkedGridFieldId: null,
                                            linkedColumnId: null,
                                            linkedFieldReference: selectedValue,
                                            linkedFormId: linkedForm?.id || null
                                        });
                                    }
                                }}
                                className="w-full px-2 py-1 border rounded"
                            >
                                <option value="">Select a field...</option>

                                {/* Regular fields */}
                                <optgroup label="Regular Fields">
                                    {linkedFormFields
                                        .filter(f => ["textbox", "numeric", "dropdown"].includes(f.type))
                                        .map(field => (
                                            <option key={field.id} value={field.id}>
                                                {field.label} ({field.type})
                                            </option>
                                        ))}
                                </optgroup>

                                {/* Grid column fields */}
                                <optgroup label="Grid Columns">
                                    {linkedFormFields
                                        .filter(f => f.type === "grid" && f.columns && Array.isArray(f.columns))
                                        .flatMap(gridField =>
                                            gridField.columns
                                                .filter(col => ["textbox", "numeric", "dropdown"].includes(col.type))
                                                .map(column => (
                                                    <option key={`${gridField.id}.${column.id}`} value={`${gridField.id}.${column.id}`}>
                                                        {gridField.label} → {column.name} ({column.type})
                                                    </option>
                                                ))
                                        )}
                                </optgroup>
                            </select>
                        </div>

                        {/* Configuration display */}
                        {(field.linkedFieldId || field.linkedFieldReference) && (
                            <div className="p-3 bg-blue-50 rounded border">
                                <h4 className="text-sm font-semibold mb-2">Linked Field Configuration</h4>
                                <div className="text-xs text-gray-600 space-y-1">
                                    <div>
                                        <span className="font-medium">Linked to:</span> {
                                            field.linkedFieldType === "gridColumn" ? (
                                                (() => {
                                                    const gridField = linkedFormFields.find(f => f.id === field.linkedGridFieldId);
                                                    const column = gridField?.columns?.find(c => c.id === field.linkedColumnId);
                                                    return `${gridField?.label || 'Unknown Grid'} → ${column?.name || 'Unknown Column'}`;
                                                })()
                                            ) : (
                                                (() => {
                                                    const regularField = linkedFormFields.find(f => f.id === field.linkedFieldId);
                                                    return regularField?.label || 'Unknown Field';
                                                })()
                                            )
                                        }
                                    </div>
                                    <div>
                                        <span className="font-medium">Type:</span> {field.linkedFieldType === "gridColumn" ? "Grid Column" : "Regular Field"}
                                    </div>
                                    <div>
                                        <span className="font-medium">Form:</span> {linkedForm?.name}
                                    </div>
                                </div>

                                {/* Key Field Mappings for this specific field */}
                                <div className="mt-3">
                                    <h5 className="text-xs font-semibold mb-2">Field-Specific Key Mappings (Optional)</h5>
                                    <p className="text-xs text-gray-500 mb-2">
                                        Configure additional key field mappings specific to this linked field.
                                    </p>

                                    {(field.keyFieldMappings || []).map((mapping, idx) => (
                                        <div key={idx} className="flex gap-2 mb-2 items-center">
                                            <select
                                                value={mapping.currentField || ""}
                                                onChange={(e) => {
                                                    const updated = [...(field.keyFieldMappings || [])];
                                                    updated[idx].currentField = e.target.value;
                                                    updateField({ keyFieldMappings: updated });
                                                }}
                                                className="flex-1 text-xs px-1 py-1 border rounded"
                                            >
                                                <option value="">Select current form field...</option>
                                                {getAllFormFieldsWithGridColumns(allFields).map(f => (
                                                    <option key={f.id} value={f.id}>
                                                        {f.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <span className="text-xs">=</span>
                                            <select
                                                value={mapping.linkedField || ""}
                                                onChange={(e) => {
                                                    const updated = [...(field.keyFieldMappings || [])];
                                                    updated[idx].linkedField = e.target.value;
                                                    updateField({ keyFieldMappings: updated });
                                                }}
                                                className="flex-1 text-xs px-1 py-1 border rounded"
                                            >
                                                <option value="">Select linked form field...</option>
                                                {getAllFormFieldsWithGridColumns(linkedFormFields).map(f => (
                                                    <option key={f.id} value={f.id}>
                                                        {f.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => {
                                                    const updated = (field.keyFieldMappings || []).filter((_, i) => i !== idx);
                                                    updateField({ keyFieldMappings: updated });
                                                }}
                                                className="text-red-500 hover:text-red-600"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}

                                    <button
                                        onClick={() => {
                                            const updated = [...(field.keyFieldMappings || []), { currentField: "", linkedField: "" }];
                                            updateField({ keyFieldMappings: updated });
                                        }}
                                        className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Add Mapping
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

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

                                <GripVertical className="text-gray-400 cursor-move mr-2" size={16} />
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
                                        <option value="date">Date</option>
                                        <option value="timecalculation">Time Calculation</option>
                                        <option value="dependentDropdown">Dependent Dropdown</option>
                                        <option value="label">Label</option>
                                        {linkedForm && <option value="linkedTextbox">Linked Field</option>}
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
                                <div className="w-full md:w-1/6 mb-2">
                                    <label className="block text-xs text-gray-500 mb-1">Required</label>
                                    <input
                                        type="checkbox"
                                        checked={column.required || false}
                                        onChange={(e) => {
                                            const updatedColumns = [...(field.columns || [])];
                                            updatedColumns[colIndex].required = e.target.checked;
                                            updateField({ ...field, columns: updatedColumns });
                                        }}
                                        className="h-4 w-4"
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

                                {column.type === 'label' && (
                                    <div className="w-full space-y-2 mt-2">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Label Text</label>
                                            <input
                                                type="text"
                                                value={column.labelText || ''}
                                                onChange={(e) => {
                                                    const updatedColumns = [...field.columns];
                                                    updatedColumns[colIndex].labelText = e.target.value;
                                                    updateField({ ...field, columns: updatedColumns });
                                                }}
                                                placeholder="Enter the label text to display"
                                                className="w-full px-2 py-1 border rounded"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Text Style</label>
                                            <select
                                                value={column.labelStyle || 'normal'}
                                                onChange={(e) => {
                                                    const updatedColumns = [...field.columns];
                                                    updatedColumns[colIndex].labelStyle = e.target.value;
                                                    updateField({ ...field, columns: updatedColumns });
                                                }}
                                                className="w-full px-2 py-1 border rounded"
                                            >
                                                <option value="normal">Normal</option>
                                                <option value="bold">Bold</option>
                                                <option value="italic">Italic</option>
                                                <option value="underline">Underline</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Text Alignment</label>
                                            <select
                                                value={column.textAlign || 'left'}
                                                onChange={(e) => {
                                                    const updatedColumns = [...field.columns];
                                                    updatedColumns[colIndex].textAlign = e.target.value;
                                                    updateField({ ...field, columns: updatedColumns });
                                                }}
                                                className="w-full px-2 py-1 border rounded"
                                            >
                                                <option value="left">Left</option>
                                                <option value="center">Center</option>
                                                <option value="right">Right</option>
                                            </select>
                                        </div>
                                    </div>
                                )}


                                {column.type === "dropdown" && (
                                    <div className="w-full mt-2">
                                        <label className="block text-xs text-gray-500 mb-1">Options (comma separated)</label>
                                        <input
                                            type="text"
                                            // Create unique key for each column
                                            value={tempDropdownOptions[`${field.id}_${colIndex}`] || (column.options || []).join(", ")}
                                            onChange={(e) => setTempDropdownOptions(prev => ({
                                                ...prev,
                                                [`${field.id}_${colIndex}`]: e.target.value
                                            }))}
                                            onBlur={() => {
                                                const currentKey = `${field.id}_${colIndex}`;
                                                const options = (tempDropdownOptions[currentKey] || "")
                                                    .split(",")
                                                    .map((opt) => opt.trim())
                                                    .filter(Boolean);

                                                const updatedColumns = [...(field.columns || [])];
                                                updatedColumns[colIndex] = {
                                                    ...updatedColumns[colIndex],
                                                    options: options
                                                };
                                                updateField({ ...field, columns: updatedColumns });

                                                // Clear the temporary state for this specific column
                                                setTempDropdownOptions(prev => {
                                                    const newState = { ...prev };
                                                    delete newState[currentKey];
                                                    return newState;
                                                });
                                            }}
                                            onFocus={() => {
                                                const currentKey = `${field.id}_${colIndex}`;
                                                // Only set temp state for THIS specific column
                                                setTempDropdownOptions(prev => ({
                                                    ...prev,
                                                    [currentKey]: (column.options || []).join(", ")
                                                }));
                                            }}
                                            className="w-full px-2 py-1 border rounded"
                                            placeholder="Option 1, Option 2, Option 3"
                                        />
                                        <label className="block text-xs text-gray-500 mt-2">
                                            Remarks required for options:
                                        </label>
                                        {console.log(column.remarksOptions)}
                                        <select
                                            multiple
                                            value={column.requiresRemarks || []}
                                            onChange={(e) => {
                                                const selected = Array.from(
                                                    e.target.selectedOptions,
                                                    opt => opt.value
                                                );
                                                const updatedColumns = [...field.columns];
                                                updatedColumns[colIndex] = {
                                                    ...updatedColumns[colIndex],
                                                    remarksOptions: selected
                                                };
                                                updateField({ ...field, columns: updatedColumns });
                                            }}
                                            className="w-full px-2 py-1 border rounded mt-1 h-24"
                                        >
                                            {(column.options || []).map((opt, i) => (
                                                <option key={i} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

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
                                                        dependentOptions: {},
                                                        remarksOptions: []
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
                                                        <div key={parentOption} className="border p-2 rounded space-y-2">
                                                            <div className="font-medium mb-2">When {column.parentColumn} is "{parentOption}"</div>
                                                            <textarea
                                                                value={(column.dependentOptions?.[parentOption] || []).join(",")}
                                                                onChange={(e) => {
                                                                    const values = e.target.value.split(",").map(v => v.trim()).filter(Boolean);
                                                                    const updatedColumns = [...field.columns];
                                                                    updatedColumns[colIndex] = {
                                                                        ...updatedColumns[colIndex],
                                                                        dependentOptions: {
                                                                            ...updatedColumns[colIndex].dependentOptions,
                                                                            [parentOption]: values
                                                                        }
                                                                    };
                                                                    updateField({ columns: updatedColumns });
                                                                }}
                                                                placeholder="Enter comma-separated options"
                                                                className="w-full border rounded p-2"
                                                            />
                                                            <label className="block text-xs text-gray-500 mt-2">
                                                                Remarks required for options:
                                                            </label>
                                                            <select
                                                                multiple
                                                                value={(column.remarksOptions || [])
                                                                    .filter(item => item.startsWith(`${parentOption}:`))
                                                                    .map(item => item.substring(parentOption.length + 1))}
                                                                onChange={(e) => {
                                                                    const selected = Array.from(
                                                                        e.target.selectedOptions,
                                                                        opt => opt.value
                                                                    );

                                                                    // Remove old entries for this parent option
                                                                    const otherRemarks = (column.remarksOptions || [])
                                                                        .filter(item => !item.startsWith(`${parentOption}:`));

                                                                    // Add new entries with parent:child format
                                                                    const newRemarks = selected.map(opt => `${parentOption}:${opt}`);

                                                                    const updatedColumns = [...field.columns];
                                                                    updatedColumns[colIndex] = {
                                                                        ...updatedColumns[colIndex],
                                                                        remarksOptions: [...otherRemarks, ...newRemarks]
                                                                    };
                                                                    updateField({ columns: updatedColumns });
                                                                }}
                                                                className="w-full px-2 py-1 border rounded h-24"
                                                            >
                                                                {(column.dependentOptions?.[parentOption] || []).map((opt, i) => (
                                                                    <option key={i} value={opt}>
                                                                        {opt}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/*{column.type === "dependentDropdown" && (*/}
                                {/*    <div className="w-full space-y-4">*/}
                                {/*        <div>*/}
                                {/*            <label className="block text-sm font-medium mb-1">Parent Column</label>*/}
                                {/*            <select*/}
                                {/*                value={column.parentColumn || ""}*/}
                                {/*                onChange={(e) => {*/}
                                {/*                    const updatedColumns = [...field.columns];*/}
                                {/*                    updatedColumns[colIndex] = {*/}
                                {/*                        ...updatedColumns[colIndex],*/}
                                {/*                        parentColumn: e.target.value,*/}
                                {/*                        dependentOptions: {}*/}
                                {/*                    };*/}
                                {/*                    updateField({ columns: updatedColumns });*/}
                                {/*                }}*/}
                                {/*                className="w-full border rounded p-2"*/}
                                {/*            >*/}
                                {/*                <option value="">Select Parent Column</option>*/}
                                {/*                {field.columns*/}
                                {/*                    .filter(c => c.type === "dropdown" && c.id !== column.id)*/}
                                {/*                    .map(parentCol => (*/}
                                {/*                        <option key={parentCol.id} value={parentCol.name}>*/}
                                {/*                            {parentCol.name}*/}
                                {/*                        </option>*/}
                                {/*                    ))}*/}
                                {/*            </select>*/}
                                {/*        </div>*/}

                                {/*        */}{/* Child options configuration */}
                                {/*        {column.parentColumn && (*/}
                                {/*            <div className="space-y-2">*/}
                                {/*                {field.columns*/}
                                {/*                    .find(c => c.name === column.parentColumn)*/}
                                {/*                    ?.options?.map(parentOption => (*/}
                                {/*                        <div key={parentOption} className="border p-2 rounded">*/}
                                {/*                            <div className="font-medium mb-2">When {column.parentColumn} is "{parentOption}"</div>*/}
                                {/*                            <textarea*/}
                                {/*                                value={(column.dependentOptions?.[parentOption] || []).join(",")}*/}
                                {/*                                onChange={(e) => {*/}
                                {/*                                    const values = e.target.value.split(",").map(v => v.trim());*/}
                                {/*                                    const updatedColumns = [...field.columns];*/}
                                {/*                                    updatedColumns[colIndex].dependentOptions[parentOption] = values;*/}
                                {/*                                    updateField({ columns: updatedColumns });*/}
                                {/*                                }}*/}
                                {/*                                placeholder="Enter comma-separated options"*/}
                                {/*                                className="w-full border rounded p-2"*/}
                                {/*                            />*/}
                                {/*                        </div>*/}
                                {/*                    ))}*/}
                                {/*            </div>*/}
                                {/*        )}*/}
                                {/*    </div>*/}
                                {/*)}*/}

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

                                {column.type === "textbox" && (
                                    <div className="w-full space-y-2 mt-2">
                                        <div className="flex gap-2">
                                            <div className="w-1/2">
                                                <label className="block text-xs text-gray-500 mb-1">Min Characters</label>
                                                <input
                                                    type="number"
                                                    value={column.minLength || ''}
                                                    onChange={(e) => {
                                                        const updatedColumns = [...field.columns];
                                                        updatedColumns[colIndex].minLength = e.target.value ? parseInt(e.target.value) : null;
                                                        updateField({ ...field, columns: updatedColumns });
                                                    }}
                                                    min="0"
                                                    placeholder="0"
                                                    className="w-full px-2 py-1 border rounded"
                                                />
                                            </div>
                                            <div className="w-1/2">
                                                <label className="block text-xs text-gray-500 mb-1">Max Characters</label>
                                                <input
                                                    type="number"
                                                    value={column.maxLength || ''}
                                                    onChange={(e) => {
                                                        const updatedColumns = [...field.columns];
                                                        updatedColumns[colIndex].maxLength = e.target.value ? parseInt(e.target.value) : null;
                                                        updateField({ ...field, columns: updatedColumns });
                                                    }}
                                                    min="1"
                                                    placeholder="No limit"
                                                    className="w-full px-2 py-1 border rounded"
                                                />
                                            </div>
                                        </div>
                                        {/* Character validation message */}
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Validation Message (Optional)</label>
                                            <input
                                                type="text"
                                                value={column.lengthValidationMessage || ''}
                                                onChange={(e) => {
                                                    const updatedColumns = [...field.columns];
                                                    updatedColumns[colIndex].lengthValidationMessage = e.target.value;
                                                    updateField({ ...field, columns: updatedColumns });
                                                }}
                                                placeholder="Custom validation message"
                                                className="w-full px-2 py-1 border rounded"
                                            />
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

                                {column.type === "linkedTextbox" && (
                                    <div className="w-full space-y-2 mt-2">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Linked Field</label>
                                            <select
                                                value={column.linkedFieldReference || ""}
                                                onChange={(e) => {
                                                    const selectedValue = e.target.value;
                                                    console.log("=== LINKEDTEXTBOX FIELD SELECTED ===");
                                                    console.log("selectedValue:", selectedValue);

                                                    if (selectedValue.includes('.')) {
                                                        const [gridFieldId, columnId] = selectedValue.split('.');
                                                        console.log("Processing as grid column - gridFieldId:", gridFieldId, "columnId:", columnId);
                                                        updateField({
                                                            linkedFieldId: null,
                                                            linkedFieldType: "gridColumn",
                                                            linkedGridFieldId: gridFieldId,
                                                            linkedColumnId: columnId,
                                                            linkedFieldReference: selectedValue,
                                                            linkedFormId: linkedForm?.id || null
                                                        });
                                                    } else {
                                                        console.log("Processing as regular field");
                                                        updateField({
                                                            linkedFieldId: selectedValue,
                                                            linkedFieldType: "field",
                                                            linkedGridFieldId: null,
                                                            linkedColumnId: null,
                                                            linkedFieldReference: selectedValue,
                                                            linkedFormId: linkedForm?.id || null
                                                        });
                                                    }
                                                }}
                                                className="w-full px-2 py-1 border rounded text-xs"
                                            >
                                                <option value="">Select field from {linkedForm?.name}...</option>

                                                <optgroup label="Regular Fields">
                                                    {linkedFormFields
                                                        .filter(f => ["textbox", "numeric", "dropdown"].includes(f.type))
                                                        .map(linkedField => (
                                                            <option key={linkedField.id} value={linkedField.id}>
                                                                {linkedField.label} ({linkedField.type})
                                                            </option>
                                                        ))}
                                                </optgroup>

                                                <optgroup label="Grid Columns">
                                                    {linkedFormFields
                                                        .filter(f => f.type === "grid" && f.columns && Array.isArray(f.columns))
                                                        .flatMap(gridField =>
                                                            gridField.columns
                                                                .filter(col => ["textbox", "numeric", "dropdown"].includes(col.type))
                                                                .map(gridColumn => (
                                                                    <option key={`${gridField.id}.${gridColumn.id}`} value={`${gridField.id}.${gridColumn.id}`}>
                                                                        {gridField.label} → {gridColumn.name}
                                                                    </option>
                                                                ))
                                                        )}
                                                </optgroup>
                                            </select>
                                        </div>

                                        {/* Display selected linked field info */}
                                        {column.linkedFieldReference && (
                                            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                                Linked to: {
                                                    column.linkedFieldType === "gridColumn" ? (
                                                        (() => {
                                                            const gridField = linkedFormFields.find(f => f.id === column.linkedGridFieldId);
                                                            const gridCol = gridField?.columns?.find(c => c.id === column.linkedColumnId);
                                                            return `${gridField?.label} → ${gridCol?.name}`;
                                                        })()
                                                    ) : (
                                                        linkedFormFields.find(f => f.id === column.linkedFieldId)?.label
                                                    )
                                                }
                                            </div>
                                        )}
                                    </div>
                                )}

                                {column.type === "date" && (
                                    <div className="w-full mt-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={column.showDayName || false}
                                                onChange={(e) => {
                                                    const updatedColumns = [...field.columns];
                                                    updatedColumns[colIndex].showDayName = e.target.checked;
                                                    updateField({ ...field, columns: updatedColumns });
                                                }}
                                                className="h-4 w-4"
                                            />
                                            <label className="text-xs text-gray-500">Show day name</label>
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
                                    name: `Column ${field.columns.length + 1}`,
                                    type: 'textbox', // Use literal string instead of undefined variable
                                    width: '1fr',
                                    required: false,
                                    options: [],
                                    textColor: '#000000',
                                    backgroundColor: '#ffffff',
                                    labelText: '',
                                    labelStyle: 'normal',
                                    textAlign: 'left',
                                    minLength: null,
                                    maxLength: null,
                                    lengthValidationMessage: ''
                                };
                                updateField({ columns: [...field.columns, newColumn] });
                            }}
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 flex items-center gap-1 text-sm"
                        >
                            <Plus size={14} /> Add Column
                        </button>
                    </div>

                    <div className="bg-gray-50 p-3 rounded border mb-4">
                        <h4 className="text-sm font-semibold mb-2">Interactive Grid Preview - Drag Headers to Reorder Columns</h4>
                        <div className="overflow-x-auto" onDragOver={(e) => e.preventDefault()}>
                            <table
                                className="w-full border-collapse"
                                onDragStart={(e) => {
                                    // Only allow dragging from headers, not the table itself
                                    if (!e.target.closest('th')) {
                                        e.preventDefault();
                                    }
                                }}
                            >
                                <thead>
                                    <tr>
                                        {(field.columns || []).map((col, i) => (
                                            <th
                                                key={col.id || i}
                                                draggable
                                                onDragStart={(e) => handleHeaderDragStart(e, i)}
                                                onDragEnd={handleHeaderDragEnd}
                                                onDragOver={handleHeaderDragOver}
                                                onDragEnter={(e) => handleHeaderDragEnter(e, i)}
                                                onDragLeave={handleHeaderDragLeave}
                                                onDrop={(e) => handleHeaderDrop(e, i)}
                                                onMouseDown={(e) => e.stopPropagation()} // Prevent grid drag on mouse down
                                                onClick={(e) => e.stopPropagation()} // Prevent any parent click handlers
                                                className={`border border-gray-300 bg-gray-100 p-2 text-sm text-left cursor-move select-none transition-all duration-200 relative ${draggedColumnIndex === i ? 'opacity-50 scale-95' : ''
                                                    } ${dragOverColumnIndex === i && draggedColumnIndex !== i
                                                        ? 'border-l-4 border-l-blue-500 bg-blue-100'
                                                        : ''
                                                    }`}
                                                style={{
                                                    width: col.width,
                                                    color: col.textColor,
                                                    backgroundColor: dragOverColumnIndex === i && draggedColumnIndex !== i
                                                        ? '#dbeafe'
                                                        : col.backgroundColor
                                                }}
                                                title="Drag to reorder columns"
                                            >
                                                <div className="flex items-center gap-2 pointer-events-none">
                                                    <GripVertical size={12} className="text-gray-500" />
                                                    <span>{col.name} {col.required && <span className="text-red-500">*</span>}</span>
                                                </div>
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
                                                        <input
                                                            type="text"
                                                            disabled
                                                            className="w-full bg-gray-50 border px-2 py-1 opacity-50"
                                                            placeholder={
                                                                col.minLength || col.maxLength
                                                                    ? `${col.minLength || 0}-${col.maxLength || '∞'} chars`
                                                                    : "Sample text"
                                                            }
                                                            title={
                                                                col.minLength || col.maxLength
                                                                    ? `Min: ${col.minLength || 0}, Max: ${col.maxLength || 'No limit'}`
                                                                    : undefined
                                                            }
                                                        />
                                                    )}
                                                    {col.type === "numeric" && (
                                                        <input type="number" disabled className="w-full bg-gray-50 border px-2 py-1 opacity-50"
                                                            min={col.min} max={col.max} step={col.decimal ? "0.01" : "1"} placeholder="123" />
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
                                                    {col.type === "date" && (
                                                        <input type="date" disabled className="w-full bg-gray-50 border px-2 py-1 opacity-50" />
                                                    )}
                                                    {col.type === "label" && (
                                                        <div
                                                            className={`w-full p-2 min-h-[36px] flex items-center ${col.labelStyle === 'bold' ? 'font-bold' :
                                                                col.labelStyle === 'italic' ? 'italic' :
                                                                    col.labelStyle === 'underline' ? 'underline' :
                                                                        'font-normal'
                                                                } ${col.textAlign === 'center' ? 'justify-center' :
                                                                    col.textAlign === 'right' ? 'justify-end' :
                                                                        'justify-start'
                                                                } ${col.textColor ? `text-[#${col.textColor}]` : 'text-gray-800'
                                                                }`}
                                                            style={{
                                                                backgroundColor: col.backgroundColor ? `#${col.backgroundColor}` : 'transparent',
                                                                color: col.textColor ? `#${col.textColor}` : undefined
                                                            }}
                                                        >
                                                            {col.labelText || 'Label Text'}
                                                        </div>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-2 text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                            💡 <strong>Tip:</strong> Click and drag the grip icon (⋮⋮) or column header text to reorder columns. The entire header is draggable.
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

            {field.type === "time" && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <input
                            type="time"
                            value={field.timeValue || ""}   // <-- bind to value
                            onChange={(e) => updateField({ timeValue: e.target.value })}
                            className="border rounded px-2 py-1"
                        />
                        <label className="text-sm text-gray-600">
                            Select time
                        </label>
                    </div>
                </div>
            )}

            {field.type === "image" && (
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Image Upload</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                                updateField({
                                    imageFile: file,
                                    imageoptions: JSON.stringify({
                                        fileName: file.name,
                                        fileSize: file.size,
                                        imageUrl: URL.createObjectURL(file)
                                    })
                                });
                            }
                        }}
                        className="w-full px-3 py-2 border rounded"
                    />
                    {field.imageoptions && (() => {
                        try {
                            const imageData = JSON.parse(field.imageoptions);
                            if (imageData.imageUrl) {
                                return (
                                    <div className="mt-2 p-2 border rounded bg-gray-50">
                                        <img
                                            src={imageData.imageUrl}
                                            alt={imageData.fileName || "Uploaded image"}
                                            className="max-w-xs h-32 object-cover border rounded mb-2"
                                            onError={(e) => {
                                                console.error('Image failed to load:', imageData.imageUrl);
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                        <div className="text-sm text-gray-600">
                                            <p><strong>File:</strong> {imageData.fileName}</p>
                                            <p><strong>Size:</strong> {(imageData.fileSize / 1024).toFixed(1)} KB</p>
                                            <p><strong>Uploaded:</strong> {new Date(imageData.uploadedAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                );
                            }
                        } catch (e) {
                            console.error('Error parsing image data:', e);
                            return <p className="text-red-500 text-sm">Error loading image data</p>;
                        }
                        return null;
                    })()}
                </div>
            )}

            {field.type === "textbox" && (
                <div className="mb-4 space-y-3">
                    {/* Existing textbox configuration */}
                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField({ required: e.target.checked })}
                            className="h-4 w-4"
                        />
                        <label className="text-sm text-gray-600">Required</label>
                    </div>

                    {/* ADD CHARACTER VALIDATION CONFIGURATION */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Character Validation</h4>
                        <div className="flex gap-2">
                            <div className="w-1/2">
                                <label className="block text-xs text-gray-500 mb-1">Min Characters</label>
                                <input
                                    type="number"
                                    value={field.minLength || ''}
                                    onChange={(e) => {
                                        const value = e.target.value ? parseInt(e.target.value) : null;
                                        updateField({ minLength: value });
                                    }}
                                    min="0"
                                    placeholder="0"
                                    className="w-full px-2 py-1 border rounded"
                                />
                            </div>
                            <div className="w-1/2">
                                <label className="block text-xs text-gray-500 mb-1">Max Characters</label>
                                <input
                                    type="number"
                                    value={field.maxLength || ''}
                                    onChange={(e) => {
                                        const value = e.target.value ? parseInt(e.target.value) : null;
                                        updateField({ maxLength: value });
                                    }}
                                    min="1"
                                    placeholder="No limit"
                                    className="w-full px-2 py-1 border rounded"
                                />
                            </div>
                        </div>

                        {/* Custom validation message */}
                        <div className="mt-2">
                            <label className="block text-xs text-gray-500 mb-1">Custom Validation Message (Optional)</label>
                            <input
                                type="text"
                                value={field.lengthValidationMessage || ''}
                                onChange={(e) => updateField({ lengthValidationMessage: e.target.value })}
                                placeholder="Enter custom message for character validation"
                                className="w-full px-2 py-1 border rounded"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Leave empty to use default messages like "Minimum X characters required"
                            </p>
                        </div>

                        {/* Preview of validation */}
                        {(field.minLength || field.maxLength) && (
                            <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                <p className="text-xs text-blue-800">
                                    <strong>Validation Preview:</strong> This field will require{' '}
                                    {field.minLength && field.maxLength
                                        ? `between ${field.minLength} and ${field.maxLength} characters`
                                        : field.minLength
                                            ? `at least ${field.minLength} characters`
                                            : `maximum ${field.maxLength} characters`
                                    }
                                </p>
                            </div>
                        )}
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
                                            checked={(field.requireRemarks || []).includes(option)}
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