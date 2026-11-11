using Linea.Api.Contracts;
using Linea.Api.Data;
using Linea.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Services;

public sealed class CourseService(AppDbContext db) : ICourseService
{
    public async Task<CourseListResponse> GetAllAsync(
        int page,
        int pageSize,
        string? search,
        CancellationToken cancellationToken)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = db.Courses.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(course =>
                EF.Functions.ILike(course.Name, $"%{term}%") ||
                (course.Description != null && EF.Functions.ILike(course.Description, $"%{term}%")));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(course => course.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(course => ToResponse(course))
            .ToListAsync(cancellationToken);
        return new CourseListResponse(items, page, pageSize, total);
    }

    public async Task<CourseResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        await db.Courses.AsNoTracking()
            .Where(course => course.Id == id)
            .Select(course => ToResponse(course))
            .SingleOrDefaultAsync(cancellationToken);

    public async Task<CourseResponse> CreateAsync(
        CreateCourseRequest request,
        string ownerId,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var course = new Course
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            CoverImageUrl = request.CoverImageUrl,
            Status = request.Status,
            OwnerId = ownerId,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.Courses.Add(course);
        await db.SaveChangesAsync(cancellationToken);
        return ToResponse(course);
    }

    public async Task<CourseResponse?> UpdateAsync(
        Guid id,
        UpdateCourseRequest request,
        string userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var course = await db.Courses.SingleOrDefaultAsync(course => course.Id == id, cancellationToken);
        if (course is null || (!isAdmin && course.OwnerId != userId))
        {
            return null;
        }

        course.Name = request.Name.Trim();
        course.Description = request.Description?.Trim();
        course.CoverImageUrl = request.CoverImageUrl;
        course.Status = request.Status;
        course.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return ToResponse(course);
    }

    public async Task<bool> DeleteAsync(
        Guid id,
        string userId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var course = await db.Courses.SingleOrDefaultAsync(course => course.Id == id, cancellationToken);
        if (course is null || (!isAdmin && course.OwnerId != userId))
        {
            return false;
        }

        db.Courses.Remove(course);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static CourseResponse ToResponse(Course course) =>
        new(course.Id, course.Name, course.Description, course.CoverImageUrl, course.Status,
            course.OwnerId, course.CreatedAt, course.UpdatedAt);
}
