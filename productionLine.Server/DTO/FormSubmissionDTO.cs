﻿namespace productionLine.Server.DTO
{
    public class FormSubmissionDTO
    {
        public int FormId { get; set; }
        public List<FormSubmissionDataDTO> SubmissionData { get; set; } = new List<FormSubmissionDataDTO>();
    }
}
