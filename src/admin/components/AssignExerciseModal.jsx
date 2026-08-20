import { useEffect, useState } from 'react';
import { exerciseService } from '@/services/exerciseService';
import { classService } from '@/services/classService';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { Select, Input } from '@/components/common/Form';
import { Modal } from '@/components/common/Modal';

// Reused from both ExerciseDetail (exercise fixed, must pick target) and
// ClassDetail (class fixed, must pick exercise from the bank).
export function AssignExerciseModal({ fixedExerciseId = null, fixedClassId = null, onClose, onAssigned }) {
  const { addToast } = useToast();
  const { isAdmin } = useAuth();
  const [exercises, setExercises] = useState([]);
  const [classes, setClasses] = useState([]);
  const [exerciseId, setExerciseId] = useState(fixedExerciseId ?? '');
  const [scope, setScope] = useState('CLASS');
  const [classId, setClassId] = useState(fixedClassId ?? '');
  const [dueAt, setDueAt] = useState('');
  const [titleOverride, setTitleOverride] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!fixedExerciseId) {
      exerciseService.getExercises({ pageSize: 200 }).then((r) => setExercises(r.data));
    }
    if (!fixedClassId) {
      classService.getAll({ pageSize: 200, status: 'ACTIVE' }).then((r) => setClasses(r.data));
    }
  }, [fixedExerciseId, fixedClassId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!exerciseId) { addToast('Vui lòng chọn bài tập', 'error'); return; }
    if (!dueAt) { addToast('Vui lòng chọn hạn nộp', 'error'); return; }
    const effectiveScope = fixedClassId ? 'CLASS' : scope;
    const effectiveClassId = fixedClassId ?? classId;
    if (effectiveScope === 'CLASS' && !effectiveClassId) { addToast('Vui lòng chọn lớp', 'error'); return; }

    setSaving(true);
    try {
      const result = await exerciseService.createAssignment({
        exerciseId,
        scope: effectiveScope,
        classId: effectiveScope === 'CLASS' ? effectiveClassId : null,
        dueAt: new Date(dueAt).toISOString(),
        titleOverride: titleOverride || null,
      });
      addToast(`Đã giao bài cho ${result.student_count} học viên`);
      onAssigned();
    } catch (err) {
      addToast(err.message ?? 'Không thể giao bài', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Giao bài tập">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!fixedExerciseId && (
          <Select
            label="Chọn bài tập" required value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}
            options={exercises.map((ex) => ({ value: ex.id, label: ex.title }))}
          />
        )}

        {!fixedClassId && (
          <>
            <Select
              label="Phạm vi giao bài" required value={scope} onChange={(e) => setScope(e.target.value)} placeholder={null}
              options={[
                { value: 'CLASS', label: 'Một lớp cụ thể' },
                ...(isAdmin ? [{ value: 'SYSTEM', label: 'Toàn hệ thống (mọi học viên đang học)' }] : []),
              ]}
            />
            {scope === 'CLASS' && (
              <Select label="Chọn lớp" required value={classId} onChange={(e) => setClassId(e.target.value)}
                options={classes.map((c) => ({ value: c.id, label: c.class_name }))} />
            )}
          </>
        )}

        <Input label="Hạn nộp" type="datetime-local" required value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        <Input label="Tiêu đề hiển thị (không bắt buộc)" placeholder="Mặc định dùng tên bài tập" value={titleOverride} onChange={(e) => setTitleOverride(e.target.value)} />

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Hủy</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Đang giao...' : 'Giao bài'}</button>
        </div>
      </form>
    </Modal>
  );
}
