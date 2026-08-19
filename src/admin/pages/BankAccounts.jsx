import { useEffect, useState } from 'react';
import { Plus, Pencil, Star, Landmark } from 'lucide-react';
import { settingsService } from '@/services/settingsService';
import { useToast } from '@/contexts/ToastContext';
import { useSettings } from '@/contexts/SettingsContext';
import { EmptyState, Skeleton } from '@/components/common/UI';
import { Input, Checkbox } from '@/components/common/Form';
import { Modal } from '@/components/common/Modal';

export default function BankAccounts() {
  const { addToast } = useToast();
  const { reload: reloadSettings } = useSettings();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getAllBankAccounts();
      setAccounts(data);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await settingsService.setDefaultBankAccount(id);
      addToast('Đã đặt làm tài khoản mặc định');
      load();
      reloadSettings();
    } catch (err) {
      addToast(err.message ?? 'Không thể cập nhật', 'error');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tài khoản ngân hàng</h1>
          <p className="text-slate-500 text-sm mt-1">Cấu hình tài khoản nhận chuyển khoản học phí</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary"><Plus size={16} /> Thêm tài khoản</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="card p-5"><Skeleton className="h-24" /></div>)}</div>
      ) : accounts.length === 0 ? (
        <div className="card"><EmptyState icon={<Landmark size={32} />} title="Chưa có tài khoản ngân hàng" description='Thêm tài khoản để học viên chuyển khoản học phí qua QR.' /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {accounts.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800">{a.bank_name}</p>
                    {a.is_default && <span className="badge badge-primary"><Star size={10} /> Mặc định</span>}
                  </div>
                  <p className="text-sm text-slate-600 mt-1 font-mono">{a.account_number}</p>
                  <p className="text-sm text-slate-500">{a.account_holder}</p>
                  {a.branch && <p className="text-xs text-slate-400 mt-1">{a.branch}</p>}
                </div>
                <button onClick={() => { setEditing(a); setModalOpen(true); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil size={16} /></button>
              </div>
              {!a.is_default && (
                <button onClick={() => handleSetDefault(a.id)} className="btn btn-ghost btn-sm mt-3 w-full">Đặt làm mặc định</button>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && <BankAccountModal account={editing} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load(); reloadSettings(); }} />}
    </div>
  );
}

function BankAccountModal({ account, onClose, onSaved }) {
  const { addToast } = useToast();
  const [form, setForm] = useState({
    bank_name: account?.bank_name ?? '', bank_code: account?.bank_code ?? '', account_number: account?.account_number ?? '',
    account_holder: account?.account_holder ?? '', branch: account?.branch ?? '', is_active: account?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (account) await settingsService.updateBankAccount(account.id, form);
      else await settingsService.createBankAccount(form);
      addToast('Đã lưu tài khoản ngân hàng');
      onSaved();
    } catch (err) {
      addToast(err.message ?? 'Không thể lưu', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={account ? 'Cập nhật tài khoản' : 'Thêm tài khoản ngân hàng'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Tên ngân hàng" required value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
        <Input label="Mã ngân hàng (VietQR BIN/code, VD: MB, VCB, TCB)" required value={form.bank_code} onChange={(e) => setForm({ ...form, bank_code: e.target.value.toUpperCase() })} />
        <Input label="Số tài khoản" required value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
        <Input label="Chủ tài khoản" required value={form.account_holder} onChange={(e) => setForm({ ...form, account_holder: e.target.value.toUpperCase() })} />
        <Input label="Chi nhánh" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
        <Checkbox label="Đang hoạt động" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Hủy</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </div>
      </form>
    </Modal>
  );
}
