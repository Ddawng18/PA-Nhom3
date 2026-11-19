using Linea.Api.Data;
using Linea.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

[ApiController, Route("api/notifications"), Authorize]
public sealed class NotificationsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        if (!User.TryGetUserId(out var user)) return Unauthorized();
        var rows = await db.Notifications.AsNoTracking().Where(n => n.UserId == user)
            .OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.Id).Take(100)
            .Select(n => new { ma_thong_bao = n.Id, loai_thong_bao = n.Type, noi_dung = n.Content,
                duong_dan_lien_ket = n.Link, da_doc = n.IsRead, ngay_tao = n.CreatedAt }).ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPut("{id:long}/read")]
    public async Task<IActionResult> Read(long id, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var user)) return Unauthorized();
        var changed = await db.Notifications.Where(n => n.Id == id && n.UserId == user)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
        return changed == 0 ? NotFound() : NoContent();
    }

    public sealed record MarkReadRequest(long[] Ids);

    [HttpPut("read")]
    public async Task<IActionResult> ReadMany(MarkReadRequest request, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var user)) return Unauthorized();
        if (request.Ids is null || request.Ids.Length > 100) return BadRequest();
        await db.Notifications.Where(n => n.UserId == user && request.Ids.Contains(n.Id) && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
        return NoContent();
    }
}
