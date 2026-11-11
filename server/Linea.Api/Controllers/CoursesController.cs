using Linea.Api.Contracts;
using Linea.Api.Data;
using Linea.Api.Models;
using Linea.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

[ApiController, Route("api/courses")]
public sealed class CoursesController(AppDbContext db) : ControllerBase
{
    [HttpGet, AllowAnonymous]
    public async Task<IActionResult> List(int page = 1, int pageSize = 20, string? search = null,
        bool mine = false, CancellationToken cancellationToken = default)
    {
        page = Math.Clamp(page, 1, 1000000); pageSize = Math.Clamp(pageSize, 1, 100);
        User.TryGetUserId(out var userId);
        if (mine && userId == Guid.Empty) return Unauthorized();
        var query = db.LearningCourses.AsNoTracking().AsQueryable();
        if (mine) query = query.Where(item => item.TeacherId == userId);
        else if (!User.IsAdmin()) query = query.Where(item => item.Status == "DA_DANG" || item.TeacherId == userId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(item => item.Title.ToLower().Contains(term) || item.Description.ToLower().Contains(term));
        }
        var total = await query.CountAsync(cancellationToken);
        var rows = await query.OrderByDescending(item => item.Id).Skip((page - 1) * pageSize)
            .Take(pageSize).ToListAsync(cancellationToken);
        return Ok(new { items = rows.Select(LearningCourseResponse.From), page, pageSize, totalCount = total });
    }

    [HttpGet("{id:long}"), AllowAnonymous]
    public async Task<IActionResult> Get(long id, CancellationToken cancellationToken)
    {
        var course = await db.LearningCourses.AsNoTracking().SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (course is null || (course.Status != "DA_DANG" && !Owns(course) && !User.IsAdmin())) return NotFound();
        return Ok(LearningCourseResponse.From(course));
    }

    [HttpPost, Authorize(Policy = AuthPolicies.TeacherAccess)]
    public async Task<IActionResult> Create(SaveLearningCourseRequest request, CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var owner)) return Unauthorized();
        var error = Validate(request); if (error is not null) return error;
        var course = new LearningCourse { TeacherId = owner };
        Apply(course, request); db.LearningCourses.Add(course);
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = course.Id }, LearningCourseResponse.From(course));
    }

    [HttpPut("{id:long}"), Authorize(Policy = AuthPolicies.TeacherAccess)]
    public async Task<IActionResult> Update(long id, SaveLearningCourseRequest request, CancellationToken cancellationToken)
    {
        var course = await db.LearningCourses.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (course is null || !Owns(course)) return NotFound();
        var error = Validate(request); if (error is not null) return error;
        var changed = await db.LearningCourses.Where(item => item.Id == id && item.Status == "NHAP")
            .ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Title, request.Title.Trim())
                .SetProperty(item => item.Description, request.Description.Trim())
                .SetProperty(item => item.Level, request.Level).SetProperty(item => item.Topic, request.Topic.Trim())
                .SetProperty(item => item.CoverImage, string.IsNullOrWhiteSpace(request.CoverImage) ? null : request.CoverImage), cancellationToken);
        if (changed == 0) return Conflict(new { detail = "Chỉ được sửa khóa học ở trạng thái nháp." });
        Apply(course, request); return Ok(LearningCourseResponse.From(course));
    }

    [HttpPost("{id:long}/submit"), Authorize(Policy = AuthPolicies.TeacherAccess)]
    public Task<IActionResult> Submit(long id, CancellationToken cancellationToken) =>
        Transition(id, "NHAP", "CHO_DUYET", null, false, cancellationToken);

    [HttpPost("/api/admin/courses/{id:long}/approve"), Authorize(Policy = AuthPolicies.AdminOnly)]
    public Task<IActionResult> Approve(long id, CancellationToken cancellationToken) =>
        Transition(id, "CHO_DUYET", "DA_DANG", null, true, cancellationToken);

    [HttpPost("/api/admin/courses/{id:long}/reject"), Authorize(Policy = AuthPolicies.AdminOnly)]
    public Task<IActionResult> Reject(long id, RejectTeacherProfileRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length is < 10 or > 1000)
            return Task.FromResult<IActionResult>(BadRequest(new { detail = "Lý do từ chối cần từ 10 đến 1000 ký tự." }));
        return Transition(id, "CHO_DUYET", "NHAP", request.Reason.Trim(), true, cancellationToken);
    }

    private async Task<IActionResult> Transition(long id, string expected, string next, string? reason,
        bool admin, CancellationToken cancellationToken)
    {
        var course = await db.LearningCourses.AsNoTracking().SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (course is null || (!admin && !Owns(course))) return NotFound();
        var now = DateTimeOffset.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var changed = await db.LearningCourses.Where(item => item.Id == id && item.Status == expected)
            .ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Status, next), cancellationToken);
        if (changed == 0) return Conflict(new { detail = "Trạng thái khóa học đã thay đổi. Vui lòng tải lại." });
        User.TryGetUserId(out var actorId);
        db.StatusHistory.Add(new StatusHistoryEntry { ObjectType = "KHOA_HOC", ObjectId = id.ToString(),
            PreviousStatus = expected, Status = next, ActorId = actorId, Reason = reason, OccurredAt = now });
        if (admin) db.Notifications.Add(new NotificationMessage { UserId = course.TeacherId, Type = "KHOA_HOC",
            Content = next == "DA_DANG" ? "Khóa học của bạn đã được duyệt." : $"Khóa học cần chỉnh sửa: {reason}",
            Link = $"/teacher/courses/{id}/edit", CreatedAt = now });
        await db.SaveChangesAsync(cancellationToken); await transaction.CommitAsync(cancellationToken);
        return Ok(new { id, status = next, reviewedAt = now, rejectionReason = reason });
    }

    private bool Owns(LearningCourse course) => User.TryGetUserId(out var id) && course.TeacherId == id;
    private IActionResult? Validate(SaveLearningCourseRequest request)
    {
        if (request.Title.Trim().Length < 5 || request.Description.Trim().Length < 50 || request.Topic.Trim().Length < 2)
            return BadRequest(new { detail = "Vui lòng nhập đủ tiêu đề, mô tả và chủ đề khóa học." });
        if (!string.IsNullOrWhiteSpace(request.CoverImage) &&
            (!Uri.TryCreate(request.CoverImage, UriKind.Absolute, out var uri) || uri.Scheme != "https"))
            return BadRequest(new { detail = "Ảnh đại diện phải dùng URL HTTPS." });
        return null;
    }
    private static void Apply(LearningCourse course, SaveLearningCourseRequest request)
    {
        course.Title = request.Title.Trim(); course.Description = request.Description.Trim();
        course.Level = request.Level; course.Topic = request.Topic.Trim();
        course.CoverImage = string.IsNullOrWhiteSpace(request.CoverImage) ? null : request.CoverImage;
    }
}
