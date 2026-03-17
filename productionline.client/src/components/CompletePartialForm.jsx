//import React, { useState, useEffect, useCallback } from 'react';
//import { useParams, useNavigate } from 'react-router-dom';
//import { APP_CONSTANTS } from "./store";

//export default function CompletePartialForm() {
//    const { token } = useParams();
//    const navigate = useNavigate();

//    const [loading, setLoading] = useState(true);
//    const [error, setError] = useState(null);
//    const [submitting, setSubmitting] = useState(false);
//    const [submitted, setSubmitted] = useState(false);

//    const [partialData, setPartialData] = useState(null);   // from GET /api/partial-submissions/token/:token
//    const [formDefinition, setFormDefinition] = useState(null);
//    const [creatorValues, setCreatorValues] = useState({});  // locked — filled by first person
//    const [recipientValues, setRecipientValues] = useState({}); // editable — this person fills

//    // ─── Load partial submission by token ────────────────────────────────────────
//    useEffect(() => {
//        if (!token) {
//            setError('Invalid or missing token.');
//            setLoading(false);
//            return;
//        }

//        const fetchPartial = async () => {
//            try {
//                const res = await fetch(`${ APP_CONSTANTS.API_BASE_URL }/api/partial-submissions/token/${token}`);
//                if (!res.ok) {
//                    if (res.status === 404) throw new Error('This link is invalid or has already been used.');
//                    throw new Error('Failed to load form. Please try again.');
//                }

//                const data = await res.json();

//                if (data.status === 'Completed') {
//                    setError('This form has already been completed.');
//                    setLoading(false);
//                    return;
//                }

//                setPartialData(data);

//                // Parse creator's already-filled values
//                const filledData = data.filledData ?? {};


//                setCreatorValues(filledData);

//                // Load the form definition
//                const formRes = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/${data.formId}`);
//                if (!formRes.ok) throw new Error('Failed to load form definition.');
//                const formDef = await formRes.json();

//                // Deserialize columns for grid fields
//                if (formDef.fields) {
//                    formDef.fields.forEach(f => {
//                        if (f.type === 'grid' && f.columnsJson && !f.columns) {
//                            try { f.columns = JSON.parse(f.columnsJson); } catch { f.columns = []; }
//                        }
//                    });
//                }

//                setFormDefinition(formDef);

//                // Init recipient fields to empty
//                const recipientFields = (formDef.fields || []).filter(
//                    f => f.filledBy === 'recipient'
//                );
//                const initRecipient = {};
//                recipientFields.forEach(f => { initRecipient[f.id] = ''; });
//                setRecipientValues(initRecipient);

//            } catch (err) {
//                setError(err.message);
//            } finally {
//                setLoading(false);
//            }
//        };

//        fetchPartial();
//    }, [token]);

//    // ─── Field change handler ─────────────────────────────────────────────────────
//    const handleChange = useCallback((fieldId, value) => {
//        setRecipientValues(prev => ({ ...prev, [fieldId]: value }));
//    }, []);

//    // ─── Submit ───────────────────────────────────────────────────────────────────
//    const handleSubmit = async (e) => {
//        e.preventDefault();

//        // Basic required validation for recipient fields
//        const recipientFields = (formDefinition?.fields || []).filter(
//            f => f.filledBy === 'recipient'
//        );
//        for (const field of recipientFields) {
//            if (field.required && !recipientValues[field.id]) {
//                alert(`"${field.label}" is required.`);
//                return;
//            }
//        }

//        setSubmitting(true);
//        try {
//            const res = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/partial-submissions/complete`, {
//                method: 'POST',
//                headers: { 'Content-Type': 'application/json' },
//                body: JSON.stringify({
//                    token,
//                    recipientData: recipientValues,
//                }),
//            });

//            if (!res.ok) {
//                const err = await res.json().catch(() => ({}));
//                throw new Error(err.message || 'Submission failed. Please try again.');
//            }

//            setSubmitted(true);
//        } catch (err) {
//            alert(err.message);
//        } finally {
//            setSubmitting(false);
//        }
//    };

//    // ─── Helpers ──────────────────────────────────────────────────────────────────
//    const getCreatorDisplayValue = (fieldId) => {
//        // filledData is keyed by field label (same as submission data pattern)
//        const field = formDefinition?.fields?.find(f => f.id === fieldId);
//        if (!field) return '';
//        return creatorValues[field.label] ?? creatorValues[fieldId] ?? '—';
//    };

//    // ─── Render a single editable field ──────────────────────────────────────────
//    const renderEditableField = (field) => {
//        const value = recipientValues[field.id] ?? '';
//        const inputClass = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

//        switch (field.type) {
//            case 'textarea':
//                return (
//                    <textarea
//                        className={inputClass + " resize-none"}
//                        rows={3}
//                        value={value}
//                        onChange={e => handleChange(field.id, e.target.value)}
//                        required={field.required}
//                    />
//                );

//            case 'dropdown':
//            case 'select':
//                return (
//                    <select
//                        className={inputClass}
//                        value={value}
//                        onChange={e => handleChange(field.id, e.target.value)}
//                        required={field.required}
//                    >
//                        <option value="">-- Select --</option>
//                        {(field.options || []).map((opt, i) => (
//                            <option key={i} value={opt}>{opt}</option>
//                        ))}
//                    </select>
//                );

//            case 'checkbox':
//                return (
//                    <div className="flex flex-wrap gap-3 mt-1">
//                        {(field.options || []).map((opt, i) => {
//                            const checked = Array.isArray(value)
//                                ? value.includes(opt)
//                                : value === opt;
//                            return (
//                                <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
//                                    <input
//                                        type="checkbox"
//                                        checked={checked}
//                                        onChange={e => {
//                                            let newVal = Array.isArray(value) ? [...value] : [];
//                                            if (e.target.checked) newVal.push(opt);
//                                            else newVal = newVal.filter(v => v !== opt);
//                                            handleChange(field.id, newVal);
//                                        }}
//                                        className="h-4 w-4 rounded border-gray-300"
//                                    />
//                                    {opt}
//                                </label>
//                            );
//                        })}
//                    </div>
//                );

//            case 'date':
//                return (
//                    <input
//                        type="date"
//                        className={inputClass}
//                        value={value}
//                        onChange={e => handleChange(field.id, e.target.value)}
//                        required={field.required}
//                    />
//                );

//            case 'number':
//                return (
//                    <input
//                        type="number"
//                        className={inputClass}
//                        value={value}
//                        min={field.min}
//                        max={field.max}
//                        onChange={e => handleChange(field.id, e.target.value)}
//                        required={field.required}
//                    />
//                );

//            default:
//                return (
//                    <input
//                        type="text"
//                        className={inputClass}
//                        value={value}
//                        onChange={e => handleChange(field.id, e.target.value)}
//                        required={field.required}
//                        minLength={field.minLength}
//                        maxLength={field.maxLength}
//                    />
//                );
//        }
//    };

//    // ─── States ───────────────────────────────────────────────────────────────────
//    if (loading) {
//        return (
//            <div className="min-h-screen flex items-center justify-center bg-gray-50">
//                <div className="text-center">
//                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
//                    <p className="text-gray-500 text-sm">Loading your form…</p>
//                </div>
//            </div>
//        );
//    }

//    if (error) {
//        return (
//            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
//                <div className="bg-white border border-red-200 rounded-xl p-8 max-w-md w-full text-center shadow-sm">
//                    <div className="text-red-500 text-4xl mb-3">⚠️</div>
//                    <h2 className="text-lg font-semibold text-gray-800 mb-2">Unable to Load Form</h2>
//                    <p className="text-gray-500 text-sm">{error}</p>
//                </div>
//            </div>
//        );
//    }

//    if (submitted) {
//        return (
//            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
//                <div className="bg-white border border-green-200 rounded-xl p-8 max-w-md w-full text-center shadow-sm">
//                    <div className="text-green-500 text-4xl mb-3">✅</div>
//                    <h2 className="text-lg font-semibold text-gray-800 mb-2">Form Submitted!</h2>
//                    <p className="text-gray-500 text-sm">
//                        Your section has been completed and the full form has been submitted for approval.
//                    </p>
//                </div>
//            </div>
//        );
//    }

//    const allFields = formDefinition?.fields || [];
//    const creatorFields = allFields.filter(f => !f.filledBy || f.filledBy === 'creator');
//    const recipientFields = allFields.filter(f => f.filledBy === 'recipient');

//    return (
//        <div className="min-h-screen bg-gray-50 py-8 px-4">
//            <div className="max-w-2xl mx-auto">

//                {/* Header */}
//                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
//                    <div className="flex items-center gap-3 mb-1">
//                        <span className="text-2xl">📋</span>
//                        <h1 className="text-xl font-bold text-gray-800">
//                            {formDefinition?.name || 'Complete Form'}
//                        </h1>
//                    </div>
//                    <p className="text-sm text-gray-500 ml-9">
//                        Please fill in the fields assigned to you. Fields marked with 🔒 were filled by the sender.
//                    </p>
//                </div>

//                <form onSubmit={handleSubmit}>

