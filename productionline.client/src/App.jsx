import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import MainPage from "./components/MainPage";
import FormSubmissionReport from "./components/FormSubmissionReport";
import SubmissionDetail from "./components/SubmissionDetail"; // Assuming you have this component

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
                    path="/reports"
                    element={
                        <ProtectedRoute>
                            <FormSubmissionReport />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/submissions/:submissionId"
                    element={
                        <ProtectedRoute>
                            <SubmissionDetail />
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