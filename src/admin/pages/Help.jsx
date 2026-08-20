import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Banknote,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileText,
  HelpCircle,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Receipt,
  School,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';

const QUICK_START = [
  {
    title: 'Cấu hình thông tin trung tâm',
    description: 'Nhập tên trung tâm, logo, số điện thoại, email và màu thương hiệu để toàn hệ thống hiển thị đúng.',
    to: '/admin/settings',
    action: 'Mở Cấu hình',
    icon: Settings,
  },
  {
    title: 'Tạo dữ liệu học tập',
    description: 'Thêm môn học, giáo viên, học viên, sau đó tạo lớp và gắn học viên vào lớp.',
    to: '/admin/classes',
    action: 'Mở Lớp học',
    icon: School,
  },
  {
    title: 'Tạo lịch và điểm danh',
    description: 'Thiết lập lịch học định kỳ, sinh buổi học, rồi điểm danh sau mỗi buổi.',
    to: '/admin/schedules',
    action: 'Mở Lịch học',
    icon: CalendarDays,
  },
  {
    title: 'Theo dõi học phí',
    description: 'Tạo học phí hàng tháng, kiểm tra khoản còn nợ và xác nhận thanh toán của học viên.',
    to: '/admin/fees',
    action: 'Mở Học phí',
    icon: CreditCard,
  },
];

const SETUP_STEPS = [
  {
    title: '1. Chuẩn bị thông tin trung tâm',
    detail: 'Vào Cấu hình để nhập tên trung tâm, khẩu hiệu, địa chỉ, số điện thoại, email và logo.',
    to: '/admin/settings',
  },
  {
    title: '2. Tạo môn học',
    detail: 'Vào Môn học, thêm các môn trung tâm đang dạy như Toán, Lý, Hóa, Anh văn.',
    to: '/admin/subjects',
  },
  {
    title: '3. Tạo giáo viên',
    detail: 'Vào Giáo viên, nhập thông tin giáo viên và tạo tài khoản đăng nhập nếu giáo viên cần tự sử dụng hệ thống.',
    to: '/admin/teachers',
  },
  {
    title: '4. Tạo học viên',
    detail: 'Vào Học viên, nhấn Thêm học viên, nhập họ tên và thông tin phụ huynh. Mã học viên sẽ tự sinh.',
    to: '/admin/students',
  },
  {
    title: '5. Tạo lớp học',
    detail: 'Vào Lớp học, chọn môn, giáo viên, học phí, phòng học, rồi thêm học viên vào lớp.',
    to: '/admin/classes',
  },
  {
    title: '6. Thiết lập lịch học',
    detail: 'Trong chi tiết lớp, tạo lịch học định kỳ theo thứ và giờ học, sau đó sinh các buổi học thực tế.',
    to: '/admin/classes',
  },
  {
    title: '7. Tạo học phí',
    detail: 'Vào Học phí, chọn lớp, tháng, năm và hạn đóng, rồi nhấn Tạo học phí hàng loạt.',
    to: '/admin/fees',
  },
  {
    title: '8. Cài tài khoản ngân hàng',
    detail: 'Vào Tài khoản NH để nhập tài khoản nhận tiền và đặt làm mặc định cho mã QR thanh toán.',
    to: '/admin/bank-accounts',
  },
];