//                    {/* Creator Fields (locked) */}
//                    {creatorFields.length > 0 && (
//                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
//                            <div className="flex items-center gap-2 mb-4">
//                                <span className="text-base">🔒</span>
//                                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
//                                    Filled by Sender (Read-only)
//                                </h2>
//                            </div>
//                            <div className="space-y-4">
//                                {creatorFields.map(field => (
//                                    <div key={field.id} className={`${field.width === 'half' ? 'w-1/2' : 'w-full'}`}>
//                                        <label className="block text-sm font-medium text-gray-500 mb-1">
//                                            {field.label}
//                                            {field.required && <span className="text-red-400 ml-1">*</span>}
//                                        </label>
//                                        <div className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-600 min-h-[38px]">
//                                            {getCreatorDisplayValue(field.id) || <span className="text-gray-400 italic">Not filled</span>}
//                                        </div>
//                                    </div>
//                                ))}
//                            </div>
//                        </div>
//                    )}

//                    {/* Recipient Fields (editable) */}
//                    <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6 mb-6">
//                        <div className="flex items-center gap-2 mb-4">
//                            <span className="text-base">✏️</span>
//                            <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
//                                Your Fields to Fill
//                            </h2>
//                        </div>

//                        {recipientFields.length === 0 ? (
//                            <p className="text-sm text-gray-400 italic">No fields assigned to you.</p>
//                        ) : (
//                            <div className="space-y-4">
//                                {recipientFields.map(field => (
//                                    <div key={field.id} className={`${field.width === 'half' ? 'w-1/2' : 'w-full'}`}>
//                                        <label className="block text-sm font-medium text-gray-700 mb-1">
//                                            {field.label}
//                                            {field.required && <span className="text-red-500 ml-1">*</span>}
//                                        </label>
//                                        {renderEditableField(field)}
//                                        {field.lengthValidationMessage && (
//                                            <p className="text-xs text-gray-400 mt-1">{field.lengthValidationMessage}</p>
//                                        )}
//                                    </div>
//                                ))}
//                            </div>
//                        )}
//                    </div>

//                    {/* Submit */}
//                    <div className="flex justify-end">
//                        <button
//                            type="submit"
//                            disabled={submitting || recipientFields.length === 0}
//                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
//                        >
//                            {submitting ? (
//                                <>
//                                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
//                                    Submitting…
//                                </>
//                            ) : (
//                                <>✅ Submit Form</>
//                            )}
//                        </button>
//                    </div>

//                </form>
//            </div>
//        </div>
//    );
//}

import { useEffect, useState, useRef, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useParams } from "react-router-dom";
import { APP_CONSTANTS } from "./store";
import LoadingDots from './LoadingDots';
import { useNavigate } from "react-router-dom";
import SignatureCanvas from 'react-signature-canvas';

