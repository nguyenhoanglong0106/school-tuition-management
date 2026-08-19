import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X, Plus, Receipt, Printer, Image as ImageIcon } from 'lucide-react';
import { paymentService } from '@/services/paymentService';
import { feeService } from '@/services/feeService';
import { useDataList } from '@/hooks/useDataList';
import { useToast } from '@/contexts/ToastContext';
import { DataTable } from '@/components/common/DataTable';
import { Pagination, EmptyState } from '@/components/common/UI';
import { Select, Input, SearchInput } from '@/components/common/Form';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { PaymentStatusBadge } from '@/components/common/Badge';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { PAYMENT_STATUS, PAYMENT_METHOD } from '@/constants';
import { printReceipt } from '@/utils/printService';
import { useSettings } from '@/contexts/SettingsContext';
import { validatePaymentAmount } from '@/utils/feeCalculations';

export default function Payments() {
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const { settings } = useSettings();
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [receiptTarget, setReceiptTarget] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchFn = useCallback(({ page, pageSize }) => paymentService.getAll({ status: status || null, page, pageSize }), [status]);
  const { data, count, page, setPage, pageSize, setPageSize, loading, reload } = useDataList(fetchFn, [status]);

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      await paymentService.confirmPayment(confirmTarget.id);
      addToast('Đã xác nhận thanh toán');
      setConfirmTarget(null);
      reload();
    } catch (err) {
      addToast(err.message ?? 'Không thể xác nhận thanh toán', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (reason) => {
    setProcessing(true);
    try {
      await paymentService.rejectPayment(rejectTarget.id, reason);
      addToast('Đã từ chối giao dịch');
      setRejectTarget(null);
      reload();
    } catch (err) {
      addToast(err.message ?? 'Không thể từ chối giao dịch', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleViewReceipt = async (p) => {
    if (!p.receipt_path) return;
    const url = await paymentService.getReceiptUrl(p.receipt_path);
    setReceiptUrl(url);
    setReceiptTarget(p);
  };

  const handlePrint = async (p) => {
    const fee = await feeService.getById(p.student_fee_id);
    printReceipt(p, fee, fee.students, settings);
  };

  const columns = [
    { key: 'payment_code', header: 'Mã GD', render: (p) => <span className="font-medium">{p.payment_code}</span> },
    { key: 'student', header: 'Học viên', render: (p) => <div><p className="font-medium text-slate-800">{p.students?.full_name}</p><p className="text-xs text-slate-400">{p.student_fees?.classes?.class_name} · {p.student_fees?.period_label}</p></div> },
    { key: 'amount', header: 'Số tiền', render: (p) => <span className="font-semibold">{formatCurrency(p.amount)}</span> },
    { key: 'method', header: 'Phương thức', render: (p) => PAYMENT_METHOD[p.payment_method]?.label },
    { key: 'date', header: 'Ngày', render: (p) => formatDateTime(p.payment_date) },
    { key: 'status', header: 'Trạng thái', render: (p) => <PaymentStatusBadge status={p.status} /> },
    {
      key: 'actions', header: '', className: 'w-40',
      render: (p) => (
        <div className="flex items-center gap-1">
          {p.receipt_path && (
            <button onClick={() => handleViewReceipt(p)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Xem biên lai"><ImageIcon size={16} /></button>
          )}
          {p.status === 'CONFIRMED' && (
            <button onClick={() => handlePrint(p)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="In phiếu thu"><Printer size={16} /></button>
          )}
          {p.status === 'PENDING' && (
            <>
              <button onClick={() => setConfirmTarget(p)} className="p-2 rounded-lg hover:bg-green-50 text-green-600" title="Xác nhận"><Check size={16} /></button>
              <button onClick={() => setRejectTarget(p)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Từ chối"><X size={16} /></button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Thanh toán</h1>
          <p className="text-slate-500 text-sm mt-1">Xác nhận giao dịch chuyển khoản & thu tiền mặt</p>
        </div>
        <button onClick={() => setAddModal(true)} className="btn-primary"><Plus size={16} /> Thu tiền mặt</button>
      </div>

      <Select value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Tất cả trạng thái"
        options={Object.entries(PAYMENT_STATUS).map(([value, s]) => ({ value, label: s.label }))} className="sm:w-56" />

      <DataTable columns={columns} data={data} loading={loading}
        emptyState={<EmptyState icon={<Receipt size={32} />} title="Chưa có giao dịch thanh toán nào" />} />

      {!loading && data.length > 0 && <Pagination page={page} pageSize={pageSize} total={count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      <ConfirmDialog isOpen={!!confirmTarget} onClose={() => setConfirmTarget(null)} onConfirm={handleConfirm} loading={processing}
        confirmClass="btn-success" confirmLabel="Xác nhận"
        title="Xác nhận thanh toán" message={`Xác nhận đã nhận ${formatCurrency(confirmTarget?.amount)} từ "${confirmTarget?.students?.full_name}"? Học phí và sổ thu chi sẽ được cập nhật tự động.`} />

      <RejectModal target={rejectTarget} onClose={() => setRejectTarget(null)} onReject={handleReject} loading={processing} />

      {receiptTarget && (
        <Modal isOpen onClose={() => setReceiptTarget(null)} title={`Biên lai · ${receiptTarget.payment_code}`}>
          {receiptUrl ? (
            receiptUrl.match(/\.pdf/i) ? (
              <a href={receiptUrl} target="_blank" rel="noreferrer" className="btn-primary w-full justify-center">Mở tệp PDF</a>
            ) : (
              <img src={receiptUrl} alt="Biên lai" className="w-full rounded-xl" />
            )
          ) : <p className="text-sm text-slate-400">Đang tải...</p>}
        </Modal>
      )}

      {addModal && <AddCashPaymentModal onClose={() => setAddModal(false)} onDone={() => { setAddModal(false); reload(); }} />}
    </div>
  );
}

function RejectModal({ target, onClose, onReject, loading }) {
  const [reason, setReason] = useState('');
  useEffect(() => setReason(''), [target]);
  if (!target) return null;
  return (
    <Modal isOpen onClose={onClose} title="Từ chối giao dịch">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Vui lòng nhập lý do từ chối giao dịch <strong>{target.payment_code}</strong>. Học viên sẽ nhận được thông báo.</p>
        <Input label="Lý do" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Không khớp số tiền chuyển khoản" />
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn btn-ghost flex-1">Hủy</button>
          <button onClick={() => onReject(reason)} disabled={loading || !reason.trim()} className="btn-danger flex-1">{loading ? 'Đang xử lý...' : 'Từ chối giao dịch'}</button>
        </div>
      </div>
    </Modal>
  );
}

function AddCashPaymentModal({ onClose, onDone }) {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [fees, setFees] = useState([]);
  const [selectedFee, setSelectedFee] = useState(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (search.length < 2) { setFees([]); return; }
    const t = setTimeout(async () => {
      const { data } = await feeService.getAll({ search, status: null, pageSize: 10 });
      setFees(data.filter((f) => f.remaining_amount > 0));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFee) return;
    const validationError = validatePaymentAmount(amount, selectedFee.remaining_amount);
    if (validationError) {
      addToast(validationError, 'error');
      return;
    }
    const amt = Number(amount);
    setSaving(true);
    try {
      const payment = await paymentService.createPayment({
        payment_code: paymentService.generatePaymentCode(),
        student_fee_id: selectedFee.id,
        student_id: selectedFee.student_id,
        amount: amt,
        payment_method: 'CASH',
        note: 'Thu tiền mặt tại quầy',
      });
      await paymentService.confirmPayment(payment.id);
      addToast('Đã thu tiền mặt và xác nhận thành công');
      onDone();
    } catch (err) {
      addToast(err.message ?? 'Không thể lưu giao dịch', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Thu tiền mặt trực tiếp">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!selectedFee ? (
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Tìm học viên hoặc mã học phí..." />
            <div className="max-h-56 overflow-y-auto space-y-1">
              {fees.map((f) => (
                <button type="button" key={f.id} onClick={() => { setSelectedFee(f); setAmount(f.remaining_amount); }} className="w-full text-left p-3 rounded-xl hover:bg-slate-50 flex items-center justify-between">
                  <span>{f.students?.full_name} · {f.period_label}</span>
                  <span className="text-sm font-semibold text-amber-600">{formatCurrency(f.remaining_amount)}</span>
                </button>
              ))}
              {search.length >= 2 && fees.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Không tìm thấy khoản nợ phù hợp</p>}
            </div>
          </>
        ) : (
          <>
            <div className="p-3 rounded-xl bg-primary-50 flex items-center justify-between">
              <span className="font-medium text-primary-700">{selectedFee.students?.full_name} · {selectedFee.period_label}</span>
              <button type="button" onClick={() => setSelectedFee(null)} className="text-xs text-primary-600 underline">Đổi</button>
            </div>
            <Input label="Số tiền thu" type="number" min="1" max={selectedFee.remaining_amount} required value={amount} onChange={(e) => setAmount(e.target.value)} />
            <p className="text-xs text-slate-400">Còn nợ: {formatCurrency(selectedFee.remaining_amount)}</p>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Hủy</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Đang lưu...' : 'Xác nhận thu tiền'}</button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
