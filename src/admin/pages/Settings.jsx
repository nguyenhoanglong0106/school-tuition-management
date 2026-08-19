import { useState } from 'react';
import { Save, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { settingsService } from '@/services/settingsService';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/contexts/ToastContext';
import { Input, Textarea } from '@/components/common/Form';
import { Skeleton } from '@/components/common/UI';

const PRESET_COLORS = ['#4F46E5', '#06B6D4', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#0EA5E9'];

export default function SystemSettings() {
  const { settings, loading, reload } = useSettings();
  const { addToast } = useToast();
  const [form, setForm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const current = form ?? settings ?? {};

  const setField = (key, value) => setForm({ ...current, [key]: value });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `logo-${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('branding').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('branding').getPublicUrl(path);
      setField('logo_url', data.publicUrl);
    } catch (err) {
      addToast(err.message ?? 'Không thể tải lên logo', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsService.updateSettings({
        school_name: current.school_name, slogan: current.slogan, address: current.address,
        phone: current.phone, email: current.email, brand_color: current.brand_color, logo_url: current.logo_url,
      });
      addToast('Đã cập nhật cấu hình hệ thống');
      setForm(null);
      reload();
    } catch (err) {
      addToast(err.message ?? 'Không thể lưu cấu hình', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return <div className="card p-6"><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cấu hình hệ thống</h1>
          <p className="text-slate-500 text-sm mt-1">Thông tin thương hiệu hiển thị trên toàn hệ thống</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="card p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {current.logo_url ? <img src={current.logo_url} alt="Logo" className="w-full h-full object-contain" /> : <span className="text-slate-300 text-xs">Logo</span>}
          </div>
          <label className="btn btn-outline cursor-pointer">
            <Upload size={16} /> {uploading ? 'Đang tải lên...' : 'Tải logo mới'}
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
          </label>
        </div>

        <Input label="Tên trung tâm" required value={current.school_name ?? ''} onChange={(e) => setField('school_name', e.target.value)} />
        <Input label="Khẩu hiệu (Slogan)" value={current.slogan ?? ''} onChange={(e) => setField('slogan', e.target.value)} />
        <Textarea label="Địa chỉ" value={current.address ?? ''} onChange={(e) => setField('address', e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Số điện thoại" value={current.phone ?? ''} onChange={(e) => setField('phone', e.target.value)} />
          <Input label="Email liên hệ" type="email" value={current.email ?? ''} onChange={(e) => setField('email', e.target.value)} />
        </div>

        <div>
          <label className="form-label">Màu thương hiệu</label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button type="button" key={c} onClick={() => setField('brand_color', c)}
                className={`w-9 h-9 rounded-full border-2 ${current.brand_color === c ? 'border-slate-800 scale-110' : 'border-transparent'} transition-transform`}
                style={{ backgroundColor: c }} />
            ))}
            <input type="color" value={current.brand_color ?? '#4F46E5'} onChange={(e) => setField('brand_color', e.target.value)} className="w-9 h-9 rounded-full border-0 cursor-pointer" />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <button type="submit" disabled={saving} className="btn-primary"><Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu cấu hình'}</button>
        </div>
      </form>
    </div>
  );
}
