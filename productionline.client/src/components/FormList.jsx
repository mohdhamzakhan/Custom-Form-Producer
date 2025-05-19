import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {APP_CONSTANTS} from "./store";

const FormList = () => {
    const [forms, setForms] = useState([]);

    useEffect(() => {
        const fetchForms = async () => {
            const response = await fetch(`${APP_CONSTANTS.API_BASE_URL}/api/forms`);
            const data = await response.json();
            setForms(data);
        };

        fetchForms();
    }, []);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Saved Forms</h1>
            {forms.length === 0 ? (
                <p>No forms available.</p>
            ) : (
                <div className="space-y-4">
                    {forms.map(form => (
                        <div key={form.id} className="p-4 border rounded bg-white flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-semibold">{form.name}</h2>
                                <p className="text-gray-500 text-sm">{form.formLink}</p>
                            </div>
                            <Link
                                to={`/form-builder/${form.formLink}/edit`} // 👈 open in 

                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                            >
                                Edit
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FormList;