export default function CompletePartialForm() {
    // ─── Exact same state as DynamicForm ──────────────────────────────────────
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formValues, setFormValues] = useState({});
    const [remarks, setRemarks] = useState({});
    const [formErrors, setFormErrors] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [fontSize, setFontSize] = useState(16);
    const [tableColors, setTableColors] = useState({});
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedImageName, setSelectedImageName] = useState('');
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [activeSignature, setActiveSignature] = useState(null);
    const signaturePadRef = useRef(null);
    const navigate = useNavigate();

    // ─── Partial fill specific state ──────────────────────────────────────────
    const { token } = useParams();
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    // ─── Partial fill: which fields are locked vs editable ───────────────────
    // creatorFieldIds  = fields with filledBy null/"creator" → LOCKED (read-only)
    // recipientFieldIds = fields with filledBy "recipient"  → EDITABLE
    const creatorFieldIds = useMemo(() =>
        formData?.fields
            ?.filter(f => !f.filledBy || f.filledBy === "creator")
            ?.map(f => f.id) ?? []
        , [formData]);

    const recipientFieldIds = useMemo(() =>
        formData?.fields
            ?.filter(f => f.filledBy === "recipient")
            ?.map(f => f.id) ?? []
        , [formData]);

    // Returns true if this field was filled by the creator and should be locked
    const isLocked = (fieldId) => creatorFieldIds.includes(fieldId);

    console.log("Creator",creatorFieldIds)
    console.log("Recepeit", recipientFieldIds)

    // ─── Signature modal restore (same as DynamicForm) ────────────────────────
    useEffect(() => {
        if (showSignatureModal && activeSignature && signaturePadRef.current) {
            setTimeout(() => {
                const existing = formValues?.[activeSignature.fieldId]?.[activeSignature.rowIndex]?.[activeSignature.colName];
                if (existing && signaturePadRef.current) {
                    try { signaturePadRef.current.fromDataURL(existing); }
                    catch (err) { signaturePadRef.current.clear(); }
                } else if (signaturePadRef.current) {
                    signaturePadRef.current.clear();
                }
            }, 100);
        }
    }, [showSignatureModal, activeSignature]);

    // ─── Load partial submission + form definition ────────────────────────────
    useEffect(() => {
        if (!token) { setError("Invalid or missing token."); setLoading(false); return; }

        const load = async () => {
            try {
                // 1. Fetch the partial submission record by token
                const pRes = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/partial-submissions/token/${token}`);
                if (!pRes.ok) {
                    if (pRes.status === 404) throw new Error("This link is invalid or has already been used.");
                    throw new Error("Failed to load. Please try again.");
                }
                const partial = await pRes.json();

                if (partial.status === "Completed") {
                    setError("This form has already been completed.");
                    setLoading(false);
                    return;
                }

                // partial.filledData is already { fieldId: value } (deserialized by controller)
                const filledData = partial.filledData ?? {};

                // 2. Get form metadata to obtain formLink
                const metaRes = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/${partial.formId}`);
                if (!metaRes.ok) throw new Error("Failed to load form metadata.");
                const meta = await metaRes.json();

                // 3. Fetch full FormDto (with filledBy on each field) via form-builder
                let data = null;
                const bRes = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/form-builder/link/${meta.formLink}`);
                if (bRes.ok) {
                    data = await bRes.json();
                } else {
                    const fRes = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/link/${meta.formLink}`);
                    if (!fRes.ok) throw new Error("Failed to load form fields.");
                    data = await fRes.json();
                }

                // 4. Normalize fields — EXACT same logic as DynamicForm fetchFormData
                data.fields.forEach(field => {
                    if ((field.type === "grid" || field.type === "questionGrid") && !field.columns && field.column) {
                        field.columns = field.column;
                        delete field.column;
                    }
                    if (field.columns) {
                        field.columns = (field.columns || []).map(col => ({
                            ...col,
                            label: col.label || col.name || "",
                            dependentOptions: col.dependentOptions || {}
                        }));
                    }
                    if (field.type === "questionGrid") {
                        if (field.defaultRowsJson && typeof field.defaultRowsJson === 'string') {
                            try { field.defaultRows = JSON.parse(field.defaultRowsJson); }
                            catch (e) { field.defaultRows = []; }
                        } else if (!field.defaultRows) {
                            field.defaultRows = [];
                        }
                    }
                });

                setFormData(data);

                // 5. Initialize form values
                //    • Creator fields  → restore from filledData (locked display)
                //    • Recipient fields → empty defaults (editable)
                const initialValues = {};
                const initialRemarks = {};

                data.fields.forEach((field) => {
                    const isCreator = !field.filledBy || field.filledBy === "creator";

                    if (isCreator && filledData[field.id] !== undefined) {
                        // Restore creator's value
                        const raw = filledData[field.id];
                        if (field.type === "checkbox") {
                            try { initialValues[field.id] = JSON.parse(raw); }
                            catch { initialValues[field.id] = raw ? raw.split(",").map(s => s.trim()) : []; }
                        } else if (field.type === "grid" || field.type === "questionGrid") {
                            try { initialValues[field.id] = JSON.parse(raw); }
                            catch { initialValues[field.id] = []; }
                        } else {
                            initialValues[field.id] = raw;
                        }
                        return;
                    }

                    // Recipient or unfilled creator → empty defaults (same as DynamicForm)
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
                        if (field.type === "questionGrid" && field.defaultRows && field.defaultRows.length > 0) {
                            field.defaultRows.forEach(defaultRow => {
                                const row = {};
                                field.columns.forEach(col => {
                                    if (col.fixed === true || col.name === "question") {
                                        row[col.name] = defaultRow.question || "";
                                    } else if (col.type === "serialNumber") {
                                        row[col.name] = "";
                                    } else if (col.type === "fixedValue") {
                                        row[col.name] = (defaultRow.fixedValues && defaultRow.fixedValues[col.name]) || col.labelText || "";
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
                                rows.push(row);
                            });
                        } else {
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
                    }
                });

                setFormValues(initialValues);
                setRemarks(initialRemarks);
                setLoading(false);

            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        load();
    }, [token]);

    // ─── All helpers — EXACT copy from DynamicForm ────────────────────────────

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

    const renderImageGallery = () => {
        if (!formData?.fields) return null;
        const imageFields = formData.fields.filter(field => field.type === 'image' && field.imageoptions);
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
                                    <div className="cursor-pointer border-2 border-gray-200 rounded-lg overflow-hidden hover:border-blue-500 transition-all duration-200 hover:shadow-lg"
                                        onClick={() => openImageModal(imageOptions, field.label)}>
                                        <img src={imageOptions.imageUrl} alt={field.label} className="w-full h-24 object-cover" />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2">
                                            <p className="text-xs font-medium truncate">{field.label}</p>
                                            <p className="text-xs text-gray-300">{(imageOptions.fileSize / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        } catch (e) { return null; }
                    })}
                </div>
            </div>
        );
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

    const renderImageModal = () => {
        if (!imageModalOpen || !selectedImage) return null;
        return (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-75">
                <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-screen overflow-hidden relative">
                    <div className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-xl font-bold text-gray-800">{selectedImageName}</h2>
                        <button onClick={closeImageModal} className="text-gray-600 hover:text-gray-900 text-2xl font-bold">×</button>
                    </div>
                    <div className="p-4">
                        <img src={selectedImage.imageUrl} alt={selectedImageName} className="max-w-full max-h-96 object-contain mx-auto" />
                        <div className="mt-4 bg-gray-50 p-3 rounded">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="font-semibold text-gray-600">File Name:</span><p className="text-gray-800">{selectedImage.fileName}</p></div>
                                <div><span className="font-semibold text-gray-600">File Size:</span><p className="text-gray-800">{(selectedImage.fileSize / 1024).toFixed(1)} KB</p></div>
                                {selectedImage.uploadedAt && (
                                    <div><span className="font-semibold text-gray-600">Uploaded:</span><p className="text-gray-800">{new Date(selectedImage.uploadedAt).toLocaleString()}</p></div>
                                )}
                                <div><span className="font-semibold text-gray-600">Type:</span><p className="text-gray-800">{selectedImage.allowedTypes?.join(', ') || 'Image'}</p></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end p-4 border-t">
                        <button onClick={closeImageModal} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Close</button>
                    </div>
                </div>
            </div>
        );
    };

    const needsRemark = (field, value) => {
        if (!field.requireRemarks || field.requireRemarks.length === 0) return false;
        if (field.type === "checkbox")
            return Array.isArray(value) && value.some((val) => field.requireRemarks.includes(val));
        return field.requireRemarks.includes(value);
    };

    const checkRemarkTriggers = (field, value) => {
        if (!field.remarkTriggers || field.remarkTriggers.length === 0) return false;
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return false;
        return field.remarkTriggers.some((trigger) => {
            switch (trigger.operator) {
                case ">": return numValue > trigger.value;
                case "<": return numValue < trigger.value;
                case ">=": return numValue >= trigger.value;
                case "<=": return numValue <= trigger.value;
                case "=": case "==": return numValue === trigger.value;
                default: return false;
            }
        });
    };

    const evaluateFormula = (formula) => {
        if (!formula) return "";
        try {
            let expression = formula;
            formData.fields.forEach((field) => {
                const fieldValue = formValues[field.id];
                let value = 0;
                if (fieldValue !== null && fieldValue !== undefined && fieldValue !== "") {
                    const parsedValue = parseFloat(fieldValue);
                    value = isNaN(parsedValue) ? 0 : parsedValue;
                }
                expression = expression.replaceAll(`{${field.id}}`, value);
                expression = expression.replaceAll(`{${field.label}}`, value);
            });
            return eval(expression);
        } catch (error) { return ""; }
    };

    const evaluateRowFormula = (formula, row) => {
        if (!formula) return "";
        try {
            let expression = formula;
            const placeholders = formula.match(/\{[^}]+\}/g) || [];
            placeholders.forEach(placeholder => {
                const columnName = placeholder.slice(1, -1);
                const fieldValue = row[columnName];
                let value = 0;
                if (fieldValue !== null && fieldValue !== undefined && fieldValue !== "") {
                    const parsedValue = parseFloat(fieldValue);
                    value = isNaN(parsedValue) ? 0 : parsedValue;
                }
                expression = expression.replaceAll(placeholder, value);
            });
            return eval(expression);
        } catch (error) { return ""; }
    };

    function calculateTimeDifference(start, end) {
        if (!start || !end) return "";
        const [h1, m1] = start.split(":").map(Number);
        const [h2, m2] = end.split(":").map(Number);
        const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        return diff >= 0 ? `${diff}` : "Invalid";
    }

    const getDayName = (date) => {
        if (!date) return "";
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return "";
        return dateObj.toLocaleDateString(undefined, { weekday: "long" });
    };

    const isValidDate = (dateString) => {
        if (!dateString) return false;
        if (dateString instanceof Date) return !isNaN(dateString.getTime());
        return !isNaN(new Date(dateString).getTime());
    };

    // ─── Handlers — same as DynamicForm, but locked fields are blocked ────────

    const handleInputChange = (fieldId, value, fieldType, field) => {
        if (isLocked(fieldId)) return; // ← only change vs DynamicForm

        if (fieldType === "numeric") {
            if (value === "") {
                setFormValues((prev) => ({ ...prev, [fieldId]: value }));
                setFormErrors((prev) => { const n = { ...prev }; delete n[fieldId]; delete n[`${fieldId}_remark`]; return n; });
                return;
            }
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                if (field.min !== null && numValue < field.min) {
                    setFormErrors((prev) => ({ ...prev, [fieldId]: `Value must be at least ${field.min}` }));
                } else if (field.max !== null && numValue > field.max) {
                    setFormErrors((prev) => ({ ...prev, [fieldId]: `Value must be at most ${field.max}` }));
                } else {
                    setFormErrors((prev) => { const n = { ...prev }; delete n[fieldId]; return n; });
                }
                if (field.isDecimal === false && !Number.isInteger(numValue)) value = Math.floor(numValue);
            }
        }
        setFormValues((prev) => ({ ...prev, [fieldId]: value }));
        if (fieldType === "numeric" && checkRemarkTriggers(field, value)) {
            if (!remarks[fieldId] || remarks[fieldId].trim() === "")
                setFormErrors((prev) => ({ ...prev, [`${fieldId}_remark`]: "Remark is required for this value" }));
        } else if ((fieldType === "dropdown" || fieldType === "radio") && needsRemark(field, value)) {
            if (!remarks[fieldId] || remarks[fieldId].trim() === "")
                setFormErrors((prev) => ({ ...prev, [`${fieldId}_remark`]: "Remark is required for this selection" }));
        }
    };

    const handleCheckboxChange = (fieldId, option, field) => {
        if (isLocked(fieldId)) return; // ← only change vs DynamicForm
        setFormValues((prev) => {
            const currentValues = [...(prev[fieldId] || [])];
            const newValues = currentValues.includes(option)
                ? currentValues.filter((val) => val !== option)
                : [...currentValues, option];
            if (needsRemark(field, newValues)) {
                if (!remarks[fieldId] || remarks[fieldId].trim() === "")
                    setFormErrors((prev) => ({ ...prev, [`${fieldId}_remark`]: "Remark is required for selected option(s)" }));
            } else {
                setFormErrors((prev) => { const n = { ...prev }; delete n[`${fieldId}_remark`]; return n; });
            }
            return { ...prev, [fieldId]: newValues };
        });
        setFormErrors((prev) => { const n = { ...prev }; delete n[fieldId]; return n; });
    };

    const handleRadioChange = (fieldId, option, field) => {
        if (isLocked(fieldId)) return; // ← only change vs DynamicForm
        setFormValues((prev) => ({ ...prev, [fieldId]: option }));
        setFormErrors((prev) => { const n = { ...prev }; delete n[fieldId]; return n; });
        if (field.requireRemarks && field.requireRemarks.includes(option)) {
            if (!remarks[fieldId] || remarks[fieldId].trim() === "")
                setFormErrors((prev) => ({ ...prev, [`${fieldId}_remark`]: "Remark is required for this selection" }));
        } else {
            setFormErrors((prev) => { const n = { ...prev }; delete n[`${fieldId}_remark`]; return n; });
        }
    };

    const handleRemarkChange = (fieldId) => (e) => {
        const value = e.target.value;
        setRemarks((prev) => ({ ...prev, [fieldId]: value }));
        if (value.trim()) setFormErrors((prev) => { const n = { ...prev }; delete n[`${fieldId}_remark`]; return n; });
    };

    const handleGridChange = (fieldId, rowIndex, columnName, value, entireRow = null) => {
        if (isLocked(fieldId)) return; // ← only change vs DynamicForm
        setFormValues(prev => {
            const updatedRows = [...(prev[fieldId] || [])];
            const field = formData.fields.find(f => f.id === fieldId);
            if (entireRow) {
                updatedRows[rowIndex] = entireRow;
            } else {
                if (!updatedRows[rowIndex]) updatedRows[rowIndex] = {};
                updatedRows[rowIndex] = { ...updatedRows[rowIndex], [columnName]: value };
                if (field) {
                    field.columns.forEach(col => {
                        if (col.type === "dependentDropdown" && col.parentColumn === columnName)
                            updatedRows[rowIndex][col.name] = "";
                    });
                }
            }
            return { ...prev, [fieldId]: updatedRows };
        });
    };

    function validateRows(rows, columns) {
        for (const row of rows) {
            for (const col of columns) {
                if (col.type === "dropdown" && col.remarksOptions?.includes(row[col.name]) && !row[`${col.name}_remarks`])
                    return { valid: false, message: `Remarks required for ${col.name}` };
            }
        }
        return { valid: true };
    }

    // Validate only recipient fields
    const validateForm = () => {
        const errors = {};
        if (!formData) return errors;

        formData.fields
            .filter(f => recipientFieldIds.includes(f.id)) // ← only validate recipient fields
            .forEach((field) => {
                const value = formValues[field.id];

                if (field.required) {
                    if (field.type === "checkbox" && (!Array.isArray(value) || value.length === 0))
                        errors[field.id] = `${field.label} is required`;
                    else if (field.type === "radio" && (!value || value.trim() === ""))
                        errors[field.id] = `${field.label} is required`;
                    else if (field.type === "dropdown" && (!value || value.trim() === ""))
                        errors[field.id] = `${field.label} is required`;
                    else if (field.type === "textbox" && (!value || value.trim() === ""))
                        errors[field.id] = `${field.label} is required`;
                    else if (field.type === "numeric" && value === "")
                        errors[field.id] = `${field.label} is required`;
                    else if (field.type === "date" && !value)
                        errors[field.id] = `${field.label} is required`;
                    else if (field.type === "date" && value && !isValidDate(value))
                        errors[field.id] = `Please enter a valid date for ${field.label}`;
                }

                if (field.type === "grid" && field.columns?.length > 0) {
                    const rows = formValues[field.id] || [];
                    rows.forEach((row, rowIndex) => {
                        field.columns.forEach(col => {
                            const val = row[col.name];
                            if (col.required && (val === "" || val === null || val === undefined))
                                errors[`${field.id}_${rowIndex}_${col.name}`] = `${col.label || col.name} is required in row ${rowIndex + 1}`;
                            if (col.type === "date" && val !== null && val !== "" && !isValidDate(val))
                                errors[`${field.id}_${rowIndex}_${col.name}`] = `Please enter a valid date in row ${rowIndex + 1}`;
                            if (col.type === "textbox" && val && typeof val === "string") {
                                if (col.minLength && val.length < col.minLength)
                                    errors[`${field.id}_${rowIndex}_${col.name}`] = col.lengthValidationMessage || `Minimum ${col.minLength} characters required in row ${rowIndex + 1}`;
                                else if (col.maxLength && val.length > col.maxLength)
                                    errors[`${field.id}_${rowIndex}_${col.name}`] = col.lengthValidationMessage || `Maximum ${col.maxLength} characters allowed in row ${rowIndex + 1}`;
                            }
                            if (col.type === "numeric" && val !== "" && val !== null) {
                                const numValue = parseFloat(val);
                                if (!isNaN(numValue)) {
                                    const isOutOfRange = (
                                        (col.min !== null && col.min !== undefined && numValue < col.min) ||
                                        (col.max !== null && col.max !== undefined && numValue > col.max)
                                    );
                                    if (isOutOfRange) {
                                        const rowRemarks = row[`${col.name}_remarks`];
                                        if (!rowRemarks || rowRemarks.trim() === "")
                                            errors[`${field.id}_${rowIndex}_${col.name}_remarks`] = `Remarks required for out-of-range value in row ${rowIndex + 1}`;
                                    }
                                }
                            }
                        });
                    });
                }

                if (field.type === "textbox" && value && typeof value === "string") {
                    if (field.minLength && value.length < field.minLength)
                        errors[field.id] = field.lengthValidationMessage || `${field.label} must be at least ${field.minLength} characters`;
                    else if (field.maxLength && value.length > field.maxLength)
                        errors[field.id] = field.lengthValidationMessage || `${field.label} must not exceed ${field.maxLength} characters`;
                }

                if (field.type === "signature" && field.required && (!value || value === ""))
                    errors[field.id] = `${field.label} is required`;

                if (checkRemarkTriggers(field, value) && (!remarks[field.id] || remarks[field.id].trim() === ""))
                    errors[`${field.id}_remark`] = "Remark is required for this value";
                if (needsRemark(field, value) && (!remarks[field.id] || remarks[field.id].trim() === ""))
                    errors[`${field.id}_remark`] = "Remark is required for selected option(s)";
            });

        return errors;
    };

    const cleanGridData = (gridData) => {
        if (!Array.isArray(gridData)) return gridData;
        return gridData.map(row => {
            const cleanedRow = {};
            Object.keys(row).forEach(key => {
                if (row[key] instanceof Date) {
                    const date = row[key];
                    cleanedRow[key] = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                } else if (row[key] !== null && row[key] !== undefined && row[key] !== '') {
                    cleanedRow[key] = row[key];
                }
            });
            return cleanedRow;
        });
    };

    // ─── Submit — sends only recipient field values ───────────────────────────
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        const validationErrors = validateForm();
        setFormErrors(validationErrors);
        setSubmitted(true);
        if (Object.keys(validationErrors).length > 0) return;

        const remainingData = {};
        recipientFieldIds.forEach(fieldId => {
            let fieldValue = formValues[fieldId];
            const field = formData.fields.find(f => f.id === fieldId);
            if (!field) return;

            if (field.type === "grid" || field.type === "questionGrid") {
                fieldValue = JSON.stringify(cleanGridData(Array.isArray(fieldValue) ? fieldValue : []));
            } else if (Array.isArray(fieldValue)) {
                fieldValue = fieldValue.join(", ");
            } else if (field.type === "date" && fieldValue instanceof Date) {
                const y = fieldValue.getFullYear();
                const m = String(fieldValue.getMonth() + 1).padStart(2, "0");
                const d = String(fieldValue.getDate()).padStart(2, "0");
                fieldValue = `${y}-${m}-${d}`;
            } else {
                fieldValue = fieldValue === null || fieldValue === undefined ? "" : String(fieldValue);
            }
            remainingData[fieldId] = fieldValue;

            if (remarks[fieldId] && remarks[fieldId].trim() !== "")
                remainingData[`${fieldId}_remark`] = remarks[fieldId];
        });

        setSubmitting(true);
        try {
            const res = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/partial-submissions/complete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, remainingData }),
            });
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || "Submission failed.");
            }
            setDone(true);
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const addGridRow = (fieldId, columns) => {
        const field = formData.fields.find(f => f.id === fieldId);
        const currentRows = formValues[fieldId] || [];
        if (field.maxRows && currentRows.length >= field.maxRows) { alert(`Maximum ${field.maxRows} rows allowed`); return; }
        const newRow = {};
        columns.forEach(col => {
            if (col.type === "checkbox") {
                newRow[col.name] = (!col.options || col.options.length === 0) ? false : [];
            } else if (col.type === "numeric") {
                newRow[col.name] = ""; newRow[`${col.name}_remarks`] = "";
            } else if (col.type === "date") {
                newRow[col.name] = null;
            } else if (col.type === "label") {
                newRow[col.name] = "";
            } else {
                newRow[col.name] = "";
            }
        });
        setFormValues(prev => ({ ...prev, [fieldId]: [...currentRows, newRow] }));
    };

    const removeGridRow = (fieldId, rowIndex) => {
        const field = formData.fields.find(f => f.id === fieldId);
        const currentRows = formValues[fieldId] || [];
        if (field.min_rows && currentRows.length <= field.min_rows) { alert(`Minimum ${field.min_rows} rows required`); return; }
        setFormValues(prev => ({ ...prev, [fieldId]: currentRows.filter((_, idx) => idx !== rowIndex) }));
    };

    // ─── renderField — EXACT copy from DynamicForm ────────────────────────────
    // The ONLY difference: locked fields get a read-only display instead of an input
    const renderField = (field) => {
        // ── Locked field (creator-filled): show read-only display ──────────────
        if (isLocked(field.id)) {
            const val = formValues[field.id];

            // Grids: show a read-only table
            if (field.type === "grid" || field.type === "questionGrid") {
                const rows = Array.isArray(val) ? val : [];
                const colorScheme = getTableColor(field.id);
                const visibleColumns = (field.columns || []).filter(c => c.visible !== false);
                return (
                    <div className="mb-4 w-full">
                        <div className={`overflow-x-auto border-2 ${colorScheme.border} rounded-lg`}>
                            <table className="min-w-full bg-white">
                                <thead>
                                    <tr>
                                        <td colSpan={visibleColumns.length} className={`${colorScheme.titleBg} py-2 px-4 border-b ${colorScheme.border}`}>
                                            <label className="block text-gray-500 text-sm font-bold">🔒 {field.label}</label>
                                        </td>
                                    </tr>
                                    <tr className={colorScheme.bg}>
                                        {visibleColumns.map((col, i) => (
                                            <th key={i} className={`py-3 px-4 border-b ${colorScheme.border} text-left font-bold text-gray-700 text-sm`}>{col.name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr><td colSpan={visibleColumns.length} className="py-3 px-4 text-gray-400 italic text-sm">No data</td></tr>
                                    ) : rows.map((row, ri) => (
                                        <tr key={ri} className="border-b border-gray-200">
                                            {visibleColumns.map((col, ci) => (
                                                <td key={ci} className="py-2 px-4 text-sm text-gray-600">
                                                    {Array.isArray(row[col.name]) ? row[col.name].join(", ") : String(row[col.name] ?? "")}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            }

            // All other locked fields: single read-only box
            let display = "";
            if (Array.isArray(val)) display = val.join(", ");
            else if (val instanceof Date) display = val.toLocaleDateString("en-GB");
            else display = (val !== null && val !== undefined) ? String(val) : "";

            return (
                <div className="mb-4 w-full">
                    <label className="block text-gray-500 text-sm font-bold mb-2">
                        🔒 {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <div className="shadow border border-gray-200 rounded w-full py-2 px-3 text-sm bg-gray-50 text-gray-600 min-h-[38px]">
                        {display || <span className="text-gray-400 italic">—</span>}
                    </div>
                </div>
            );
        }

        // ── Editable field (recipient) — EXACT renderField from DynamicForm ────
        switch (field.type) {
            case "checkbox":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}{" "}{field.required && <span className="text-red-500">*</span>}
                        </label>
                        <div className="mt-2">
                            {field.options.map((option) => (
                                <div key={option} className="flex items-center mb-2">
                                    <input id={`${field.id}-${option}`} type="checkbox"
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        checked={(formValues[field.id] || []).includes(option)}
                                        onChange={() => handleCheckboxChange(field.id, option, field)} />
                                    <label htmlFor={`${field.id}-${option}`} className="ml-2 block text-sm text-gray-700">{option}</label>
                                </div>
                            ))}
                        </div>
                        {formErrors[field.id] && <p className="text-red-500 text-xs mt-1">{formErrors[field.id]}</p>}
                        {needsRemark(field, formValues[field.id] || []) && (
                            <div className="mt-2">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Remarks{" "}{field.requireRemarks && <span className="text-red-500">*</span>}</label>
                                <textarea className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={remarks[field.id] || ""} onChange={handleRemarkChange(field.id)} placeholder="Enter remarks" rows={1} />
                                {formErrors[`${field.id}_remark`] && <p className="text-red-500 text-xs mt-1">{formErrors[`${field.id}_remark`]}</p>}
                            </div>
                        )}
                    </div>
                );

            case "numeric":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}{" "}{field.required && <span className="text-red-500">*</span>}
                        </label>
                        <input type="number"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={formValues[field.id] || ""}
                            onChange={(e) => handleInputChange(field.id, e.target.value, field.type, field)}
                            placeholder={`Enter ${field.label}`}
                            min={field.min !== null ? field.min : undefined}
                            max={field.max !== null ? field.max : undefined}
                            step={field.isDecimal === false ? "1" : "any"} />
                        {(field.min !== null || field.max !== null) && (
                            <p className="text-xs text-gray-500 mt-1">
                                {field.isDecimal === false ? "Whole number" : "Decimal number"}
                                {field.min !== null && field.max !== null ? ` between ${field.min} and ${field.max}` : field.min !== null ? ` (min: ${field.min})` : ` (max: ${field.max})`}
                            </p>
                        )}
                        {formErrors[field.id] && <p className="text-red-500 text-xs mt-1">{formErrors[field.id]}</p>}
                        {checkRemarkTriggers(field, formValues[field.id]) && (
                            <div className="mt-2">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Remarks <span className="text-red-500">*</span></label>
                                <textarea className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={remarks[field.id] || ""} onChange={handleRemarkChange(field.id)} placeholder="Enter remarks" rows={1} />
                                {formErrors[`${field.id}_remark`] && <p className="text-red-500 text-xs mt-1">{formErrors[`${field.id}_remark`]}</p>}
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
                        <select className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white"
                            value={formValues[field.id] || ""}
                            onChange={(e) => handleInputChange(field.id, e.target.value, field.type, field)}>
                            <option value="">Select {field.label}</option>
                            {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                        {formErrors[field.id] && <p className="text-red-500 text-xs mt-1">{formErrors[field.id]}</p>}
                        {needsRemark(field, formValues[field.id] || []) && (
                            <div className="mt-2">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Remarks{" "}{field.requireRemarks && <span className="text-red-500">*</span>}</label>
                                <textarea className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={remarks[field.id] || ""} onChange={handleRemarkChange(field.id)} placeholder="Enter remarks" rows={1} />
                                {formErrors[`${field.id}_remark`] && <p className="text-red-500 text-xs mt-1">{formErrors[`${field.id}_remark`]}</p>}
                            </div>
                        )}
                    </div>
                );

            case "signature":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}{" "}{field.required && <span className="text-red-500">*</span>}
                        </label>
                        <div className="border-2 border-gray-300 rounded">
                            <SignatureCanvas
                                ref={(ref) => { if (!window.signaturePads) window.signaturePads = {}; window.signaturePads[field.id] = ref; }}
                                canvasProps={{ width: field.signatureWidth || 400, height: field.signatureHeight || 200, className: 'signature-canvas', style: { backgroundColor: field.backgroundColor || '#ffffff' } }}
                                penColor={field.penColor || '#000000'}
                                onEnd={() => { const dataUrl = window.signaturePads[field.id]?.toDataURL(); if (dataUrl) handleInputChange(field.id, dataUrl, field.type, field); }} />
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button type="button" onClick={() => { window.signaturePads[field.id]?.clear(); handleInputChange(field.id, "", field.type, field); }}
                                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded text-sm">Clear</button>
                        </div>
                        {formErrors[field.id] && <p className="text-red-500 text-xs mt-1">{formErrors[field.id]}</p>}
                    </div>
                );

            case "textbox":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}{field.required && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${formErrors[field.id] ? "border-red-500" : ""}`}
                            value={formValues[field.id] || ""}
                            onChange={(e) => {
                                const value = e.target.value;
                                let errorMessage = "";
                                if (field.minLength && value.length < field.minLength)
                                    errorMessage = field.lengthValidationMessage || `Minimum ${field.minLength} characters required`;
                                else if (field.maxLength && value.length > field.maxLength)
                                    errorMessage = field.lengthValidationMessage || `Maximum ${field.maxLength} characters allowed`;
                                handleInputChange(field.id, value, field.type, field);
                                if (errorMessage) setFormErrors(prev => ({ ...prev, [field.id]: errorMessage }));
                                else setFormErrors(prev => { const n = { ...prev }; delete n[field.id]; return n; });
                            }}
                            placeholder={field.minLength || field.maxLength ? `${field.minLength || 0}-${field.maxLength || '∞'} characters` : `Enter ${field.label}`}
                            rows="1"
                            minLength={field.minLength || undefined}
                            maxLength={field.maxLength || undefined} />
                        {(field.minLength || field.maxLength) && (
                            <div className="text-xs text-gray-500 mt-1 flex justify-between">
                                <span>Characters: {(formValues[field.id] || "").length}{field.maxLength ? `/${field.maxLength}` : ''}</span>
                                {field.minLength && <span>Minimum: {field.minLength}</span>}
                            </div>
                        )}
                        {formErrors[field.id] && <p className="text-red-500 text-xs mt-1">{formErrors[field.id]}</p>}
                    </div>
                );

            case "time":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}{" "}{field.required && <span className="text-red-500">*</span>}
                        </label>
                        <div className="flex flex-col gap-1">
                            <input type="time" className="border p-2 w-full"
                                value={formValues[field.id] || ""}
                                onChange={(e) => handleInputChange(field.id, e.target.value, field.type, field)} />
                        </div>
                        {formErrors[field.id] && <p className="text-red-500 text-xs mt-1">{formErrors[field.id]}</p>}
                    </div>
                );

            case "date":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}{field.required && <span className="text-red-500">*</span>}
                        </label>
                        <div className="flex flex-col gap-1">
                            <DatePicker className="border p-2 w-full"
                                selected={formValues[field.id] || null}
                                onChange={(date) => handleInputChange(field.id, date, field.type, field)}
                                dateFormat="dd/MM/yyyy" placeholderText="DD/MM/YYYY" />
                            <input type="text" className="border p-1 w-24 text-center bg-gray-100 cursor-not-allowed text-sm"
                                value={getDayName(formValues[field.id])} disabled aria-label="Day of the week" />
                        </div>
                        {formErrors[field.id] && <p className="text-red-500 text-xs mt-1">{formErrors[field.id]}</p>}
                    </div>
                );

            case "radio":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {field.label}{" "}{field.required && <span className="text-red-500">*</span>}
                        </label>
                        <div className="mt-2">
                            {field.options.map((option) => (
                                <div key={option} className="flex items-center mb-2">
                                    <input id={`${field.id}-${option}`} type="radio" name={field.id}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded-full focus:ring-blue-500"
                                        checked={formValues[field.id] === option}
                                        onChange={() => handleRadioChange(field.id, option, field)} />
                                    <label htmlFor={`${field.id}-${option}`} className="ml-2 block text-sm text-gray-700">{option}</label>
                                </div>
                            ))}
                        </div>
                        {formErrors[field.id] && <p className="text-red-500 text-xs mt-1">{formErrors[field.id]}</p>}
                        {needsRemark(field, formValues[field.id]) && (
                            <div className="mt-2">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Remarks{" "}{field.requireRemarks && <span className="text-red-500">*</span>}</label>
                                <textarea className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={remarks[field.id] || ""} onChange={handleRemarkChange(field.id)} placeholder="Enter remarks" rows={1} />
                                {formErrors[`${field.id}_remark`] && <p className="text-red-500 text-xs mt-1">{formErrors[`${field.id}_remark`]}</p>}
                            </div>
                        )}
                    </div>
                );

            case "calculation":
                return (
                    <div className="mb-4 w-full">
                        <label className="block text-gray-700 text-sm font-bold mb-2">{field.label}</label>
                        <input type="text" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 bg-gray-100 cursor-not-allowed"
                            value={evaluateFormula(field.formula)} readOnly />
                    </div>
                );

            case "grid": {
                const colorScheme = getTableColor(field.id);
                const visibleColumns = (field.columns || []).filter(col => col.visible !== false);
                return (
                    <div className="mb-4 w-full">
                        <div className={`overflow-x-auto border-2 ${colorScheme.border} rounded-lg`}>
                            <table className="min-w-full bg-white">
                                <thead>
                                    <tr>
                                        <td colSpan={visibleColumns.length + 1} className={`${colorScheme.titleBg} py-2 px-4 border-b ${colorScheme.border}`}>
                                            <label className="block text-gray-700 text-sm font-bold">{field.label}</label>
                                        </td>
                                    </tr>
                                </thead>
                                <thead className={colorScheme.bg}>
                                    <tr>
                                        {visibleColumns.map((col, idx) => (
                                            <th key={idx} className={`py-3 px-4 border-b ${colorScheme.border} text-left font-bold text-gray-700 text-sm`} style={{ width: col.width || "auto" }}>{col.name}</th>
                                        ))}
                                        {visibleColumns.length > 0 && (
                                            <th className={`py-3 px-4 border-b ${colorScheme.border} text-left font-bold text-gray-700 text-sm`} style={{ width: "100px" }}>Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(formValues[field.id] || []).map((row, rowIndex) => {
                                        (field.columns || []).forEach(col => {
                                            if (col.visible === false || col.disabled === true) {
                                                if (col.type === "dropdown" && (col.options || []).length > 0 && !row[col.name]) row[col.name] = col.options[0];
                                                else if (col.type === "dependentDropdown") {
                                                    const parentValue = row[col.parentColumn] || "";
                                                    const dependentOptions = parentValue ? (col.dependentOptions?.[parentValue] || []) : [];
                                                    if (dependentOptions.length > 0 && !row[col.name]) row[col.name] = dependentOptions[0];
                                                }
                                            }
                                        });
                                        return (
                                            <tr key={rowIndex} className={`border-b border-gray-200 ${colorScheme.hover}`}>
                                                {visibleColumns.map((col, colIdx) => (
                                                    <td key={colIdx} className="py-2 px-4 border-b border-gray-200" style={{ width: col.width || "auto" }}>
                                                        {(() => {
                                                            const style = { color: col.textColor || "inherit", backgroundColor: col.backgroundColor || "inherit" };
                                                            const isDisabled = col.disabled === true;

                                                            if (col.type === "calculation") {
                                                                const calculatedValue = evaluateRowFormula(col.formula, row);
                                                                if (row[col.name] !== calculatedValue) row[col.name] = calculatedValue;
                                                                return <input type="text" value={calculatedValue} className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed" readOnly style={style} />;
                                                            }
                                                            if (col.type === "time") {
                                                                return <input type="time" value={row[col.name] || ""} onChange={(e) => handleGridChange(field.id, rowIndex, col.name, e.target.value)} className="border rounded px-2 py-1 w-full" style={style} />;
                                                            }
                                                            if (col.type === "label") {
                                                                return (
                                                                    <div className={`w-full p-2 min-h-[36px] flex items-center ${col.labelStyle === 'bold' ? 'font-bold' : col.labelStyle === 'italic' ? 'italic' : col.labelStyle === 'underline' ? 'underline' : 'font-normal'} ${col.textAlign === 'center' ? 'justify-center' : col.textAlign === 'right' ? 'justify-end' : 'justify-start'}`}
                                                                        style={{ color: col.textColor || 'inherit', backgroundColor: col.backgroundColor || 'inherit' }}>
                                                                        {col.labelText || 'Label Text'}
                                                                    </div>
                                                                );
                                                            }
                                                            if (col.type === "timecalculation") {
                                                                const matches = (col.formula || "").match(/\{(.*?)\}/g);
                                                                let diff = "";
                                                                if (matches && matches.length === 2) {
                                                                    const t1 = row[matches[0].replace(/[{}]/g, "")] || "";
                                                                    const t2 = row[matches[1].replace(/[{}]/g, "")] || "";
                                                                    diff = calculateTimeDifference(t1, t2);
                                                                }
                                                                if (row[col.name] !== diff) row[col.name] = diff;
                                                                return <input type="text" value={diff} readOnly className="border rounded px-2 py-1 w-full bg-gray-100 cursor-not-allowed" style={style} />;
                                                            }
                                                            if (col.type === "textbox") {
                                                                return (
                                                                    <div>
                                                                        <input type="text" value={row[col.name] || ""}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value;
                                                                                let errorMessage = "";
                                                                                if (col.minLength && value.length < col.minLength) errorMessage = col.lengthValidationMessage || `Minimum ${col.minLength} characters required`;
                                                                                else if (col.maxLength && value.length > col.maxLength) errorMessage = col.lengthValidationMessage || `Maximum ${col.maxLength} characters allowed`;
                                                                                handleGridChange(field.id, rowIndex, col.name, value);
                                                                                if (errorMessage) setFormErrors(prev => ({ ...prev, [`${field.id}_${rowIndex}_${col.name}`]: errorMessage }));
                                                                                else setFormErrors(prev => { const n = { ...prev }; delete n[`${field.id}_${rowIndex}_${col.name}`]; return n; });
                                                                            }}
                                                                            disabled={isDisabled}
                                                                            className={`border rounded px-2 py-1 w-full ${formErrors[`${field.id}_${rowIndex}_${col.name}`] ? "border-red-500" : ""} ${isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                                                                            style={{ color: col.textColor || "inherit", backgroundColor: isDisabled ? '#f3f4f6' : (col.backgroundColor || "inherit") }}
                                                                            minLength={col.minLength || undefined} maxLength={col.maxLength || undefined}
                                                                            placeholder={col.minLength || col.maxLength ? `${col.minLength || 0}-${col.maxLength || '∞'} chars` : `Enter ${col.name}`} />
                                                                        {(col.minLength || col.maxLength) && <div className="text-xs text-gray-500 mt-1">{(row[col.name] || "").length}/{col.maxLength || '∞'} characters</div>}
                                                                        {formErrors[`${field.id}_${rowIndex}_${col.name}`] && <p className="text-red-500 text-xs mt-1">{formErrors[`${field.id}_${rowIndex}_${col.name}`]}</p>}
                                                                    </div>
                                                                );
                                                            }
                                                            if (col.type === "dependentDropdown") {
                                                                const parentValue = row[col.parentColumn] || "";
                                                                const dependentOptions = parentValue ? (col.dependentOptions?.[parentValue] || []) : [];
                                                                if (dependentOptions.length > 0 && !row[col.name]) {
                                                                    setTimeout(() => {
                                                                        const firstValue = dependentOptions[0];
                                                                        handleGridChange(field.id, rowIndex, col.name, firstValue, { ...row, [col.name]: firstValue });
                                                                    }, 0);
                                                                }
                                                                const selectedValue = row[col.name] || "";
                                                                const remarksKey = `${parentValue}:${selectedValue}`;
                                                                const requiresRemarks = selectedValue && (col.remarksOptions || []).includes(remarksKey);
                                                                const remarksFieldName = `${col.name}_remarks`;
                                                                return (
                                                                    <div>
                                                                        <select value={selectedValue}
                                                                            onChange={(e) => {
                                                                                const newValue = e.target.value;
                                                                                const updatedRow = { ...row, [col.name]: newValue };
                                                                                const newRemarksKey = `${parentValue}:${newValue}`;
                                                                                if (!(col.remarksOptions || []).includes(newRemarksKey)) updatedRow[remarksFieldName] = "";
                                                                                handleGridChange(field.id, rowIndex, col.name, newValue, updatedRow);
                                                                            }}
                                                                            disabled={!parentValue || isDisabled}
                                                                            className={`border rounded px-2 py-1 w-full ${isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                                                                            style={{ color: col.textColor || "inherit", backgroundColor: isDisabled ? '#f3f4f6' : (col.backgroundColor || "inherit") }}>
                                                                            <option value="">Select {col.name}</option>
                                                                            {dependentOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                                                                        </select>
                                                                        {selectedValue && <div className="text-xs text-gray-600 mt-1">You selected: <span className="font-semibold">{selectedValue}</span></div>}
                                                                        {requiresRemarks && (
                                                                            <div className="mt-2">
                                                                                <label className="block text-xs text-gray-700 mb-1">Remarks <span className="text-red-500">*</span></label>
                                                                                <textarea value={row[remarksFieldName] || ""}
                                                                                    onChange={(e) => { const updatedRow = { ...row, [remarksFieldName]: e.target.value }; handleGridChange(field.id, rowIndex, remarksFieldName, e.target.value, updatedRow); }}
                                                                                    disabled={isDisabled} required className={`border rounded px-2 py-1 w-full text-sm ${isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`} rows="2" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            }
                                                            if (col.type === "dropdown") {
                                                                return (
                                                                    <div>
                                                                        <select value={row[col.name] || ""}
                                                                            onChange={(e) => {
                                                                                const newValue = e.target.value;
                                                                                const updatedRow = { ...row, [col.name]: newValue };
                                                                                field.columns.forEach(depCol => { if (depCol.type === "dependentDropdown" && depCol.parentColumn === col.name) updatedRow[depCol.name] = ""; });
                                                                                if (!(col.remarksOptions || []).includes(newValue)) updatedRow[`${col.name}_remarks`] = "";
                                                                                handleGridChange(field.id, rowIndex, col.name, newValue, updatedRow);
                                                                            }}
                                                                            disabled={isDisabled}
                                                                            className={`border rounded px-2 py-1 w-full ${isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                                                                            style={{ color: col.textColor || "inherit", backgroundColor: isDisabled ? '#f3f4f6' : (col.backgroundColor || "inherit") }}>
                                                                            <option value="">Select {col.name}</option>
                                                                            {(col.options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                                                                        </select>
                                                                        {col.remarksOptions?.includes(row[col.name]) && (
                                                                            <input type="text" required placeholder={`Enter remarks for ${row[col.name]}`}
                                                                                value={row[`${col.name}_remarks`] || ""}
                                                                                onChange={(e) => { const updatedRow = { ...row, [`${col.name}_remarks`]: e.target.value }; handleGridChange(field.id, rowIndex, `${col.name}_remarks`, e.target.value, updatedRow); }}
                                                                                disabled={isDisabled} className={`border rounded px-2 py-1 w-full mt-2 ${isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`} />
                                                                        )}
                                                                        {row[col.name] && <div className="text-xs text-gray-600 mt-1">You selected: <span className="font-semibold">{row[col.name]}</span></div>}
                                                                    </div>
                                                                );
                                                            }
                                                            if (col.type === "signature") {
                                                                return (
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        {row[col.name] ? <img src={row[col.name]} alt="signature" className="h-16 border rounded" /> : <span className="text-gray-400 text-xs">No Signature</span>}
                                                                        <button type="button" className="text-blue-600 text-xs underline"
                                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveSignature({ fieldId: field.id, rowIndex, colName: col.name }); setShowSignatureModal(true); }}>
                                                                            {row[col.name] ? "Edit" : "Sign"}
                                                                        </button>
                                                                    </div>
                                                                );
                                                            }
                                                            if (col.type === "checkbox") {
                                                                if (!col.options || col.options.length === 0) {
                                                                    return (
                                                                        <input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                                            checked={row[col.name] === true || row[col.name] === "true"}
                                                                            onChange={(e) => { const updatedRow = { ...row, [col.name]: e.target.checked }; handleGridChange(field.id, rowIndex, col.name, e.target.checked, updatedRow); }}
                                                                            disabled={isDisabled} style={{ color: col.textColor || "inherit" }} />
                                                                    );
                                                                }
                                                                return (
                                                                    <div>
                                                                        {(col.options || []).map((option) => (
                                                                            <div key={option} className="flex items-center mb-1">
                                                                                <input type="checkbox" id={`${field.id}_${rowIndex}_${col.name}_${option}`}
                                                                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
                                                                                    checked={Array.isArray(row[col.name]) ? row[col.name].includes(option) : false}
                                                                                    onChange={(e) => {
                                                                                        let updatedValues = Array.isArray(row[col.name]) ? [...row[col.name]] : [];
                                                                                        if (e.target.checked) { if (!updatedValues.includes(option)) updatedValues.push(option); }
                                                                                        else updatedValues = updatedValues.filter(val => val !== option);
                                                                                        handleGridChange(field.id, rowIndex, col.name, updatedValues, { ...row, [col.name]: updatedValues });
                                                                                    }}
                                                                                    disabled={isDisabled} />
                                                                                <label htmlFor={`${field.id}_${rowIndex}_${col.name}_${option}`} className="text-sm text-gray-700 cursor-pointer">{option}</label>
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
                                                                        <input type="number" value={row[col.name] || ""}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value;
                                                                                const updatedRow = { ...row, [col.name]: value };
                                                                                const numValue = parseFloat(value);
                                                                                if (value === "" || isNaN(numValue) ||
                                                                                    ((col.min === null || col.min === undefined || numValue >= col.min) &&
                                                                                        (col.max === null || col.max === undefined || numValue <= col.max)))
                                                                                    updatedRow[`${col.name}_remarks`] = "";
                                                                                handleGridChange(field.id, rowIndex, col.name, value, updatedRow);
                                                                            }}
                                                                            disabled={isDisabled}
                                                                            className={`border rounded px-2 py-1 w-full ${formErrors[`${field.id}_${rowIndex}_${col.name}`] ? "border-red-500" : ""} ${isOutOfRange ? "border-orange-500" : ""} ${isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                                                                            style={{ color: col.textColor || "inherit", backgroundColor: isDisabled ? '#f3f4f6' : (col.backgroundColor || "inherit") }}
                                                                            step={col.decimal ? "any" : "1"} />
                                                                        {isOutOfRange && <div className="text-orange-600 text-xs mt-1">⚠️ Value outside range. Remarks required.</div>}
                                                                        {isOutOfRange && (
                                                                            <textarea placeholder="Please provide remarks for out-of-range value" value={row[`${col.name}_remarks`] || ""}
                                                                                onChange={(e) => { const updatedRow = { ...row, [`${col.name}_remarks`]: e.target.value }; handleGridChange(field.id, rowIndex, `${col.name}_remarks`, e.target.value, updatedRow); }}
                                                                                disabled={isDisabled} className={`border rounded px-2 py-1 w-full mt-2 text-sm ${formErrors[`${field.id}_${rowIndex}_${col.name}_remarks`] ? "border-red-500" : ""} ${isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`} rows="2" required />
                                                                        )}
                                                                        {(col.min !== null || col.max !== null || !col.decimal) && !isOutOfRange && (
                                                                            <div className="text-xs text-gray-500 mt-1">
                                                                                {!col.decimal && "Whole number"}
                                                                                {!col.decimal && (col.min !== null || col.max !== null) && ", "}
                                                                                {col.min !== null && col.max !== null ? `Range: ${col.min} - ${col.max}` : col.min !== null ? `Min: ${col.min}` : col.max !== null ? `Max: ${col.max}` : ""}
                                                                            </div>
                                                                        )}
                                                                        {formErrors[`${field.id}_${rowIndex}_${col.name}`] && <p className="text-red-500 text-xs mt-1">{formErrors[`${field.id}_${rowIndex}_${col.name}`]}</p>}
                                                                        {formErrors[`${field.id}_${rowIndex}_${col.name}_remarks`] && <p className="text-red-500 text-xs mt-1">{formErrors[`${field.id}_${rowIndex}_${col.name}_remarks`]}</p>}
                                                                    </div>
                                                                );
                                                            }
                                                            if (col.type === "date") {
                                                                return (
                                                                    <div>
                                                                        <div className="flex flex-col gap-1">
                                                                            <DatePicker className="border rounded px-2 py-1 w-full"
                                                                                selected={row[col.name] ? new Date(row[col.name]) : null}
                                                                                onChange={(date) => { const updatedRow = { ...row, [col.name]: date }; handleGridChange(field.id, rowIndex, col.name, date, updatedRow); }}
                                                                                dateFormat="dd/MM/yyyy" placeholderText="DD/MM/YYYY" disabled={isDisabled}
                                                                                style={{ color: col.textColor || "inherit", backgroundColor: col.backgroundColor || "inherit" }} />
                                                                            <input type="text" className="border rounded px-2 py-1 w-full text-center bg-gray-100 cursor-not-allowed text-xs"
                                                                                value={getDayName(row[col.name])} disabled aria-label="Day of the week" />
                                                                        </div>
                                                                        {formErrors[`${field.id}_${rowIndex}_${col.name}`] && <p className="text-red-500 text-xs mt-1">{formErrors[`${field.id}_${rowIndex}_${col.name}`]}</p>}
                                                                    </div>
                                                                );
                                                            }
                                                            return (
                                                                <div>
                                                                    <input type="text" value={row[col.name] || ""}
                                                                        onChange={(e) => handleGridChange(field.id, rowIndex, col.name, e.target.value)}
                                                                        disabled={isDisabled}
                                                                        className={`border rounded px-2 py-1 w-full ${formErrors[`${field.id}_${rowIndex}_${col.name}`] ? "border-red-500" : ""} ${isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                                                                        style={style} />
                                                                    {formErrors[`${field.id}_${rowIndex}_${col.name}`] && <p className="text-red-500 text-xs mt-1">{formErrors[`${field.id}_${rowIndex}_${col.name}`]}</p>}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                ))}
                                                {visibleColumns.length > 0 && (
                                                    <td className="py-2 px-4 border-b border-gray-200">
                                                        <button type="button" onClick={() => removeGridRow(field.id, rowIndex)}
                                                            disabled={(formValues[field.id] || []).length <= (field.min_rows || 0)}
                                                            className={`${(formValues[field.id] || []).length <= (field.min_rows || 0) ? 'text-gray-400 cursor-not-allowed' : 'text-red-500 hover:text-red-700'}`}
                                                            title={(formValues[field.id] || []).length <= (field.min_rows || 0) ? `Minimum ${field.min_rows} rows required` : 'Remove this row'}>
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
                            <button type="button" onClick={() => addGridRow(field.id, field.columns)}
                                className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
                                title={`Add Row (${(formValues[field.id] || []).length}/${field.maxRows || '∞'})`}>
                                Add Row {field.maxRows ? `(${(formValues[field.id] || []).length}/${field.maxRows})` : ''}
                            </button>
                        )}
                    </div>
                );
            }

            case "questionGrid": {
                const colorScheme = getTableColor(field.id);
                return (
                    <div key={field.id} className={`mb-4 ${field.width || "w-full"}`} style={{ fontSize: `${fontSize}px` }}>
                        <div className={`overflow-x-auto border-2 ${colorScheme.border} rounded-lg`}>
                            <table className="min-w-full bg-white">
                                <thead>
                                    <tr>
                                        <td colSpan={field.columns.length + (field.allowAddRows === true ? 1 : 0)} className={`${colorScheme.titleBg} py-2 px-4 border-b ${colorScheme.border}`}>
                                            <label className="block text-gray-700 text-sm font-bold">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
                                        </td>
                                    </tr>
                                </thead>
                                <thead className={colorScheme.bg}>
                                    <tr>
                                        {field.columns.map((col, idx) => (
                                            <th key={idx} className={`py-3 px-4 border-b ${colorScheme.border} text-left font-bold text-gray-700 text-sm`} style={{ width: col.width || "auto" }}>
                                                {col.label || col.name}{col.required && <span className="text-red-500 ml-1">*</span>}
                                            </th>
                                        ))}
                                        {field.allowAddRows === true && <th className={`py-3 px-4 border-b ${colorScheme.border} text-center font-bold text-gray-700 text-sm w-24`}>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(formValues[field.id] || []).map((row, rowIndex) => (
                                        <tr key={rowIndex} className={`border-b border-gray-200 ${colorScheme.hover}`}>
                                            {field.columns.map((col, colIdx) => (
                                                <td key={colIdx} className="py-2 px-4 border-b border-gray-200" style={{ width: col.width || "auto" }}>
                                                    {col.type === "serialNumber" && (
                                                        <div className="px-2 py-1 text-center font-medium text-gray-700 bg-gray-50 rounded">{rowIndex + 1}</div>
                                                    )}
                                                    {col.type === "fixedValue" && (
                                                        <div className="px-2 py-1 font-medium text-gray-700 bg-blue-50 rounded border border-blue-200">{row[col.name] || col.labelText || ""}</div>
                                                    )}
                                                    {(col.fixed === true || col.name === "question") && col.type === "textbox" && (
                                                        field.allowEditQuestions === false
                                                            ? <div className="px-3 py-2 bg-yellow-50 rounded border border-yellow-300"><span className="text-gray-800 font-medium">{row[col.name] || ""}</span></div>
                                                            : <input type="text" value={row[col.name] || ""} onChange={(e) => handleGridChange(field.id, rowIndex, col.name, e.target.value)} placeholder="Enter question..." className="border rounded px-2 py-1 w-full" required={col.required} />
                                                    )}
                                                    {col.fixed !== true && col.name !== "question" && col.type === "textbox" && (
                                                        col.disable
                                                            ? <div className="px-2 py-1 bg-gray-50 rounded border text-gray-700">{row[col.name] || col.labelText || ""}</div>
                                                            : <input type="text" value={row[col.name] || ""} onChange={(e) => handleGridChange(field.id, rowIndex, col.name, e.target.value)} placeholder="Enter text..." className="border rounded px-2 py-1 w-full" required={col.required} disabled={col.disable} />
                                                    )}
                                                    {col.type === "numeric" && (
                                                        <input type="number" value={row[col.name] || ""} onChange={(e) => handleGridChange(field.id, rowIndex, col.name, e.target.value)} min={col.min} max={col.max} step={col.decimal ? "0.01" : "1"} placeholder="Enter number..." className="border rounded px-2 py-1 w-full" required={col.required} disabled={col.disable} />
                                                    )}
                                                    {col.type === "signature" && (
                                                        <div className="flex flex-col items-center gap-1">
                                                            {row[col.name] ? <img src={row[col.name]} alt="signature" className="h-16 border rounded" /> : <span className="text-gray-400 text-xs">No Signature</span>}
                                                            <button type="button" className="text-blue-600 text-xs underline" onClick={() => { setActiveSignature({ fieldId: field.id, rowIndex, colName: col.name }); setShowSignatureModal(true); }}>
                                                                {row[col.name] ? "Edit" : "Sign"}
                                                            </button>
                                                        </div>
                                                    )}
                                                    {col.type === "dropdown" && (
                                                        <select value={row[col.name] || ""} onChange={(e) => handleGridChange(field.id, rowIndex, col.name, e.target.value)} className="border rounded px-2 py-1 w-full text-sm" required={col.required} disabled={col.disable}>
                                                            <option value="">Select...</option>
                                                            {(col.options || []).map((option, optIdx) => <option key={optIdx} value={option}>{option}</option>)}
                                                        </select>
                                                    )}
                                                    {col.type === "checkbox" && (
                                                        <div className="flex justify-center">
                                                            <input type="checkbox" checked={row[col.name] === true || row[col.name] === "true"} onChange={(e) => handleGridChange(field.id, rowIndex, col.name, e.target.checked)} disabled={col.disable} className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                                        </div>
                                                    )}
                                                    {col.type === "date" && (
                                                        <DatePicker selected={row[col.name] ? new Date(row[col.name]) : null} onChange={(date) => handleGridChange(field.id, rowIndex, col.name, date)} dateFormat="dd/MM/yyyy" placeholderText="Select date" className="border rounded px-2 py-1 w-full" required={col.required} disabled={col.disable} />
                                                    )}
                                                    {col.type === "time" && (
                                                        <input type="time" value={row[col.name] || ""} onChange={(e) => handleGridChange(field.id, rowIndex, col.name, e.target.value)} className="border rounded px-2 py-1 w-full" required={col.required} disabled={col.disable} />
                                                    )}
                                                </td>
                                            ))}
                                            {field.allowAddRows === true && (
                                                <td className="py-2 px-4 border-b border-gray-200 text-center">
                                                    <button type="button" onClick={() => removeGridRow(field.id, rowIndex)}
                                                        disabled={(formValues[field.id] || []).length <= (field.minRows || 1)}
                                                        className={`${(formValues[field.id] || []).length <= (field.minRows || 1) ? "text-gray-400 cursor-not-allowed" : "text-red-500 hover:text-red-700"} text-sm font-medium`}>
                                                        Remove
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {field.allowAddRows === true && (formValues[field.id] || []).length < (field.maxRows || Infinity) && (
                            <button type="button" onClick={() => addGridRow(field.id, field.columns)} className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm">
                                Add Question ({(formValues[field.id] || []).length}/{field.maxRows || "∞"})
                            </button>
                        )}
                        {formErrors[field.id] && <span className="text-red-500 text-xs mt-1">{formErrors[field.id]}</span>}
                    </div>
                );
            }

            default:
                return null;
        }
    };

    // ─── Render states ────────────────────────────────────────────────────────

    if (loading) return <LoadingDots />;

    if (error) return <div className="text-red-500 p-6">Error: {error}</div>;

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="bg-white border border-green-200 rounded-xl p-8 max-w-md w-full text-center shadow-sm">
                    <div className="text-green-500 text-4xl mb-3">✅</div>
                    <h2 className="text-lg font-semibold text-gray-800 mb-2">Form Submitted!</h2>
                    <p className="text-gray-500 text-sm">Your section has been completed and submitted for approval.</p>
                </div>
            </div>
        );
    }

    if (!formData) return <div>No form data available</div>;

    // ─── Main render — same structure as DynamicForm ──────────────────────────
    return (
        <div className="max-w-1xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            {renderImageGallery()}
            <h1 className="text-2xl font-bold mb-4">{formData.name}</h1>

            {/* Info banner for recipient */}
            <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 text-blue-700 p-3 rounded text-sm flex items-center gap-2">
                <span>📋</span>
                <span>Fields marked <strong>🔒</strong> were filled by the sender and cannot be changed. Please complete your assigned fields below.</span>
            </div>

            <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-medium">Font size:</span>
                <button onClick={() => setFontSize((size) => Math.max(10, size - 1))} className="px-2 py-1 border rounded">A-</button>
                <button onClick={() => setFontSize(16)} className="px-2 py-1 border rounded">Reset</button>
                <button onClick={() => setFontSize((size) => Math.min(32, size + 1))} className="px-2 py-1 border rounded">A+</button>
            </div>

            {submitted && Object.keys(formErrors).length > 0 && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                    <p>Please fix the errors above before submitting.</p>
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

                    <div className="mt-8 flex flex-wrap items-center gap-4">
                        <button type="submit" disabled={submitting}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 px-6 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2">
                            {submitting && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
                            {submitting ? "Submitting…" : "Submit"}
                        </button>
                    </div>
                </div>
            </form>

            {renderImageModal()}

            {/* Signature Modal — exact copy from DynamicForm */}
            {showSignatureModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-4 w-[400px]">
                        <h2 className="text-lg font-semibold mb-2">Sign Below</h2>
                        <div className="border">
                            <SignatureCanvas ref={signaturePadRef} penColor="black" canvasProps={{ width: 360, height: 180, className: "w-full" }} />
                        </div>
                        <div className="flex justify-between mt-3">
                            <button onClick={() => signaturePadRef.current.clear()} className="text-gray-600">Clear</button>
                            <div className="flex gap-2">
                                <button onClick={() => setShowSignatureModal(false)} className="px-3 py-1 border rounded">Cancel</button>
                                <button onClick={() => {
                                    const dataUrl = signaturePadRef.current.toDataURL();
                                    handleGridChange(activeSignature.fieldId, activeSignature.rowIndex, activeSignature.colName, dataUrl);
                                    setShowSignatureModal(false);
                                }} className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}