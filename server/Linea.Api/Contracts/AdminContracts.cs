using System.ComponentModel.DataAnnotations;

namespace Linea.Api.Contracts;

public sealed class UpdateLockRequest
{
    public bool IsLocked { get; set; }
}

public sealed class UpdateRoleRequest
{
    [Required(ErrorMessage = "Vui lòng chọn vai trò.")]
    public string Role { get; set; } = string.Empty;
}
