using System.Text.Json.Serialization;

namespace productionLine.Server.DTO
{
    public class GridColumnDto
    {
        public string Id { get; set; }

        public string Name { get; set; }


        public string Type { get; set; }

        public string Width { get; set; }

        public List<string>? Options { get; set; }


        public double? Min { get; set; }


        public double? Max { get; set; }


        public bool? Decimal { get; set; }

        public string? Formula { get; set; }

        public string? textColor { get; set; }

        public string? backgroundColor { get; set; }
    }
}
