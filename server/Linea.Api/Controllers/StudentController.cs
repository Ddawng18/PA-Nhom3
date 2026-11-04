using Linea.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Linea.Api.Controllers;

[ApiController]
[Route("api/student")]
[Authorize(Policy = AuthPolicies.StudentOnly)]
public sealed class StudentController : ControllerBase
{
    [HttpGet("assignments")]
    public IActionResult GetAssignments() => Ok(new[]
    {
        new { id = "lesson-01", title = "Phác thảo khối cơ bản", dueAt = "2026-11-15T00:00:00Z" },
        new { id = "lesson-02", title = "Luyện tập ánh sáng", dueAt = "2026-11-22T00:00:00Z" }
    });
}
