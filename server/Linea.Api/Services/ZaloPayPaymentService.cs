using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;

namespace Linea.Api.Services;

// Sandbox endpoints are fixed. No production wallet/payment endpoint is supported.
public sealed class ZaloPayPaymentService(IConfiguration config, IHttpClientFactory clients, ILogger<ZaloPayPaymentService> logger)
{
    public bool IsConfigured => int.TryParse(config["ZALOPAY_APP_ID"], out var id) && id > 0 &&
        !string.IsNullOrWhiteSpace(config["ZALOPAY_KEY1"]) && !string.IsNullOrWhiteSpace(config["ZALOPAY_KEY2"]) &&
        IsHttps(config["ZALOPAY_CALLBACK_URL"]) && IsReturnUrl(config["ZALOPAY_RETURN_PAGE_URL"]);

    public static string TransactionId(long orderId, DateTimeOffset createdAt) =>
        $"{createdAt.ToOffset(TimeSpan.FromHours(7)).ToString("yyMMdd", CultureInfo.InvariantCulture)}_linea_{orderId}";

    public Dictionary<string, string> CreateParameters(long orderId, Guid user, long amount, DateTimeOffset createdAt)
    {
        if (!IsConfigured) throw new InvalidOperationException("ZaloPay sandbox chưa được cấu hình đầy đủ.");
        if (orderId <= 0 || user == Guid.Empty || amount <= 0) throw new ArgumentOutOfRangeException(nameof(orderId), "Đơn ZaloPay không hợp lệ.");
        var values = new Dictionary<string, string>
        {
            ["app_id"] = config["ZALOPAY_APP_ID"]!,
            ["app_trans_id"] = TransactionId(orderId, createdAt),
            ["app_user"] = user.ToString("N"),
            ["app_time"] = createdAt.ToUnixTimeMilliseconds().ToString(CultureInfo.InvariantCulture),
            ["amount"] = amount.ToString(CultureInfo.InvariantCulture),
            ["description"] = $"LINEA sandbox - don {orderId} (khong thu tien that)",
            ["item"] = "[]",
            ["embed_data"] = JsonSerializer.Serialize(new { redirecturl = ReturnPageUrl(orderId) }),
            ["callback_url"] = config["ZALOPAY_CALLBACK_URL"]!,
            ["bank_code"] = "",
            ["expire_duration_seconds"] = "900",
        };
        values["mac"] = Sign(string.Join("|", new[] { "app_id", "app_trans_id", "app_user", "amount", "app_time", "embed_data", "item" }.Select(k => values[k])), config["ZALOPAY_KEY1"]!);
        return values;
    }

    public async Task<string> CreateAsync(long orderId, Guid user, long amount, DateTimeOffset createdAt, CancellationToken ct)
    {
        var result = await PostAsync("create", CreateParameters(orderId, user, amount, createdAt), ct);
        if (result.GetProperty("return_code").GetInt32() != 1)
        {
            var duplicate = result.TryGetProperty("sub_return_code", out var subCode) && subCode.TryGetInt32(out var code) && code == -68;
            throw new PaymentGatewayException(duplicate
                ? "ZaloPay đã nhận mã giao dịch này. Đơn đang được giữ để đối soát trạng thái."
                : "ZaloPay sandbox từ chối tạo phiên thanh toán.", ambiguous: duplicate);
        }
        if (!result.TryGetProperty("order_url", out var url) || url.ValueKind != JsonValueKind.String || !IsSandboxGateway(url.GetString()))
            throw new PaymentGatewayException("ZaloPay sandbox chưa tạo được liên kết thanh toán. Vui lòng kiểm tra trạng thái đơn.", ambiguous: true);
        return url.GetString()!;
    }

