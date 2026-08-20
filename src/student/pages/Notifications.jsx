import { useCallback, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import { useDataList } from '@/hooks/useDataList';
import { useToast } from '@/contexts/ToastContext';
import { Skeleton, EmptyState } from '@/components/common/UI';
import { Modal } from '@/components/common/Modal';
import { NOTIFICATION_TYPE } from '@/constants';
import { formatRelativeTime } from '@/utils/formatters';

export default function StudentNotifications() {
  const { addToast } = useToast();
  const fetchFn = useCallback(({ page, pageSize }) => notificationService.getAll({ page, pageSize }), []);
  const { data, loading, reload } = useDataList(fetchFn, [], 50);
  const [selected, setSelected] = useState(null);

  const handleClickItem = async (item) => {
    setSelected(item);
    if (!item.read_at) {
      await notificationService.markRead(item.notification_id);
      reload();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      addToast('Đã đánh dấu tất cả là đã đọc');
      reload();
    } catch (err) {
      addToast(err.message ?? 'Không thể thực hiện', 'error');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">Thông báo</h1>
        <button onClick={handleMarkAllRead} className="text-xs text-primary-600 flex items-center gap-1"><CheckCheck size={14} /> Đánh dấu đã đọc</button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : data.length === 0 ? (
        <EmptyState icon={<Bell size={32} />} title="Chưa có thông báo nào" />
      ) : (
        <div className="space-y-2">
          {data.map((item) => (
            <button key={item.id} onClick={() => handleClickItem(item)} className={`w-full text-left card p-4 flex gap-3 ${!item.read_at ? 'bg-primary-50/50 border-primary-100' : ''}`}>
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0 text-lg shadow-sm">
                {NOTIFICATION_TYPE[item.notifications?.type]?.icon ?? '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800 text-sm truncate">{item.notifications?.title}</p>
                  {!item.read_at && <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.notifications?.message}</p>
                <p className="text-[11px] text-slate-400 mt-1">{formatRelativeTime(item.notifications?.created_at)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.notifications?.title} size="sm">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
          <span className="text-lg">{NOTIFICATION_TYPE[selected?.notifications?.type]?.icon ?? '🔔'}</span>
          <span>{formatRelativeTime(selected?.notifications?.created_at)}</span>
        </div>
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected?.notifications?.message}</p>
      </Modal>
    </div>
  );
}
