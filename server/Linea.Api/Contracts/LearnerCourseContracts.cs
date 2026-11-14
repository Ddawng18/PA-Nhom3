using System.Text.Json.Serialization;

namespace Linea.Api.Contracts;

public sealed record LearnerLessonSummary(
    [property: JsonPropertyName("ma_bai_hoc")] long Id,
    [property: JsonPropertyName("tieu_de")] string Title,
    [property: JsonPropertyName("thu_tu")] int Order,
    [property: JsonPropertyName("trang_thai")] string Status);

public sealed record LearnerChapterSummary(
    [property: JsonPropertyName("ma_chuong")] long Id,
    [property: JsonPropertyName("tieu_de")] string Title,
    [property: JsonPropertyName("thu_tu")] int Order,
    [property: JsonPropertyName("bai_hoc")] IReadOnlyList<LearnerLessonSummary> Lessons);

public sealed record LearnerCourseResponse(
    [property: JsonPropertyName("ma_khoa_hoc")] long Id,
    [property: JsonPropertyName("tieu_de")] string Title,
    [property: JsonPropertyName("mo_ta")] string Description,
    [property: JsonPropertyName("cap_do")] string Level,
    [property: JsonPropertyName("chu_de")] string Topic,
    [property: JsonPropertyName("anh_dai_dien")] string? CoverImage,
    [property: JsonPropertyName("ma_giao_vien")] Guid TeacherId,
    [property: JsonPropertyName("da_ghi_danh")] bool Enrolled,
    [property: JsonPropertyName("phan_tram")] int Percent,
    [property: JsonPropertyName("chuong")] IReadOnlyList<LearnerChapterSummary> Chapters,
    [property: JsonPropertyName("trang_thai_ghi_danh")] string? EnrollmentStatus);

public sealed record LearnerLessonResponse(
    [property: JsonPropertyName("ma_bai_hoc")] long Id,
    [property: JsonPropertyName("ma_khoa_hoc")] long CourseId,
    [property: JsonPropertyName("ma_chuong")] long ChapterId,
    [property: JsonPropertyName("tieu_de")] string Title,
    [property: JsonPropertyName("noi_dung_van_ban")] string? TextContent,
    [property: JsonPropertyName("duong_dan_anh")] string? ImagePath,
    [property: JsonPropertyName("lien_ket_video")] string? VideoUrl,
    [property: JsonPropertyName("bat_buoc")] bool Required,
    [property: JsonPropertyName("trang_thai")] string Status,
    [property: JsonPropertyName("phan_tram")] int Percent);

public sealed record UpdateLessonProgressRequest(
    [property: JsonPropertyName("trang_thai")] string Status);
