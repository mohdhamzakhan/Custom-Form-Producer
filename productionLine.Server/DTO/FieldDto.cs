﻿using System.ComponentModel.DataAnnotations.Schema;

namespace productionLine.Server.DTO
{
    public class FieldDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Type { get; set; }
        public string Label { get; set; }
        public List<string>? Options { get; set; }
        public bool Required { get; set; }
        public string Width { get; set; }
        public List<string>? RequireRemarks { get; set; }
        public bool? IsDecimal { get; set; }
        public double? Max { get; set; }
        public double? Min { get; set; }
        public List<RemarkTriggerDto> RemarkTriggers { get; set; } = new();
        public string? Formula { get; set; }
        public bool? ResultDecimal { get; set; }
        public string? FieldReferencesJson { get; set; }
        public List<GridColumnDto> Column { get; set; }
        public int? MinRows { get; set; }
        public int? MaxRows { get; set; }
        public int? InitialRows { get; set; }

    }
}
