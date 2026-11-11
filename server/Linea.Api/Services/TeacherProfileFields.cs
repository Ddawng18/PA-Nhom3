using System.Text.Json;
using Linea.Api.Models;

namespace Linea.Api.Services;

public static class TeacherProfileFields
{
    public static string? Serialize(IReadOnlyCollection<string>? fields)
    {
        if (fields is null || fields.Count == 0)
        {
            return null;
        }

        return JsonSerializer.Serialize(fields);
    }

    public static IReadOnlyList<string> Deserialize(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<string[]>(json) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    public static List<string>? Normalize(IEnumerable<string>? fields)
    {
        if (fields is null)
        {
            return null;
        }

        var result = new List<string>();
        foreach (var field in fields)
        {
            if (string.IsNullOrWhiteSpace(field))
            {
                continue;
            }

            var normalized = field.Trim();
            if (!TeacherProfileFieldCodes.All.Contains(normalized))
            {
                return null;
            }

            if (!result.Contains(normalized, StringComparer.Ordinal))
            {
                result.Add(normalized);
            }
        }

        return result.Count == 0 ? null : result;
    }
}