const ROUTINES = [
  {
    title: 'Mỗi ngày',
    icon: LayoutDashboard,
    color: 'bg-sky-50 text-sky-700 border-sky-100',
    items: [
      'Mở Dashboard để xem lịch học hôm nay và giao dịch chờ xác nhận.',
      'Sau mỗi buổi học, vào Điểm danh để đánh dấu Có mặt, Vắng, Có phép hoặc Đi trễ.',
      'Nếu học viên báo đã chuyển khoản, vào Thanh toán để xác nhận hoặc từ chối kèm lý do.',
    ],
  },
  {
    title: 'Mỗi tuần',
    icon: CalendarDays,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    items: [
      'Kiểm tra Lịch học tuần tới để phát hiện lớp thiếu buổi hoặc sai giờ.',
      'Xem lại các lớp đang hoạt động để chắc giáo viên, phòng học và học viên đã đúng.',
      'Gửi Thông báo nếu có nghỉ học, đổi lịch hoặc nhắc học phí.',
    ],
  },
  {
    title: 'Mỗi tháng',
    icon: Banknote,
    color: 'bg-amber-50 text-amber-700 border-amber-100',
    items: [
      'Vào Học phí để tạo khoản thu cho từng lớp trong tháng.',
      'Lọc trạng thái Quá hạn hoặc Chưa đóng để nhắc học viên/phụ huynh.',
      'Vào Thu chi để kiểm tra tổng thu, tổng chi và lợi nhuận tháng.',
    ],
  },
];

