import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function ReportDesigner() {
    const [forms, setForms] = useState([]);
    const [selectedForm, setSelectedForm] = useState(null);
    const [fields, setFields] = useState([]);
    const [selectedFields, setSelectedFields] = useState([]);
    const [filters, setFilters] = useState([]);
    const [templateName, setTemplateName] = useState('');
    const [includeApprovals, setIncludeApprovals] = useState(true);
    const [includeRemarks, setIncludeRemarks] = useState(false);

    useEffect(() => {
        fetch('/api/forms')
            .then(res => res.json())
            .then(data => setForms(data));
    }, []);

    useEffect(() => {
        if (selectedForm) {
            fetch(`/api/forms/${selectedForm}/fields`)
                .then(res => res.json())
                .then(data => setFields(data));
        }
    }, [selectedForm]);

    const toggleField = (fieldLabel) => {
        setSelectedFields(prev =>
            prev.includes(fieldLabel)
                ? prev.filter(f => f !== fieldLabel)
                : [...prev, fieldLabel]
        );
    };

    const addFilter = () => setFilters([...filters, { field: '', operator: '=', value: '' }]);

    const updateFilter = (index, key, value) => {
        const updated = [...filters];
        updated[index][key] = value;
        setFilters(updated);
    };

    const saveTemplate = () => {
        const payload = {
            name: templateName,
            formId: selectedForm,
            fields: selectedFields.map((f, i) => ({ fieldLabel: f, order: i })),
            filters,
            includeApprovals,
            includeRemarks
        };

        fetch('/api/reports/template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => alert('Template saved successfully!'));
    };

    return (
        <motion.div className="p-6 space-y-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold">Report Designer</h1>

            <div className="space-y-2">
                <label className="block font-medium">Select Form</label>
                <select onChange={(e) => setSelectedForm(e.target.value)} className="p-2 border rounded w-full">
                    <option value="">-- Select --</option>
                    {forms.map(form => (
                        <option key={form.id} value={form.id}>{form.name}</option>
                    ))}
                </select>
            </div>

            <hr className="my-6" />

            {fields.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h2 className="text-xl font-semibold mb-2">Available Fields</h2>
                        {fields.map(f => (
                            <div key={f.label} className="flex items-center space-x-2">
                                <input type="checkbox" checked={selectedFields.includes(f.label)} onChange={() => toggleField(f.label)} />
                                <label>{f.label}</label>
                            </div>
                        ))}
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold mb-2">Filters</h2>
                        {filters.map((f, i) => (
                            <div key={i} className="flex space-x-2 mb-2">
                                <input className="p-2 border rounded w-full" placeholder="Field" value={f.field} onChange={e => updateFilter(i, 'field', e.target.value)} />
                                <input className="p-2 border rounded w-full" placeholder="Operator" value={f.operator} onChange={e => updateFilter(i, 'operator', e.target.value)} />
                                <input className="p-2 border rounded w-full" placeholder="Value" value={f.value} onChange={e => updateFilter(i, 'value', e.target.value)} />
                            </div>
                        ))}
                        <button onClick={addFilter} className="px-4 py-2 bg-blue-600 text-white rounded">Add Filter</button>
                    </div>
                </div>
            )}

            <hr className="my-6" />

            <div className="space-y-2">
                <label className="block font-medium">Template Name</label>
                <input className="p-2 border rounded w-full" value={templateName} onChange={e => setTemplateName(e.target.value)} />
                <div className="flex items-center space-x-4 mt-2">
                    <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={includeApprovals} onChange={e => setIncludeApprovals(e.target.checked)} />
                        <span>Include Approvals</span>
                    </label>
                    <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={includeRemarks} onChange={e => setIncludeRemarks(e.target.checked)} />
                        <span>Include Remarks</span>
                    </label>
                </div>
            </div>

            <button className="mt-4 px-6 py-2 bg-green-600 text-white rounded" onClick={saveTemplate}>Save Report Template</button>
        </motion.div>
    );
}
