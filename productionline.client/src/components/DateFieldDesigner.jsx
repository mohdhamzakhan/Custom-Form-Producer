// DateFieldDesigner.jsx
import React from "react";

const DateFieldDesigner = ({ field, updateField }) => {
    return (
        <div className="mt-3">
            <label className="block text-sm font-medium mb-1">Date Field Settings</label>
            <div className="flex items-center gap-2 mt-2">
                <input
                    type="checkbox"
                    checked={field.showDayInTextbox || false}
                    onChange={(e) => updateField({ showDayInTextbox: e.target.checked })}
                    className="h-4 w-4"
                />
                <label className="text-sm text-gray-700">Show Day in Separate Textbox</label>
            </div>
        </div>
    );
};

export default DateFieldDesigner;
