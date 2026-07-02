"use client";

import { useEffect, useRef, useState } from "react";

interface ImagePickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  label: string;
}

export default function ImagePicker({
  files,
  onChange,
  label,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  function addFiles(incoming: FileList | File[]) {
    const images = Array.from(incoming).filter((file) =>
      file.type.startsWith("image/")
    );
    if (images.length > 0) {
      onChange([...files, ...images]);
    }
  }

  function removeAt(index: number) {
    onChange(files.filter((_, current) => current !== index));
  }

  return (
    <div className="imgpick">
      <span className="submit-form__label">{label}</span>
      <div
        className={`imgpick__drop${dragOver ? " imgpick__drop--over" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <span className="imgpick__drop-icon" aria-hidden="true">
          🖼️
        </span>
        <span className="imgpick__drop-text">
          사진을 끌어다 놓거나 클릭해 추가
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          hidden
          onChange={(event) => {
            addFiles(event.target.files ?? []);
            event.target.value = "";
          }}
        />
      </div>

      {previews.length > 0 && (
        <ul className="imgpick__grid">
          {previews.map((url, index) => (
            <li key={url} className="imgpick__thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`첨부 ${index + 1}`} />
              <button
                type="button"
                className="imgpick__remove"
                onClick={() => removeAt(index)}
                aria-label={`첨부 ${index + 1} 삭제`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
