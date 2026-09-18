'use client';

import { useState, useRef, useEffect } from 'react';
import { Image, Upload, Trash2, Save, CheckCircle2, AlertCircle } from 'lucide-react';

interface MediaItem {
  id: string;
  name: string;
  type: string;
  category: string;
  url?: string;
}

const categories = [
  { id: 'home_banner', label: '首页Banner' },
  { id: 'home_brand', label: '首页品牌区' },
  { id: 'product_truck', label: '产品-无人货车' },
  { id: 'product_vehicle', label: '产品-行驶器无人车' },
  { id: 'service_b', label: '业务-B端服务' },
  { id: 'service_c', label: '业务-C端服务' },
  { id: 'case_enterprise', label: '案例-企业项目' },
  { id: 'case_personal', label: '案例-个人体验' },
  { id: 'about', label: '关于我们' },
  { id: 'video', label: '视频素材' },
  { id: 'other', label: '其他' },
];

interface UploadStatus {
  type: 'success' | 'error';
  message: string;
}

export function MediaPanel() {
  const [selectedCategory, setSelectedCategory] = useState('home_banner');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 用 uploadCounter 作为 file input 的 key，每次上传成功后递增以重置 input
  const [uploadCounter, setUploadCounter] = useState(0);

  // Load existing media items from database on mount
  useEffect(() => {
    const loadMedia = async () => {
      try {
        const t = Date.now();
        const response = await fetch(`/api/media?t=${t}`, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (data.data && Array.isArray(data.data)) {
            setMediaItems(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to load media:', error);
      }
    };
    loadMedia();
  }, []);

  // 自动隐藏上传状态提示
  useEffect(() => {
    if (!uploadStatus) return;
    const timer = setTimeout(() => setUploadStatus(null), 3000);
    return () => clearTimeout(timer);
  }, [uploadStatus]);

  useEffect(() => {
    if (!saveSuccess) return;
    const timer = setTimeout(() => setSaveSuccess(false), 3000);
    return () => clearTimeout(timer);
  }, [saveSuccess]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const file = files[0];

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
    if (!validTypes.includes(file.type)) {
      setUploadStatus({ type: 'error', message: '仅支持 JPG、PNG、WebP、MP4 格式' });
      setUploading(false);
      setUploadCounter(c => c + 1);
      e.target.value = '';
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus({ type: 'error', message: '文件大小不能超过 10MB' });
      setUploading(false);
      setUploadCounter(c => c + 1);
      e.target.value = '';
      return;
    }

    try {
      // Upload file via API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', selectedCategory);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.url) {
        setUploadStatus({ type: 'error', message: data.error || '上传失败' });
        setUploading(false);
        setUploadCounter(c => c + 1);
        e.target.value = '';
        return;
      }

      const newItem: MediaItem = {
        id: data.id || Date.now().toString(),
        name: file.name,
        type: file.type.startsWith('video') ? 'video' : 'image',
        category: selectedCategory,
        url: data.url,
      };
      setMediaItems((prev) => [...prev, newItem]);
      setHasChanges(true);
      setUploadStatus({ type: 'success', message: `已上传 ${file.name}` });
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({ type: 'error', message: '上传失败，请重试' });
    } finally {
      setUploading(false);
      // 通过 key 重置 input，允许重复上传同一文件
      setUploadCounter(c => c + 1);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleDelete = (id: string) => {
    setMediaItems((prev) => prev.filter((item) => item.id !== id));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const response = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: mediaItems }),
      });

      if (!response.ok) {
        throw new Error('保存失败');
      }

      setSaveSuccess(true);
      setHasChanges(false);
    } catch (error) {
      console.error('Save error:', error);
      setUploadStatus({ type: 'error', message: '保存失败，请重试' });
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = mediaItems.filter((item) => item.category === selectedCategory);
  const currentCategoryLabel = categories.find(c => c.id === selectedCategory)?.label || selectedCategory;

  return (
    <div>
      {/* Hidden file input - key 变化会让 React 重新挂载，从而清空已选文件 */}
      <input
        key={`media-file-${uploadCounter}`}
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 上传/保存状态提示 */}
      {uploadStatus && (
        <div
          className={`mb-4 flex items-center gap-2 px-4 py-2 rounded-md text-sm ${
            uploadStatus.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {uploadStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {uploadStatus.message}
        </div>
      )}

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedCategory === cat.id
                ? 'bg-brand-blue text-white'
                : 'bg-white text-muted-foreground border border-border/50 hover:text-foreground'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Upload area */}
      <div className="bg-white rounded-xl border border-border/50 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-navy">上传素材</h3>
          <button
            onClick={handleUploadClick}
            disabled={uploading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-brand-blue text-white rounded-md hover:bg-brand-blue-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? '上传中...' : '选择文件上传'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          支持 JPG、PNG、WebP、MP4 格式，单文件不超过 10MB。上传后立即在下方预览，点击「保存素材」同步到网站。
        </p>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-end gap-3 mb-6">
        {saveSuccess && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            保存成功
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {saving ? '保存中...' : '保存素材'}
        </button>
      </div>

      {/* Media grid */}
      <div className="bg-white rounded-xl border border-border/50 p-6">
        <h3 className="text-sm font-semibold text-navy mb-4">
          {currentCategoryLabel} ({filteredItems.length})
        </h3>
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center">
            <Image className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">暂无素材，请上传</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="group relative aspect-square rounded-lg bg-surface border border-border/30 flex items-center justify-center overflow-hidden"
              >
                {item.url ? (
                  item.type === 'video' ? (
                    <video src={item.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                  )
                ) : (
                  <Image className="w-8 h-8 text-muted-foreground/30" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-destructive text-white rounded-md hover:bg-destructive/90 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/30">
                  <span className="text-xs text-white truncate block">{item.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}