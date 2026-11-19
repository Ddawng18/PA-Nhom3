using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Linea.Api.Services;
using Microsoft.Extensions.Configuration;

namespace Linea.Api.Tests;

internal static class PaymentUnitTests
{
    public static async Task<int> RunAsync()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ZALOPAY_APP_ID"] = "1234", ["ZALOPAY_KEY1"] = "test-only-key1", ["ZALOPAY_KEY2"] = "test-only-key2",
            ["ZALOPAY_CALLBACK_URL"] = "https://merchant.example/api/payments/zalopay/callback",
            ["ZALOPAY_RETURN_PAGE_URL"] = "http://localhost:5173/orders",
        }).Build();
        var gateway = new FakeGateway();
        var service = new ZaloPayPaymentService(config, gateway);
        var passed = 0;
        void Check(bool value, string name)
        {
            if (!value) throw new InvalidOperationException(name);
            Console.WriteLine($"PASS {name}"); passed++;
        }
        string Sign(string input, string key) => Convert.ToHexStringLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes(key), Encoding.UTF8.GetBytes(input)));
        try
        {
            Check(service.IsConfigured, "complete sandbox configuration");
            var user = Guid.Parse("11111111-1111-4111-8111-111111111111");
            var created = DateTimeOffset.Parse("2026-11-18T18:00:00Z");
            var values = service.CreateParameters(42, user, 30000, created);
            Check(values["app_trans_id"] == "261119_linea_42", "transaction date uses UTC+7 midnight");
            Check(values["amount"] == "30000" && values["app_user"] == user.ToString("N"), "server order amount and user");
            var canonical = $"1234|261119_linea_42|{user:N}|30000|{created.ToUnixTimeMilliseconds()}|{values["embed_data"]}|[]";
            Check(values["mac"] == Sign(canonical, "test-only-key1"), "create HMAC field order and key1");
            Check(service.ReturnPageUrl(42).Contains("payment=zalopay_return") && service.ReturnPageUrl(42).Contains("orderId=42"), "return page carries order only, never trusted success");
            var data = JsonSerializer.Serialize(new { app_id = 1234, app_trans_id = "261119_linea_42", app_user = user.ToString("N"), amount = 30000 });
            var mac = Sign(data, "test-only-key2");
            Check(service.VerifyCallback(data, mac)?.Amount == 30000, "valid callback key2 accepted");
            Check(service.VerifyCallback(data, Sign(data, "test-only-key1")) is null, "key1 cannot authenticate callbacks");
            Check(service.VerifyCallback(data.Replace("30000", "1"), mac) is null, "tampered callback amount rejected");
            Check(service.VerifyCallback(data, "zz") is null, "malformed signature rejected");
            var otherApp = data.Replace("1234", "9999");
            Check(service.VerifyCallback(otherApp, Sign(otherApp, "test-only-key2")) is null, "signed callback for another app rejected");
            Check(service.VerifyCallback("{}", Sign("{}", "test-only-key2")) is null, "signed incomplete callback rejected");
            Check(!ZaloPayPaymentService.IsSandboxGateway("https://qcgateway.zalopay.vn.attacker.example/pay"), "gateway suffix attack rejected");
            Check(!ZaloPayPaymentService.IsSandboxGateway("https://evil@qcgateway.zalopay.vn/pay"), "gateway userinfo rejected");
            gateway.Response = "{\"return_code\":1,\"order_url\":\"https://qcgateway.zalopay.vn/openinapp?order=test\"}";
            var url = await service.CreateAsync(42, user, 30000, created, default);
            Check(url.StartsWith("https://qcgateway.zalopay.vn/"), "sandbox checkout URL accepted");
            Check(gateway.LastUrl == "https://sb-openapi.zalopay.vn/v2/create", "create is pinned to sandbox API");
            gateway.Response = "{\"return_code\":1,\"amount\":30000}";
            var query = await service.QueryAsync("261119_linea_42", default);
            Check(query.Succeeded && query.Amount == 30000, "query returns authoritative amount");
            Check(gateway.LastForm!.Contains(Uri.EscapeDataString(Sign("1234|261119_linea_42|test-only-key1", "test-only-key1"))), "query MAC uses key1 in both key and input");
            gateway.Response = "{\"return_code\":3,\"is_processing\":true}";
            Check(!(await service.QueryAsync("261119_linea_42", default)).Succeeded, "pending provider result is not success");
            gateway.Response = "{\"return_code\":2,\"is_processing\":false}";
            var failed = await service.QueryAsync("261119_linea_42", default);
            Check(failed.Failed && !failed.Succeeded, "authoritative failed provider result is not success");
            gateway.Response = "{\"return_code\":1,\"order_url\":\"https://attacker.example/pay\"}";
            var rejected = false;
            try { await service.CreateAsync(42, user, 30000, created, default); } catch (PaymentGatewayException) { rejected = true; }
            Check(rejected, "unexpected checkout host rejected");
            config["ZALOPAY_CALLBACK_URL"] = "http://merchant.example/callback";
            Check(!service.IsConfigured, "non-HTTPS public callback rejected");
            Console.WriteLine($"{passed}/{passed} payment unit checks passed.");
            return 0;
        }
        catch (Exception e) { Console.WriteLine($"FAIL {e.Message}"); return 1; }
    }

    private sealed class FakeGateway : HttpMessageHandler, IHttpClientFactory
    {
        public string Response { get; set; } = "{}";
        public string? LastUrl { get; private set; }
        public string? LastForm { get; private set; }
        public HttpClient CreateClient(string name) => new(this, disposeHandler: false);
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            LastUrl = request.RequestUri!.ToString(); LastForm = await request.Content!.ReadAsStringAsync(ct);
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(Response, Encoding.UTF8, "application/json") };
        }
    }
}
