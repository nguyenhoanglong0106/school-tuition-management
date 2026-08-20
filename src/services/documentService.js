import { supabase } from '@/lib/supabase';
import { sanitizeFileName } from '@/utils/formatters';

export const documentService = {
  async getAll({ search = '', subjectId = null, page = 1, pageSize = 20 } = {}) {
    let query = supabase
      .from('documents')
      .select(`
        *,
        subjects(id, name),
        document_classes(class_id, classes(id, class_name))
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (search) query = query.ilike('title', `%${search}%`);
    if (subjectId) query = query.eq('subject_id', subjectId);

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  },

  async upload(file, metadata, classIds = []) {
    const maxMB = Number(import.meta.env.VITE_MAX_FILE_SIZE_MB ?? 20);
    if (file.size > maxMB * 1024 * 1024) {
      throw new Error(`File quá lớn. Tối đa ${maxMB}MB`);
    }

    const forbidden = ['.exe', '.php', '.sh', '.bat', '.cmd', '.js', '.msi', '.ps1'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (forbidden.includes(ext)) {
      throw new Error(`Loại file ${ext} không được phép tải lên`);
    }

    const fileName = `${Date.now()}_${sanitizeFileName(file.name)}`;
    const filePath = `docs/${fileName}`;

    const { error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(filePath, file);
    if (uploadErr) throw uploadErr;

    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .insert({
        ...metadata,
        file_name: fileName,
        original_name: file.name,
        file_path: filePath,
        mime_type: file.type,
        file_size: file.size,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();
    if (docErr) throw docErr;

    // Assign to classes
    if (classIds.length > 0) {
      const { error: clsErr } = await supabase.from('document_classes').insert(
        classIds.map((cId) => ({ document_id: doc.id, class_id: cId }))
      );
      if (clsErr) throw clsErr;
    }

    return doc;
  },

  async getSignedUrl(filePath) {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600);
    if (error) throw error;
    return data.signedUrl;
  },

  async softDelete(id) {
    const { error } = await supabase
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  // Get documents for student (CLASS assigned + ALL)
  async getStudentDocuments(classIds = [], { search = '', page = 1, pageSize = 20 } = {}) {
    let query = supabase
      .from('documents')
      .select(`
        *,
        subjects(name),
        document_classes(class_id)
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (search) query = query.ilike('title', `%${search}%`);

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    // Filter: visibility=ALL OR belongs to one of student's classes
    const filtered = (data ?? []).filter((doc) => {
      if (doc.visibility === 'ALL') return true;
      const docClassIds = (doc.document_classes ?? []).map((dc) => dc.class_id);
      return classIds.some((cId) => docClassIds.includes(cId));
    });

    return { data: filtered, count };
  },
};
