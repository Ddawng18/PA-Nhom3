using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Linea.Api.Models;

namespace Linea.Api.Contracts;

public sealed class SaveLearningCourseRequest
{
    [JsonPropertyName("tieu_de"), Required, StringLength(200, MinimumLength = 5)]
    public string Title { get; set; } = "";
    [JsonPropertyName("mo_ta"), Required, StringLength(5000, MinimumLength = 50)]
    public string Description { get; set; } = "";
    [JsonPropertyName("cap_do"), Required, RegularExpression("^(CO_BAN|TRUNG_CAP|NANG_CAO)$")]
    public string Level { get; set; } = "";
    [JsonPropertyName("chu_de"), Required, StringLength(100, MinimumLength = 2)]
    public string Topic { get; set; } = "";
    [JsonPropertyName("anh_dai_dien"), MaxLength(500)]
    public string? CoverImage { get; set; }
    [JsonPropertyName("gia_vnd"), Range(0, 1000000000)]
    public long? PriceVnd { get; set; }
    [JsonPropertyName("thoi_luong"), StringLength(50)]
    public string? DurationText { get; set; }
    [JsonPropertyName("ngay_khai_giang")]
    public DateOnly? StartDate { get; set; }
}

public sealed record LearningCourseResponse(
    [property: JsonPropertyName("ma_khoa_hoc")] long Id,
    [property: JsonPropertyName("ma_giao_vien")] Guid TeacherId,
    [property: JsonPropertyName("tieu_de")] string Title,
    [property: JsonPropertyName("mo_ta")] string Description,
    [property: JsonPropertyName("cap_do")] string Level,
    [property: JsonPropertyName("chu_de")] string Topic,
    [property: JsonPropertyName("anh_dai_dien")] string? CoverImage,
    [property: JsonPropertyName("gia_vnd")] long PriceVnd,
    [property: JsonPropertyName("thoi_luong")] string? DurationText,
    [property: JsonPropertyName("ngay_khai_giang")] DateOnly? StartDate,
    [property: JsonPropertyName("trang_thai")] string Status,
    [property: JsonPropertyName("ngay_tao")] DateTimeOffset CreatedAt)
{
    public static LearningCourseResponse From(LearningCourse course) => new(
        course.Id, course.TeacherId, course.Title, course.Description, course.Level,
        course.Topic, course.CoverImage, course.PriceVnd, course.DurationText, course.StartDate,
        course.Status, course.CreatedAt);
}
