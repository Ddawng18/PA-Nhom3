using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.WebUtilities;

namespace Linea.Api.Services;

public sealed class VnPayPaymentService(IConfiguration configuration)
{
    private const string SandboxPaymentUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(configuration["VNPAY_TMN_CODE"]) &&
        !string.IsNullOrWhiteSpace(configuration["VNPAY_HASH_SECRET"]) &&
        IsHttpsUrl(configuration["VNPAY_RETURN_URL"]) &&
        IsHttpsUrl(configuration["VNPAY_IPN_URL"]) &&
        IsReturnPageUrl(configuration["VNPAY_RETURN_PAGE_URL"]);

    public string BuildPaymentUrl(long orderId, long priceVnd, string ipAddress)
    {
        if (!IsConfigured) throw new InvalidOperationException("VNPAY sandbox chưa được cấu hình đầy đủ.");

        var now = DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(7));
        var parameters = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["vnp_Amount"] = checked(priceVnd * 100).ToString(CultureInfo.InvariantCulture),
            ["vnp_Command"] = "pay",
            ["vnp_CreateDate"] = now.ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture),
            ["vnp_CurrCode"] = "VND",
            ["vnp_ExpireDate"] = now.AddMinutes(15).ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture),
            ["vnp_IpAddr"] = ipAddress,
            ["vnp_Locale"] = "vn",
            ["vnp_OrderInfo"] = $"Thanh toan don hang {orderId}",
            ["vnp_OrderType"] = "other",
            ["vnp_ReturnUrl"] = configuration["VNPAY_RETURN_URL"]!,
            ["vnp_TmnCode"] = configuration["VNPAY_TMN_CODE"]!,
            ["vnp_TxnRef"] = orderId.ToString(CultureInfo.InvariantCulture),
            ["vnp_Version"] = "2.1.0",
        };

        var signData = string.Join("&", parameters.Select(item => $"{item.Key}={item.Value}"));
        var signature = Sign(signData, configuration["VNPAY_HASH_SECRET"]!);
        var query = string.Join("&", parameters.Select(item =>
            $"{WebUtility.UrlEncode(item.Key)}={WebUtility.UrlEncode(item.Value)}"));
        return $"{SandboxPaymentUrl}?{query}&vnp_SecureHash={signature}";
    }

    public bool HasValidSignature(IQueryCollection query)
    {
        var secret = configuration["VNPAY_HASH_SECRET"];
        var received = query["vnp_SecureHash"].ToString();
        if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(received)) return false;

        var parameters = query
            .Where(item => item.Key.StartsWith("vnp_", StringComparison.Ordinal) &&
                item.Key is not ("vnp_SecureHash" or "vnp_SecureHashType"))
            .OrderBy(item => item.Key, StringComparer.Ordinal)
            .Select(item => $"{item.Key}={item.Value}");
        var expected = Sign(string.Join("&", parameters), secret);
        try
        {
            return CryptographicOperations.FixedTimeEquals(
                Convert.FromHexString(expected), Convert.FromHexString(received));
        }
        catch (FormatException)
        {
            return false;
        }
    }

    public bool HasMatchingTerminal(string terminalCode) =>
        string.Equals(configuration["VNPAY_TMN_CODE"], terminalCode, StringComparison.Ordinal);

    public string ReturnPageUrl(long? orderId, string result)
    {
        var page = configuration["VNPAY_RETURN_PAGE_URL"]!;
        var query = new Dictionary<string, string?>
        {
            ["payment"] = result,
            ["orderId"] = orderId?.ToString(CultureInfo.InvariantCulture),
        };
        return QueryHelpers.AddQueryString(page, query);
    }

    private static string Sign(string value, string secret)
    {
        var hash = HMACSHA512.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(value));
        return Convert.ToHexStringLower(hash);
    }

    private static bool IsHttpsUrl(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps;

    private static bool IsReturnPageUrl(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
        (uri.Scheme == Uri.UriSchemeHttps ||
            uri.Scheme == Uri.UriSchemeHttp && (uri.IsLoopback || uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)));
}
