using Linea.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;

namespace Linea.Api.Controllers;

[ApiController, Route("api/catalog/courses"), AllowAnonymous]
public sealed class CourseCatalogController(CourseCatalogService catalog) : ControllerBase
{
    [HttpGet]
    [OutputCache(PolicyName = "catalog")]
    public async Task<IActionResult> List(
        string? search = null, string? chu_de = null, string? cap_do = null, string? sap_xep = null,
        int page = 1, int pageSize = 12, CancellationToken cancellationToken = default)
    {
        return Ok(await catalog.ListAsync(search, chu_de, cap_do, sap_xep, page, pageSize, cancellationToken));
    }

    [HttpGet("{id:long}")]
    [OutputCache(PolicyName = "catalog")]
    public async Task<IActionResult> Get(long id, CancellationToken cancellationToken)
    {
        var detail = await catalog.GetAsync(id, cancellationToken);
        return detail is null ? NotFound() : Ok(detail);
    }
}
