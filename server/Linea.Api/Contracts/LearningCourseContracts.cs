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
}

public sealed record LearningCourseResponse(
    [property: JsonPropertyName("ma_khoa_hoc")] long Id,
    [property: JsonPropertyName("ma_giao_vien")] Guid TeacherId,
    [property: JsonPropertyName("tieu_de")] string Title,
    [property: JsonPropertyName("mo_ta")] string Description,
    [property: JsonPropertyName("cap_do")] string Level,
    [property: JsonPropertyName("chu_de")] string Topic,
    [property: JsonPropertyName("anh_dai_dien")] string? CoverImage,
    [property: JsonPropertyName("trang_thai")] string Status,
    [property: JsonPropertyName("ngay_tao")] DateTimeOffset CreatedAt)
{
    public static LearningCourseResponse From(LearningCourse course) => new(
        course.Id, course.TeacherId, course.Title, course.Description, course.Level,
        course.Topic, course.CoverImage, course.Status, course.CreatedAt);
}