const GUIDE_SECTIONS = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
    to: '/admin',
    plain: 'Đây là màn hình tổng quan. Admin nên mở đầu tiên khi bắt đầu ngày làm việc.',
    steps: [
      'Xem các số lớn phía trên để biết tổng học viên, số lớp, lịch học hôm nay và giao dịch chờ xác nhận.',
      'Nhìn ô Còn nợ và Quá hạn để biết tháng này còn bao nhiêu tiền chưa thu.',
      'Xem biểu đồ Thu chi để nắm nhanh tình hình tài chính của trung tâm.',
      'Nếu có giao dịch Chờ xác nhận, nhấn vào để xử lý ngay trong mục Thanh toán.',
    ],
    note: 'Dashboard chỉ để theo dõi nhanh. Muốn sửa dữ liệu, hãy vào đúng mục ở sidebar.',
  },
  {
    id: 'students',
    title: 'Học viên',
    icon: Users,
    to: '/admin/students',
    plain: 'Dùng để lưu thông tin học viên và phụ huynh.',
    steps: [
      'Nhấn Học viên ở sidebar.',
      'Nhấn Thêm học viên để tạo hồ sơ mới.',
      'Nhập họ tên, số điện thoại, trường lớp, thông tin phụ huynh và ghi chú nếu cần.',
      'Nhấn vào một học viên trong danh sách để xem chi tiết lớp học, học phí, thanh toán, điểm danh và tài liệu.',
      'Nếu học viên cần đăng nhập, mở chi tiết học viên rồi tạo tài khoản đăng nhập cho học viên.',
    ],
    note: 'Nút Xóa trong mục học viên là cho nghỉ học, không xóa mất lịch sử học phí và điểm danh.',
  },
  {
    id: 'teachers-subjects',
    title: 'Giáo viên và môn học',
    icon: UserCog,
    to: '/admin/teachers',
    plain: 'Dùng để chuẩn bị dữ liệu trước khi tạo lớp.',
    steps: [
      'Vào Môn học để thêm các môn trung tâm đang dạy.',
      'Vào Giáo viên để thêm giáo viên và thông tin liên hệ.',
      'Nếu giáo viên cần tự xem lớp, lịch, điểm danh, tài liệu và thông báo, hãy tạo tài khoản đăng nhập cho giáo viên.',
      'Khi giáo viên nghỉ, dùng nút Xóa để chuyển sang trạng thái ngừng hoạt động.',
    ],
    note: 'Không nên xóa dữ liệu thật bằng tay trong cơ sở dữ liệu. Hãy dùng nút trong phần mềm để hệ thống giữ lịch sử đúng cách.',
  },
  {
    id: 'classes',
    title: 'Lớp học',
    icon: School,
    to: '/admin/classes',
    plain: 'Đây là nơi ghép môn học, giáo viên, học viên, lịch học và học phí.',
    steps: [
      'Nhấn Lớp học, sau đó nhấn Thêm lớp.',
      'Chọn môn học, giáo viên phụ trách, học phí, chu kỳ thu phí, sĩ số và phòng học.',
      'Mở chi tiết lớp, vào tab Học viên để thêm học viên vào lớp.',
      'Vào tab Lịch học để khai báo lịch cố định trong tuần.',
      'Nhấn Sinh buổi học để tạo các buổi học thật trên lịch.',
    ],
    note: 'Khi hủy lớp, hệ thống sẽ dừng ghi danh học viên và hủy các buổi chưa diễn ra, nhưng vẫn giữ lại lịch sử cũ.',
  },
  {
    id: 'schedule-attendance',
    title: 'Lịch học và điểm danh',
    icon: ClipboardCheck,
    to: '/admin/attendance',
    plain: 'Dùng để biết hôm nay học lớp nào và ghi nhận học viên đi học ra sao.',
    steps: [
      'Vào Lịch học để xem lịch theo tuần hoặc tháng.',
      'Nhấn vào một buổi học để đi đến màn hình điểm danh nếu cần.',
      'Vào Điểm danh, chọn lớp, ngày và buổi học.',
      'Đánh dấu từng học viên: Có mặt, Vắng mặt, Có phép hoặc Đi trễ.',
      'Nhấn Lưu điểm danh để hoàn tất buổi học.',
    ],
    note: 'Nếu lớp nghỉ đột xuất, hãy hủy buổi học thay vì bỏ trống để lịch sử được rõ ràng.',
  },
  {
    id: 'fees-payments',
    title: 'Học phí và thanh toán',
    icon: CreditCard,
    to: '/admin/fees',
    plain: 'Dùng để tạo khoản phải thu và xác nhận tiền học viên đã đóng.',
    steps: [
      'Vào Học phí, chọn lớp, tháng, năm và hạn đóng.',
      'Nhấn Tạo học phí hàng loạt để hệ thống tạo khoản thu cho học viên đang học trong lớp.',
      'Dùng bộ lọc Chưa đóng, Đóng một phần, Quá hạn để theo dõi công nợ.',
      'Khi học viên chuyển khoản, vào Thanh toán để kiểm tra biên lai và xác nhận.',
      'Nếu thu tiền mặt tại quầy, vào Thanh toán và dùng nút Thu tiền mặt.',
    ],
    note: 'Chỉ xác nhận thanh toán khi trung tâm đã nhận được tiền. Nếu học viên chuyển sai, hãy từ chối và ghi lý do rõ ràng.',
  },
  {
    id: 'finance',
    title: 'Thu chi',
    icon: TrendingUp,
    to: '/admin/finance',
    plain: 'Dùng như sổ tiền của trung tâm, gồm tiền học phí đã xác nhận và các khoản chi khác.',
    steps: [
      'Vào Thu chi để xem tổng thu, tổng chi và lợi nhuận theo ngày, tuần, tháng hoặc khoảng tùy chọn.',
      'Nhấn Thêm khoản chi để nhập tiền thuê phòng, lương giáo viên, điện nước hoặc chi phí khác.',
      'Dùng Quản lý danh mục để thêm hoặc ẩn nhóm thu chi không còn dùng.',
      'Cuối tháng, đối chiếu mục Thu chi với tiền thực tế trong ngân hàng hoặc tiền mặt.',
    ],
    note: 'Khoản thu từ học phí đã xác nhận sẽ tự động vào sổ thu chi, admin không cần nhập lại.',
  },
  {
    id: 'documents-notifications',
    title: 'Tài liệu và thông báo',
    icon: FileText,
    to: '/admin/documents',
    plain: 'Dùng để gửi tài liệu học tập và thông tin cần báo cho học viên.',
    steps: [
      'Vào Tài liệu, nhấn Tải lên tài liệu, chọn file và đặt tiêu đề dễ hiểu.',
      'Chọn phạm vi hiển thị: toàn trung tâm hoặc chỉ một số lớp.',
      'Vào Thông báo, nhấn Soạn thông báo để gửi tin cho toàn trung tâm hoặc một lớp.',
      'Viết nội dung ngắn, rõ: việc gì, ngày nào, học viên cần làm gì.',
    ],
    note: 'Học viên chỉ thấy tài liệu được chia sẻ cho lớp của mình hoặc cho toàn trung tâm.',
  },
  {
    id: 'bank-settings',
    title: 'Tài khoản ngân hàng và cấu hình',
    icon: Landmark,
    to: '/admin/bank-accounts',
    plain: 'Dùng để đặt thông tin nhận chuyển khoản và thông tin hiển thị của trung tâm.',
    steps: [
      'Vào Tài khoản NH để thêm số tài khoản nhận học phí.',
      'Đặt một tài khoản làm mặc định để học viên nhìn thấy mã QR thanh toán đúng.',
      'Vào Cấu hình để cập nhật tên trung tâm, logo, địa chỉ, số điện thoại, email và màu thương hiệu.',
      'Sau khi sửa, kiểm tra lại màn hình đăng nhập và khu vực học viên để chắc thông tin hiển thị đúng.',
    ],
    note: 'Không thể tắt tài khoản ngân hàng đang là mặc định. Hãy chọn tài khoản mặc định khác trước.',
  },
];

