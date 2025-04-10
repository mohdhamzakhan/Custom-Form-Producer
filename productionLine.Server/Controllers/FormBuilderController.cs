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
                    .Include(f => f.Approvers)
                    .FirstOrDefaultAsync(f => f.Id == form.Id);

                if (existingForm == null)
                    return NotFound("Form not found.");

                existingForm.Name = form.Name;
                existingForm.FormLink = form.FormLink;

                _context.FormFields.RemoveRange(existingForm.Fields);
                _context.FormApprovers.RemoveRange(existingForm.Approvers);

                existingForm.Fields = form.Fields;
                existingForm.Approvers = form.Approvers;

                await _context.SaveChangesAsync();
                return Ok(existingForm);
            }
            else
            {
                // Create New Form
                _context.Forms.Add(form);
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
                .ThenInclude(field => field.RemarkTriggers) // Load RemarkTriggers for each field
                .FirstOrDefaultAsync(f => f.FormLink == formLink);

            if (form == null)
                return NotFound("Form not found.");

            // Map to DTO
            var formDto = new FormDto
            {
                Id = form.Id,
                FormLink = form.FormLink,
                Name = form.Name, // Include form name
                Fields = form.Fields.Select(f => new FieldDto
                {
                    Id = f.Id,
                    Name = form.Name, // Use form's name directly
                    Type = f.Type,
                    Label = f.Label,
                    Options = f.Options,
                    Required = f.Required,
                    Width = f.Width,
                    RequireRemarks = f.RequiresRemarks,
                    IsDecimal = f.Decimal,
                    Max = f.Max,
                    Min = f.Min,
                    RemarkTriggers = f.RemarkTriggers.Select(rt => new RemarkTriggerDto
                    {
                        Id = rt.Id,
                        Operator = rt.Operator,
                        Value = rt.Value
                    }).ToList()
                }).ToList()
            };

            return Ok(formDto);
        }
    }
}
