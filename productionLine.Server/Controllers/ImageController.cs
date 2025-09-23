using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace productionLine.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ImageController : ControllerBase
    {
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<ImageController> _logger;

        public ImageController(IWebHostEnvironment environment, ILogger<ImageController> logger)
        {
            _environment = environment;
            _logger = logger;
        }

        [HttpPost("upload-image")]
        public async Task<IActionResult> UploadImage(IFormFile image)
        {
            try
            {
                if (image == null || image.Length == 0)
                {
                    return BadRequest(new { error = "No file uploaded" });
                }

                // Validate file size (5MB limit)
                if (image.Length > 5 * 1024 * 1024)
                {
                    return BadRequest(new { error = "File size exceeds 5MB limit" });
                }

                // Validate file type
                var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp" };
                if (!allowedTypes.Contains(image.ContentType.ToLower()))
                {
                    return BadRequest(new { error = "Invalid file type. Only images are allowed." });
                }

                // Generate unique filename
                var fileName = $"{Guid.NewGuid()}_{Path.GetFileName(image.FileName)}";
                var uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads");

                // Create uploads directory if it doesn't exist
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                var filePath = Path.Combine(uploadsFolder, fileName);

                // Save file
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await image.CopyToAsync(stream);
                }

                // Return success response
                var imageUrl = $"/uploads/{fileName}";
                return Ok(new
                {
                    url = imageUrl,
                    filename = fileName,
                    size = image.Length,
                    originalName = image.FileName
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading image");
                return StatusCode(500, new { error = "Internal server error during image upload" });
            }
        }
    }

}
