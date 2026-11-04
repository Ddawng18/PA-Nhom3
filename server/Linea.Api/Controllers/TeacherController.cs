using Linea.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Linea.Api.Controllers;

[ApiController]
[Route("api/teacher")]
[Authorize(Policy = AuthPolicies.TeacherAccess)]
public sealed class TeacherController : ControllerBase
{
    [HttpGet("courses")]
    public IActionResult GetCourses() => Ok(new[]
    {
        new { id = "digital-sketch", title = "Digital Sketch Foundations", status = "published" },
        new { id = "color-theory", title = "Color Theory for Artists", status = "draft" }
    });

    [HttpGet("dashboard")]
    public IActionResult GetDashboard() => Ok(new
    {
        message = "Khu vực giảng viên.",
        role = User.FindFirst("role")?.Value
    });
}
