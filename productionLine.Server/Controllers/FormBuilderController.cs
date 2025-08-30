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
        [HttpPost]
        public async Task<IActionResult> SaveForm([FromBody] Form form)
        {
            if (form == null)
            {
                return BadRequest("Form is null.");
            }

            if (form.Id > 0) // Update existing form
            {
                Form existingForm = await _context.Forms
                    .Include(f => f.Fields).ThenInclude(f => f.Columns)
                    .Include(f => f.Fields).ThenInclude(f => f.RemarkTriggers)
                    .Include(f => f.Approvers)
                    .FirstOrDefaultAsync(f => f.Id == form.Id);

                if (existingForm == null)
                {
                    return NotFound("Form not found.");
                }

                // 🔹 Delete old image files for removed fields
                var oldImageFields = existingForm.Fields
                    .Where(f => f.Type == "image" && !string.IsNullOrEmpty(f.ImageValue))
                    .ToList();

                foreach (var oldField in oldImageFields)
                {
                    // if the old image is not present in new form, delete from disk
                    bool stillExists = form.Fields.Any(nf =>
                        nf.Id == oldField.Id && nf.ImageValue == oldField.ImageValue);

                    if (!stillExists)
                    {
                        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", oldField.ImageValue.TrimStart('/'));
                        if (System.IO.File.Exists(filePath))
                        {
                            System.IO.File.Delete(filePath);
                        }
                    }
                }

                // Update form data
                existingForm.Name = form.Name;
                existingForm.FormLink = form.FormLink;

                _context.FormFields.RemoveRange(existingForm.Fields);
                _context.FormApprovers.RemoveRange(existingForm.Approvers);

                foreach (FormField field in form.Fields)
                {
                    if (field.Id == Guid.Empty)
                        field.Id = Guid.NewGuid();

                    if (field.Columns != null)
                    {
                        foreach (GridColumn col in field.Columns)
                        {
                            if (string.IsNullOrWhiteSpace(col.Id))
                                col.Id = Guid.NewGuid().ToString();
                        }
                    }

                    if (field.RemarkTriggers != null)
                    {
                        foreach (RemarkTrigger trigger in field.RemarkTriggers)
                        {
                            trigger.FormField = field;
                        }
                    }
                }

                foreach (FormApprover approver in form.Approvers)
                {
                    approver.Id = 0;
                    approver.FormId = existingForm.Id;
                }

                existingForm.Fields = form.Fields;
                existingForm.Approvers = form.Approvers;

                await _context.SaveChangesAsync();
                return Ok(existingForm);
            }

            // 🔹 Create new form
            foreach (FormField field2 in form.Fields)
            {
                if (field2.Id == Guid.Empty)
                    field2.Id = Guid.NewGuid();

                field2.Form = form;

                if (field2.Columns != null)
                {
                    foreach (GridColumn col2 in field2.Columns)
                    {
                        if (string.IsNullOrWhiteSpace(col2.Id))
                            col2.Id = Guid.NewGuid().ToString();
                    }
                }

                if (field2.RemarkTriggers != null)
                {
                    foreach (RemarkTrigger trigger2 in field2.RemarkTriggers)
                    {
                        trigger2.FormFieldId = field2.Id;
                        trigger2.FormField = null;
                    }
                }
            }

            _context.Forms.Add(form);
            await _context.SaveChangesAsync();
            return Ok(form);
        }



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
            Form form = await _context.Forms.Include((Form f) => f.Fields).Include((Form f) => f.Fields.OrderBy((FormField field) => field.Order)).ThenInclude((FormField field) => field.RemarkTriggers)
                .Include((Form f) => f.Approvers.OrderBy((FormApprover a) => a.Level))
                .FirstOrDefaultAsync((Form f) => f.FormLink.ToLower() == formLink.ToLower());
            if (form == null)
            {
                return NotFound("Form not found.");
            }
            FormDto formDto = new FormDto
            {
                Id = form.Id,
                FormLink = form.FormLink,
                Name = form.Name,
                Approvers = (form.Approvers?.Select((FormApprover a) => new ApproverDto
                {
                    Id = a.Id,
                    AdObjectId = a.AdObjectId,
                    Name = a.Name,
                    Email = a.Email,
                    Type = a.Type,
                    Level = a.Level
                }).ToList() ?? new List<ApproverDto>()),
                Fields = form.Fields.Select((FormField f) => new FieldDto
                {
                    Id = f.Id,
                    Name = f.Label,
                    Type = f.Type,
                    Label = f.Label,
                    Options = f.Options,
                    Required = f.Required,
                    Width = f.Width,
                    RequireRemarks = f.RequiresRemarks,
                    IsDecimal = f.Decimal,
                    Max = f.Max,
                    RemarkTriggers = (f.RemarkTriggers?.Select((RemarkTrigger rt) => new RemarkTriggerDto
                    {
                        Id = rt.Id,
                        Operator = rt.Operator,
                        Value = rt.Value,
                        FormFieldId = rt.FormFieldId
                    }).ToList() ?? new List<RemarkTriggerDto>()),
                    Column = (f.Columns?.Select((GridColumn ct) => new GridColumnDto
                    {
                        Formula = ct.Formula,
                        Name = ct.Name,
                        Decimal = ct.Decimal,
                        Max = ct.Max,
                        Id = ct.Id,
                        Min = ct.Min,
                        Type = ct.Type,
                        Width = ct.Width,
                        backgroundColor = ct.backgroundColor,
                        textColor = ct.textColor,
                        Options = (ct.Options ?? new List<string>()),
                        ParentColumn = ct.ParentColumn,
                        DependentOptions = ct.DependentOptions,
                        StartTime = ct.StartTime,
                        EndTime = ct.EndTime,
                        Required = ct.Required,
                        RemarksOptions = ct.RemarksOptions
                    }).ToList() ?? new List<GridColumnDto>()),
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

        [HttpPost("upload-image")]
        public async Task<IActionResult> UploadImage(IFormFile file, [FromForm] string? oldPath)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads");
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            // 🔹 Delete old file if provided
            if (!string.IsNullOrEmpty(oldPath))
            {
                var oldFilePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", oldPath.TrimStart('/'));
                if (System.IO.File.Exists(oldFilePath))
                {
                    System.IO.File.Delete(oldFilePath);
                }
            }

            // 🔹 Save new file
            var fileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
            var filePath = Path.Combine(uploadsFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var fileUrl = $"/uploads/{fileName}"; // relative path

            return Ok(new { url = fileUrl });
        }

        [HttpDelete("delete-image")]
        public IActionResult DeleteImage(string path)
        {
            if (string.IsNullOrEmpty(path)) return BadRequest();

            var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", path.TrimStart('/'));
            if (System.IO.File.Exists(fullPath))
            {
                System.IO.File.Delete(fullPath);
            }

            return Ok();
        }


    }
}
