using System.Data;
using System.Data.Common;
using Linea.Api.Contracts;
using Linea.Api.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Linea.Api.Services;

public sealed class AdminSchemaNotReadyException(string message) : Exception(message);

public sealed class AdminVersionConflictException() : Exception("Dữ liệu đã thay đổi. Tải lại trước khi thao tác.");

public sealed class AdminInvalidStateException(string message) : Exception(message);

// PB16 / S6-08. Supabase mode reads and writes the real nguoi_dung/khoa_hoc
// tables through the trusted server connection. The browser never writes these
// columns directly.
public sealed class AdminManagementService(AppDbContext db, ILogger<AdminManagementService> logger)
{
    public bool IsSupported => db.Database.IsNpgsql();

    public async Task<AdminUserPage> ListUsersAsync(
        string? search,
        string? role,
        bool? locked,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        EnsureSupported();
        var (connection, wasClosed) = await PostgresAdminHelpers.OpenAsync(db, cancellationToken);
        try
        {
            var normalizedSearch = NormalizeSearch(search);
            var pattern = normalizedSearch is null ? null : $"%{normalizedSearch}%";
            const string where = """
                from auth.users u
                left join public.nguoi_dung n on n.id = u.id
                where (@search is null or u.email ilike @pattern or n.display_name ilike @pattern)
                  and (@role is null or n.role::text = @role)
                  and (@locked is null or coalesce((to_jsonb(n) ->> 'is_locked')::boolean, false) = @locked)
                """;

            var total = await PostgresAdminHelpers.ScalarLongAsync(
                connection, $"select count(*) {where}", command =>
                {
                    PostgresAdminHelpers.AddParameter(command, "search", normalizedSearch, DbType.String);
                    PostgresAdminHelpers.AddParameter(command, "pattern", pattern, DbType.String);
                    PostgresAdminHelpers.AddParameter(command, "role", role, DbType.String);
                    PostgresAdminHelpers.AddParameter(command, "locked", locked, DbType.Boolean);
                }, null, cancellationToken);

            var items = new List<AdminUserItem>();
            await using var command = PostgresAdminHelpers.CreateCommand(connection, $"""
                select u.id,
                       coalesce(u.email, ''),
                       n.display_name,
                       coalesce(n.role::text, 'student'),
                       coalesce((to_jsonb(n) ->> 'is_locked')::boolean, false),
                       coalesce((to_jsonb(n) ->> 'lock_version')::int, 1),
                       coalesce(nullif(to_jsonb(n) ->> 'created_at', '')::timestamptz, u.created_at)
                {where}
                order by u.created_at desc, u.id
                offset @offset limit @limit
                """);
            PostgresAdminHelpers.AddParameter(command, "search", normalizedSearch, DbType.String);
            PostgresAdminHelpers.AddParameter(command, "pattern", pattern, DbType.String);
            PostgresAdminHelpers.AddParameter(command, "role", role, DbType.String);
            PostgresAdminHelpers.AddParameter(command, "locked", locked, DbType.Boolean);
            PostgresAdminHelpers.AddParameter(command, "offset", (page - 1) * pageSize, DbType.Int32);
            PostgresAdminHelpers.AddParameter(command, "limit", pageSize, DbType.Int32);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                items.Add(new AdminUserItem(
                    reader.GetGuid(0),
                    reader.GetString(1),
                    reader.IsDBNull(2) ? null : reader.GetString(2),
                    reader.GetString(3),
                    reader.GetBoolean(4),
                    reader.GetInt32(5),
                    PostgresAdminHelpers.ReadTimestamp(reader, 6) ?? DateTimeOffset.UtcNow));
            }

            return new AdminUserPage(items, page, pageSize, (int)total);
        }
        catch (PostgresException exception) when (IsSchemaError(exception))
        {
            throw SchemaNotReady(exception);
        }
        finally
        {
            await PostgresAdminHelpers.CloseAsync(connection, wasClosed);
        }
    }

    public async Task<AdminUserDetail> GetUserAsync(Guid id, CancellationToken cancellationToken)
    {
        EnsureSupported();
        var (connection, wasClosed) = await PostgresAdminHelpers.OpenAsync(db, cancellationToken);
        try
        {
            AdminUserDetail? user = null;
            await using (var command = PostgresAdminHelpers.CreateCommand(connection, """
                select u.id,
                       coalesce(u.email, ''),
                       n.display_name,
                       n.avatar_url,
                       coalesce(n.role::text, 'student'),
                       coalesce((to_jsonb(n) ->> 'is_locked')::boolean, false),
                       to_jsonb(n) ->> 'locked_reason',
                       nullif(to_jsonb(n) ->> 'locked_at', '')::timestamptz,
                       coalesce((to_jsonb(n) ->> 'lock_version')::int, 1),
                       coalesce(nullif(to_jsonb(n) ->> 'created_at', '')::timestamptz, u.created_at)
                from auth.users u
                left join public.nguoi_dung n on n.id = u.id
                where u.id = @id
                """))
            {
                PostgresAdminHelpers.AddParameter(command, "id", id, DbType.Guid);
                await using var reader = await command.ExecuteReaderAsync(cancellationToken);
                if (await reader.ReadAsync(cancellationToken))
                {
                    user = new AdminUserDetail(
                        reader.GetGuid(0),
                        reader.GetString(1),
                        reader.IsDBNull(2) ? null : reader.GetString(2),
                        reader.IsDBNull(3) ? null : reader.GetString(3),
                        reader.GetString(4),
                        reader.GetBoolean(5),
                        reader.IsDBNull(6) ? null : reader.GetString(6),
                        PostgresAdminHelpers.ReadTimestamp(reader, 7),
                        reader.GetInt32(8),
                        PostgresAdminHelpers.ReadTimestamp(reader, 9) ?? DateTimeOffset.UtcNow,
                        []);
                }
            }

            if (user is null) throw new KeyNotFoundException("Không tìm thấy tài khoản.");
            var history = await ReadHistoryAsync(connection, "NGUOI_DUNG", id.ToString(), null, cancellationToken);
            return user with { History = history };
        }
        catch (PostgresException exception) when (IsSchemaError(exception))
        {
            throw SchemaNotReady(exception);
        }
        finally
        {
            await PostgresAdminHelpers.CloseAsync(connection, wasClosed);
        }
    }

    public async Task<AdminUserDetail> SetUserLockAsync(
        Guid actorId,
        Guid targetId,
        bool isLocked,
        string reason,
        int expectedVersion,
        CancellationToken cancellationToken)
    {
        EnsureSupported();
        await using (var transaction = await db.Database.BeginTransactionAsync(cancellationToken))
        {
            var (connection, wasClosed) = await PostgresAdminHelpers.OpenAsync(db, cancellationToken);
            try
            {
                if (!await PostgresAdminHelpers.ColumnExistsAsync(
                        connection, "nguoi_dung", "is_locked", transaction, cancellationToken) ||
                    !await PostgresAdminHelpers.ColumnExistsAsync(
                        connection, "nguoi_dung", "lock_version", transaction, cancellationToken))
                {
                    throw new AdminSchemaNotReadyException(
                        "Chưa áp dụng migration quản trị (nguoi_dung.is_locked/lock_version).");
                }

                var previous = await ReadLockStateAsync(connection, targetId, transaction, cancellationToken)
                    ?? throw new KeyNotFoundException("Không tìm thấy tài khoản.");

                if (isLocked && string.Equals(previous.Role, "admin", StringComparison.OrdinalIgnoreCase))
                    throw new AdminInvalidStateException("Không thể khóa tài khoản quản trị.");

                if (previous.IsLocked != isLocked)
                {
                    if (previous.Version != expectedVersion) throw new AdminVersionConflictException();

                    var changed = await PostgresAdminHelpers.ExecuteAsync(connection, """
                        update public.nguoi_dung
                        set is_locked = @locked,
                            locked_reason = @reason,
                            locked_at = case when @locked then now() else null end,
                            lock_version = lock_version + 1
                        where id = @id and lock_version = @version
                        """, command =>
                        {
                            PostgresAdminHelpers.AddParameter(command, "locked", isLocked, DbType.Boolean);
                            PostgresAdminHelpers.AddParameter(command, "reason", reason, DbType.String);
                            PostgresAdminHelpers.AddParameter(command, "id", targetId, DbType.Guid);
                            PostgresAdminHelpers.AddParameter(command, "version", expectedVersion, DbType.Int32);
                        }, transaction, cancellationToken);
                    if (changed == 0) throw new AdminVersionConflictException();

                    await InsertHistoryAsync(
                        connection,
                        "NGUOI_DUNG",
                        targetId.ToString(),
                        previous.IsLocked ? "DA_KHOA" : "DANG_HOAT_DONG",
                        isLocked ? "DA_KHOA" : "DANG_HOAT_DONG",
                        actorId,
                        reason,
                        transaction,
                        cancellationToken);
                }

                await transaction.CommitAsync(cancellationToken);
            }
            catch (PostgresException exception) when (IsSchemaError(exception))
            {
                throw SchemaNotReady(exception);
            }
            finally
            {
                await PostgresAdminHelpers.CloseAsync(connection, wasClosed);
            }
        }

        return await GetUserAsync(targetId, cancellationToken);
    }

    public async Task<AdminUserDetail> SetUserRoleAsync(
        Guid actorId,
        Guid targetId,
        string role,
        string reason,
        int? expectedVersion,
        CancellationToken cancellationToken)
    {
        EnsureSupported();
        await using (var transaction = await db.Database.BeginTransactionAsync(cancellationToken))
        {
            var (connection, wasClosed) = await PostgresAdminHelpers.OpenAsync(db, cancellationToken);
            try
            {
                if (!await PostgresAdminHelpers.ColumnExistsAsync(
                        connection, "nguoi_dung", "lock_version", transaction, cancellationToken))
                {
                    throw new AdminSchemaNotReadyException(
                        "Chưa áp dụng migration quản trị (nguoi_dung.lock_version).");
                }

                var previous = await ReadLockStateAsync(connection, targetId, transaction, cancellationToken)
                    ?? throw new KeyNotFoundException("Không tìm thấy tài khoản.");
                if (previous.Version != (expectedVersion ?? previous.Version))
                    throw new AdminVersionConflictException();

                if (!string.Equals(previous.Role, role, StringComparison.Ordinal))
                {
                    var changed = await PostgresAdminHelpers.ExecuteAsync(connection, """
                        update public.nguoi_dung
                        set role = @role::public.app_role,
                            lock_version = lock_version + 1
                        where id = @id and lock_version = @version
                        """, command =>
                        {
                            PostgresAdminHelpers.AddParameter(command, "role", role, DbType.String);
                            PostgresAdminHelpers.AddParameter(command, "id", targetId, DbType.Guid);
                            PostgresAdminHelpers.AddParameter(command, "version", previous.Version, DbType.Int32);
                        }, transaction, cancellationToken);
                    if (changed == 0) throw new AdminVersionConflictException();

                    await InsertHistoryAsync(
                        connection,
                        "NGUOI_DUNG",
                        targetId.ToString(),
                        previous.Role,
                        role,
                        actorId,
                        reason,
                        transaction,
                        cancellationToken);
                }

                await transaction.CommitAsync(cancellationToken);
            }
            catch (PostgresException exception) when (IsSchemaError(exception))
            {
                throw SchemaNotReady(exception);
            }
            finally
            {
                await PostgresAdminHelpers.CloseAsync(connection, wasClosed);
            }
        }

        return await GetUserAsync(targetId, cancellationToken);
    }

    public async Task<AdminCoursePage> ListCoursesAsync(
        string? search,
        string? status,
        bool? hidden,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        EnsureSupported();
        var (connection, wasClosed) = await PostgresAdminHelpers.OpenAsync(db, cancellationToken);
        try
        {
            var normalizedSearch = NormalizeSearch(search);
            var pattern = normalizedSearch is null ? null : $"%{normalizedSearch}%";
            const string where = """
                from public.khoa_hoc k
                left join public.nguoi_dung n on n.id = k.ma_giao_vien
                where (@search is null or k.tieu_de ilike @pattern or n.display_name ilike @pattern)
                  and (@status is null or k.trang_thai = @status)
                  and (@hidden is null or (k.trang_thai = 'AN') = @hidden)
                """;

            var total = await PostgresAdminHelpers.ScalarLongAsync(
                connection, $"select count(*) {where}", command =>
                {
                    PostgresAdminHelpers.AddParameter(command, "search", normalizedSearch, DbType.String);
                    PostgresAdminHelpers.AddParameter(command, "pattern", pattern, DbType.String);
                    PostgresAdminHelpers.AddParameter(command, "status", status, DbType.String);
                    PostgresAdminHelpers.AddParameter(command, "hidden", hidden, DbType.Boolean);
                }, null, cancellationToken);

            var items = new List<AdminCourseItem>();
            await using var command = PostgresAdminHelpers.CreateCommand(connection, """
                select k.ma_khoa_hoc,
                       k.tieu_de,
                       k.ma_giao_vien,
                       n.display_name,
                       u.email,
                       k.cap_do,
                       k.chu_de,
                       k.trang_thai,
                       (k.trang_thai = 'AN'),
                       coalesce(nullif(to_jsonb(k) ->> 'visibility_version', '')::int, 1),
                       coalesce(nullif(to_jsonb(k) ->> 'gia_vnd', '')::bigint, 0),
                       (select count(*) from public.ghi_danh g
                         where g.ma_khoa_hoc = k.ma_khoa_hoc and g.trang_thai <> 'DA_HUY')::int,
                       (select count(*) from public.chuong c where c.ma_khoa_hoc = k.ma_khoa_hoc)::int,
                       k.ngay_tao,
                       nullif(to_jsonb(k) ->> 'ngay_cap_nhat', '')::timestamptz
                from public.khoa_hoc k
                left join public.nguoi_dung n on n.id = k.ma_giao_vien
                left join auth.users u on u.id = k.ma_giao_vien
                where (@search is null or k.tieu_de ilike @pattern or n.display_name ilike @pattern)
                  and (@status is null or k.trang_thai = @status)
                  and (@hidden is null or (k.trang_thai = 'AN') = @hidden)
                order by k.ngay_tao desc, k.ma_khoa_hoc desc
                offset @offset limit @limit
                """);
            PostgresAdminHelpers.AddParameter(command, "search", normalizedSearch, DbType.String);
            PostgresAdminHelpers.AddParameter(command, "pattern", pattern, DbType.String);
            PostgresAdminHelpers.AddParameter(command, "status", status, DbType.String);
            PostgresAdminHelpers.AddParameter(command, "hidden", hidden, DbType.Boolean);
            PostgresAdminHelpers.AddParameter(command, "offset", (page - 1) * pageSize, DbType.Int32);
            PostgresAdminHelpers.AddParameter(command, "limit", pageSize, DbType.Int32);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                items.Add(new AdminCourseItem(
                    reader.GetInt64(0),
                    reader.GetString(1),
                    reader.GetGuid(2),
                    reader.IsDBNull(3) ? null : reader.GetString(3),
                    reader.IsDBNull(4) ? null : reader.GetString(4),
                    reader.GetString(5),
                    reader.GetString(6),
                    reader.GetString(7),
                    reader.GetBoolean(8),
                    reader.GetInt32(9),
                    reader.GetInt64(10),
                    reader.GetInt32(11),
                    reader.GetInt32(12),
                    PostgresAdminHelpers.ReadTimestamp(reader, 13) ?? DateTimeOffset.UtcNow,
                    PostgresAdminHelpers.ReadTimestamp(reader, 14)));
            }

            return new AdminCoursePage(items, page, pageSize, (int)total);
        }
        catch (PostgresException exception) when (IsSchemaError(exception))
        {
            throw SchemaNotReady(exception);
        }
        finally
        {
            await PostgresAdminHelpers.CloseAsync(connection, wasClosed);
        }
    }

    public async Task<AdminCourseDetail> GetCourseAsync(long id, CancellationToken cancellationToken)
    {
        EnsureSupported();
        var (connection, wasClosed) = await PostgresAdminHelpers.OpenAsync(db, cancellationToken);
        try
        {
            AdminCourseDetail? course = null;
            await using (var command = PostgresAdminHelpers.CreateCommand(connection, """
                select k.ma_khoa_hoc,
                       k.tieu_de,
                       k.mo_ta,
                       k.ma_giao_vien,
                       n.display_name,
                       u.email,
                       k.cap_do,
                       k.chu_de,
                       k.anh_dai_dien,
                       k.trang_thai,
                       (k.trang_thai = 'AN'),
                       coalesce(nullif(to_jsonb(k) ->> 'visibility_version', '')::int, 1),
                       coalesce(nullif(to_jsonb(k) ->> 'gia_vnd', '')::bigint, 0),
                       (select count(*) from public.ghi_danh g
                         where g.ma_khoa_hoc = k.ma_khoa_hoc and g.trang_thai <> 'DA_HUY')::int,
                       (select count(*) from public.chuong c where c.ma_khoa_hoc = k.ma_khoa_hoc)::int,
                       (select count(*) from public.bai_hoc l join public.chuong c on c.ma_chuong = l.ma_chuong
                         where c.ma_khoa_hoc = k.ma_khoa_hoc)::int,
                       (select count(*) from public.bai_tap a join public.bai_hoc l on l.ma_bai_hoc = a.ma_bai_hoc
                         join public.chuong c on c.ma_chuong = l.ma_chuong
                         where c.ma_khoa_hoc = k.ma_khoa_hoc)::int,
                       (select count(*) from public.bai_nop s join public.bai_tap a on a.ma_bai_tap = s.ma_bai_tap
                         join public.bai_hoc l on l.ma_bai_hoc = a.ma_bai_hoc
                         join public.chuong c on c.ma_chuong = l.ma_chuong
                         where c.ma_khoa_hoc = k.ma_khoa_hoc)::int,
                       (select count(*) from public.ket_qua_cham q join public.bai_nop s on s.ma_bai_nop = q.ma_bai_nop
                         join public.bai_tap a on a.ma_bai_tap = s.ma_bai_tap
                         join public.bai_hoc l on l.ma_bai_hoc = a.ma_bai_hoc
                         join public.chuong c on c.ma_chuong = l.ma_chuong
                         where c.ma_khoa_hoc = k.ma_khoa_hoc)::int,
                       k.ngay_tao,
                       nullif(to_jsonb(k) ->> 'ngay_cap_nhat', '')::timestamptz
                from public.khoa_hoc k
                left join public.nguoi_dung n on n.id = k.ma_giao_vien
                left join auth.users u on u.id = k.ma_giao_vien
                where k.ma_khoa_hoc = @id
                """))
            {
                PostgresAdminHelpers.AddParameter(command, "id", id, DbType.Int64);
                await using var reader = await command.ExecuteReaderAsync(cancellationToken);
                if (await reader.ReadAsync(cancellationToken))
                {
                    course = new AdminCourseDetail(
                        reader.GetInt64(0),
                        reader.GetString(1),
                        reader.IsDBNull(2) ? null : reader.GetString(2),
                        reader.GetGuid(3),
                        reader.IsDBNull(4) ? null : reader.GetString(4),
                        reader.IsDBNull(5) ? null : reader.GetString(5),
                        reader.GetString(6),
                        reader.GetString(7),
                        reader.IsDBNull(8) ? null : reader.GetString(8),
                        reader.GetString(9),
                        reader.GetBoolean(10),
                        reader.GetInt32(11),
                        reader.GetInt64(12),
                        reader.GetInt32(13),
                        reader.GetInt32(14),
                        reader.GetInt32(15),
                        reader.GetInt32(16),
                        reader.GetInt32(17),
                        reader.GetInt32(18),
                        PostgresAdminHelpers.ReadTimestamp(reader, 19) ?? DateTimeOffset.UtcNow,
                        PostgresAdminHelpers.ReadTimestamp(reader, 20),
                        []);
                }
            }

            if (course is null) throw new KeyNotFoundException("Không tìm thấy khóa học.");
            var history = await ReadHistoryAsync(connection, "KHOA_HOC", id.ToString(), null, cancellationToken);
            return course with { History = history };
        }
        catch (PostgresException exception) when (IsSchemaError(exception))
        {
            throw SchemaNotReady(exception);
        }
        finally
        {
            await PostgresAdminHelpers.CloseAsync(connection, wasClosed);
        }
    }

    public async Task<AdminCourseDetail> SetCourseVisibilityAsync(
        Guid actorId,
        long id,
        bool hidden,
        string reason,
        int expectedVersion,
        CancellationToken cancellationToken)
    {
        EnsureSupported();
        await using (var transaction = await db.Database.BeginTransactionAsync(cancellationToken))
        {
            var (connection, wasClosed) = await PostgresAdminHelpers.OpenAsync(db, cancellationToken);
            try
            {
                if (!await PostgresAdminHelpers.ColumnExistsAsync(
                        connection, "khoa_hoc", "visibility_version", transaction, cancellationToken) ||
                    !await PostgresAdminHelpers.ColumnExistsAsync(
                        connection, "khoa_hoc", "ngay_cap_nhat", transaction, cancellationToken))
                {
                    throw new AdminSchemaNotReadyException(
                        "Chưa áp dụng migration quản trị (khoa_hoc.visibility_version/ngay_cap_nhat).");
                }

                var current = await ReadCourseVisibilityAsync(connection, id, transaction, cancellationToken)
                    ?? throw new KeyNotFoundException("Không tìm thấy khóa học.");
                var targetStatus = hidden ? "AN" : "DA_DANG";
                if (current.Status is not ("DA_DANG" or "AN"))
                {
                    throw new AdminInvalidStateException(
                        "Chỉ ẩn/hiện khóa đã đăng. Khóa nháp hoặc đã gỡ dùng quy trình duyệt riêng.");
                }

                if (current.Status != targetStatus)
                {
                    if (current.Version != expectedVersion) throw new AdminVersionConflictException();

                    var changed = await PostgresAdminHelpers.ExecuteAsync(connection, """
                        update public.khoa_hoc
                        set trang_thai = @status,
                            visibility_version = visibility_version + 1,
                            ngay_cap_nhat = now()
                        where ma_khoa_hoc = @id and visibility_version = @version
                        """, command =>
                        {
                            PostgresAdminHelpers.AddParameter(command, "status", targetStatus, DbType.String);
                            PostgresAdminHelpers.AddParameter(command, "id", id, DbType.Int64);
                            PostgresAdminHelpers.AddParameter(command, "version", expectedVersion, DbType.Int32);
                        }, transaction, cancellationToken);
                    if (changed == 0) throw new AdminVersionConflictException();

                    await InsertHistoryAsync(
                        connection,
                        "KHOA_HOC",
                        id.ToString(),
                        current.Status,
                        targetStatus,
                        actorId,
                        reason,
                        transaction,
                        cancellationToken);
                    await PostgresAdminHelpers.ExecuteAsync(connection, """
                        insert into public.thong_bao
                            (ma_nguoi_dung, loai_thong_bao, noi_dung, duong_dan_lien_ket, da_doc, ngay_tao)
                        values
                            (@teacher, 'KHOA_HOC', @content, @link, false, now())
                        """, command =>
                        {
                            PostgresAdminHelpers.AddParameter(command, "teacher", current.TeacherId, DbType.Guid);
                            PostgresAdminHelpers.AddParameter(command, "content",
                                hidden ? "Khóa học của bạn đã được quản trị viên tạm ẩn." : "Khóa học của bạn đã được hiển thị lại.",
                                DbType.String);
                            PostgresAdminHelpers.AddParameter(command, "link", $"/teacher/courses/{id}/edit", DbType.String);
                        }, transaction, cancellationToken);
                }

                await transaction.CommitAsync(cancellationToken);
            }
            catch (PostgresException exception) when (IsSchemaError(exception))
            {
                throw SchemaNotReady(exception);
            }
            finally
            {
                await PostgresAdminHelpers.CloseAsync(connection, wasClosed);
            }
        }

        return await GetCourseAsync(id, cancellationToken);
    }

    private static async Task<(bool IsLocked, int Version, string Role)?> ReadLockStateAsync(
        DbConnection connection,
        Guid id,
        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction,
        CancellationToken cancellationToken)
    {
        await using var command = PostgresAdminHelpers.CreateCommand(connection, """
            select coalesce((to_jsonb(n) ->> 'is_locked')::boolean, false),
                   coalesce((to_jsonb(n) ->> 'lock_version')::int, 1),
                   n.role::text
            from public.nguoi_dung n
            where n.id = @id
            for update
            """, transaction);
        PostgresAdminHelpers.AddParameter(command, "id", id, DbType.Guid);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken)
            ? (reader.GetBoolean(0), reader.GetInt32(1), reader.GetString(2))
            : null;
    }

    private static async Task<(string Status, int Version, Guid TeacherId)?> ReadCourseVisibilityAsync(
        DbConnection connection,
        long id,
        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction,
        CancellationToken cancellationToken)
    {
        await using var command = PostgresAdminHelpers.CreateCommand(connection, """
            select trang_thai, visibility_version, ma_giao_vien
            from public.khoa_hoc
            where ma_khoa_hoc = @id
            for update
            """, transaction);
        PostgresAdminHelpers.AddParameter(command, "id", id, DbType.Int64);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken)
            ? (reader.GetString(0), reader.GetInt32(1), reader.GetGuid(2))
            : null;
    }

    private static async Task InsertHistoryAsync(
        DbConnection connection,
        string objectType,
        string objectId,
        string previousStatus,
        string status,
        Guid actorId,
        string reason,
        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction,
        CancellationToken cancellationToken)
    {
        await PostgresAdminHelpers.ExecuteAsync(connection, """
            insert into public.lich_su_trang_thai
                (loai_doi_tuong, ma_doi_tuong, trang_thai_cu, trang_thai_moi,
                 ma_nguoi_thuc_hien, ly_do, ngay_thuc_hien)
            values
                (@type, @object_id, @previous, @status, @actor, @reason, now())
            """, command =>
            {
                PostgresAdminHelpers.AddParameter(command, "type", objectType, DbType.String);
                PostgresAdminHelpers.AddParameter(command, "object_id", objectId, DbType.String);
                PostgresAdminHelpers.AddParameter(command, "previous", previousStatus, DbType.String);
                PostgresAdminHelpers.AddParameter(command, "status", status, DbType.String);
                PostgresAdminHelpers.AddParameter(command, "actor", actorId, DbType.Guid);
                PostgresAdminHelpers.AddParameter(command, "reason", reason, DbType.String);
            }, transaction, cancellationToken);
    }

    private static async Task<IReadOnlyList<AdminHistoryItem>> ReadHistoryAsync(
        DbConnection connection,
        string objectType,
        string objectId,
        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? transaction,
        CancellationToken cancellationToken)
    {
        var result = new List<AdminHistoryItem>();
        await using var command = PostgresAdminHelpers.CreateCommand(connection, """
            select trang_thai_cu, trang_thai_moi, ly_do, ma_ly_do, ghi_chu_noi_bo,
                   ma_nguoi_thuc_hien, ngay_thuc_hien
            from public.lich_su_trang_thai
            where loai_doi_tuong = @type and ma_doi_tuong = @object_id
            order by ngay_thuc_hien desc, ma_lich_su desc
            limit 50
            """, transaction);
        PostgresAdminHelpers.AddParameter(command, "type", objectType, DbType.String);
        PostgresAdminHelpers.AddParameter(command, "object_id", objectId, DbType.String);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            result.Add(new AdminHistoryItem(
                reader.IsDBNull(0) ? null : reader.GetString(0),
                reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                reader.GetGuid(5),
                PostgresAdminHelpers.ReadTimestamp(reader, 6) ?? DateTimeOffset.UtcNow));
        }

        return result;
    }

    private static string? NormalizeSearch(string? search) =>
        string.IsNullOrWhiteSpace(search) ? null : search.Trim();

    private static bool IsSchemaError(PostgresException exception) =>
        exception.SqlState is PostgresErrorCodes.UndefinedTable or PostgresErrorCodes.UndefinedColumn;

    private AdminSchemaNotReadyException SchemaNotReady(PostgresException exception)
    {
        logger.LogError(exception, "Admin schema is not ready.");
        return new AdminSchemaNotReadyException(
            "Schema quản trị chưa sẵn sàng. Áp dụng migration Sprint 6 đã được review.");
    }

    private void EnsureSupported()
    {
        if (!IsSupported)
        {
            throw new AdminSchemaNotReadyException(
                "Quản trị Supabase yêu cầu SUPABASE_DB_URL và không chạy trên SQLite legacy.");
        }
    }
}
