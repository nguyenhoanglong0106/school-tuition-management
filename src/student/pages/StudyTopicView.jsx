import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { studyTopicService } from '@/services/studyTopicService';
import { useToast } from '@/contexts/ToastContext';
import { Skeleton, EmptyState } from '@/components/common/UI';

export default function StudyTopicView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    studyTopicService.getById(id)
      .then(setTopic)
      .catch((err) => { addToast(err.message ?? 'Không tìm thấy chuyên đề', 'error'); navigate(-1); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const speak = (text) => {
    if (!('speechSynthesis' in window)) {
      addToast('Trình duyệt này không hỗ trợ đọc phát âm', 'error');
      return;
    }
    // Cancel first: on several mobile browsers, calling speak() again while a
    // previous utterance is still queued/finishing silently no-ops instead of
    // interrupting it, making repeated taps look "stuck" or unresponsive.
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    // Explicitly pick an English voice when one exists -- without this, a
    // device whose only installed voice is Vietnamese will read the English
    // text with Vietnamese phonetics (sounds flatly wrong, not just accented).
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find((v) => v.lang === 'en-US') ?? voices.find((v) => v.lang?.startsWith('en'));
    if (enVoice) utter.voice = enVoice;
    utter.onerror = () => addToast('Không phát âm được câu này trên thiết bị này', 'error');

    window.speechSynthesis.speak(utter);
  };

  if (loading) return <div className="space-y-3"><Skeleton className="h-8 w-48" />{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (!topic) return null;

  const vocab = topic.study_topic_vocabulary ?? [];
  const situations = topic.study_topic_situations ?? [];

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

      {situations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase px-1">Tình huống thực hành</p>
          {situations.map((s) => {
            const isOpen = expandedId === s.id;
            return (
              <div key={s.id} className="card overflow-hidden">
                <button onClick={() => setExpandedId(isOpen ? null : s.id)} className="w-full p-4 flex items-center gap-3 text-left">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0"><MessageSquare size={16} className="text-primary-600" /></div>
                  <p className="font-medium text-slate-800 flex-1">{s.title}</p>
                  {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-2 border-t border-slate-50 pt-3">
                    {(s.dialogue ?? []).map((line, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{line.speaker}</span>
                        <div className="flex-1 bg-slate-50 rounded-xl p-3">
                          <p className="text-sm text-slate-800">{line.english}</p>
                          <p className="text-xs text-slate-400 italic mt-0.5">{line.vietnamese}</p>
                        </div>
                        <button onClick={() => speak(line.english)} className="p-1.5 mt-0.5 rounded-lg hover:bg-slate-100 text-primary-600 flex-shrink-0" aria-label="Nghe phát âm">
                          <Volume2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
