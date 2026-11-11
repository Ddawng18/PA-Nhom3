using Linea.Api.Contracts;
using Linea.Api.Security;
using Linea.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Linea.Api.Controllers;

[ApiController]
[Route("api/courses")]
public sealed class CoursesController(ICourseService courses) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType<CourseListResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CourseListResponse>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var result = await courses.GetAllAsync(page, pageSize, search, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<CourseResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await courses.GetByIdAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.TeacherAccess)]
    public async Task<ActionResult<CourseResponse>> Create(
        CreateCourseRequest request,
        CancellationToken cancellationToken)
    {
        var result = await courses.CreateAsync(request, User.GetRequiredUserId(), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthPolicies.TeacherAccess)]
    public async Task<ActionResult<CourseResponse>> Update(
        Guid id,
        UpdateCourseRequest request,
        CancellationToken cancellationToken)
    {
        var result = await courses.UpdateAsync(
            id, request, User.GetRequiredUserId(), User.IsAdmin(), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AuthPolicies.TeacherAccess)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await courses.DeleteAsync(
            id, User.GetRequiredUserId(), User.IsAdmin(), cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
