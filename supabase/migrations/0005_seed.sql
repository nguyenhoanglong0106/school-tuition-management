-- Migration 0005: Realistic Seed Data for Demo & Development

-- 1. System Settings
INSERT INTO public.system_settings (id, school_name, slogan, address, phone, email, brand_color)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Trung Tâm Bồi Dưỡng Văn Hóa Trí Đức',
    'Chắp cánh ước mơ tri thức - Khơi nguồn tương lai vững bước',
    'Số 188 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
    '0909 123 456',
    'contact@triduc-edu.vn',
    '#4F46E5'
) ON CONFLICT (id) DO NOTHING;

-- 2. Bank Accounts
INSERT INTO public.bank_accounts (id, bank_name, bank_code, account_number, account_holder, branch, is_default, is_active)
VALUES 
    ('10000000-0000-0000-0000-000000000001', 'Ngân hàng Quân Đội (MB Bank)', 'MB', '0909123456888', 'TRUNG TAM TRI DUC', 'Chi nhánh Sài Gòn', true, true),
    ('10000000-0000-0000-0000-000000000002', 'Ngân hàng Ngoại Thương (Vietcombank)', 'VCB', '0071001234567', 'NGUYEN VAN QUAN LY', 'Chi nhánh Bến Thành', false, true)
ON CONFLICT (id) DO NOTHING;

