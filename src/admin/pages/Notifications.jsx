import { useCallback, useEffect, useState } from 'react';
import { Bell, Send, Megaphone } from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import { classService } from '@/services/classService';
import { useDataList } from '@/hooks/useDataList';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { Pagination, EmptyState, Skeleton } from '@/components/common/UI';
import { Select, Input, Textarea } from '@/components/common/Form';
import { Modal } from '@/components/common/Modal';
import { NOTIFICATION_TYPE } from '@/constants';
import { formatRelativeTime } from '@/utils/formatters';

export default function AdminNotifications() {
  const { isAdmin } = useAuth();
  const [composeOpen, setComposeOpen] = useState(false);

  const fetchFn = useCallback(({ page, pageSize }) => notificationService.getSentHistory({ page, pageSize }), []);
  const { data, count, page, setPage, pageSize, setPageSize, loading, reload } = useDataList(fetchFn, []);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Thông báo</h1>
          <p className="text-slate-500 text-sm mt-1">Lịch sử thông báo đã gửi cho học viên</p>
        </div>
        <button onClick={() => setComposeOpen(true)} className="btn-primary"><Send size={16} /> Soạn thông báo</button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-4"><Skeleton className="h-12" /></div>)}</div>
      ) : data.length === 0 ? (
        <div className="card"><EmptyState icon={<Bell size={32} />} title="Chưa gửi thông báo nào" /></div>
      ) : (
        <div className="space-y-3">
          {data.map((n) => (
            <div key={n.id} className="card p-4 flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 text-lg">
                {NOTIFICATION_TYPE[n.type]?.icon ?? '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800 truncate">{n.title}</p>
                  <span className="text-xs text-slate-400 flex-shrink-0">{formatRelativeTime(n.created_at)}</span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
                <p className="text-xs text-slate-400 mt-1">{n.classes?.class_name ?? 'Toàn trung tâm'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && data.length > 0 && <Pagination page={page} pageSize={pageSize} total={count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      {composeOpen && (
        <ComposeModal isAdmin={isAdmin} onClose={() => setComposeOpen(false)} onSent={() => { setComposeOpen(false); reload(); }} />
      )}
    </div>
  );
}

function ComposeModal({ isAdmin, onClose, onSent }) {
  const { addToast } = useToast();
  const [classes, setClasses] = useState([]);
  const [target, setTarget] = useState(isAdmin ? 'ALL' : 'CLASS');
  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    classService.getAll({ pageSize: 100, status: 'ACTIVE' }).then((r) => setClasses(r.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    if (target === 'CLASS' && !classId) {
      addToast('Vui lòng chọn lớp học', 'error');
      return;
    }
    setSaving(true);
    try {
      if (target === 'ALL') {
        await notificationService.sendGeneral({ title, message });
      } else {
        await notificationService.sendToClass(classId, { title, message, type: 'CLASS' });
      }
      addToast('Đã gửi thông báo');
      onSent();
    } catch (err) {
      addToast(err.message ?? 'Không thể gửi thông báo', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Soạn thông báo mới">
      <form onSubmit={handleSubmit} className="space-y-4">
        {isAdmin && (
          <Select label="Gửi đến" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={null}
            options={[{ value: 'ALL', label: 'Toàn trung tâm' }, { value: 'CLASS', label: 'Một lớp cụ thể' }]} />
        )}
        {target === 'CLASS' && (
          <Select label="Lớp học" required value={classId} onChange={(e) => setClassId(e.target.value)} placeholder="Chọn lớp" options={classes.map((c) => ({ value: c.id, label: c.class_name }))} />
        )}
        <Input label="Tiêu đề" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label="Nội dung" required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Hủy</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1"><Megaphone size={16} /> {saving ? 'Đang gửi...' : 'Gửi thông báo'}</button>
        </div>
      </form>
    </Modal>
  );
}
