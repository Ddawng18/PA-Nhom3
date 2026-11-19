using System.Text.Json.Serialization;

namespace Linea.Api.Contracts;

public sealed record CatalogCourseItem(
    [property: JsonPropertyName("ma_khoa_hoc")] long Id,
    [property: JsonPropertyName("tieu_de")] string Title,
    [property: JsonPropertyName("mo_ta")] string Description,
    [property: JsonPropertyName("cap_do")] string Level,
    [property: JsonPropertyName("chu_de")] string Topic,
    [property: JsonPropertyName("anh_dai_dien")] string? CoverImage,
    [property: JsonPropertyName("ma_giao_vien")] Guid TeacherId,
    [property: JsonPropertyName("ten_giao_vien")] string? TeacherName,
    [property: JsonPropertyName("gia_vnd")] long? PriceVnd,
    [property: JsonPropertyName("so_chuong")] int ChapterCount,
    [property: JsonPropertyName("so_bai_hoc")] int LessonCount,
    [property: JsonPropertyName("so_hoc_vien")] int StudentCount,
    [property: JsonPropertyName("ngay_tao")] DateTimeOffset CreatedAt);

public sealed record CatalogTopic(
    [property: JsonPropertyName("chu_de")] string Topic,
    [property: JsonPropertyName("so_khoa_hoc")] int CourseCount);

public sealed record CatalogListResponse(
    [property: JsonPropertyName("items")] IReadOnlyList<CatalogCourseItem> Items,
    [property: JsonPropertyName("page")] int Page,
    [property: JsonPropertyName("pageSize")] int PageSize,
    [property: JsonPropertyName("totalCount")] int TotalCount,
    [property: JsonPropertyName("chu_de")] IReadOnlyList<CatalogTopic> Topics);

public sealed record CatalogLesson(
    [property: JsonPropertyName("ma_bai_hoc")] long Id,
    [property: JsonPropertyName("tieu_de")] string Title,
    [property: JsonPropertyName("thu_tu")] int Order,
    [property: JsonPropertyName("bat_buoc")] bool Required);

public sealed record CatalogChapter(
    [property: JsonPropertyName("ma_chuong")] long Id,
    [property: JsonPropertyName("tieu_de")] string Title,
    [property: JsonPropertyName("thu_tu")] int Order,
    [property: JsonPropertyName("bai_hoc")] IReadOnlyList<CatalogLesson> Lessons);

public sealed record CatalogDetailResponse(
    [property: JsonPropertyName("khoa_hoc")] CatalogCourseItem Course,
    [property: JsonPropertyName("chuong")] IReadOnlyList<CatalogChapter> Chapters,
    [property: JsonPropertyName("khoa_hoc_cung_chu_de")] IReadOnlyList<CatalogCourseItem> Related);
