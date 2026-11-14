using System.ComponentModel.DataAnnotations;

namespace Linea.Api.Contracts;

public sealed class UpdateLockRequest
{
    public bool IsLocked { get; set; }

    public string? Reason { get; set; }

    public int? ExpectedVersion { get; set; }
}

public sealed class UpdateRoleRequest
{
    [Required(ErrorMessage = "Vui lòng chọn vai trò.")]
    public string Role { get; set; } = string.Empty;

    public string? Reason { get; set; }

    public int? ExpectedVersion { get; set; }
}

public sealed class UpdateVisibilityRequest
{
    public bool Hidden { get; set; }

    public string? Reason { get; set; }

    public int? ExpectedVersion { get; set; }
}
