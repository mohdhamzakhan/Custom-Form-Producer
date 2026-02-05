import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { APP_CONSTANTS } from "./store";
import LoadingDots from './LoadingDots';
export default function SubmissionDetails() {
    const { submissionId } = useParams();
    const navigate = useNavigate();

    const [submission, setSubmission] = useState(null);
    const [formDefinition, setFormDefinition] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch submission data on component mount
    useEffect(() => {
        const fetchSubmissionDetails = async () => {
            try {
                const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms/submissions/${submissionId}`);
                if (!response.ok) throw new Error("Failed to fetch submission details");
                const data = await response.json();
                setSubmission(data.submission);
                setFormDefinition(data.formDefinition);
                setLoading(false);
            } catch (err) {
                setError(err.message || "Failed to load submission details");
                setLoading(false);
            }
        };

        fetchSubmissionDetails();
    }, [submissionId]);


    const getFieldLabel = (fieldId) => {
        if (!formDefinition || !formDefinition.fields) return fieldId; // fallback to ID if not found

        const field = formDefinition.fields.find(f => f.id === fieldId);
        return field ? field.label : fieldId; // if field is found, return label; else fallback to ID
    };

    // Group submission data to combine values with remarks
    // Group submission data to combine values with remarks
    const processSubmissionData = () => {
        if (!submission || !submission.submissionData) return [];

        const processedData = {};

        submission.submissionData.forEach(item => {
            const originalField = getFieldLabel(item.fieldLabel.replace(' Remark', '').replace(' (Remark)', ''));

            if (item.fieldLabel.includes('Remark') || item.fieldLabel.includes('(Remark)')) {
                if (!processedData[originalField]) {
                    processedData[originalField] = { value: '', remark: item.fieldValue };
                } else {
                    processedData[originalField].remark = item.fieldValue;
                }
            } else {
                if (!processedData[originalField]) {
                    processedData[originalField] = { value: item.fieldValue, remark: '' };
                } else {
                    processedData[originalField].value = item.fieldValue;
                }
            }
        });

        return Object.entries(processedData).map(([label, data]) => ({
            label,
            value: data.value,
            remark: data.remark
        }));
    };

    // Check if value is a base64 image (signature)
    // Check if value is a base64 image (signature) - MOVED FIRST
    const isBase64Image = (value) => {
        console.log('🔍 Checking image:', value?.substring(0, 50) + '...'); // DEBUG
        if (!value || typeof value !== 'string') return false;
        const isImage = value.startsWith('data:image/png;base64,') ||
            value.startsWith('data:image/jpeg;base64,') ||
            value.startsWith('data:image/jpg;base64,');
        console.log('✅ Is base64 image?', isImage); // DEBUG
        return isImage;
    };

    const isGridValue = (value) => {
        console.log('🔍 Checking grid:', value?.substring(0, 50) + '...');

        if (!value || typeof value !== 'string') return false;

        try {
            const parsed = JSON.parse(value);

            // Check if it's a proper grid OR contains base64 images inside cells
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Check first row for image cells or object structure
                const firstRow = parsed[0];
                if (typeof firstRow === 'object') {
                    // Check if any cell contains base64 image
                    const hasImageCell = Object.values(firstRow).some(cell =>
                        isBase64Image(cell)
                    );
                    console.log('✅ Grid detected with image cells:', hasImageCell);
                    return true;
                }
            }
            return false;
        } catch {
            console.log('❌ Not valid JSON');
            return false;
        }
    };



    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    // Go back to the reports page
    const handleGoBack = () => {
        navigate(-1);
    };

    // Print submission details
    const handlePrint = () => {
        window.print();
    };

    if (loading) return <LoadingDots />;


    if (error) {
        return <div className="text-red-500 text-center">{error}</div>;
    }

    if (!submission) {
        return <div className="text-center">Submission not found</div>;
    }

    //const isGridValue = (value) => {
    //    console.log(value)
    //    try {
    //        const parsed = JSON.parse(value);
    //        return Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object';
    //    } catch {
    //        return false;
    //    }
    //};

    const getGridColumns = (gridData) => {
        if (!gridData || gridData.length === 0) return [];

        // Get all unique column names from all rows
        const columnSet = new Set();
        gridData.forEach(row => {
            Object.keys(row).forEach(key => columnSet.add(key));
        });

        return Array.from(columnSet);
    };


    const processedData = processSubmissionData();

    return (
        <div className="max-w-1xl mx-auto p-6"> {/* FIXED: max-w-1xl → max-w-4xl */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Submission Details</h1>
                <div>
                    <button
                        onClick={handleGoBack}
                        className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mr-2"
                    >
                        Back
                    </button>
                    <button
                        onClick={handlePrint}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Print
                    </button>
                </div>
            </div>

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <p className="text-sm text-gray-600">Submission ID</p>
                        <p className="font-semibold">{submission.id}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Submitted At</p>
                        <p className="font-semibold">{formatDate(submission.submittedAt)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Form</p>
                        <p className="font-semibold">{formDefinition?.name || 'Unknown Form'}</p>
                    </div>
                </div>

                <h2 className="text-xl font-semibold mb-4">Submitted Data</h2>

                {processedData.map((item, index) => (
                    <div key={index} className="border-b pb-6 mb-6 last:border-b-0 last:mb-0">
                        <div className="flex flex-col space-y-3">
                            <div className="w-full">
                                <p className="text-sm text-gray-600 mb-2 font-medium">{item.label}</p>

                                {/* ✅ FIXED: Check IMAGE FIRST, then GRID, then TEXT */}
                                {isBase64Image(item.value) ? (
                                    <div className="border-2 border-blue-200 rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                                        <img
                                            src={item.value}
                                            alt="Signature"
                                            className="w-full h-auto max-h-96 object-contain rounded-lg shadow-lg mx-auto block"
                                            onError={(e) => {
                                                console.error('Image failed to load:', e);
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                        <p className="text-xs text-blue-600 mt-2 text-center font-medium">
                                            ✓ Signature/Image
                                        </p>
                                    </div>
                                ) : isGridValue(item.value) ? (
                                    <div className="w-full overflow-x-auto border border-gray-300 rounded-lg shadow-sm p-4">
                                        {(() => {
                                            try {
                                                const gridData = JSON.parse(item.value);
                                                const columns = getGridColumns(gridData);
                                                console.log('📊 Grid columns found:', columns); // DEBUG

                                                return (
                                                    <table className="w-full text-sm text-left min-w-[600px]">
                                                        <thead className="bg-gray-100 sticky top-0">
                                                            <tr>
                                                                {columns.map((col, idx) => (
                                                                    <th
                                                                        key={idx}
                                                                        className="px-6 py-3 border-b border-r font-semibold text-gray-700 text-left whitespace-nowrap"
                                                                    >
                                                                        {col}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {gridData.map((row, rIdx) => (
                                                                <tr key={rIdx} className="border-b hover:bg-gray-50">
                                                                    {columns.map((col, cIdx) => {
                                                                        let cellValue = row[col];

                                                                        // ✅ RENDER IMAGES IN GRID CELLS
                                                                        if (isBase64Image(cellValue)) {
                                                                            return (
                                                                                <td key={cIdx} className="px-6 py-4 border-r">
                                                                                    <div className="max-w-xs mx-auto">
                                                                                        <img
                                                                                            src={cellValue}
                                                                                            alt="Signature"
                                                                                            className="w-full h-24 object-contain rounded-lg shadow-md"
                                                                                            onError={(e) => {
                                                                                                e.target.style.display = 'none';
                                                                                                e.target.nextSibling.style.display = 'block';
                                                                                            }}
                                                                                        />
                                                                                        <div className="text-xs text-gray-500 text-center mt-1 hidden">
                                                                                            Image failed to load
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        }

                                                                        return (
                                                                            <td key={cIdx} className="px-6 py-4 border-r max-w-md">
                                                                                <div className="break-words max-h-20 overflow-y-auto">
                                                                                    {cellValue !== undefined && cellValue !== null
                                                                                        ? (typeof cellValue === 'boolean'
                                                                                            ? <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{String(cellValue)}</span>
                                                                                            : String(cellValue)
                                                                                        )
                                                                                        : <span className="text-gray-400">—</span>
                                                                                    }
                                                                                </div>
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                );
                                            } catch (error) {
                                                console.error('Grid parse error:', error);
                                                return <div className="p-4 text-red-500">Invalid grid data: {error.message}</div>;
                                            }
                                        })()}
                                    </div>
                                ) : (
                                    <div className="font-semibold text-lg p-4 bg-gray-50 border rounded-lg break-words min-h-[3rem] flex items-center">
                                        {typeof item.value === 'boolean'
                                            ? <span className={`px-3 py-1 rounded-full text-sm font-bold ${item.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {item.value ? 'Yes' : 'No'}
                                            </span>
                                            : item.value || <span className="text-gray-400">—</span>
                                        }
                                    </div>
                                )}
                            </div>

                            {/* Remark Display */}
                            {item.remark && item.remark.trim() !== '' && (
                                <div className="w-full bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm">
                                    <p className="text-sm font-medium text-yellow-800 mb-2">Remark</p>
                                    <p className="text-gray-700 break-words whitespace-pre-wrap text-sm">{item.remark}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
