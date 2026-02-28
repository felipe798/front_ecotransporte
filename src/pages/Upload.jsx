import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentService, empresaTransporteService, unidadService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import logoEmpresa from '../assets/Images/logo-empresa.png';
import './Upload.css';

const Upload = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const notification = useNotification();

  // Wizard state
  const [wizardStep, setWizardStep] = useState(null); // null | 'empresas' | 'placas' | 'done'
  const [newPlacas, setNewPlacas] = useState([]); // [{placa, empresaId}]
  const [empresas, setEmpresas] = useState([]);
  const [savingWizard, setSavingWizard] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const pdfs = droppedFiles.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    const nonPdfs = droppedFiles.length - pdfs.length;
    if (pdfs.length > 0) {
      setFiles((prev) => [...prev, ...pdfs]);
      if (nonPdfs > 0) {
        setError(`${nonPdfs} archivo(s) ignorado(s) por no ser PDF`);
      } else {
        setError('');
      }
    } else {
      setError('Solo se permiten archivos PDF');
    }
  };

  const handleFileChange = (e) => {
    const allFiles = Array.from(e.target.files);
    const pdfs = allFiles.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    const nonPdfs = allFiles.length - pdfs.length;
    if (pdfs.length > 0) {
      setFiles((prev) => [...prev, ...pdfs]);
      if (nonPdfs > 0) {
        setError(`${nonPdfs} archivo(s) ignorado(s) por no ser PDF`);
      } else {
        setError('');
      }
    } else if (allFiles.length > 0) {
      setError('Solo se permiten archivos PDF');
    }
    // Reset input para poder seleccionar los mismos archivos otra vez
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Por favor selecciona al menos un archivo PDF');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);
    const uploadResults = [];
    const placasNuevas = new Set();

    for (let i = 0; i < files.length; i++) {
      setCurrentIndex(i);
      console.log('Upload: processing file', files[i].name, 'index', i);
      try {
        const response = await documentService.upload(files[i]);
        console.log('Upload: success response', response);
        uploadResults.push({ file: files[i].name, success: true, document: response.document });
        if (response.placaNoRegistrada) {
          placasNuevas.add(response.placaNoRegistrada);
        }
      } catch (err) {
        console.error('Upload error for', files[i].name, err);
        const reason = err.rejected
          ? err.reason || 'Documento rechazado'
          : err.message || 'Error al procesar';
        uploadResults.push({ file: files[i].name, success: false, error: reason });
      }
      setResults([...uploadResults]);
    }

    setLoading(false);
    const exitosos = uploadResults.filter((r) => r.success).length;
    const fallidos = uploadResults.filter((r) => !r.success).length;
    if (exitosos > 0) {
      notification.success(`${exitosos} documento(s) procesado(s) exitosamente`);
    }
    if (fallidos > 0) {
      notification.error(`${fallidos} documento(s) fallaron`);
    }

    // Si hay placas nuevas, iniciar wizard
    if (placasNuevas.size > 0) {
      setNewPlacas([...placasNuevas].map(p => ({ placa: p, empresaId: '' })));
      // Cargar empresas existentes
      try {
        const resp = await empresaTransporteService.getActivas();
        setEmpresas(resp || []);
      } catch (e) {
        setEmpresas([]);
      }
      setWizardStep('placas');
    }
  };

  // === WIZARD HANDLERS ===
  const [newEmpresaNombre, setNewEmpresaNombre] = useState('');
  const [newEmpresaRuc, setNewEmpresaRuc] = useState('');
  const [creatingEmpresa, setCreatingEmpresa] = useState(false);

  const handleCreateEmpresa = async () => {
    if (!newEmpresaNombre.trim()) return;
    setCreatingEmpresa(true);
    try {
      const resp = await empresaTransporteService.create({ 
        nombre: newEmpresaNombre.trim().toUpperCase(), 
        ruc: newEmpresaRuc.trim() || null 
      });
      const created = resp;
      setEmpresas(prev => [...prev, created].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNewEmpresaNombre('');
      setNewEmpresaRuc('');
      notification.success(`Empresa "${created.nombre}" creada`);
    } catch (e) {
      notification.error('Error al crear empresa');
    }
    setCreatingEmpresa(false);
  };

  const handlePlacaEmpresaChange = (idx, empresaId) => {
    setNewPlacas(prev => prev.map((p, i) => i === idx ? { ...p, empresaId } : p));
  };

  const handleSavePlacas = async () => {
    const incomplete = newPlacas.filter(p => !p.empresaId);
    if (incomplete.length > 0) {
      notification.error(`Asigna una empresa a todas las placas (${incomplete.length} pendiente(s))`);
      return;
    }

    setSavingWizard(true);
    let saved = 0;
    for (const p of newPlacas) {
      try {
        await unidadService.create({ placa: p.placa, empresaId: Number(p.empresaId) });
        saved++;
      } catch (e) {
        console.error(`Error registrando placa ${p.placa}:`, e);
      }
    }

    // Re-asociar documentos con las nuevas placas
    try {
      const reassocResult = await documentService.reassociate();
      console.log('Re-asociados:', reassocResult.updated);
    } catch (e) {
      console.error('Error re-asociando:', e);
    }

    notification.success(`${saved} placa(s) registrada(s) y documentos re-asociados`);
    setSavingWizard(false);
    setWizardStep(null);
    setNewPlacas([]);
  };

  const handleSkipWizard = () => {
    setWizardStep(null);
    setNewPlacas([]);
  };

  const handleReset = () => {
    setFiles([]);
    setResults([]);
    setError('');
    setCurrentIndex(0);
    setWizardStep(null);
    setNewPlacas([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="upload-page">
      <div className="upload-header">
        <img src={logoEmpresa} alt="Logo Empresa" className="page-logo" />
        <h1>Subir Guías de Remisión</h1>
        <p>Sube uno o varios archivos PDF y el sistema extraerá automáticamente los datos</p>
      </div>

      {results.length === 0 || loading ? (
        <div className="upload-container">
          <div
            className={`drop-zone ${dragActive ? 'active' : ''} ${files.length > 0 ? 'has-file' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !loading && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.PDF,application/pdf"
              multiple
              hidden
            />
            
            {files.length > 0 ? (
              <div className="files-list">
                <div className="files-summary">
                  <span>📁 {files.length} archivo(s) seleccionado(s)</span>
                  <span className="files-total-size">{(totalSize / 1024 / 1024).toFixed(2)} MB total</span>
                </div>
                <div className="files-grid">
                  {files.map((f, idx) => (
                    <div key={idx} className="file-item">
                      <span className="file-item-icon">📄</span>
                      <span className="file-item-name" title={f.name}>
                        {f.name.length > 30 ? f.name.slice(0, 27) + '...' : f.name}
                      </span>
                      <span className="file-item-size">{(f.size / 1024).toFixed(0)} KB</span>
                      {!loading && (
                        <button
                          className="file-item-remove"
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                          title="Quitar"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!loading && (
                  <p className="drop-subtext">Haz clic para agregar más archivos</p>
                )}
              </div>
            ) : (
              <div className="drop-content">
                <div className="drop-icon">📂</div>
                <p className="drop-text">Arrastra y suelta tus PDFs aquí</p>
                <p className="drop-subtext">o haz clic para seleccionar (puedes elegir varios)</p>
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="upload-actions">
            {files.length > 0 && !loading && (
              <button onClick={handleReset} className="btn-secondary">
                Cancelar
              </button>
            )}
            <button
              onClick={handleUpload}
              className="btn-primary"
              disabled={files.length === 0 || loading}
            >
              {loading
                ? `Procesando ${currentIndex + 1} de ${files.length}...`
                : `Procesar ${files.length > 0 ? files.length + ' Documento(s)' : 'Documentos'}`}
            </button>
          </div>

          {loading && (
            <div className="processing-indicator">
              <div className="spinner"></div>
              <p>Procesando: {files[currentIndex]?.name}</p>
              <p className="processing-note">
                {currentIndex + 1} de {files.length} — {Math.round(((currentIndex) / files.length) * 100)}% completado
              </p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${((currentIndex) / files.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="result-container">
          <div className="result-header">
            <div className="success-icon">✅</div>
            <h2>Procesamiento Completado</h2>
            <p>
              {results.filter((r) => r.success).length} exitoso(s), {results.filter((r) => !r.success).length} fallido(s) de {results.length} total
            </p>
          </div>

          <div className="results-list">
            {results.map((r, idx) => (
              <div key={idx} className={`result-item ${r.success ? 'result-success' : 'result-error'}`}>
                <div className="result-item-status">
                  {r.success ? '✅' : '❌'}
                </div>
                <div className="result-item-info">
                  <span className="result-item-name">{r.file}</span>
                  {r.success ? (
                    <span className="result-item-detail">
                      GRT: {r.document?.grt || '-'} | Cliente: {r.document?.cliente || '-'} | TN: {r.document?.tn_enviado || '-'}
                    </span>
                  ) : (
                    <span className="result-item-error">{r.error}</span>
                  )}
                </div>
                {r.success && r.document?.id && (
                  <button
                    className="btn-small"
                    onClick={() => navigate(`/documents/${r.document.id}`)}
                  >
                    Ver
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="result-actions">
            <button onClick={handleReset} className="btn-secondary">
              Subir Más
            </button>
            <button onClick={() => navigate('/documents')} className="btn-primary">
              Ver Todos los Documentos
            </button>
          </div>

          {/* Wizard: Registrar placas nuevas */}
          {wizardStep === 'placas' && (
            <div className="wizard-overlay">
              <div className="wizard-modal">
                <div className="wizard-header">
                  <h2>🚛 Placas No Registradas</h2>
                  <p>Se detectaron <strong>{newPlacas.length}</strong> placa(s) que no están registradas. Asigna cada una a su empresa de transporte.</p>
                </div>

                {/* Crear empresa rápido */}
                <div className="wizard-create-empresa">
                  <h3>¿La empresa no aparece? Créala aquí:</h3>
                  <div className="wizard-create-row">
                    <input
                      type="text"
                      placeholder="Nombre de la empresa"
                      value={newEmpresaNombre}
                      onChange={e => setNewEmpresaNombre(e.target.value)}
                      className="wizard-input"
                    />
                    <input
                      type="text"
                      placeholder="RUC (opcional)"
                      value={newEmpresaRuc}
                      onChange={e => setNewEmpresaRuc(e.target.value)}
                      className="wizard-input wizard-input-ruc"
                      maxLength={11}
                    />
                    <button
                      onClick={handleCreateEmpresa}
                      disabled={!newEmpresaNombre.trim() || creatingEmpresa}
                      className="btn-primary btn-small"
                    >
                      {creatingEmpresa ? '...' : '+ Crear'}
                    </button>
                  </div>
                </div>

                {/* Lista de placas */}
                <div className="wizard-placas-list">
                  {newPlacas.map((p, idx) => (
                    <div key={p.placa} className={`wizard-placa-row ${p.empresaId ? 'assigned' : ''}`}>
                      <span className="wizard-placa-badge">{p.placa}</span>
                      <select
                        value={p.empresaId}
                        onChange={e => handlePlacaEmpresaChange(idx, e.target.value)}
                        className="wizard-select"
                      >
                        <option value="">— Seleccionar empresa —</option>
                        {empresas.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                        ))}
                      </select>
                      {p.empresaId ? <span className="wizard-check">✓</span> : <span className="wizard-pending">⚠</span>}
                    </div>
                  ))}
                </div>

                <div className="wizard-progress">
                  {newPlacas.filter(p => p.empresaId).length} de {newPlacas.length} asignadas
                </div>

                <div className="wizard-actions">
                  <button onClick={handleSkipWizard} className="btn-secondary">
                    Omitir (registrar después)
                  </button>
                  <button
                    onClick={handleSavePlacas}
                    disabled={savingWizard}
                    className="btn-primary"
                  >
                    {savingWizard ? 'Guardando...' : `Registrar ${newPlacas.length} Placa(s)`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Upload;
