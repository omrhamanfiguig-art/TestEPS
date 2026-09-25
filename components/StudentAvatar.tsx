import React, { useRef, useState } from 'react';
import { CameraIcon, TrashIcon } from './Icons';
import { compressAndCropStudentPhoto } from '../utils/imageHelper';
import { useLanguage } from '../utils/i18n';

interface StudentAvatarProps {
  photoUrl?: string;
  nomEleve?: string;
  sexe?: 'M' | 'F';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  editable?: boolean;
  onPhotoChange?: (photoUrl: string | undefined) => void;
  className?: string;
  bordered?: boolean;
  onClick?: () => void;
}

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  photoUrl,
  nomEleve,
  sexe = 'M',
  size = 'md',
  editable = false,
  onPhotoChange,
  className = '',
  bordered = true,
  onClick,
}) => {
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Size styling maps
  const sizeMap = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-24 h-24 text-3xl',
  };

  const badgeSizeMap = {
    xs: 'w-3 h-3 text-[7px]',
    sm: 'w-3.5 h-3.5 text-[8px]',
    md: 'w-4 h-4 text-[9px]',
    lg: 'w-5 h-5 text-[10px]',
    xl: 'w-6 h-6 text-xs',
    '2xl': 'w-8 h-8 text-sm',
  };

  const cameraBtnSizeMap = {
    xs: 'p-0.5',
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-1.5',
    xl: 'p-2',
    '2xl': 'p-2.5',
  };

  // Compute initials or fallback letter
  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return sexe === 'F' ? '👧' : '👦';
    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return trimmed.substring(0, 2).toUpperCase();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onPhotoChange) return;

    try {
      setIsProcessing(true);
      const compressedDataUrl = await compressAndCropStudentPhoto(file, 360, 0.84);
      setImageError(false);
      onPhotoChange(compressedDataUrl);
    } catch (err: any) {
      console.error('Failed to process student photo:', err);
      alert(err.message || 'حدث خطأ أثناء معالجة الصورة.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPhotoChange) {
      setImageError(false);
      onPhotoChange(undefined);
    }
  };

  const hasValidPhoto = Boolean(photoUrl && !imageError);

  const containerClasses = [
    'relative inline-flex items-center justify-center shrink-0 rounded-2xl select-none overflow-hidden transition-all duration-200',
    sizeMap[size] || sizeMap.md,
    bordered ? 'ring-2 ring-white/80 dark:ring-gray-800 shadow-xs' : '',
    hasValidPhoto
      ? 'bg-gray-100 dark:bg-gray-800'
      : sexe === 'F'
      ? 'bg-gradient-to-br from-pink-400 via-rose-500 to-purple-600 text-white font-black'
      : 'bg-gradient-to-br from-blue-500 via-indigo-600 to-sky-600 text-white font-black',
    onClick ? 'cursor-pointer hover:opacity-90 active:scale-95' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className="relative inline-block shrink-0 group">
      <div 
        className={containerClasses}
        onClick={onClick}
        title={nomEleve ? `${nomEleve} (${sexe === 'F' ? 'أنثى' : 'ذكر'})` : undefined}
      >
        {isProcessing ? (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center z-10">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : null}

        {hasValidPhoto ? (
          <img
            src={photoUrl}
            alt={nomEleve || 'صورة التلميذ'}
            className="w-full h-full object-cover rounded-2xl transition duration-200"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <span className="leading-none drop-shadow-xs tracking-tight">
            {getInitials(nomEleve)}
          </span>
        )}

        {/* Editable Overlay */}
        {editable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={isProcessing}
            title={language === 'ar' ? 'التقاط أو اختيار صورة للتلميذ' : 'Changer la photo'}
            className={`absolute inset-0 bg-black/40 hover:bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200 z-10 cursor-pointer ${cameraBtnSizeMap[size]}`}
          >
            <CameraIcon className={size === 'xs' || size === 'sm' ? 'w-3 h-3' : 'w-4 h-4 sm:w-5 sm:h-5'} />
          </button>
        )}
      </div>

      {/* Hidden File Input for Camera and Gallery */}
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      )}

      {/* Quick remove photo icon badge (only when photo exists and is editable in md/lg/xl/2xl sizes) */}
      {editable && hasValidPhoto && (size === 'lg' || size === 'xl' || size === '2xl') && (
        <button
          type="button"
          onClick={handleRemovePhoto}
          title={language === 'ar' ? 'حذف صورة التلميذ' : 'Supprimer la photo'}
          className="absolute -top-1.5 -end-1.5 p-1 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-md transition z-20"
        >
          <TrashIcon />
        </button>
      )}

      {/* Gender indicator dot if bordered and not editable */}
      {!editable && (size === 'lg' || size === 'xl' || size === '2xl') && (
        <span 
          className={`absolute -bottom-1 -end-1 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center font-bold text-[9px] shadow-xs ${badgeSizeMap[size]} ${
            sexe === 'F' ? 'bg-pink-500 text-white' : 'bg-blue-600 text-white'
          }`}
          title={sexe === 'F' ? 'أنثى' : 'ذكر'}
        >
          {sexe === 'F' ? '♀' : '♂'}
        </span>
      )}
    </div>
  );
};
