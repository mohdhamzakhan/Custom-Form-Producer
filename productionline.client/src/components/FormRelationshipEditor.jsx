import React, { useEffect, useState, useCallback, useRef } from "react";
import { ChevronRight, ChevronDown, Users, Download, BarChart3, FileText, Plus, X, Search, User, UserCheck, Copy, Link } from "lucide-react";
import { toast } from 'react-toastify';
const FormRelationshipEditor = ({ selectedForms, forms, formFieldMappings, relationships, setRelationships }) => {
    const [showRelationshipModal, setShowRelationshipModal] = useState(false);
    const [currentRelationship, setCurrentRelationship] = useState({
        id: null,
        sourceFormId: null,
        targetFormId: null,
        sourceFieldId: null,
        targetFieldId: null,
        type: 'one-to-many' // one-to-one, one-to-many, many-to-many
    });

    const addRelationship = () => {
        if (!currentRelationship.sourceFormId || !currentRelationship.targetFormId ||
            !currentRelationship.sourceFieldId || !currentRelationship.targetFieldId) {
            toast.error("Please select all fields");
            return;
        }

        if (currentRelationship.id) {
            // EDIT
            setRelationships(
                relationships.map(r =>
                    r.id === currentRelationship.id ? currentRelationship : r
                )
            );
        } else {
            // ADD
            setRelationships([
                ...relationships,
                { ...currentRelationship, id: Date.now() }
            ]);
        }

        setShowRelationshipModal(false);
    };


    const removeRelationship = (id) => {
        setRelationships(relationships.filter(r => r.id !== id));
        toast.success("Relationship removed");
    };

    const getFormName = (formId) => {
        return forms.find(f => f.id === formId)?.name || `Form ${formId}`;
    };

    const getFieldLabel = (formId, fieldId) => {
        const fields = formFieldMappings[formId]?.fields || [];
        return fields.find(f => f.id === fieldId)?.label || fieldId;
    };

    if (selectedForms.length < 2) {
        return null; // Need at least 2 forms to create relationships
    }

    return (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                    <Link className="w-5 h-5 mr-2 text-blue-600" />
                    Form Relationships ({relationships.length})
                </h3>
                <button
                    onClick={() => setShowRelationshipModal(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center text-sm"
                >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Relationship
                </button>
            </div>

            {/* Existing Relationships */}
            {relationships.length > 0 ? (
                <div className="space-y-3">
                    {relationships.map((rel) => (
                        <div key={rel.id} className="p-4 border rounded-lg bg-blue-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="text-sm">
                                        <span className="font-medium text-blue-800">
                                            {getFormName(rel.sourceFormId)}
                                        </span>
                                        <div className="text-xs text-gray-600">
                                            {getFieldLabel(rel.sourceFormId, rel.sourceFieldId)}
                                        </div>
                                    </div>
                                    <div className="text-gray-400">
                                        {rel.type === 'one-to-one' && '⟷'}
                                        {rel.type === 'one-to-many' && '→'}
                                        {rel.type === 'many-to-many' && '⟷⟷'}
                                    </div>
                                    <div className="text-sm">
                                        <span className="font-medium text-green-800">
                                            {getFormName(rel.targetFormId)}
                                        </span>
                                        <div className="text-xs text-gray-600">
                                            {getFieldLabel(rel.targetFormId, rel.targetFieldId)}
                                        </div>
                                    </div>
                                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                                        {rel.type.replace('-', ' ')}
                                    </span>
                                </div>
                                <button
                                    onClick={() => removeRelationship(rel.id)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    <Link className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No relationships defined</p>
                    <p className="text-xs">Add relationships to link forms by common fields</p>
                </div>
            )}

            {/* Relationship Modal */}
            {showRelationshipModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">Define Form Relationship</h3>
                            <button
                                onClick={() => setShowRelationshipModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Source Form */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Source Form (Primary Key)</label>
                                <select
                                    value={currentRelationship.sourceFormId || ''}
                                    onChange={(e) => setCurrentRelationship({
                                        ...currentRelationship,
                                        sourceFormId: parseInt(e.target.value),
                                        sourceFieldId: null
                                    })}
                                    className="w-full border p-2 rounded"
                                >
                                    <option value="">Select form...</option>
                                    {selectedForms.map(formId => (
                                        <option key={formId} value={formId}>
                                            {getFormName(formId)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Source Field */}
                            {currentRelationship.sourceFormId && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Source Field (ID/Key)</label>
                                    <select
                                        value={currentRelationship.sourceFieldId || ''}
                                        onChange={(e) => setCurrentRelationship({
                                            ...currentRelationship,
                                            sourceFieldId: e.target.value
                                        })}
                                        className="w-full border p-2 rounded"
                                    >
                                        <option value="">Select field...</option>
                                        {(formFieldMappings[currentRelationship.sourceFormId]?.fields || []).map(field => (
                                            <option key={field.id} value={field.id}>
                                                {field.label} ({field.type})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Relationship Type */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Relationship Type</label>
                                <select
                                    value={currentRelationship.type}
                                    onChange={(e) => setCurrentRelationship({
                                        ...currentRelationship,
                                        type: e.target.value
                                    })}
                                    className="w-full border p-2 rounded"
                                >
                                    <option value="one-to-one">One to One (1:1)</option>
                                    <option value="one-to-many">One to Many (1:N)</option>
                                    <option value="many-to-many">Many to Many (N:M)</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {currentRelationship.type === 'one-to-one' && 'Each record in source matches exactly one in target'}
                                    {currentRelationship.type === 'one-to-many' && 'Each record in source can match multiple in target'}
                                    {currentRelationship.type === 'many-to-many' && 'Records can have multiple matches in both directions'}
                                </p>
                            </div>

                            {/* Target Form */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Target Form (Foreign Key)</label>
                                <select
                                    value={currentRelationship.targetFormId || ''}
                                    onChange={(e) => setCurrentRelationship({
                                        ...currentRelationship,
                                        targetFormId: parseInt(e.target.value),
                                        targetFieldId: null
                                    })}
                                    className="w-full border p-2 rounded"
                                >
                                    <option value="">Select form...</option>
                                    {selectedForms
                                        .filter(formId => formId !== currentRelationship.sourceFormId)
                                        .map(formId => (
                                            <option key={formId} value={formId}>
                                                {getFormName(formId)}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* Target Field */}
                            {currentRelationship.targetFormId && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Target Field (Reference)</label>
                                    <select
                                        value={currentRelationship.targetFieldId || ''}
                                        onChange={(e) => setCurrentRelationship({
                                            ...currentRelationship,
                                            targetFieldId: e.target.value
                                        })}
                                        className="w-full border p-2 rounded"
                                    >
                                        <option value="">Select field...</option>
                                        {(formFieldMappings[currentRelationship.targetFormId]?.fields || []).map(field => (
                                            <option key={field.id} value={field.id}>
                                                {field.label} ({field.type})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Example */}
                            {currentRelationship.sourceFormId && currentRelationship.targetFormId && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                    <p className="text-sm font-medium mb-1">Example:</p>
                                    <p className="text-xs text-gray-700">
                                        {getFormName(currentRelationship.sourceFormId)}
                                        {currentRelationship.sourceFieldId && ` (${getFieldLabel(currentRelationship.sourceFormId, currentRelationship.sourceFieldId)})`}
                                        <span className="mx-2">→</span>
                                        {getFormName(currentRelationship.targetFormId)}
                                        {currentRelationship.targetFieldId && ` (${getFieldLabel(currentRelationship.targetFormId, currentRelationship.targetFieldId)})`}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowRelationshipModal(false)}
                                className="px-4 py-2 border rounded hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={addRelationship}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Add Relationship
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormRelationshipEditor;