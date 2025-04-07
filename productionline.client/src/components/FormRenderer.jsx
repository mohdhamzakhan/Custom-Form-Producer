import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getFormByLink, submitFormData } from "../services/api";

const FormRenderer = () => {
  const { formLink } = useParams();
  const [form, setForm] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchForm = async () => {
      const data = await getFormByLink(formLink);
      setForm(data);
    };
    fetchForm();
  }, [formLink]);

  const handleChange = (label, value) => {
    setFormData({ ...formData, [label]: value });
  };

  const handleSubmit = async () => {
    await submitFormData(form.id, {
      formId: form.id,
      submissionData: formData,
    });
    alert("Form submitted!");
  };

  if (!form) return <p>Loading...</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">{form.name}</h2>
      {form.fields.map((field, index) => (
        <div key={index} className="mb-4">
          <label className="block font-bold">{field.label}</label>
          {field.type === "text" && (
            <input
              type="text"
              onChange={(e) => handleChange(field.label, e.target.value)}
              className="border p-2 w-full"
            />
          )}
          {field.type === "number" && (
            <input
              type="number"
              onChange={(e) => handleChange(field.label, e.target.value)}
              className="border p-2 w-full"
            />
          )}
          {field.type === "dropdown" && (
            <select
              onChange={(e) => handleChange(field.label, e.target.value)}
              className="border p-2 w-full"
            >
              <option>Select</option>
              {field.options.map((opt, idx) => (
                <option key={idx} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
      <button
        onClick={handleSubmit}
        className="bg-green-500 text-white px-4 py-2"
      >
        Submit
      </button>
    </div>
  );
};

export default FormRenderer;
