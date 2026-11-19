using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace productionLine.Server.Controllers
{
    // Receives photos captured in DynamicForm and stores them under
    // wwwroot/submission-photos/yyyy/MM/. Returns a relative URL that the
    // submission stores as the field's value.
    [Route("api/photos")]
    [ApiController]
    public class PhotosController : ControllerBase
    {
        private const long MaxBytes = 10 * 1024 * 1024; // client shrinks photos to well under 1 MB; this is a safety cap
        private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };

        private readonly IWebHostEnvironment _env;

        public PhotosController(IWebHostEnvironment env)
        {
            _env = env;
        }

        [HttpPost]
        [RequestSizeLimit(MaxBytes)]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            if (file.Length > MaxBytes)
                return BadRequest("Photo is too large (max 10 MB).");

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension))
                return BadRequest("Only JPG, PNG or WebP images are allowed.");

            // Don't trust the extension alone: check the file's first bytes too.
            var header = new byte[12];
            await using (var peek = file.OpenReadStream())
            {
                await peek.ReadAsync(header, 0, header.Length);
            }

            if (!LooksLikeImage(header))
                return BadRequest("File is not a valid image.");

            var now = DateTime.Now;
            var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var physicalFolder = Path.Combine(webRoot, "submission-photos", now.ToString("yyyy"), now.ToString("MM"));
            Directory.CreateDirectory(physicalFolder);

            // Server-generated name: nothing from the client ends up in the path.
            var fileName = $"{Guid.NewGuid():N}{extension}";

            await using (var stream = System.IO.File.Create(Path.Combine(physicalFolder, fileName)))
            {
                await file.CopyToAsync(stream);
            }

            var url = $"/submission-photos/{now:yyyy}/{now:MM}/{fileName}";
            return Ok(new { url });
        }

        private static bool LooksLikeImage(byte[] h) =>
            // JPEG
            (h[0] == 0xFF && h[1] == 0xD8 && h[2] == 0xFF) ||
            // PNG
            (h[0] == 0x89 && h[1] == 0x50 && h[2] == 0x4E && h[3] == 0x47) ||
            // WebP: "RIFF" .... "WEBP"
            (h[0] == 0x52 && h[1] == 0x49 && h[2] == 0x46 && h[3] == 0x46 &&
             h[8] == 0x57 && h[9] == 0x45 && h[10] == 0x42 && h[11] == 0x50);
    }
}