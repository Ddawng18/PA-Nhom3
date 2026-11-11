using Linea.Api.Contracts;

namespace Linea.Api.Services;

public interface ICourseService
{
    Task<CourseListResponse> GetAllAsync(int page, int pageSize, string? search, CancellationToken cancellationToken);
    Task<CourseResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<CourseResponse> CreateAsync(CreateCourseRequest request, string ownerId, CancellationToken cancellationToken);
    Task<CourseResponse?> UpdateAsync(Guid id, UpdateCourseRequest request, string userId, bool isAdmin, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, string userId, bool isAdmin, CancellationToken cancellationToken);
}
