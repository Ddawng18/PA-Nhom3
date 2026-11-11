using System.Net;
using System.Text.RegularExpressions;

namespace Linea.Api.Security;

public static partial class TextSanitizer
{
    public static string ToPlainText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var text = ScriptBlockRegex().Replace(value, " ");
        text = HtmlTagRegex().Replace(text, " ");
        text = WebUtility.HtmlDecode(text);
        text = ScriptBlockRegex().Replace(text, " ");
        text = HtmlTagRegex().Replace(text, " ");
        text = WhitespaceRegex().Replace(text, " ");
        return text.Trim();
    }

    [GeneratedRegex(@"<(script|style)\b[^>]*>.*?</\1\s*>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex ScriptBlockRegex();

    [GeneratedRegex("<[^>]+>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex HtmlTagRegex();

    [GeneratedRegex(@"\s+", RegexOptions.IgnoreCase)]
    private static partial Regex WhitespaceRegex();
}
