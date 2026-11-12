using Linea.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<LearningCourse> LearningCourses => Set<LearningCourse>();
    public DbSet<CourseEnrollment> CourseEnrollments => Set<CourseEnrollment>();
    public DbSet<CourseChapter> CourseChapters => Set<CourseChapter>();
    public DbSet<CourseLesson> CourseLessons => Set<CourseLesson>();
    public DbSet<LessonProgress> LessonProgress => Set<LessonProgress>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<AssignmentSubmission> Submissions => Set<AssignmentSubmission>();
    public DbSet<SubmissionGrade> Grades => Set<SubmissionGrade>();

    public DbSet<TeacherProfile> TeacherProfiles => Set<TeacherProfile>();

    public DbSet<PortfolioImage> PortfolioImages => Set<PortfolioImage>();

    public DbSet<NotificationMessage> Notifications => Set<NotificationMessage>();

    public DbSet<StatusHistoryEntry> StatusHistory => Set<StatusHistoryEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var user = modelBuilder.Entity<User>();

        user.ToTable("users");
        user.HasKey(item => item.Id);

        user.Property(item => item.Email)
            .HasMaxLength(254)
            .IsRequired();
        user.HasIndex(item => item.Email).IsUnique();

        user.Property(item => item.DisplayName).HasMaxLength(100);
        user.Property(item => item.PasswordHash)
            .HasMaxLength(255)
            .IsRequired();

        user.Property(item => item.Role)
            .HasConversion<string>()
            .HasMaxLength(16)
            .IsRequired()
            .HasDefaultValue(UserRole.Student);

        user.Property(item => item.CreatedAt).IsRequired();
        user.Property(item => item.UpdatedAt).IsRequired();

        var course = modelBuilder.Entity<Course>();
        course.ToTable("courses");
        course.HasKey(item => item.Id);
        course.Property(item => item.Name).HasMaxLength(200).IsRequired();
        course.Property(item => item.Description).HasMaxLength(4000);
        course.Property(item => item.CoverImageUrl).HasMaxLength(1000);
        course.Property(item => item.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        course.Property(item => item.OwnerId).HasMaxLength(255).IsRequired();
        course.HasIndex(item => item.OwnerId);
        course.HasIndex(item => item.Status);
        course.Property(item => item.CreatedAt).HasDefaultValueSql("timezone('utc', now())");
        course.Property(item => item.UpdatedAt).HasDefaultValueSql("timezone('utc', now())");

        var learningCourse = modelBuilder.Entity<LearningCourse>();
        learningCourse.ToTable("khoa_hoc");
        learningCourse.HasKey(item => item.Id);
        learningCourse.Property(item => item.Id).HasColumnName("ma_khoa_hoc");
        learningCourse.Property(item => item.TeacherId).HasColumnName("ma_giao_vien").IsRequired();
        learningCourse.Property(item => item.Title).HasColumnName("tieu_de").HasMaxLength(200).IsRequired();
        learningCourse.Property(item => item.Level).HasColumnName("cap_do").HasMaxLength(30).IsRequired();
        learningCourse.Property(item => item.Topic).HasColumnName("chu_de").HasMaxLength(100).IsRequired();
        learningCourse.Property(item => item.Description).HasColumnName("mo_ta").IsRequired();
        learningCourse.Property(item => item.CoverImage).HasColumnName("anh_dai_dien").HasMaxLength(500);
        learningCourse.Property(item => item.Status).HasColumnName("trang_thai").HasMaxLength(20).IsRequired();
        learningCourse.Property(item => item.CreatedAt).HasColumnName("ngay_tao").IsRequired();
        learningCourse.HasIndex(item => item.TeacherId);

        var enrollment = modelBuilder.Entity<CourseEnrollment>();
        enrollment.ToTable("ghi_danh");
        enrollment.HasKey(item => new { item.UserId, item.CourseId });
        enrollment.Property(item => item.UserId).HasColumnName("ma_nguoi_dung");
        enrollment.Property(item => item.CourseId).HasColumnName("ma_khoa_hoc");
        enrollment.Property(item => item.Status).HasColumnName("trang_thai").HasMaxLength(20).IsRequired();
        enrollment.Property(item => item.EnrolledAt).HasColumnName("ngay_ghi_danh").IsRequired();
        enrollment.Property(item => item.CompletedAt).HasColumnName("ngay_hoan_thanh");

        var chapter = modelBuilder.Entity<CourseChapter>();
        chapter.ToTable("chuong");
        chapter.HasKey(item => item.Id);
        chapter.Property(item => item.Id).HasColumnName("ma_chuong");
        chapter.Property(item => item.CourseId).HasColumnName("ma_khoa_hoc").IsRequired();
        chapter.Property(item => item.Title).HasColumnName("tieu_de").HasMaxLength(200).IsRequired();
        chapter.Property(item => item.Order).HasColumnName("thu_tu").IsRequired();

        var lesson = modelBuilder.Entity<CourseLesson>();
        lesson.ToTable("bai_hoc");
        lesson.HasKey(item => item.Id);
        lesson.Property(item => item.Id).HasColumnName("ma_bai_hoc");
        lesson.Property(item => item.ChapterId).HasColumnName("ma_chuong").IsRequired();
        lesson.Property(item => item.Title).HasColumnName("tieu_de").HasMaxLength(200).IsRequired();
        lesson.Property(item => item.Order).HasColumnName("thu_tu").IsRequired();
        lesson.Property(item => item.TextContent).HasColumnName("noi_dung_van_ban");
        lesson.Property(item => item.ImagePath).HasColumnName("duong_dan_anh").HasMaxLength(500);
        lesson.Property(item => item.VideoUrl).HasColumnName("lien_ket_video").HasMaxLength(500);
        lesson.Property(item => item.Required).HasColumnName("bat_buoc").IsRequired();

        var progress = modelBuilder.Entity<LessonProgress>();
        progress.ToTable("tien_do_bai_hoc");
        progress.HasKey(item => new { item.UserId, item.LessonId });
        progress.Property(item => item.UserId).HasColumnName("ma_nguoi_dung");
        progress.Property(item => item.LessonId).HasColumnName("ma_bai_hoc");
        progress.Property(item => item.Status).HasColumnName("trang_thai").HasMaxLength(30).IsRequired();
        progress.Property(item => item.StartedAt).HasColumnName("ngay_bat_dau");
        progress.Property(item => item.CompletedAt).HasColumnName("ngay_hoan_thanh");

        var teacherProfile = modelBuilder.Entity<TeacherProfile>();
        var assignment = modelBuilder.Entity<Assignment>();
        assignment.ToTable("bai_tap");
        assignment.HasKey(x => x.Id);
        assignment.Property(x => x.Id).HasColumnName("ma_bai_tap");
        assignment.Property(x => x.LessonId).HasColumnName("ma_bai_hoc");
        assignment.Property(x => x.Prompt).HasColumnName("de_bai").IsRequired();
        assignment.Property(x => x.Deadline).HasColumnName("han_nop");
        assignment.Property(x => x.Required).HasColumnName("bat_buoc");
        assignment.HasIndex(x => x.LessonId);
        assignment.HasOne<CourseLesson>().WithMany().HasForeignKey(x => x.LessonId).OnDelete(DeleteBehavior.Cascade);
        var submission = modelBuilder.Entity<AssignmentSubmission>();
        submission.ToTable("bai_nop");
        submission.HasKey(x => x.Id);
        submission.Property(x => x.Id).HasColumnName("ma_bai_nop");
        submission.Property(x => x.AssignmentId).HasColumnName("ma_bai_tap");
        submission.Property(x => x.UserId).HasColumnName("ma_nguoi_dung");
        submission.Property(x => x.ImagePath).HasColumnName("duong_dan_anh").HasMaxLength(500).IsRequired();
        submission.Property(x => x.Status).HasColumnName("trang_thai").HasMaxLength(20).IsRequired();
        submission.Property(x => x.SubmittedAt).HasColumnName("ngay_nop");
        submission.Property(x => x.UpdatedAt).HasColumnName("ngay_cap_nhat").IsConcurrencyToken();
        submission.HasIndex(x => new { x.AssignmentId, x.UserId }).IsUnique();
        submission.HasIndex(x => x.UserId);
        submission.HasOne<Assignment>().WithMany().HasForeignKey(x => x.AssignmentId).OnDelete(DeleteBehavior.Cascade);
        var grade = modelBuilder.Entity<SubmissionGrade>();
        grade.ToTable("ket_qua_cham");
        grade.HasKey(x => x.Id);
        grade.Property(x => x.Id).HasColumnName("ma_ket_qua");
        grade.Property(x => x.SubmissionId).HasColumnName("ma_bai_nop");
        grade.Property(x => x.GraderId).HasColumnName("ma_nguoi_cham");
        grade.Property(x => x.Score).HasColumnName("diem").HasPrecision(4, 2);
        grade.Property(x => x.Feedback).HasColumnName("nhan_xet").IsRequired();
        grade.Property(x => x.GradedAt).HasColumnName("ngay_cham");
        grade.HasIndex(x => x.SubmissionId).IsUnique();
        grade.HasOne<AssignmentSubmission>().WithMany().HasForeignKey(x => x.SubmissionId).OnDelete(DeleteBehavior.Cascade);

        teacherProfile.ToTable("ho_so_giao_vien");
        teacherProfile.HasKey(item => item.Id);
        teacherProfile.Property(item => item.Id).HasColumnName("ma_ho_so");
        teacherProfile.Property(item => item.UserId).HasColumnName("ma_nguoi_dung").IsRequired();
        teacherProfile.Property(item => item.Introduction).HasColumnName("gioi_thieu").IsRequired();
        teacherProfile.Property(item => item.Experience).HasColumnName("kinh_nghiem").IsRequired();
        teacherProfile.Property(item => item.Status).HasColumnName("trang_thai").HasMaxLength(20).IsRequired();
        teacherProfile.Property(item => item.RejectionReason).HasColumnName("ly_do_tu_choi");
        teacherProfile.Property(item => item.SupplementReason).HasColumnName("ly_do_bo_sung");
        teacherProfile.Property(item => item.ReasonCode).HasColumnName("ma_ly_do").HasMaxLength(50);
        teacherProfile.Property(item => item.InternalNote).HasColumnName("ghi_chu_noi_bo");
        teacherProfile.Property(item => item.FieldsToUpdate).HasColumnName("truong_can_bo_sung");
        teacherProfile.Property(item => item.SubmittedAt).HasColumnName("ngay_gui").IsRequired();
        teacherProfile.Property(item => item.ReviewedAt).HasColumnName("ngay_duyet");
        teacherProfile.HasIndex(item => item.UserId).IsUnique();
        teacherProfile.HasMany(item => item.PortfolioImages)
            .WithOne(item => item.Profile!)
            .HasForeignKey(item => item.ProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        var portfolioImage = modelBuilder.Entity<PortfolioImage>();
        portfolioImage.ToTable("anh_tac_pham");
        portfolioImage.HasKey(item => item.Id);
        portfolioImage.Property(item => item.Id).HasColumnName("ma_anh");
        portfolioImage.Property(item => item.ProfileId).HasColumnName("ma_ho_so").IsRequired();
        portfolioImage.Property(item => item.FilePath).HasColumnName("duong_dan_anh").HasMaxLength(500).IsRequired();
        portfolioImage.Property(item => item.UploadedAt).HasColumnName("ngay_tai_len").IsRequired();
        portfolioImage.HasIndex(item => item.ProfileId);

        var notification = modelBuilder.Entity<NotificationMessage>();
        notification.ToTable("thong_bao");
        notification.HasKey(item => item.Id);
        notification.Property(item => item.Id).HasColumnName("ma_thong_bao");
        notification.Property(item => item.UserId).HasColumnName("ma_nguoi_dung").IsRequired();
        notification.Property(item => item.Type).HasColumnName("loai_thong_bao").HasMaxLength(50).IsRequired();
        notification.Property(item => item.Content).HasColumnName("noi_dung").IsRequired();
        notification.Property(item => item.Link).HasColumnName("duong_dan_lien_ket").HasMaxLength(500);
        notification.Property(item => item.IsRead).HasColumnName("da_doc").IsRequired();
        notification.Property(item => item.CreatedAt).HasColumnName("ngay_tao").IsRequired();
        notification.HasIndex(item => item.UserId);

        var statusHistory = modelBuilder.Entity<StatusHistoryEntry>();
        statusHistory.ToTable("lich_su_trang_thai");
        statusHistory.HasKey(item => item.Id);
        statusHistory.Property(item => item.Id).HasColumnName("ma_lich_su");
        statusHistory.Property(item => item.ObjectType).HasColumnName("loai_doi_tuong").HasMaxLength(50).IsRequired();
        statusHistory.Property(item => item.ObjectId).HasColumnName("ma_doi_tuong").HasMaxLength(100).IsRequired();
        statusHistory.Property(item => item.PreviousStatus).HasColumnName("trang_thai_cu").HasMaxLength(50);
        statusHistory.Property(item => item.Status).HasColumnName("trang_thai_moi").HasMaxLength(50).IsRequired();
        statusHistory.Property(item => item.ActorId).HasColumnName("ma_nguoi_thuc_hien").IsRequired();
        statusHistory.Property(item => item.Reason).HasColumnName("ly_do");
        statusHistory.Property(item => item.ReasonCode).HasColumnName("ma_ly_do").HasMaxLength(50);
        statusHistory.Property(item => item.InternalNote).HasColumnName("ghi_chu_noi_bo");
        statusHistory.Property(item => item.FieldsToUpdate).HasColumnName("truong_can_bo_sung");
        statusHistory.Property(item => item.OccurredAt).HasColumnName("ngay_thuc_hien").IsRequired();
        statusHistory.HasIndex(item => new { item.ObjectType, item.ObjectId });
        statusHistory.HasIndex(item => item.ActorId);
    }
}
