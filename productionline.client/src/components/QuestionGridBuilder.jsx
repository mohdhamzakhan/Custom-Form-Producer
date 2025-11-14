// Component for building the dynamic question grid
const QuestionGridBuilder = ({ field, onUpdate }) => {
    const [columns, setColumns] = useState([
        { name: "question", label: "Question", type: "textbox", width: "40%" }
    ]);
    const [checkboxOptions, setCheckboxOptions] = useState([]);

    // Add new checkbox option
    const addCheckboxOption = () => {
        const optionName = prompt("Enter checkbox label (e.g., First Name, Last Name):");
        if (optionName) {
            const newColumn = {
                name: optionName.toLowerCase().replace(/\s+/g, ''),
                label: optionName,
                type: "checkbox",
                width: "15%"
            };

            setColumns([...columns, newColumn]);
            setCheckboxOptions([...checkboxOptions, newColumn]);

            // Update parent field configuration
            onUpdate({
                ...field,
                columns: [...columns, newColumn]
            });
        }
    };

    // Remove checkbox option
    const removeCheckboxOption = (columnName) => {
        const updatedColumns = columns.filter(col => col.name !== columnName);
        setColumns(updatedColumns);
        setCheckboxOptions(checkboxOptions.filter(opt => opt.name !== columnName));

        onUpdate({
            ...field,
            columns: updatedColumns
        });
    };

    return (
        <div className="border p-4 rounded">
            <h3 className="font-bold mb-3">Configure Question Grid</h3>

            <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Checkbox Options:</label>
                <div className="flex flex-wrap gap-2">
                    {checkboxOptions.map((option, idx) => (
                        <div key={idx} className="flex items-center bg-blue-100 px-3 py-1 rounded">
                            <span>{option.label}</span>
                            <button
                                onClick={() => removeCheckboxOption(option.name)}
                                className="ml-2 text-red-500 hover:text-red-700"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
                <button
                    onClick={addCheckboxOption}
                    className="mt-2 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                >
                    + Add Checkbox Option
                </button>
            </div>

            <div className="mt-4">
                <label className="block text-sm font-semibold mb-1">Min Rows:</label>
                <input
                    type="number"
                    value={field.minRows || 1}
                    onChange={(e) => onUpdate({ ...field, minRows: parseInt(e.target.value) })}
                    className="border rounded px-2 py-1 w-20"
                />
            </div>

            <div className="mt-2">
                <label className="block text-sm font-semibold mb-1">Max Rows:</label>
                <input
                    type="number"
                    value={field.maxRows || 10}
                    onChange={(e) => onUpdate({ ...field, maxRows: parseInt(e.target.value) })}
                    className="border rounded px-2 py-1 w-20"
                />
            </div>
        </div>
    );
};