const COMMON_TASKS = [
  {
    question: 'Muốn thêm một học viên mới?',
    answer: 'Vào Học viên, nhấn Thêm học viên, nhập thông tin, lưu lại, rồi mở chi tiết học viên để thêm vào lớp hoặc tạo tài khoản đăng nhập.',
    to: '/admin/students',
    icon: UserPlus,
  },
  {
    question: 'Muốn tạo học phí tháng này?',
    answer: 'Vào Học phí, chọn lớp, tháng, năm, hạn đóng, rồi nhấn Tạo học phí hàng loạt.',
    to: '/admin/fees',
    icon: CreditCard,
  },
  {
    question: 'Học viên báo đã chuyển khoản?',
    answer: 'Vào Thanh toán, mở giao dịch Chờ xác nhận, kiểm tra số tiền và biên lai, sau đó Xác nhận hoặc Từ chối.',
    to: '/admin/payments',
    icon: Receipt,
  },
  {
    question: 'Muốn báo nghỉ học hoặc đổi lịch?',
    answer: 'Vào Thông báo, soạn tin cho toàn trung tâm hoặc lớp cụ thể. Nếu là một buổi học bị nghỉ, vào Điểm danh hoặc Lịch học để hủy buổi đó.',
    to: '/admin/notifications',
    icon: Bell,
  },
];

const TERMS = [
  ['Dashboard', 'Bảng tổng quan, giúp xem nhanh tình hình trung tâm.'],
  ['Học phí', 'Khoản tiền học viên cần đóng cho một kỳ học.'],
  ['Thanh toán', 'Giao dịch học viên đã nộp tiền hoặc trung tâm thu tiền mặt.'],
  ['Thu chi', 'Sổ theo dõi tiền vào, tiền ra và lợi nhuận.'],
  ['Sinh buổi học', 'Tạo các buổi học thật từ lịch cố định trong tuần.'],
  ['Miễn giảm', 'Hủy một khoản thu hợp lý nhưng vẫn giữ lịch sử để dễ kiểm tra.'],
];