    public async Task<(bool Succeeded, bool Failed, long Amount)> QueryAsync(string transactionId, CancellationToken ct)
    {
        if (!IsConfigured) throw new PaymentGatewayException("ZaloPay sandbox chưa được cấu hình đầy đủ.");
        var appId = config["ZALOPAY_APP_ID"]!;
        var result = await PostAsync("query", new Dictionary<string, string>
        {
            ["app_id"] = appId, ["app_trans_id"] = transactionId,
            ["mac"] = Sign($"{appId}|{transactionId}|{config["ZALOPAY_KEY1"]}", config["ZALOPAY_KEY1"]!),
        }, ct);
        var code = result.GetProperty("return_code").GetInt32();
        return (code == 1, code == 2,
            result.TryGetProperty("amount", out var amount) && amount.ValueKind == JsonValueKind.Number && amount.TryGetInt64(out var v) ? v : -1);
    }

    public sealed record CallbackPayment(string TransactionId, string User, long Amount);
    public CallbackPayment? VerifyCallback(string data, string mac)
    {
        if (!IsConfigured || data.Length > 32768 || !ValidMac(data, mac, config["ZALOPAY_KEY2"]!)) return null;
        try
        {
            using var json = JsonDocument.Parse(data);
            var root = json.RootElement;
            if (root.GetProperty("app_id").GetInt32().ToString(CultureInfo.InvariantCulture) != config["ZALOPAY_APP_ID"]) return null;
            return new(root.GetProperty("app_trans_id").GetString()!, root.GetProperty("app_user").GetString()!, root.GetProperty("amount").GetInt64());
        }
        catch (Exception e) when (e is JsonException or InvalidOperationException or KeyNotFoundException or FormatException) { return null; }
    }

    public string ReturnPageUrl(long orderId) => QueryHelpers.AddQueryString(config["ZALOPAY_RETURN_PAGE_URL"]!,
        new Dictionary<string, string?> { ["payment"] = "zalopay_return", ["orderId"] = orderId.ToString(CultureInfo.InvariantCulture) });

    private async Task<JsonElement> PostAsync(string action, Dictionary<string, string> values, CancellationToken ct)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(10));
        try
        {
            using var client = clients.CreateClient("zalopay-sandbox");
            using var content = new FormUrlEncodedContent(values);
            using var response = await client.PostAsync($"https://sb-openapi.zalopay.vn/v2/{action}", content, timeout.Token);
            response.EnsureSuccessStatusCode();
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(timeout.Token));
            if (doc.RootElement.ValueKind != JsonValueKind.Object ||
                !doc.RootElement.TryGetProperty("return_code", out var code) || code.ValueKind != JsonValueKind.Number || !code.TryGetInt32(out _))
                throw new PaymentGatewayException("ZaloPay sandbox trả kết quả không hợp lệ. Đơn chưa được xác nhận.", ambiguous: action == "create");
            return doc.RootElement.Clone();
        }
        catch (Exception e) when (e is HttpRequestException or JsonException || e is OperationCanceledException && !ct.IsCancellationRequested)
        {
            logger.LogWarning(e, "ZaloPay {Action} outcome is ambiguous for transaction {TransactionId}", action, values.GetValueOrDefault("app_trans_id"));
            throw new PaymentGatewayException($"Không kết nối được ZaloPay sandbox khi {action}. Hãy kiểm tra trạng thái trước khi thử lại.", ambiguous: action == "create", innerException: e);
        }
    }

    public static bool IsSandboxGateway(string? value) => Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
        uri.Scheme == "https" && string.IsNullOrEmpty(uri.UserInfo) &&
        uri.Host is "qcgateway.zalopay.vn" or "sbgateway.zalopay.vn";
    private static bool IsHttps(string? value) => Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme == "https" && string.IsNullOrEmpty(uri.UserInfo);
    private static bool IsReturnUrl(string? value) => IsHttps(value) ||
        Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme == "http" && uri.IsLoopback;
    private static string Sign(string input, string key) => Convert.ToHexStringLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes(key), Encoding.UTF8.GetBytes(input)));
    private static bool ValidMac(string input, string received, string key)
    {
        try { return received.Length == 64 && CryptographicOperations.FixedTimeEquals(Convert.FromHexString(Sign(input, key)), Convert.FromHexString(received)); }
        catch (FormatException) { return false; }
    }
}

public sealed class PaymentGatewayException(string message, bool ambiguous = false, Exception? innerException = null) : Exception(message, innerException)
{
    public bool Ambiguous { get; } = ambiguous;
}