-- Update default bank account in settings
UPDATE public.system_settings 
SET default_bank_account_id = '10000000-0000-0000-0000-000000000001'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 3. Financial Categories
INSERT INTO public.financial_categories (id, name, type, is_active)
VALUES 
    -- Income
    ('20000000-0000-0000-0000-000000000001', 'Học phí', 'INCOME', true),
    ('20000000-0000-0000-0000-000000000002', 'Tiền tài liệu & Giáo trình', 'INCOME', true),
    ('20000000-0000-0000-0000-000000000003', 'Phí nhập học & Thi thử', 'INCOME', true),
    ('20000000-0000-0000-0000-000000000004', 'Thu khác', 'INCOME', true),
    -- Expense
    ('20000000-0000-0000-0000-000000000005', 'Thuê phòng học & Mặt bằng', 'EXPENSE', true),
    ('20000000-0000-0000-0000-000000000006', 'Tiền điện nước & Internet', 'EXPENSE', true),
    ('20000000-0000-0000-0000-000000000007', 'Lương giáo viên & Trợ giảng', 'EXPENSE', true),
    ('20000000-0000-0000-0000-000000000008', 'In ấn & Tài liệu học tập', 'EXPENSE', true),
    ('20000000-0000-0000-0000-000000000009', 'Thiết bị & Sửa chữa cơ sở vật chất', 'EXPENSE', true),
    ('20000000-0000-0000-0000-000000000010', 'Chi khác', 'EXPENSE', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Subjects
INSERT INTO public.subjects (id, code, name, description, is_active)
VALUES 
    ('30000000-0000-0000-0000-000000000001', 'TOAN', 'Toán Học', 'Toán THCS & THPT, Luyện thi Chuyên, Luyện thi Đại học', true),
    ('30000000-0000-0000-0000-000000000002', 'LY', 'Vật Lý', 'Vật lý 10, 11, 12 và luyện đề thi THPT Quốc Gia', true),
    ('30000000-0000-0000-0000-000000000003', 'HOA', 'Hóa Học', 'Hóa vô cơ, hữu cơ và chuyên đề giải nhanh', true),
    ('30000000-0000-0000-0000-000000000004', 'ANH', 'Tiếng Anh', 'Tiếng Anh SGK, IELTS Foundation, Luyện thi vào 10 & ĐH', true),
    ('30000000-0000-0000-0000-000000000005', 'VAN', 'Ngữ Văn', 'Rèn kỹ năng nghị luận văn học và nghị luận xã hội', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Teachers
INSERT INTO public.teachers (id, teacher_code, full_name, phone, email, address, status, notes)
VALUES 
    ('40000000-0000-0000-0000-000000000001', 'GV000001', 'Thầy Nguyễn Văn An', '0912345678', 'an.nguyen@triduc-edu.vn', 'Quận 3, TP.HCM', 'ACTIVE', 'Thạc sĩ Toán học ĐH Sư Phạm, 10 năm kinh nghiệm luyện thi ĐH'),
    ('40000000-0000-0000-0000-000000000002', 'GV000002', 'Cô Trần Thị Bích', '0923456789', 'bich.tran@triduc-edu.vn', 'Quận 1, TP.HCM', 'ACTIVE', 'Cử nhân Anh văn, IELTS 8.0, chuyên gia bồi dưỡng học sinh giỏi'),
    ('40000000-0000-0000-0000-000000000003', 'GV000003', 'Thầy Lê Hoàng Nam', '0934567890', 'nam.le@triduc-edu.vn', 'Quận 5, TP.HCM', 'ACTIVE', 'Giáo viên trường Chuyên, giải Nhì QG môn Vật Lý')
ON CONFLICT (id) DO NOTHING;

-- 6. Classes
INSERT INTO public.classes (id, class_code, class_name, subject_id, teacher_id, tuition_fee, fee_cycle, start_date, end_date, capacity, room, description, status)
VALUES 
    ('50000000-0000-0000-0000-000000000001', 'TOAN-12A', 'Toán 12 - Luyện Thi Đại Học Top Đầu', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 900000, 'MONTHLY', '2026-08-01', '2027-06-30', 25, 'Phòng 101', 'Chương trình rèn luyện hàm số, hình không gian và kỹ năng giải trắc nghiệm tốc độ cao', 'ACTIVE'),
    ('50000000-0000-0000-0000-000000000002', 'ANH-10A', 'Tiếng Anh 10 - Nâng Cao & IELTS Basic', '30000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000002', 850000, 'MONTHLY', '2026-08-01', '2027-05-31', 20, 'Phòng 202 (Lab)', 'Tăng cường 4 kỹ năng Nghe - Nói - Đọc - Viết và củng cố ngữ pháp chuyên sâu', 'ACTIVE'),
    ('50000000-0000-0000-0000-000000000003', 'LY-11A', 'Vật Lý 11 - Khám Phá Hiện Tượng', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003', 800000, 'MONTHLY', '2026-08-01', '2027-05-31', 20, 'Phòng 103', 'Vật lý điện từ trường, quang hình và thí nghiệm thực tiễn', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 7. Recurring Schedules
INSERT INTO public.class_schedules (class_id, day_of_week, start_time, end_time, room, is_active)
VALUES 
    ('50000000-0000-0000-0000-000000000001', 2, '18:00:00', '19:30:00', 'Phòng 101', true), -- Thứ 3
    ('50000000-0000-0000-0000-000000000001', 4, '18:00:00', '19:30:00', 'Phòng 101', true), -- Thứ 5
    ('50000000-0000-0000-0000-000000000002', 3, '19:30:00', '21:00:00', 'Phòng 202', true), -- Thứ 4
    ('50000000-0000-0000-0000-000000000002', 5, '19:30:00', '21:00:00', 'Phòng 202', true), -- Thứ 6
    ('50000000-0000-0000-0000-000000000003', 1, '18:00:00', '19:30:00', 'Phòng 103', true), -- Thứ 2
    ('50000000-0000-0000-0000-000000000003', 3, '18:00:00', '19:30:00', 'Phòng 103', true)  -- Thứ 4
ON CONFLICT DO NOTHING;

-- 8. Students
INSERT INTO public.students (id, student_code, full_name, date_of_birth, gender, school_name, school_class, phone, email, address, parent_name, parent_phone, parent_email, status, join_date, notes)
VALUES 
    ('60000000-0000-0000-0000-000000000001', 'HS000001', 'Phạm Minh Khang', '2008-05-15', 'Nam', 'THPT Lê Hồng Phong', '12A1', '0981112233', 'khang.pham@gmail.com', '12 Võ Văn Tần, Q.3, TP.HCM', 'Phạm Văn Hùng', '0981999888', 'hung.pham@gmail.com', 'ACTIVE', '2026-08-01', 'Học sinh giỏi Toán thành phố'),
    ('60000000-0000-0000-0000-000000000002', 'HS000002', 'Nguyễn Ngọc Bảo Trâm', '2008-09-20', 'Nữ', 'THPT Bùi Thị Xuân', '12A4', '0982223344', 'tram.nguyen@gmail.com', '45 Cống Quỳnh, Q.1, TP.HCM', 'Lê Thị Thu Thủy', '0982999777', 'thuy.le@gmail.com', 'ACTIVE', '2026-08-01', 'Học lực Khá, cần kèm kỹ bài tập hình học'),
    ('60000000-0000-0000-0000-000000000003', 'HS000003', 'Đặng Quốc Huy', '2010-03-10', 'Nam', 'THCS & THPT Trần Đại Nghĩa', '10 chuyên', '0983334455', 'huy.dang@gmail.com', '78 Hai Bà Trưng, Q.1, TP.HCM', 'Đặng Minh Tuấn', '0983999666', 'tuan.dang@gmail.com', 'ACTIVE', '2026-08-01', 'Mục tiêu thi chứng chỉ IELTS 7.5'),
    ('60000000-0000-0000-0000-000000000004', 'HS000004', 'Vũ Quỳnh Chi', '2009-11-28', 'Nữ', 'THPT Nguyễn Thị Minh Khai', '11A2', '0984445566', 'chi.vu@gmail.com', '99 Nguyễn Đình Chiểu, Q.3, TP.HCM', 'Nguyễn Hồng Hạnh', '0984999555', 'hanh.nguyen@gmail.com', 'ACTIVE', '2026-08-01', 'Yêu thích môn Lý, tiếp thu rất nhanh'),
    ('60000000-0000-0000-0000-000000000005', 'HS000005', 'Trần Hoàng Đức', '2008-07-04', 'Nam', 'THPT Marie Curie', '12B3', '0985556677', 'duc.tran@gmail.com', '156 Nam Kỳ Khởi Nghĩa, Q.3, TP.HCM', 'Trần Thanh Sơn', '0985999444', 'son.tran@gmail.com', 'ACTIVE', '2026-08-01', 'Được miễn giảm 100k học phí học sinh nghèo hiếu học')
ON CONFLICT (id) DO NOTHING;

-- 9. Class Students Enrollment
INSERT INTO public.class_students (class_id, student_id, joined_date, status, custom_tuition_fee, discount_amount, notes)
VALUES 
    ('50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '2026-08-01', 'ACTIVE', NULL, 0, 'Đăng ký đầy đủ'),
    ('50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', '2026-08-01', 'ACTIVE', NULL, 0, 'Đăng ký đầy đủ'),
    ('50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000005', '2026-08-01', 'ACTIVE', NULL, 100000, 'Ưu đãi học sinh hiếu học'),
    ('50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003', '2026-08-01', 'ACTIVE', NULL, 0, 'Đăng ký đầy đủ'),
    ('50000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000004', '2026-08-01', 'ACTIVE', NULL, 0, 'Đăng ký đầy đủ')
ON CONFLICT DO NOTHING;

-- 10. Sample Class Sessions (Current Week)
INSERT INTO public.class_sessions (id, class_id, session_date, start_time, end_time, room, status, notes)
VALUES 
    ('70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', CURRENT_DATE, '18:00:00', '19:30:00', 'Phòng 101', 'SCHEDULED', 'Chuyên đề Khảo sát hàm số nâng cao'),
    ('70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', CURRENT_DATE + INTERVAL '1 day', '19:30:00', '21:00:00', 'Phòng 202', 'SCHEDULED', 'Speaking & Listening Practice Unit 1'),
    ('70000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', CURRENT_DATE - INTERVAL '1 day', '18:00:00', '19:30:00', 'Phòng 103', 'COMPLETED', 'Định luật Cu-lông và điện trường')
ON CONFLICT (id) DO NOTHING;

-- 11. Sample Attendance for past session
INSERT INTO public.attendance (session_id, student_id, status, check_in_time, note)
VALUES 
    ('70000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000004', 'PRESENT', (CURRENT_DATE - INTERVAL '1 day' + TIME '17:55:00')::TIMESTAMPTZ, 'Đúng giờ, làm bài tập đầy đủ')
ON CONFLICT DO NOTHING;

-- 12. Student Fees for Current Month (Tháng 08/2026)
INSERT INTO public.student_fees (id, fee_code, student_id, class_id, year, month, period_label, original_amount, discount_amount, final_amount, paid_amount, remaining_amount, due_date, status, note)
VALUES 
    ('80000000-0000-0000-0000-000000000001', 'HP082026000001', '60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 2026, 8, 'Tháng 08/2026', 900000, 0, 900000, 900000, 0, '2026-08-25', 'PAID', 'Đã thanh toán chuyển khoản qua QR VietQR'),
    ('80000000-0000-0000-0000-000000000002', 'HP082026000002', '60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 2026, 8, 'Tháng 08/2026', 900000, 0, 900000, 0, 900000, '2026-08-25', 'UNPAID', 'Chờ phụ huynh chuyển khoản'),
    ('80000000-0000-0000-0000-000000000003', 'HP082026000003', '60000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000001', 2026, 8, 'Tháng 08/2026', 900000, 100000, 800000, 400000, 400000, '2026-08-25', 'PARTIAL', 'Đã đóng đợt 1 400k'),
    ('80000000-0000-0000-0000-000000000004', 'HP082026000004', '60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', 2026, 8, 'Tháng 08/2026', 850000, 0, 850000, 0, 850000, '2026-08-25', 'UNPAID', 'Khoản học phí tháng 8'),
    ('80000000-0000-0000-0000-000000000005', 'HP082026000005', '60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', 2026, 8, 'Tháng 08/2026', 800000, 0, 800000, 800000, 0, '2026-08-20', 'PAID', 'Đã thu tiền mặt tại quầy')
ON CONFLICT (id) DO NOTHING;

-- 13. Payments
INSERT INTO public.payments (id, payment_code, student_fee_id, student_id, amount, payment_method, payment_date, transaction_reference, note, status)
VALUES 
    ('90000000-0000-0000-0000-000000000001', 'PT082026000001', '80000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 900000, 'BANK_TRANSFER', NOW() - INTERVAL '2 days', 'FT2622591823', 'Chuyển khoản VietQR MB Bank', 'CONFIRMED'),
    ('90000000-0000-0000-0000-000000000002', 'PT082026000002', '80000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000005', 400000, 'CASH', NOW() - INTERVAL '1 day', 'TM-8005', 'Đóng tiền mặt đợt 1', 'CONFIRMED'),
    ('90000000-0000-0000-0000-000000000003', 'PT082026000003', '80000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000003', 850000, 'BANK_TRANSFER', NOW() - INTERVAL '2 hours', 'FT2622998811', 'Phụ huynh đã CK, đính kèm biên lai', 'PENDING'),
    ('90000000-0000-0000-0000-000000000004', 'PT082026000004', '80000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000004', 800000, 'CASH', NOW() - INTERVAL '3 days', 'TM-8004', 'Thu tiền mặt tại văn phòng', 'CONFIRMED')
ON CONFLICT (id) DO NOTHING;

-- 14. Financial Transactions
INSERT INTO public.financial_transactions (id, transaction_code, type, category_id, amount, transaction_date, payment_method, payment_id, reference, description)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'TH082026000001', 'INCOME', '20000000-0000-0000-0000-000000000001', 900000, CURRENT_DATE - INTERVAL '2 days', 'BANK_TRANSFER', '90000000-0000-0000-0000-000000000001', 'PT082026000001', 'Thu học phí: HP082026000001 - Học viên: Phạm Minh Khang'),
    ('a0000000-0000-0000-0000-000000000002', 'TH082026000002', 'INCOME', '20000000-0000-0000-0000-000000000001', 400000, CURRENT_DATE - INTERVAL '1 day', 'CASH', '90000000-0000-0000-0000-000000000002', 'PT082026000002', 'Thu học phí đợt 1: HP082026000003 - Học viên: Trần Hoàng Đức'),
    ('a0000000-0000-0000-0000-000000000003', 'TH082026000003', 'INCOME', '20000000-0000-0000-0000-000000000001', 800000, CURRENT_DATE - INTERVAL '3 days', 'CASH', '90000000-0000-0000-0000-000000000004', 'PT082026000004', 'Thu học phí: HP082026000005 - Học viên: Vũ Quỳnh Chi'),
    ('a0000000-0000-0000-0000-000000000004', 'CH082026000001', 'EXPENSE', '20000000-0000-0000-0000-000000000006', 450000, CURRENT_DATE - INTERVAL '4 days', 'BANK_TRANSFER', NULL, 'HD-DIEN-08', 'Thanh toán tiền điện phòng học máy lạnh'),
    ('a0000000-0000-0000-0000-000000000005', 'CH082026000002', 'EXPENSE', '20000000-0000-0000-0000-000000000008', 320000, CURRENT_DATE - INTERVAL '2 days', 'CASH', NULL, 'IN-TL-08', 'In đề cương ôn tập Toán 12 và IELTS Foundation')
ON CONFLICT (id) DO NOTHING;

-- 15. Documents
INSERT INTO public.documents (id, title, description, subject_id, file_name, original_name, file_path, mime_type, file_size, visibility)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'Đề Cương Ôn Tập Khảo Sát Hàm Số & Cực Trị', 'Bộ 100 câu trắc nghiệm vận dụng cao kèm lời giải chi tiết', '30000000-0000-0000-0000-000000000001', 'de_cuong_toan_12_ham_so.pdf', 'De_Cuong_Toan_12_Ham_So.pdf', 'docs/de_cuong_toan_12_ham_so.pdf', 'application/pdf', 2457600, 'CLASS'),
    ('b0000000-0000-0000-0000-000000000002', 'Cẩm Nang Từ Vựng IELTS 3000 Words', 'Tổng hợp từ vựng học thuật thông dụng phân theo các chủ đề trọng điểm', '30000000-0000-0000-0000-000000000004', 'ielts_vocabulary_handbook.pdf', 'IELTS_Vocabulary_Handbook.pdf', 'docs/ielts_vocabulary_handbook.pdf', 'application/pdf', 3891200, 'CLASS'),
    ('b0000000-0000-0000-0000-000000000003', 'Nội Quy & Lịch Thi Khảo Sát Định Kỳ 2026-2027', 'Quy định về thời gian, chuyên cần và hình thức kiểm tra đánh giá chất lượng', NULL, 'noi_quy_trung_tam_2026.pdf', 'Noi_Quy_Trung_Tam_2026.pdf', 'docs/noi_quy_trung_tam_2026.pdf', 'application/pdf', 1024000, 'ALL')
ON CONFLICT (id) DO NOTHING;

-- Document Class assignment
INSERT INTO public.document_classes (document_id, class_id)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- 16. Notifications
INSERT INTO public.notifications (id, title, message, type, class_id, created_at)
VALUES 
    ('c0000000-0000-0000-0000-000000000001', 'Chào mừng năm học mới 2026 - 2027!', 'Trung tâm chúc toàn thể các em học sinh có một năm học mới nhiều năng lượng và đạt kết quả vượt bậc.', 'GENERAL', NULL, NOW() - INTERVAL '5 days'),
    ('c0000000-0000-0000-0000-000000000002', 'Tài liệu mới môn Toán 12 đã cập nhật', 'Thầy Nguyễn Văn An đã tải lên tài liệu Đề cương khảo sát hàm số. Các em tải về chuẩn bị trước buổi học nhé.', 'DOCUMENT', '50000000-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;
