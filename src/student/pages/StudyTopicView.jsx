import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2 } from 'lucide-react';
import { studyTopicService } from '@/services/studyTopicService';
import { useToast } from '@/contexts/ToastContext';
import { Skeleton, EmptyState } from '@/components/common/UI';

export default function StudyTopicView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studyTopicService.getById(id)
      .then(setTopic)
      .catch((err) => { addToast(err.message ?? 'Không tìm thấy chuyên đề', 'error'); navigate(-1); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    window.speechSynthesis.speak(utter);
  };

  if (loading) return <div className="space-y-3"><Skeleton className="h-8 w-48" />{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (!topic) return null;

  const vocab = topic.study_topic_vocabulary ?? [];

  return (
    <div className="space-y-4 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Quay lại
      </button>

      <div className="card p-5">
        <h1 className="text-lg font-bold text-slate-800">{topic.title}</h1>
        <p className="text-xs text-slate-400 mt-1">{topic.subjects?.name}</p>
        {topic.description && <p className="text-sm text-slate-600 mt-3">{topic.description}</p>}
      </div>

      {vocab.length === 0 ? (
        <div className="card"><EmptyState title="Chuyên đề này chưa có từ vựng" /></div>
      ) : (
        <div className="space-y-2">
          {vocab.map((v) => (
            <div key={v.id} className="card p-4">
              <div className="flex items-center gap-2">
                <button onClick={() => speak(v.term)} className="p-1.5 rounded-lg hover:bg-slate-100 text-primary-600 flex-shrink-0" aria-label="Nghe phát âm">
                  <Volume2 size={16} />
                </button>
                <p className="font-semibold text-slate-800">{v.term}</p>
                {v.word_type && <span className="text-xs text-slate-400">{v.word_type}</span>}
              </div>
              <p className="text-sm text-slate-600 mt-1 ml-8">{v.meaning}</p>
              {v.example_sentence && <p className="text-xs text-slate-400 italic mt-1 ml-8">"{v.example_sentence}"</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
