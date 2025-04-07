import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import FormBuilder from "./components/FormBuilder";
import FormRenderer from "./components/FormRenderer";
import DynamicForm from "./components/DynamicForm";
import SubmissionDetails from "./components/SubmissionDetails";
import FormSubmissionReport from "./components/FormSubmissionReport";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<FormBuilder />} />
                <Route path="/form/:formId" element={<DynamicForm />} />
                <Route path="/submissions/:submissionId" element={<SubmissionDetails />} />
                <Route path="/forms/reports" element={<FormSubmissionReport />} />

            </Routes>
        </Router>
    );
}

export default App;
