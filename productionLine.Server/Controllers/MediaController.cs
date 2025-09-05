using Microsoft.AspNetCore.Mvc;

[Route("api/[controller]")]
[ApiController]
public class MediaController : ControllerBase
{
    [HttpGet("scan")]
    public IActionResult GetMediaFiles([FromQuery] string tvFolder, [FromQuery] string[] extensions)
    {
        if (string.IsNullOrWhiteSpace(tvFolder))
        {
            return BadRequest("TV folder name is required.");
        }
        string basePath = Path.Combine("D:\\IIS_MediaFolder\\TV", tvFolder);
        if (!Directory.Exists(basePath))
        {
            return BadRequest("TV folder not found.");
        }
        HashSet<string> allowedExtensions = extensions?.Select((string e) => e.ToLower()).ToHashSet() ?? new HashSet<string> { "jpg", "jpeg", "png", "gif", "mp4" };
        var files = (from file in Directory.GetFiles(basePath, "*.*", SearchOption.AllDirectories)
                     where allowedExtensions.Contains(Path.GetExtension(file).TrimStart('.').ToLower())
                     select file).Select(delegate (string file)
                     {
                         string text = file.Substring(basePath.Length).TrimStart(Path.DirectorySeparatorChar);
                         string url = "/TV/" + tvFolder + "/" + text.Replace("\\", "/");
                         return new
                         {
                             Name = Path.GetFileName(file),
                             Url = url,
                             Type = GetFileType(file)
                         };
                     }).ToList();
        return Ok(files);
    }

    private string GetFileType(string file)
    {
        string ext = Path.GetExtension(file).ToLower();
        if (!(ext == ".mp4"))
        {
            return "image";
        }
        return "video";
    }
}