function IconBadge({ icon: Icon, className = 'bg-primary-50 text-primary-700' }) {
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${className}`}>
      <Icon size={20} />
    </div>
  );
}

function SectionTitle({ id, title, description, icon: Icon }) {
  return (
    <div id={id} className="scroll-mt-6">
      <div className="flex items-start gap-3">
        <IconBadge icon={Icon} />
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
        </div>
      </div>
    </div>
  );
}

function QuickStartCard({ item }) {
  const Icon = item.icon;
  return (
    <div className="card p-5 flex flex-col gap-4">
      <IconBadge icon={Icon} />
      <div className="space-y-1">
        <h3 className="font-semibold text-slate-800">{item.title}</h3>
        <p className="text-sm text-slate-500 leading-6">{item.description}</p>
      </div>
      <Link to={item.to} className="btn btn-outline btn-sm mt-auto w-fit">
        {item.action}
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}

function RoutineCard({ routine }) {
  const Icon = routine.icon;
  return (
    <div className={`rounded-2xl border p-5 ${routine.color}`}>
      <div className="flex items-center gap-2 font-semibold">
        <Icon size={18} />
        <h3>{routine.title}</h3>
      </div>
      <ul className="mt-4 space-y-3 text-sm leading-6">
        {routine.items.map((item) => (
          <li key={item} className="flex gap-2">
            <CheckCircle2 size={16} className="mt-1 flex-shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GuideSection({ section }) {
  const Icon = section.icon;
  return (
    <section id={section.id} className="card p-5 scroll-mt-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <IconBadge icon={Icon} className="bg-slate-100 text-slate-700" />
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{section.title}</h3>
            <p className="text-sm text-slate-500 mt-1 leading-6">{section.plain}</p>
          </div>
        </div>
        <Link to={section.to} className="btn btn-ghost btn-sm lg:flex-shrink-0">
          Mở mục này
          <ChevronRight size={14} />
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-5">
        <ol className="space-y-3">
          {section.steps.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="w-7 h-7 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold flex items-center justify-center flex-shrink-0">
                {index + 1}
              </span>
              <span className="text-sm text-slate-600 leading-6">{step}</span>
            </li>
          ))}
        </ol>
        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-amber-800">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <AlertTriangle size={16} />
            Lưu ý
          </div>
          <p className="text-sm leading-6 mt-2">{section.note}</p>
        </div>
      </div>
    </section>
  );
}

export default function Help() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Trợ giúp</h1>
          <p className="text-slate-500 text-sm mt-1">
            Hướng dẫn sử dụng dành cho admin mới bắt đầu, viết theo từng việc cần làm trong trung tâm.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-6">
        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle size={18} className="text-primary-600" />
              <h2 className="font-semibold text-slate-800">Xem nhanh</h2>
            </div>
            <nav className="space-y-1">
              <a href="#start" className="sidebar-link text-slate-600 hover:text-primary-700">
                <ListChecks size={16} />
                Bắt đầu sử dụng
              </a>
              <a href="#routine" className="sidebar-link text-slate-600 hover:text-primary-700">
                <CalendarDays size={16} />
                Việc cần làm
              </a>
              <a href="#common-tasks" className="sidebar-link text-slate-600 hover:text-primary-700">
                <CheckCircle2 size={16} />
                Tác vụ thường gặp
              </a>
              {GUIDE_SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <a key={section.id} href={`#${section.id}`} className="sidebar-link text-slate-600 hover:text-primary-700">
                    <Icon size={16} />
                    {section.title}
                  </a>
                );
              })}
            </nav>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-800">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <ShieldCheck size={16} />
              Nguyên tắc an toàn
            </div>
            <p className="text-sm leading-6 mt-2">
              Các nút Xóa trong phần mềm thường chỉ chuyển trạng thái để giữ lịch sử. Khi không chắc, hãy đọc cảnh báo trên màn hình trước khi xác nhận.
            </p>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="rounded-2xl bg-white border border-slate-100 p-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold mb-4">
                  <BookOpen size={14} />
                  Dành cho người không rành phần mềm
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Bắt đầu từ quy trình, không cần nhớ hết mọi nút.</h2>
                <p className="text-sm text-slate-500 leading-6 mt-3">
                  Trang này gom lại những việc admin cần làm nhất: tạo dữ liệu ban đầu, quản lý học viên, tạo lớp, điểm danh, thu học phí và theo dõi tiền. Mỗi mục có nút mở nhanh đúng màn hình để thao tác ngay.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <p className="text-sm font-semibold text-slate-800">Thứ tự dễ nhớ</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>1. Nhập dữ liệu</p>
                  <p>2. Tạo lớp và lịch</p>
                  <p>3. Điểm danh hằng ngày</p>
                  <p>4. Tạo học phí hằng tháng</p>
                  <p>5. Xác nhận thanh toán</p>
                </div>
              </div>
            </div>
          </section>

          <section id="start" className="space-y-4 scroll-mt-6">
            <SectionTitle
              title="Bắt Đầu Sử Dụng"
              description="Nếu trung tâm mới dùng hệ thống, hãy làm lần lượt các bước này."
              icon={ListChecks}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {QUICK_START.map((item) => (
                <QuickStartCard key={item.title} item={item} />
              ))}
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Quy trình cài đặt lần đầu</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {SETUP_STEPS.map((step) => (
                  <Link
                    key={step.title}
                    to={step.to}
                    className="flex items-start gap-3 rounded-2xl border border-slate-100 p-4 hover:border-primary-200 hover:bg-primary-50/40 transition-colors"
                  >
                    <CheckCircle2 size={18} className="text-primary-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-800">{step.title}</p>
                      <p className="text-sm text-slate-500 leading-6 mt-1">{step.detail}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section id="routine" className="space-y-4 scroll-mt-6">
            <SectionTitle
              title="Việc Cần Làm Định Kỳ"
              description="Admin chỉ cần kiểm tra theo ngày, tuần và tháng để vận hành ổn định."
              icon={CalendarDays}
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {ROUTINES.map((routine) => (
                <RoutineCard key={routine.title} routine={routine} />
              ))}
            </div>
          </section>

          <section id="common-tasks" className="space-y-4 scroll-mt-6">
            <SectionTitle
              title="Tác Vụ Thường Gặp"
              description="Khi cần làm nhanh một việc, hãy chọn câu gần giống tình huống của bạn."
              icon={CheckCircle2}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {COMMON_TASKS.map((task) => {
                const Icon = task.icon;
                return (
                  <Link key={task.question} to={task.to} className="card p-5 hover:shadow-elevated transition-all">
                    <div className="flex items-start gap-3">
                      <IconBadge icon={Icon} className="bg-cyan-50 text-cyan-700" />
                      <div>
                        <h3 className="font-semibold text-slate-800">{task.question}</h3>
                        <p className="text-sm text-slate-500 leading-6 mt-2">{task.answer}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <div className="space-y-4">
            <SectionTitle
              title="Hướng Dẫn Theo Từng Mục"
              description="Mỗi phần dưới đây tương ứng với một mục trong sidebar admin."
              icon={BookOpen}
            />
            {GUIDE_SECTIONS.map((section) => (
              <GuideSection key={section.id} section={section} />
            ))}
          </div>

          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={18} className="text-primary-600" />
                <h2 className="font-semibold text-slate-800">Từ ngữ dễ nhầm</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {TERMS.map(([term, meaning]) => (
                  <div key={term} className="py-3 grid grid-cols-1 sm:grid-cols-[150px_minmax(0,1fr)] gap-1 sm:gap-4">
                    <p className="font-medium text-slate-800">{term}</p>
                    <p className="text-sm text-slate-500 leading-6">{meaning}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-red-50 border border-red-100 p-5 text-red-800">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={18} />
                Trước khi xác nhận
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-6">
                <li>Kiểm tra đúng tên học viên, lớp học và số tiền.</li>
                <li>Đọc kỹ cảnh báo khi hủy lớp, cho nghỉ học hoặc miễn giảm học phí.</li>
                <li>Chỉ xác nhận thanh toán sau khi trung tâm đã nhận tiền.</li>
                <li>Không chia sẻ tài khoản admin cho học viên hoặc phụ huynh.</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
