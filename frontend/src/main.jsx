import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API_ENDPOINT = 'https://pdf-backend-server.onrender.com/upload';
const conversions = [
  ['pdf-to-word', 'PDF to Word', '.docx'],
  ['image-to-word', 'Scanned Image to Editable Word', '.docx'],
  ['image-to-pdf', 'Image to PDF', '.pdf'],
  ['word-to-excel', 'Word to Excel', '.xlsx'],
  ['ppt-to-pdf', 'PowerPoint to PDF', '.pdf'],
  ['word-to-pdf', 'Word to PDF', '.pdf'],
];

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function App() {
  const inputRef = useRef(null);
  const [conversionType, setConversionType] = useState('pdf-to-word');
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState('upload');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const chooseFile = (nextFile) => {
    if (nextFile) {
      setFile(nextFile);
      setState('upload');
      setError('');
    }
  };

  const reset = () => {
    setFile(null);
    setState('upload');
    setProgress(0);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const convert = () => {
    if (!file) return;
    setState('progress');
    setProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversionType', conversionType);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_ENDPOINT);
    xhr.responseType = 'blob';
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = async () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        let message = `Server responded with status ${xhr.status}.`;
        try { message = (await xhr.response.text()) || message; } catch {}
        setError(message);
        setState('error');
        return;
      }
      const selected = conversions.find(([value]) => value === conversionType);
      const base = file.name.replace(/\.[^.]+$/, '');
      const disposition = xhr.getResponseHeader('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const name = match?.[1] || `${base}_converted${selected[2]}`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(xhr.response);
      link.download = name;
      link.click();
      URL.revokeObjectURL(link.href);
      setState('success');
    };
    xhr.onerror = () => {
      setError('Network error. Check the Render backend and try again.');
      setState('error');
    };
    xhr.send(formData);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <button className="brand-mark" type="button" onClick={() => window.location.reload()} aria-label="Refresh PDF Converter" title="Refresh PDF Converter"><span className="monogram-back">P</span><span className="monogram-center">D</span><span className="monogram-front">P</span></button>
          <span>PDF Converter</span>
        </div>
        <nav className="nav-menu" aria-label="Main navigation">
          <a href="#home">Home</a>
          <a href="#convert">Convert</a>
          <div className="nav-formats">
            <button type="button" className="nav-formats-trigger">Formats <span>⌄</span></button>
            <div className="formats-dropdown">
              <span className="format-list-label">Available formats</span>
              {conversions.map(([value, label, extension]) => <button type="button" key={value} onClick={() => { setConversionType(value); document.getElementById('convert')?.scrollIntoView({ behavior: 'smooth' }); }}>{label} <b>{extension}</b></button>)}
            </div>
          </div>
        </nav>
      </header>
      <main className="main-content" id="home">
        <section className="intro reveal">
          <p className="eyebrow">DOCUMENT WORKSPACE</p>
          <h1>Convert files securely.</h1>
          <p>Turn PDFs, documents, and scanned images into useful files without losing the content that matters.</p>
        </section>
        <section className="converter-card reveal delay-one" id="convert">
          {state === 'upload' && <>
            <label className="field-label" htmlFor="conversion-type">Select conversion type</label>
            <select id="conversion-type" value={conversionType} onChange={(event) => setConversionType(event.target.value)}>
              {conversions.map(([value, label, extension]) => <option value={value} key={value}>{label} ({extension})</option>)}
            </select>
            <div className={`drop-zone ${dragging ? 'dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]); }}>
              <input ref={inputRef} type="file" onChange={(event) => chooseFile(event.target.files[0])} />
              <div className="upload-icon">↑</div>
              <h2>{file ? file.name : 'Drop a file here'}</h2>
              <p>{file ? formatBytes(file.size) : 'or browse PDF, DOCX, PPTX, JPG, or PNG files'}</p>
              {!file && <button type="button" className="secondary-button" onClick={() => inputRef.current?.click()}>Browse files</button>}
            </div>
            {file && <div className="file-row"><span>{file.name}</span><button type="button" onClick={reset}>Remove</button></div>}
            <button className="primary-button" type="button" disabled={!file} onClick={convert}>Start conversion <span>→</span></button>
          </>}
          {state === 'progress' && <div className="status-panel"><div className="status-orb">↗</div><h2>Converting your file</h2><p>{file?.name}</p><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><strong>{progress}%</strong></div>}
          {state === 'success' && <div className="status-panel success"><div className="status-orb">✓</div><h2>Conversion complete</h2><p>Your download has started.</p><button className="secondary-button" type="button" onClick={reset}>Convert another file</button></div>}
          {state === 'error' && <div className="status-panel error"><div className="status-orb">!</div><h2>Conversion failed</h2><p>{error}</p><button className="secondary-button" type="button" onClick={reset}>Try again</button></div>}
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
