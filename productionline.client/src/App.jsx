import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import MainPage from "./components/MainPage";
import FormSubmissionReport from "./components/FormSubmissionReport";
import SubmissionDetail from "./components/SubmissionDetails"; // Assuming you have this component
import FormBuilder from "./components/FormBuilder";
import DynamicForm from "./components/DynamicForm";
import ApprovalPage from "./components/Approval";

// Protected route component
const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem("meaiFormToken");
    const location = useLocation();

    if (!token) {
        //return <Navigate to="/login" replace />;
        return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;

    }
    return children;
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                    path="/Mainpage"
                    element={
                        <ProtectedRoute>
                            <MainPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/form/:formId"
                    element={
                        <ProtectedRoute>        
                            <DynamicForm />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/reports"
                    element={
                        <ProtectedRoute>
                            <FormSubmissionReport />
                        </ProtectedRoute>
                    }
                />
                <Route path="/submissions/:submissionId/approve" element={<ApprovalPage />} /> {/* <-- Add this */}
                <Route
                    path="/submissions/:submissionId"
                    element={
                        <ProtectedRoute>
                            <SubmissionDetail />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/formBuilder"
                    element={
                        <ProtectedRoute>
                            <FormBuilder />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/"
                    element={<Navigate to="/login" replace />}
                />
            </Routes>
        </Router>
    );
}

export default App;