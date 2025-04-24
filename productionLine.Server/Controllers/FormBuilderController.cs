using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using productionLine.Server.DTO;
using productionLine.Server.Model;
using System.Threading.Tasks;

namespace productionLine.Server.Controllers
{
    [Route("api/form-builder")]
    [ApiController]
    public class FormBuilderController : ControllerBase
    {
        private readonly FormDbContext _context;

        public FormBuilderController(FormDbContext context)
        {
            _context = context;
        }

        // ✅ Save or Update a form (Create/Update Form Layout)
        //[HttpPost]
        //public async Task<IActionResult> SaveForm([FromBody] Form form)
        //{
        //    if (form == null)
        //        return BadRequest("Form is null.");

        //    if (form.Id > 0)
        //    {
        //        // Update Existing Form
        //        var existingForm = await _context.Forms
        //            .Include(f => f.Fields)
        //            .Include(f => f.Approvers)
        //            .FirstOrDefaultAsync(f => f.Id == form.Id);

        //        if (existingForm == null)
        //            return NotFound("Form not found.");

        //        existingForm.Name = form.Name;
        //        existingForm.FormLink = form.FormLink;

        //        _context.FormFields.RemoveRange(existingForm.Fields);
        //        _context.FormApprovers.RemoveRange(existingForm.Approvers);

        //        existingForm.Fields = form.Fields;
        //        existingForm.Approvers = form.Approvers;



        //        await _context.SaveChangesAsync();
        //        return Ok(existingForm);
        //    }
        //    else
        //    {
        //        // Create New Form
        //        _context.Forms.Add(form);
        //        await _context.SaveChangesAsync();
        //        return Ok(form);
        //    }
        //}

        [HttpPost]
        public async Task<IActionResult> SaveForm([FromBody] Form form)
        {
            if (form == null)
                return BadRequest("Form is null.");

            if (form.Id > 0)
            {
                // Update Existing Form
                var existingForm = await _context.Forms
                    .Include(f => f.Fields)
                        .ThenInclude(f => f.Columns)
                    .Include(f => f.Fields)
                        .ThenInclude(f => f.RemarkTriggers)
                    .Include(f => f.Approvers)
                    .FirstOrDefaultAsync(f => f.Id == form.Id);

                if (existingForm == null)
                    return NotFound("Form not found.");

                existingForm.Name = form.Name;
                existingForm.FormLink = form.FormLink;

                // Remove existing fields and approvers
                _context.FormFields.RemoveRange(existingForm.Fields);
                _context.FormApprovers.RemoveRange(existingForm.Approvers);

                // Reassign fields and approvers, resetting IDs
                foreach (var field in form.Fields)
                {
                    field.Id = Guid.NewGuid(); // Reset field ID
                    field.FormId = existingForm.Id;

                    if (field.Columns != null)
                    {
                        foreach (var col in field.Columns)
                        {
                            col.Id = Guid.NewGuid().ToString(); // Reset column ID
                                                                // No need to set FormFieldId unless explicitly required
                        }
                    }
                }

                foreach (var approver in form.Approvers)
                {
                    approver.Id = 0; // Reset approver ID (assuming int)
                    approver.FormId = existingForm.Id;
                }

                existingForm.Fields = form.Fields;
                existingForm.Approvers = form.Approvers;

                await _context.SaveChangesAsync();
                return Ok(existingForm);
            }
            else
            {
                // Create New Form
                _context.Forms.Add(form);

                // Ensure GUIDs for new fields and columns are initialized
                foreach (var field in form.Fields)
                {
                    if (field.Id == Guid.Empty)
                        field.Id = Guid.NewGuid();

                    if (field.Columns != null)
                    {
                        foreach (var col in field.Columns)
                        {
                            if (col.Id == string.Empty)
                                col.Id = Guid.NewGuid().ToString();
                        }
                    }
                }

                await _context.SaveChangesAsync();
                return Ok(form);
            }
        }



        // ✅ Get a form by link to edit it
        //[HttpGet("{formLink}")]
        //public async Task<IActionResult> GetFormByLink(string formLink)
        //{
        //    var form = await _context.Forms
        //        .Include(f => f.Fields)
        //        .Include(f => f.Approvers)
        //        .FirstOrDefaultAsync(f => f.FormLink == formLink);

        //    if (form == null)
        //        return NotFound("Form not found.");

        //    return Ok(form);
        //}

        // ✅ List all forms (optional if needed)
        [HttpGet]
        public async Task<IActionResult> GetAllForms()
        {
            var forms = await _context.Forms
                .Select(f => new { f.Id, f.Name, f.FormLink })
                .ToListAsync();

            return Ok(forms);
        }

        [HttpGet("link/{formLink}")]
        public async Task<IActionResult> GetFormByLink(string formLink)
        {
            var form = await _context.Forms
                .Include(f => f.Fields) // Load related fields
                                .Include(f => f.Fields.OrderBy(field => field.Order)) // Order by the new field
                .ThenInclude(field => field.RemarkTriggers) // Load RemarkTriggers for each field
                .FirstOrDefaultAsync(f => f.FormLink == formLink);

            if (form == null)
                return NotFound("Form not found.");

            // Map to DTO
            var formDto = new FormDto
            {
                Id = form.Id,
                FormLink = form.FormLink,
                Name = form.Name,
                Fields = form.Fields.Select(f => new FieldDto
                {
                    Id = f.Id,
                    Name = f.Label, // fixed: using field name, not form name
                    Type = f.Type,
                    Label = f.Label,
                    Options = f.Options,
                    Required = f.Required,
                    Width = f.Width,
                    RequireRemarks = f.RequiresRemarks,
                    IsDecimal = f.Decimal,
                    Max = f.Max,
                    Min = f.Min,
                    RemarkTriggers = f.RemarkTriggers?.Select(rt => new RemarkTriggerDto
                    {
                        Id = rt.Id,
                        Operator = rt.Operator,
                        Value = rt.Value
                    }).ToList() ?? new List<RemarkTriggerDto>(),
                    Column = f.Columns?.Select(ct => new GridColumnDto
                    {
                        Formula = ct.Formula,
                        Name = ct.Name,
                        Decimal = ct.Decimal,
                        Max = ct.Max,
                        Id = ct.Id,
                        Min = ct.Min,
                        Type = ct.Type,
                        Width = ct.Width,
                        Options = ct.Options ?? null
                    }).ToList() ?? new List<GridColumnDto>(),
                    Formula = f.Formula,
                    InitialRows = f.InitialRows,
                    MaxRows = f.MaxRows,
                    MinRows = f.MinRows,
                    ResultDecimal = f.ResultDecimal,
                    FieldReferencesJson = f.FieldReferencesJson
                }).ToList()
            };

            return Ok(formDto);
        }
    }
}
