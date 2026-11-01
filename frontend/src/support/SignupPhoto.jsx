/** One required signup photo with a local preview; the backend validates and normalizes the image. */
import { useEffect, useState } from 'react';
export default function SignupPhoto({ file, onChange, onError }) {
  const [preview, setPreview] = useState('');
  useEffect(() => { if (!file) { setPreview(''); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  return <div className="sp-signup-photo">
    {preview && <img src={preview} alt="Your chosen profile photo" />}
    <label>Profile photo<input type="file" accept="image/jpeg,image/png,image/webp" required={!file}
      onChange={e => {
        const chosen = e.target.files?.[0]; if (!chosen) return;
        if (chosen.size > 8 * 1024 * 1024) { e.target.value = ''; onError('Choose a photo smaller than 8 MB.'); return; }
        onError(''); onChange(chosen);
      }} /><small>One photo required · JPEG, PNG, or WebP · Up to 8 MB</small></label>
  </div>;
}
