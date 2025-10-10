import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import MainPage from "./components/MainPage";
import FormSubmissionReport from "./components/FormSubmissionReport";
import SubmissionDetail from "./components/SubmissionDetails"; // Assuming you have this component
import FormBuilder from "./components/FormBuilder";
import DynamicForm from "./components/DynamicForm";
import ApprovalPage from "./components/Approval";
import ReportPage from "./components/ReportPage"; // Assuming you have this component
import ReportsList from "./components/ReportList";
import ReportViewer from "./components/ReportViewer";
import ReportDesigner from "./components/ReportDesigner";
import MyForms from "./components/MyForms";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


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
        <>
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
                        path="/ProductionReport"
                        element={
                            <ProtectedRoute>
                                <ReportPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/form/:formId" element={<DynamicForm />} />

                    <Route
                        path="/form/:formId/:submissionID"
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
                    <Route path="/submissions/:submissionId/approve" element={<ApprovalPage />} />
                    <Route
                        path="/submissions/:submissionId"
                        element={
                            <ProtectedRoute>
                                <SubmissionDetail />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/formBuilder/:formLink"
                        element={
                            <ProtectedRoute>
                                <FormBuilder />
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
                    <Route path="/report" element={<ReportsList />} />
                    <Route path="/reports/edit/:reportId" element={<ReportDesigner />} />
                    <Route path="/reports/view/:templateId" element={<ReportViewer />} />
                    <Route path="/reports/new" element={<ReportDesigner />} />
                    <Route path="/MyForm" element={<MyForms />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </Router>
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
        </>
    );
}

export default App;