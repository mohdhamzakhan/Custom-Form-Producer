import axios from "axios";
import {APP_CONSTANTS} from "./store";

const API_URL = `${APP_CONSTANTS.API_BASE_URL}/api/forms`; // Adjust if needed

export const createForm = async (formData) => {
  return await axios.post(API_URL, formData);
};

export const getFormByLink = async (formLink) => {
  return await axios.get(`${API_URL}/link/${formLink}`);
};

export const submitFormData = async (formId, submissionData) => {
  return await axios.post(`${API_URL}/${formId}/submit`, submissionData);
};
