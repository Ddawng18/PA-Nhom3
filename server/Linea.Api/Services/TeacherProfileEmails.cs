using System.Text;

namespace Linea.Api.Services;

public static class TeacherProfileEmails
{
    public const string SubmittedSubject = "[LINEA] Hồ sơ giáo viên đã được gửi";
    public const string DecisionSubject = "[LINEA] Kết quả duyệt hồ sơ giáo viên";

    public static string SubmittedBody(string? displayName, bool resubmission)
    {
        var builder = new StringBuilder();
        builder.AppendLine($"Xin chào {Name(displayName)},");
        builder.AppendLine();
        builder.AppendLine(resubmission
            ? "Hồ sơ giáo viên của bạn đã được gửi lại và đang chờ quản trị viên duyệt."
            : "Hồ sơ giáo viên của bạn đã được gửi và đang chờ quản trị viên duyệt.");
        builder.AppendLine("Bạn có thể theo dõi trạng thái tại LINEA.");
        AppendFooter(builder);
        return builder.ToString();
    }

    public static string ApprovedBody(string? displayName)
    {
        var builder = new StringBuilder();
        builder.AppendLine($"Xin chào {Name(displayName)},");
        builder.AppendLine();
        builder.AppendLine("Chúc mừng! Hồ sơ giáo viên của bạn đã được duyệt.");
        builder.AppendLine("Bạn có thể bắt đầu tạo khóa học trên LINEA.");
        AppendFooter(builder);
        return builder.ToString();
    }

    public static string RejectedBody(string? displayName, string reason)
    {
        var builder = new StringBuilder();
        builder.AppendLine($"Xin chào {Name(displayName)},");
        builder.AppendLine();
        builder.AppendLine("Hồ sơ giáo viên của bạn đã được xem xét và hiện chưa được duyệt.");
        builder.AppendLine($"Lý do: {reason}");
        builder.AppendLine("Bạn có thể đăng nhập LINEA, chỉnh sửa hồ sơ và gửi lại.");
        AppendFooter(builder);
        return builder.ToString();
    }

    public static string ChangesRequestedBody(string? displayName, string reason, IReadOnlyList<string> fields)
    {
        var builder = new StringBuilder();
        builder.AppendLine($"Xin chào {Name(displayName)},");
        builder.AppendLine();
        builder.AppendLine("Hồ sơ giáo viên của bạn cần bổ sung thông tin trước khi được duyệt.");
        builder.AppendLine($"Lý do: {reason}");
        if (fields.Count > 0)
        {
            builder.AppendLine($"Vui lòng cập nhật: {FieldsLabel(fields)}.");
        }

        builder.AppendLine("Bạn có thể đăng nhập LINEA, chỉnh sửa hồ sơ và gửi lại.");
        AppendFooter(builder);
        return builder.ToString();
    }

    public static string FieldsLabel(IReadOnlyList<string> fields)
    {
        var labels = fields.Select(field => field switch
        {
            "introduction" => "giới thiệu",
            "experience" => "kinh nghiệm",
            "portfolioFiles" => "ảnh tác phẩm",
            _ => field
        });
        return string.Join(", ", labels);
    }

    private static string Name(string? displayName) =>
        string.IsNullOrWhiteSpace(displayName) ? "bạn" : displayName;

    private static void AppendFooter(StringBuilder builder)
    {
        builder.AppendLine();
        builder.AppendLine("Nếu cần hỗ trợ, vui lòng liên hệ quản trị viên.");
        builder.AppendLine("Trân trọng,");
        builder.AppendLine("LINEA");
    }
}
