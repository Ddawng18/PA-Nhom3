using Linea.Api.Security;
using Linea.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Linea.Api.Controllers;

[ApiController, Route("api/lifecycle")]
public sealed class LifecycleController(LifecycleEmailService lifecycle) : ControllerBase
{
    [HttpPost("welcome"), Authorize(Policy = AuthPolicies.LearnerAccess)]
    public async Task<IActionResult> Welcome(CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        await lifecycle.SendWelcomeAsync(userId, cancellationToken);
        return NoContent();
    }
}
